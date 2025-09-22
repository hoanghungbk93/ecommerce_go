## New env stack: `configs`

This stack encapsulates the configuration of a vertical. Because it is also an
environment stack, the stack name uses the following format/template:
`<EnvironmentName>-<VerticalName>-configs`

This is important because the `configs` stack's config values output is
exported using the stack name and has the following format:

`<StackName>:<config-key>`

This stack is also a shared vertical template, meaning multiple verticals can
use the same template. Because of this, the configs stack has been placed in

`.vertical-build-utils` alongside `.veritical-build-utils/Makefile`.

## How to use

For a vertical to use this stack two things need to be done:
1. CloudFormation mapping snippets should be created under the following directory:
   `templates/<VerticalName>/includes/mappings`.

   The config stack is currently configured to contain two mapping subsections:
   `SSLCerts` and `Domains`. Each subsection should have a snippet defined in
   the afformentioned mappings path.

   ```yaml
   Mappings:
     SSLCerts: ...
     Domains: ...
   ```

   Using the `tools` vertical as an example, there are the two mappings snippets
   defined for it:


   `templats/tools/includes/mapping/ssl-certs.yml`:
   ```yaml
   ap-southeast-1:
     dev: arn:aws:acm:ap-southeast-1:406233834736:certificate/61940446-2e9a-49d4-9409-333fdaac3017
     qa: arn:aws:acm:ap-southeast-1:441221892871:certificate/e7706604-b60e-4d5a-bb2b-34324168f248
     prod: arn:aws:acm:ap-southeast-1:441221892871:certificate/e7706604-b60e-4d5a-bb2b-34324168f248
   us-east-2:
     dev: arn:aws:acm:ap-southeast-1:406233834736:certificate/61940446-2e9a-49d4-9409-333fdaac3017
     qa: arn:aws:acm:ap-southeast-1:441221892871:certificate/e7706604-b60e-4d5a-bb2b-34324168f248
     prod: arn:aws:acm:ap-southeast-1:441221892871:certificate/e7706604-b60e-4d5a-bb2b-34324168f248
   ```

   `templats/tools/includes/mapping/domains.yml`:
   ```yaml
   Public:
     dev: rs-publishing-dev.com
     qa: rewardstyle.com
     prod: rewardstyle.com

   Private:
     dev: rs-publishing-dev.local
     qa: rslocal
     prod: rslocal
   ```

2. The shared configs vertical stack should be symlinked into the vertical
   directory.

    ```shell
    cd templates/${VerticalName}
    ln -s ../.vertical-build-utils/config .
    ```
3. Finally, from the vertical directory run the following with the appropriate
   AWS profile and `ENV` to generate a changeset:

    ```shell
    make ENV=${ENV} config
    ```
    The changeset can then be viewed via AWS UI or CLI before executing.

## Configurations
There are currently three types of vertical configurations used by shared
templates:

| Name                | SSM                                                         | Exported Output                                              |
|---------------------|-------------------------------------------------------------|--------------------------------------------------------------|
| SSL Certificate ARN | /`EnvironmentName`/`VerticalName`/config/ssl-certicate-arn  | `EnvironmentName`-`VerticalName`-configs:ssl-certicate-arn   |
| Public Domain Name  | /`EnvironmentName`/`VerticalName`/config/public-domain-name | `EnvironmentName`-`VerticalName`-configs:public-domain-name  |
| Private Domain Name | /`EnvironmentName`/`VerticalName`/config/private-domain-name| `EnvironmentName`-`VerticalName`-configs:private-domain-name |


## Examples

Given the following parameters and values:
```
VerticalName = collabs
EnvironmentName = dev
```
| SSM                                       | Exported Output                           |
|-------------------------------------------|-------------------------------------------|
| `/dev/collabs/config/ssl-certicate-arn`   | `dev-collabs-configs:ssl-certicate-arn`   |
| `/dev/collabs/config/public-domain-name`  | `dev-collabs-configs:public-domain-name`  |
| `/dev/collabs/config/private-domain-name` | `dev-collabs-configs:private-domain-name` |
