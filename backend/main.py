# © Mohsen Yousefzadeh Najafabadi, August 30 2025
# All rights reserved. Unauthorized use, distribution, or modification prohibited.


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes import chat, ping, gene_search
import os

# Note: Using default config settings for all deployments

app = FastAPI(
    title="BeanGPT Main Platform API",
    description="API for dry bean genetics research chatbot",
    version="1.0.0"
)

# Configure CORS - ALLOW ALL ORIGINS FOR PRODUCTION
print("🔧 CORS Configuration: ALLOWING ALL ORIGINS - NO RESTRICTIONS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# FORCE CORS HEADERS ON EVERY RESPONSE
@app.middleware("http")
async def force_cors_headers(request, call_next):
    origin = request.headers.get("origin")
    print(f"🌐 {request.method} request from origin: {origin}")
    
    # Handle preflight OPTIONS requests immediately
    if request.method == "OPTIONS":
        from fastapi.responses import Response
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        print("🔧 Handled OPTIONS preflight request")
        return response
    
    # Process the request
    response = await call_next(request)
    
    # FORCE CORS headers on EVERY response
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    print(f"✅ Response status: {response.status_code} - CORS headers FORCED")
    
    return response

# Include routers
app.include_router(chat.router, prefix=settings.api_prefix, tags=["chat"])
app.include_router(ping.router, prefix=settings.api_prefix, tags=["health"])
app.include_router(gene_search.router, prefix=settings.api_prefix, tags=["gene_search"])

# Add health checks
from routes import health
app.include_router(health.router, prefix=settings.api_prefix, tags=["health"])

# Add debug endpoint
@app.get("/debug/cors")
async def debug_cors():
    return {
        "message": "CORS is working",
        "cors_origins": "*",
        "timestamp": "now"
    }

# Simple test endpoint
@app.get("/test")
async def test_endpoint():
    return {"message": "API is working", "cors": "enabled", "timestamp": "2024-01-01"}

# Test CORS specifically
@app.post("/test-cors")
async def test_cors():
    return {"message": "CORS POST test successful", "cors": "working"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 