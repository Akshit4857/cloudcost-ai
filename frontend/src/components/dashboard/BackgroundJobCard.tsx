"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

  // WebSocket Lifecycle & Real-Time Connection
  useEffect(() => {
    if (!currentJobId || currentStatus === "completed" || currentStatus === "failed") {
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const token = getAuthToken();
    if (!token) {
      // Fallback to polling if token is unavailable in localStorage
      startPollingFallback(currentJobId);
      return;
    }

    const wsUrl = `${getWebSocketUrl(`/api/ws/jobs/${currentJobId}`)}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsWsConnected(true);
      setIsUsingPolling(false);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.job_id) {
          setActiveJob((prev) => (prev ? { ...prev, ...data } : data));

          // If job reached terminal state, close WebSocket cleanly
          if (data.status === "completed" || data.status === "failed") {
            ws.close();
            wsRef.current = null;
            setIsWsConnected(false);
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket job message:", err);
      }
    };

    ws.onerror = () => {
      // Graceful fallback to polling if WebSocket encounters an error
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsWsConnected(false);
      startPollingFallback(currentJobId);
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      setIsWsConnected(false);
      // If closed abnormally before job completion, switch to polling fallback
      if (event.code !== 1000 && (currentStatus === "queued" || currentStatus === "running")) {
        startPollingFallback(currentJobId);
      }
    };

    return () => {
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [currentJobId, currentStatus, startPollingFallback, stopPolling]);

  const handleTriggerJob = async () => {
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
        status: "queued",
        result: null,
        error: null,
        created_at: res.data.created_at,
        updated_at: res.data.created_at,
      });
    } else {
      setError(res.error || "Failed to enqueue background job");
    }
  };

  const handleDismiss = () => {
    stopPolling();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setActiveJob(null);
    setError(null);
    setPollCount(0);
    setIsWsConnected(false);
    setIsUsingPolling(false);
  };

  const isJobActive = activeJob?.status === "queued" || activeJob?.status === "running";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-purple-50/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
              <span>⚡</span>
              <span>Step 15: Real-Time WebSockets & Task Queue</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Broker: Redis 7.2 • Worker: Celery • Transport: WebSocket
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Real-Time Asynchronous Job Streaming
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl leading-normal">
            Real-time, bi-directional event streaming over authenticated WebSockets powered by Redis Pub/Sub, delivering instant background job updates without polling latency.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTriggerJob}
            disabled={isSubmitting || isJobActive}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition shadow-xs cursor-pointer shrink-0"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Enqueuing...</span>
              </>
            ) : isJobActive ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Live Streaming...</span>
              </>
            ) : (
              <>
                <span>▶ Run Async RAG Re-indexing</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
            <span className="text-base">⚠️</span>
            <div className="flex-1 space-y-1">
              <p className="font-semibold">Background Job Error</p>
              <p className="text-rose-700">{error}</p>
              {error.includes("503") || error.includes("Queue service unavailable") ? (
                <p className="text-[11px] text-rose-600 mt-1">
                  Tip: Ensure Redis is running locally (`redis-server` or `brew services start redis`) and the backend can reach `redis://localhost:6379/0`.
                </p>
              ) : null}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-medium cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active / Last Job Display */}
        {activeJob ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Job:</span>
                <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                  {activeJob.task_name}
                </code>
                <span className="text-xs text-slate-400">({activeJob.job_id.substring(0, 8)}...)</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Status Badge */}
                {activeJob.status === "queued" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Queued in Redis</span>
                  </span>
                )}
                {activeJob.status === "running" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Worker Processing</span>
                  </span>
                )}
                {activeJob.status === "completed" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span>✓</span>
                    <span>Completed</span>
                  </span>
                )}
                {activeJob.status === "failed" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <span>✕</span>
                    <span>Failed</span>
                  </span>
                )}

                {/* Connection Transport Indicator */}
                {isJobActive && (
                  <>
                    {connectionMode === "websocket" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>WS Live</span>
                      </span>
                    )}
                    {connectionMode === "polling" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span>↺ Polling ({pollCount * 2}s)</span>
                      </span>
                    )}
                    {connectionMode === "connecting" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <span>Connecting...</span>
                      </span>
                    )}
                  </>
                )}

                {/* Dismiss button when terminal */}
                {!isJobActive && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>

            {/* Details Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Created At</span>
                <span className="font-mono text-slate-700">
                  {new Date(activeJob.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Last Updated</span>
                <span className="font-mono text-slate-700">
                  {new Date(activeJob.updated_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Transport Mode</span>
                <span className="font-medium text-slate-800">
                  {connectionMode === "websocket"
                    ? "⚡ Real-time WebSocket (Redis Pub/Sub)"
                    : connectionMode === "polling"
                    ? "↺ HTTP Polling Fallback"
                    : activeJob.status === "completed"
                    ? "Delivered & Synced"
                    : "Connecting..."}
                </span>
              </div>
            </div>

            {/* Completed Result Payload */}
            {activeJob.status === "completed" && activeJob.result && (
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">Worker Execution Metrics:</span>
                  <span className="font-mono text-[11px] text-emerald-700">
                    {activeJob.result.documents_processed ?? 0} docs • {activeJob.result.chunks_created ?? 0} chunks
                  </span>
                </div>
                <p className="text-emerald-800 text-[11px]">
                  RAG vector knowledge base was synchronized in the background without blocking the web application. Updates streamed in real time via WebSockets.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Empty State Explainer */
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-800">No background job currently running</p>
              <p className="text-xs text-slate-500">
                Click <span className="font-medium text-slate-700">&quot;Run Async RAG Re-indexing&quot;</span> to trigger a background task. The frontend establishes an authenticated WebSocket to <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">/api/ws/jobs/&#123;id&#125;</code> for instant updates streamed from Redis Pub/Sub.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span>Worker Ready</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
