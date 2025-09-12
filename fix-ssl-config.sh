#!/bin/bash

# Fix SSL configuration for BeanGPT
# This adds HTTPS support with proper CORS and timeouts

echo "🔒 Adding SSL support to BeanGPT nginx config"
echo "=============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Checking for SSL certificates...${NC}"
if [ -f "/etc/letsencrypt/live/api.beangpt.ca/fullchain.pem" ]; then
    echo -e "${GREEN}✅ SSL certificates found${NC}"
    SSL_AVAILABLE=true
else
    echo -e "${RED}❌ SSL certificates not found${NC}"
    SSL_AVAILABLE=false
fi

echo -e "\n${YELLOW}Step 2: Creating complete nginx config with SSL support...${NC}"

# Backup current config
sudo cp /etc/nginx/sites-available/api.beangpt.ca /etc/nginx/sites-available/api.beangpt.ca.backup.$(date +%Y%m%d_%H%M%S)

if [ "$SSL_AVAILABLE" = true ]; then
    echo "Creating config with SSL support..."
    sudo tee /etc/nginx/sites-available/api.beangpt.ca > /dev/null << 'EOF'
# HTTP server - redirects to HTTPS
server {
    listen 80;
    server_name api.beangpt.ca;
    
    # Redirect all HTTP requests to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server - main configuration
server {
    listen 443 ssl;
    server_name api.beangpt.ca;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.beangpt.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.beangpt.ca/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Increase timeout values for AI processing (10 minutes)
    proxy_connect_timeout       600s;
    proxy_send_timeout          600s;
    proxy_read_timeout          600s;
    send_timeout                600s;
    
    # Increase client body size for large requests
    client_max_body_size        10M;
    client_body_timeout         60s;
    client_header_timeout       60s;
    
    location / {
        # Forward to your FastAPI app
        proxy_pass http://localhost:8000;
        
        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';
        
        # HTTP version for better streaming support
        proxy_http_version 1.1;
        
        # CORS Headers - Force them at nginx level
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }
        
        # Disable buffering for streaming responses
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        
        # Keep connections alive
        proxy_set_header Connection "keep-alive";
    }
}
EOF
else
    echo "Creating HTTP-only config (no SSL certificates found)..."
    sudo tee /etc/nginx/sites-available/api.beangpt.ca > /dev/null << 'EOF'
# HTTP server - main configuration
server {
    listen 80;
    server_name api.beangpt.ca;
    
    # Increase timeout values for AI processing (10 minutes)
    proxy_connect_timeout       600s;
    proxy_send_timeout          600s;
    proxy_read_timeout          600s;
    send_timeout                600s;
    
    # Increase client body size for large requests
    client_max_body_size        10M;
    client_body_timeout         60s;
    client_header_timeout       60s;
    
    location / {
        # Forward to your FastAPI app
        proxy_pass http://localhost:8000;
        
        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';
        
        # HTTP version for better streaming support
        proxy_http_version 1.1;
        
        # CORS Headers - Force them at nginx level
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }
        
        # Disable buffering for streaming responses
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        
        # Keep connections alive
        proxy_set_header Connection "keep-alive";
    }
}
EOF
fi

echo -e "${GREEN}✅ New config created${NC}"

echo -e "\n${YELLOW}Step 3: Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 4: Restarting nginx...${NC}"
sudo systemctl restart nginx

echo -e "\n${YELLOW}Step 5: Testing the configuration...${NC}"
if [ "$SSL_AVAILABLE" = true ]; then
    echo "Testing HTTPS endpoint:"
    HTTPS_TEST=$(curl -k -s -o /dev/null -w "HTTP Status: %{http_code}" https://localhost/api/ping 2>/dev/null)
    echo "HTTPS test: $HTTPS_TEST"
    
    echo "Testing HTTPS CORS:"
    curl -k -X OPTIONS \
      -H "Origin: https://beangpt.ca" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: Content-Type" \
      -I \
      https://localhost/api/ping 2>/dev/null | grep -i "access-control" || echo "No CORS headers found"
else
    echo "Testing HTTP endpoint:"
    HTTP_TEST=$(curl -s -o /dev/null -w "HTTP Status: %{http_code}" http://localhost/api/ping 2>/dev/null)
    echo "HTTP test: $HTTP_TEST"
fi

echo -e "\n${GREEN}🎉 SSL configuration complete!${NC}"

if [ "$SSL_AVAILABLE" = true ]; then
    echo -e "\n${YELLOW}Your API is now available at:${NC}"
    echo "- https://api.beangpt.ca (HTTPS - recommended)"
    echo "- http://api.beangpt.ca (redirects to HTTPS)"
else
    echo -e "\n${YELLOW}Your API is available at:${NC}"
    echo "- http://api.beangpt.ca (HTTP only - no SSL certificates found)"
    echo -e "\n${YELLOW}To enable HTTPS, you need to install SSL certificates:${NC}"
    echo "sudo certbot --nginx -d api.beangpt.ca"
fi

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Test your frontend at https://beangpt.ca"
echo "2. If using HTTP only, update your frontend config to use http://api.beangpt.ca"
echo "3. Monitor logs: sudo tail -f /var/log/nginx/error.log"
