#!/bin/bash

# Simple API test script
# Run this on your server to test the API endpoints

echo "🧪 Testing BeanGPT API"
echo "====================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${YELLOW}Test 1: Direct backend connection${NC}"
echo "Testing: http://localhost:8000/api/ping"
BACKEND_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" http://localhost:8000/api/ping 2>/dev/null)
if [[ $BACKEND_RESPONSE == *"HTTP_CODE:200"* ]]; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${RED}❌ Backend not responding${NC}"
    echo "$BACKEND_RESPONSE"
fi

echo -e "\n${YELLOW}Test 2: Nginx proxy connection${NC}"
echo "Testing: http://localhost/api/ping"
NGINX_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" http://localhost/api/ping 2>/dev/null)
if [[ $NGINX_RESPONSE == *"HTTP_CODE:200"* ]]; then
    echo -e "${GREEN}✅ Nginx proxy is working${NC}"
else
    echo -e "${RED}❌ Nginx proxy not working${NC}"
    echo "$NGINX_RESPONSE"
fi

echo -e "\n${YELLOW}Test 3: CORS headers${NC}"
echo "Testing CORS preflight request..."
CORS_HEADERS=$(curl -X OPTIONS \
  -H "Origin: https://beangpt.ca" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I \
  http://localhost/api/ping 2>/dev/null)

echo "Response headers:"
echo "$CORS_HEADERS"

if [[ $CORS_HEADERS == *"Access-Control-Allow-Origin"* ]]; then
    echo -e "${GREEN}✅ CORS headers are present${NC}"
else
    echo -e "${RED}❌ CORS headers missing${NC}"
fi

echo -e "\n${YELLOW}Test 4: External domain test${NC}"
echo "Testing from external perspective..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)
if [ ! -z "$PUBLIC_IP" ]; then
    echo "Server public IP: $PUBLIC_IP"
    echo "Testing: http://$PUBLIC_IP/api/ping"
    EXTERNAL_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://$PUBLIC_IP/api/ping 2>/dev/null)
    if [[ $EXTERNAL_RESPONSE == *"HTTP_CODE:200"* ]]; then
        echo -e "${GREEN}✅ External access working${NC}"
    else
        echo -e "${RED}❌ External access not working${NC}"
        echo "$EXTERNAL_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine public IP${NC}"
fi

echo -e "\n${YELLOW}Test 5: Long request simulation${NC}"
echo "Testing a request that might timeout..."
START_TIME=$(date +%s)
LONG_RESPONSE=$(timeout 30 curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"question": "test long request", "api_key": "test"}' \
  http://localhost/api/chat 2>/dev/null)
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Request took: ${DURATION} seconds"
if [[ $LONG_RESPONSE == *"HTTP_CODE:200"* ]]; then
    echo -e "${GREEN}✅ Long request completed${NC}"
elif [[ $LONG_RESPONSE == *"504"* ]]; then
    echo -e "${RED}❌ Request timed out (504)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected response${NC}"
    echo "$LONG_RESPONSE"
fi

echo -e "\n${YELLOW}Summary:${NC}"
echo "If any tests failed, check:"
echo "1. Backend service: sudo systemctl status beangpt-backend"
echo "2. Nginx config: sudo nginx -T | grep -A 20 'server_name api.beangpt.ca'"
echo "3. Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "4. Backend logs: sudo journalctl -u beangpt-backend -f"
