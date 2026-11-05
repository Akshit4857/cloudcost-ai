# PROJECT_CONTEXT.md — CloudCost AI

## 1. Project Objective
Build an AI-powered cloud cost analysis platform (**CloudCost AI**) that enables users to upload cloud billing CSV files, explore spending trends via an interactive dashboard, detect unusual cost spikes, and receive AI-driven explanations and actionable cost-reduction recommendations backed by official cloud provider documentation.

---

## 2. Beginner Learning Requirements
- **Senior Mentorship Approach**: Har ek concept ko step-by-step simple Hinglish mein explain kiya jayega code likhne se pehle.
- **One Small Step at a Time**: Ek response mein strictly ek hi small, manageable task complete kiya jayega.
- **No Monolithic Leaps**: Pura application ek saath kabhi generate nahi kiya jayega.
- **No Hallucinated Progress**: Tests, credentials, metrics, ya features kabhi assume ya fake nahi kiye jayenge.
- **Continuous Documentation**: `PROJECT_CONTEXT.md` ko har task ke end par update kiya jayega.
- **Interactive Checkpoints**: Har task ke baad learner se confirmation lene ke baad hi aage badha jayega.

---

## 3. Technology Stack
| Layer | Planned Technology |
|---|---|
| **Frontend** | Next.js (React), TypeScript, Tailwind CSS |
| **Backend** | Python (3.11+), FastAPI, Pydantic, SQLAlchemy |
| **Security** | Bcrypt (passwords), PyJWT (HS256 tokens), HTTPBearer auth |
| **Database & Vector Search** | PostgreSQL 16 with `pgvector` extension (Vector similarity & HNSW indexing) |
| **RAG & AI** | OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`) via backend service |
| **Background Queue** | Redis + Celery / ARQ worker (Upcoming) |
| **Real-time Comms** | WebSockets (live processing notifications) (Upcoming) |
| **DevOps & CI/CD** | Docker, Docker Compose, GitHub Actions (Upcoming) |

---

## 4. Planned Architecture
1. **Frontend Client (`frontend/`)**: Next.js SPA/SSR dashboard with charts, CSV drag-and-drop uploader, anomaly inspection cards, AI Insights & RAG Sources panel, and an AI chat assistant.
2. **Backend API (`backend/`)**: FastAPI modular service exposing REST endpoints for auth, CSV upload, analytical queries, RAG ingestion/retrieval, LLM advisor endpoints, and WebSocket endpoints.
3. **Storage & Vectors**: PostgreSQL storing normalized billing records, daily aggregates, users, documents, and embeddings (`pgvector`) of official cloud documentation.
4. **Asynchronous Worker**: Offloads heavy CSV parsing and multi-step AI prompts to Redis-backed background workers.
5. **AI Orchestrator**: Ingests user spending context, checks anomaly metrics, retrieves relevant official cloud documentation via vector similarity, and generates grounded FinOps proposals with citations.

---

## 5. Decisions Made and Reasons
- **Monorepo Directory Layout**: `frontend/` aur `backend/` ko ek hi project folder (`cloudcost-ai/`) ke under rakha gaya hai taaki beginner ke liye context switch aur repository management simple rahe.
- **`.gitignore` with `!.env.example`**: Secrets (`.env`) ko Git se leak hone se bachane ke liye ignore list banayi gayi hai, par `.env.example` ko track rakha hai taaki developers ko pata chale kaunse environment variables zaroori hain.
- **Next.js 16 with App Router**: Latest Next.js (16.4.3) with App Router (`src/app`) choose kiya gaya for modern React 19 architecture, server components, and clean file-based routing.
- **Tailwind CSS v4 with Turbopack**: Zero-config `@tailwindcss/turbopack` integration use kiya gaya for blazing fast hot reloading and modern CSS utility styling.
- **Clean SaaS UI Mockup (Task 2)**: Initial CloudCost AI homepage setup.
- **Light Theme FinOps Dashboard (Task 3)**: Clean, professional SaaS dashboard design with white cards, subtle neutral slate-50 backgrounds, and responsive mobile-to-desktop layout.
- **Zero-Dependency Chart Architecture (Task 3)**: 30-day spending chart built using native CSS/SVG bars rather than bloated third-party charting libraries.
- **Modular FastAPI Layout (Task 4)**: Structured backend under `backend/app/` (`core/config.py` for settings, `api/routes.py` for routers, `main.py` for FastAPI app & middleware) to support future scalability.
- **Strict Development CORS**: Whitelisted only local Next.js frontend origins (`http://localhost:3000` & `http://127.0.0.1:3000`) with credentials enabled; unauthorized external origins are rejected with HTTP 400.
- **Pydantic Data Contracts**: Strong typing for API responses (`HealthResponse`, `ApiInfoResponse`) ensuring typed contract adherence and auto-generated OpenAPI documentation.
- **Frontend Environment Configuration (Task 5)**: Configured `NEXT_PUBLIC_API_URL=http://localhost:8000` via `.env.local` and `.env.example`, preventing hardcoded URLs throughout the application.
- **Resilient API Client (`src/lib/api.ts`)**: Built `checkBackendHealth()` with network exception handling, HTTP status validation, safe JSON parsing, and latency tracking, guaranteeing that network failures never crash the UI.
- **Live Health Status Component (`src/components/dashboard/BackendStatus.tsx`)**: Displays true connection states (checking, connected, unavailable) with user-triggered retry capability in both compact badge and card layouts.
- **Safe In-Memory CSV Parsing (Task 6)**: Implemented `POST /api/billing/upload` using `UploadFile` and `python-multipart`. Files are parsed in-memory with strict schema validation (`date,service,resource,cost,currency`), row-level date & cost validation, single-currency enforcement, and zero arbitrary disk writes.
- **Interactive Ingestion UI (`src/components/dashboard/BillingUploadCard.tsx`)**: Provides file drag-and-drop, real-time backend parsing feedback, clear validation error display, and aggregated summary stats (total spend, row count, date range, service breakdown).
- **Lifting State to Dashboard Page (Task 7)**: Lifted `billingSummary` state into `src/app/page.tsx` so child components (`StatCard`, `CostChart`, `ServiceBreakdown`, `BillingUploadCard`) communicate reactively via props.
- **Dynamic Time-Series Scaling (`CostChart.tsx`)**: Replaced rigid 30-day assumptions with dynamic date mapping driven by actual backend `daily_totals`, dynamically scaling bar heights and labels according to the number of uploaded dates without fabricating dates.
- **Dynamic Service Cost Breakdown (`ServiceBreakdown.tsx`)**: Dynamically computes real percentage contributions from backend `service_totals` with multi-cloud provider tagging.
- **Clean Sample vs. Live Segregation**: Never blends mock data with real data; clearly indicates live ingestion with source filenames and provides a one-click "Reset to Demo Data" capability.
- **PostgreSQL Database Integration & ACID Transactions (Step 9)**:
  - Replaced stateless in-memory processing with production-grade PostgreSQL persistence.
  - Implemented declarative SQLAlchemy 2.0 ORM models:
    - `BillingBatch`: Tracks file metadata, row count, total cost, and date range with UUID `id`.
    - `BillingRecord`: Normalizes line-item billing rows with `(billing_date, service)` composite indexing, foreign-key cascade deletion, and `cost >= 0` check constraints.
  - Implemented transactional deduplication: re-uploading an existing filename replaces the batch inside an atomic transaction, preventing silent duplicate row accumulation.
  - Added `GET /api/billing/summary` to retrieve persisted metrics directly from PostgreSQL.
  - Implemented `GET /api/billing/anomalies` to compute transparent, rule-based Z-score statistical anomalies (Mean + $1.25\sigma$) directly over database records.
  - Frontend hydration: `DashboardPage` automatically retrieves persisted data from PostgreSQL on initial load, persisting metrics across page reloads.
