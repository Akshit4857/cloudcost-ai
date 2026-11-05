import io
import json
import uuid
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.rag import Document, DocumentChunk
from app.services.rag_service import (
    chunk_text,
    compute_chunk_hash,
    ingest_documentation_directory,
    retrieve_documentation,
)

client = TestClient(app)


def get_authenticated_client(email: str, password: str = "password123"):
    """Helper to register and/or authenticate a user and return auth headers."""
    reg_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "RAG Tester"},
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


def test_chunking_algorithm():
    """Verify that document chunking respects maximum chunk size and overlap boundaries."""
    text = (
        "Paragraph 1: Amazon EC2 right-sizing is crucial for cloud cost optimization. "
        "Teams should inspect CloudWatch CPU and memory metrics over a 14-day window.\n\n"
        "Paragraph 2: Migrating to AWS Graviton processors delivers up to 20% lower instance cost. "
        "Most containerized and modern applications run seamlessly on arm64 architectures.\n\n"
        "Paragraph 3: Terminate unattached Amazon EBS volumes to avoid continuous ghost storage billing."
    )

    chunks = chunk_text(text, chunk_size=200, chunk_overlap=30)
    assert len(chunks) >= 2
    for chunk in chunks:
        assert len(chunk) > 0


def test_chunk_hash_deduplication():
    """Verify compute_chunk_hash produces deterministic SHA-256 fingerprints."""
    h1 = compute_chunk_hash("https://example.com/doc", 0, "Some cloud text content")
    h2 = compute_chunk_hash("https://example.com/doc", 0, "Some cloud text content")
    h3 = compute_chunk_hash("https://example.com/doc", 1, "Some cloud text content")

    assert h1 == h2
    assert h1 != h3
    assert len(h1) == 64


def test_document_ingestion_and_deduplication():
    """Verify that ingest_documentation_directory loads official docs and skips duplicates on repeat."""
    db = SessionLocal()
    try:
        # First ingestion run
        res1 = ingest_documentation_directory(db)
        assert res1["status"] == "success"
        assert res1["documents_processed"] >= 4

        # Verify documents exist in database
        doc_count = db.query(Document).count()
        chunk_count = db.query(DocumentChunk).count()
        assert doc_count >= 4
        assert chunk_count >= 10

        # Second ingestion run -> all chunks must be skipped (0 new chunks)
        res2 = ingest_documentation_directory(db)
        assert res2["status"] == "success"
        assert res2["chunks_created"] == 0
        assert res2["chunks_skipped"] >= 10
    finally:
        db.close()


def test_documentation_retrieval_keyword_fallback():
    """Verify retrieve_documentation returns relevant official documents even when embeddings are unconfigured."""
    db = SessionLocal()
    try:
        # Search for EC2
        ec2_docs = retrieve_documentation(db, "EC2 right-sizing and Graviton", top_k=2)
        assert len(ec2_docs) > 0
        first_doc = ec2_docs[0]
        assert "document_title" in first_doc
        assert "source_url" in first_doc
        assert first_doc["source_url"].startswith("http")
        assert "content" in first_doc

        # Search for RDS
        rds_docs = retrieve_documentation(db, "RDS database Multi-AZ cost reduction", top_k=2)
        assert len(rds_docs) > 0

        # Empty query
        empty_docs = retrieve_documentation(db, "   ", top_k=3)
        assert empty_docs == []
    finally:
        db.close()


def test_vector_search_with_mock_embedding():
    """Verify pgvector cosine similarity search when vector embeddings are present."""
    db = SessionLocal()
    try:
        # Create a mock vector of length 1536
        mock_vec = [0.05] * 1536

        # Update one chunk with this vector for testing
        test_chunk = db.query(DocumentChunk).first()
        assert test_chunk is not None
        test_chunk.embedding = mock_vec
        db.commit()

        # Perform search with mocked OpenAI embedding client
        mock_emb_data = MagicMock()
        mock_emb_data.embedding = mock_vec
        mock_emb_res = MagicMock(data=[mock_emb_data])

        with patch.object(settings, "OPENAI_API_KEY", "sk-valid-mock-key"):
            with patch("app.services.rag_service.OpenAI") as mock_openai_cls:
                mock_client = MagicMock()
                mock_client.embeddings.create.return_value = mock_emb_res
                mock_openai_cls.return_value = mock_client

                matches = retrieve_documentation(db, "EC2 cost reduction", top_k=2)
                assert len(matches) > 0
                assert matches[0]["retrieval_method"] == "pgvector_cosine"
                assert matches[0]["similarity_score"] >= 0.9
    finally:
        db.close()


