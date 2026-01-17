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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
          <MetricCard
            title="Churn Rate"
            value="2.4%"
            trend={{ value: 0.5, isPositive: false }}
          />
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="gc-card p-6 h-80 flex flex-col items-center justify-center bg-white/60">
            <div className="text-slate-400 font-bold mb-2">Revenue vs Time</div>
            <div className="w-full h-full bg-slate-50 border border-slate-100 rounded flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <span>[Line Chart: Revenue Growth]</span>
              <div className="flex gap-4 items-end h-32 w-48 justify-between px-4 pb-2 border-b border-l border-slate-300">
                   <div className="w-4 bg-emerald-200 h-10"></div>
                   <div className="w-4 bg-emerald-300 h-16"></div>
                   <div className="w-4 bg-emerald-400 h-24"></div>
                   <div className="w-4 bg-emerald-500 h-20"></div>
                   <div className="w-4 bg-emerald-600 h-28"></div>
              </div>
            </div>
          </div>
          <div className="gc-card p-6 h-80 flex flex-col items-center justify-center bg-white/60">
            <div className="text-slate-400 font-bold mb-2">
              Supplier Tier Distribution
            </div>
            <div className="w-full h-full bg-slate-50 border border-slate-100 rounded flex flex-col items-center justify-center text-xs text-slate-400 gap-4">
               <span>[Pie Chart]</span>
               <div className="relative w-32 h-32 rounded-full border-8 border-emerald-500 border-t-emerald-300 border-r-emerald-200 transform rotate-45"></div>
               <div className="flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500"></div>Premium</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-300"></div>Standard</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-200"></div>Free</span>
               </div>
            </div>
          </div>
        </div>

        {/* Search Terms Table */}
         <div className="gc-card p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Top Search Terms</h2>
            <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                            <th className="pb-2">Term</th>
                            <th className="pb-2 text-right">Searches</th>
                            <th className="pb-2 text-right">Conversion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {[
                            { term: "low carbon concrete", count: 1240, conv: "12%" },
                            { term: "recycled steel", count: 850, conv: "8%" },
                            { term: "bamboo flooring", count: 620, conv: "15%" },
                            { term: "solar glass", count: 410, conv: "5%" },
                        ].map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                                <td className="py-2 font-medium text-slate-700">{row.term}</td>
                                <td className="py-2 text-right text-slate-600">{row.count}</td>
                                <td className="py-2 text-right text-emerald-600 font-semibold">{row.conv}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
