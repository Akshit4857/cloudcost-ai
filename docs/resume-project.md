# CloudCost AI — Resume Project Profile

This document provides ATS-optimized, technically accurate resume content for **CloudCost AI**. All claims, bullet points, and architectural descriptions are directly verified against the repository implementation with zero fabricated metrics or hypothetical integrations.

---

## 1. Project Header & Summary

* **Project Title**: CloudCost AI — Intelligent Cloud Cost Optimization & FinOps Analytics Platform
* **One-Line Summary**: A full-stack FinOps platform that parses multi-cloud billing datasets, detects statistical spending anomalies using PostgreSQL, and generates grounded cost-reduction recommendations backed by pgvector vector search.
* **Live Demo URL**: [https://cloudcost-ai.onrender.com](https://cloudcost-ai.onrender.com)
* **GitHub Repository**: [https://github.com/Akshit4857/cloudcost-ai](https://github.com/Akshit4857/cloudcost-ai)

---

## 2. Technology Stack

* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide-React
* **Backend**: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM, Uvicorn
* **Database & Storage**: PostgreSQL 16 (or Supabase PG17), `pgvector` extension (HNSW indexing)
* **Asynchronous Queue & Streaming**: Redis 7, Celery 5.4, WebSockets (`Starlette`)
* **Security & Auth**: Bcrypt password hashing, PyJWT bearer authentication (HS256), CORS security guards
* **DevOps & CI/CD**: Docker, Docker Compose, GitHub Actions, Render Cloud Hosting

---

## 3. Resume Bullet Points (Select 3 for your Resume)

### Option Set A (Full-Stack & Systems Focus — Recommended)
* **Architected full-stack FinOps platform** using Next.js 16 and FastAPI to parse and normalize multi-cloud billing CSVs into PostgreSQL with atomic ACID transaction deduplication and user-isolated multi-tenant security.
* **Engineered statistical anomaly detection engine** calculating historical baseline metrics and service-level Z-scores ($\ge 1.25\sigma$) directly over indexed database records to flag cost spikes with contextual dollar deltas.
* **Built asynchronous ingestion pipeline** using Celery, Redis, and WebSockets with automatic HTTP polling fallback to process documentation chunks and query semantic embeddings via PostgreSQL `pgvector` HNSW indexes.

### Option Set B (Backend & AI Engineering Focus)
* **Developed RAG documentation retrieval system** in PostgreSQL using `pgvector` and HNSW cosine distance indexing to ground LLM-generated cost optimization recommendations in authoritative cloud architecture guides.
* **Designed decoupled background worker architecture** utilizing Celery and Redis Pub/Sub to execute heavy vector ingestion tasks with non-blocking HTTP 202 submission and live event pushes over WebSockets.
* **Implemented automated CI/CD pipeline** via GitHub Actions running multi-stage Docker builds, frontend static validation, and a 38-test integration suite testing database persistence and WebSocket lifecycles.

---

## 4. Key Technical Challenges & Solutions

| Challenge | Engineering Solution Implemented |
|---|---|
| **Memory Exhaustion on 512MB RAM Hosting** | Replaced unbounded file buffering with a chunked stream reader enforcing a strict 10 MB limit (`await file.read(MAX + 1)`), preventing container Out-Of-Memory (OOM) crashes during large CSV uploads. |
| **Silent Duplicate Row Accumulation** | Implemented transactional deduplication in SQLAlchemy that automatically deletes previous batches with the same filename for the authenticated user inside an atomic transaction before inserting new normalized rows. |
| **CORS Wildcard with Credentials Vulnerability** | Enforced W3C CORS security compliance by creating dynamic properties that strictly disable `allow_credentials` whenever a wildcard `*` origin is configured, preventing unauthorized cross-origin credential reflection. |
| **Redis Broker Unavailability on Free Tier** | Configured `CELERY_TASK_ALWAYS_EAGER=true` in-process execution fallback paired with a 2-second client-side HTTP polling fallback so background tasks complete reliably even when external Redis daemons are absent. |
| **Cross-User Data Leakage** | Enforced strict `user_id` foreign-key query scoping on all database records, paired with anti-enumeration `404 Not Found` responses to prevent attackers from discovering other users' resource UUIDs. |

---

## 5. Actual Verified Features (What to Confidently Discuss in Interviews)

1. **User Authentication & Session Management**: Secure user registration, login with salted bcrypt password verification, and 24-hour signed JWT tokens.
2. **Multi-Tenant Data Isolation**: Complete separation of billing datasets, anomaly metrics, and background jobs by user UUID.
3. **CSV Parsing & Validation**: In-memory parsing with schema verification (`date,service,resource,cost,currency`), row-level date/cost validation, and field length guards.
4. **Interactive Dashboard Analytics**: Zero-dependency SVG/CSS daily spending trend bars, service cost distribution bars, and aggregated KPI cards.
5. **Statistical Anomaly Detection**: Transparent mathematical Z-score spike detection ($z \ge 1.25$, diff $\ge \$3$) comparing daily spend to historical service baselines.
6. **Dataset History Management**: Switch between past uploads, view individual breakdowns, or cascade-delete datasets.
7. **Vector RAG Pipeline**: PostgreSQL `pgvector` table with HNSW index storing official AWS and GCP documentation chunks with hybrid keyword fallback.
8. **Asynchronous Jobs & WebSockets**: Celery worker task execution with live state push over WebSockets and polling fallback.
9. **Single-Service Monolith Deployment**: Next.js static export served directly by FastAPI root, running 100% free with SSL on Render.
10. **Automated CI/CD**: 38 passing integration tests on GitHub Actions covering authentication, database transactions, vector search, Celery tasks, and WebSocket connections.
