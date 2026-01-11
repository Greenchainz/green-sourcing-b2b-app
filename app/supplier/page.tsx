"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  MessageSquare,
  Eye,
  TrendingUp,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface DashboardMetrics {
  active_rfqs: number;
  profile_views: number;
  completion_score: number;
  response_time_hours: number;
}

interface RecentRFQ {
  rfq_id: number;
  project_name: string;
  material_name: string;
  quantity: number;
  unit: string;
  deadline: string;
  status: string;
}

interface DashboardData {
  metrics: DashboardMetrics;
  recent_rfqs: RecentRFQ[];
}

export default function SupplierDashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch dashboard data
    const fetchData = async () => {
      try {
        // In a real app, logic to get current supplier ID or auth header would go here.
        // API defaults to supplier_id=1 for demo if no param.
        const res = await fetch("/api/supplier/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
        <AlertCircle className="h-6 w-6 mb-2" />
        {error}
      </div>
    );
  }

  const { metrics, recent_rfqs } = data!;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard Overview
        </h1>
        <p className="text-slate-600">
          Welcome back! Here is what's happening with your products.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            {metrics.active_rfqs > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Action Needed
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {metrics.active_rfqs}
          </h3>
          <p className="text-slate-500 text-sm mt-1">Active RFQs</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <span className="flex items-center text-xs font-medium text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" /> +12%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {metrics.profile_views}
          </h3>
          <p className="text-slate-500 text-sm mt-1">Profile Views (30d)</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {metrics.completion_score}%
          </h3>
          <p className="text-slate-500 text-sm mt-1">Profile Completion</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-forest-50 rounded-lg">
              <Clock className="h-6 w-6 text-forest-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {metrics.response_time_hours}h
          </h3>
          <p className="text-slate-500 text-sm mt-1">Avg. Response Time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent RFQs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">
              Recent Opportunities
            </h2>
            <Link
              href="/supplier/rfqs"
              className="text-sm text-forest-600 hover:text-forest-700 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recent_rfqs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No recent RFQs found.
              </div>
            ) : (
              recent_rfqs.map((rfq) => (
                <div
                  key={rfq.rfq_id}
                  className="p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {rfq.project_name || "Untitled Project"}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Looking for:{" "}
                        <span className="text-slate-800">
                          {rfq.material_name}
                        </span>
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-slate-400">
                        <span>
                          Qty: {rfq.quantity} {rfq.unit}
                        </span>
                        <span>•</span>
                        <span>
                          Deadline:{" "}
                          {new Date(rfq.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/supplier/rfqs/${rfq.rfq_id}`}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions / Tips - Unchanged */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                Upload New EPD
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                Update Product Catalog
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                Add Team Member
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-forest-600 to-forest-800 rounded-xl shadow-lg p-6 text-white">
            <h3 className="font-bold text-lg mb-2">Did you know?</h3>
            <p className="text-forest-100 text-sm mb-4">
              Suppliers with verified EPDs get 3x more views from architects.
            </p>
            <button className="px-4 py-2 bg-white text-forest-700 rounded-lg text-sm font-bold hover:bg-forest-50 transition-colors">
              Verify Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
