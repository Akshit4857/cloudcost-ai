"use client";

import React, { useState } from "react";
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
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
            🗂️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Uploaded Billing Datasets
              </h2>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                {uploads.length} {uploads.length === 1 ? "Dataset" : "Datasets"} in PostgreSQL
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Switch between billing periods or delete previous uploads. Selecting an upload updates the entire dashboard.
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            {isLoading ? "Loading..." : "↻ Refresh History"}
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && uploads.length === 0 && (
        <div className="py-10 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500">Loading datasets from PostgreSQL...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && uploads.length === 0 && (
        <div className="py-10 text-center space-y-2">
          <div className="text-2xl">📂</div>
          <h3 className="text-sm font-semibold text-slate-700">No Datasets Uploaded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your first cloud billing CSV above to persist records and view history here.
          </p>
        </div>
      )}

      {/* Uploads List Table */}
      {uploads.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50 border-y border-slate-100 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Dataset / File</th>
                <th className="py-2.5 px-3">Date Range</th>
                <th className="py-2.5 px-3 text-right">Rows</th>
                <th className="py-2.5 px-3 text-right">Total Spend</th>
                <th className="py-2.5 px-3">Uploaded On</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uploads.map((batch) => {
                const isActive = activeBatchId === batch.id;
                const isConfirming = confirmDeleteId === batch.id;
                const isDeleting = deletingId === batch.id;

                return (
                  <tr
                    key={batch.id}
                    className={`transition-colors ${
                      isActive
                        ? "bg-blue-50/40 hover:bg-blue-50/60"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Filename & Batch ID */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📄</span>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {batch.filename}
                            {isActive && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {batch.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date Range */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {batch.start_date && batch.end_date
                        ? `${batch.start_date} → ${batch.end_date}`
                        : "Single Date"}
                    </td>

                    {/* Rows Count */}
                    <td className="py-3 px-3 text-right font-medium">
                      {batch.total_rows} rows
                    </td>

                    {/* Total Spend */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ${batch.total_cost.toFixed(2)}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">
                        {batch.currency}
                      </span>
                    </td>

                    {/* Upload Timestamp */}
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDate(batch.created_at)}
                    </td>

                    {/* Active Indicator */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span>●</span> On Dashboard
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Available
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-md">
                          <span className="text-[11px] text-rose-700 font-semibold px-1">
                            Delete?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(batch.id)}
                            disabled={isDeleting}
                            className="text-[10px] font-bold px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? "..." : "Yes"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelDelete}
                            disabled={isDeleting}
                            className="text-[10px] font-semibold px-2 py-0.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => onSelect(batch.id)}
                              className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                              title="Load this dataset onto dashboard"
                            >
                              View Dashboard
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(batch.id)}
                            className="text-xs font-semibold px-2 py-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                            title="Delete this upload from PostgreSQL"
                          >
                            🗑️
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

      {/* Security & Multi-User Disclaimer */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          ℹ️ <strong>Security Notice:</strong> Authentication is not yet enabled in this development phase. All uploads shown here reside in the local PostgreSQL database and are shared across local sessions without user isolation.
        </span>
      </div>
    </div>
  );
}

