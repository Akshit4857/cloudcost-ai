"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
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
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              result.state === "connected"
                ? "bg-emerald-100 text-emerald-700"
                : result.state === "checking"
                ? "bg-slate-200 text-slate-600"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {result.state === "connected" && <CheckCircle2 className="w-5 h-5" />}
            {result.state === "checking" && <RefreshCw className="w-5 h-5 animate-spin" />}
            {result.state === "unavailable" && <AlertCircle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {result.state === "connected" && "FastAPI Backend & Database Live"}
                {result.state === "checking" && "Checking Backend Connectivity..."}
                {result.state === "unavailable" && "FastAPI Backend Unavailable"}
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  result.state === "connected"
                    ? "bg-emerald-100 text-emerald-800"
                    : result.state === "checking"
                    ? "bg-slate-200 text-slate-700"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {result.state.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-0.5">
              {result.state === "connected" && (
                <>
                  Server: <code className="font-mono">{result.data?.service}</code> | Version:{" "}
                  <code className="font-mono">v{result.data?.version}</code> | Latency:{" "}
                  <strong>{result.latencyMs}ms</strong>
                </>
              )}
              {result.state === "checking" && "Querying /api/health endpoint..."}
              {result.state === "unavailable" && (
                <span className="text-rose-700 font-medium">
                  {result.error || "Cannot reach API server."}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Retry button */}
        <button
          type="button"
          onClick={checkConnection}
          disabled={result.state === "checking"}
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-2xs"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-slate-500 ${
              result.state === "checking" ? "animate-spin" : ""
            }`}
          />
          <span>Re-check Health</span>
        </button>
      </div>
    </div>
  );
}
