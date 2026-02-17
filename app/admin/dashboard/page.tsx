"use client";
import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
} from "lucide-react";

interface Analytics {
  overview: {
    total_users: number;
    total_suppliers: number;
    total_rfqs: number;
    total_materials: number;
    active_rfqs: number;
    monthly_recurring_revenue: number;
  };
  revenue: {
    by_tier: Array<{
      tier: string;
      subscriber_count: number;
      monthly_revenue: number;
    }>;
    total_mrr: number;
  };
  growth: {
    user_signups: Array<{
      date: string;
      new_users: number;
    }>;
  };
  rfqs: {
    by_status: Array<{
      status: string;
      count: number;
      avg_days_to_close: number;
    }>;
  };
  suppliers: {
    total_suppliers: number;
    premium_suppliers: number;
    avg_service_radius: number;
    unique_locations: number;
  };
  top_materials: Array<{
    name: string;
    category: string;
    request_count: number;
  }>;
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  const { overview, revenue, rfqs, suppliers, top_materials } = analytics;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[#111111] dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="day">Last 24 Hours</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          title="Total Users"
          value={overview.total_users.toLocaleString()}
          color="blue"
        />
        <MetricCard
          icon={<Building2 className="w-6 h-6" />}
          title="Total Suppliers"
          value={overview.total_suppliers.toLocaleString()}
          subtitle={`${suppliers.premium_suppliers} premium`}
          color="green"
        />
        <MetricCard
          icon={<FileText className="w-6 h-6" />}
          title="Total RFQs"
          value={overview.total_rfqs.toLocaleString()}
          subtitle={`${overview.active_rfqs} active`}
          color="purple"
        />
        <MetricCard
          icon={<Package className="w-6 h-6" />}
          title="Materials Catalog"
          value={overview.total_materials.toLocaleString()}
          color="orange"
        />
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Monthly Recurring Revenue"
          value={`$${overview.monthly_recurring_revenue.toLocaleString()}`}
          color="emerald"
        />
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Avg Service Radius"
          value={`${Math.round(suppliers.avg_service_radius || 0)} km`}
          subtitle={`${suppliers.unique_locations} locations`}
          color="indigo"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-[#111111] dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Revenue by Tier
        </h2>
        <div className="space-y-3">
          {revenue.by_tier.map((tier) => (
            <div
              key={tier.tier}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                  {tier.tier}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tier.subscriber_count} subscribers
                </p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${parseFloat(tier.monthly_revenue || "0").toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* RFQ Statistics */}
      <div className="bg-[#111111] dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          RFQ Status Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rfqs.by_status.map((status) => (
            <div
              key={status.status}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {status.status}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {status.count}
              </p>
              {status.avg_days_to_close && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Avg: {Math.round(status.avg_days_to_close)} days to close
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Materials */}
      <div className="bg-[#111111] dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Top Requested Materials
        </h2>
        <div className="space-y-2">
          {top_materials.map((material, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {material.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {material.category}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {material.request_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">requests</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  color: "blue" | "green" | "purple" | "orange" | "emerald" | "indigo";
}

function MetricCard({ icon, title, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
  };

  return (
    <div className="bg-[#111111] dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
