"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag,
  MapPin,
  Clock,
  ChevronRight,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface RFQ {
  id: string;
  project_name: string;
  project_location: string;
  material_type: string;
  quantity: string;
  deadline: string;
  status: "open" | "closed" | "quoted";
  distance_miles?: number;
  created_at: string;
  architect_name?: string;
}

interface DashboardStats {
  active_rfqs: number;
  quotes_sent: number;
  views: number;
  win_rate: number;
}

export default function SupplierDashboard() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    active_rfqs: 0,
    quotes_sent: 0,
    views: 0,
    win_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "local" | "urgent">("all");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      // Mock API calls - replace with real endpoints
      const [rfqRes, statsRes] = await Promise.all([
        fetch("/api/v1/supplier/rfqs", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/v1/supplier/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const rfqData = await rfqRes.json();
      const statsData = await statsRes.json();

      if (rfqData.success) setRfqs(rfqData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      // Fallback mock data for demo
      setRfqs([
        {
          id: "1",
          project_name: "Downtown Office Renovation",
          project_location: "Austin, TX",
          material_type: "Low-carbon Concrete",
          quantity: "500 cu yards",
          deadline: "2026-02-15",
          status: "open",
          distance_miles: 12,
          created_at: "2026-01-08",
          architect_name: "Studio 8 Architects",
        },
        {
          id: "2",
          project_name: "Green Valley School",
          project_location: "Round Rock, TX",
          material_type: "Recycled Steel",
          quantity: "20 tons",
          deadline: "2026-02-01",
          status: "open",
          distance_miles: 25,
          created_at: "2026-01-09",
          architect_name: "Perkins+Will",
        },
        {
          id: "3",
          project_name: "Eco Heights Apartments",
          project_location: "Dallas, TX",
          material_type: "CLT Panels",
          quantity: "15,000 sq ft",
          deadline: "2026-03-01",
          status: "open",
          distance_miles: 195,
          created_at: "2026-01-10",
          architect_name: "HKS Inc",
        },
      ]);
      setStats({
        active_rfqs: 12,
        quotes_sent: 45,
        views: 128,
        win_rate: 18,
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRfqs = () => {
    switch (filter) {
      case "local":
        return rfqs.filter((r) => (r.distance_miles || 0) < 50);
      case "urgent":
        return rfqs.filter((r) => {
          const days = Math.ceil(
            (new Date(r.deadline).getTime() - new Date().getTime()) /
              (1000 * 3600 * 24)
          );
          return days <= 7;
        });
      default:
        return rfqs;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Supplier Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, Green Build Materials Co.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/supplier/location"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <MapPin className="w-4 h-4" />
            Location Settings
          </Link>
          <Link
            href="/supplier/products/new"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
          >
            <ShoppingBag className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {stats.active_rfqs}
          </h3>
          <p className="text-gray-500 text-sm">Active RFQs Nearby</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +5%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {stats.quotes_sent}
          </h3>
          <p className="text-gray-500 text-sm">Quotes Sent This Month</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Last 30 days
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.views}</h3>
          <p className="text-gray-500 text-sm">Profile Views</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +2%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {stats.win_rate}%
          </h3>
          <p className="text-gray-500 text-sm">Quote Win Rate</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RFQ Feed */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                New Opportunities
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    filter === "all"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("local")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    filter === "local"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Local (&lt;50mi)
                </button>
                <button
                  onClick={() => setFilter("urgent")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    filter === "urgent"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Loading RFQs...
                </div>
              ) : getFilteredRfqs().length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-gray-900 font-medium mb-1">
                    No matching RFQs found
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Try adjusting your filters or service area.
                  </p>
                </div>
              ) : (
                getFilteredRfqs().map((rfq) => (
                  <div key={rfq.id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 hover:text-green-600 transition cursor-pointer">
                          {rfq.project_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <span>{rfq.architect_name}</span>
                          <span>•</span>
                          <span>{rfq.created_at}</span>
                        </div>
                      </div>
                      {rfq.distance_miles && (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          <MapPin className="w-3 h-3" />
                          {rfq.distance_miles}mi
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                          Material
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {rfq.material_type}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                          Quantity
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {rfq.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                        <Clock className="w-4 h-4" />
                        Due {new Date(rfq.deadline).toLocaleDateString()}
                      </div>
                      <button className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 transition">
                        View Details <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl text-center">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                View All RFQs
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Setup Progress */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Complete Your Profile
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-green-700" />
                </div>
                <span className="text-sm text-gray-600 line-through">
                  Basic Info
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-700" />
                </div>
                <span className="text-sm font-medium text-blue-900">
                  Upload EPDs
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border border-gray-300" />
                <span className="text-sm text-gray-500">
                  Add Certifications
                </span>
              </div>
            </div>
            <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition">
              Resume Setup
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition text-left group">
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Upload Product Data
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition text-left group">
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Update Service Area
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition text-left group">
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Manage Team
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
