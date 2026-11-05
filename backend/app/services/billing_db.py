import logging
import math
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.billing import BillingBatch, BillingRecord
from app.schemas.billing import (
    AnomalyItem,
    AnomalyResponse,
    BillingSummaryResponse,
    DateRange,
    UploadHistoryItem,
)

logger = logging.getLogger(__name__)


def save_billing_data(
    db: Session,
    summary: BillingSummaryResponse,
    records: List[Dict[str, Any]],
    user_id: str,
) -> BillingSummaryResponse:
    """Persist parsed billing CSV batch and line-item records to PostgreSQL inside an ACID transaction.

    Scoped strictly to the authenticated user.
    Prevents silent duplicate accumulation by replacing previous records with the same filename for this user.
    """
    batch_id = str(uuid.uuid4())

    try:
        # 1. Deduplication / Replacement: Remove previous batch with identical filename belonging to THIS user
        existing_batch = (
            db.query(BillingBatch)
            .filter(
                BillingBatch.filename == summary.filename,
                BillingBatch.user_id == user_id,
            )
            .first()
        )
        if existing_batch:
            logger.info(
                f"Replacing existing batch for user {user_id} and file '{summary.filename}' (old batch_id: {existing_batch.id})"
            )
            db.delete(existing_batch)
            db.flush()  # Cascade removes associated BillingRecord rows

        # 2. Parse start and end dates
        start_date = None
        end_date = None
        if summary.date_range:
            try:
                start_date = datetime.strptime(summary.date_range.start, "%Y-%m-%d").date()
                end_date = datetime.strptime(summary.date_range.end, "%Y-%m-%d").date()
            except Exception:
                pass

        # 3. Create parent batch record associated with authenticated user
        batch = BillingBatch(
            id=batch_id,
            user_id=user_id,
            filename=summary.filename,
            total_rows=summary.total_rows,
            total_cost=summary.total_cost,
            currency=summary.currency,
            start_date=start_date,
            end_date=end_date,
        )
        db.add(batch)

        # 4. Create line-item records
        db_records = [
            BillingRecord(
                batch_id=batch_id,
                billing_date=r["billing_date"],
                service=r["service"],
                resource=r["resource"],
                cost=r["cost"],
                currency=r["currency"],
            )
            for r in records
        ]
        db.add_all(db_records)

        # 5. Commit transaction atomically
        db.commit()
        logger.info(
            f"Successfully persisted batch {batch_id} for user {user_id} with {len(db_records)} records to PostgreSQL."
        )

        # Update summary with assigned batch_id
        summary.batch_id = batch_id
        return summary

    except SQLAlchemyError as exc:
        db.rollback()
        logger.error(f"Database error during billing upload persistence: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed: {str(exc)}",
        )
    except Exception as exc:
        db.rollback()
        logger.error(f"Unexpected error during persistence: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist billing data: {str(exc)}",
        )


def get_billing_uploads_history(
    db: Session, user_id: str
) -> List[UploadHistoryItem]:
    """Retrieve history of uploaded billing batches belonging exclusively to the authenticated user."""
    batches = (
        db.query(BillingBatch)
        .filter(BillingBatch.user_id == user_id)
        .order_by(BillingBatch.created_at.desc())
        .all()
    )
    return [
        UploadHistoryItem(
            id=b.id,
            filename=b.filename,
            total_rows=b.total_rows,
            total_cost=round(b.total_cost, 2),
            currency=b.currency,
            start_date=b.start_date.strftime("%Y-%m-%d") if b.start_date else None,
            end_date=b.end_date.strftime("%Y-%m-%d") if b.end_date else None,
            created_at=b.created_at.isoformat() if b.created_at else "",
        )
        for b in batches
    ]


def get_latest_billing_summary(
    db: Session, user_id: str, batch_id: Optional[str] = None
) -> Optional[BillingSummaryResponse]:
    """Retrieve a billing batch summary from PostgreSQL, strictly scoped to the authenticated user.

    If batch_id is specified, verifies it belongs to user_id; otherwise returns the user's newest batch.
    """
    try:
        if batch_id:
            batch = (
                db.query(BillingBatch)
                .filter(BillingBatch.id == batch_id, BillingBatch.user_id == user_id)
                .first()
            )
        else:
            batch = (
                db.query(BillingBatch)
                .filter(BillingBatch.user_id == user_id)
                .order_by(BillingBatch.created_at.desc())
                .first()
            )

        if not batch:
            return None

        # Aggregate service totals for this specific batch
        service_query = (
            db.query(BillingRecord.service, func.sum(BillingRecord.cost))
            .filter(BillingRecord.batch_id == batch.id)
            .group_by(BillingRecord.service)
            .order_by(func.sum(BillingRecord.cost).desc())
            .all()
        )
        service_totals = {svc: round(float(total), 2) for svc, total in service_query}

        # Aggregate daily totals for this specific batch
        daily_query = (
            db.query(BillingRecord.billing_date, func.sum(BillingRecord.cost))
            .filter(BillingRecord.batch_id == batch.id)
            .group_by(BillingRecord.billing_date)
            .order_by(BillingRecord.billing_date)
            .all()
        )
        daily_totals = {
            d.strftime("%Y-%m-%d"): round(float(total), 2) for d, total in daily_query
        }

        date_range = None
        if batch.start_date and batch.end_date:
            date_range = DateRange(
                start=batch.start_date.strftime("%Y-%m-%d"),
                end=batch.end_date.strftime("%Y-%m-%d"),
            )

        return BillingSummaryResponse(
            batch_id=batch.id,
            filename=batch.filename,
            total_rows=batch.total_rows,
            total_cost=round(batch.total_cost, 2),
            currency=batch.currency,
            service_totals=service_totals,
            daily_totals=daily_totals,
            date_range=date_range,
            status="success",
        )
    except Exception as exc:
        logger.error(f"Error fetching summary from database for user {user_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve persisted billing summary.",
        )


