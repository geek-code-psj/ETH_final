import os
import secrets
from dotenv import load_dotenv

load_dotenv()


def _require_secret(name: str, env_var: str, default: str = None) -> str:
    """Require strong secrets in production - fail if using weak defaults."""
    env_value = os.getenv(env_var)
    if env_value:
        if env_value in ("secret", "admin_secret", "change-this-in-production"):
            raise ValueError(f"Weak secret detected in {env_var}. Set a strong, unique secret.")
        return env_value

    if os.getenv("ENVIRONMENT") == "production" and not default:
        raise ValueError(f"Required secret {env_var} not set in production environment")

    # Generate a secure default for development only
    if default:
        return default
    return secrets.token_urlsafe(32)


class Settings:
    PROJECT_NAME: str = "HRMS API"
    VERSION: str = "2.0.0"

    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/hrms_db")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # Firebase
    FIREBASE_SERVICE_ACCOUNT_JSON: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID")

    # Sentry
    SENTRY_DSN: str = os.getenv("SENTRY_DSN")

    # CORS - now supports multiple origins via comma-separated env var
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    ADDITIONAL_CORS_ORIGINS: str = os.getenv("ADDITIONAL_CORS_ORIGINS", "")

    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Build CORS origins list from configuration."""
        origins = [self.FRONTEND_URL]
        if self.ADDITIONAL_CORS_ORIGINS:
            origins.extend([o.strip() for o in self.ADDITIONAL_CORS_ORIGINS.split(",") if o.strip()])
        if self.ENVIRONMENT != "production":
            origins.extend(["http://localhost:5173", "http://localhost:3000"])
        return list(set(origins))  # Remove duplicates

    # Security
    DEV_MODE: bool = os.getenv("DEV_MODE", "false").lower() == "true"
    if DEV_MODE and ENVIRONMENT == "production":
        raise ValueError("DEV_MODE=true is not allowed in production environment")

    # Email
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

    # Secrets - require strong values in production
    EMPLOYEE_JWT_SECRET: str = _require_secret(
        "EMPLOYEE_JWT_SECRET", "EMPLOYEE_JWT_SECRET",
        "dev-employee-secret-change-in-prod"
    )
    ADMIN_JWT_SECRET: str = _require_secret(
        "ADMIN_JWT_SECRET", "ADMIN_JWT_SECRET",
        "dev-admin-secret-change-in-prod"
    )

    # Admin registration control
    ALLOW_ADMIN_SELF_REGISTRATION: bool = os.getenv("ALLOW_ADMIN_SELF_REGISTRATION", "false").lower() == "true"
    if ALLOW_ADMIN_SELF_REGISTRATION and ENVIRONMENT == "production":
        raise ValueError("ALLOW_ADMIN_SELF_REGISTRATION=true is not allowed in production")

    # File upload limits
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    ALLOWED_FILE_TYPES: list[str] = os.getenv(
        "ALLOWED_FILE_TYPES",
        "application/pdf,image/jpeg,image/png,image/gif"
    ).split(",")


settings = Settings()
