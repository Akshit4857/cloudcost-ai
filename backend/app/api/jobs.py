import logging
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.job import BackgroundJob
from app.models.user import User
from app.schemas.job import JobCreateResponse, JobStatusResponse
from app.tasks.rag_tasks import ingest_cloud_docs_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


@router.post(
    "/rag-ingest",
    response_model=JobCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue asynchronous RAG documentation ingestion job",
    description="Submits documentation ingestion to the Redis queue for background worker processing.",
)
def enqueue_rag_ingest_job(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobCreateResponse:
    """Enqueues an asynchronous documentation ingestion task into Redis for Celery worker."""
    job_id = str(uuid.uuid4())

    # 1. Record job entry in PostgreSQL
    job = BackgroundJob(
        id=job_id,
        user_id=current_user.id,
        task_name="rag_documentation_ingestion",
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # 2. Push task to Redis queue via Celery
    try:
        ingest_cloud_docs_task.apply_async(
            args=[job_id, current_user.id],
            task_id=job_id,
        )
        logger.info(f"Enqueued RAG ingestion task {job_id} for user {current_user.id}")
    except Exception as exc:
        logger.error(f"Failed to enqueue task {job_id} to Redis: {exc}")
        job.status = "failed"
        job.error = "Redis message broker is unavailable. Please check that Redis is running."
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis message queue is unavailable. Please ensure the Redis server is running.",
        )

    return JobCreateResponse(
        job_id=job.id,
        task_name=job.task_name,
        status=job.status,
        created_at=job.created_at.isoformat() if job.created_at else "",
        message="Documentation ingestion task enqueued successfully into Redis queue.",
    )


@router.get(
    "/{job_id}",
    response_model=JobStatusResponse,
    summary="Check status of a background job",
    description="Returns current execution state (queued, running, completed, failed) of a background job.",
)
def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobStatusResponse:
    """Retrieve status of a job belonging to the authenticated user."""
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()

    # User isolation & anti-enumeration: return 404 if not found or owned by another user
    if not job or job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    return JobStatusResponse(
        job_id=job.id,
        task_name=job.task_name,
        status=job.status,
        result=job.result,
        error=job.error,
        created_at=job.created_at.isoformat() if job.created_at else "",
        updated_at=job.updated_at.isoformat() if job.updated_at else "",
    )


@router.get(
    "",
    response_model=List[JobStatusResponse],
    summary="List recent background jobs for current user",
    description="Returns list of recent jobs submitted by the authenticated user.",
)
def list_user_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[JobStatusResponse]:
    """List recent background jobs owned by the authenticated user."""
    jobs = (
        db.query(BackgroundJob)
        .filter(BackgroundJob.user_id == current_user.id)
        .order_by(BackgroundJob.created_at.desc())
        .limit(10)
        .all()
    )

    return [
        JobStatusResponse(
            job_id=j.id,
            task_name=j.task_name,
            status=j.status,
            result=j.result,
            error=j.error,
            created_at=j.created_at.isoformat() if j.created_at else "",
            updated_at=j.updated_at.isoformat() if j.updated_at else "",
        )
        for j in jobs
    ]

