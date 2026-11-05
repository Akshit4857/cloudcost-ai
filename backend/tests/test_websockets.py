import json
import uuid
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.core.events import publish_job_update
from app.db.session import SessionLocal
from app.models.job import BackgroundJob
from app.models.user import User

client = TestClient(app)


def get_user_token(email: str, password: str = "password123") -> str:
    """Helper to register and/or authenticate a user and return the JWT token string."""
    reg_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "WS Tester"},
    )
    if reg_res.status_code == 201:
        return reg_res.json()["access_token"]
    else:
        login_res = client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        assert login_res.status_code == 200
        return login_res.json()["access_token"]


def test_ws_unauthenticated_rejected():
    """Verify WebSocket connection without token or with invalid token is rejected with WS 1008."""
    fake_job_id = str(uuid.uuid4())

    # 1. Missing token
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/ws/jobs/{fake_job_id}"):
            pass
    assert exc.value.code == 1008

    # 2. Invalid token
    with pytest.raises(WebSocketDisconnect) as exc2:
        with client.websocket_connect(f"/api/ws/jobs/{fake_job_id}?token=invalid.token.here"):
            pass
    assert exc2.value.code == 1008


def test_ws_cross_user_isolation_rejected():
    """Verify User B cannot subscribe to User A's job via WebSocket (rejected with WS 1008)."""
    token_a = get_user_token("ws_owner_a@example.com")
    token_b = get_user_token("ws_owner_b@example.com")

    # User A creates a job
    headers_a = {"Authorization": f"Bearer {token_a}"}
    create_res = client.post("/api/jobs/rag-ingest", headers=headers_a)
    assert create_res.status_code == 202
    job_id_a = create_res.json()["job_id"]

    # User B tries to connect to User A's job WebSocket
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/ws/jobs/{job_id_a}?token={token_b}"):
            pass
    assert exc.value.code == 1008


def test_ws_connect_receives_initial_state():
    """Verify owner connecting to active job immediately receives the current database snapshot."""
    token = get_user_token("ws_owner_initial@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/jobs/rag-ingest", headers=headers)
    assert create_res.status_code == 202
    job_id = create_res.json()["job_id"]

    # Connect to WebSocket as owner
    with client.websocket_connect(f"/api/ws/jobs/{job_id}?token={token}") as ws:
        data = ws.receive_json()
        assert data["job_id"] == job_id
        assert data["task_name"] == "rag_documentation_ingestion"
        assert data["status"] in ["queued", "running", "completed"]


def test_ws_receives_real_time_redis_published_events():
    """Verify that when worker publishes updates to Redis, connected WebSocket receives them."""
    token = get_user_token("ws_live_events@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "ws_live_events@example.com").first()
        assert user is not None

        # Create a queued job directly
        job_id = str(uuid.uuid4())
        job = BackgroundJob(
            id=job_id,
            user_id=user.id,
            task_name="rag_documentation_ingestion",
            status="queued",
        )
        db.add(job)
        db.commit()

        with client.websocket_connect(f"/api/ws/jobs/{job_id}?token={token}") as ws:
            # 1. First message is the initial DB snapshot
            initial = ws.receive_json()
            assert initial["job_id"] == job_id
            assert initial["status"] == "queued"

            # 2. Simulate worker publishing 'running' state to Redis
            publish_job_update(
                job_id=job_id,
                user_id=user.id,
                status="running",
                task_name="rag_documentation_ingestion",
            )

            # Receive the forwarded 'running' message
            msg1 = ws.receive_json()
            assert msg1["job_id"] == job_id
            assert msg1["status"] == "running"

            # 3. Simulate worker publishing 'completed' state to Redis
            mock_result = {"status": "success", "documents_processed": 4, "chunks_created": 5}
            publish_job_update(
                job_id=job_id,
                user_id=user.id,
                status="completed",
                task_name="rag_documentation_ingestion",
                result=mock_result,
            )

            # Receive the forwarded 'completed' message
            msg2 = ws.receive_json()
            assert msg2["job_id"] == job_id
            assert msg2["status"] == "completed"
            assert msg2["result"]["documents_processed"] == 4
    finally:
        db.close()


def test_ws_terminal_job_closes_immediately():
    """Verify connecting to an already completed job delivers result and closes socket cleanly."""
    token = get_user_token("ws_terminal_user@example.com")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "ws_terminal_user@example.com").first()
        assert user is not None

        job_id = str(uuid.uuid4())
        job = BackgroundJob(
            id=job_id,
            user_id=user.id,
            task_name="rag_documentation_ingestion",
            status="completed",
            result={"message": "All done already"},
        )
        db.add(job)
        db.commit()

        with client.websocket_connect(f"/api/ws/jobs/{job_id}?token={token}") as ws:
            # Receives completed snapshot
            data = ws.receive_json()
            assert data["status"] == "completed"
            assert data["result"]["message"] == "All done already"
    finally:
        db.close()

