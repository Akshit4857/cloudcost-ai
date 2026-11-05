"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  Calendar,
} from "lucide-react";
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
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm shadow-2xs">
            <FolderOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Cloud Billing CSV Ingestion
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isDashboardLive
                    ? "text-emerald-800 bg-emerald-50 border border-emerald-200"
                    : "text-blue-700 bg-blue-50 border border-blue-200"
                }`}
              >
                {isDashboardLive ? "Data Live on Dashboard" : "Production Ready"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your cloud billing CSV to analyze real spend, daily trends, and Z-score anomalies
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100 self-start sm:self-auto">
          POST /api/billing/upload
        </div>
      </div>

      {/* Upload Form or Success View */}
      {!summary ? (
        <form onSubmit={handleUpload} className="mt-5 space-y-4">
          {/* File Picker Zone */}
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center transition-all bg-slate-50/50 hover:bg-blue-50/20">
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
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {file ? (
                  <span className="text-blue-600 font-bold flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" />
                    {file.name}
                  </span>
                ) : (
                  <span>Click to select or drag billing CSV</span>
                )}
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Required schema:{" "}
                <code className="bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-mono">
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
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Validation Error:</strong>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Safe in-memory validation • Stored in PostgreSQL
            </span>
            <button
              type="submit"
              disabled={isLoading || !file}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-all ${
                isLoading || !file
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-98"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Parsing & Ingesting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Parse & Ingest CSV</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Success Breakdown Panel */
        <div className="mt-5 space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Billing Dataset Persisted to Database
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Successfully parsed and persisted{" "}
                  <strong>{summary.total_rows} records</strong> from{" "}
                  <code className="font-mono font-semibold">{summary.filename}</code>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload Another</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Total Spend
              </span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                ${summary.total_cost.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {summary.currency}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Valid Rows
              </span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {summary.total_rows}
              </div>
              <span className="text-[10px] text-slate-400">100% Valid</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Services
              </span>
              <div className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                {Object.keys(summary.service_totals).length}
              </div>
              <span className="text-[10px] text-slate-400">Cloud Services</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Date Range
              </span>
              <div className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {summary.date_range
                  ? `${summary.date_range.start.slice(5)} to ${summary.date_range.end.slice(5)}`
                  : "N/A"}
              </div>
              <span className="text-[10px] text-slate-400">Billing Period</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
