#!/usr/bin/env python3

import time
import requests
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
import threading
import json

class NginxExporter:
    def __init__(self, nginx_status_url="http://load-balancer:80/nginx_status"):
        self.nginx_status_url = nginx_status_url
        self.metrics = {}
        self.last_update = 0
        
    def fetch_nginx_stats(self):
        try:
            response = requests.get(self.nginx_status_url, timeout=5)
            if response.status_code == 200:
                return self.parse_nginx_status(response.text)
        except Exception as e:
            print(f"Error fetching nginx stats: {e}")
        return {}
    
    def parse_nginx_status(self, status_text):
        """Parse nginx stub_status output"""
        metrics = {}
        
        # Parse Active connections line
        active_match = re.search(r'Active connections:\s*(\d+)', status_text)
        if active_match:
            metrics['nginx_connections_active'] = int(active_match.group(1))
        
        # Parse server accepts handled requests line
        server_match = re.search(r'\s*(\d+)\s+(\d+)\s+(\d+)\s*', status_text)
        if server_match:
            metrics['nginx_connections_accepted_total'] = int(server_match.group(1))
            metrics['nginx_connections_handled_total'] = int(server_match.group(2))  
            metrics['nginx_http_requests_total'] = int(server_match.group(3))
        
        # Parse Reading/Writing/Waiting
        conn_match = re.search(r'Reading:\s*(\d+).*?Writing:\s*(\d+).*?Waiting:\s*(\d+)', status_text)
        if conn_match:
            metrics['nginx_connections_reading'] = int(conn_match.group(1))
            metrics['nginx_connections_writing'] = int(conn_match.group(2))
            metrics['nginx_connections_waiting'] = int(conn_match.group(3))
            
        return metrics
    
    def get_prometheus_metrics(self):
        """Return metrics in Prometheus format"""
        current_time = time.time()
        
        # Refresh metrics every 10 seconds
        if current_time - self.last_update > 10:
            self.metrics = self.fetch_nginx_stats()
            self.last_update = current_time
        
        prometheus_output = []
        
        for metric_name, value in self.metrics.items():
            if 'total' in metric_name:
                prometheus_output.append(f'# HELP {metric_name} Total {metric_name.replace("_total", "").replace("_", " ")}')
                prometheus_output.append(f'# TYPE {metric_name} counter')
            else:
                prometheus_output.append(f'# HELP {metric_name} Current {metric_name.replace("_", " ")}')
                prometheus_output.append(f'# TYPE {metric_name} gauge')
            
            prometheus_output.append(f'{metric_name} {value}')
            prometheus_output.append('')
        
        # Add uptime metric
        prometheus_output.append('# HELP nginx_exporter_uptime_seconds Nginx exporter uptime')
        prometheus_output.append('# TYPE nginx_exporter_uptime_seconds counter')
        prometheus_output.append(f'nginx_exporter_uptime_seconds {int(current_time - start_time)}')
        
        return '\n'.join(prometheus_output)

class MetricsHandler(BaseHTTPRequestHandler):
    def __init__(self, exporter, *args, **kwargs):
        self.exporter = exporter
        super().__init__(*args, **kwargs)
        
    def do_GET(self):
        if self.path == '/metrics':
            metrics = self.exporter.get_prometheus_metrics()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
            self.end_headers()
            self.wfile.write(metrics.encode('utf-8'))
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            health_status = {
                "status": "healthy",
                "service": "nginx-exporter",
                "timestamp": time.time()
            }
            self.wfile.write(json.dumps(health_status).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

def create_handler(exporter):
    def handler(*args, **kwargs):
        MetricsHandler(exporter, *args, **kwargs)
    return handler

if __name__ == '__main__':
    start_time = time.time()
    
    exporter = NginxExporter()
    handler = create_handler(exporter)
    
    server = HTTPServer(('0.0.0.0', 9113), handler)
    print("Nginx Prometheus Exporter running on port 9113")
    print("Metrics available at: http://localhost:9113/metrics")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down exporter...")
        server.shutdown()
