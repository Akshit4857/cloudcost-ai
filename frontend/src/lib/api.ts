import {
  BackendHealthResponse,
  BackendConnectionResult,
  BillingSummaryResponse,
  BillingUploadResult,
  AnomalyResponse,
  AnomalyFetchResult,
  UploadHistoryItem,
  UploadHistoryFetchResult,
  DeleteUploadResult,
  User,
  UserLoginPayload,
  UserRegisterPayload,
  AuthTokenResponse,
  AuthResult,
  UserResult,
  AiInsightsResponse,
  AiInsightsResult,
  JobCreateResponse,
  JobStatusResponse,
  JobCreateResult,
  JobStatusResult,
} from "../types/api";

/**
 * Base URL for the FastAPI backend service.
 * Defaults to http://localhost:8000 if NEXT_PUBLIC_API_URL is unset.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")
    : typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000";

/**
 * Converts HTTP(S) API base URL to standard WS(S) WebSocket URL.
 * Automatically resolves to current browser host when deployed on same origin.
 */
export function getWebSocketUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE_URL && API_BASE_URL.startsWith("http")) {
    const base = API_BASE_URL.replace(/^http/, "ws");
    return `${base}${cleanPath}`;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${cleanPath}`;
  }
  return `ws://localhost:8000${cleanPath}`;
}

const AUTH_TOKEN_KEY = "cloudcost_auth_token";

/**
 * Retrieves the stored JWT authentication token from localStorage.
 * Safe for Next.js SSR / hydration checks.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Persists the JWT authentication token into localStorage.
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Removes the stored JWT authentication token upon logout or session invalidation.
 */
export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Builds HTTP headers including the Bearer Authorization header if a token is present.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Checks connectivity to the FastAPI backend GET /api/health endpoint.
 */
export async function checkBackendHealth(): Promise<BackendConnectionResult> {
  const startTime = performance.now();
  const endpoint = `${API_BASE_URL}/api/health`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        state: "unavailable",
        data: null,
        error: `Backend returned HTTP ${response.status}: ${response.statusText}`,
        latencyMs,
      };
    }

    let data: BackendHealthResponse;
    try {
      data = (await response.json()) as BackendHealthResponse;
    } catch {
      return {
        state: "unavailable",
        data: null,
        error: "Failed to parse JSON response from backend",
        latencyMs,
      };
    }

    if (!data || data.status !== "healthy") {
      return {
        state: "unavailable",
        data,
        error: `Unexpected backend health status: ${data?.status ?? "unknown"}`,
        latencyMs,
      };
    }

    return {
      state: "connected",
      data,
      error: null,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const message =
      err instanceof Error
        ? err.message
        : "Failed to connect to backend server";

    return {
      state: "unavailable",
      data: null,
      error: message,
      latencyMs,
    };
  }
}

/**
 * Register a new user account via POST /api/auth/register.
 * On success, automatically persists the returned token to localStorage.
 */
export async function registerUser(payload: UserRegisterPayload): Promise<AuthResult> {
  const endpoint = `${API_BASE_URL}/api/auth/register`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: Registration failed`;
      try {
        const errorJson = await response.json();
        if (errorJson?.detail) {
          errorMessage =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Use default
      }
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as AuthTokenResponse;
    if (data.access_token) {
      setAuthToken(data.access_token);
    }

    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: unknown) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Network error during registration",
    };
  }
}

/**
 * Authenticate an existing user via POST /api/auth/login.
 * On success, automatically persists the returned token to localStorage.
 */
export async function loginUser(payload: UserLoginPayload): Promise<AuthResult> {
  const endpoint = `${API_BASE_URL}/api/auth/login`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: Login failed`;
      try {
        const errorJson = await response.json();
        if (errorJson?.detail) {
          errorMessage =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Use default
      }
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as AuthTokenResponse;
    if (data.access_token) {
      setAuthToken(data.access_token);
    }

    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: unknown) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Network error during login",
    };
  }
}

/**
 * Fetch profile of currently authenticated user via GET /api/auth/me.
 * Validates active Bearer JWT token.
 */
export async function fetchCurrentUser(): Promise<UserResult> {
  const token = getAuthToken();
  if (!token) {
    return {
      success: false,
      data: null,
      error: "No active session",
    };
  }

  const endpoint = `${API_BASE_URL}/api/auth/me`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired. Please log in again.",
        };
      }
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}: Failed to authenticate user`,
      };
    }

    const data = (await response.json()) as User;
    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: unknown) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Network error fetching user profile",
    };
  }
}

/**
 * Uploads a cloud billing CSV file to FastAPI POST /api/billing/upload
 * Uses multipart/form-data with user auth header.
 */
export async function uploadBillingCSV(file: File): Promise<BillingUploadResult> {
  const endpoint = `${API_BASE_URL}/api/billing/upload`;

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired or unauthorized. Please log in again.",
        };
      }

      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.detail) {
          errorMessage =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Use default HTTP status message
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as BillingSummaryResponse;
    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error during file upload";

    return {
      success: false,
      data: null,
      error: message,
    };
  }
}

/**
 * Fetches the persisted billing summary for current user from PostgreSQL via GET /api/billing/summary
 * Optionally filter by uploadId (defaults to latest upload)
 */
export async function fetchPersistedBillingSummary(
  uploadId?: string
): Promise<BillingUploadResult> {
  const url = new URL(`${API_BASE_URL}/api/billing/summary`);
  if (uploadId) {
    url.searchParams.set("upload_id", uploadId);
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired or unauthorized. Please log in again.",
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          data: null,
          error: "No billing data stored yet in database.",
        };
      }
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}: Failed to fetch billing summary from database`,
      };
    }

    const data = (await response.json()) as BillingSummaryResponse;
    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error fetching billing summary";
    return {
      success: false,
      data: null,
      error: message,
    };
  }
}

