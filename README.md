---
title: CloudCost AI
emoji: 💰
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8000
pinned: false
---

# CloudCost AI 💰☁️

AI-powered Cloud Cost Analysis and Optimization Platform with RAG Documentation Pipeline.

---

## 📌 Project Overview
**CloudCost AI** ek smart cloud financial management (FinOps) platform hai jo users ko unke cloud spending (AWS / GCP / Azure billing CSV files) ko upload karke analyze karne ki suvidha deta hai. Ye application unusual spending spikes ko detect karega aur official cloud documentation se backed AI-driven explanations and cost-reduction recommendations provide karega.

---

## 🚀 Key Features
1. **RAG Pipeline & Vector Search with pgvector** *(Step 13)*: Semantic vector similarity search over official AWS & GCP cost-management whitepapers (EC2, RDS, S3, BigQuery) stored in PostgreSQL using `pgvector` with HNSW indexing and SHA-256 deduplication.
2. **AI-Powered Billing Explanations & FinOps Insights** *(Step 12)*: Plain-language executive summaries, primary cost drivers, anomaly root-cause interpretations, and actionable optimization advice citing official documentation sources.
3. **User Authentication & Data Isolation** *(Step 11)*: Secure user registration and login with bcrypt password hashing, signed JWT bearer tokens, and strictly isolated private datasets.
4. **Cloud Billing CSV Ingestion**: Multi-cloud billing CSV data upload, validation, and atomic transactional persistence in PostgreSQL.
5. **Upload History & Dataset Management**: View, switch between, and delete past billing datasets with cascade integrity.
6. **Cost Analytics & Visual Breakdown**: Service-wise, daily spending trends, and KPI dashboards dynamically populated from database records.
7. **Statistical Anomaly Detection**: Transparent Z-score spike detection ($x > \mu + 1.25\sigma$) running directly over PostgreSQL records.
8. **Asynchronous Background Processing with Redis & Celery** *(Step 14)*: Decoupled task queue architecture using Redis 7.2 as broker and Celery background workers to process heavy documentation parsing and vector embeddings asynchronously with non-blocking HTTP 202 enqueuing, polling state machine, and multi-tenant isolation.
9. **Real-Time WebSockets & Event Streaming** *(Step 15)*: Bi-directional, authenticated WebSocket connections (`/api/ws/jobs/{id}?token=...`) backed by Redis Pub/Sub for immediate worker state push (`queued`, `running`, `completed`, `failed`) with graceful polling fallback.
10. **Docker & Docker Compose Containerization** *(Step 16)*: Full multi-service container orchestration with dedicated Dockerfiles (Python 3.12 slim backend/worker, Next.js 16 multi-stage frontend), health-checked PostgreSQL 16 (pgvector) and Redis 7 services, named persistent volumes, and isolated bridge networking.
11. **Continuous Integration (CI) with GitHub Actions** *(Step 17)*: Automated multi-job CI pipeline (`.github/workflows/ci.yml`) validating frontend lint & Next.js production builds, running full integration test suite (34 tests) against live PostgreSQL (pgvector) and Redis service containers, and validating Docker configurations on every push and pull request.
12. **Production Cloud Deployment & Monitoring** *(Upcoming Step 18)*: Cloud deployment with SSL/TLS termination, health monitoring, and performance telemetry.

---

## 🛠 Technology Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Python 3.14+, FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM, Uvicorn
- **Database & Vector Search**: PostgreSQL 16 with native `pgvector` extension (HNSW indexing)
- **AI & Embeddings**: OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`) with strict grounding prompts
- **Security**: `bcrypt` (password hashing), `pyjwt` (HS256 access tokens), HTTPBearer dependencies
- **DevOps & Tooling**: Docker, Docker Compose, GitHub Actions CI/CD (Upcoming)

---

## 🏛 RAG & AI Architecture Diagram

```
[ User Browser / Next.js Client ]
       │
       │ (1) Authenticate -> Bearer Token
       │ (2) POST /api/billing/ai-insights { upload_id }
       ▼
