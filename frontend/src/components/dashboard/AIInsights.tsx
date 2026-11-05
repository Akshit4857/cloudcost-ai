"use client";

import React from "react";
import { AnomalyItem } from "../../types/api";

interface AIInsightsProps {
  anomalies: AnomalyItem[];
  isLoading?: boolean;
  status?: string;
  message?: string;
  error?: string | null;
  onRefresh?: () => void;
  hasUploadedData?: boolean;
}

export default function AIInsights({
  anomalies,
  isLoading = false,
  message = "",
  error = null,
  onRefresh,
  hasUploadedData = false,
}: AIInsightsProps) {
  const getSeverityBadge = (severity: AnomalyItem["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Cost Anomalies & Statistical Insights
              </h2>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Rule-Based Z-Score (PostgreSQL)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Service-level cost spike detection comparing daily spend against historical average and standard deviation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Analyzing..." : "↻ Refresh"}
            </button>
          )}
          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Engine: StdDev (μ + 1.25σ)
          </div>
        </div>
      </div>

      {/* 1. Loading State */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-600 font-medium">
            Querying PostgreSQL database and computing statistical variance...
          </p>
        </div>
      )}

      {/* 2. Error State */}
      {!isLoading && error && (
        <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <span className="text-base">⚠️</span>
          <div>
            <p className="font-semibold">Unable to fetch anomaly insights</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 3. Empty State — No CSV Uploaded */}
      {!isLoading && !error && !hasUploadedData && (
        <div className="py-10 text-center space-y-2">
          <div className="text-2xl">📁</div>
          <h3 className="text-sm font-semibold text-slate-700">No Billing Data Ingested</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload a cloud billing CSV file above to persist records into PostgreSQL and run statistical cost anomaly detection.
          </p>
        </div>
      )}

      {/* 4. Empty State — Uploaded but no anomalies (Clean bill of health) */}
      {!isLoading && !error && hasUploadedData && anomalies.length === 0 && (
        <div className="py-10 text-center space-y-2">
          <div className="text-2xl">✅</div>
          <h3 className="text-sm font-semibold text-emerald-800">
            No Unusual Cost Spikes Detected
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {message ||
              "All service expenditures are within normal historical standard deviation thresholds (z < 1.25σ). No anomalies found in persisted records."}
          </p>
        </div>
      )}

      {/* 5. Populated State — Anomalies detected */}
      {!isLoading && !error && anomalies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {anomalies.map((anomaly, idx) => (
            <div
              key={`${anomaly.service}-${anomaly.date}-${idx}`}
              className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    ☁️ {anomaly.service}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                      anomaly.severity
                    )}`}
                  >
                    {anomaly.severity.toUpperCase()} SPIKE
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                      Spike Date
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {anomaly.date}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                      Cost Jump
                    </span>
                    <span className="text-xs font-bold text-rose-700">
                      +{anomaly.percentage_difference.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-white border border-rose-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Actual Cost</span>
                    <span className="font-bold text-rose-700">
                      ${anomaly.actual_cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Historical Baseline</span>
                    <span className="font-semibold text-slate-600">
                      ${anomaly.baseline_cost.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">
                  {anomaly.explanation}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-rose-200/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Std Dev: ${anomaly.std_dev.toFixed(2)}</span>
                <span className="font-mono text-[10px] text-slate-400">PostgreSQL Verified</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Methodology Disclaimer */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>
          ℹ️ <strong>Rule-based statistical detection:</strong> Identifies outliers using sample standard deviation ($x &gt; \mu + 1.25\sigma$) across persisted PostgreSQL records. GenAI-powered natural language explanations and saving proposals will be introduced in Step 10.
        </span>
      </div>
    </div>
  );
}