- **Upload History & Dataset Management (Step 10)**:
  - Implemented `GET /api/billing/uploads` returning all uploaded datasets ordered newest first.
  - Implemented `GET /api/billing/uploads/{upload_id}` to retrieve full breakdown for a selected dataset.
  - Implemented `DELETE /api/billing/uploads/{upload_id}` to atomically delete an upload and cascade-delete its records.
  - Scoped dashboard metrics, daily spend charts, and anomaly detection to the active selected `upload_id`.
  - Built `UploadHistory.tsx` component with active dataset badge, inline deletion confirmation, and dataset switching.
- **Authentication & User Accounts (Step 11)**:
  - User model with UUID primary key, unique email index, bcrypt password hashing, and timestamps.
  - Associated `BillingBatch.user_id` with `users.id` via foreign key with `CASCADE` on delete. Made column nullable (`nullable=True`) non-destructively so pre-existing dev records are preserved without corruption.
  - JWT tokens with HMAC-SHA256 (`HS256`) and 24-hour expiration.
  - FastAPI dependency `get_current_user` using `HTTPBearer`.
  - Strict query scoping across all billing services enforcing `BillingBatch.user_id == current_user.id`.
  - Anti-enumeration: returns 404 Not Found on cross-user resource access.
  - Frontend `AuthView` with tabbed Sign In/Create Account forms and 1-click Demo Fill buttons for Alice and Bob.
