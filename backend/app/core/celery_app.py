import logging
from celery import Celery
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Celery application
celery_app = Celery(
    "cloudcost_ai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.rag_tasks"],
)

# Celery Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes hard limit
    task_soft_time_limit=240,  # 4 minutes soft limit
    task_acks_late=True,  # Acknowledge task after completion to prevent data loss
    worker_prefetch_multiplier=1,  # Fair distribution among workers
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,  # Eager execution for tests
)

