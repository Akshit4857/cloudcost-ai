"use client";

import React, { useState } from "react";
import {
  History,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { UploadHistoryItem } from "../../types/api";

interface UploadHistoryProps {
  uploads: UploadHistoryItem[];
  activeBatchId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onSelect: (uploadId: string) => void;
  onDelete: (uploadId: string) => Promise<void>;
  onRefresh?: () => void;
}

export default function UploadHistory({
  uploads,
  activeBatchId,
  isLoading = false,
  error = null,
  onSelect,
  onDelete,
  onRefresh,
}: UploadHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm shadow-2xs">
            <History className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Uploaded Billing Datasets
              </h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                PostgreSQL Batches
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Switch between previous uploads or delete outdated datasets with cascade safety
            </p>
          </div>
        </div>

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

      {/* Error state */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && uploads.length === 0 && (
        <div className="py-8 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading saved datasets...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && uploads.length === 0 && (
        <div className="mt-4 py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          No past billing uploads found. Ingest your first CSV above.
        </div>
      )}

      {/* Datasets Table */}
      {uploads.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-2.5 px-3">Dataset File</th>
                <th className="py-2.5 px-3">Upload Date</th>
                <th className="py-2.5 px-3 text-right">Records</th>
                <th className="py-2.5 px-3 text-right">Total Cost</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uploads.map((item) => {
                const isActive = item.id === activeBatchId;
                const isConfirming = confirmDeleteId === item.id;
                const isDeleting = deletingId === item.id;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isActive ? "bg-blue-50/40" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate max-w-[160px] sm:max-w-xs">{item.filename}</span>
                      {isActive && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-mono">
                      {item.total_rows}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                      ${item.total_cost.toFixed(2)} {item.currency}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Persisted
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(item.id)}
                            disabled={isDeleting}
                            className="px-2 py-1 bg-rose-600 text-white text-[11px] font-bold rounded hover:bg-rose-700 transition"
                          >
                            {isDeleting ? "Deleting..." : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelDelete}
                            className="px-2 py-1 bg-slate-200 text-slate-700 text-[11px] font-semibold rounded hover:bg-slate-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => onSelect(item.id)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded text-[11px] border border-blue-200 transition"
                            >
                              Load View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(item.id)}
                            title="Delete dataset"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
