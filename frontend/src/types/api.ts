/**
 * Typed response from FastAPI backend GET /api/health
 */
export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  database?: string;
}

/**
 * Frontend connection status states
 */
export type ConnectionState = "checking" | "connected" | "unavailable";

/**
 * Complete result returned by checkBackendHealth()
 */
export interface BackendConnectionResult {
  state: ConnectionState;
  data: BackendHealthResponse | null;
  error: string | null;
  latencyMs?: number;
}

/**
 * Date range in billing summary
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Parsed summary returned by POST /api/billing/upload
 */
export interface BillingSummaryResponse {
  batch_id?: string;
  filename: string;
  total_rows: number;
  total_cost: number;
  currency: string;
  service_totals: Record<string, number>;
  daily_totals: Record<string, number>;
  date_range: DateRange | null;
  status: string;
}

/**
 * Frontend result for upload operation
 */
export interface BillingUploadResult {
  success: boolean;
  data: BillingSummaryResponse | null;
  error: string | null;
}

/**
 * Single statistical cost anomaly detected from PostgreSQL records
 */
export interface AnomalyItem {
  service: string;
  date: string;
  actual_cost: number;
  baseline_cost: number;
  percentage_difference: number;
  std_dev: number;
  severity: "high" | "medium" | "low";
  explanation: string;
}

/**
 * Anomaly response payload returned by GET /api/billing/anomalies
 */
export interface AnomalyResponse {
  anomalies: AnomalyItem[];
  total_anomalies: number;
  services_analyzed: number;
  status: "success" | "no_data" | "insufficient_history";
  message: string;
}

/**
 * Frontend result for fetching anomalies
 */
export interface AnomalyFetchResult {
  success: boolean;
  data: AnomalyResponse | null;
  error: string | null;
}

/**
 * Upload history item returned by GET /api/billing/uploads
 */
export interface UploadHistoryItem {
  id: string;
  filename: string;
  total_rows: number;
  total_cost: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

/**
 * Result for fetching upload history
 */
export interface UploadHistoryFetchResult {
  success: boolean;
  data: UploadHistoryItem[] | null;
  error: string | null;
}

/**
 * Result for deleting an upload batch
 */
export interface DeleteUploadResult {
  success: boolean;
  message: string | null;
  error: string | null;
}

/**
 * Logged-in user profile
 */
export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  created_at: string;
}

/**
 * Payload for logging in
 */
export interface UserLoginPayload {
  email: string;
  password: string;
}

/**
 * Payload for registering a new user account
 */
export interface UserRegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

/**
 * Backend response containing JWT access token
 */
export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/**
 * Frontend result for auth actions (login / register)
 */
export interface AuthResult {
  success: boolean;
  data: AuthTokenResponse | null;
  error: string | null;
}

/**
 * Frontend result for fetching current user profile
 */
export interface UserResult {
  success: boolean;
  data: User | null;
  error: string | null;
}

/**
 * Single cost driver identified by LLM
 */
export interface CostDriverItem {
  service: string;
  amount: number;
  percentage_of_total: number;
  observation: string;
}

/**
 * Anomaly explanation item from LLM
 */
export interface AnomalyExplanationItem {
  service: string;
  date: string;
  actual_cost: number;
  baseline_cost: number;
  severity: "high" | "medium" | "low" | string;
  explanation: string;
}

/**
 * Reference to official cloud provider documentation retrieved via RAG
 */
export interface DocSourceReference {
  title: string;
  source_url: string;
  provider: string;
  relevance_summary: string;
}

/**
 * Practical cost optimization suggestion from LLM
 */
export interface OptimizationRecommendation {
  title: string;
  service: string;
  impact: "High" | "Medium" | "Low" | string;
  recommendation: string;
  potential_action: string;
  grounded_evidence: string;
  source_title?: string | null;
  source_url?: string | null;
}

/**
 * Complete AI Insights payload returned by POST /api/billing/ai-insights
 */
export interface AiInsightsResponse {
  upload_id: string;
  filename: string;
  total_cost: number;
  currency: string;
  date_range?: string | null;
  summary: string;
  biggest_cost_drivers: CostDriverItem[];
  anomaly_explanations: AnomalyExplanationItem[];
  recommendations: OptimizationRecommendation[];
  supporting_evidence: string[];
  limitations: string[];
  documentation_sources: DocSourceReference[];
  rag_status: string;
  provider: string;
  model: string;
  disclaimer: string;
}

/**
 * Frontend result for AI Insights request
 */
export interface AiInsightsResult {
  success: boolean;
  data: AiInsightsResponse | null;
  error: string | null;
  statusCode?: number;
}

/**
 * Result data payload inside a completed BackgroundJob
 */
export interface BackgroundJobResult {
  status: string;
  documents_processed: number;
  chunks_created: number;
  chunks_skipped: number;
  has_embeddings: boolean;
  message: string;
}

/**
 * Response when enqueuing a background job via POST /api/jobs/...
 */
export interface JobCreateResponse {
  job_id: string;
  task_name: string;
  status: string;
  created_at: string;
  message: string;
}

/**
 * Response when polling background job status via GET /api/jobs/{id}
 */
export interface JobStatusResponse {
  job_id: string;
  task_name: string;
  status: "queued" | "running" | "completed" | "failed" | string;
  result: BackgroundJobResult | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Frontend result for enqueuing a job
 */
export interface JobCreateResult {
  success: boolean;
  data: JobCreateResponse | null;
  error: string | null;
  statusCode?: number;
}

/**
 * Frontend result for polling job status
 */
export interface JobStatusResult {
  success: boolean;
  data: JobStatusResponse | null;
  error: string | null;
  statusCode?: number;
}



