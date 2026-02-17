"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  BarChart3,
  Shield,
  Settings,
} from "lucide-react";

// Mock data for admin dashboard
const MOCK_PLATFORM_STATS = {
  totalUsers: 1247,
  totalBuyers: 856,
  totalSuppliers: 391,
  activeRfqs: 127,
  totalOrders: 3542,
  platformRevenue: 2850000,
  avgOrderValue: 45000,
  userGrowth: 18,
};

const MOCK_RECENT_ACTIVITY = [
  {
    id: 1,
    type: "user",
    msg: "New supplier registered: EcoSteel Corp",
    time: "10 minutes ago",
    status: "pending",
  },
  {
    id: 2,
    type: "order",
    msg: "Large order completed: $125K (ORD-2045)",
    time: "1 hour ago",
    status: "success",
  },
  {
    id: 3,
    type: "alert",
    msg: "Supplier verification needed: GreenCement Ltd",
    time: "2 hours ago",
    status: "warning",
  },
  {
    id: 4,
    type: "system",
    msg: "System backup completed successfully",
    time: "3 hours ago",
    status: "success",
  },
];

const MOCK_PENDING_ACTIONS = [
  {
    id: 1,
    title: "Verify 3 new supplier accounts",
    priority: "high",
    count: 3,
  },
  {
    id: 2,
    title: "Review flagged product listings",
    priority: "medium",
    count: 7,
  },
  {
    id: 3,
    title: "Approve pending RFQ modifications",
    priority: "low",
    count: 2,
  },
];

export default function AdminDashboard() {
  const [stats] = useState(MOCK_PLATFORM_STATS);
  const [activity] = useState(MOCK_RECENT_ACTIVITY);
  const [pendingActions] = useState(MOCK_PENDING_ACTIONS);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user":
        return <Users className="w-4 h-4" />;
      case "order":
        return <Package className="w-4 h-4" />;
      case "alert":
        return <AlertCircle className="w-4 h-4" />;
      case "system":
        return <Settings className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-emerald-100 text-emerald-600";
      case "warning":
        return "bg-amber-100 text-amber-600";
      case "pending":
        return "bg-blue-100 text-blue-600";
      default:
        return "bg-[#1a1a1a] text-slate-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-amber-100 text-amber-700";
      case "low":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-[#1a1a1a] text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-slate-400">
              Manage the GreenChainz platform, users, and operations.
            </p>
          </div>
          <Link
            href="/dashboard/admin/settings"
            className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </Link>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Users
              </div>
            </div>
            <div className="font-bold text-3xl text-slate-100">{stats.totalUsers}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.totalBuyers} buyers, {stats.totalSuppliers} suppliers
            </div>
          </div>

          <div className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active RFQs
              </div>
            </div>
            <div className="font-bold text-3xl text-slate-100">{stats.activeRfqs}</div>
          </div>

          <div className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Orders
              </div>
            </div>
            <div className="font-bold text-3xl text-slate-100">{stats.totalOrders}</div>
          </div>

          <div className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Platform Revenue
              </div>
            </div>
            <div className="font-bold text-3xl text-slate-100">
              ${(stats.platformRevenue / 1000000).toFixed(1)}M
            </div>
          </div>
        </div>

        {/* Growth & Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-700 uppercase">User Growth</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">+{stats.userGrowth}%</div>
            <div className="text-xs text-blue-600">vs. last month</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 uppercase">Avg Order</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700">${(stats.avgOrderValue / 1000).toFixed(0)}K</div>
            <div className="text-xs text-emerald-600">per transaction</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-700 uppercase">Suppliers</span>
            </div>
            <div className="text-2xl font-bold text-purple-700">{stats.totalSuppliers}</div>
            <div className="text-xs text-purple-600">verified accounts</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase">Compliance</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">98.5%</div>
            <div className="text-xs text-amber-600">verification rate</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Actions */}
          <div className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-semibold text-white">Pending Actions</h3>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {pendingActions.reduce((sum, action) => sum + action.count, 0)} items
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 hover:bg-[#0a0a0a] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">{action.title}</h4>
                      <span
                        className={`inline-block mt-2 text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(
                          action.priority
                        )}`}
                      >
                        {action.priority} priority
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-300">{action.count}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 bg-[#0a0a0a] border-t border-white/5">
              <Link
                href="/dashboard/admin/users"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all actions →
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-[#0a0a0a] transition-colors flex items-start gap-4"
                >
                  <div className={`mt-1 p-2 rounded-full ${getActivityColor(item.status)}`}>
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.msg}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 bg-[#0a0a0a] border-t border-white/5">
              <Link
                href="/dashboard/admin/analytics"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View full activity log →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/admin/users"
            className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 p-5 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <Users className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-white">Manage Users</h4>
            <p className="text-xs text-slate-500 mt-1">View and manage all platform users</p>
          </Link>

          <Link
            href="/dashboard/admin/analytics"
            className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
          >
            <BarChart3 className="w-8 h-8 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-white">Analytics</h4>
            <p className="text-xs text-slate-500 mt-1">View platform metrics and insights</p>
          </Link>

          <Link
            href="/dashboard/admin/settings"
            className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 p-5 hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <Settings className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-white">Settings</h4>
            <p className="text-xs text-slate-500 mt-1">Configure platform settings</p>
          </Link>

          <Link
            href="/dashboard/admin/users?filter=pending"
            className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 p-5 hover:border-amber-300 hover:shadow-md transition-all group"
          >
            <Shield className="w-8 h-8 text-amber-600 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-white">Verifications</h4>
            <p className="text-xs text-slate-500 mt-1">Review pending verifications</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
