import logging
from typing import Any, Dict
from celery import shared_task

from app.core.celery_app import celery_app
from app.core.events import publish_job_update
from app.db.session import SessionLocal
from app.models.job import BackgroundJob
from app.services.rag_service import ingest_documentation_directory

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.rag_tasks.ingest_cloud_docs_task",
    max_retries=2,
    default_retry_delay=5,
)
def ingest_cloud_docs_task(self, job_id: str, user_id: str) -> Dict[str, Any]:
    """Background task that asynchronously processes and indexes official cloud documentation.

    Updates job status in PostgreSQL: queued -> running -> completed (or failed).
    """
    logger.info(f"[Worker] Starting background task for job_id={job_id}, user_id={user_id}")
    db = SessionLocal()

    try:
        # 1. Update job status to 'running'
        job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
        if job:
            job.status = "running"
            db.commit()
            publish_job_update(
                job_id=job_id,
                user_id=user_id,
                status="running",
                task_name="rag_documentation_ingestion",
            )

        # 2. Execute RAG documentation ingestion & chunking
        result = ingest_documentation_directory(db)

        # 3. Mark job as 'completed'
        job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
        if job:
            job.status = "completed"
            job.result = result
            job.error = None
            db.commit()
            publish_job_update(
                job_id=job_id,
                user_id=user_id,
                status="completed",
                task_name="rag_documentation_ingestion",
                result=result,
            )

        logger.info(f"[Worker] Job {job_id} completed successfully: {result}")
        return result

    except Exception as exc:
        logger.error(f"[Worker] Job {job_id} failed with error: {exc}")
        db.rollback()

        # Update job status to 'failed'
        try:
            job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
            if job:
                job.status = "failed"
                # Strip out any sensitive details or stack traces
                safe_error = str(exc)[:200]
                job.error = f"Ingestion task failed: {safe_error}"
                db.commit()
                publish_job_update(
                    job_id=job_id,
                    user_id=user_id,
                    status="failed",
                    task_name="rag_documentation_ingestion",
                    error=job.error,
                )
        except Exception as inner_exc:
            logger.error(f"[Worker] Failed to update job failure status: {inner_exc}")

        # Retry with exponential backoff if retries remaining
        if self.request.retries < self.max_retries:
            logger.info(f"[Worker] Retrying job {job_id} (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))

        raise exc
    finally:
        db.close()

