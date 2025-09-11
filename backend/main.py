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

# Debug CORS configuration
print(f"🔧 CORS_ORIGINS env var: {os.getenv('CORS_ORIGINS', 'NOT_SET')}")
print(f"🔧 Parsed CORS origins: {settings.cors_origins}")

# Configure CORS - ALLOW ALL ORIGINS FOR PRODUCTION
print("🔧 CORS Configuration: ALLOWING ALL ORIGINS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Simple CORS logging
@app.middleware("http")
async def log_requests(request, call_next):
    origin = request.headers.get("origin")
    print(f"🌐 {request.method} request from origin: {origin}")
    
    response = await call_next(request)
    print(f"✅ Response status: {response.status_code}")
    
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
        "cors_origins_env": os.getenv('CORS_ORIGINS', 'NOT_SET'),
        "parsed_cors_origins": settings.cors_origins,
        "final_cors_origins": cors_origins
    }

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 