"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Package,
  CheckCircle2,
  Clock,
  TrendingUp,
  Leaf,
  ArrowRight,
  Users,
  DollarSign,
  ShoppingCart,
  BarChart3,
  AlertCircle,
} from "lucide-react";

// Mock data for dashboard stats
const MOCK_STATS = {
  activeRfqs: 4,
  totalQuotes: 12,
  pendingReview: 3,
  awardedOrders: 8,
  carbonSavings: 45,
  totalSpend: 1250000,
  avgSavings: 18,
  suppliersEngaged: 24,
};

// Mock data for recent RFQs
const MOCK_RECENT_RFQS = [
  {
    id: "RFQ-1024",
    title: "Recycled Steel Beams for Office Complex",
    status: "Open",
    quotes: 5,
    date: "2 days ago",
    deadline: "Jan 25, 2026",
  },
  {
    id: "RFQ-1023",
    title: "Low-Carbon Concrete - Phase 2",
    status: "Reviewing",
    quotes: 3,
    date: "1 week ago",
    deadline: "Jan 20, 2026",
  },
  {
    id: "RFQ-1021",
    title: "Solar Panel Installation",
    status: "Draft",
    quotes: 0,
    date: "2 weeks ago",
    deadline: "Feb 01, 2026",
  },
];

// Mock data for recent orders
const MOCK_ORDERS = [
  {
    id: "ORD-2045",
    rfqId: "RFQ-1020",
    supplier: "EcoSteel Corp",
    product: "Recycled Steel Beams",
    amount: 45000,
    status: "Delivered",
    date: "Jan 10, 2026",
  },
  {
    id: "ORD-2044",
    rfqId: "RFQ-1018",
    supplier: "GreenCement Ltd",
    product: "Low-Carbon Concrete Mix",
    amount: 32500,
    status: "In Transit",
    date: "Jan 08, 2026",
  },
  {
    id: "ORD-2043",
    rfqId: "RFQ-1015",
    supplier: "SolarTech Inc",
    product: "Solar Panels (200 units)",
    amount: 125000,
    status: "Processing",
    date: "Jan 05, 2026",
  },
];

// Mock data for supplier comparison preview
const MOCK_TOP_SUPPLIERS = [
  {
    id: "sup-1",
    name: "EcoSteel Corp",
    tier: "premium",
    rating: 4.9,
    carbonScore: 85,
    responseTime: "< 24h",
    ordersCompleted: 15,
  },
  {
    id: "sup-2",
    name: "GreenCement Ltd",
    tier: "premium",
    rating: 4.8,
    carbonScore: 92,
    responseTime: "< 24h",
    ordersCompleted: 12,
  },
  {
    id: "sup-3",
    name: "SolarTech Inc",
    tier: "standard",
    rating: 4.7,
    carbonScore: 78,
    responseTime: "24-48h",
    ordersCompleted: 8,
  },
];

// Mock activity feed data
const MOCK_ACTIVITY = [
  {
    id: 1,
    type: "quote",
    msg: "New quote received from EcoSteel Corp for RFQ-1024",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "status",
    msg: 'RFQ-1023 "Low-Carbon Concrete" is expiring in 24 hours.',
    time: "5 hours ago",
  },
  {
    id: 3,
    type: "order",
    msg: "Order ORD-2045 has been delivered successfully.",
    time: "1 day ago",
  },
  {
    id: 4,
    type: "system",
    msg: "Your deposit verification was successful.",
    time: "2 days ago",
  },
];

