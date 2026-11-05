import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from starlette.websockets import WebSocketState
import redis.asyncio as aioredis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.events import get_job_channel
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.job import BackgroundJob
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSockets"])


@router.websocket("/jobs/{job_id}")
async def job_updates_websocket(
    websocket: WebSocket,
    job_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Authenticated WebSocket endpoint for real-time background job updates.

    Security & Ownership:
    - Authenticates the connection using JWT bearer token passed in query parameter.
    - Decodes and strictly validates user identity ('sub' claim).
    - Checks database ownership: only the user who initiated the job may stream its updates.
    - Rejects unauthorized or cross-user requests with WS_1008_POLICY_VIOLATION before streaming.

    Lifecycle & Delivery:
    - Immediately pushes current state from PostgreSQL upon connection.
    - If job is already terminal ('completed' | 'failed'), cleanly closes with WS_1000_NORMAL_CLOSURE.
    - If job is active ('queued' | 'running'), subscribes to Redis channel 'job_updates:{job_id}'.
    - Forwards worker events in real time.
    - Gracefully handles client disconnects, unsubscribes from Redis, and cleans up async resources.
    """
    # 1. Authenticate Token
    if not token:
        logger.warning(f"[WS] Connection rejected for job {job_id}: Missing authentication token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        logger.warning(f"[WS] Connection rejected for job {job_id}: Invalid or expired token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
        return

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"[WS] Connection rejected for job {job_id}: User {user_id} does not exist.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User does not exist")
        return

    # 2. Verify Job Ownership (Multi-Tenant Isolation)
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
    if not job or job.user_id != user.id:
        logger.warning(
            f"[WS] Access denied for job {job_id} by user {user.id}. Job not found or belongs to another user."
        )
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Job not found or access denied",
        )
        return

    # 3. Accept Connection
    await websocket.accept()
    logger.info(f"[WS] Client connected for job {job_id} (User: {user.id})")

    # 4. Push initial state snapshot from database
    initial_payload = {
        "job_id": job.id,
        "task_name": job.task_name,
        "status": job.status,
        "result": job.result,
        "error": job.error,
        "created_at": job.created_at.isoformat() if job.created_at else "",
        "updated_at": job.updated_at.isoformat() if job.updated_at else "",
    }
    try:
        await websocket.send_json(initial_payload)
    except Exception as exc:
        logger.error(f"[WS] Failed to send initial payload for job {job_id}: {exc}")
        return

    # If job is already in terminal state, we are done
    if job.status in ["completed", "failed"]:
        logger.info(f"[WS] Job {job_id} already in terminal state '{job.status}'. Closing socket.")
        try:
            await websocket.close(code=status.WS_1000_NORMAL_CLOSURE)
        except Exception:
            pass
        return

    # 5. Connect to Redis Pub/Sub for real-time updates
    channel = get_job_channel(job_id)
    async_redis = None
    pubsub = None

    try:
        async_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = async_redis.pubsub()
        await pubsub.subscribe(channel)
        logger.info(f"[WS] Subscribed to Redis channel '{channel}' for job {job_id}")

        while websocket.client_state == WebSocketState.CONNECTED:
            # Check for message with 0.2s timeout so loop remains responsive
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.2)
            if message and message.get("type") == "message":
                try:
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
                    logger.info(f"[WS] Forwarded event '{data.get('status')}' for job {job_id}")

                    # If job reached terminal state, stop listening
                    if data.get("status") in ["completed", "failed"]:
                        break
                except json.JSONDecodeError:
                    logger.warning(f"[WS] Ignored malformed message on channel {channel}")

    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected for job {job_id}")
    except Exception as exc:
        logger.error(f"[WS] Unexpected error in WebSocket loop for job {job_id}: {exc}")
        try:
            await websocket.send_json({
                "job_id": job_id,
                "status": "error",
                "error": "Real-time updates broker encountered an error. Please fallback to polling.",
            })
        except Exception:
            pass
    finally:
        # 6. Clean up Redis resources and close socket
        if pubsub:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()
            except Exception:
                pass
        if async_redis:
            try:
                await async_redis.aclose()
            except Exception:
                pass

        try:
            await websocket.close(code=status.WS_1000_NORMAL_CLOSURE)
        except Exception:
            pass
        logger.info(f"[WS] Connection cleanup completed for job {job_id}")
