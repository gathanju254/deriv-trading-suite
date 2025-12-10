# backend/src/api/middleware.py
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from src.utils.logger import logger


class APILogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Incoming {request.method} {request.url}")
        response = await call_next(request)
        return response
