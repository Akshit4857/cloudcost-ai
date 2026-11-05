import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.init_db import init_database
from app.api.routes import router as api_router
from app.api.billing import router as billing_router
from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.websocket import router as websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler: initializes database tables on startup."""
    init_database()
    yield


# Initialize FastAPI application with lifespan context
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API service for CloudCost AI platform with PostgreSQL persistence & Redis Queue",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS (Cross-Origin Resource Sharing)
# Restricts access to authorized origins; prevents credential leaking when wildcard is used
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount API routes under /api prefix
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(websocket_router, prefix="/api")


# ------------------------------------------------------------------------------
# Unified Monolith Frontend Static Files Serving (Single-Origin Deployment)
# Serves the compiled Next.js static export at root '/' alongside '/api' endpoints
# ------------------------------------------------------------------------------
STATIC_FRONTEND_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "static_frontend"),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "out")),
    "/app/static_frontend",
]

frontend_dir = next(
    (p for p in STATIC_FRONTEND_PATHS if os.path.isdir(p) and os.path.isfile(os.path.join(p, "index.html"))),
    None,
)

if frontend_dir:
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    @app.get("/", tags=["Root"])
    def root():
        """Root redirect / information pointing to /docs and /api/."""
        return {
            "message": "Welcome to CloudCost AI API",
            "documentation": "/docs",
            "health_check": "/api/health",
            "api_info": "/api/",
            "database": "PostgreSQL w/ pgvector",
            "queue": "Redis & Celery",
        }
