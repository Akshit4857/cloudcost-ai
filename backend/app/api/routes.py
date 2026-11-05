from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings
from app.db.session import check_db_connection

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    timestamp: str
    database: Optional[str] = "connected"


class ApiInfoResponse(BaseModel):
    name: str
    version: str
    status: str
    description: str
    docs_url: str
    database: Optional[str] = "connected"


@router.get("/health", response_model=HealthResponse, tags=["System"])
def get_health() -> HealthResponse:
    """Return backend health status, database connection state, version, and UTC timestamp."""
    db_ok = check_db_connection()
    status_str = "healthy" if db_ok else "degraded"
    return HealthResponse(
        status=status_str,
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat(),
        database="connected" if db_ok else "disconnected",
    )


@router.get("/", response_model=ApiInfoResponse, tags=["System"])
def get_api_info() -> ApiInfoResponse:
    """Return basic API metadata, database health, and Swagger documentation URL."""
    db_ok = check_db_connection()
    return ApiInfoResponse(
        name=settings.PROJECT_NAME,
        version=settings.VERSION,
        status="active",
        description="CloudCost AI backend REST service for FinOps analytics and anomaly detection.",
        docs_url="/docs",
        database="connected" if db_ok else "disconnected",
    )
