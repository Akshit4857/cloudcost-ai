import React from "react";
import { ServiceCostItem } from "../../types/dashboard";

interface ServiceBreakdownProps {
  services: ServiceCostItem[];
  isLive?: boolean;
  currency?: string;
  sourceLabel?: string;
}

export default function ServiceBreakdown({
  services,
  isLive = false,
  currency = "USD",
  sourceLabel,
}: ServiceBreakdownProps) {
  const totalAmount = services.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Service Cost Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLive
                ? `Actual spend distribution from ${sourceLabel || "uploaded CSV"}`
                : "Category distribution across tracked cloud workloads"}
            </p>
          </div>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isLive
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-slate-500 bg-slate-100"
            }`}
          >
            {isLive ? "Live Upload" : "Sample Data"}
          </span>
        </div>

        {services.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No service breakdown available. Upload a CSV to view real spending distribution.
          </div>
        ) : (
          <>
            {/* Stacked Percentage Bar */}
            <div className="mt-4">
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
                {services.map((svc) => (
                  <div
                    key={svc.name}
                    className={`${svc.color} h-full transition-all`}
                    style={{ width: `${Math.max(svc.percentage, 2)}%` }}
                    title={`${svc.name}: ${svc.percentage}% ($${svc.amount.toFixed(2)})`}
                  />
                ))}
              </div>
            </div>

            {/* Service Rows */}
            <div className="mt-5 space-y-3.5">
              {services.map((item) => (
                <div key={item.name} className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${item.color} inline-block`}
                      />
                      <span className="font-medium text-slate-800">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        ${item.amount.toFixed(2)}{" "}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {currency}
                        </span>
                      </span>
                      <span className="text-slate-400 font-mono text-[11px] w-9 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar per item */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>{isLive ? "Total Parsed Spend" : "Aggregated Sample Total"}</span>
        <span className="font-bold text-slate-900">
          ${totalAmount.toFixed(2)} {currency}
        </span>
      </div>
    </div>
  );
}
