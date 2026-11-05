"use client";

import React from "react";
import {
  Sparkles,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  Lock,
  Lightbulb,
  Layers,
  FileText,
} from "lucide-react";
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
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-blue-50/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>RAG-Enhanced FinOps Advisor</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Model: {insights ? insights.model : "GPT-4o-mini + pgvector"}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            AI-Powered Billing Insights & Documentation RAG
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
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
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition shadow-xs cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing Insights...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate AI Insights</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6">
        {/* State 1: Error Display */}
        {error && (
          <div
            className={`p-4 rounded-xl border mb-4 text-xs ${
              isKeyMissing
                ? "bg-amber-50/70 border-amber-200 text-amber-900"
                : "bg-rose-50/70 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isKeyMissing ? "text-amber-600" : "text-rose-600"
                }`}
              />
              <div className="space-y-1">
                <strong className="font-bold">
                  {isKeyMissing ? "OpenAI API Key Unconfigured" : "Generation Failed"}
                </strong>
                <p className="leading-relaxed">{error}</p>
                {isKeyMissing && (
                  <p className="text-[11px] text-amber-800/80 font-mono pt-1">
                    Tip: Set OPENAI_API_KEY in your Render dashboard environment variables.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* State 2: No Batch Selected */}
        {!activeBatchId && (
          <div className="py-12 text-center space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-700">No Dataset Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Please upload a billing CSV file or choose a historical upload above to generate AI insights.
            </p>
          </div>
        )}

        {/* State 3: Batch Selected but not generated yet */}
        {activeBatchId && !insights && !isLoading && (
          <div className="py-10 text-center space-y-3 bg-gradient-to-b from-blue-50/20 to-slate-50/30 rounded-xl border border-slate-200/80">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Ready to Analyze {activeFilename || "Current Dataset"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Click &quot;Generate AI Insights&quot; to cross-reference spending with official AWS &amp; GCP FinOps documentation via pgvector search.
              </p>
            </div>
          </div>
        )}

        {/* State 4: Loading State */}
        {isLoading && (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800">
                Analyzing Billing Records &amp; Querying Documentation...
              </h3>
              <p className="text-xs text-slate-400">
                Aggregating database spending facts, querying pgvector embeddings, and structuring recommendations.
              </p>
            </div>
          </div>
        )}

        {/* State 5: Generated Insights Display */}
        {insights && !isLoading && (
          <div className="space-y-6">
            {/* 1. Executive Summary Card */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                  Executive Summary
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Analysis of {insights.filename}
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {insights.summary}
              </p>
            </div>

            {/* 2. Primary Cost Drivers */}
            {insights.biggest_cost_drivers && insights.biggest_cost_drivers.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Primary Cost Drivers</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.biggest_cost_drivers.map((driver, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{driver.service}</span>
                        <span className="text-xs font-bold text-blue-600">${driver.amount.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">{driver.observation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Actionable Recommendations with Citations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Actionable FinOps Recommendations</span>
                </h4>
                <div className="space-y-3">
                  {insights.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-2 shadow-2xs hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{rec.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {rec.service}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rec.impact.toLowerCase() === "high"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {rec.impact} Impact
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">{rec.recommendation}</p>

                      {/* Official Documentation Citation Link */}
                      {rec.source_title && rec.source_url && (
                        <div className="pt-2 flex items-center gap-1.5 text-[11px] text-blue-600 border-t border-slate-100">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
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

            {/* 4. RAG Documentation Sources */}
            {insights.documentation_sources && insights.documentation_sources.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
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
                      className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800 uppercase">
                          {doc.provider}
                        </span>
                        <a
                          href={doc.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                        >
                          <span>Open Docs</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{doc.title}</h5>
                      <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                        {doc.relevance_summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 rounded-lg bg-slate-100 text-[11px] text-slate-500 text-center leading-normal flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{insights.disclaimer}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
