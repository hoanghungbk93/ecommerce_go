#!/bin/bash

set -e

source Makefile.vars

echo "Deploying Lambda function: $LAMBDA_FUNCTION_NAME"

pip install -r requirements.txt -t ./package/

cp lambda_function.py ./package/

cd package

zip -r ../deployment-package.zip .

cd ..

aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION_NAME \
    --zip-file fileb://deployment-package.zip \
    --region $AWS_REGION

aws lambda update-function-configuration \
    --function-name $LAMBDA_FUNCTION_NAME \
    --runtime $LAMBDA_RUNTIME \
    --timeout $LAMBDA_TIMEOUT \
    --memory-size $LAMBDA_MEMORY \
    --environment "Variables={$ENVIRONMENT_VARIABLES}" \
    --vpc-config "$VPC_CONFIG" \
    --region $AWS_REGION

echo "Lambda function deployed successfully!"

rm -rf package/
rm deployment-package.zip

echo "Cleanup completed."
