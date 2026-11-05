# ==============================================================================
# CloudCost AI - Hugging Face Spaces Unified Dockerfile (100% Free Plan)
# Multi-stage build: compiles Next.js frontend, bundles FastAPI backend,
# and serves unified full-stack application on port 8000 with 16GB free RAM.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Next.js Static Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Python Backend Runtime
# ------------------------------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install curl for diagnostics and libpq runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces strictly requires a non-root user with UID 1000
RUN useradd -m -u 1000 user
WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ /app

# Copy compiled Next.js static assets from Stage 1 into backend static_frontend
COPY --from=frontend-builder /app/out /app/static_frontend

# Set proper ownership for Hugging Face non-root user
RUN chown -R user:user /app
USER user

EXPOSE 8000

# Launch FastAPI server with Uvicorn on port 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