export default function BuyerDashboardOverview() {
  const [stats] = useState(MOCK_STATS);
  const [recentRfqs] = useState(MOCK_RECENT_RFQS);
  const [recentOrders] = useState(MOCK_ORDERS);
  const [topSuppliers] = useState(MOCK_TOP_SUPPLIERS);
  const [activity] = useState(MOCK_ACTIVITY);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-green-100 text-green-700";
      case "Reviewing":
        return "bg-amber-100 text-amber-700";
      case "Draft":
        return "bg-slate-200 text-slate-600";
      case "Delivered":
        return "bg-emerald-100 text-emerald-700";
      case "In Transit":
        return "bg-blue-100 text-blue-700";
      case "Processing":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "quote":
        return "Q";
      case "status":
        return "!";
      case "order":
        return "📦";
      case "system":
        return "✓";
      default:
        return "•";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "quote":
        return "bg-emerald-100 text-emerald-600";
      case "status":
        return "bg-amber-100 text-amber-600";
      case "order":
        return "bg-blue-100 text-blue-600";
      case "system":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="gc-hero-title text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-teal-600 mb-2">
              Buyer Dashboard
            </h1>
            <p className="gc-hero-subtitle text-slate-600">
              Manage your sustainable sourcing projects, RFQs, and orders.
            </p>
          </div>
          <Link
            href="/dashboard/buyer/rfqs/new"
            className="gc-btn gc-btn-primary"
          >
            + Create New RFQ
          </Link>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="gc-card p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active RFQs
              </div>
            </div>
            <div className="font-bold text-3xl text-slate-800">{stats.activeRfqs}</div>
          </div>

          <div className="gc-card p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                New Quotes
              </div>
            </div>
            <div className="font-bold text-3xl text-slate-800">{stats.totalQuotes}</div>
          </div>

          <div className="gc-card p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pending Review
              </div>
            </div>
            <div className="font-bold text-3xl text-slate-800">{stats.pendingReview}</div>
          </div>

          <div className="gc-card p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Awarded Orders
              </div>
            </div>
            <div className="font-bold text-3xl text-slate-800">{stats.awardedOrders}</div>
          </div>
        </div>

        {/* Secondary Stats (Impact & Savings) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="gc-card p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 uppercase">Carbon Saved</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700">{stats.carbonSavings}%</div>
            <div className="text-xs text-emerald-600">vs. conventional materials</div>
          </div>

          <div className="gc-card p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-700 uppercase">Total Spend</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">${(stats.totalSpend / 1000).toFixed(0)}K</div>
            <div className="text-xs text-blue-600">YTD procurement</div>
          </div>

          <div className="gc-card p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-700 uppercase">Avg Savings</span>
            </div>
            <div className="text-2xl font-bold text-purple-700">{stats.avgSavings}%</div>
            <div className="text-xs text-purple-600">below market average</div>
          </div>

          <div className="gc-card p-4 bg-gradient-to-br from-slate-50 to-gray-50 border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-700 uppercase">Suppliers</span>
            </div>
            <div className="text-2xl font-bold text-slate-700">{stats.suppliersEngaged}</div>
            <div className="text-xs text-slate-600">engaged this year</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent RFQs - Takes 2 columns */}
          <div className="lg:col-span-2 gc-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">RFQ Management</h2>
              <Link
                href="/dashboard/buyer/rfqs"
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentRfqs.map((rfq) => (
                <Link
                  key={rfq.id}
                  href={`/dashboard/buyer/rfqs/${rfq.id}`}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer border border-slate-100"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{rfq.title}</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      {rfq.id} • Created {rfq.date} • Due: {rfq.deadline}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded mb-1 inline-block ${getStatusColor(rfq.status)}`}
                    >
                      {rfq.status}
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold">
                      {rfq.quotes > 0 ? `${rfq.quotes} Quotes` : "No quotes yet"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/buyer/rfqs?status=open"
                  className="gc-btn gc-btn-ghost text-sm py-2 px-3"
                >
                  <AlertCircle className="w-4 h-4 mr-1" /> Open RFQs ({stats.activeRfqs})
                </Link>
                <Link
                  href="/dashboard/buyer/rfqs?status=reviewing"
                  className="gc-btn gc-btn-ghost text-sm py-2 px-3"
                >
                  <Clock className="w-4 h-4 mr-1" /> Pending Review ({stats.pendingReview})
                </Link>
                <Link
                  href="/dashboard/buyer/rfqs/new"
                  className="gc-btn gc-btn-secondary text-sm py-2 px-3"
                >
                  + New RFQ
                </Link>
              </div>
            </div>
          </div>

          {/* Activity Feed - Takes 1 column */}
          <div className="gc-card p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Activity Feed</h2>
            <div className="space-y-5">
              {activity.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${getActivityColor(item.type)}`}
                  >
                    {getActivityIcon(item.type)}
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {item.msg}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order History & Supplier Comparison Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="gc-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-slate-600" />
                Order History
              </h2>
              <Link
                href="/dashboard/buyer/orders"
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{order.product}</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      {order.id} • {order.supplier} • {order.date}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded mb-1 inline-block ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      ${order.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier Comparison Preview */}
          <div className="gc-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-600" />
                Top Suppliers
              </h2>
              <Link
                href="/dashboard/buyer/suppliers"
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm flex items-center gap-1"
              >
                Compare All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {topSuppliers.map((supplier, index) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {supplier.name}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                            supplier.tier === "premium"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {supplier.tier}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        ⭐ {supplier.rating} • {supplier.ordersCompleted} orders • {supplier.responseTime}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Leaf className="w-4 h-4" />
                      <span className="font-bold text-sm">{supplier.carbonScore}</span>
                    </div>
                    <div className="text-xs text-slate-500">Eco Score</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link
                href="/dashboard/buyer/suppliers/compare"
                className="gc-btn gc-btn-secondary w-full justify-center"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Compare Suppliers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
