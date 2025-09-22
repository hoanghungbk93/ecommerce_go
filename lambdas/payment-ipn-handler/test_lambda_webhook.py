#!/usr/bin/env python3
"""
Test script to directly invoke AWS Lambda function for payment webhook simulation
This script sends test payment notifications to complete orders
"""

import json
import boto3
import hashlib
import hmac
import urllib.parse
from datetime import datetime
import uuid

class LambdaWebhookTester:
    def __init__(self, function_name="ecommerce-payment-ipn-handler", region="ap-southeast-1"):
        """Initialize Lambda client"""
        self.function_name = function_name
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.vnpay_hash_key = "TMNCODE123456789"  # Match the Lambda environment variable
    
    def generate_vnpay_signature(self, params):
        """Generate VNPay signature for webhook"""
        # Remove signature fields
        sign_params = {k: v for k, v in params.items() 
                      if k not in ['vnp_SecureHash', 'vnp_SecureHashType']}
        
        # Sort parameters
        sorted_params = sorted([f"{k}={v}" for k, v in sign_params.items() if v])
        query_string = "&".join(sorted_params)
        
        # Generate HMAC SHA256 signature
        signature = hmac.new(
            self.vnpay_hash_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def invoke_lambda(self, event):
        """Invoke the Lambda function"""
        try:
            response = self.lambda_client.invoke(
                FunctionName=self.function_name,
                InvocationType='RequestResponse',
                Payload=json.dumps(event)
            )
            
            payload = json.loads(response['Payload'].read())
            
            return {
                'status_code': response['StatusCode'],
                'payload': payload,
                'success': response['StatusCode'] == 200
            }
        except Exception as e:
            return {
                'status_code': 500,
                'error': str(e),
                'success': False
            }
    
    def test_vnpay_success(self, order_id, amount=100000):
        """Test VNPay successful payment"""
        txn_id = f"ORDER_{order_id}_{int(datetime.now().timestamp())}"
        
        # VNPay IPN parameters for successful payment
        params = {
            'vnp_Amount': str(amount),
            'vnp_BankCode': 'NCB',
            'vnp_BankTranNo': f'VNP{uuid.uuid4().hex[:8].upper()}',
            'vnp_CardType': 'ATM',
            'vnp_OrderInfo': f'Payment for order {order_id}',
            'vnp_PayDate': datetime.now().strftime('%Y%m%d%H%M%S'),
            'vnp_ResponseCode': '00',  # Success code
            'vnp_TmnCode': 'DEMO',
            'vnp_TransactionNo': f'{uuid.uuid4().int & (1<<32)-1}',
            'vnp_TransactionStatus': '00',  # Success status
            'vnp_TxnRef': txn_id,
            'vnp_SecureHashType': 'SHA256'
        }
        
        # Generate signature
        signature = self.generate_vnpay_signature(params)
        params['vnp_SecureHash'] = signature
        
        # Create Lambda event
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': params,
            'body': None,
            'isBase64Encoded': False
        }
        
        print(f"🔵 Testing VNPay SUCCESS for Order {order_id}")
        print(f"   Transaction ID: {txn_id}")
        print(f"   Amount: {amount} VND cents")
        
        result = self.invoke_lambda(event)
        self._print_result(result, 'VNPay Success')
        return result
    
    def test_vnpay_failure(self, order_id, amount=100000):
        """Test VNPay failed payment"""
        txn_id = f"ORDER_{order_id}_{int(datetime.now().timestamp())}"
        
        params = {
            'vnp_Amount': str(amount),
            'vnp_BankCode': 'NCB',
            'vnp_OrderInfo': f'Payment for order {order_id}',
            'vnp_PayDate': datetime.now().strftime('%Y%m%d%H%M%S'),
            'vnp_ResponseCode': '24',  # Failed code
            'vnp_TmnCode': 'DEMO',
            'vnp_TransactionStatus': '02',  # Failed status
            'vnp_TxnRef': txn_id,
            'vnp_SecureHashType': 'SHA256'
        }
        
        signature = self.generate_vnpay_signature(params)
        params['vnp_SecureHash'] = signature
        
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': params,
            'body': None,
            'isBase64Encoded': False
        }
        
        print(f"🔴 Testing VNPay FAILURE for Order {order_id}")
        print(f"   Transaction ID: {txn_id}")
        
        result = self.invoke_lambda(event)
        self._print_result(result, 'VNPay Failure')
        return result
    
    def test_paypal_success(self, order_id, amount="10.00", currency="USD"):
        """Test PayPal successful payment"""
        txn_id = f'PAY-{uuid.uuid4().hex[:16].upper()}'
        
        params = {
            'txn_id': txn_id,
            'payment_status': 'Completed',
            'payment_type': 'instant',
            'payment_date': datetime.now().strftime('%H:%M:%S %b %d, %Y PDT'),
            'payment_gross': amount,
            'mc_currency': currency,
            'mc_gross': amount,
            'item_name': f'Order #{order_id}',
            'item_number': str(order_id),
            'quantity': '1',
            'receiver_email': 'seller@example.com',
            'payer_email': 'buyer@example.com',
            'payer_status': 'verified',
            'residence_country': 'US',
            'invoice': f'INV-{order_id}',
            'custom': str(order_id)
        }
        
        # Create Lambda event (PayPal sends as POST form data)
        event = {
            'httpMethod': 'POST',
            'queryStringParameters': {},
            'body': urllib.parse.urlencode(params),
            'isBase64Encoded': False
        }
        
        print(f"🔵 Testing PayPal SUCCESS for Order {order_id}")
        print(f"   Transaction ID: {txn_id}")
        print(f"   Amount: {amount} {currency}")
        
        result = self.invoke_lambda(event)
        self._print_result(result, 'PayPal Success')
        return result
    
    def test_paypal_failure(self, order_id, amount="10.00", currency="USD"):
        """Test PayPal failed payment"""
        txn_id = f'PAY-{uuid.uuid4().hex[:16].upper()}'
        
        params = {
            'txn_id': txn_id,
            'payment_status': 'Failed',
            'payment_type': 'instant',
            'payment_date': datetime.now().strftime('%H:%M:%S %b %d, %Y PDT'),
            'mc_currency': currency,
            'item_name': f'Order #{order_id}',
            'item_number': str(order_id),
            'quantity': '1',
            'receiver_email': 'seller@example.com',
            'payer_email': 'buyer@example.com',
            'payer_status': 'verified',
            'residence_country': 'US',
            'invoice': f'INV-{order_id}',
            'custom': str(order_id)
        }
        
        event = {
            'httpMethod': 'POST',
            'queryStringParameters': {},
            'body': urllib.parse.urlencode(params),
            'isBase64Encoded': False
        }
        
        print(f"🔴 Testing PayPal FAILURE for Order {order_id}")
        print(f"   Transaction ID: {txn_id}")
        
        result = self.invoke_lambda(event)
        self._print_result(result, 'PayPal Failure')
        return result
    
    def test_invalid_signature(self, order_id):
        """Test VNPay with invalid signature"""
        txn_id = f"ORDER_{order_id}_{int(datetime.now().timestamp())}"
        
        params = {
            'vnp_Amount': '100000',
            'vnp_ResponseCode': '00',
            'vnp_TxnRef': txn_id,
            'vnp_SecureHash': 'invalid_signature_here',
            'vnp_SecureHashType': 'SHA256'
        }
        
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': params,
            'body': None,
            'isBase64Encoded': False
        }
        
        print(f"⚠️  Testing INVALID SIGNATURE for Order {order_id}")
        
        result = self.invoke_lambda(event)
        self._print_result(result, 'Invalid Signature')
        return result
    
    def _print_result(self, result, test_name):
        """Print test result"""
        if result['success']:
            print(f"   ✅ {test_name}: Success")
            if 'payload' in result:
                payload = result['payload']
                print(f"   📊 Status Code: {payload.get('statusCode', 'N/A')}")
                if payload.get('body'):
                    try:
                        body = json.loads(payload['body'])
                        print(f"   📝 Response: {json.dumps(body, indent=6)}")
                    except:
                        print(f"   📝 Response: {payload['body']}")
        else:
            print(f"   ❌ {test_name}: Failed")
            if 'error' in result:
                print(f"   🚨 Error: {result['error']}")
            elif 'payload' in result:
                print(f"   📝 Response: {result['payload']}")
        print()