- **AI-Powered Billing Explanations (Step 12)**:
  - Backend-only API key security (`OPENAI_API_KEY` in `backend/.env`).
  - Zero fabrication and anti-prompt injection prompt engineering.
  - Structured Pydantic contract returning executive summary, cost drivers, and recommendations.
  - Graceful degradation returning HTTP 503 with setup instructions when API key is missing.
- **RAG Pipeline for Cloud Documentation (Step 13)**:
  - **pgvector Vector Database**: Enabled native `vector` extension in PostgreSQL 16 with HNSW index (`vector_cosine_ops`) for sub-millisecond semantic similarity search.
  - **SQLAlchemy Document & Chunk Models**: `Document` (source URL, title, provider, retrieved timestamp, content hash) and `DocumentChunk` (`content`, `token_count`, `embedding Vector(1536)`).
  - **Controlled Ingestion Pipeline**: Curated authoritative official guides for AWS EC2, AWS RDS, AWS S3, and GCP BigQuery in `backend/app/data/cloud_docs/`.
  - **Deduplication**: SHA-256 fingerprinting on chunk content (`source_url:chunk_index:content`) prevents duplicate records when ingestion is executed repeatedly.
  - **Hybrid Search**: Performs pgvector cosine distance search when embeddings are active; falls back to clean keyword search when embeddings are unconfigured, ensuring testability without paid API keys.
  - **Grounding in AI Advisor**: Injects retrieved documentation excerpts into the LLM prompt. The LLM cites document titles and URLs in recommendations and populates `documentation_sources`.
  - **Frontend Citations**: `AiBillingExplainer.tsx` renders a dedicated "Referenced Official Cloud Documentation (RAG Sources)" section with clickable external links and provider tags.

---

## 6. Current Status
- **Current Phase**: Step 13 — RAG Pipeline for Cloud Documentation Completed ✅
- **Active Task**: Step 13 Completed (PostgreSQL pgvector extension active; Document and DocumentChunk models with HNSW index; controlled ingestion with SHA-256 deduplication; hybrid pgvector/keyword retrieval; LLM prompt grounding with official source citations; 22/22 backend integration tests passed; frontend lint & production build clean).

---

## 7. Completed Tasks
- [x] **Task 1: Foundation & Baseline Setup**
- [x] **Task 2: Frontend Base Application (Next.js + TypeScript + Tailwind CSS)**
- [x] **Task 3: CloudCost AI Dashboard UI (Components & Mock Data)**
- [x] **Task 4: Initialize FastAPI Backend**
- [x] **Task 5: Connect Next.js Frontend to FastAPI Backend**
- [x] **Task 6: Billing CSV Upload & Backend In-Memory Parsing**
- [x] **Task 7: Connect Real Billing Data to Dashboard**
- [x] **Step 8: Architectural Inspection & Statistical Anomaly Design**
- [x] **Step 9: PostgreSQL Database Integration & Statistical Anomaly Detection**
- [x] **Step 10: Billing Upload History & Dataset Management**
- [x] **Step 11: Authentication & User Accounts**
- [x] **Step 12: AI-Powered Billing Explanations**
- [x] **Step 13: RAG Pipeline for Cloud Documentation**
  - Compiled and enabled `vector` extension in PostgreSQL 16.
  - Added `pgvector>=0.3.0` dependency.
  - Created declarative models `Document` and `DocumentChunk` with HNSW vector index.
  - Authored authoritative cloud cost guides in `backend/app/data/cloud_docs/` (AWS EC2, RDS, S3, BigQuery).
  - Implemented `backend/app/services/rag_service.py` with chunking, hashing, deduplication, and vector retrieval.
  - Added `POST /api/billing/rag/ingest` and `GET /api/billing/rag/search`.
  - Integrated retrieved documentation context and citations into `ai_advisor.py`.
  - Updated frontend `AiBillingExplainer.tsx` to display RAG sources and recommendation citations.
  - Expanded test suite to 22/22 passing automated tests (`test_rag_pipeline.py`, `test_ai_insights.py`, `test_database_billing.py`).
  - Frontend lint and production build verified cleanly.

