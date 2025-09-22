import json
import os
import hashlib
import hmac
import urllib.parse
from datetime import datetime
import pymysql
import boto3
import logging

# Set up simple logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def lambda_handler(event, context):
    try:
        logger.info("Payment IPN request received")
        
        if event.get('httpMethod') == 'POST':
            body = event.get('body', '')
            if event.get('isBase64Encoded'):
                import base64
                body = base64.b64decode(body).decode('utf-8')
                
            params = urllib.parse.parse_qs(body) if body else {}
        else:
            params = event.get('queryStringParameters', {})
        
        if not params:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No parameters provided'})
            }
        
        payment_gateway = detect_payment_gateway(params)
        
        if payment_gateway == 'vnpay':
            return handle_vnpay_ipn(params)
        elif payment_gateway == 'paypal':
            return handle_paypal_ipn(params)
        else:
            logger.error("Unknown payment gateway")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Unknown payment gateway'})
            }
            
    except Exception as e:
        logger.error('Error processing payment IPN: %s', str(e))
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }

def detect_payment_gateway(params):
    if any(key.startswith('vnp_') for key in params.keys()):
        return 'vnpay'
    elif 'txn_id' in params or 'payment_status' in params:
        return 'paypal'
    return 'unknown'

def handle_vnpay_ipn(params):
    try:
        vnp_params = {}
        for key, value in params.items():
            if isinstance(value, list):
                vnp_params[key] = value[0]
            else:
                vnp_params[key] = value
        
        if not validate_vnpay_signature(vnp_params):
            logger.error("Invalid VNPay signature")
            return {
                'statusCode': 400,
                'body': json.dumps({'RspCode': '97', 'Message': 'Invalid signature'})
            }
        
        txn_ref = vnp_params.get('vnp_TxnRef')
        response_code = vnp_params.get('vnp_ResponseCode')
        amount = vnp_params.get('vnp_Amount')
        
        if not txn_ref:
            return {
                'statusCode': 400,
                'body': json.dumps({'RspCode': '02', 'Message': 'Missing transaction reference'})
            }
        
        payment_status = 'completed' if response_code == '00' else 'failed'
        
        success = update_payment_status(txn_ref, payment_status, vnp_params)
        
        if success:
            if payment_status == 'completed':
                send_payment_notification(txn_ref, 'payment_completed', vnp_params)
            
            logger.info("Payment IPN processed successfully: %s, %s", 
                       txn_ref, payment_status)
            
            return {
                'statusCode': 200,
                'body': json.dumps({'RspCode': '00', 'Message': 'Success'})
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'RspCode': '02', 'Message': 'Order not found'})
            }
            
    except Exception as e:
        logger.error("Error handling VNPay IPN: %s", str(e))
        return {
            'statusCode': 500,
            'body': json.dumps({'RspCode': '99', 'Message': 'System error'})
        }

def validate_vnpay_signature(params):
    try:
        signature = params.get('vnp_SecureHash')
        if not signature:
            return False
        
        params_copy = params.copy()
        params_copy.pop('vnp_SecureHash', None)
        params_copy.pop('vnp_SecureHashType', None)
        
        sorted_params = sorted([f"{k}={v}" for k, v in params_copy.items() if v])
        query_string = "&".join(sorted_params)
        
        hash_key = os.environ.get('VNPAY_HASH_KEY')
        if not hash_key:
            logger.error("VNPAY_HASH_KEY not configured")
            return False
        
        expected_signature = hmac.new(
            hash_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature == expected_signature
        
    except Exception as e:
        logger.error("Error validating VNPay signature: %s", str(e))
        return False

def update_payment_status(transaction_id, status, gateway_params):
    try:
        connection = get_database_connection()
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, order_id FROM payments 
                WHERE transaction_id = %s AND status = 'pending'
            """, (transaction_id,))
            
            payment = cursor.fetchone()
            if not payment:
                logger.warning("Payment not found or already processed: %s", 
                             transaction_id)
                return False
            
            payment_id, order_id = payment
            
            cursor.execute("""
                UPDATE payments 
                SET status = %s, processed_at = %s, gateway_response = %s
                WHERE id = %s
            """, (
                status,
                datetime.now(),
                json.dumps(gateway_params),
                payment_id
            ))
            
            if status == 'completed':
                cursor.execute("""
                    UPDATE orders 
                    SET payment_status = 'paid', status = 'confirmed'
                    WHERE id = %s
                """, (order_id,))
            
            connection.commit()
            
            logger.info("Payment status updated: payment_id=%s, order_id=%s, status=%s", 
                       payment_id, order_id, status)
            
            return True
            
    except Exception as e:
        logger.error("Error updating payment status: %s", str(e))
        return False
    finally:
        if 'connection' in locals():
            connection.close()

def get_database_connection():
    return pymysql.connect(
        host=os.environ.get('DB_HOST'),
        user=os.environ.get('DB_USER'),
        password=os.environ.get('DB_PASSWORD'),
        database=os.environ.get('DB_NAME'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def send_payment_notification(transaction_id, event_type, data):
    try:
        sns_topic_arn = os.environ.get('PAYMENT_NOTIFICATION_TOPIC_ARN')
        if not sns_topic_arn:
            logger.warning("Payment notification topic not configured")
            return
        
        message = {
            'event_type': event_type,
            'transaction_id': transaction_id,
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        
        sns = boto3.client('sns')
        sns.publish(
            TopicArn=sns_topic_arn,
            Message=json.dumps(message),
            Subject=f'Payment {event_type}: {transaction_id}'
        )
        
        logger.info("Payment notification sent: transaction_id=%s, event_type=%s", 
                   transaction_id, event_type)
        
    except Exception as e:
        logger.error("Error sending payment notification: %s", str(e))
