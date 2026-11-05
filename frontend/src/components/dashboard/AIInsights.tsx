"use client";

import React from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
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
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shadow-2xs">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Cost Anomalies & Statistical Insights
              </h2>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Z-Score Algorithm (PostgreSQL)
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-8 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Running statistical anomaly detection query...
        </div>
      )}

      {/* Empty / Baseline message */}
      {!isLoading && !error && anomalies.length === 0 && (
        <div className="mt-4 p-5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
          <h3 className="text-sm font-bold text-emerald-950">
            No Statistical Cost Anomalies Detected
          </h3>
          <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
            {message ||
              "All daily spending figures remain within normal distribution boundaries (Z < 1.25)."}
          </p>
        </div>
      )}

      {/* Anomalies List */}
      {!isLoading && anomalies.length > 0 && (
        <div className="mt-4 space-y-3">
          {anomalies.map((anom, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{anom.service}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                        anom.severity
                      )}`}
                    >
                      {anom.severity.toUpperCase()} SPIKE
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Date: {anom.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{anom.explanation}</p>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4 shrink-0">
                <div className="text-base font-bold text-rose-600 font-mono">
                  ${anom.actual_cost.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Baseline: ${anom.baseline_cost.toFixed(2)} (+{anom.percentage_difference.toFixed(0)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
