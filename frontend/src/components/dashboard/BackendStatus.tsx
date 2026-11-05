"use client";

import React, { useEffect, useState } from "react";
import { checkBackendHealth, API_BASE_URL } from "../../lib/api";
import { BackendConnectionResult } from "../../types/api";

interface BackendStatusProps {
  variant?: "badge" | "card";
}

export default function BackendStatus({ variant = "card" }: BackendStatusProps) {
  const [result, setResult] = useState<BackendConnectionResult>({
    state: "checking",
    data: null,
    error: null,
  });

  const checkConnection = async () => {
    setResult((prev) => ({ ...prev, state: "checking", error: null }));
    const res = await checkBackendHealth();
    setResult(res);
  };

  useEffect(() => {
    let isMounted = true;

    async function initialCheck() {
      const res = await checkBackendHealth();
      if (isMounted) {
        setResult(res);
      }
    }

    initialCheck();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compact badge for header / nav bar
  if (variant === "badge") {
    if (result.state === "checking") {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium animate-pulse"
          title={`Checking connection to ${API_BASE_URL}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          <span>Checking API...</span>
        </span>
      );
    }

    if (result.state === "connected") {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-medium"
          title={`Connected to ${result.data?.service} v${result.data?.version} (${result.latencyMs}ms)`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>API Connected</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-800 text-[11px] font-medium"
        title={result.error || "Backend server unreachable"}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        <span>API Offline</span>
      </span>
    );
  }

  // Full status card for dashboard body
  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        result.state === "connected"
          ? "bg-emerald-50/40 border-emerald-200/80"
          : result.state === "checking"
          ? "bg-slate-50 border-slate-200"
          : "bg-rose-50/40 border-rose-200/80"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status indicator and info */}
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
              result.state === "connected"
                ? "bg-emerald-100 text-emerald-700"
                : result.state === "checking"
                ? "bg-slate-200 text-slate-600 animate-pulse"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {result.state === "connected"
              ? "✓"
              : result.state === "checking"
              ? "⟳"
              : "!"}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {result.state === "connected" && "FastAPI Backend Connected"}
                {result.state === "checking" && "Checking Backend Connectivity..."}
                {result.state === "unavailable" && "FastAPI Backend Unavailable"}
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                  result.state === "connected"
                    ? "bg-emerald-100 text-emerald-800"
                    : result.state === "checking"
                    ? "bg-slate-200 text-slate-700"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {result.state === "connected" && "HTTP 200 OK"}
                {result.state === "checking" && "Pinging"}
                {result.state === "unavailable" && "Offline"}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {result.state === "connected" && (
                <>
                  Successfully connected to{" "}
                  <strong className="text-slate-800">
                    {result.data?.service} (v{result.data?.version})
                  </strong>{" "}
                  at{" "}
                  <code className="px-1.5 py-0.5 bg-white/80 rounded border border-slate-200 text-[11px]">
                    {API_BASE_URL}
                  </code>
                  . Latency: <strong>{result.latencyMs}ms</strong>.
                </>
              )}
              {result.state === "checking" && (
                <>
                  Attempting HTTP GET request to{" "}
                  <code className="px-1.5 py-0.5 bg-white/80 rounded border border-slate-200 text-[11px]">
                    {API_BASE_URL}/api/health
                  </code>
                  ...
                </>
              )}
              {result.state === "unavailable" && (
                <>
                  Could not reach backend at{" "}
                  <code className="px-1.5 py-0.5 bg-white/80 rounded border border-rose-200 text-[11px] text-rose-900">
                    {API_BASE_URL}/api/health
                  </code>
                  . {result.error ? `Error: ${result.error}.` : ""}{" "}
                  Run{" "}
                  <code className="px-1.5 py-0.5 bg-white/80 rounded border border-slate-200 text-[11px] font-mono">
                    uvicorn app.main:app --reload
                  </code>{" "}
                  inside <code className="font-mono text-[11px]">backend/</code>.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Retry button */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={checkConnection}
            disabled={result.state === "checking"}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition shadow-2xs cursor-pointer"
          >
            {result.state === "checking" ? "Checking..." : "Re-check Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}
