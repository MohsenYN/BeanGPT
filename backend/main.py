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

# Configure CORS with explicit origins
cors_origins = [
    "https://kia8804.github.io",
    "https://beangpt.ca",
    "https://mohsenyn.github.io",  # Add this explicitly
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
]

# Add environment variable origins if available
if hasattr(settings, 'cors_origins') and settings.cors_origins:
    cors_origins.extend(settings.cors_origins)

# Remove duplicates
cors_origins = list(set(cors_origins))
print(f"🔧 Final CORS origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add a middleware to log CORS requests for debugging
@app.middleware("http")
async def log_cors_requests(request, call_next):
    origin = request.headers.get("origin")
    method = request.method
    
    print(f"🌐 {method} request from origin: {origin}")
    print(f"🔧 Request URL: {request.url}")
    print(f"🔧 Request headers: {dict(request.headers)}")
    
    if origin:
        print(f"🔧 Allowed origins: {cors_origins}")
        if origin not in cors_origins:
            print(f"❌ Origin {origin} NOT in allowed origins!")
        else:
            print(f"✅ Origin {origin} is allowed")
    
    # Handle OPTIONS requests explicitly
    if method == "OPTIONS":
        print("🔧 Handling OPTIONS preflight request")
        from fastapi.responses import Response
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = origin if origin in cors_origins else "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    
    try:
        response = await call_next(request)
        print(f"✅ Response status: {response.status_code}")
        
        # Ensure CORS headers are set on the response
        if origin and origin in cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response
    except Exception as e:
        print(f"❌ Error processing request: {e}")
        raise

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