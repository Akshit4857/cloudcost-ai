import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from kombu.exceptions import OperationalError

from app.main import app
from app.db.session import SessionLocal
from app.models.job import BackgroundJob
from app.models.user import User
from app.tasks.rag_tasks import ingest_cloud_docs_task

client = TestClient(app)


def get_authenticated_client(email: str, password: str = "password123"):
    """Helper to register and/or authenticate a user and return auth headers."""
    reg_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Job Tester"},
    )
    if reg_res.status_code == 201:
        token = reg_res.json()["access_token"]
    else:
        login_res = client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_job_endpoints():
    """Verify all job endpoints require valid authentication."""
    fake_job_id = str(uuid.uuid4())

    post_res = client.post("/api/jobs/rag-ingest")
    assert post_res.status_code == 401

    get_one = client.get(f"/api/jobs/{fake_job_id}")
    assert get_one.status_code == 401

    get_list = client.get("/api/jobs")
    assert get_list.status_code == 401


def test_enqueue_rag_ingest_job():
    """Verify authenticated user can enqueue a background ingestion task."""
    headers = get_authenticated_client("job_user1@example.com")

    res = client.post("/api/jobs/rag-ingest", headers=headers)
    assert res.status_code == 202
    data = res.json()
    assert "job_id" in data
    assert data["task_name"] == "rag_documentation_ingestion"
    assert data["status"] == "queued"
    assert "enqueued" in data["message"].lower()

    # Verify persistent PostgreSQL job row exists
    db = SessionLocal()
    try:
        job = db.query(BackgroundJob).filter(BackgroundJob.id == data["job_id"]).first()
        assert job is not None
        assert job.task_name == "rag_documentation_ingestion"
        assert job.status in ["queued", "running", "completed"]
    finally:
        db.close()


def test_fetch_job_status_and_list():
    """Verify fetching status for a specific job and listing user jobs."""
    headers = get_authenticated_client("job_user2@example.com")

    # Enqueue a job
    res = client.post("/api/jobs/rag-ingest", headers=headers)
    assert res.status_code == 202
    job_id = res.json()["job_id"]

    # Fetch status
    status_res = client.get(f"/api/jobs/{job_id}", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["job_id"] == job_id
    assert status_data["task_name"] == "rag_documentation_ingestion"
    assert status_data["status"] in ["queued", "running", "completed"]

    # List jobs for this user
    list_res = client.get("/api/jobs", headers=headers)
    assert list_res.status_code == 200
    jobs = list_res.json()
    assert isinstance(jobs, list)
    assert any(j["job_id"] == job_id for j in jobs)


def test_cross_user_isolation_cannot_access_other_user_job():
    """Verify User B cannot access or inspect jobs enqueued by User A (HTTP 404)."""
    headers_a = get_authenticated_client("job_owner_a@example.com")
    headers_b = get_authenticated_client("job_owner_b@example.com")

    # User A creates a job
    res_a = client.post("/api/jobs/rag-ingest", headers=headers_a)
    assert res_a.status_code == 202
    job_id_a = res_a.json()["job_id"]

    # User B tries to read User A's job
    res_b = client.get(f"/api/jobs/{job_id_a}", headers=headers_b)
    assert res_b.status_code == 404
    assert "not found" in res_b.json()["detail"].lower()


def test_redis_unavailable_returns_503():
    """Verify endpoint gracefully handles Redis connection failures with HTTP 503."""
    headers = get_authenticated_client("job_redis_fail@example.com")

    with patch("app.tasks.rag_tasks.ingest_cloud_docs_task.apply_async", side_effect=OperationalError("Cannot connect to Redis")):
        res = client.post("/api/jobs/rag-ingest", headers=headers)
        assert res.status_code == 503
        data = res.json()
        assert "Redis message queue is unavailable" in data["detail"]


def test_worker_task_execution_eager():
    """Verify the Celery task directly executes, updates DB state to completed, and saves results."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "job_user1@example.com").first()
        assert user is not None

        # Create a job row
        test_job_id = str(uuid.uuid4())
        job = BackgroundJob(
            id=test_job_id,
            user_id=user.id,
            task_name="ingest_cloud_docs",
            status="queued",
        )
        db.add(job)
        db.commit()

        # Run task synchronously
        task_res = ingest_cloud_docs_task(test_job_id, user.id)
        assert task_res["status"] == "success"
        assert task_res["documents_processed"] >= 1

        # Check DB reflects completion
        db.refresh(job)
        assert job.status == "completed"
        assert job.result is not None
        assert job.result["status"] == "success"
        assert job.error is None
    finally:
        db.close()


def test_worker_task_failure_handling():
    """Verify that when an error occurs during processing, task marks job as failed in DB."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "job_user1@example.com").first()
        assert user is not None

        test_job_id = str(uuid.uuid4())
        job = BackgroundJob(
            id=test_job_id,
            user_id=user.id,
            task_name="ingest_cloud_docs",
            status="queued",
        )
        db.add(job)
        db.commit()

        with patch("app.tasks.rag_tasks.ingest_documentation_directory", side_effect=RuntimeError("Simulated vector embedding API down")):
            with pytest.raises(RuntimeError):
                ingest_cloud_docs_task(test_job_id, user.id)

        # Refresh and check failed status
        db.refresh(job)
        assert job.status == "failed"
        assert job.error is not None
        assert "Simulated vector embedding API down" in job.error
    finally:
        db.close()
