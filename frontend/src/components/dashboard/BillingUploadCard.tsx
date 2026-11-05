"use client";

import React, { useState, useRef } from "react";
import { uploadBillingCSV } from "../../lib/api";
import { BillingSummaryResponse } from "../../types/api";

interface BillingUploadCardProps {
  onUploadSuccess?: (summary: BillingSummaryResponse) => void;
  onReset?: () => void;
  isDashboardLive?: boolean;
}

export default function BillingUploadCard({
  onUploadSuccess,
  onReset,
  isDashboardLive = false,
}: BillingUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BillingSummaryResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await uploadBillingCSV(file);
    setIsLoading(false);

    if (result.success && result.data) {
      setSummary(result.data);
      setError(null);
      onUploadSuccess?.(result.data);
    } else {
      setError(result.error || "Failed to process the billing CSV file.");
      setSummary(null);
    }
  };

  const resetForm = () => {
    setFile(null);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onReset?.();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
            📁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Cloud Billing CSV Ingestion
              </h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isDashboardLive
                    ? "text-emerald-800 bg-emerald-50 border border-emerald-200"
                    : "text-blue-700 bg-blue-50 border border-blue-200"
                }`}
              >
                {isDashboardLive ? "Data Live on Dashboard" : "Step 7 Active"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your billing CSV to replace dashboard metrics with real cloud spending figures
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Endpoint: POST /api/billing/upload
        </div>
      </div>

      {/* Upload Form or Success View */}
      {!summary ? (
        <form onSubmit={handleUpload} className="mt-5 space-y-4">
          {/* File Picker Zone */}
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              id="billing-csv-upload"
              className="hidden"
            />
            <label
              htmlFor="billing-csv-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                ☁️
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {file ? (
                  <span className="text-blue-600">{file.name}</span>
                ) : (
                  <span>Click to select or drag billing CSV</span>
                )}
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Required schema:{" "}
                <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-mono">
                  date,service,resource,cost,currency
                </code>
              </p>
              {file && (
                <span className="text-[11px] text-slate-500 font-mono mt-1">
                  Size: {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
            </label>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <span className="text-sm">⚠️</span>
              <div>
                <strong className="font-semibold">Validation Error:</strong>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-400">
              Sample files available:{" "}
              <code className="text-slate-600 font-mono text-[11px]">
                docs/sample-billing.csv
              </code>{" "}
              or{" "}
              <code className="text-slate-600 font-mono text-[11px]">
                docs/sample-billing-alt.csv
              </code>
            </div>

            <button
              type="submit"
              disabled={!file || isLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Parsing on Backend...</span>
                </>
              ) : (
                <span>Upload & Apply to Dashboard</span>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Success Summary View (Live data from backend) */
        <div className="mt-5 space-y-5">
          {/* Success Banner */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <div>
                <strong className="text-sm font-bold text-emerald-950">
                  Dashboard Connected to Real Ingested Data!
                </strong>
                <p className="text-emerald-800 mt-0.5">
                  File: <code className="font-mono font-semibold">{summary.filename}</code> •{" "}
                  {summary.total_rows} valid records applied to charts and metrics below.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 font-semibold hover:bg-emerald-100/50 transition text-xs cursor-pointer"
              >
                Upload Different CSV
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium hover:bg-slate-100 transition text-xs cursor-pointer"
              >
                Reset to Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
