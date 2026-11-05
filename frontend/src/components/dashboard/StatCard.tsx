import React from "react";
import { StatMetric } from "../../types/dashboard";

interface StatCardProps {
  metric: StatMetric;
}

export default function StatCard({ metric }: StatCardProps) {
  const getBadgeStyle = () => {
    if (metric.category === "spend" || metric.category === "change") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (metric.category === "remaining") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getCategoryIcon = () => {
    switch (metric.category) {
      case "spend":
        return "💳";
      case "budget":
        return "🎯";
      case "remaining":
        return "🛡️";
      case "change":
        return "📊";
      default:
        return "💰";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {metric.title}
        </span>
        <span className="text-base" role="img" aria-label={metric.title}>
          {getCategoryIcon()}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {metric.value}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getBadgeStyle()}`}
        >
          {metric.change}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500 leading-normal">
        {metric.subtext}
      </p>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>{metric.dataSource || "DataSource: Sample"}</span>
        <span className="font-mono text-[10px]">{metric.periodLabel || "Oct 2026"}</span>
      </div>
    </div>
  );
}
