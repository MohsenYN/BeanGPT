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

# Configure CORS - Allow specific domains and all for development
allowed_origins = [
    "https://beangpt.ca",
    "https://www.beangpt.ca", 
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "*"  # Allow all for now, but you can remove this for production security
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "DNT",
        "User-Agent",
        "If-Modified-Since",
        "Cache-Control",
        "Range"
    ],
    expose_headers=["Content-Length", "Content-Range"],
)

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