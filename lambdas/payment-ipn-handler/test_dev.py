import json
import os
import pytest
from moto import mock_aws
import boto3
from lambda_function import lambda_handler, validate_vnpay_signature, detect_payment_gateway

os.environ['VNPAY_HASH_KEY'] = 'test-hash-key'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_USER'] = 'test'
os.environ['DB_PASSWORD'] = 'test'
os.environ['DB_NAME'] = 'test_ecommerce'

def test_vnpay_ipn_success():
    event = {
        'httpMethod': 'POST',
        'body': 'vnp_TxnRef=ORDER_123_1234567890&vnp_ResponseCode=00&vnp_Amount=10000&vnp_SecureHash=test_hash',
        'queryStringParameters': {}
    }
    
    context = {}
    
    response = lambda_handler(event, context)
    
    assert response['statusCode'] == 200
    response_body = json.loads(response['body'])
    assert response_body['RspCode'] == '00'

def test_vnpay_ipn_invalid_signature():
    event = {
        'httpMethod': 'POST',
        'body': 'vnp_TxnRef=ORDER_123_1234567890&vnp_ResponseCode=00&vnp_Amount=10000&vnp_SecureHash=invalid_hash',
        'queryStringParameters': {}
    }
    
    context = {}
    
    response = lambda_handler(event, context)
    
    assert response['statusCode'] == 400
    response_body = json.loads(response['body'])
    assert response_body['RspCode'] == '97'

def test_detect_payment_gateway():
    vnpay_params = {'vnp_TxnRef': 'ORDER_123', 'vnp_ResponseCode': '00'}
    paypal_params = {'txn_id': 'TXN123', 'payment_status': 'Completed'}
    unknown_params = {'custom_param': 'value'}
    
    assert detect_payment_gateway(vnpay_params) == 'vnpay'
    assert detect_payment_gateway(paypal_params) == 'paypal'
    assert detect_payment_gateway(unknown_params) == 'unknown'

def test_validate_vnpay_signature():
    valid_params = {
        'vnp_TxnRef': 'ORDER_123_1234567890',
        'vnp_ResponseCode': '00',
        'vnp_Amount': '10000',
        'vnp_SecureHash': 'computed_valid_hash'
    }
    
    invalid_params = {
        'vnp_TxnRef': 'ORDER_123_1234567890',
        'vnp_ResponseCode': '00',
        'vnp_Amount': '10000',
        'vnp_SecureHash': 'invalid_hash'
    }
    
    assert validate_vnpay_signature(invalid_params) == False

def test_missing_parameters():
    event = {
        'httpMethod': 'POST',
        'body': '',
        'queryStringParameters': {}
    }
    
    context = {}
    
    response = lambda_handler(event, context)
    
    assert response['statusCode'] == 400
    response_body = json.loads(response['body'])
    assert 'No parameters provided' in response_body['error']

@mock_aws
def test_send_payment_notification():
    from lambda_function import send_payment_notification
    
    os.environ['PAYMENT_NOTIFICATION_TOPIC_ARN'] = 'arn:aws:sns:us-east-1:123456789012:test-topic'
    
    sns = boto3.client('sns', region_name='us-east-1')
    sns.create_topic(Name='test-topic')
    
    send_payment_notification('ORDER_123', 'payment_completed', {'test': 'data'})

if __name__ == '__main__':
    test_vnpay_ipn_success()
    test_vnpay_ipn_invalid_signature()
    test_detect_payment_gateway()
    test_validate_vnpay_signature()
    test_missing_parameters()
    print("All tests passed!")
