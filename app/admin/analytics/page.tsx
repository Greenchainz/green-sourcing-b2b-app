"use client";

import React from "react";
import MetricCard from "../../components/admin/MetricCard";

export default function AdminAnalyticsPage() {
  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">
          Platform Analytics
        </h1>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <MetricCard
            title="Avg Response Time (Premium)"
            value="4.2 hrs"
            className="bg-emerald-50 border-emerald-100"
          />
          <MetricCard title="Avg Response Time (Free)" value="28.5 hrs" />
          <MetricCard
            title="Conversion Rate"
            value="18.5%"
            trend={{ value: 2.1, isPositive: true }}
          />
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="gc-card p-6 h-80 flex flex-col items-center justify-center bg-white/60">
            <div className="text-slate-400 font-bold mb-2">Revenue vs Time</div>
            <div className="w-full h-full bg-slate-50 border border-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
              [Line Chart Placeholder]
            </div>
          </div>
          <div className="gc-card p-6 h-80 flex flex-col items-center justify-center bg-white/60">
            <div className="text-slate-400 font-bold mb-2">
              Supplier Tier Distribution
            </div>
            <div className="w-full h-full bg-slate-50 border border-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
              [Pie Chart Placeholder]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
