from typing import List, Optional
from pydantic import BaseModel, Field


class AiInsightsRequest(BaseModel):
    """Request payload to trigger LLM-powered billing analysis."""
    upload_id: Optional[str] = Field(
        default=None,
        description="ID of the billing batch to analyze. If omitted, uses the user's latest upload.",
    )


class CostDriverItem(BaseModel):
    service: str
    amount: float
    percentage_of_total: float
    observation: str


class AnomalyExplanationItem(BaseModel):
    service: str
    date: str
    actual_cost: float
    baseline_cost: float
    severity: str
    explanation: str


class OptimizationRecommendation(BaseModel):
    title: str
    service: str
    impact: str  # High | Medium | Low
    recommendation: str
    potential_action: str
    grounded_evidence: str
    source_title: Optional[str] = None
    source_url: Optional[str] = None


class DocSourceReference(BaseModel):
    title: str
    source_url: str
    provider: str
    relevance_summary: str


class AiInsightsResponse(BaseModel):
    """Structured response containing grounded LLM insights, FinOps recommendations, and RAG sources."""
    upload_id: str
    filename: str
    total_cost: float
    currency: str
    date_range: Optional[str] = None
    summary: str
    biggest_cost_drivers: List[CostDriverItem] = Field(default_factory=list)
    anomaly_explanations: List[AnomalyExplanationItem] = Field(default_factory=list)
    recommendations: List[OptimizationRecommendation] = Field(default_factory=list)
    supporting_evidence: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    documentation_sources: List[DocSourceReference] = Field(default_factory=list)
    rag_status: str = "active"
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    disclaimer: str = (
        "AI-generated analysis based strictly on uploaded billing CSV numbers and official cloud documentation. "
        "CloudCost AI does not connect to live cloud provider accounts or configurations."
    )
