import logging
from sqlalchemy import text
from app.db.session import engine, Base, SessionLocal
# Import all models to ensure they are registered with Base.metadata
import app.models.user  # noqa: F401
import app.models.billing  # noqa: F401
import app.models.rag  # noqa: F401
import app.models.job  # noqa: F401

logger = logging.getLogger(__name__)


def init_database() -> None:
    """Create PostgreSQL tables defined in SQLAlchemy models if they do not exist,

    apply non-destructive schema migrations for user ownership and pgvector,
    and seed baseline official cloud documentation.
    """
    try:
        logger.info("Initializing database tables and vector extensions...")

        # 1. Enable pgvector extension
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()

        # 2. Create tables
        Base.metadata.create_all(bind=engine)

        # 3. Non-destructive schema migration for adding user_id to billing_batches
        with engine.connect() as conn:
            conn.execute(
                text(
                    "ALTER TABLE billing_batches ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) "
                    "REFERENCES users(id) ON DELETE CASCADE;"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_billing_batches_user_id ON billing_batches (user_id);"
                )
            )
            # Create HNSW index on embeddings for fast approximate nearest neighbor search
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding "
                    "ON document_chunks USING hnsw (embedding vector_cosine_ops);"
                )
            )
            conn.commit()

        # 4. Ingest baseline official cloud documentation if not already loaded
        from app.services.rag_service import ingest_documentation_directory
        db = SessionLocal()
        try:
            ingest_documentation_directory(db)
        finally:
            db.close()

        logger.info("Database tables, vector extensions, and documentation verified successfully.")
    except Exception as exc:
        logger.error(f"Failed to initialize database tables: {exc}")
