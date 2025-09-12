#!/bin/bash

# Quick deployment script for BeanGPT CORS/Timeout fixes
# Run this on your AWS Lightsail server

echo "🚀 BeanGPT Quick Fix Deployment"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root or with sudo access
if ! sudo -n true 2>/dev/null; then
    echo -e "${RED}❌ This script needs sudo access. Please run with sudo or ensure you can sudo.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Backing up current nginx config...${NC}"
if [ -f "/etc/nginx/sites-available/api.beangpt.ca" ]; then
    sudo cp /etc/nginx/sites-available/api.beangpt.ca /etc/nginx/sites-available/api.beangpt.ca.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup created${NC}"
else
    echo -e "${YELLOW}⚠️  No existing config found - will create new one${NC}"
fi

echo -e "${YELLOW}Step 2: Creating new nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/api.beangpt.ca > /dev/null << 'EOF'
# Nginx configuration for api.beangpt.ca
# This configuration handles long-running AI requests and CORS properly

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

echo -e "${GREEN}✅ New nginx config created${NC}"

echo -e "${YELLOW}Step 3: Creating symlink...${NC}"
sudo ln -sf /etc/nginx/sites-available/api.beangpt.ca /etc/nginx/sites-enabled/
echo -e "${GREEN}✅ Symlink created${NC}"

echo -e "${YELLOW}Step 4: Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors!${NC}"
    echo "Please check the configuration and try again."
    exit 1
fi

echo -e "${YELLOW}Step 5: Reloading nginx...${NC}"
if sudo systemctl reload nginx; then
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload nginx${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 6: Checking nginx status...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not running${NC}"
    sudo systemctl status nginx
fi

echo -e "${YELLOW}Step 7: Testing CORS...${NC}"
echo "Testing CORS preflight request..."
CORS_TEST=$(curl -s -X OPTIONS \
  -H "Origin: https://beangpt.ca" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I \
  http://localhost/api/ping 2>/dev/null | grep -i "access-control-allow-origin")

if [[ $CORS_TEST == *"*"* ]]; then
    echo -e "${GREEN}✅ CORS is working correctly${NC}"
else
    echo -e "${YELLOW}⚠️  CORS test inconclusive - check manually${NC}"
fi

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Test your frontend at https://beangpt.ca"
echo "2. If you still have backend issues, restart your backend service:"
echo "   sudo systemctl restart beangpt-backend"
echo "3. Monitor logs if needed:"
echo "   sudo tail -f /var/log/nginx/error.log"
echo "   sudo journalctl -u beangpt-backend -f"

echo -e "\n${YELLOW}If you still see issues:${NC}"
echo "- Make sure api.beangpt.ca DNS points to this server"
echo "- Check firewall: sudo ufw status"
echo "- Verify backend is running: ps aux | grep python"
