# CloudCost AI — Live Demo Walkthrough Script (3–5 Minutes)

This script outlines an effective, technical demo plan for portfolio presentations and hiring manager walkthroughs.

---

## 1. Demo Overview & Preparation

* **Live Production URL**: [https://cloudcost-ai.onrender.com](https://cloudcost-ai.onrender.com)
* **Local Alternative**:
  ```bash
  # Terminal 1: Backend
  cd backend && source venv/bin/activate && uvicorn app.main:app --port 8000 --reload
  # Terminal 2: Frontend
  cd frontend && npm run dev
  # Visit: http://localhost:3000
  ```
* **Sample Billing CSV Files**: Located in `docs/`:
  - `docs/cloudcost-production-sample.csv` (26 rows, multi-cloud spend across EC2, RDS, S3, BigQuery, BlobStorage with intentional cost spikes)
  - `docs/sample-billing-spike.csv` (Compact CSV with single EC2 cost spike)
* **Target Duration**: 3 to 5 minutes.

---

## 2. Minute-by-Minute Demo Script

### Minute 0:00 – 0:45: The Problem & Authentication
* **What to Show**:
  - Open `https://cloudcost-ai.onrender.com`.
  - The login / register screen appears with clean tabbed interface.
  - Click **"Demo Fill: Alice"** (fills credentials `alice@cloudcost.ai` / `Alice@Secure2026!`) and click **Sign In**.
* **What to Say**:
  > *"CloudCost AI is a full-stack FinOps platform that helps engineering teams analyze complex multi-cloud bills, detect spending anomalies, and ground optimization advice in official cloud documentation. Notice that the frontend is pre-compiled as a static export and served directly from our FastAPI backend on a single origin, with zero cross-origin latency. Let's sign in using our isolated demo user Alice."*

---

### Minute 0:45 – 1:45: Real Ingestion & Multi-Tenant Dashboard
* **What to Show**:
  - You are on the main dashboard. Notice the **Backend Health Card**: "FastAPI Backend & Database Live", displaying latency (~400–600ms on Render free tier).
  - Drag and drop `docs/cloudcost-production-sample.csv` into the **Billing CSV Upload Card**.
  - Click **Upload & Ingest Billing CSV**.
  - Watch the green success banner appear: Ingested 26 records, $1,644.50 USD across 5 services.
  - The dashboard reactively updates:
    - **KPI Cards**: Total spend, valid rows, service count, date range.
    - **Daily Spend Chart**: Dynamic SVG bars showing day-by-day spending.
    - **Service Breakdown**: Percentage contributions (EC2 45%, BigQuery 22%, S3 15%, etc.).
* **What to Say**:
  > *"When we drop this billing CSV, our FastAPI backend streams and parses the data in-memory with strict schema validation. Notice that unlike demo apps with hardcoded numbers, these charts and KPIs are derived directly from real rows stored in our PostgreSQL database for this specific user. Notice how our deduplication logic atomically replaces any duplicate file with the same name, preventing accidental duplicate row counts."*

---

### Minute 1:45 – 2:45: Statistical Anomaly Detection Engine
* **What to Show**:
  - Scroll down to the **Cost Anomalies & Statistical Insights** card.
  - Notice the three detected cost anomalies:
    1. **EC2** on 2026-11-04: Spending was $185.00 (+270.8% above historical average of $49.90, Z-score: 2.1). Severity: **High**.
    2. **S3** on 2026-11-04: Spending was $68.00 (+270.1% above historical average of $18.37). Severity: **High**.
    3. **BigQuery** on 2026-11-03: Spending was $85.50 (+216.4% above historical average of $27.02). Severity: **High**.
  - Point to the mathematical badges: Z-score, baseline cost, dollar delta.
* **What to Say**:
  > *"Instead of using an opaque black-box ML model, we implemented a transparent Z-score spike detection algorithm running directly over database records. For each cloud service with sufficient history, it calculates the historical mean and standard deviation. Any spend exceeding 1.25 standard deviations and at least a $3 threshold is flagged with exact dollar delta calculations."*

---

### Minute 2:45 – 3:45: Background Worker & Real-Time WebSockets
* **What to Show**:
  - Scroll to the **Background Job Processing & Real-time WebSockets** card.
  - Click **"Enqueue RAG Ingest Job"**.
  - Notice the button changes to "Enqueuing...", then displays a connection badge: **Mode: Polling Fallback** or **Real-time WebSocket**.
  - The job completes, showing the ingested documentation count and chunk metrics.
* **What to Say**:
  > *"Heavy tasks like parsing documentation, chunking text, and computing vector embeddings shouldn't block user HTTP requests. We decoupled this using Celery and Redis. The client receives an immediate HTTP 202 Accepted response with a job UUID, connects via WebSockets with an automatic 2-second HTTP polling fallback, and receives state transitions in real time."*

---

### Minute 3:45 – 4:30: Dataset History, User Isolation & Wrap-Up
* **What to Show**:
  - Scroll to the **Billing Upload Datasets History** card.
  - Show the list of uploaded datasets with creation timestamps and row counts.
  - Mention that switching to another account (e.g. Bob) displays Bob's private datasets with zero leakage.
  - Highlight the open API documentation at `/docs`: click the link to show auto-generated Swagger UI.
* **What to Say**:
  > *"All datasets and jobs enforce strict user-level multi-tenant isolation with anti-enumeration 404 responses. The full architecture is containerized with Docker, verified by 38 automated integration tests in GitHub Actions, and deployed on Render with Supabase PostgreSQL at zero dollar cost."*

---

## 3. What NOT to Demonstrate (Edge Cases to Avoid)

| Feature / Action | Why Avoid During Live Demo | Explanation if Asked |
|---|---|---|
| Clicking **"Generate AI Insights"** without an OpenAI API key | If `OPENAI_API_KEY` is unset on the Render instance, it gracefully returns HTTP 503 with an amber notice. | State: *"The AI Explainer utilizes OpenAI GPT-4o-mini grounded in our pgvector documentation store. In our free demo tier, external paid LLM calls are disabled to keep operating costs strictly at $0, though the full RAG search and keyword fallback are active."* |
| Uploading files larger than 10 MB | The stream boundary immediately rejects files $> 10$ MB with HTTP 413 to prevent memory exhaustion on free 512MB RAM containers. | Use the provided sample CSVs in `docs/`. |
