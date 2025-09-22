# docrefs:

# kinesis firehose limits: https://docs.aws.amazon.com/firehose/latest/dev/limits.html

- [x] add a rule that transforms the json events into proper stream newline delimited
- [x] add a dlq to the above bus rule and notify platform team if any elements are in the dlq
- [x] alarm for firehose records/second gte 66% of max ( 500,000 records/second )
- [x] alarm for firehose request/second gte 66% of max ( 2,000 requests/second )
- [x] alarm for firehose MiB/second gte 66% of max ( 5 MiB/second )
- [x] alarm for firehose throttling
- [x] ensure .snappy extension is added to output firehose stream files
- [x] examples of common subscription types ( lambda )
- [x] examples of common subscription types ( firehose )
- [ ] examples of common subscription types ( step function state machine )
- [ ] examples of common subscription types ( kinesis datastream )
- [ ] examples of common subscription types ( another bus )
- [ ] examples of common subscription types ( internet exposed https service )
- [ ] examples of common subscription types ( sns topic )
- [ ] examples of common subscription types ( sqs )
- [ ] examples of common subscription types ( ecs task)
- [x] confirm firehose logging works
- [x] make sure all alarms are in separate nested stacks so other subscribers can reuse them
- [x] an alarm when a rule send has an error
- [x] alarm when rule invocations are throttled: metric=ThrottledRules,dimensions=RuleName ; https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html ; https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-quota.html
- [x] alarm when rule has invocations that fail to send to a DLQ, metric=InvocationsFailedToBeSentToDlq,dimensions=RuleName ; https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html

- [x] find out if eventbridge invokes a lambda in a synchronous or asynchronous fashion: point is if eb does not wait to confirm the lambda handled the event properly then lambda needs a dlq. Spoiler alert it uses asynchronous invocations
