"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Eye,
  FileText,
} from "lucide-react";

type OrderStatus = "all" | "processing" | "in_transit" | "delivered" | "cancelled";

interface Order {
  id: string;
  rfqId: string;
  supplier: {
    name: string;
    tier: "free" | "standard" | "premium";
  };
  product: string;
  quantity: string;
  amount: number;
  status: "processing" | "in_transit" | "delivered" | "cancelled";
  orderDate: string;
  deliveryDate: string | null;
  trackingNumber: string | null;
  carbonSaved: number; // percentage
}

// Mock orders data
const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-2045",
    rfqId: "RFQ-1020",
    supplier: { name: "EcoSteel Corp", tier: "premium" },
    product: "Recycled Steel Beams (Type A)",
    quantity: "50 Tons",
    amount: 45000,
    status: "delivered",
    orderDate: "2026-01-05",
    deliveryDate: "2026-01-10",
    trackingNumber: "TRK-8847291",
    carbonSaved: 42,
  },
  {
    id: "ORD-2044",
    rfqId: "RFQ-1018",
    supplier: { name: "GreenCement Ltd", tier: "premium" },
    product: "Low-Carbon Concrete Mix",
    quantity: "200 Cubic Yards",
    amount: 32500,
    status: "in_transit",
    orderDate: "2026-01-03",
    deliveryDate: null,
    trackingNumber: "TRK-7734182",
    carbonSaved: 35,
  },
  {
    id: "ORD-2043",
    rfqId: "RFQ-1015",
    supplier: { name: "SolarTech Inc", tier: "standard" },
    product: "Solar Panels (200 units)",
    quantity: "200 Units",
    amount: 125000,
    status: "processing",
    orderDate: "2025-12-28",
    deliveryDate: null,
    trackingNumber: null,
    carbonSaved: 55,
  },
  {
    id: "ORD-2042",
    rfqId: "RFQ-1012",
    supplier: { name: "EcoInsulation Pro", tier: "standard" },
    product: "Recycled Cellulose Insulation",
    quantity: "5000 sq ft",
    amount: 18500,
    status: "delivered",
    orderDate: "2025-12-20",
    deliveryDate: "2025-12-27",
    trackingNumber: "TRK-6621034",
    carbonSaved: 48,
  },
  {
    id: "ORD-2041",
    rfqId: "RFQ-1010",
    supplier: { name: "BuildGreen Supplies", tier: "premium" },
    product: "FSC-Certified Timber",
    quantity: "10,000 Board Feet",
    amount: 67000,
    status: "delivered",
    orderDate: "2025-12-15",
    deliveryDate: "2025-12-22",
    trackingNumber: "TRK-5598761",
    carbonSaved: 38,
  },
  {
    id: "ORD-2040",
    rfqId: "RFQ-1008",
    supplier: { name: "EcoSteel Corp", tier: "premium" },
    product: "Steel Rebar (Grade 60)",
    quantity: "25 Tons",
    amount: 28000,
    status: "cancelled",
    orderDate: "2025-12-10",
    deliveryDate: null,
    trackingNumber: null,
    carbonSaved: 0,
  },
];

const filterOptions: { value: OrderStatus; label: string }[] = [
  { value: "all", label: "All Orders" },
  { value: "processing", label: "Processing" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusConfig: Record<Order["status"], { label: string; color: string; icon: React.ReactNode }> = {
  processing: {
    label: "Processing",
    color: "bg-amber-100 text-amber-700",
    icon: <Clock className="w-4 h-4" />,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-blue-100 text-blue-700",
    icon: <Truck className="w-4 h-4" />,
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-slate-200 text-slate-600",
    icon: <Package className="w-4 h-4" />,
  },
};

export default function BuyerOrdersPage() {
  const [filter, setFilter] = useState<OrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    let result = MOCK_ORDERS;

    // Apply status filter
    if (filter !== "all") {
      result = result.filter((order) => order.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.product.toLowerCase().includes(query) ||
          order.supplier.name.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query) ||
          order.rfqId.toLowerCase().includes(query)
      );
    }

    // Sort by order date (most recent first)
    return result.sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }, [filter, searchQuery]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const orders = MOCK_ORDERS.filter((o) => o.status !== "cancelled");
    return {
      totalOrders: MOCK_ORDERS.length,
      activeOrders: orders.filter((o) => o.status !== "delivered").length,
      totalSpend: orders.reduce((sum, o) => sum + o.amount, 0),
      avgCarbonSaved: Math.round(
        orders.filter((o) => o.carbonSaved > 0).reduce((sum, o) => sum + o.carbonSaved, 0) /
          orders.filter((o) => o.carbonSaved > 0).length
      ),
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: MOCK_ORDERS.length,
      processing: MOCK_ORDERS.filter((o) => o.status === "processing").length,
      in_transit: MOCK_ORDERS.filter((o) => o.status === "in_transit").length,
      delivered: MOCK_ORDERS.filter((o) => o.status === "delivered").length,
      cancelled: MOCK_ORDERS.filter((o) => o.status === "cancelled").length,
    }),
    []
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/buyer"
            className="inline-flex items-center text-slate-500 hover:text-emerald-600 mb-4 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Order History
              </h1>
              <p className="text-slate-500 mt-1">
                Track and manage all your awarded orders.
              </p>
            </div>
            <button className="gc-btn gc-btn-secondary">
              <Download className="w-4 h-4 mr-2" /> Export Orders
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="gc-card p-4">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Orders
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.totalOrders}</div>
          </div>
          <div className="gc-card p-4">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Active Orders
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.activeOrders}</div>
          </div>
          <div className="gc-card p-4">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Spend
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              ${stats.totalSpend.toLocaleString()}
            </div>
          </div>
          <div className="gc-card p-4">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Avg Carbon Saved
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.avgCarbonSaved}%</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                  filter === option.value
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200"
                }`}
              >
                {option.label}
                <span
                  className={`px-1.5 py-0.5 text-xs rounded-full ${
                    filter === option.value
                      ? "bg-white/20"
                      : "bg-slate-100"
                  }`}
                >
                  {counts[option.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, products, or suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="gc-input pl-10"
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="gc-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Supplier
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Amount
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const status = statusConfig[order.status];
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-800">
                          {order.product}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {order.id} • {order.quantity} • {formatDate(order.orderDate)}
                        </div>
                        {order.carbonSaved > 0 && (
                          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            🌿 {order.carbonSaved}% carbon saved
                          </div>
                        )}
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="font-medium text-slate-700">
                          {order.supplier.name}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                            order.supplier.tier === "premium"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {order.supplier.tier}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                        {order.trackingNumber && order.status === "in_transit" && (
                          <div className="text-xs text-slate-500 mt-1">
                            Tracking: {order.trackingNumber}
                          </div>
                        )}
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="font-bold text-slate-800">
                          ${order.amount.toLocaleString()}
                        </div>
                        {order.deliveryDate && (
                          <div className="text-xs text-slate-500">
                            Delivered: {formatDate(order.deliveryDate)}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/buyer/orders/${order.id}`}
                            className="gc-btn gc-btn-ghost text-xs py-1.5 px-3"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Link>
                          {order.status === "delivered" && (
                            <button className="gc-btn gc-btn-ghost text-xs py-1.5 px-3">
                              <FileText className="w-3.5 h-3.5 mr-1" /> Invoice
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {filteredOrders.length > 0 && (
          <div className="flex justify-center items-center gap-2 mt-6 text-sm text-slate-500">
            Showing {filteredOrders.length} of {counts.all} orders
          </div>
        )}
      </div>
    </div>
  );
}