def main():
    """Main test function"""
    print("🧪 Lambda Payment Webhook Tester")
    print("=" * 50)
    
    # Initialize tester
    tester = LambdaWebhookTester()
    
    # Test with different order IDs
    test_orders = [
        {"id": "123", "description": "Test Order #123"},
        {"id": "456", "description": "Test Order #456"}
    ]
    
    print(f"🎯 Testing Lambda Function: {tester.function_name}")
    print(f"🌏 Region: ap-southeast-1")
    print()
    
    for order in test_orders:
        order_id = order["id"]
        print(f"📦 {order['description']}")
        print("-" * 30)
        
        # Test successful payments
        tester.test_vnpay_success(order_id, amount=100000)
        tester.test_paypal_success(order_id, amount="10.00")
        
        # Test failed payments
        # tester.test_vnpay_failure(order_id, amount=50000)
        # tester.test_paypal_failure(order_id, amount="5.00")
        
        print()
    
    # Test edge cases
    print("🔬 Edge Case Tests")
    print("-" * 30)
    tester.test_invalid_signature("999")
    
    print("✅ All Lambda tests completed!")
    print("\n💡 Next Steps:")
    print("- Check CloudWatch logs: aws logs tail /aws/lambda/ecommerce-payment-ipn-handler")
    print("- Verify database updates in your ecommerce DB")
    print("- Check SNS notifications (if configured)")


if __name__ == "__main__":
    main()
