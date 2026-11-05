from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.ai import AiInsightsRequest, AiInsightsResponse
from app.schemas.billing import (
    AnomalyResponse,
    BillingSummaryResponse,
    DeleteUploadResponse,
    UploadHistoryItem,
)
from app.services.ai_advisor import generate_ai_billing_insights
from app.services.billing_db import (
    delete_billing_batch,
    detect_anomalies_from_db,
    get_billing_uploads_history,
    get_latest_billing_summary,
    save_billing_data,
)
from app.services.billing_parser import parse_and_validate_billing_csv
from app.services.rag_service import ingest_documentation_directory, retrieve_documentation

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.post(
    "/upload",
    response_model=BillingSummaryResponse,
    summary="Upload, parse, and persist cloud billing CSV",
    description=(
        "Accepts a multipart/form-data CSV file, validates required schema, "
        "and persists records to PostgreSQL scoped strictly to the authenticated user."
    ),
)
async def upload_billing_csv(
    file: UploadFile = File(..., description="Cloud billing CSV file to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BillingSummaryResponse:
    """Upload and parse a cloud billing CSV file, persisting records to PostgreSQL for the current user."""
    summary, records = await parse_and_validate_billing_csv(file)
    persisted_summary = save_billing_data(
        db=db, summary=summary, records=records, user_id=current_user.id
    )
    return persisted_summary


@router.get(
    "/uploads",
    response_model=List[UploadHistoryItem],
    summary="Get billing upload history",
    description="Retrieves a list of all billing datasets belonging exclusively to the authenticated user.",
)
def get_upload_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[UploadHistoryItem]:
    """Retrieve all uploaded billing datasets belonging to the logged-in user."""
    return get_billing_uploads_history(db=db, user_id=current_user.id)


@router.get(
    "/uploads/{upload_id}",
    response_model=BillingSummaryResponse,
    summary="Get billing upload details",
    description="Retrieves full breakdown of a specific billing dataset owned by the user.",
)
def get_upload_details(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BillingSummaryResponse:
    """Retrieve specific billing batch details owned by the user."""
    summary = get_latest_billing_summary(
        db=db, user_id=current_user.id, batch_id=upload_id
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload batch '{upload_id}' not found.",
        )
    return summary


@router.delete(
    "/uploads/{upload_id}",
    response_model=DeleteUploadResponse,
    summary="Delete an upload batch",
    description="Deletes a specific upload batch and cascade-deletes all its records from PostgreSQL.",
)
def delete_upload(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeleteUploadResponse:
    """Delete an upload batch owned by the authenticated user."""
    success = delete_billing_batch(db=db, upload_id=upload_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload batch '{upload_id}' not found.",
        )
    return DeleteUploadResponse(
        message=f"Upload batch '{upload_id}' and all associated records deleted successfully.",
        batch_id=upload_id,
    )


@router.get(
    "/summary",
    response_model=Optional[BillingSummaryResponse],
    summary="Get persisted billing summary from PostgreSQL",
    description=(
        "Retrieves spending breakdown metrics directly from PostgreSQL. "
        "Optionally accepts upload_id; defaults to the user's latest upload."
    ),
)
def get_persisted_summary(
    upload_id: Optional[str] = Query(
        None, description="Optional UUID of a specific upload batch"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Optional[BillingSummaryResponse]:
    """Retrieve the billing summary for the specified or newest upload batch owned by the user."""
    summary = get_latest_billing_summary(
        db=db, user_id=current_user.id, batch_id=upload_id
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Upload batch '{upload_id}' not found."
                if upload_id
                else "No billing data found in your account. Please upload a billing CSV file."
            ),
        )
    return summary


@router.get(
    "/anomalies",
    response_model=AnomalyResponse,
    summary="Statistical cost anomaly detection",
    description="Performs rule-based anomaly detection on the authenticated user's specified or latest billing dataset.",
)
def get_billing_anomalies(
    upload_id: Optional[str] = Query(
        None, description="Optional UUID of a specific upload batch to analyze"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnomalyResponse:
    """Analyze the authenticated user's billing records in PostgreSQL and return statistical cost spikes."""
    return detect_anomalies_from_db(
        db=db, user_id=current_user.id, batch_id=upload_id
    )


@router.post(
    "/ai-insights",
    response_model=AiInsightsResponse,
    summary="Generate AI-powered billing insights and recommendations",
    description=(
        "Uses an LLM and RAG documentation pipeline to analyze the authenticated user's database-persisted billing records "
        "and statistical anomalies, producing plain-language, grounded FinOps recommendations with documentation citations."
    ),
)
def get_ai_insights(
    payload: Optional[AiInsightsRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiInsightsResponse:
    """Generate grounded AI FinOps insights for the user's selected or latest dataset."""
    upload_id = payload.upload_id if payload else None
    return generate_ai_billing_insights(
        db=db, user_id=current_user.id, batch_id=upload_id
    )


@router.post(
    "/rag/ingest",
    summary="Ingest cloud documentation into vector store",
    description="Loads official cloud documentation, chunks passages, and stores embeddings in PostgreSQL/pgvector.",
)
def trigger_rag_ingest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger ingestion and vector indexing of official cloud documentation."""
    return ingest_documentation_directory(db)


@router.get(
    "/rag/search",
    summary="Search cloud documentation chunks",
    description="Performs semantic vector similarity search or keyword fallback over stored cloud documentation.",
)
def search_rag_docs(
    query: str = Query(..., description="Query phrase or service name to search"),
    top_k: int = Query(3, ge=1, le=10, description="Maximum chunks to retrieve"),
    provider: Optional[str] = Query(None, description="Optional provider filter (AWS, GCP, etc.)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search official cloud documentation using pgvector similarity search."""
    return retrieve_documentation(db=db, query=query, top_k=top_k, provider=provider)
