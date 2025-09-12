#!/bin/bash

# Fix nginx server name conflict for BeanGPT
# This script resolves the "conflicting server name" issue

echo "🔧 Fixing nginx server name conflict"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Finding all configs that mention api.beangpt.ca...${NC}"
echo "Searching in /etc/nginx/sites-available/:"
grep -l "api.beangpt.ca" /etc/nginx/sites-available/* 2>/dev/null || echo "No matches in sites-available"

echo -e "\nSearching in /etc/nginx/sites-enabled/:"
grep -l "api.beangpt.ca" /etc/nginx/sites-enabled/* 2>/dev/null || echo "No matches in sites-enabled"

echo -e "\nSearching in main nginx config:"
grep -n "api.beangpt.ca" /etc/nginx/nginx.conf 2>/dev/null || echo "No matches in nginx.conf"

echo -e "\n${YELLOW}Step 2: Checking what's in the default config...${NC}"
if [ -f "/etc/nginx/sites-available/default" ]; then
    echo "Checking if default config has api.beangpt.ca:"
    grep -n "api.beangpt.ca\|server_name" /etc/nginx/sites-available/default | head -10
fi

echo -e "\n${YELLOW}Step 3: Backing up and removing conflicting configs...${NC}"
# Backup current configs
sudo cp -r /etc/nginx/sites-available /etc/nginx/sites-available.backup.$(date +%Y%m%d_%H%M%S)
sudo cp -r /etc/nginx/sites-enabled /etc/nginx/sites-enabled.backup.$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}✅ Backups created${NC}"

# Remove the default site that might be conflicting
echo "Removing default site from sites-enabled..."
sudo rm -f /etc/nginx/sites-enabled/default

echo -e "\n${YELLOW}Step 4: Ensuring our config is correct...${NC}"
echo "Current api.beangpt.ca config:"
head -10 /etc/nginx/sites-available/api.beangpt.ca

echo -e "\n${YELLOW}Step 5: Testing nginx config...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx config is valid${NC}"
else
    echo -e "${RED}❌ Nginx config has errors${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 6: Restarting nginx...${NC}"
sudo systemctl restart nginx

echo -e "\n${YELLOW}Step 7: Checking for conflicts...${NC}"
if sudo nginx -T 2>&1 | grep -i "conflicting"; then
    echo -e "${RED}❌ Still have conflicts${NC}"
else
    echo -e "${GREEN}✅ No more conflicts${NC}"
fi

echo -e "\n${YELLOW}Step 8: Testing the fix...${NC}"
echo "Testing CORS headers:"
CORS_TEST=$(curl -X OPTIONS \
  -H "Origin: https://beangpt.ca" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I \
  http://localhost/api/ping 2>/dev/null | grep -i "access-control-allow-origin")

if [[ $CORS_TEST == *"*"* ]]; then
    echo -e "${GREEN}✅ CORS is now working!${NC}"
    echo "CORS header: $CORS_TEST"
else
    echo -e "${RED}❌ CORS still not working${NC}"
    echo "Full response:"
    curl -X OPTIONS \
      -H "Origin: https://beangpt.ca" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: Content-Type" \
      -I \
      http://localhost/api/ping 2>/dev/null
fi

echo -e "\n${YELLOW}Step 9: Final verification...${NC}"
echo "Active nginx configuration for api.beangpt.ca:"
sudo nginx -T 2>/dev/null | grep -A 20 "server_name api.beangpt.ca" | head -25

echo -e "\n${GREEN}🎉 Fix complete!${NC}"
echo -e "\n${YELLOW}Summary:${NC}"
echo "- Removed conflicting default site"
echo "- Your api.beangpt.ca config should now be active"
echo "- Test your frontend at https://beangpt.ca"

echo -e "\n${YELLOW}If you still have issues:${NC}"
echo "1. Check nginx error logs: sudo tail -f /var/log/nginx/error.log"
echo "2. Verify backend is running: systemctl status beangpt"
echo "3. Test API directly: curl http://localhost/api/ping"
