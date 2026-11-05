from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Index,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


class BillingBatch(Base):
    """Represents a discrete uploaded billing file/batch."""

    __tablename__ = "billing_batches"

    id = Column(String(36), primary_key=True, index=True)  # UUID v4 string
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    filename = Column(String(255), nullable=False, index=True)
    total_rows = Column(Integer, nullable=False)
    total_cost = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="batches")

    # Cascade delete so removing a batch removes its line-item records
    records = relationship(
        "BillingRecord",
        back_populates="batch",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class BillingRecord(Base):
    """Represents an individual normalized billing line-item row from a cloud provider."""

    __tablename__ = "billing_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(
        String(36),
        ForeignKey("billing_batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    billing_date = Column(Date, nullable=False, index=True)
    service = Column(String(100), nullable=False, index=True)
    resource = Column(String(255), nullable=False)
    cost = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    batch = relationship("BillingBatch", back_populates="records")

    __table_args__ = (
        # Composite index to optimize service & date aggregations (anomalies & trends)
        Index("idx_records_date_service", "billing_date", "service"),
        # Constraint to ensure negative cost values are rejected at DB level
        CheckConstraint("cost >= 0", name="chk_positive_cost"),
    )

