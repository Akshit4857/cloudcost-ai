import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import redis

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_job_channel(job_id: str) -> str:
    """Returns the standardized Redis Pub/Sub channel key for a job."""
    return f"job_updates:{job_id}"


def get_sync_redis_client() -> redis.Redis:
    """Creates a synchronous Redis client for publishing worker events."""
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def publish_job_update(
    job_id: str,
    user_id: str,
    status: str,
    task_name: str,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> bool:
    """Publishes a real-time job state change event to Redis Pub/Sub.

    Payload conforms to JobStatusResponse schema so WebSocket clients receive
    consistent message structures.
    """
    channel = get_job_channel(job_id)
    payload = {
        "job_id": job_id,
        "user_id": user_id,
        "task_name": task_name,
        "status": status,
        "result": result,
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        client = get_sync_redis_client()
        client.publish(channel, json.dumps(payload))
        logger.info(f"[Events] Published status '{status}' for job {job_id} to {channel}")
        return True
    except Exception as exc:
        logger.warning(f"[Events] Failed to publish job event to Redis channel {channel}: {exc}")
        return False

