# redis

The redis.yml template has been deprecated in favor of the file "v2/redis.yml" in the same directory.

When adding support for monitoring memory, the following was discovered:
  https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/redis-memory-management.html

AWS has an issue with the cache services, depending on how old the account is and if you do not create a parameter group,
the redis instance can have an unrecommended amount of reserved memory ( the default is zero )

You want to reserve enough memory to allow for the redis instance to backup the current database from ram to disk, to
properly support failover during maintenance windows, and when AWS has transient internal networking issues.

Resolving this requires we add a parameter group as best-practice and start configuring best practice values for
memory reservation per redis version AWS continues to support. Incorrectly configuring your parameter group can seriously
impact your infrastructure's ability to scale and remain stable during updates. For these reasons it appears to be best
for us to deprecate this template rather than continue to support it as "best-practice" since there is too much risk
in letting AWS migrate when the cluster is misconfigured ( in the cases where the data is required for critical functionality )

Upgrading to a properly configured parameter group in place can lead to an outage as available memory for data storage will
be reduced.

For continued reading on how REDIS manages memory, see: https://redis.io/topics/lru-cache
For more information on which configuration options AWS supports, see: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/ParameterGroups.Redis.html#ParameterGroups.Redis.NodeSpecific