/**
 * Fetches statistical cost anomalies computed from PostgreSQL records for current user via GET /api/billing/anomalies
 * Optionally scoped to a specific uploadId
 */
export async function fetchBillingAnomalies(
  uploadId?: string
): Promise<AnomalyFetchResult> {
  const url = new URL(`${API_BASE_URL}/api/billing/anomalies`);
  if (uploadId) {
    url.searchParams.set("upload_id", uploadId);
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired or unauthorized. Please log in again.",
        };
      }
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}: Failed to fetch anomalies from backend`,
      };
    }

    const data = (await response.json()) as AnomalyResponse;
    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error fetching cost anomalies";
    return {
      success: false,
      data: null,
      error: message,
    };
  }
}

/**
 * Fetches upload history list for current user from PostgreSQL via GET /api/billing/uploads
 */
export async function fetchUploadHistory(): Promise<UploadHistoryFetchResult> {
  const endpoint = `${API_BASE_URL}/api/billing/uploads`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired or unauthorized. Please log in again.",
        };
      }
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}: Failed to fetch upload history`,
      };
    }

    const data = (await response.json()) as UploadHistoryItem[];
    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error fetching upload history";
    return {
      success: false,
      data: null,
      error: message,
    };
  }
}

/**
 * Fetches details for a specific upload batch via GET /api/billing/uploads/{uploadId}
 */
export async function fetchUploadDetails(
  uploadId: string
): Promise<BillingUploadResult> {
  const endpoint = `${API_BASE_URL}/api/billing/uploads/${uploadId}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired or unauthorized. Please log in again.",
        };
      }
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}: Upload batch not found or access denied`,
      };
    }

    const data = (await response.json()) as BillingSummaryResponse;
    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error fetching upload details";
    return {
      success: false,
      data: null,
      error: message,
    };
  }
}

/**
 * Deletes an upload batch and all its records via DELETE /api/billing/uploads/{uploadId}
 */
export async function deleteUploadBatch(
  uploadId: string
): Promise<DeleteUploadResult> {
  const endpoint = `${API_BASE_URL}/api/billing/uploads/${uploadId}`;

  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          message: null,
          error: "Session expired or unauthorized. Please log in again.",
        };
      }
      return {
        success: false,
        message: null,
        error: `HTTP ${response.status}: Failed to delete upload batch`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || "Upload batch deleted successfully",
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error deleting upload batch";
    return {
      success: false,
      message: null,
      error: message,
    };
  }
}

/**
 * Generates grounded, LLM-powered billing insights and optimization recommendations
 * via POST /api/billing/ai-insights.
 *
 * @param uploadId Optional ID of specific dataset; defaults to latest upload.
 */
export async function fetchAiBillingInsights(
  uploadId?: string
): Promise<AiInsightsResult> {
  const endpoint = `${API_BASE_URL}/api/billing/ai-insights`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(uploadId ? { upload_id: uploadId } : {}),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired or unauthorized. Please log in again.",
          statusCode: 401,
        };
      }

      let errorMessage = `HTTP ${response.status}: Failed to generate AI insights`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.detail) {
          errorMessage =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Use default
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
        statusCode: response.status,
      };
    }

    const data = (await response.json()) as AiInsightsResponse;
    return {
      success: true,
      data,
      error: null,
      statusCode: 200,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error generating AI insights";
    return {
      success: false,
      data: null,
      error: message,
    };
  }
}

/**
 * Enqueues an asynchronous background job to re-index cloud documentation for RAG.
 * POST /api/jobs/rag-ingest
 * Returns HTTP 202 Accepted with the queued job metadata.
 */
export async function enqueueRagIngestJob(): Promise<JobCreateResult> {
  const endpoint = `${API_BASE_URL}/api/jobs/rag-ingest`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired or unauthorized. Please log in again.",
          statusCode: 401,
        };
      }

      let errorMessage = `HTTP ${response.status}: Failed to enqueue background job`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.detail) {
          errorMessage =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fallback to default
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
        statusCode: response.status,
      };
    }

    const data = (await response.json()) as JobCreateResponse;
    return {
      success: true,
      data,
      error: null,
      statusCode: response.status,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error enqueuing background job";
    return {
      success: false,
      data: null,
      error: message,
    };
  }
}

/**
 * Polls the current status of a background job.
 * GET /api/jobs/{job_id}
 * Returns HTTP 200 OK with job state ('queued' | 'running' | 'completed' | 'failed')
 */
export async function fetchJobStatus(jobId: string): Promise<JobStatusResult> {
  const endpoint = `${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        return {
          success: false,
          data: null,
          error: "Session expired or unauthorized. Please log in again.",
          statusCode: 401,
        };
      }

      let errorMessage = `HTTP ${response.status}: Failed to fetch job status`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.detail) {
          errorMessage =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fallback to default
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
        statusCode: response.status,
      };
    }

    const data = (await response.json()) as JobStatusResponse;
    return {
      success: true,
      data,
      error: null,
      statusCode: 200,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Network error fetching job status";
    return {
      success: false,
      data: null,
      error: message,
    };
  }
}


