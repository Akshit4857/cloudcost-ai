from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    """User account entity for authentication and isolated data ownership."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)  # UUID v4
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # 1 User has many BillingBatches; deleting user cascades to delete their batches
    batches = relationship(
        "BillingBatch",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

