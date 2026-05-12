from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any

import sentry_sdk
import structlog
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import check_db_connection, engine
from app.core.redis_client import check_redis_connection, close_redis

logger = structlog.get_logger(__name__)

# -----------------------------------------------------------------------
# Structured logging configuration
# -----------------------------------------------------------------------
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.is_development else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(__import__("logging"), settings.LOG_LEVEL, 20)
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

# -----------------------------------------------------------------------
# Sentry
# -----------------------------------------------------------------------
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )

# -----------------------------------------------------------------------
# Rate limiter
# -----------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])


# -----------------------------------------------------------------------
# Lifespan
# -----------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting Voice AI Platform", version=settings.APP_VERSION, env=settings.ENVIRONMENT)

    # Verify connectivity
    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()

    if not db_ok:
        logger.warning("Database connection check failed — proceeding anyway")
    if not redis_ok:
        logger.warning("Redis connection check failed — proceeding anyway")

    logger.info("Application started", db_connected=db_ok, redis_connected=redis_ok)

    yield

    # Shutdown
    logger.info("Shutting down application")
    await close_redis()
    await engine.dispose()
    logger.info("Application shutdown complete")


# -----------------------------------------------------------------------
# App factory
# -----------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Realtime Voice AI Platform — FastAPI Backend",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# -----------------------------------------------------------------------
# Middleware
# -----------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def request_timing_middleware(request: Request, call_next):
    """Add request timing and structured logging."""
    start = time.perf_counter()
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host if request.client else "unknown",
    )

    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

    logger.info(
        "HTTP request",
        status_code=response.status_code,
        duration_ms=round(duration_ms, 2),
    )
    return response


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# -----------------------------------------------------------------------
# Global exception handler
# -----------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc), path=request.url.path, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# -----------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and container orchestration."""
    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()
    status_str = "healthy" if db_ok and redis_ok else "degraded"
    return {
        "status": status_str,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {
            "database": "up" if db_ok else "down",
            "redis": "up" if redis_ok else "down",
        },
    }


@app.get("/", tags=["Root"])
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}


# -----------------------------------------------------------------------
# WebSocket endpoint
# -----------------------------------------------------------------------
@app.websocket("/ws/session/{session_id}")
async def websocket_voice_session(websocket: WebSocket, session_id: str):
    """
    Main WebSocket endpoint for realtime voice sessions.

    Connection flow:
    1. Send JWT token (in first message or as ?token= query param)
    2. Send session.start message with provider config
    3. Stream audio chunks via audio.chunk messages
    4. Receive transcript and audio response events
    5. Send session.end to close cleanly
    """
    from app.realtime.gateway import handle_websocket_session
    await handle_websocket_session(websocket)