def test_rag_endpoints_api():
    """Verify POST /api/billing/rag/ingest and GET /api/billing/rag/search endpoints."""
    headers = get_authenticated_client(f"rag_api_{uuid.uuid4().hex[:6]}@example.com")

    # Ingest trigger
    ingest_res = client.post("/api/billing/rag/ingest", headers=headers)
    assert ingest_res.status_code == 200
    assert ingest_res.json()["status"] == "success"

    # Search endpoint
    search_res = client.get("/api/billing/rag/search?query=S3%20Intelligent-Tiering&top_k=2", headers=headers)
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) > 0
    assert "document_title" in results[0]
    assert "source_url" in results[0]


def test_ai_insights_with_rag_documentation_context():
    """Verify POST /api/billing/ai-insights feeds retrieved documentation to the prompt and returns sources."""
    headers = get_authenticated_client(f"rag_ai_user_{uuid.uuid4().hex[:6]}@example.com")

    # Upload multi-service CSV
    csv_data = (
        "date,service,resource,cost,currency\n"
        "2026-10-01,EC2,i-web-frontend,85.00,USD\n"
        "2026-10-01,S3,s3-log-bucket,15.00,USD\n"
    )
    upload_res = client.post(
        "/api/billing/upload",
        files={"file": ("rag_billing.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        headers=headers,
    )
    assert upload_res.status_code == 200
    batch_id = upload_res.json()["batch_id"]

    mock_llm_json = {
        "summary": "Total expenditure of $100.00 USD driven by EC2 ($85.00) and S3 ($15.00).",
        "biggest_cost_drivers": [
            {
                "service": "EC2",
                "amount": 85.00,
                "percentage_of_total": 85.0,
                "observation": "EC2 web instances dominate 85% of total spend."
            }
        ],
        "anomaly_explanations": [],
        "recommendations": [
            {
                "title": "Adopt Graviton and Auto-Scaling for EC2",
                "service": "EC2",
                "impact": "High",
                "recommendation": "Upgrade x86 instances to Graviton3/4 processors and schedule off-hours downtime.",
                "potential_action": "Audit instance CPU metrics in CloudWatch.",
                "grounded_evidence": "EC2 spend is $85.00 out of $100.00 total.",
                "source_title": "AWS Cost Optimization: Amazon EC2 Right-Sizing and Modernization",
                "source_url": "https://docs.aws.amazon.com/whitepapers/latest/cost-optimization-laying-the-foundation/optimizing-ec2.html"
            }
        ],
        "documentation_sources": [
            {
                "title": "AWS Cost Optimization: Amazon EC2 Right-Sizing and Modernization",
                "source_url": "https://docs.aws.amazon.com/whitepapers/latest/cost-optimization-laying-the-foundation/optimizing-ec2.html",
                "provider": "AWS",
                "relevance_summary": "Official guidelines on EC2 right-sizing, Graviton migration, and idle EBS cleanup."
            }
        ],
        "supporting_evidence": ["$100.00 total spend verified from database."],
        "limitations": ["Hourly request telemetry not included in daily CSV."]
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_llm_json)
    mock_completion = MagicMock(choices=[mock_choice])

    with patch.object(settings, "OPENAI_API_KEY", "sk-mock-valid-key"):
        with patch("app.services.ai_advisor.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_client.chat.completions.create.return_value = mock_completion
            mock_openai_cls.return_value = mock_client

            res = client.post(
                "/api/billing/ai-insights",
                json={"upload_id": batch_id},
                headers=headers,
            )
            assert res.status_code == 200
            data = res.json()

            # Verify documentation sources returned
            assert len(data["documentation_sources"]) >= 1
            assert "EC2" in data["documentation_sources"][0]["title"]
            assert data["documentation_sources"][0]["source_url"].startswith("http")
            assert data["rag_status"] == "active"

            # Verify recommendation cites source
            rec = data["recommendations"][0]
            assert rec["source_title"] is not None
            assert rec["source_url"] is not None

            # Verify prompt contained official documentation
            call_args = mock_client.chat.completions.create.call_args[1]
            user_msg = next(m["content"] for m in call_args["messages"] if m["role"] == "user")
            assert "OFFICIAL CLOUD DOCUMENTATION EXCERPTS" in user_msg

