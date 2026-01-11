'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Clock, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function SupplierDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/supplier/dashboard')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500">Welcome back, here's what's happening with your products.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Profile Views"
          value={stats?.profileViews || 0}
          trend="+12%"
          trendUp={true}
          icon={<ArrowUpRight className="text-blue-500" />}
        />
        <StatCard
          label="Active RFQs"
          value={stats?.rfqsReceived || 0}
          trend="3 New"
          trendUp={true}
          icon={<Clock className="text-amber-500" />}
        />
        <StatCard
          label="Response Rate"
          value={`${stats?.responseRate || 0}%`}
          trend="-2%"
          trendUp={false}
          icon={<CheckCircle2 className="text-green-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Action Items */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Action Required</h3>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">High Priority</span>
          </div>
          <div className="divide-y divide-slate-100">
            {stats?.actionItems?.map((item: any) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 cursor-pointer">
                 <div className={`mt-1 p-2 rounded-full ${item.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    <AlertTriangle size={16} />
                 </div>
                 <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-900">{item.message}</h4>
                    <p className="text-xs text-slate-500 mt-1">Due in 2 days</p>
                 </div>
                 <ChevronRight size={16} className="text-slate-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity (Placeholder) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <h3 className="font-semibold text-slate-900 mb-4">Market Trends</h3>
           <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
              <p className="text-slate-400 text-sm">Analytics Graph Placeholder</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, trendUp, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{value}</h3>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend}
        </span>
        <span className="text-xs text-slate-400">vs last month</span>
      </div>
    </div>
  );
}
