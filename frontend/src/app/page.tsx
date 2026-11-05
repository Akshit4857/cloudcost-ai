"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RotateCcw, BarChart3 } from "lucide-react";
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import StatCard from "../components/dashboard/StatCard";
import CostChart from "../components/dashboard/CostChart";
import ServiceBreakdown from "../components/dashboard/ServiceBreakdown";
import AIInsights from "../components/dashboard/AIInsights";
import AiBillingExplainer from "../components/dashboard/AiBillingExplainer";
import RecentActivity from "../components/dashboard/RecentActivity";
import BackendStatus from "../components/dashboard/BackendStatus";
import BillingUploadCard from "../components/dashboard/BillingUploadCard";
import UploadHistory from "../components/dashboard/UploadHistory";
import BackgroundJobCard from "../components/dashboard/BackgroundJobCard";
import AuthView from "../components/auth/AuthView";
import {
  fetchBillingAnomalies,
  fetchPersistedBillingSummary,
  fetchUploadDetails,
  fetchUploadHistory,
  deleteUploadBatch,
  fetchCurrentUser,
  clearAuthToken,
  fetchAiBillingInsights,
} from "../lib/api";
import {
  AnomalyItem,
  BillingSummaryResponse,
  UploadHistoryItem,
  User,
  AiInsightsResponse,
} from "../types/api";
import { StatMetric, DailySpend, ServiceCostItem } from "../types/dashboard";
import {
  SAMPLE_STAT_METRICS,
  SAMPLE_30_DAY_SPEND,
  SAMPLE_SERVICE_BREAKDOWN,
  SAMPLE_BILLING_EVENTS,
} from "../data/mockDashboardData";

