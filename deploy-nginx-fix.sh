#!/bin/bash

# © Mohsen Yousefzadeh Najafabadi, September 12 2025
# Deployment script to fix CORS and timeout issues

echo "🚀 Deploying BeanGPT CORS and Timeout Fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo -e "${YELLOW}Running as root - good for nginx configuration${NC}"
else
   echo -e "${YELLOW}Not running as root - you may need sudo for nginx operations${NC}"
fi

# Step 1: Backup current nginx configuration
echo -e "\n${YELLOW}Step 1: Backing up current nginx configuration...${NC}"
if [ -f "/etc/nginx/sites-available/api.beangpt.ca" ]; then
    sudo cp /etc/nginx/sites-available/api.beangpt.ca /etc/nginx/sites-available/api.beangpt.ca.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup created${NC}"
else
    echo -e "${YELLOW}⚠️  No existing nginx config found - will create new one${NC}"
fi

# Step 2: Copy new nginx configuration
echo -e "\n${YELLOW}Step 2: Installing new nginx configuration...${NC}"
sudo cp nginx-cors-fix.conf /etc/nginx/sites-available/api.beangpt.ca

# Create symlink if it doesn't exist
if [ ! -L "/etc/nginx/sites-enabled/api.beangpt.ca" ]; then
    sudo ln -s /etc/nginx/sites-available/api.beangpt.ca /etc/nginx/sites-enabled/
    echo -e "${GREEN}✅ Created symlink to sites-enabled${NC}"
fi

# Step 3: Test nginx configuration
echo -e "\n${YELLOW}Step 3: Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors - please check${NC}"
    exit 1
fi

# Step 4: Reload nginx
echo -e "\n${YELLOW}Step 4: Reloading nginx...${NC}"
if sudo systemctl reload nginx; then
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload nginx${NC}"
    exit 1
fi

# Step 5: Restart the backend service
echo -e "\n${YELLOW}Step 5: Restarting BeanGPT backend service...${NC}"
if sudo systemctl restart beangpt-backend; then
    echo -e "${GREEN}✅ Backend service restarted${NC}"
else
    echo -e "${YELLOW}⚠️  Could not restart beangpt-backend service - you may need to restart manually${NC}"
    echo -e "${YELLOW}Try: sudo systemctl restart beangpt-backend${NC}"
fi

# Step 6: Check service status
echo -e "\n${YELLOW}Step 6: Checking service status...${NC}"
echo -e "${YELLOW}Nginx status:${NC}"
sudo systemctl status nginx --no-pager -l

echo -e "\n${YELLOW}Backend service status:${NC}"
sudo systemctl status beangpt-backend --no-pager -l

# Step 7: Test the API endpoint
echo -e "\n${YELLOW}Step 7: Testing API endpoint...${NC}"
echo -e "${YELLOW}Testing CORS preflight request...${NC}"
curl -X OPTIONS \
  -H "Origin: https://beangpt.ca" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  http://localhost/api/ping 2>&1 | grep -E "(Access-Control|HTTP/)"

echo -e "\n${YELLOW}Testing actual API call...${NC}"
curl -X GET http://localhost/api/ping -v 2>&1 | grep -E "(Access-Control|HTTP/|Connection)"

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Check that your domain api.beangpt.ca points to this server"
echo -e "2. Test the frontend at https://beangpt.ca"
echo -e "3. Monitor logs: sudo journalctl -u beangpt-backend -f"
echo -e "4. Monitor nginx logs: sudo tail -f /var/log/nginx/error.log"

echo -e "\n${YELLOW}If you still have issues:${NC}"
echo -e "1. Check DNS: dig api.beangpt.ca"
echo -e "2. Check firewall: sudo ufw status"
echo -e "3. Check if port 80 is open: sudo netstat -tlnp | grep :80"
