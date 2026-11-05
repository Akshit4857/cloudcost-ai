import React from "react";
import { CreditCard, Target, ShieldCheck, TrendingUp, DollarSign } from "lucide-react";
import { StatMetric } from "../../types/dashboard";

interface StatCardProps {
  metric: StatMetric;
}

export default function StatCard({ metric }: StatCardProps) {
  const getBadgeStyle = () => {
    if (metric.category === "spend" || metric.category === "change") {
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    }
    if (metric.category === "remaining") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    return "bg-blue-50 text-blue-700 border-blue-200/80";
  };

  const getIconConfig = () => {
    switch (metric.category) {
      case "spend":
        return {
          icon: CreditCard,
          bg: "bg-rose-50 text-rose-600 border-rose-100",
        };
      case "budget":
        return {
          icon: Target,
          bg: "bg-indigo-50 text-indigo-600 border-indigo-100",
        };
      case "remaining":
        return {
          icon: ShieldCheck,
          bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
        };
      case "change":
        return {
          icon: TrendingUp,
          bg: "bg-amber-50 text-amber-600 border-amber-100",
        };
      default:
        return {
          icon: DollarSign,
          bg: "bg-blue-50 text-blue-600 border-blue-100",
        };
    }
  };

  const { icon: Icon, bg: iconBg } = getIconConfig();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {metric.title}
        </span>
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${iconBg} shadow-2xs`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {metric.value}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle()}`}
        >
          {metric.change}
        </span>
      </div>

      <p className="mt-1.5 text-xs text-slate-500 leading-normal">
        {metric.subtext}
      </p>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Updated</span>
        <span className="font-medium text-slate-600">Today</span>
      </div>
    </div>
  );
}
