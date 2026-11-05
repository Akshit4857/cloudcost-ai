import {
  StatMetric,
  DailySpend,
  ServiceCostItem,
  AIInsight,
  BillingEvent,
} from "../types/dashboard";

export const SAMPLE_STAT_METRICS: StatMetric[] = [
  {
    id: "total-spend",
    title: "Total Cloud Spend",
    value: "$24,850.00",
    subtext: "Current Billing Cycle (Month-to-Date)",
    change: "+8.4%",
    isPositive: false, // higher spend is generally attention-needed
    isIncrease: true,
    category: "spend",
  },
  {
    id: "monthly-budget",
    title: "Monthly Budget",
    value: "$30,000.00",
    subtext: "Approved FinOps Ceiling for Oct 2026",
    change: "Target Set",
    isPositive: true,
    isIncrease: false,
    category: "budget",
  },
  {
    id: "budget-remaining",
    title: "Budget Remaining",
    value: "$5,150.00",
    subtext: "17.2% budget left for 4 days remaining",
    change: "On Track",
    isPositive: true,
    isIncrease: false,
    category: "remaining",
  },
  {
    id: "mom-change",
    title: "Month-over-Month Change",
    value: "+$1,920.00",
    subtext: "vs. September 2026 total spend ($22,930)",
    change: "+8.4% MoM",
    isPositive: false,
    isIncrease: true,
    category: "change",
  },
];

// 30 days sample daily spend (Sample dummy figures around $700-$1050/day)
export const SAMPLE_30_DAY_SPEND: DailySpend[] = [
  { day: 1, dateStr: "Oct 01", cost: 740 },
  { day: 2, dateStr: "Oct 02", cost: 765 },
  { day: 3, dateStr: "Oct 03", cost: 780 },
  { day: 4, dateStr: "Oct 04", cost: 710 },
  { day: 5, dateStr: "Oct 05", cost: 730 },
  { day: 6, dateStr: "Oct 06", cost: 790 },
  { day: 7, dateStr: "Oct 07", cost: 810 },
  { day: 8, dateStr: "Oct 08", cost: 795 },
  { day: 9, dateStr: "Oct 09", cost: 820 },
  { day: 10, dateStr: "Oct 10", cost: 840 },
  { day: 11, dateStr: "Oct 11", cost: 815 },
  { day: 12, dateStr: "Oct 12", cost: 790 },
  { day: 13, dateStr: "Oct 13", cost: 830 },
  { day: 14, dateStr: "Oct 14", cost: 860 },
  { day: 15, dateStr: "Oct 15", cost: 920 }, // slight surge
  { day: 16, dateStr: "Oct 16", cost: 980 }, // anomaly surge
  { day: 17, dateStr: "Oct 17", cost: 1040 }, // spike
  { day: 18, dateStr: "Oct 18", cost: 910 },
  { day: 19, dateStr: "Oct 19", cost: 840 },
  { day: 20, dateStr: "Oct 20", cost: 810 },
  { day: 21, dateStr: "Oct 21", cost: 790 },
  { day: 22, dateStr: "Oct 22", cost: 815 },
  { day: 23, dateStr: "Oct 23", cost: 830 },
  { day: 24, dateStr: "Oct 24", cost: 845 },
  { day: 25, dateStr: "Oct 25", cost: 805 },
  { day: 26, dateStr: "Oct 26", cost: 820 },
  { day: 27, dateStr: "Oct 27", cost: 835 },
  { day: 28, dateStr: "Oct 28", cost: 850 },
  { day: 29, dateStr: "Oct 29", cost: 860 },
  { day: 30, dateStr: "Oct 30", cost: 875 },
];

export const SAMPLE_SERVICE_BREAKDOWN: ServiceCostItem[] = [
  {
    name: "Compute (EC2 / Cloud Run / VMs)",
    amount: 12425,
    percentage: 50,
    color: "bg-blue-600",
    provider: "AWS",
  },
  {
    name: "Storage (S3 / Cloud Storage / Disks)",
    amount: 4970,
    percentage: 20,
    color: "bg-amber-500",
    provider: "AWS",
  },
  {
    name: "Database (RDS / Cloud SQL / DynamoDB)",
    amount: 3728,
    percentage: 15,
    color: "bg-emerald-600",
    provider: "Multi-Cloud",
  },
  {
    name: "Networking (NAT Gateways / Data Transfer)",
    amount: 2485,
    percentage: 10,
    color: "bg-purple-600",
    provider: "GCP",
  },
  {
    name: "Other (Monitoring, KMS, Support)",
    amount: 1242,
    percentage: 5,
    color: "bg-slate-400",
    provider: "Azure",
  },
];

export const SAMPLE_AI_INSIGHTS: AIInsight[] = [
  {
    id: "insight-1",
    type: "warning",
    category: "Compute",
    title: "Unusual Compute Cost Spike in us-east-1",
    description:
      "Compute expenditure surged by +34% between Oct 15-17. Automated tagging suggests 4 unstopped GPU training instances (g5.4xlarge) were left active during off-hours.",
    estimatedImpact: "+$640/week waste",
    badgeText: "High Impact Spike",
  },
  {
    id: "insight-2",
    type: "opportunity",
    category: "Idle Resources",
    title: "Idle Unattached Storage & NAT Gateways",
    description:
      "Detected 5 unattached AWS EBS volumes (gp2) and 2 idle VPC NAT Gateways with near-zero egress traffic over the last 21 consecutive days.",
    estimatedImpact: "~$240/month savings",
    badgeText: "Quick Win",
  },
  {
    id: "insight-3",
    type: "trend",
    category: "Storage",
    title: "S3 Storage Tier Optimization Opportunity",
    description:
      "Over 14 TB of raw telemetry logs in Amazon S3 Standard have not been accessed in over 90 days. Moving to S3 Glacier Instant Retrieval would maintain availability while reducing unit storage costs.",
    estimatedImpact: "~$310/month savings",
    badgeText: "Lifecycle Rule",
  },
];

export const SAMPLE_BILLING_EVENTS: BillingEvent[] = [
  {
    id: "evt-1",
    date: "Oct 30, 2026",
    service: "Amazon EC2 (us-east-1)",
    provider: "AWS",
    description: "Daily compute run with auto-scaling cluster",
    amount: "$412.50",
    status: "Normal",
  },
  {
    id: "evt-2",
    date: "Oct 29, 2026",
    service: "Google BigQuery Storage",
    provider: "GCP",
    description: "Analytical warehouse query scan & streaming insert",
    amount: "$88.20",
    status: "Normal",
  },
  {
    id: "evt-3",
    date: "Oct 27, 2026",
    service: "AWS EC2 On-Demand Spike",
    provider: "AWS",
    description: "Detected anomaly: unexpected surge in unreserved instances",
    amount: "$980.00",
    status: "Alert",
  },
  {
    id: "evt-4",
    date: "Oct 25, 2026",
    service: "Azure Cosmos DB",
    provider: "Azure",
    description: "Autoscale throughput provisioned partition",
    amount: "$145.80",
    status: "Normal",
  },
  {
    id: "evt-5",
    date: "Oct 22, 2026",
    service: "Amazon S3 Intelligent Tiering",
    provider: "AWS",
    description: "Automated archive transition saved 28% unit storage fee",
    amount: "-$94.00",
    status: "Optimized",
  },
];
