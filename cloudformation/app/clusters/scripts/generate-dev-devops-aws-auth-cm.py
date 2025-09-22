import boto3


client = boto3.client('cloudformation')

res = client.describe_stack_resources(StackName='dev-devops-eks')

node_roles = []

for stack_resource in res['StackResources']:
    if stack_resource['ResourceType'] != 'AWS::CloudFormation::Stack':
        continue

    # print(stack_resource)
    # print('===')
    pid = stack_resource['PhysicalResourceId']
    res = client.describe_stacks(StackName=pid)
    stack = res['Stacks'][0]
    for output in stack['Outputs']:
        if output['OutputKey'] == 'NodeInstanceRole':
            node_roles.append(output['OutputValue'])


# print(node_roles)


def mk_node_role_entry(role_arn):
    return "\n".join([f"- rolearn: {role_arn}",
                      "  username: system:node:{{EC2PrivateDNSName}}",
                      "  groups:",
                      "    - system:bootstrappers",
                      "    - system:nodes"])
cm = {
    "apiVersion": "v1",
    "kind": "ConfigMap",
    "metadata": {
        "name": "aws-auth",
        "namespace": "kube-system",
    },
    "data": {
        "mapRoles": "",
        "mapUsers": "",
    }
}


if node_roles:
    #node_roles.append("AYY")
    maps = list(map(mk_node_role_entry, node_roles))
    cm["data"]["mapRoles"] += "\n".join(maps)

import yaml
print(yaml.dump(cm))
