#/bin/sh

set -eo pipefail

set -u

host=$(aws eks describe-cluster --name ${CLUSTER_NAME} --query cluster.endpoint --output text)
ca_crt=$(aws eks describe-cluster --name ${CLUSTER_NAME} --query cluster.certificateAuthority.data --output text)

# kubectl config set-cluster --embed-certs=false

cat <<EOF
---
apiVersion: v1
clusters:
  - cluster:
      server: $host
      certificate-authority-data: $ca_crt
    name: $CLUSTER_NAME
contexts:
  - context:
      cluster: $CLUSTER_NAME
      user: aws
    name: aws
current-context: aws
kind: Config
preferences: {}
users:
  - name: aws
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1alpha1
        command: aws-iam-authenticator
        args:
          - "token"
          - "-i"
          - "$CLUSTER_NAME"
EOF
