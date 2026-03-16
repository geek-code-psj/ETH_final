import datetime
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from core.logger import logger   # ← structured logger (replaces raw structlog)

from core.config import settings
from core.database import engine, Base
from core.security import init_firebase
from limiter import limiter
from routers import (
    auth, employees, attendance, dashboard, departments,
    settings as settings_router, leave, admin,
    portal, payroll, documents, analytics, notifications, leave_types
)

# ─── Logging configured in core/logger.py ────────────────────────────────────
# Structured logger is imported above — no redundant config here.

# ─── Request ID Middleware ────────────────────────────────────────────────────
class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique request_id to every request for log tracing."""
    async def dispatch(self, request: Request, call_next):
        import structlog
        request_id = uuid.uuid4().hex[:8]
        with structlog.contextvars.bound_contextvars(request_id=request_id):
            response: Response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response

# ─── Sentry ───────────────────────────────────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.2,
        environment=settings.ENVIRONMENT,
    )

# ─── Database & Firebase ──────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
init_firebase()

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs" if settings.DEBUG or settings.ENVIRONMENT == "development" else None,
    redoc_url=None
)

# ─── CORS MUST BE THE FIRST MIDDLEWARE ADDED (STARLETTE READS LAST-IN, FIRST-OUT) ─
_origins = [settings.FRONTEND_URL]
if settings.ENVIRONMENT != "production":
    _origins += ["http://localhost:5173", "http://localhost:3000", "https://eth-finnal-1.onrender.com", "https://eth-final-frontend.vercel.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Temporarily wildcarding to ensure no exact-match typos block origin
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Security Headers Middleware ──────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]          = "DENY"
        response.headers["X-XSS-Protection"]         = "1; mode=block"
        response.headers["Referrer-Policy"]           = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]        = "geolocation=(), microphone=(), camera=()"
        # Only send HSTS in production
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)   # ← request tracing

# ─── Register Routers ─────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(dashboard.router)
app.include_router(departments.router)
app.include_router(settings_router.router)
app.include_router(leave.router)
app.include_router(admin.router)
# ── Production Feature Routers ───────────────────────────────────────────────
app.include_router(portal.router)
app.include_router(payroll.router)
app.include_router(documents.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(leave_types.router)

# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }
