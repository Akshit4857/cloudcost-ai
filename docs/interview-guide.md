# CloudCost AI — Engineering Interview Guide & Technical Deep-Dive

This guide provides technical explanations of the actual codebase, architecture, and engineering trade-offs in **CloudCost AI** to help you discuss the project confidently in software engineering interviews.

---

## 1. High-Level Concept & Motivation

### What problem does CloudCost AI solve?
Cloud bills (AWS, GCP, Azure) are exported as massive, opaque CSV files containing thousands of line items. Engineering teams struggle to identify:
1. Which specific services caused sudden month-over-month cost spikes.
2. Whether a spike is statistically abnormal or routine variance.
3. How to optimize the spend using provider-recommended architectural patterns.

CloudCost AI provides automated CSV ingestion, statistical anomaly detection ($Z$-score algorithm), and a grounded RAG (Retrieval-Augmented Generation) pipeline that links spending facts with official cloud documentation.

### Why did you build this project?
To demonstrate end-to-end full-stack systems engineering:
- Handling real data ingestion and validation safely without crashing.
- Working with relational databases (SQLAlchemy ACID transactions) and vector databases (`pgvector`).
- Decoupling long-running tasks using asynchronous queues (Celery, Redis) and real-time streaming (WebSockets).
- Production-hardening and containerizing an application under real free-tier resource constraints (512MB RAM).

---

## 2. Frontend / Backend Communication Architecture

### How do the frontend and backend talk to each other?
- **Development**: Next.js runs on `localhost:3000` and proxies API calls to FastAPI on `localhost:8000`. CORS middleware allows `http://localhost:3000` with credentials.
- **Production (Unified Monolith)**: Next.js is pre-compiled into a static export (`output: "export"` in `next.config.ts`), creating pure HTML, JS, and CSS files in `frontend/out`. FastAPI mounts this directory at `/` using `StaticFiles(html=True)`.
- **Why this matters**: In production, the frontend and backend live on the exact same host and port (`https://cloudcost-ai.onrender.com`). This completely eliminates cross-origin browser barriers, avoids CORS pre-flight latency, and simplifies WebSocket handshakes.

---

## 3. CSV Upload & Ingestion Pipeline

### What happens step-by-step when a CSV is uploaded?
1. Client sends `POST /api/billing/upload` as `multipart/form-data`.
2. **Streaming Guard**: In `backend/app/services/billing_parser.py`, `file.read(MAX_FILE_SIZE_BYTES + 1)` reads up to 10 MB plus one byte. If the chunk exceeds 10 MB, it immediately throws `HTTP 413 Request Entity Too Large` without buffering the entire file into RAM.
3. **Encoding & Headers**: Decodes with UTF-8 (fallback to UTF-8-sig for Excel exports). Verifies required columns exist: `date`, `service`, `resource`, `cost`, `currency`.
4. **Row-by-Row Validation**:
   - Dates must match `YYYY-MM-DD`.
   - Cost must be numeric and $\ge 0$ (negative costs are rejected).
   - Single currency constraint is enforced across all rows.
   - Field length bounds are checked: `service` ($\le 100$), `resource` ($\le 255$), `currency` ($\le 10$).
5. **Database Transaction**:
   - `save_billing_data()` opens an atomic SQLAlchemy transaction.
   - Deletes any existing `BillingBatch` with the same filename for this user (cascading to old records) to prevent duplicate row accumulation.
   - Inserts new `BillingBatch` and bulk-inserts normalized `BillingRecord` rows.
   - Commits atomically. If any error occurs, it rolls back cleanly.

---

## 4. Database Schema & Data Isolation

### What does the database design look like?
PostgreSQL 16 using SQLAlchemy 2.0 ORM with 5 core tables:
1. `users`: UUID primary key, indexed unique `email`, `hashed_password`, `created_at`.
2. `billing_batches`: UUID primary key, `user_id` foreign key (with `ondelete="CASCADE"`), `filename`, `total_rows`, `total_cost`, `currency`, `start_date`, `end_date`.
3. `billing_records`: Integer auto-increment ID, `batch_id` foreign key, `billing_date`, `service`, `resource`, `cost`, `currency`.
   - **Composite Index**: `Index("idx_records_date_service", "billing_date", "service")` optimizes daily service aggregations for charts and anomaly detection.
   - **Check Constraint**: `chk_positive_cost (cost >= 0)`.
4. `document_chunks`: Stores cloud documentation passages with `embedding Vector(1536)` and a composite HNSW vector index (`vector_cosine_ops`) for pgvector similarity search.
5. `background_jobs`: Tracks task state machine (`queued`, `running`, `completed`, `failed`), `user_id` foreign key, execution results, and errors.

### How is multi-tenant user isolation enforced?
- **Authentication**: JWT bearer token is decoded in `deps.py:get_current_user`.
- **Query Scoping**: Every database query explicitly filters by `user_id == current_user.id`. A user cannot read, update, or delete records belonging to another user.
- **Anti-Enumeration**: If User A requests `GET /api/billing/uploads/{id}` or `GET /api/jobs/{id}` where the ID belongs to User B, the API returns `404 Not Found` (rather than 403 Forbidden). This prevents attackers from guessing whether a specific UUID exists in the database.

---

## 5. Statistical Anomaly Detection Engine

### How does the Z-score anomaly detection work?
Instead of using opaque black-box ML, CloudCost AI uses transparent, deterministic mathematical statistics directly over PostgreSQL records:
1. Queries daily costs grouped by service for the active batch.
2. For services with at least 3 historical days ($n \ge 3$):
   - Computes historical sample mean ($\mu$) and standard deviation ($\sigma$):
     $$\mu = \frac{1}{n} \sum_{i=1}^n c_i, \quad \sigma = \sqrt{\frac{1}{n-1} \sum_{i=1}^n (c_i - \mu)^2}$$
3. For each day, calculates the Z-score:
   $$z = \frac{\text{cost} - \mu}{\sigma}$$
4. An expenditure is flagged as an anomaly if:
   - $z \ge 1.25$ (spending is $> 1.25$ standard deviations above average), AND
   - $(\text{cost} - \mu) \ge \$3.00$ (filters out trivial fractional-cent variances).
5. Categorizes severity:
   - **High**: $z \ge 1.8$
   - **Medium**: $1.25 \le z < 1.8$
6. Generates human-readable explanations explaining the exact baseline, dollar increase, and percentage difference.

---

## 6. RAG Pipeline & Vector Search with pgvector

### How does the RAG pipeline work?
1. **Curated Knowledge Base**: Official cloud cost documentation (AWS EC2, RDS, S3, GCP BigQuery) is stored in `backend/app/data/cloud_docs/`.
2. **Chunking & Deduplication**: Text is split into structured 500-token passages with 50-token overlap. Each chunk computes a SHA-256 fingerprint (`source_url:chunk_index:content`) to prevent duplicate insertions when ingestion runs repeatedly.
3. **pgvector Storage**: Passages and 1536-dimensional embeddings are stored in PostgreSQL with an HNSW (Hierarchical Navigable Small World) index using cosine distance (`vector_cosine_ops`).
4. **Hybrid Search Fallback**:
   - If an OpenAI API key is configured, queries are embedded with `text-embedding-3-small` and compared using pgvector cosine similarity (`<=>`).
   - If no API key is provided, the system executes an automated keyword-matching fallback over document titles and contents, ensuring full offline functionality at zero cost.
5. **LLM Prompt Grounding**: When `POST /api/billing/ai-insights` runs, retrieved document excerpts and database spending facts are injected into the prompt. The LLM is instructed to cite document titles and URLs, and the response is validated against a Pydantic schema in JSON mode.

---

## 7. Asynchronous Jobs & WebSockets

### Why decouple tasks with Celery and Redis?
Document parsing, chunking, and embedding generation can take several seconds. Executing this synchronously in the HTTP request loop would block Uvicorn worker threads, spike latency, and cause client timeouts.
- **Workflow**: Client calls `POST /api/jobs/rag-ingest` $\rightarrow$ returns `HTTP 202 Accepted` immediately with a `job_id` and initial state `queued`.
- **Worker Execution**: Celery worker picks up the task from Redis, transitions state to `running`, executes the task, and commits results to PostgreSQL as `completed` or `failed`.
- **Free-Tier Eager Fallback**: When deployed on hosting without a standalone Redis daemon, `CELERY_TASK_ALWAYS_EAGER=true` executes the task in-process so background jobs work reliably at zero cost.

### How do WebSockets and real-time streaming work?
- Client establishes connection: `WS /api/ws/jobs/{id}?token=<jwt>`.
- The endpoint authenticates the JWT token, verifies job ownership in PostgreSQL, pushes the current state snapshot, and subscribes to Redis channel `job_updates:{job_id}` via `aioredis`.
- When the Celery worker changes state, it publishes an event to Redis Pub/Sub, which the WebSocket forwards to the browser instantly.
- **Client Fallback**: If WebSocket connection drops or Redis is down, `BackgroundJobCard.tsx` automatically switches to a 2-second HTTP polling loop (`GET /api/jobs/{id}`).

---

## 8. Security & Production Hardening

### What specific security measures are implemented?
1. **CORS Credential Guard**: Starlette's `CORSMiddleware` has a critical security quirk: combining `allow_origins=["*"]` with `allow_credentials=True` reflects any incoming origin header back to the browser. CloudCost AI enforces `cors_allow_credentials = False` whenever `*` is present, preventing cross-site credential theft.
2. **Stream-Bounded Memory Reads**: Enforces a strict 10 MB chunk limit during CSV upload to protect against memory exhaustion (OOM) on 512MB RAM containers.
3. **Database Dialect Normalization**: Automatically converts legacy `postgres://` connection strings (standard on Supabase/Render) to `postgresql://` required by SQLAlchemy 2.0.
4. **Password Security**: Bcrypt with salted rounds; passwords must be at least 8 characters.
5. **Safe In-Memory Processing**: Uploaded CSV files are parsed directly in memory with zero temporary files written to disk, preventing arbitrary file overwrite vulnerabilities.

---

## 9. Current Limitations & Future Improvements

| Current Implementation | Planned / Future Improvement |
|---|---|
| In-memory CSV parsing capped at 10 MB | Chunked streaming directly into PostgreSQL staging tables for 500MB+ enterprise files. |
| In-process tables created via lifespan startup | Migration version control using Alembic for seamless schema upgrades. |
| WebSocket token passed via query parameter | Ticket-based authentication (single-use ephemeral tokens) to prevent JWTs appearing in access logs. |
| Single-currency per CSV file | Dynamic multi-currency conversion using an exchange rate API. |
