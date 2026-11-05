from typing import Dict, Optional
from pydantic import BaseModel, Field


class DateRange(BaseModel):
    start: str = Field(..., description="Earliest billing date in YYYY-MM-DD format")
    end: str = Field(..., description="Latest billing date in YYYY-MM-DD format")


class BillingSummaryResponse(BaseModel):
    batch_id: Optional[str] = Field(None, description="Unique batch UUID in PostgreSQL")
    filename: str = Field(..., description="Sanitized name of uploaded CSV file")
    total_rows: int = Field(..., ge=1, description="Number of valid billing records parsed")
    total_cost: float = Field(..., ge=0, description="Sum of costs across all valid records")
    currency: str = Field(..., description="Billing currency (e.g. USD)")
    service_totals: Dict[str, float] = Field(
        ..., description="Aggregated spend grouped by cloud service"
    )
    daily_totals: Dict[str, float] = Field(
        default_factory=dict, description="Aggregated spend grouped by date {YYYY-MM-DD: cost}"
    )
    date_range: Optional[DateRange] = Field(
        None, description="Billing period covered by this upload"
    )
    status: str = Field(default="success", description="Processing status")


class AnomalyItem(BaseModel):
    service: str = Field(..., description="Cloud service name (e.g. EC2)")
    date: str = Field(..., description="Date of the anomaly in YYYY-MM-DD format")
    actual_cost: float = Field(..., description="Observed cost on that date")
    baseline_cost: float = Field(..., description="Expected baseline cost (historical daily average)")
    percentage_difference: float = Field(
        ..., description="Percentage difference compared to baseline"
    )
    std_dev: float = Field(..., description="Historical standard deviation for this service")
    severity: str = Field(default="medium", description="Severity level: high | medium | low")
    explanation: str = Field(
        ..., description="Human-readable explanation of why this was flagged"
    )


class AnomalyResponse(BaseModel):
    anomalies: list[AnomalyItem] = Field(default_factory=list)
    total_anomalies: int = Field(default=0)
    services_analyzed: int = Field(default=0)
    status: str = Field(default="success", description="success | no_data | insufficient_history")
    message: str = Field(default="", description="Status or guidance message")


class UploadHistoryItem(BaseModel):
    id: str = Field(..., description="Unique upload batch UUID")
    filename: str = Field(..., description="Sanitized original CSV filename")
    total_rows: int = Field(..., description="Number of line items in this batch")
    total_cost: float = Field(..., description="Total cost of this batch")
    currency: str = Field(..., description="Billing currency (e.g. USD)")
    start_date: Optional[str] = Field(None, description="Earliest billing date in batch")
    end_date: Optional[str] = Field(None, description="Latest billing date in batch")
    created_at: str = Field(..., description="ISO 8601 upload timestamp")


class DeleteUploadResponse(BaseModel):
    status: str = Field(default="success")
    message: str = Field(..., description="Outcome description")
    deleted_id: str = Field(..., description="The UUID of the deleted batch")


