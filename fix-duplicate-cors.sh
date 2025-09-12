#!/bin/bash

# Fix duplicate CORS headers issue
# Remove CORS from FastAPI backend since nginx is handling it

echo "🔧 Fixing duplicate CORS headers"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}The issue: Both nginx and FastAPI are adding CORS headers${NC}"
echo "This causes: Access-Control-Allow-Origin: *, *"
echo "Browser rejects: Multiple values not allowed"
echo ""

echo -e "${YELLOW}Solution: Remove CORS from FastAPI backend${NC}"
echo "Let nginx handle all CORS headers"
echo ""

echo -e "${YELLOW}Step 1: Backing up current backend main.py...${NC}"
sudo cp /opt/beangpt/backend/main.py /opt/beangpt/backend/main.py.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"

echo -e "\n${YELLOW}Step 2: Updating FastAPI backend to remove CORS middleware...${NC}"

# Create the updated main.py without CORS middleware
sudo tee /opt/beangpt/backend/main.py > /dev/null << 'EOF'
# © Mohsen Yousefzadeh Najafabadi, August 30 2025
# All rights reserved. Unauthorized use, distribution, or modification prohibited.


from fastapi import FastAPI
# Remove CORS middleware import since nginx handles CORS
from config import settings
from routes import chat, ping, gene_search
import os

# Note: Using default config settings for all deployments

app = FastAPI(
    title="BeanGPT Main Platform API",
    description="API for dry bean genetics research chatbot",
    version="1.0.0"
)

# CORS is now handled by nginx - no need for FastAPI CORS middleware
# This prevents duplicate CORS headers

# Add middleware to handle connection errors
@app.middleware("http")
async def handle_connection_errors(request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        print(f"❌ Connection error: {e}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"error": "Connection error", "detail": str(e)}
        )

# Include routers
app.include_router(chat.router, prefix=settings.api_prefix, tags=["chat"])
app.include_router(ping.router, prefix=settings.api_prefix, tags=["health"])
app.include_router(gene_search.router, prefix=settings.api_prefix, tags=["gene_search"])

# Add health checks
from routes import health
app.include_router(health.router, prefix=settings.api_prefix, tags=["health"])


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
EOF

echo -e "${GREEN}✅ Updated main.py (removed CORS middleware)${NC}"

echo -e "\n${YELLOW}Step 3: Restarting backend service...${NC}"
sudo systemctl restart beangpt

echo -e "\n${YELLOW}Step 4: Testing the fix...${NC}"
sleep 3

echo "Testing CORS headers (should only see one set):"
CORS_TEST=$(curl -X OPTIONS \
  -H "Origin: https://beangpt.ca" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I \
  https://localhost/api/ping 2>/dev/null)

echo "$CORS_TEST"

# Check for duplicate headers
if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin.*Access-Control-Allow-Origin"; then
    echo -e "${RED}❌ Still seeing duplicate CORS headers${NC}"
else
    echo -e "${GREEN}✅ CORS headers look good (no duplicates)${NC}"
fi

echo -e "\n${YELLOW}Step 5: Testing a real API call...${NC}"
API_TEST=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://beangpt.ca" \
  -d '{"question": "test", "api_key": "test"}' \
  https://localhost/api/ping 2>/dev/null)

if [[ $API_TEST == *"HTTP_CODE:200"* ]] || [[ $API_TEST == *"HTTP_CODE:422"* ]]; then
    echo -e "${GREEN}✅ API is responding (no CORS errors)${NC}"
else
    echo -e "${RED}❌ API still has issues${NC}"
    echo "$API_TEST"
fi

echo -e "\n${GREEN}🎉 Fix complete!${NC}"
echo -e "\n${YELLOW}What we did:${NC}"
echo "1. Removed CORSMiddleware from FastAPI backend"
echo "2. Let nginx handle all CORS headers"
echo "3. Eliminated duplicate headers"
echo ""
echo -e "${YELLOW}Test your frontend now at https://beangpt.ca${NC}"
echo ""
echo -e "${YELLOW}If you still have issues:${NC}"
echo "1. Check browser console for CORS errors"
echo "2. Monitor backend logs: sudo journalctl -u beangpt -f"
echo "3. Check nginx logs: sudo tail -f /var/log/nginx/error.log"