[ FastAPI Backend ]
       ├── [ deps.get_current_user ] (Authenticates JWT token)
       ├── [ Security & Scoping ] (Ensures dataset belongs to current_user.id)
       ├── [ Billing Context ] (Aggregates DB facts, top resources, Z-score anomalies)
       │         │
       │         ▼ (Query top services: "EC2 right-sizing", "RDS cost reduction")
       ├── [ pgvector Cosine Search ] ──▶ [ PostgreSQL: document_chunks ]
       │         │                         (HNSW Vector Index / Keyword Fallback)
       │         ▼ (Retrieved official passages with URLs & titles)
       ├── [ LLM Advisor Service (OpenAI GPT-4o-mini) ]
       │         │
       │         ▼ (Grounded JSON Mode response citing official doc links)
[ User Interface ] ◀── Renders AI Insights, Recommendations & Official Doc Source Cards
```

---

## 🗺 Development Roadmap
- **Phase 1: Project Foundation & Architecture Setup** *(Completed ✅)*
- **Phase 2: Frontend Base Application (Next.js 16 + Tailwind CSS)** *(Completed ✅)*
- **Phase 3: FinOps Dashboard UI & Reusable Components** *(Completed ✅)*
- **Phase 4: Backend Core (FastAPI, Virtualenv, Health Endpoints)** *(Completed ✅)*
- **Phase 5: Connect Next.js Frontend to FastAPI Backend** *(Completed ✅)*
- **Phase 6: Billing CSV Upload & In-Memory Parsing** *(Completed ✅)*
- **Phase 7: Connect Real Billing Data to Dashboard** *(Completed ✅)*
- **Phase 8: Architectural Inspection & Anomaly Design** *(Completed ✅)*
- **Phase 9: PostgreSQL Database Integration & Statistical Anomaly Detection** *(Completed ✅)*
- **Phase 10: Billing Upload History & Dataset Management** *(Completed ✅)*
- **Phase 11: Authentication & User Accounts** *(Completed ✅)*
- **Phase 12: AI-Powered Billing Explanations & FinOps Insights** *(Completed ✅)*
- **Phase 13: RAG Pipeline with pgvector for Cloud Documentation** *(Completed ✅)*
- **Phase 14: Asynchronous Job Processing with Redis & Celery Worker** *(Completed ✅)*
- **Phase 15: Real-Time WebSockets for Background Task Updates** *(Completed ✅)*
- **Phase 16: Docker & Docker Compose Containerization** *(Completed ✅)*
- **Phase 17: GitHub Actions CI/CD Pipeline** *(Completed ✅)*
- **Phase 18: Production Cloud Deployment & Monitoring** *(Next)*

---

## ⚙️ Local Setup Instructions

### Option A: Quickstart with Docker Compose (Recommended)
If you have Docker and Docker Compose installed:
```bash
# 1. Clone repository & copy environment template
cp .env.docker.example .env

# 2. Build and start all 5 services in detached mode
docker compose up -d --build

# 3. View live logs from all containers
docker compose logs -f

# 4. View logs from backend or background worker specifically
docker compose logs -f backend worker

# 5. Stop all services (preserves database data volumes)
docker compose down
```
Services will be accessible at:
- Frontend Dashboard: [http://localhost:3000](http://localhost:3000)
- Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- PostgreSQL Database: `localhost:5432` (`cloudcost_ai`)
- Redis Cache & Broker: `localhost:6379`

---

### Option B: Native Host Development (Without Docker)

### 1. Database & Cache Services Setup (PostgreSQL 16 & Redis 7.2)
Ensure PostgreSQL and Redis are running locally:
```bash
# macOS with Homebrew:
brew services start postgresql@16
brew services start redis
createdb cloudcost_ai
```

### 2. Backend Setup (FastAPI, pgvector & Celery Worker)
```bash
cd backend

# 1. Activate virtual environment
source venv/bin/activate
# On Windows: .\venv\Scripts\activate

# 2. Install dependencies (includes pgvector, openai, sqlalchemy, celery, redis)
pip install -r requirements.txt

# 3. Configure environment variables (.env)
cp .env.example .env

# Optional: To enable live OpenAI embeddings & LLM insights:
# OPENAI_API_KEY="sk-proj-your-openai-api-key"
# REDIS_URL="redis://localhost:6379/0"

# 4. Start backend server with hot-reload (auto-runs pgvector init and doc ingest)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 5. Start Celery background worker in a separate terminal
celery -A app.core.celery_app worker --pool=solo --loglevel=info

# 6. Run full automated integration test suite (34 tests)
PYTHONPATH=. pytest -v tests/test_websockets.py tests/test_background_jobs.py tests/test_rag_pipeline.py tests/test_ai_insights.py tests/test_database_billing.py
```

### 3. Frontend Setup (Next.js)
```bash
cd frontend