def delete_billing_batch(db: Session, upload_id: str, user_id: str) -> bool:
    """Delete a specific billing upload batch belonging exclusively to the authenticated user.

    Cascades removal of all its line-item records atomically.
    """
    try:
        batch = (
            db.query(BillingBatch)
            .filter(BillingBatch.id == upload_id, BillingBatch.user_id == user_id)
            .first()
        )
        if not batch:
            return False

        db.delete(batch)
        db.commit()
        logger.info(
            f"Successfully deleted billing batch {upload_id} for user {user_id}."
        )
        return True
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error(f"Database error deleting batch {upload_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while deleting upload: {str(exc)}",
        )


def detect_anomalies_from_db(
    db: Session, user_id: str, batch_id: Optional[str] = None
) -> AnomalyResponse:
    """Run statistical cost anomaly detection on the authenticated user's specified or latest dataset."""
    try:
        if batch_id:
            batch = (
                db.query(BillingBatch)
                .filter(BillingBatch.id == batch_id, BillingBatch.user_id == user_id)
                .first()
            )
        else:
            batch = (
                db.query(BillingBatch)
                .filter(BillingBatch.user_id == user_id)
                .order_by(BillingBatch.created_at.desc())
                .first()
            )

        if not batch:
            return AnomalyResponse(
                anomalies=[],
                total_anomalies=0,
                services_analyzed=0,
                status="no_data",
                message="No billing records found in your account. Please upload a billing CSV file.",
            )

        # Query daily cost per service for this batch
        rows = (
            db.query(
                BillingRecord.service,
                BillingRecord.billing_date,
                func.sum(BillingRecord.cost).label("daily_cost"),
            )
            .filter(BillingRecord.batch_id == batch.id)
            .group_by(BillingRecord.service, BillingRecord.billing_date)
            .order_by(BillingRecord.service, BillingRecord.billing_date)
            .all()
        )

        if not rows:
            return AnomalyResponse(
                anomalies=[],
                total_anomalies=0,
                services_analyzed=0,
                status="no_data",
                message=f"No line items found for batch {batch.id}.",
            )

        # Group by service: {service: [(date_str, cost)]}
        service_series: Dict[str, List[tuple]] = {}
        for svc, b_date, d_cost in rows:
            date_str = b_date.strftime("%Y-%m-%d")
            service_series.setdefault(svc, []).append((date_str, float(d_cost)))

        anomalies: List[AnomalyItem] = []
        insufficient_history_services: List[str] = []

        for service, series in service_series.items():
            costs = [cost for _, cost in series]
            n = len(costs)

            if n < 3:
                insufficient_history_services.append(service)
                continue

            mean = sum(costs) / n
            variance = sum((c - mean) ** 2 for c in costs) / (n - 1)
            std_dev = math.sqrt(variance)

            if std_dev > 0:
                for date_str, actual_cost in series:
                    diff = actual_cost - mean
                    z_score = diff / std_dev
                    if z_score >= 1.25 and diff >= 3.0:
                        pct_diff = (diff / mean) * 100 if mean > 0 else 0.0
                        severity = "high" if z_score >= 1.8 else "medium"

                        explanation = (
                            f"On {date_str}, spending for {service} was ${actual_cost:.2f}, "
                            f"which is {pct_diff:+.1f}% above the historical daily baseline of "
                            f"${mean:.2f} (standard deviation: ${std_dev:.2f})."
                        )

                        anomalies.append(
                            AnomalyItem(
                                service=service,
                                date=date_str,
                                actual_cost=round(actual_cost, 2),
                                baseline_cost=round(mean, 2),
                                percentage_difference=round(pct_diff, 1),
                                std_dev=round(std_dev, 2),
                                severity=severity,
                                explanation=explanation,
                            )
                        )

        status_label = "success"
        message = f"Analyzed {len(service_series)} cloud services in '{batch.filename}' across {batch.total_rows} records."
        if insufficient_history_services and not anomalies:
            message += f" Note: {len(insufficient_history_services)} service(s) had fewer than 3 days of historical data."

        return AnomalyResponse(
            anomalies=anomalies,
            total_anomalies=len(anomalies),
            services_analyzed=len(service_series),
            status=status_label,
            message=message,
        )

    except Exception as exc:
        logger.error(f"Error computing anomalies for user {user_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute cost anomalies: {str(exc)}",
        )
