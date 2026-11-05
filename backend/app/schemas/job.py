from typing import Any, Dict, Optional
from pydantic import BaseModel


class JobCreateResponse(BaseModel):
    """Returned when a new background job is successfully enqueued."""
    job_id: str
    task_name: str
    status: str
    created_at: str
    message: str


class JobStatusResponse(BaseModel):
    """Returned when checking the status of an enqueued background job."""
    job_id: str
    task_name: str
    status: str  # queued | running | completed | failed
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str

