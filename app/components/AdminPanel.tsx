"use client";

import React from "react";
import Link from "next/link";
import MetricCard from "./admin/MetricCard";
import StatusBadge from "./admin/StatusBadge";

export default function AdminPanel() {
  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              System overview and health metrics.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/users"
              className="gc-btn gc-btn-secondary text-sm"
            >
              Manage Users
            </Link>
            <Link href="/admin/rfqs" className="gc-btn gc-btn-primary text-sm">
              View RFQs
            </Link>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <MetricCard
            title="Total Revenue"
            value="$124,500"
            trend={{ value: 12, isPositive: true }}
            icon={<span className="text-xl">💰</span>}
          />
          <MetricCard
            title="Active RFQs"
            value="42"
            trend={{ value: 5, isPositive: true }}
            icon={<span className="text-xl">📄</span>}
          />
          <MetricCard
            title="Total Suppliers"
            value="156"
            trend={{ value: 8, isPositive: true }}
            icon={<span className="text-xl">🏭</span>}
          />
          <MetricCard
            title="Founding 50"
            value="48/50"
            trend={{ value: 2, isPositive: true, label: "new this week" }}
            icon={<span className="text-xl">🏆</span>}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 gc-card p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6">
              Recent System Activity
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="pb-3 pl-2">Event</th>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Time</th>
                    <th className="pb-3 text-right pr-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    {
                      event: "New RFQ Created",
                      user: "ArchFirm NYC",
                      time: "10 mins ago",
                      status: "active",
                    },
                    {
                      event: "Supplier Verified",
                      user: "EcoConcrete Ltd",
                      time: "1 hour ago",
                      status: "verified",
                    },
                    {
                      event: "Subscription Upgrade",
                      user: "GreenSteel Inc",
                      time: "3 hours ago",
                      status: "premium",
                    },
                    {
                      event: "RFQ Deposit Refunded",
                      user: "BuildRight LLC",
                      time: "5 hours ago",
                      status: "closed",
                    },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3 pl-2 font-medium text-slate-700">
                        {row.event}
                      </td>
                      <td className="py-3 text-slate-600">{row.user}</td>
                      <td className="py-3 text-slate-500 text-xs">
                        {row.time}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions / Alerts */}
          <div className="space-y-6">
            <div className="gc-card p-6 bg-amber-50/50 border-amber-100">
              <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                <span>⚠️</span> Action Required
              </h3>
              <ul className="space-y-3">
                <li className="flex justify-between items-center text-sm">
                  <span className="text-slate-700">Pending Verifications</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-700">
                    3
                  </span>
                </li>
                <li className="flex justify-between items-center text-sm">
                  <span className="text-slate-700">Flagged RFQs</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-700">
                    1
                  </span>
                </li>
              </ul>
              <button className="w-full mt-4 gc-btn bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs shadow-sm">
                Review Queue
              </button>
            </div>

            <div className="gc-card p-6">
              <h3 className="font-bold text-slate-800 mb-4">Quick Links</h3>
              <div className="flex flex-col gap-2">
                <Link
                  href="/admin/suppliers"
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-2"
                >
                  <span>→</span> Manage Founding 50
                </Link>
                <Link
                  href="/admin/analytics"
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-2"
                >
                  <span>→</span> View Revenue Report
                </Link>
                <Link
                  href="/admin/settings"
                  className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-2"
                >
                  <span>→</span> System Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
