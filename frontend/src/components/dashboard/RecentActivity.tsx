import React from "react";
import { BillingEvent } from "../../types/dashboard";

interface RecentActivityProps {
  events: BillingEvent[];
}

export default function RecentActivity({ events }: RecentActivityProps) {
  const getProviderBadge = (provider: BillingEvent["provider"]) => {
    switch (provider) {
      case "AWS":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "GCP":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Azure":
        return "bg-sky-50 text-sky-800 border-sky-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (status: BillingEvent["status"]) => {
    switch (status) {
      case "Alert":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Optimized":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Normal":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Recent Cloud Billing Activity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sample ledger of daily cloud infrastructure consumption events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            5 Sample Rows
          </span>
        </div>
      </div>

      {/* Semantic Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Service & Event</th>
              <th className="py-2.5 px-3">Provider</th>
              <th className="py-2.5 px-3 text-right">Cost Impact</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((evt) => (
              <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                  {evt.date}
                </td>
                <td className="py-3 px-3">
                  <div className="font-semibold text-slate-800">{evt.service}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {evt.description}
                  </div>
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[10px] border ${getProviderBadge(
                      evt.provider
                    )}`}
                  >
                    {evt.provider}
                  </span>
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  <span
                    className={`font-semibold font-mono ${
                      evt.amount.startsWith("-")
                        ? "text-emerald-600"
                        : "text-slate-900"
                    }`}
                  >
                    {evt.amount}
                  </span>
                </td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(
                      evt.status
                    )}`}
                  >
                    {evt.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>CSV Ingestion Engine: Scheduled for Task 4</span>
        <span>Showing simulated events</span>
      </div>
    </div>
  );
}
