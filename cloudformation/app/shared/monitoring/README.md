<center><h1>Monitoring Agents</h1></center>

## DataDog ECS Agent:
This agent is utilized for generic logging throughout LTK.

## DataDog Postgres Enhanced Monitoring ECS Agent:
This agent is used to collect enhanced Postgres database metrics.
For standard DataDog logging use the `datadog-ecs-agent.yml` template.
The below steps need to be completed to implement the enhanced monitoring template and enable the agent.
---
### Database Additions Needed:
1. Configure Postgres settings for pg_stats "This should come preconfigured on postgres RDS instances.
The `pg_stat_statements` extension will need to be created in step #3, this does not require a DB restart":

| PARAMETER                 | VALUE              | DESCRIPTION                                                                                                                                                                                                        |
|---------------------------|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| shared_preload_libraries  | pg_stat_statements | Required for postgresql.queries.* metrics. Enables collection of query metrics using the pg_stat_statements extension.                                                                                             |
| track_activity_query_size | 4096               | Required for collection of larger queries. Increases the size of SQL text in pg_stat_activity and pg_stat_statements. If left at the default value then queries longer than 1024 characters will not be collected. |
| pg_stat_statements.track  | ALL                | Optional. Enables tracking of statements within stored procedures and functions.                                                                                                                                   |
| pg_stat_statements        | 10000              | 	Optional. Increases the number of normalized queries tracked in pg_stat_statements. This setting is recommended for high-volume databases that see many different types of queries from many different clients.   |
| track_io_timing           | on                 | Optional. Enables collection of block read and write times for queries.                                                                                                                                            |

2. Grant the Agent access to the database: `CREATE USER datadog WITH password '<PASSWORD>';`
3. Create the following schema in every database:
> CREATE SCHEMA datadog;
> <br/>GRANT USAGE ON SCHEMA datadog TO datadog;
> <br/>GRANT USAGE ON SCHEMA public TO datadog;
> <br/>GRANT pg_monitor TO datadog;
> <br/>CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

4. Create below function in every database to enable the Agent to collect postgres explain plans:
> CREATE OR REPLACE FUNCTION datadog.explain_statement(
> l_query TEXT,
> OUT explain JSON
> )
> RETURNS SETOF JSON AS
> $$
> DECLARE
> curs REFCURSOR;
> plan JSON;
>
> BEGIN
> OPEN curs FOR EXECUTE pg_catalog.concat('EXPLAIN (FORMAT JSON) ', l_query);
> FETCH curs INTO plan;
> CLOSE curs;
> RETURN QUERY SELECT plan;
> END;
> $$
> LANGUAGE 'plpgsql'
> RETURNS NULL ON NULL INPUT
> SECURITY DEFINER;


5. Create necessary SSM parameters with DB username and password for the new DataDog user.
---
### Implementing the agent:
The lifecycle that is implementing this template will be responsible for providing a new/existing ECS cluster.
The suggestion is that a new ECS cluster should be instantiated within its own lifecycle to avoid duplication of the agent.
This agent has the ability to collect metrics from either a single DB or from a Reader/Writer Configuration.
If your Database has a Reader/Writer Configuration, it's suggested to provide both DB host properties to this agent
template since `pg_stats` metrics will be different between the two.
<br/><br/>
SSM paths that need to be provided for these properties:
- DdPgHostSsmPath "Primary DB"
- DdPgReplicaHostSsmPath "Only needed for a Reader/Writer Configuration"
- DdPgPortSsmPath
- DdPgUserSsmPath
- DdPgPasswordSsmPath

Other properties that need to be provided:
- EnvironmentName
- VerticalName
- ClusterName
- ServiceName

---
### Resources:
[Example RS implementation.](https://github.com/rewardStyle/rs-analytics-service/tree/master/cloudformation)
<br/>
[DataDog pg agent documentation.](https://docs.datadoghq.com/database_monitoring/setup_postgres/selfhosted/?tab=postgres10#grant-the-agent-access)
