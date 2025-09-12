#!/bin/bash

# Server diagnostic script for BeanGPT CORS/Timeout issues
# Run this on your AWS Lightsail server to diagnose the problem

echo "🔍 BeanGPT Server Diagnostics"
echo "============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}1. Checking nginx configuration...${NC}"
echo "Current nginx config for api.beangpt.ca:"
if [ -f "/etc/nginx/sites-available/api.beangpt.ca" ]; then
    echo -e "${GREEN}✅ Config file exists${NC}"
    echo "First 20 lines:"
    head -20 /etc/nginx/sites-available/api.beangpt.ca
    echo "..."
    echo "Timeout settings:"
    grep -n "timeout" /etc/nginx/sites-available/api.beangpt.ca || echo "No timeout settings found"
    echo "CORS settings:"
    grep -n "Access-Control" /etc/nginx/sites-available/api.beangpt.ca || echo "No CORS settings found"
else
    echo -e "${RED}❌ Config file not found${NC}"
fi

echo -e "\n${BLUE}2. Checking nginx symlink...${NC}"
if [ -L "/etc/nginx/sites-enabled/api.beangpt.ca" ]; then
    echo -e "${GREEN}✅ Symlink exists${NC}"
    ls -la /etc/nginx/sites-enabled/api.beangpt.ca
else
    echo -e "${RED}❌ Symlink missing${NC}"
fi

echo -e "\n${BLUE}3. Testing nginx configuration...${NC}"
sudo nginx -t

echo -e "\n${BLUE}4. Checking nginx status...${NC}"
sudo systemctl status nginx --no-pager -l

echo -e "\n${BLUE}5. Checking what nginx is actually serving...${NC}"
echo "Active nginx configuration:"
sudo nginx -T 2>/dev/null | grep -A 30 "server_name api.beangpt.ca" || echo "No api.beangpt.ca server block found"

echo -e "\n${BLUE}6. Checking backend service...${NC}"
echo "Backend service status:"
sudo systemctl status beangpt-backend --no-pager -l 2>/dev/null || echo "Service 'beangpt-backend' not found"

echo "Python processes:"
ps aux | grep python | grep -v grep || echo "No Python processes found"

echo -e "\n${BLUE}7. Testing local connections...${NC}"
echo "Testing backend directly:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}, Time: %{time_total}s\n" http://localhost:8000/api/ping 2>/dev/null || echo "Backend not responding"

echo "Testing through nginx:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}, Time: %{time_total}s\n" http://localhost/api/ping 2>/dev/null || echo "Nginx proxy not working"

echo -e "\n${BLUE}8. Testing CORS headers...${NC}"
echo "CORS preflight test:"
curl -X OPTIONS \
  -H "Origin: https://beangpt.ca" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I \
  http://localhost/api/ping 2>/dev/null | grep -i "access-control" || echo "No CORS headers found"

echo -e "\n${BLUE}9. Checking DNS resolution...${NC}"
echo "DNS for api.beangpt.ca:"
dig +short api.beangpt.ca || nslookup api.beangpt.ca || echo "DNS lookup failed"

echo "Server's public IP:"
curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "Could not determine public IP"

echo -e "\n${BLUE}10. Checking firewall...${NC}"
sudo ufw status || echo "UFW not installed/configured"

echo -e "\n${BLUE}11. Checking nginx error logs (last 10 lines)...${NC}"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error log found"

echo -e "\n${BLUE}12. Checking nginx access logs (last 5 lines)...${NC}"
sudo tail -5 /var/log/nginx/access.log 2>/dev/null || echo "No nginx access log found"

echo -e "\n${BLUE}13. Checking listening ports...${NC}"
echo "Ports 80 and 8000:"
sudo netstat -tlnp | grep -E ":80|:8000" || ss -tlnp | grep -E ":80|:8000" || echo "Could not check ports"

echo -e "\n${YELLOW}Diagnostic complete!${NC}"
echo -e "\n${YELLOW}Key things to check:${NC}"
echo "1. Does the nginx config show 600s timeouts?"
echo "2. Are CORS headers present in the config?"
echo "3. Is the backend service running?"
echo "4. Does DNS point to the right IP?"
echo "5. Are there any errors in the logs?"