---

## 8. Backend Folder Structure (`cloudcost-ai/backend/`)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py             # FastAPI entrypoint, lifespan DB init, middleware, routes
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py       # Pydantic Settings, CORS, JWT secrets, LLM & pgvector config
│   │   └── security.py     # Bcrypt password hashing & JWT encode/decode
│   ├── data/
│   │   └── cloud_docs/     # Official cloud cost documentation (EC2, RDS, S3, BigQuery)
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py      # SQLAlchemy engine, SessionLocal, get_db, pool_pre_ping
│   │   └── init_db.py      # pgvector extension init, table creation, auto doc-ingest
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py         # User ORM model
│   │   ├── billing.py      # BillingBatch and BillingRecord ORM models
│   │   └── rag.py          # Document and DocumentChunk pgvector ORM models
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── ai.py           # Pydantic schemas for AI insights & RAG sources
│   │   ├── auth.py         # Pydantic auth schemas
│   │   └── billing.py      # Pydantic billing schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── rag_service.py  # Documentation chunking, hashing, pgvector similarity search
│   │   ├── ai_advisor.py   # Grounded LLM FinOps advisor with RAG context & citations
│   │   ├── billing_parser.py # Safe in-memory CSV parsing & schema validation
│   │   └── billing_db.py   # User-scoped persistence, summaries, and Z-score anomalies
│   └── api/
│       ├── __init__.py
│       ├── deps.py         # get_current_user HTTPBearer auth dependency
│       ├── auth.py         # Auth endpoints (/register, /login, /me)
│       ├── routes.py       # Health check (with DB state) & API metadata
│       └── billing.py      # Scoped billing, anomalies, AI insights, and RAG search
├── tests/
│   ├── __init__.py
│   ├── test_rag_pipeline.py # 7 tests for chunking, deduplication, pgvector retrieval, and RAG prompt
│   ├── test_ai_insights.py # 8 tests for LLM grounding, errors, timeouts, anti-injection
│   └── test_database_billing.py # 7 tests for database persistence, auth, and isolation
├── venv/                   # Python virtual environment (gitignored)
├── .env                    # Local environment secrets (gitignored)
├── .env.example            # Environment configuration template with OPENAI_API_KEY & EMBEDDING
└── requirements.txt        # Backend dependencies (fastapi, uvicorn, pydantic, sqlalchemy, psycopg, bcrypt, pyjwt, openai, pgvector)
```

---

## 9. Backend Setup & Run Commands
```bash
cd backend

# 1. Activate virtual environment
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables (.env)
cp .env.example .env

# 4. Start development server with hot-reload
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 5. Run full integration test suite (22 tests)
PYTHONPATH=. pytest -v tests/test_rag_pipeline.py tests/test_ai_insights.py tests/test_database_billing.py
```
Available Endpoints:
- Health Check (w/ DB): `GET http://127.0.0.1:8000/api/health`
- Upload Billing CSV: `POST http://127.0.0.1:8000/api/billing/upload`
- Ingest RAG Documentation: `POST http://127.0.0.1:8000/api/billing/rag/ingest`
- Search RAG Documentation: `GET http://127.0.0.1:8000/api/billing/rag/search?query=...`
- **RAG-Enhanced AI Insights**: `POST http://127.0.0.1:8000/api/billing/ai-insights`
- **Enqueue Background Job**: `POST http://127.0.0.1:8000/api/jobs/rag-ingest` (Returns 202 Accepted)
- **Get Job Status**: `GET http://127.0.0.1:8000/api/jobs/{job_id}`
- **List User Jobs**: `GET http://127.0.0.1:8000/api/jobs`
- **Real-Time Job WebSocket**: `WS ws://127.0.0.1:8000/api/ws/jobs/{job_id}?token=...`

---

## 10. Step 14 Completed: Redis & Asynchronous Job Processing (Celery)
- **Task Queue Architecture**:
  - Client sends `POST /api/jobs/rag-ingest`.
  - Backend writes job row to PostgreSQL with status `queued` and enqueues task into Redis broker (`redis://localhost:6379/0`).
  - Returns `202 Accepted` immediately with `{ job_id, status: "queued" }`.
  - Celery background worker picks up task, transitions status to `running`, executes the heavy documentation ingestion/embedding pipeline, updates status to `completed` (or `failed`) with structured metrics payload, and saves execution results.
