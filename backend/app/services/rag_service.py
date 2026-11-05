import glob
import hashlib
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from openai import OpenAI
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.rag import Document, DocumentChunk

logger = logging.getLogger(__name__)

DEFAULT_DOCS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "cloud_docs"
)


def parse_frontmatter(file_content: str) -> Tuple[Dict[str, Any], str]:
    """Extracts YAML-style frontmatter headers from markdown files."""
    frontmatter = {}
    body = file_content

    if file_content.startswith("---"):
        parts = file_content.split("---", 2)
        if len(parts) >= 3:
            raw_meta = parts[1]
            body = parts[2].strip()

            for line in raw_meta.strip().split("\n"):
                if ":" in line:
                    key, val = line.split(":", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    frontmatter[key] = val

    return frontmatter, body


def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 60) -> List[str]:
    """Splits a document text into smaller passages with overlapping boundaries.

    Preserves paragraph and section structures without abrupt sentence breaks.
    """
    clean_text = re.sub(r"\n{3,}", "\n\n", text.strip())
    paragraphs = clean_text.split("\n\n")

    chunks: List[str] = []
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if not current_chunk:
            current_chunk = para
        elif len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk += "\n\n" + para
        else:
            chunks.append(current_chunk)
            # Create overlap from end of current chunk
            overlap_text = (
                current_chunk[-chunk_overlap:].strip()
                if len(current_chunk) > chunk_overlap
                else ""
            )
            current_chunk = f"{overlap_text}\n\n{para}".strip() if overlap_text else para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def compute_chunk_hash(source_url: str, chunk_index: int, content: str) -> str:
    """Generates a unique SHA-256 fingerprint for a document chunk.

    Guarantees strict deduplication on repeated ingestion runs.
    """
    data = f"{source_url}:{chunk_index}:{content.strip()}"
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def generate_embedding(text: str) -> Optional[List[float]]:
    """Generates an embedding vector using OpenAI text-embedding-3-small (1536 dims).

    Returns None if OPENAI_API_KEY is not configured, reporting the limitation gracefully.
    """
    if not settings.is_llm_configured:
        return None

    try:
        client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            timeout=float(settings.LLM_TIMEOUT_SECONDS),
        )
        response = client.embeddings.create(
            input=text.replace("\n", " "),
            model=settings.EMBEDDING_MODEL,
        )
        return response.data[0].embedding
    except Exception as exc:
        logger.error(f"Failed to generate embedding from OpenAI: {exc}")
        return None


def ingest_documentation_directory(
    db: Session,
    docs_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """Ingests official cloud documentation files into PostgreSQL/pgvector.

    - Chunks documents into bounded passages.
    - Generates embeddings if OpenAI API is configured.
    - Prevents duplicate chunks on repeated runs using SHA-256 hash checks.
    """
    target_dir = docs_dir or DEFAULT_DOCS_DIR
    if not os.path.exists(target_dir):
        logger.warning(f"Documentation directory '{target_dir}' does not exist.")
        return {
            "status": "warning",
            "message": f"Documentation directory '{target_dir}' not found.",
            "documents_processed": 0,
            "chunks_created": 0,
            "chunks_skipped": 0,
            "has_embeddings": False,
        }

    file_paths = glob.glob(os.path.join(target_dir, "*.md"))
    total_docs = 0
    total_created = 0
    total_skipped = 0
    embeddings_generated = False

    for path in file_paths:
        with open(path, "r", encoding="utf-8") as f:
            raw_content = f.read()

        meta, body = parse_frontmatter(raw_content)
        title = meta.get("title", Path(path).stem.replace("_", " ").title())
        source_url = meta.get("source_url", f"file://{os.path.basename(path)}")
        provider = meta.get("provider", "Multi-Cloud")
        retrieved_at_str = meta.get("retrieved_at")

        retrieved_at = None
        if retrieved_at_str:
            try:
                retrieved_at = datetime.fromisoformat(retrieved_at_str.replace("Z", "+00:00"))
            except Exception:
                pass

        content_hash = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()

        # 1. Upsert parent Document
        doc = db.query(Document).filter(Document.source_url == source_url).first()
        if not doc:
            doc = Document(
                title=title,
                source_url=source_url,
                provider=provider,
                retrieved_at=retrieved_at,
                content_hash=content_hash,
            )
            db.add(doc)
            db.flush()
        else:
            doc.title = title
            doc.provider = provider
            doc.content_hash = content_hash
            db.flush()

        total_docs += 1

        # 2. Chunk document text
        chunks = chunk_text(body, chunk_size=500, chunk_overlap=60)

        for idx, chunk_str in enumerate(chunks):
            chunk_hash = compute_chunk_hash(source_url, idx, chunk_str)

            existing_chunk = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.chunk_hash == chunk_hash)
                .first()
            )

            if existing_chunk:
                # Deduplication: already ingested
                total_skipped += 1
                continue

            # Generate vector embedding if configured
            emb = generate_embedding(chunk_str)
            if emb:
                embeddings_generated = True

            new_chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                chunk_hash=chunk_hash,
                content=chunk_str,
                token_count=len(chunk_str.split()),
                embedding=emb,
            )
            db.add(new_chunk)
            total_created += 1

    db.commit()

    return {
        "status": "success",
        "documents_processed": total_docs,
        "chunks_created": total_created,
        "chunks_skipped": total_skipped,
        "has_embeddings": embeddings_generated or (settings.is_llm_configured),
        "message": (
            f"Ingestion complete: {total_docs} documents processed, "
            f"{total_created} new chunks created, {total_skipped} duplicate chunks skipped."
        ),
    }


