export interface StatMetric {
  id: string;
  title: string;
  value: string;
  subtext: string;
  change: string;
  isPositive: boolean; // positive change in cost vs negative (saving)
  isIncrease: boolean;
  category: "spend" | "budget" | "remaining" | "change";
  dataSource?: string;
  periodLabel?: string;
}

export interface DailySpend {
  day: number;
  dateStr: string;
  cost: number;
}

export interface ServiceCostItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  provider: "AWS" | "GCP" | "Azure" | "Multi-Cloud";
}

export interface AIInsight {
  id: string;
  type: "warning" | "opportunity" | "trend";
  category: "Compute" | "Idle Resources" | "Storage";
  title: string;
  description: string;
  estimatedImpact: string;
  badgeText: string;
}

export interface BillingEvent {
  id: string;
  date: string;
  service: string;
  provider: "AWS" | "GCP" | "Azure";
  description: string;
  amount: string;
  status: "Normal" | "Alert" | "Optimized";
}
