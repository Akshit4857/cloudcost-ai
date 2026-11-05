"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Zap,
  Radio,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Loader2,
  Cpu,
} from "lucide-react";
import { enqueueRagIngestJob, fetchJobStatus, getAuthToken, getWebSocketUrl } from "../../lib/api";
import { JobStatusResponse } from "../../types/api";

type ConnectionMode = "idle" | "connecting" | "websocket" | "polling" | "closed";

export default function BackgroundJobCard() {
  const [activeJob, setActiveJob] = useState<JobStatusResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isUsingPolling, setIsUsingPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentJobId = activeJob?.job_id;
  const currentStatus = activeJob?.status;

  const connectionMode: ConnectionMode = !currentJobId
    ? "idle"
    : currentStatus === "completed" || currentStatus === "failed"
    ? "closed"
    : isUsingPolling
    ? "polling"
    : isWsConnected
    ? "websocket"
    : "connecting";

  // Cleanup polling timer helper
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Polling fallback mechanism
  const startPollingFallback = useCallback((jobId: string) => {
    stopPolling();
    queueMicrotask(() => {
      setIsUsingPolling(true);
    });

    pollIntervalRef.current = setInterval(async () => {
      const res = await fetchJobStatus(jobId);
      if (res.success && res.data) {
        setActiveJob(res.data);
        setPollCount((prev) => prev + 1);

        if (res.data.status === "completed" || res.data.status === "failed") {
          stopPolling();
        }
      } else {
        if (res.statusCode === 401 || res.statusCode === 404) {
          setError(res.error || "Failed to poll job status");
          stopPolling();
        }
      }
    }, 2000);
  }, [stopPolling]);

  // Connect to live WebSocket stream
  const connectWebSocket = useCallback((jobId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = getAuthToken();
    const wsUrl = getWebSocketUrl(`/api/ws/jobs/${jobId}?token=${encodeURIComponent(token || "")}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const wsTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          startPollingFallback(jobId);
        }
      }, 3500);

      ws.onopen = () => {
        clearTimeout(wsTimeout);
        setIsWsConnected(true);
        setIsUsingPolling(false);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setActiveJob(payload);

          if (payload.status === "completed" || payload.status === "failed") {
            ws.close();
          }
        } catch {
          // ignore malformed frame
        }
      };

      ws.onerror = () => {
        clearTimeout(wsTimeout);
        setIsWsConnected(false);
        startPollingFallback(jobId);
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        if (activeJob && activeJob.status !== "completed" && activeJob.status !== "failed") {
          startPollingFallback(jobId);
        }
      };
    } catch {
      startPollingFallback(jobId);
    }
  }, [activeJob, startPollingFallback]);

  // Enqueue job handler
  const handleStartIngestJob = async () => {
    setIsSubmitting(true);
    setError(null);
    setPollCount(0);
    setIsWsConnected(false);
    setIsUsingPolling(false);

    const res = await enqueueRagIngestJob();
    setIsSubmitting(false);

    if (res.success && res.data) {
      setActiveJob({
        job_id: res.data.job_id,
        task_name: res.data.task_name,
        status: res.data.status,
        result: null,
        error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      connectWebSocket(res.data.job_id);
    } else {
      setError(res.error || "Failed to enqueue background job");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-sm shadow-2xs">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Background Job Processing & Real-time WebSockets
              </h2>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                Redis Pub/Sub
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Decoupled Celery workers with live event push over WebSockets and polling fallback
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartIngestJob}
          disabled={isSubmitting || (activeJob !== null && activeJob.status === "running")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs transition-all ${
            isSubmitting || (activeJob !== null && activeJob.status === "running")
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 active:scale-98"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Enqueuing...</span>
            </>
          ) : (
            <>
              <Cpu className="w-3.5 h-3.5" />
              <span>Enqueue RAG Ingest Job</span>
            </>
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-semibold">{error}</p>
          </div>
          {error.toLowerCase().includes("redis") && (
            <div className="ml-6 text-[11px] text-rose-700 bg-white/70 p-2.5 rounded-lg border border-rose-100 leading-relaxed">
              💡 <strong>Render Free Hosting Notice:</strong> Standalone Redis instances are not included on Render&apos;s free plan. To enable in-process background execution, set <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-semibold">CELERY_TASK_ALWAYS_EAGER=true</code> in your Render Dashboard Environment Variables, or provide a free Upstash Redis URL in <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-semibold">REDIS_URL</code>.
            </div>
          )}
        </div>
      )}

      {/* Live connection mode badge */}
      {currentJobId && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Mode:</span>
            {connectionMode === "websocket" && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold text-[11px]">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span>Real-time WebSocket</span>
              </span>
            )}
            {connectionMode === "polling" && (
              <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold text-[11px]">
                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                <span>Polling Fallback (Poll #{pollCount})</span>
              </span>
            )}
            {connectionMode === "connecting" && (
              <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-semibold text-[11px]">
                <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                <span>Connecting...</span>
              </span>
            )}
            {connectionMode === "closed" && (
              <span className="inline-flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-semibold text-[11px]">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Job Completed</span>
              </span>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            Job ID: <span className="font-bold text-slate-700">{currentJobId.slice(0, 8)}...</span>
          </div>
        </div>
      )}

      {/* Active Job State Card */}
      {activeJob ? (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {activeJob.status === "completed" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
              {activeJob.status === "failed" && (
                <XCircle className="w-5 h-5 text-rose-600" />
              )}
              {(activeJob.status === "running" || activeJob.status === "queued") && (
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              )}
              <div>
                <h4 className="text-sm font-bold text-slate-900 capitalize">
                  {activeJob.task_name.replace(/_/g, " ")}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Status:{" "}
                  <span
                    className={`font-semibold uppercase tracking-wider ${
                      activeJob.status === "completed"
                        ? "text-emerald-700"
                        : activeJob.status === "failed"
                        ? "text-rose-700"
                        : "text-purple-700"
                    }`}
                  >
                    {activeJob.status}
                  </span>
                </p>
              </div>
            </div>

            {activeJob.result && (
              <div className="text-right text-xs">
                <span className="text-slate-500">Docs processed:</span>{" "}
                <strong className="text-slate-900">
                  {activeJob.result.documents_processed || 0}
                </strong>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <Activity className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
          No background jobs active. Click above to enqueue an asynchronous worker task.
        </div>
      )}
    </div>
  );
}