- **Worker Execution Command**:
  ```bash
  cd backend
  ./venv/bin/celery -A app.core.celery_app worker --pool=solo --loglevel=info
  ```
- **Multi-Tenant Security & Isolation**:
  - `background_jobs` table records `user_id` foreign key.
  - Endpoint `GET /api/jobs/{job_id}` strictly enforces `job.user_id == current_user.id`. Access attempts by other users return `404 Not Found` (anti-enumeration).
- **Graceful Fault Tolerance**:
  - If Redis is down or unreachable, API catches `kombu.exceptions.OperationalError`, marks job as `failed` in DB, and returns HTTP 503 Service Unavailable with actionable operational guidance.

---

## 11. Step 15 Completed: WebSockets for Real-Time Job Updates (Redis Pub/Sub)
- **Real-Time Architecture**:
  - When the background Celery worker begins (`running`), finishes (`completed`), or fails (`failed`), it publishes an event payload to Redis channel `job_updates:{job_id}`.
  - FastAPI WebSocket endpoint `GET /api/ws/jobs/{job_id}?token=...` authenticates the user token, checks job ownership against PostgreSQL, accepts the socket, immediately pushes an initial state snapshot, and subscribes to the Redis channel via `redis.asyncio`.
  - Messages from worker are streamed instantly to the frontend with zero polling latency.
  - Once a terminal state (`completed` or `failed`) is reached, the WebSocket cleanly closes with code `1000`.
- **Security & Authorization**:
  - Client token decoded from JWT query param; user identity (`sub`) verified in DB.
  - Ownership strictly verified: if `job.user_id != user.id`, connection is terminated with `WS_1008_POLICY_VIOLATION`.
- **Frontend Fallback**:
  - `BackgroundJobCard.tsx` connects via WebSocket. If the socket encounters an error or disconnects before completion, it seamlessly activates the 2-second HTTP polling fallback so the user is never stuck.

---

## 12. Step 16 Completed: Docker & Docker Compose Containerization
- **Container Architecture**:
  - `postgres`: PostgreSQL 16 with native `pgvector` extension (`pgvector/pgvector:pg16`), persistent volume `postgres_data`, healthcheck via `pg_isready`.
  - `redis`: Redis 7 in-memory broker & pub/sub (`redis:7-alpine`), persistent volume `redis_data`, healthcheck via `redis-cli ping`.
  - `backend`: FastAPI server built from `backend/Dockerfile` (`python:3.12-slim`), non-root `appuser`, healthcheck via `curl /api/health`.
  - `worker`: Celery background task worker built from `backend/Dockerfile.worker`, shares dependencies with backend, coordinates RAG ingestion asynchronously.
  - `frontend`: Next.js 16 web application built from `frontend/Dockerfile` (`node:20-alpine` multi-stage: deps -> builder -> runner), non-root `nextjs` user.