const SERVICE_PALETTE = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-purple-600",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-teal-500",
];

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummaryResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [isAnomaliesLoading, setIsAnomaliesLoading] = useState(false);
  const [anomaliesError, setAnomaliesError] = useState<string | null>(null);
  const [anomaliesMessage, setAnomaliesMessage] = useState<string>("");

  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Step 12: AI-Powered Billing Explanations State
  const [aiInsights, setAiInsights] = useState<AiInsightsResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatusCode, setAiStatusCode] = useState<number | undefined>(undefined);

  const loadAnomalies = useCallback(async (batchId?: string) => {
    setIsAnomaliesLoading(true);
    setAnomaliesError(null);
    const cleanBatchId = typeof batchId === "string" ? batchId : undefined;
    const res = await fetchBillingAnomalies(cleanBatchId);
    setIsAnomaliesLoading(false);
    if (res.success && res.data) {
      setAnomalies(res.data.anomalies);
      setAnomaliesMessage(res.data.message);
    } else {
      setAnomaliesError(res.error || "Failed to load cost anomalies.");
    }
  }, []);

  const loadUploadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    const res = await fetchUploadHistory();
    setIsHistoryLoading(false);
    if (res.success && res.data) {
      setUploadHistory(res.data);
    } else {
      setHistoryError(res.error || "Failed to load upload history.");
    }
  }, []);

  const hydrateUserData = useCallback(async () => {
    // 1. Fetch user's upload history
    const historyRes = await fetchUploadHistory();
    if (historyRes.success && historyRes.data) {
      setUploadHistory(historyRes.data);
    } else {
      setUploadHistory([]);
    }

    // 2. Fetch user's latest billing summary
    const summaryRes = await fetchPersistedBillingSummary();
    if (summaryRes.success && summaryRes.data) {
      setBillingSummary(summaryRes.data);
      // 3. Fetch anomalies for user's latest batch
      const anomaliesRes = await fetchBillingAnomalies(summaryRes.data.batch_id);
      if (anomaliesRes.success && anomaliesRes.data) {
        setAnomalies(anomaliesRes.data.anomalies);
        setAnomaliesMessage(anomaliesRes.data.message);
      } else if (anomaliesRes.error) {
        setAnomaliesError(anomaliesRes.error);
      }
    } else {
      setBillingSummary(null);
      setAnomalies([]);
      setAnomaliesMessage("");
    }
  }, []);

  // Check authentication on initial load
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      const userRes = await fetchCurrentUser();
      if (!isMounted) return;

      if (userRes.success && userRes.data) {
        setCurrentUser(userRes.data);
        setIsAuthChecking(false);
        hydrateUserData();
      } else {
        setCurrentUser(null);
        setIsAuthChecking(false);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [hydrateUserData]);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    hydrateUserData();
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setBillingSummary(null);
    setAnomalies([]);
    setAnomaliesMessage("");
    setAnomaliesError(null);
    setUploadHistory([]);
    setAiInsights(null);
    setAiError(null);
    setAiStatusCode(undefined);
  };

  const handleUploadSuccess = (summary: BillingSummaryResponse) => {
    setBillingSummary(summary);
    setAiInsights(null);
    setAiError(null);
    setAiStatusCode(undefined);
    loadUploadHistory();
    loadAnomalies(summary.batch_id);
  };

  const handleSelectDataset = async (uploadId: string) => {
    // Reset AI analysis when changing dataset to maintain strictly grounded context
    setAiInsights(null);
    setAiError(null);
    setAiStatusCode(undefined);

    setIsAnomaliesLoading(true);
    setAnomaliesError(null);
    const summaryRes = await fetchUploadDetails(uploadId);
    if (summaryRes.success && summaryRes.data) {
      setBillingSummary(summaryRes.data);
    }
    const anomaliesRes = await fetchBillingAnomalies(uploadId);
    setIsAnomaliesLoading(false);
    if (anomaliesRes.success && anomaliesRes.data) {
      setAnomalies(anomaliesRes.data.anomalies);
      setAnomaliesMessage(anomaliesRes.data.message);
    } else {
      setAnomaliesError(anomaliesRes.error || "Failed to load anomalies for dataset.");
    }
  };

  const handleDeleteDataset = async (uploadId: string) => {
    const res = await deleteUploadBatch(uploadId);
    if (res.success) {
      const historyRes = await fetchUploadHistory();
      const updated = historyRes.data || [];
      setUploadHistory(updated);

      if (billingSummary?.batch_id === uploadId) {
        setAiInsights(null);
        setAiError(null);
        setAiStatusCode(undefined);
        if (updated.length > 0) {
          await handleSelectDataset(updated[0].id);
        } else {
          handleReset();
        }
      }
    } else {
      setHistoryError(res.error || "Failed to delete upload batch.");
    }
  };

  const handleReset = () => {
    setBillingSummary(null);
    setAnomalies([]);
    setAnomaliesMessage("");
    setAnomaliesError(null);
    setAiInsights(null);
    setAiError(null);
    setAiStatusCode(undefined);
  };

  const handleGenerateAiInsights = async () => {
    if (!billingSummary?.batch_id) {
      setAiError("Please select or upload a billing dataset first.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setAiStatusCode(undefined);

    const res = await fetchAiBillingInsights(billingSummary.batch_id);
    setIsAiLoading(false);

    if (res.success && res.data) {
      setAiInsights(res.data);
    } else {
      setAiError(res.error || "Failed to generate AI insights.");
      setAiStatusCode(res.statusCode);
    }
  };

  // If currently validating active session on initial load
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Verifying CloudCost AI Session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, display login/register view
  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // Derived live StatCards or default sample mock data
  const statMetrics: StatMetric[] = billingSummary
    ? [
        {
          id: "live-total-spend",
          title: "Total Ingested Spend",
          value: `$${billingSummary.total_cost.toFixed(2)}`,
          subtext: `Calculated from ${billingSummary.total_rows} billed records in ${billingSummary.currency}`,
          change: "Live Ingestion",
          isPositive: true,
          isIncrease: false,
          category: "spend",
          dataSource: `File: ${billingSummary.filename}`,
          periodLabel: billingSummary.date_range
            ? `${billingSummary.date_range.start} → ${billingSummary.date_range.end}`
            : "Single Date",
        },
        {
          id: "live-valid-rows",
          title: "Valid Billing Rows",
          value: `${billingSummary.total_rows} Records`,
          subtext: "Validated schema records parsed into PostgreSQL",
          change: "100% Parsed",
          isPositive: true,
          isIncrease: false,
          category: "budget",
          dataSource: `Currency: ${billingSummary.currency}`,
          periodLabel: "0 Parse Errors",
        },
        {
          id: "live-services-count",
          title: "Tracked Cloud Services",
          value: `${Object.keys(billingSummary.service_totals).length} Services`,
          subtext: `Top driver: ${
            Object.entries(billingSummary.service_totals).sort((a, b) => b[1] - a[1])[0]?.[0] || "None"
          }`,
          change: "Multi-Cloud",
          isPositive: true,
          isIncrease: false,
          category: "change",
          dataSource: "FastAPI Engine",
          periodLabel: "Aggregated",
        },
        {
          id: "live-date-range",
          title: "Billing Period Range",
          value: billingSummary.date_range
            ? `${billingSummary.date_range.start.slice(5)} to ${billingSummary.date_range.end.slice(5)}`
            : "N/A",
          subtext: billingSummary.date_range
            ? `Covering ${billingSummary.date_range.start} through ${billingSummary.date_range.end}`
            : "No date range identified",
          change: `${Object.keys(billingSummary.daily_totals || {}).length} Days Total`,
          isPositive: true,
          isIncrease: false,
          category: "remaining",
          dataSource: "Parsed Timestamps",
          periodLabel: billingSummary.date_range
            ? billingSummary.date_range.start.slice(0, 4)
            : "2026",
        },
      ]
    : SAMPLE_STAT_METRICS;

  // Derived live service breakdown or default sample mock data
  const serviceBreakdownItems: ServiceCostItem[] = billingSummary
    ? Object.entries(billingSummary.service_totals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount], index) => {
          const percentage =
            billingSummary.total_cost > 0
              ? (amount / billingSummary.total_cost) * 100
              : 0;

          let provider: "AWS" | "GCP" | "Azure" | "Multi-Cloud" = "Multi-Cloud";
          const lower = name.toLowerCase();
          if (
            lower.includes("ec2") ||
            lower.includes("s3") ||
            lower.includes("rds") ||
            lower.includes("aws")
          ) {
            provider = "AWS";
          } else if (
            lower.includes("compute") ||
            lower.includes("storage") ||
            lower.includes("bigquery") ||
            lower.includes("gcp")
          ) {
            provider = "GCP";
          } else if (
            lower.includes("azure") ||
            lower.includes("blob") ||
            lower.includes("vm")
          ) {
            provider = "Azure";
          }

          return {
            name,
            amount,
            percentage,
            color: SERVICE_PALETTE[index % SERVICE_PALETTE.length],
            provider,
          };
        })
    : SAMPLE_SERVICE_BREAKDOWN;

  // Derived live daily spend chart data or default sample mock data
  const dailySpendItems: DailySpend[] =
    billingSummary && billingSummary.daily_totals
      ? Object.keys(billingSummary.daily_totals)
          .sort()
          .map((dateStr, idx) => ({
            day: idx + 1,
            dateStr,
            cost: billingSummary.daily_totals[dateStr],
          }))
      : SAMPLE_30_DAY_SPEND;

  const greetingName = currentUser.full_name || currentUser.email.split("@")[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Reusable Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeItem="overview"
      />

      {/* Main Content Area (Offset for desktop sidebar with lg:pl-64) */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Sticky Top Header with User Profile and Logout */}
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          title="Cloud Cost Overview"
          subtitle="Real-time multi-cloud FinOps spending analysis and live billing ingestion"
          user={currentUser}
          onLogout={handleLogout}
        />

        {/* Dashboard Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Welcome Banner / Context Ribbon */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    billingSummary
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {billingSummary
                    ? "Step 12: Grounded AI Advisor Active"
                    : "Step 12: Authenticated User"}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {billingSummary && billingSummary.date_range
                    ? `Period: ${billingSummary.date_range.start} to ${billingSummary.date_range.end}`
                    : "No dataset active"}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {billingSummary
                  ? `Active Dataset: ${billingSummary.filename}`
                  : `Welcome, ${greetingName}! 👋`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-normal max-w-2xl">
                {billingSummary
                  ? `Displaying private cloud cost figures for ${currentUser.email} (${billingSummary.total_rows} rows, $${billingSummary.total_cost.toFixed(2)} ${billingSummary.currency}).`
                  : "Upload a billing CSV or select a dataset from your history below to view your isolated FinOps metrics."}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {billingSummary ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Switch to Sample View</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sample View Active</span>
                </span>
              )}
            </div>
          </section>

          {/* Live Backend Connection Status Card */}
          <section aria-label="Backend Health Status">
            <BackendStatus variant="card" />
          </section>

          {/* Step 6 & 7: Billing CSV Upload & Ingestion Card */}
          <section aria-label="CSV Ingestion and Upload">
            <BillingUploadCard
              onUploadSuccess={handleUploadSuccess}
              onReset={handleReset}
              isDashboardLive={Boolean(billingSummary)}
            />
          </section>

          {/* Step 10: Billing Upload History & Dataset Management */}
          <section aria-label="Billing Upload Datasets History">
            <UploadHistory
              uploads={uploadHistory}
              activeBatchId={billingSummary?.batch_id}
              isLoading={isHistoryLoading}
              error={historyError}
              onSelect={handleSelectDataset}
              onDelete={handleDeleteDataset}
              onRefresh={loadUploadHistory}
            />
          </section>

          {/* 1. Overview Metric Cards Grid (4 Cards) */}
          <section
            aria-label="Overview Metrics"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {statMetrics.map((metric) => (
              <StatCard key={metric.id} metric={metric} />
            ))}
          </section>

          {/* 2. Visual Trends Section: Cost Chart & Service Breakdown */}
          <section
            aria-label="Cost Trends and Service Distribution"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Spending Trend (Takes 2 columns on desktop) */}
            <div className="lg:col-span-2">
              <CostChart
                data={dailySpendItems}
                isLive={Boolean(billingSummary)}
                currency={billingSummary?.currency || "USD"}
                sourceLabel={billingSummary?.filename}
              />
            </div>

            {/* Service Breakdown (Takes 1 column on desktop) */}
            <div className="lg:col-span-1">
              <ServiceBreakdown
                services={serviceBreakdownItems}
                isLive={Boolean(billingSummary)}
                currency={billingSummary?.currency || "USD"}
                sourceLabel={billingSummary?.filename}
              />
            </div>
          </section>

          {/* 3. Step 12 & 13: AI-Powered Billing Explanations & FinOps Recommendations Panel */}
          <section aria-label="AI-Powered Billing Explanations">
            <AiBillingExplainer
              insights={aiInsights}
              isLoading={isAiLoading}
              error={aiError}
              statusCode={aiStatusCode}
              activeBatchId={billingSummary?.batch_id}
              activeFilename={billingSummary?.filename}
              onGenerate={handleGenerateAiInsights}
            />
          </section>

          {/* 3b. Step 14: Asynchronous Background Jobs (Redis & Celery Worker) */}
          <section aria-label="Asynchronous Background Job Processing">
            <BackgroundJobCard />
          </section>

          {/* 4. Real Statistical Cost Anomalies Panel (PostgreSQL Driven) */}
          <section aria-label="Cost Anomalies and Statistical Insights">
            <AIInsights
              anomalies={anomalies}
              isLoading={isAnomaliesLoading}
              error={anomaliesError}
              message={anomaliesMessage}
              onRefresh={() => loadAnomalies(billingSummary?.batch_id)}
              hasUploadedData={Boolean(billingSummary)}
            />
          </section>

          {/* 5. Recent Activity / Billing Events Table (Sample Ledger) */}
          <section aria-label="Recent Billing Ledger Events">
            <RecentActivity events={SAMPLE_BILLING_EVENTS} />
          </section>
        </main>

        {/* Global Dashboard Footer */}
        <footer className="border-t border-slate-200 bg-white py-5 px-4 sm:px-6 lg:px-8 text-center sm:text-left text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>CloudCost AI</strong> — Intelligent FinOps Platform.{" "}
            {billingSummary
              ? `Live data connected from ${billingSummary.filename}.`
              : "Showing finops dashboard. Upload CSV or select dataset for live metrics."}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Next.js 16 (App Router)</span>
            <span>•</span>
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>PostgreSQL</span>
            <span>•</span>
            <span>LLM AI Advisor (Step 12)</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