def retrieve_documentation(
    db: Session,
    query: str,
    top_k: int = 3,
    provider: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Performs semantic similarity search over stored cloud documentation chunks using pgvector.

    If OpenAI embeddings are unconfigured, performs a clean keyword search fallback
    so environments without paid API credentials still return authentic source titles and URLs.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    # Method 1: Semantic Vector Search via pgvector
    if settings.is_llm_configured:
        query_embedding = generate_embedding(clean_query)
        if query_embedding:
            try:
                # Cosine distance in pgvector: DocumentChunk.embedding.cosine_distance()
                distance_col = DocumentChunk.embedding.cosine_distance(
                    query_embedding
                ).label("distance")

                stmt = (
                    db.query(DocumentChunk, Document, distance_col)
                    .join(Document, DocumentChunk.document_id == Document.id)
                    .filter(DocumentChunk.embedding.isnot(None))
                )

                if provider:
                    stmt = stmt.filter(Document.provider == provider)

                matches = stmt.order_by(distance_col).limit(top_k).all()

                results = []
                for chunk, parent_doc, dist in matches:
                    sim_score = round(max(0.0, 1.0 - float(dist)), 3)
                    results.append(
                        {
                            "chunk_id": chunk.id,
                            "document_title": parent_doc.title,
                            "source_url": parent_doc.source_url,
                            "provider": parent_doc.provider,
                            "content": chunk.content,
                            "similarity_score": sim_score,
                            "retrieval_method": "pgvector_cosine",
                        }
                    )
                if results:
                    return results
            except Exception as exc:
                logger.error(f"Vector search failed in pgvector: {exc}")

    # Method 2: Keyword Fallback (when embeddings unconfigured or vector search returns empty)
    words = [w.lower() for w in re.findall(r"\w+", clean_query) if len(w) >= 2]
    if not words:
        return []

    keyword_filters = [DocumentChunk.content.ilike(f"%{w}%") for w in words[:4]]
    stmt = (
        db.query(DocumentChunk, Document)
        .join(Document, DocumentChunk.document_id == Document.id)
        .filter(or_(*keyword_filters))
    )

    if provider:
        stmt = stmt.filter(Document.provider == provider)

    keyword_matches = stmt.limit(top_k).all()

    return [
        {
            "chunk_id": chunk.id,
            "document_title": parent_doc.title,
            "source_url": parent_doc.source_url,
            "provider": parent_doc.provider,
            "content": chunk.content,
            "similarity_score": 0.5,
            "retrieval_method": "keyword_fallback",
        }
        for chunk, parent_doc in keyword_matches
    ]

