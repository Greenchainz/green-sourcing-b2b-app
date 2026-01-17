"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare,
  DollarSign,
  Users,
  Calendar,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

interface AnalyticsData {
  profile_views: number;
  profile_views_change: number;
  rfqs_received: number;
  rfqs_change: number;
  quotes_sent: number;
  quotes_change: number;
  win_rate: number;
  win_rate_change: number;
  revenue_potential: number;
  top_materials: { name: string; count: number }[];
  monthly_views: { month: string; views: number }[];
  rfq_by_status: { status: string; count: number }[];
}

const MOCK_DATA: AnalyticsData = {
  profile_views: 1247,
  profile_views_change: 12,
  rfqs_received: 45,
  rfqs_change: 8,
  quotes_sent: 32,
  quotes_change: -3,
  win_rate: 28,
  win_rate_change: 5,
  revenue_potential: 125000,
  top_materials: [
    { name: "Eco-Batt Insulation", count: 18 },
    { name: "Bamboo Flooring", count: 12 },
    { name: "Recycled Steel", count: 9 },
    { name: "Low-Carbon Concrete", count: 6 },
  ],
  monthly_views: [
    { month: "Aug", views: 820 },
    { month: "Sep", views: 945 },
    { month: "Oct", views: 1102 },
    { month: "Nov", views: 1050 },
    { month: "Dec", views: 1180 },
    { month: "Jan", views: 1247 },
  ],
  rfq_by_status: [
    { status: "Pending", count: 8 },
    { status: "Quoted", count: 12 },
    { status: "Won", count: 9 },
    { status: "Lost", count: 16 },
  ],
};

export default function SupplierAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    // Mock fetch - replace with real API
    setTimeout(() => {
      setData(MOCK_DATA);
      setLoading(false);
    }, 500);
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  if (!data) return null;

  const maxViews = Math.max(...data.monthly_views.map((m) => m.views));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-600">
            Track your performance and identify opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-400" />
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Profile Views"
          value={data.profile_views.toLocaleString()}
          change={data.profile_views_change}
          icon={<Eye className="h-6 w-6 text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <MetricCard
          title="RFQs Received"
          value={data.rfqs_received.toString()}
          change={data.rfqs_change}
          icon={<MessageSquare className="h-6 w-6 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <MetricCard
          title="Quotes Sent"
          value={data.quotes_sent.toString()}
          change={data.quotes_change}
          icon={<DollarSign className="h-6 w-6 text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Win Rate"
          value={`${data.win_rate}%`}
          change={data.win_rate_change}
          icon={<Users className="h-6 w-6 text-green-600" />}
          iconBg="bg-green-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Views Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-900">Profile Views</h2>
              <p className="text-sm text-slate-500">Monthly view trends</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <TrendingUp className="h-4 w-4" />
              +{data.profile_views_change}% this month
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-48">
            {data.monthly_views.map((month, index) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    index === data.monthly_views.length - 1
                      ? "bg-forest-600"
                      : "bg-slate-200"
                  }`}
                  style={{ height: `${(month.views / maxViews) * 100}%` }}
                />
                <span className="text-xs text-slate-500">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RFQ Status Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="font-semibold text-slate-900">RFQ Status</h2>
            <p className="text-sm text-slate-500">Current breakdown</p>
          </div>

          <div className="space-y-4">
            {data.rfq_by_status.map((item) => {
              const total = data.rfq_by_status.reduce((sum, i) => sum + i.count, 0);
              const percentage = Math.round((item.count / total) * 100);
              const colors: Record<string, string> = {
                Pending: "bg-blue-500",
                Quoted: "bg-amber-500",
                Won: "bg-green-500",
                Lost: "bg-slate-300",
              };

              return (
                <div key={item.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.status}</span>
                    <span className="font-medium text-slate-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[item.status] || "bg-slate-400"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total RFQs</span>
              <span className="text-lg font-bold text-slate-900">
                {data.rfq_by_status.reduce((sum, i) => sum + i.count, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Top Materials */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-900">Top Requested Materials</h2>
              <p className="text-sm text-slate-500">Most popular in your catalog</p>
            </div>
            <button className="text-sm text-forest-600 hover:text-forest-700 font-medium flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {data.top_materials.map((material, index) => (
              <div
                key={material.name}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-forest-100 text-forest-700 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-900">{material.name}</span>
                </div>
                <span className="text-sm text-slate-500">{material.count} requests</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Potential */}
        <div className="bg-gradient-to-br from-forest-600 to-forest-800 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/10 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Revenue Potential</h2>
              <p className="text-sm text-forest-100">Estimated from active RFQs</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-4xl font-bold">
              ${data.revenue_potential.toLocaleString()}
            </p>
            <p className="text-forest-200 text-sm mt-1">
              Based on {data.rfqs_received} active opportunities
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-2xl font-bold">{data.win_rate}%</p>
              <p className="text-sm text-forest-200">Win Rate</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-2xl font-bold">
                ${Math.round(data.revenue_potential / data.rfqs_received).toLocaleString()}
              </p>
              <p className="text-sm text-forest-200">Avg. Deal Size</p>
            </div>
          </div>

          <button className="w-full mt-6 py-3 bg-white text-forest-700 font-bold rounded-lg hover:bg-forest-50 transition-colors">
            View Opportunities
          </button>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Improve Your Performance
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Suppliers with complete profiles and verified certifications receive 3x
              more RFQ requests.
            </p>
            <button className="text-sm font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1">
              Complete Your Profile <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon,
  iconBg,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  iconBg: string;
}) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${iconBg}`}>{icon}</div>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            isPositive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isPositive ? "+" : ""}
          {change}%
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{title}</p>
    </div>
  );
}
