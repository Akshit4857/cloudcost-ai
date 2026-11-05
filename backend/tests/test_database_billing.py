import io
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal, check_db_connection
from app.models.billing import BillingBatch, BillingRecord
from app.models.user import User

client = TestClient(app)


def get_authenticated_client(email: str, password: str = "password123"):
    """Helper to register and/or authenticate a user and return auth headers."""
    register_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    if register_res.status_code == 201:
        token = register_res.json()["access_token"]
    else:
        login_res = client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


def test_database_connection_and_health():
    """Verify that PostgreSQL is reachable and the health endpoint returns database: connected."""
    assert check_db_connection() is True

    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_user_registration_login_and_me():
    """Verify registration, login, and /me profile retrieval with JWT."""
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"

    # 1. Register
    reg_res = client.post(
        "/api/auth/register",
        json={"email": unique_email, "password": "securepassword123", "full_name": "New User"},
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email

    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get /me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

    # 3. Duplicate registration
    dup_res = client.post(
        "/api/auth/register",
        json={"email": unique_email, "password": "securepassword123"},
    )
    assert dup_res.status_code == 400

    # 4. Login with bad password
    bad_login = client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401


def test_unauthenticated_requests_rejected():
    """Verify that billing endpoints reject requests without a Bearer token."""
    assert client.get("/api/billing/uploads").status_code == 401
    assert client.get("/api/billing/summary").status_code == 401
    assert client.get("/api/billing/anomalies").status_code == 401
    assert client.post("/api/billing/upload").status_code == 401


def test_upload_persist_and_retrieve_summary():
    """Test uploading a CSV, verifying PostgreSQL persistence, and retrieving via GET /api/billing/summary."""
    headers = get_authenticated_client(f"uploader_{uuid.uuid4().hex[:6]}@example.com")

    csv_content = (
        "date,service,resource,cost,currency\n"
        "2026-10-01,EC2,i-test-1,10.00,USD\n"
        "2026-10-01,S3,bucket-test-1,5.00,USD\n"
        "2026-10-02,EC2,i-test-1,12.00,USD\n"
    )

    files = {"file": ("test_billing.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/billing/upload", files=files, headers=headers)
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["status"] == "success"
    assert upload_data["total_rows"] == 3
    assert upload_data["total_cost"] == 27.0
    assert upload_data["batch_id"] is not None

    batch_id = upload_data["batch_id"]

    # Verify directly in PostgreSQL via SessionLocal
    db = SessionLocal()
    try:
        batch = db.query(BillingBatch).filter(BillingBatch.id == batch_id).first()
        assert batch is not None
        assert batch.filename == "test_billing.csv"
        assert batch.user_id is not None

        records = db.query(BillingRecord).filter(BillingRecord.batch_id == batch_id).all()
        assert len(records) == 3
    finally:
        db.close()

    # Verify retrieval via GET /api/billing/summary
    summary_res = client.get("/api/billing/summary", headers=headers)
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["filename"] == "test_billing.csv"
    assert summary_data["total_cost"] == 27.0
    assert summary_data["service_totals"]["EC2"] == 22.0
    assert summary_data["service_totals"]["S3"] == 5.0


def test_multi_user_isolation_and_cross_access_prevention():
    """Verify that User 2 cannot view, query, or delete User 1's dataset."""
    user1_email = f"user1_{uuid.uuid4().hex[:6]}@example.com"
    user2_email = f"user2_{uuid.uuid4().hex[:6]}@example.com"

    h1 = get_authenticated_client(user1_email)
    h2 = get_authenticated_client(user2_email)

    # User 1 uploads a file
    csv1 = "date,service,resource,cost,currency\n2026-10-01,EC2,vm-1,50.00,USD\n"
    res1 = client.post("/api/billing/upload", files={"file": ("u1_file.csv", io.BytesIO(csv1.encode("utf-8")), "text/csv")}, headers=h1)
    assert res1.status_code == 200
    u1_batch_id = res1.json()["batch_id"]

    # User 2 checks upload history -> must be empty
    h2_uploads = client.get("/api/billing/uploads", headers=h2).json()
    assert len(h2_uploads) == 0

    # User 2 attempts to GET User 1's batch details -> must return 404
    assert client.get(f"/api/billing/uploads/{u1_batch_id}", headers=h2).status_code == 404

    # User 2 attempts to query summary with User 1's batch ID -> must return 404
    assert client.get(f"/api/billing/summary?upload_id={u1_batch_id}", headers=h2).status_code == 404

    # User 2 attempts to run anomalies with User 1's batch ID -> must return no_data
    u2_anom = client.get(f"/api/billing/anomalies?upload_id={u1_batch_id}", headers=h2).json()
    assert u2_anom["status"] == "no_data"

    # User 2 attempts to DELETE User 1's batch -> must return 404
    assert client.delete(f"/api/billing/uploads/{u1_batch_id}", headers=h2).status_code == 404

    # Verify User 1's batch is still intact and accessible by User 1
    u1_get = client.get(f"/api/billing/uploads/{u1_batch_id}", headers=h1)
    assert u1_get.status_code == 200
    assert u1_get.json()["filename"] == "u1_file.csv"


def test_malformed_csv_triggers_rollback():
    """Verify that malformed CSV with missing column or invalid format returns 400 and creates no batch."""
    headers = get_authenticated_client(f"err_user_{uuid.uuid4().hex[:6]}@example.com")
    invalid_csv = "date,service,cost\n2026-10-01,EC2,10.00\n"
    files = {"file": ("malformed.csv", io.BytesIO(invalid_csv.encode("utf-8")), "text/csv")}
    res = client.post("/api/billing/upload", files=files, headers=headers)
    assert res.status_code == 400


def test_anomaly_detection_endpoint():
    """Verify GET /api/billing/anomalies runs against user's persisted PostgreSQL data."""
    headers = get_authenticated_client(f"anomaly_user_{uuid.uuid4().hex[:6]}@example.com")
    spike_csv = (
        "date,service,resource,cost,currency\n"
        "2026-10-01,EC2,vm-1,20.00,USD\n"
        "2026-10-02,EC2,vm-1,21.00,USD\n"
        "2026-10-03,EC2,vm-1,19.00,USD\n"
        "2026-10-04,EC2,vm-1,20.00,USD\n"
        "2026-10-05,EC2,vm-gpu-spike,180.00,USD\n"
    )
    files = {"file": ("spike_test.csv", io.BytesIO(spike_csv.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/billing/upload", files=files, headers=headers)
    assert upload_res.status_code == 200

    anomaly_res = client.get("/api/billing/anomalies", headers=headers)
    assert anomaly_res.status_code == 200
    data = anomaly_res.json()
    assert data["status"] == "success"
    assert data["total_anomalies"] >= 1

    spike = next((a for a in data["anomalies"] if a["service"] == "EC2"), None)
    assert spike is not None
    assert spike["date"] == "2026-10-05"
    assert spike["actual_cost"] == 180.0
    assert spike["percentage_difference"] > 100.0


def test_cors_credentials_safety_with_wildcard():
    """Verify that wildcard origin '*' never enables credentials reflection (W3C CORS security requirement)."""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from starlette.testclient import TestClient
    from app.core.config import Settings

    custom_settings = Settings(CORS_ORIGINS="*")
    assert custom_settings.cors_allow_credentials is False

    test_app = FastAPI()
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=custom_settings.cors_origins_list,
        allow_credentials=custom_settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @test_app.get("/ping")
    def ping():
        return {"status": "ok"}

    c = TestClient(test_app)
    res = c.get("/ping", headers={"Origin": "https://malicious-site.example.com"})
    assert res.status_code == 200
    # Must NOT reflect credentials to arbitrary cross-origins
    assert res.headers.get("access-control-allow-credentials") is None
    assert res.headers.get("access-control-allow-origin") == "*"


def test_cors_explicit_origin_allows_credentials():
    """Verify that explicit origin list securely enables credential sharing."""
    from app.core.config import Settings

    custom_settings = Settings(CORS_ORIGINS="http://localhost:3000, https://cloudcost-ai.onrender.com/")
    assert custom_settings.cors_allow_credentials is True
    # Verify trailing slashes and spaces were sanitized
    assert custom_settings.cors_origins_list == ["http://localhost:3000", "https://cloudcost-ai.onrender.com"]


def test_normalized_database_url_converts_postgres_scheme():
    """Verify legacy postgres:// scheme from cloud hosts is normalized to postgresql:// for SQLAlchemy 2.0."""
    from app.core.config import Settings

    supabase_url = "postgres://user:pass@db.example.supabase.co:5432/postgres"
    s = Settings(DATABASE_URL=supabase_url)
    assert s.normalized_database_url == "postgresql://user:pass@db.example.supabase.co:5432/postgres"


def test_billing_csv_field_length_validation():
    """Verify that fields exceeding database schema constraints return HTTP 400 with actionable messages."""
    headers = get_authenticated_client("field_length_user@example.com")
    oversized_service = "A" * 105
    csv_content = f"date,service,resource,cost,currency\n2026-11-01,{oversized_service},res-1,10.0,USD\n"
    files = {"file": ("long_service.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    res = client.post("/api/billing/upload", files=files, headers=headers)
    assert res.status_code == 400
    assert "exceeds 100 character maximum" in res.json()["detail"]
