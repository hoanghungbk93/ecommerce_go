# Errors

### Service-linked Role required for ES

An error like this:

    The following resource(s) failed to create: [ElasticsearchDomain].
    Rollback requested by user. Before you can proceed, you must enable a
    service-linked role to give Amazon ES permissions to access your VPC.

means the es.amazonaws.com service-linked role needs to be created for you
AWS account. This can be done by running the following:

    aws iam create-service-linked-role --aws-service-name es.amazonaws.com

### AdvancedOptions must be set for AWS::Elasticsearch::Domain

Despite official docs stating `AWS::Elasticsearch:Domain.Properties.AdvancedOptions`
is not required, an ES cluster will never fully come up without it.

see:
- https://forums.aws.amazon.com/thread.jspa?messageID=768527
- https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticsearch-domain.html#cfn-elasticsearch-domain-advancedoptions

## ES VPC Limitations

from https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-vpc.html#es-vpc-limitations

### ES Cluster in VPC stuck initalizng/CREATE_IN_PROGRESS time out

	You can't launch your domain within a VPC that uses dedicated tenancy.
	You must use a VPC with tenancy set to Default.

### No Kinesis Data Firehose

	Currently, Amazon ES does not support integration with Amazon Kinesis Data
	Firehose for domains that reside within a VPC. To use this service with
	Amazon ES, you must use a domain with public access.

# Notes:

rest.action.multi.allow_explicit

    Specifies whether explicit references to indices are allowed inside the
    body of HTTP requests. If you want to configure access policies for domain
    sub-resources, such as specific indices and domain APIs, you must set this
    value to false. Disabling this property prevents users from bypassing access
    control for sub-resources. By default, the value is true.

indices.fielddata.cache.size

    Specifies the percentage of Java heap space that is allocated to field data.
    By default, this setting is unbounded.

    NOTE: Many customers query rotating daily indices. We recommend that you
          begin benchmark testing with indices.fielddata.cache.size configured
          to 40% of the JVM heap for most such use cases. However, if you have
          very large indices you might need a large field data cache.

indices.query.bool.max_clause_count

    Specifies the maximum number of clauses allowed in a Lucene boolean query.
    1024 is the default. Queries with more than the permitted number of clauses
    result in a TooManyClauses error. To learn more, see the Lucene documentation.
