"""
Structured Logger for HRMS.
Wraps structlog with rich context helpers for consistent log output.

Usage:
    from core.logger import logger, log_event
    logger.info("employee_created", employee_id=emp.id, name=emp.first_name)
    log_event("WARNING", "failed_login", email=email, ip=ip)
"""
import structlog
import logging
import sys
import os

# ── Configure structlog once at import time ──────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")

shared_processors = [
    structlog.contextvars.merge_contextvars,
    structlog.processors.add_log_level,
    structlog.processors.TimeStamper(fmt="iso", utc=True),
]

if ENVIRONMENT == "development":
    # Human-readable coloured output in dev
    processors = shared_processors + [
        structlog.dev.ConsoleRenderer(colors=True)
    ]
else:
    # JSON lines for log aggregators (Datadog, Render, etc.)
    processors = shared_processors + [
        structlog.processors.dict_tracebacks,
        structlog.processors.JSONRenderer(),
    ]

structlog.configure(
    processors=processors,
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, LOG_LEVEL, logging.INFO)
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(sys.stdout),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger("hrms")


# ── Convenience helpers for common event patterns ─────────────────────────────

def log_event(level: str, event: str, **kwargs):
    """Generic structured log. level: DEBUG / INFO / WARNING / ERROR / CRITICAL"""
    fn = getattr(logger, level.lower(), logger.info)
    fn(event, **kwargs)


def log_login_attempt(email: str, success: bool, ip: str = None, user_type: str = "admin"):
    if success:
        logger.info("login_success", email=email, user_type=user_type, ip=ip)
    else:
        logger.warning("login_failed", email=email, user_type=user_type, ip=ip)


def log_employee_action(action: str, employee_id: int, by: str, details: dict = None):
    """action = created | updated | deleted | activated | deactivated"""
    logger.info(
        f"employee_{action}",
        employee_id=employee_id,
        performed_by=by,
        **(details or {})
    )


def log_leave_action(action: str, leave_id: int, employee_id: int, by: str):
    """action = submitted | approved | rejected | cancelled"""
    logger.info(
        f"leave_{action}",
        leave_id=leave_id,
        employee_id=employee_id,
        performed_by=by
    )


def log_payroll_action(action: str, month: int, year: int, by: str, count: int = None):
    logger.info(
        f"payroll_{action}",
        month=month, year=year,
        performed_by=by,
        record_count=count
    )


def log_db_error(operation: str, error: Exception, **kwargs):
    logger.error(
        "database_error",
        operation=operation,
        error=str(error),
        error_type=type(error).__name__,
        **kwargs
    )


def log_security_event(event: str, severity: str = "WARNING", **kwargs):
    """For auth failures, rate limit hits, permission denials."""
    fn = getattr(logger, severity.lower(), logger.warning)
    fn(f"security_{event}", **kwargs)
