#!/usr/bin/env python3

import hmac
import hashlib
import json
import requests
import time

# Webhook secret (should match the one in docker-compose.yml)
WEBHOOK_SECRET = "your-webhook-secret-key-change-in-production"

def generate_signature(payload, secret):
    """Generate SHA256 HMAC signature for webhook payload"""
    mac = hmac.new(secret.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256)
    return mac.hexdigest()

def test_webhook():
    # Sample webhook payload
    webhook_data = {
        "order_id": "ORD-123456789",
        "transaction_id": "TXN-987654321",
        "amount": 150000.00,
        "currency": "VND",
        "status": "completed",
        "payment_method": "vnpay",
        "event_type": "payment.completed",
        "timestamp": int(time.time()),
        "metadata": {
            "customer_id": "CUST-12345",
            "product_ids": ["PROD-001", "PROD-002"],
            "payment_gateway": "vnpay"
        }
    }
    
    # Convert to JSON string
    payload = json.dumps(webhook_data, separators=(',', ':'), sort_keys=True)
    
    # Generate signature
    signature = generate_signature(payload, WEBHOOK_SECRET)
    
    # Headers
    headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': f'sha256={signature}',
        'User-Agent': 'VNPay-Webhook/1.0'
    }
    
    # Send webhook request
    webhook_url = "http://localhost/api/v1/webhooks/payment"
    
    print(f"Sending webhook to: {webhook_url}")
    print(f"Payload: {payload}")
    print(f"Signature: sha256={signature}")
    print("-" * 50)
    
    try:
        response = requests.post(webhook_url, data=payload, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ Webhook successfully processed!")
        else:
            print(f"\n❌ Webhook failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error sending webhook: {e}")

def test_invalid_signature():
    """Test webhook with invalid signature"""
    webhook_data = {
        "order_id": "ORD-INVALID",
        "transaction_id": "TXN-INVALID",
        "amount": 50000.00,
        "currency": "VND",
        "status": "failed",
        "payment_method": "vnpay"
    }
    
    payload = json.dumps(webhook_data, separators=(',', ':'))
    
    headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': 'sha256=invalid_signature_here',
        'User-Agent': 'VNPay-Webhook/1.0'
    }
    
    webhook_url = "http://localhost/api/v1/webhooks/payment"
    
    print(f"\nTesting invalid signature...")
    print(f"Sending webhook to: {webhook_url}")
    
    try:
        response = requests.post(webhook_url, data=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 401:
            print("✅ Invalid signature properly rejected!")
        else:
            print("❌ Invalid signature should have been rejected")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔨 Testing Webhook Service")
    print("=" * 50)
    
    # Test valid webhook
    test_webhook()
    
    # Test invalid signature
    test_invalid_signature()
    
    print("\n🎯 Testing completed!")
