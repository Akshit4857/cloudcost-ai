"use client";

import React from "react";
import { AiInsightsResponse } from "../../types/api";

interface AiBillingExplainerProps {
  insights: AiInsightsResponse | null;
  isLoading: boolean;
  error: string | null;
  statusCode?: number;
  activeBatchId?: string;
  activeFilename?: string;
  onGenerate: () => void;
}

export default function AiBillingExplainer({
  insights,
  isLoading,
  error,
  statusCode,
  activeBatchId,
  activeFilename,
  onGenerate,
}: AiBillingExplainerProps) {
  const isKeyMissing =
    statusCode === 503 ||
    (error && (error.includes("OPENAI_API_KEY") || error.includes("not configured")));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-blue-50/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <span>📚</span>
              <span>Step 13: RAG-Enhanced FinOps Advisor</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Model: {insights ? insights.model : "GPT-4o-mini + pgvector"}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            AI-Powered Billing Insights & Documentation RAG
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl leading-normal">
            Natural-language root-cause analysis and actionable optimization recommendations
            grounded strictly in your verified billing database records and official cloud documentation.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading || !activeBatchId}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition shadow-xs cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-3.5 w-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Retrieving Docs & Analyzing...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{insights ? "Regenerate Analysis" : "Generate AI Insights"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6">
        {/* Context Tag */}
        <div className="mb-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Target Dataset:</span>
            {activeFilename ? (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[11px]">
                {activeFilename}
              </span>
            ) : (
              <span className="text-amber-600 italic">No dataset uploaded yet</span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            pgvector Semantic Retrieval • Official Cloud Source Citations
          </span>
        </div>

        {/* State 1: Loading Skeleton */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-xl animate-pulse">
                🔍
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Searching Official Cloud Documentation & Synthesizing Recommendations...
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Retrieving relevant AWS/GCP best-practice passages from PostgreSQL pgvector
                and grounding recommendations in verified billing records.
              </p>
            </div>
          </div>
        )}

        {/* State 2: Error Alert / Missing Key Guidance */}
        {!isLoading && error && (
          <div className="rounded-xl border p-4 sm:p-5 bg-rose-50/70 border-rose-200 text-slate-800 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-900">
                  {isKeyMissing ? "AI Provider API Key Required" : "Failed to Generate AI Insights"}
                </h4>
                <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              </div>
            </div>

            {isKeyMissing && (
              <div className="mt-3 p-3.5 bg-white rounded-lg border border-rose-200/80 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-slate-900">
                  🛠️ How to configure OpenAI API Key for RAG & Insights:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>
                    Open <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">backend/.env</code> in your editor.
                  </li>
                  <li>
                    Set your key: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">OPENAI_API_KEY=sk-proj-your-key-here</code>
                  </li>
                  <li>Save the file. FastAPI with auto-reload will instantly pick it up.</li>
                  <li>Click &quot;Generate AI Insights&quot; again to see real RAG and LLM analysis.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* State 3: Empty State (Before user requests insights) */}
        {!isLoading && !error && !insights && (
          <div className="py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl mb-3">
              📖
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              No AI & RAG Analysis Generated Yet
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Click &quot;Generate AI Insights&quot; to have our FinOps advisor retrieve official cloud
              cost-management documentation from pgvector and tailor actionable optimization advice to your bill.
            </p>
            <div className="inline-flex items-center gap-2 text-[11px] text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span>🔒 Zero Mockup Policy: Analysis is executed on-demand only.</span>
            </div>
          </div>
        )}

        {/* State 4: Populated Insights */}
        {!isLoading && insights && (
          <div className="space-y-6">
            {/* 1. Overall Summary Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                  📋 Executive Spending Summary
                </span>
                <span className="text-xs text-blue-400">•</span>
                <span className="text-xs text-blue-700 font-medium">
                  Dataset: {insights.filename} ({insights.date_range || "N/A"})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                {insights.summary}
              </p>
            </div>

            {/* 2. Biggest Cost Drivers Grid */}
            {insights.biggest_cost_drivers.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>Primary Cost Drivers</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.biggest_cost_drivers.map((driver, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition-colors space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {driver.service}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600">
                            ${driver.amount.toFixed(2)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {driver.percentage_of_total.toFixed(1)}% of total
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        {driver.observation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Anomaly Explanations */}
            {insights.anomaly_explanations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Detected Cost Spike Explanations</span>
                </h4>
                <div className="space-y-2">
                  {insights.anomaly_explanations.map((anomaly, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {anomaly.service}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {anomaly.date}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            anomaly.severity.toLowerCase() === "high"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {anomaly.severity} Severity
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-normal">
                        {anomaly.explanation}
                      </p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                        <span>Actual: ${anomaly.actual_cost.toFixed(2)}</span>
                        <span>•</span>
                        <span>Baseline: ${anomaly.baseline_cost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Practical Optimization Recommendations (with RAG Source Links) */}
            {insights.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Practical FinOps Recommendations (Document Grounded)</span>
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {insights.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {rec.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {rec.service}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rec.impact.toLowerCase() === "high"
                              ? "bg-rose-100 text-rose-700"
                              : rec.impact.toLowerCase() === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {rec.impact} Impact
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        {rec.recommendation}
                      </p>
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="text-emerald-800 bg-emerald-50/50 p-2 rounded-lg">
                          <strong>Recommended Action:</strong> {rec.potential_action}
                        </div>
                        <div className="text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <strong>Grounded Evidence:</strong> {rec.grounded_evidence}
                        </div>
                      </div>

                      {/* Official Documentation Citation Link */}
                      {rec.source_title && rec.source_url && (
                        <div className="pt-1.5 flex items-center gap-1.5 text-[11px] text-blue-600">
                          <span>📖</span>
                          <span className="text-slate-500 font-medium">Sourced from:</span>
                          <a
                            href={rec.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium underline hover:text-blue-800 truncate"
                          >
                            {rec.source_title}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. RAG Documentation Sources Used */}
            {insights.documentation_sources && insights.documentation_sources.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                    <span>📚</span>
                    <span>Referenced Official Cloud Documentation (RAG Sources)</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                    PostgreSQL pgvector
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {insights.documentation_sources.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800 uppercase">
                          {doc.provider}
                        </span>
                        <a
                          href={doc.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span>Open Docs</span>
                          <span>↗</span>
                        </a>
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {doc.title}
                      </h5>
                      <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                        {doc.relevance_summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Supporting Evidence & Caveats/Limitations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Grounded Evidence */}
              {insights.supporting_evidence.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔍</span>
                    <span>Observed Billing Facts</span>
                  </h5>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                    {insights.supporting_evidence.map((evidence, idx) => (
                      <li key={idx} className="leading-normal">
                        {evidence}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Caveats and Limitations */}
              {insights.limitations.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2">
                  <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Limitations & Missing Data</span>
                  </h5>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-amber-800">
                    {insights.limitations.map((limitation, idx) => (
                      <li key={idx} className="leading-normal">
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="p-3 rounded-lg bg-slate-100 text-[11px] text-slate-500 text-center leading-normal">
              🔒 {insights.disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
