# © Mohsen Yousefzadeh Najafabadi, August 30 2025
# All rights reserved. Unauthorized use, distribution, or modification prohibited.


from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()
 
@router.get("/ping")
async def ping():
    return JSONResponse(content={"status": "ok"}) 