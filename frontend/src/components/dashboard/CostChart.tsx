"use client";

import React, { useState } from "react";
import { DailySpend } from "../../types/dashboard";

interface CostChartProps {
  data: DailySpend[];
  isLive?: boolean;
  currency?: string;
  sourceLabel?: string;
}

export default function CostChart({
  data,
  isLive = false,
  currency = "USD",
  sourceLabel,
}: CostChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DailySpend | null>(null);

  const costs = data.map((d) => d.cost);
  const maxCost = costs.length > 0 ? Math.max(...costs, 10) : 100;
  const totalCost = costs.reduce((acc, curr) => acc + curr, 0);
  const avgCost = data.length > 0 ? totalCost / data.length : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {isLive ? "Daily Ingested Spend Trend" : "30-Day Cloud Spend Trend"}
            </h2>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isLive
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                  : "text-slate-600 bg-slate-100"
              }`}
            >
              {isLive ? `Live Upload (${data.length} Days)` : "Sample Data"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLive
              ? `Daily spend series aggregated from ${sourceLabel || "uploaded CSV"}`
              : "Daily cloud infrastructure burn rate across AWS, GCP & Azure"}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block"></span>
            <span>Daily Spend</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-700">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span>
            <span>Peak Day</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400">
          No time-series data available. Upload a CSV to view daily spending trends.
        </div>
      ) : (
        <>
          {/* Interactive Tooltip Callout */}
          <div className="h-7 my-2 flex items-center justify-between text-xs px-2">
            {hoveredPoint ? (
              <span className="text-slate-800 font-medium">
                📅 <strong className="text-blue-700">{hoveredPoint.dateStr}</strong>: Daily Cost:{" "}
                <strong className="text-slate-900">
                  ${hoveredPoint.cost.toFixed(2)} {currency}
                </strong>
                {hoveredPoint.cost >= avgCost * 1.25 && (
                  <span className="ml-2 text-amber-600 font-semibold">
                    (⚠️ Above Average)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 italic">
                Hover over any bar to view exact daily spending details
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-mono">
              Burn: ~${avgCost.toFixed(2)}/day avg
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="relative pt-4">
            {/* Y-Axis Guidelines */}
            <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
              <div className="border-b border-dashed border-slate-200 flex justify-between">
                <span>${maxCost.toFixed(0)}</span>
              </div>
              <div className="border-b border-dashed border-slate-200 flex justify-between">
                <span>${(maxCost * 0.5).toFixed(0)}</span>
              </div>
              <div className="border-b border-dashed border-slate-200 flex justify-between">
                <span>$0</span>
              </div>
            </div>

            {/* Bars Container */}
            <div className="h-44 flex items-end justify-around gap-1 sm:gap-2 pt-2 pb-6 px-1 relative z-10">
              {data.map((item) => {
                // Normalized height calculation starting from $0
                const heightPercent = Math.max(
                  8,
                  Math.min(100, (item.cost / maxCost) * 100)
                );
                const isPeak = item.cost >= maxCost * 0.95 && data.length > 1;

                return (
                  <div
                    key={item.dateStr}
                    className="flex-1 max-w-[50px] flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(item)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <div
                      className={`w-full rounded-t-xs transition-all duration-150 ${
                        isPeak
                          ? "bg-amber-500 hover:bg-amber-600"
                          : "bg-blue-500/80 hover:bg-blue-600"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.dateStr}: $${item.cost.toFixed(2)} ${currency}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1 border-t border-slate-200 pt-1.5 overflow-x-auto">
              {data.length <= 7 ? (
                data.map((d) => <span key={d.dateStr}>{d.dateStr}</span>)
              ) : (
                <>
                  <span>{data[0]?.dateStr}</span>
                  <span>{data[Math.floor(data.length / 2)]?.dateStr}</span>
                  <span>{data[data.length - 1]?.dateStr}</span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