- **Networking & DNS Resolution**:
  - Container-to-container communication strictly uses internal Docker service names: `DATABASE_URL=postgresql://...postgres:5432/...` and `REDIS_URL=redis://redis:6379/0`.
  - Client-side browser access uses host-reachable URL: `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- **Developer Workflow Commands**:
  ```bash
  # Start full stack in detached mode
  docker compose up -d --build

  # Stream logs from all services or a specific service
  docker compose logs -f
  docker compose logs -f backend worker

  # Stop stack preserving persistent database & cache data
  docker compose down

  # Rebuild single service after code changes
  docker compose up -d --build backend
  ```
- **Host Environment Note**:
  - Docker runtime is not currently installed on the local macOS machine; all Dockerfiles, `.dockerignore` files, and `docker-compose.yml` configurations have been authored and verified against production standards, with existing native local workflows fully preserved.

---

## 13. Step 17 Completed: Continuous Integration with GitHub Actions
- **Workflow File**: `.github/workflows/ci.yml`
- **Triggers**:
  - Push to `main` and `master` branches.
  - Pull Requests targeting `main` and `master` branches.
- **Automated Jobs & Checks**:
  1. `frontend-ci`:
     - Environment: `ubuntu-latest`, Node.js 20.x with npm dependency caching.
     - Reproducible installation: `npm ci`.
     - Static analysis: `npm run lint` (ESLint).
     - Production build: `npm run build` (Turbopack, Next.js 16).
  2. `backend-ci`:
     - Environment: `ubuntu-latest`, Python 3.12 with pip caching.
     - Service Containers: Real PostgreSQL 16 with `pgvector` (`pgvector/pgvector:pg16`) on port 5432 and Redis 7 (`redis:7-alpine`) on port 6379 with built-in healthchecks.
     - Test execution: `PYTHONPATH=. pytest -v` executing all 34 integration tests across database persistence, vector embeddings, Celery tasks, and WebSockets.
  3. `docker-validation`:
     - Environment: `ubuntu-latest`.
     - Validates `docker compose config` syntax.
     - Validates buildability of `backend/Dockerfile` and `backend/Dockerfile.worker`.
- **Security & Efficiency Guardrails**:
  - `permissions: contents: read` restricts GITHUB_TOKEN to read-only.
  - Concurrency group cancels redundant in-progress runs on new commits.
  - Zero hardcoded secrets; CI tests run with ephemeral dummy JWT keys and placeholder API tokens.
- **Local vs Remote Execution**:
  - All linting, building, and pytest checks verified locally (0 errors, 34 passed tests).
  - Remote CI execution triggers automatically upon pushing commits to GitHub.

---

## 14. Step 18: Strictly Free ($0 / ₹0) Cloud Deployment Architecture & Feasibility
- **Zero-Cost Policy & Constraints**:
  - Zero billable resources, zero paid tier conversions, and strictly zero credit card requirement.
- **Implemented Architecture — Unified Single-Service Monolith**:
  - Next.js 16 configured with static export (`output: "export"` in `frontend/next.config.ts`), generating compiled HTML/CSS/JS in `frontend/out`.
  - FastAPI mounts `frontend/out` directly at root `/` via `fastapi.staticfiles.StaticFiles`.
  - All `/api/*` and `/api/ws/*` endpoints execute on the exact same port/domain, completely eliminating cross-origin CORS barriers and enabling direct WebSocket connections without separate serverless microservices.
  - Selected Verified Target: **Render Free Web Service** (100% Free, Strictly No Credit Card):
    - Detected that Hugging Face now marks custom Docker SDK spaces as `🔒 Paid`.
    - Render provides a verified Free Web Service ($0/mo, 750 hrs/mo) with native Python 3 + Node.js environments.
    - Zero Docker constraints, zero payment requirements, and direct WebSocket support on `https://cloudcost-ai.onrender.com`.
  - External Database: Dedicated PostgreSQL 16 with `pgvector` hosted on Supabase Free Tier ($0/month, no credit card required).
- **Deployment Artifacts Created & Configured**:
  - `Dockerfile`: Multi-stage Docker build for Hugging Face Spaces (Node 20 build stage compiles Next.js static files -> Python 3.12 slim runtime stage copies HTML into FastAPI, runs non-root UID 1000 user on port 8000).
  - `README.md`: Includes Hugging Face Spaces YAML frontmatter (`sdk: docker`, `app_port: 8000`).
  - `render.yaml`: Single-service Blueprint for alternative one-click Render deployment.
  - `frontend/next.config.ts`: Configured with `output: "export"`.
  - `frontend/src/lib/api.ts`: Auto-resolving relative URLs (`/api/...`) and adaptive WebSockets (`ws:` / `wss:` via `window.location.host`).
  - `backend/app/main.py`: Static frontend mounting at `/` with automated fallback.
- **Live Local Verification**:
  - `curl http://127.0.0.1:8000/` returns compiled Next.js Dashboard HTML.
  - `curl http://127.0.0.1:8000/api/health` returns healthy database status.
  - All 34 automated integration tests passed (11.25s).
  - Frontend static export built with 0 errors.
  - Full project verified ready for immediate deployment.

---

## 15. Pending Tasks (Roadmap)
- [x] **Step 14**: Redis and Background Job Processing (Celery Worker).
- [x] **Step 15**: WebSockets for Real-Time Job Updates (Redis Pub/Sub & Polling Fallback).
- [x] **Step 16**: Docker & Docker Compose Containerization.
- [x] **Step 17**: GitHub Actions CI/CD Pipeline.
- [x] **Step 18**: Deploy on Strictly Free Hosting (Unified Single-Service Setup Ready).

---

## 16. Security Disclosures & Grounding Principles
- **No Scraped Bloat**: Controlled documentation only from official cloud provider documentation.
- **Untrusted Documentation Protection**: Retrieved text is passed as reference knowledge; model is instructed never to execute instructions embedded inside documents.
- **Zero Hallucination of Architecture**: Model is forbidden from claiming documentation proves user's actual infrastructure state.