# 1. Configure environment variables (.env.local)
cp .env.example .env.local

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📚 Ingested Cloud Documentation Sources (RAG)

CloudCost AI curates authoritative cost-optimization documentation from cloud providers:

| Provider | Document Title | Official Source URL |
|---|---|---|
| **AWS** | AWS Cost Optimization: Amazon EC2 Right-Sizing and Modernization | [AWS Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/cost-optimization-laying-the-foundation/optimizing-ec2.html) |
| **AWS** | Amazon RDS Database Cost Reduction Best Practices | [AWS RDS User Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CostOptimization.html) |
| **AWS** | Amazon S3 Storage Lifecycle and Intelligent-Tiering | [AWS S3 User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html) |
| **GCP** | Google Cloud BigQuery Query and Storage Cost Control | [GCP BigQuery Docs](https://cloud.google.com/bigquery/docs/best-practices-costs) |

Documents are parsed from `backend/app/data/cloud_docs/*.md`, chunked into bounded passages with overlap, and fingerprinted using SHA-256 (`source_url:chunk_index:content`) to prevent duplicate storage.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | System health and PostgreSQL connectivity check |
| `POST` | `/api/auth/register` | No | Register new user account; returns JWT access token |
| `POST` | `/api/auth/login` | No | Authenticate user; returns JWT access token |
| `GET` | `/api/auth/me` | Bearer Token | Retrieve currently logged-in user profile |
| `POST` | `/api/billing/upload` | Bearer Token | Upload and ingest multi-cloud billing CSV into PostgreSQL |
| `GET` | `/api/billing/uploads` | Bearer Token | Retrieve user's dataset upload history |
| `GET` | `/api/billing/uploads/{id}` | Bearer Token | Retrieve full breakdown of a specific dataset batch |
| `DELETE`| `/api/billing/uploads/{id}` | Bearer Token | Delete dataset batch and cascade delete records |
| `GET` | `/api/billing/summary` | Bearer Token | Retrieve latest or specified dataset summary |
| `GET` | `/api/billing/anomalies` | Bearer Token | Retrieve Z-score statistical cost anomalies |
| `POST` | `/api/billing/rag/ingest` | Bearer Token | Ingest/refresh cloud documentation into pgvector |
| `GET` | `/api/billing/rag/search` | Bearer Token | Search cloud documentation via semantic/keyword similarity |
| `POST` | `/api/billing/ai-insights` | Bearer Token | Generate RAG-enhanced LLM FinOps insights with source citations |
| `POST` | `/api/jobs/rag-ingest` | Bearer Token | Enqueue asynchronous RAG documentation ingestion into Redis (HTTP 202) |
| `GET` | `/api/jobs/{id}` | Bearer Token | Poll status (`queued`, `running`, `completed`, `failed`) of a specific background job |
| `GET` | `/api/jobs` | Bearer Token | List all background jobs submitted by the current user |
| `WS` | `/api/ws/jobs/{id}` | JWT Query Token | Bi-directional WebSocket stream for real-time background job updates via Redis Pub/Sub |

---

## 🚀 Continuous Integration (GitHub Actions)

CloudCost AI includes an automated GitHub Actions CI workflow (`.github/workflows/ci.yml`) triggering on pushes and pull requests to `main` and `master`:

| Job Name | Environment | Key Commands & Checks |
|---|---|---|
| **`frontend-ci`** | Node.js 20 on `ubuntu-latest` | `npm ci`, `npm run lint` (ESLint), `npm run build` (Next.js production build) |
| **`backend-ci`** | Python 3.12 + PostgreSQL 16 (`pgvector`) & Redis 7 services | `pip install -r requirements.txt`, `PYTHONPATH=. pytest -v` (34 integration tests) |
| **`docker-validation`** | Docker on `ubuntu-latest` | `docker compose config` syntax validation, `backend/Dockerfile` and `Dockerfile.worker` builds |

### Viewing CI Results on GitHub
1. Navigate to your repository on GitHub.
2. Click the **"Actions"** tab at the top.
3. Select **"CloudCost AI CI"** to view individual run summaries, test logs, and check statuses.
4. Pull Requests will automatically display status check badges before merging.

---

## ☁️ Strictly Free ($0 / ₹0) Cloud Deployment Guide

CloudCost AI is architected with a **Unified Single-Service Monolith** pattern: Next.js is statically exported into compiled assets, and FastAPI serves both the React Dashboard at root `/` and all `/api` + `/api/ws` endpoints from a single port/domain.

This means **you only need ONE single free service** — no Vercel account required, zero CORS errors, and 100% free forever without a credit card!

> [!NOTE]
> Hugging Face recently marked custom Docker SDK spaces as `🔒 Paid`. Therefore, **Render** is our verified, 100% Free deployment platform requiring **zero credit cards** and running native Python + Node.js without Docker paywalls.

| Component | Recommended Free Provider | Plan & Verified Limits | Credit Card Required? | Key Advantages |
|---|---|---|---|---|
| **Full Stack (UI + API + WS)** | [Render](https://render.com) | Free Web Service ($0/mo) • 512 MB RAM, 750 hrs/mo | **NO** (Sign in with GitHub) | Native Python + Node.js runtime, zero Docker locks |
| **Database** | [Supabase](https://supabase.com) or [Neon](https://neon.tech) | Free Tier ($0/mo) • 500 MB PostgreSQL 16 w/ `pgvector` | **NO** (Sign in with GitHub) | Managed `pgvector` for AI semantic search |
| **Redis Broker (Optional)** | [Upstash](https://upstash.com) | Free Serverless Redis ($0/mo) • 10,000 cmds/day | **NO** (Sign in with GitHub) | Serverless / zero idle sleep |

---

### 🚀 Step-by-Step Render Deployment (100% Free & No Credit Card)

#### Step 1: Free Supabase PostgreSQL Database (2 Minutes)
1. Sign up on [Supabase](https://supabase.com) using your GitHub account (No credit card required).
2. Click **New Project**: Name: `cloudcost-ai`, choose a secure database password.
3. In **Project Settings -> Database**, copy the **Transaction Connection String**:
   `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`

#### Step 2: Push Repository to GitHub
In your local project terminal:
```bash
cd "/Users/akshitgupta/Desktop/resume project/cloudcost-ai"
git init
git add .
git commit -m "feat: complete CloudCost AI deployment configuration"
git branch -M main
# Create a repository named 'cloudcost-ai' on GitHub (https://github.com/new), then link and push:
git remote add origin https://github.com/<your-github-username>/cloudcost-ai.git
git push -u origin main
```

#### Step 3: Deploy Free Web Service on Render
1. Sign up on [Render](https://render.com) using your GitHub account (**No credit card needed**).
2. Click **New +** -> **Web Service** -> Connect your `cloudcost-ai` GitHub repository.
3. Configure the following fields:
   - **Name**: `cloudcost-ai`
   - **Region**: Oregon (US West) or Frankfurt
   - **Branch**: `main`
   - **Root Directory**: Leave blank (or `cloudcost-ai` if pushing whole repo root)
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt && mkdir -p static_frontend && cp -r ../frontend/out/* static_frontend/
     ```
   - **Start Command**:
     ```bash
     cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: **Free** ($0 / month)
4. Scroll down to **Environment Variables** and add:
   - `DATABASE_URL`: Your Supabase connection string from Step 1.
   - `JWT_SECRET_KEY`: Any secure random 32+ character string.
   - `CORS_ORIGINS`: `*`
   - `PYTHON_VERSION`: `3.12.0`
   - `NODE_VERSION`: `20.18.0`
   - `REDIS_URL`: `redis://localhost:6379/0` (or your free Upstash Redis URL).
   - *(Optional)* `OPENAI_API_KEY`: Your OpenAI key if testing live LLM insights.
5. Click **Create Web Service**!
   - In ~3 minutes, Render will build your Next.js frontend, install Python dependencies, and launch FastAPI!
   - **Live URL**: `https://cloudcost-ai.onrender.com`
   - Visiting `/` loads the **Next.js FinOps Dashboard**.
   - Visiting `/docs` loads the **Interactive FastAPI Swagger Docs**.
   - Real-time WebSockets connect automatically on `wss://cloudcost-ai.onrender.com/api/ws/...`.

---

### How to Stop or Delete Deployed Resources
- **Hugging Face Spaces**: Space Settings -> Delete this Space.
- **Render**: Web Service -> Settings -> Delete Web Service.
- **Supabase**: Project Settings -> General -> Delete Project.
