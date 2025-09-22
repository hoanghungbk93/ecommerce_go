# internal-report-db

These resources are intended to comprise a solution allowing
JSON outputs from regularly-executed internal reporting tools
to be processed from an S3 source bucket through Glue,
and queried through Athena.

## Parent Stack Considerations

- The parent stack ( the stack including this template as a sub stack ) should define the S3 source bucket resource.
- The parent stack is responsible for declaring any Athena queries
  - The Athena query string uses [Presto SQL](https://aws.amazon.com/big-data/what-is-presto/) sytnax

## Conventions

- The report should have a unique, brief, descriptive name.
- The report tool output must be a single-row formatted .JSON file
  - It is common for internal reporting tools to use `output.json`
  - Python tools are commonly executed like `pipenv run python main.py | tee output.json`
- The output must be placed in an S3 bucket within a subdirectory named after the report
  - Eg, `s3://myBucket/myReport/`

