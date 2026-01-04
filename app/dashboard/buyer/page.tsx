"use client";

import React from "react";
import Link from "next/link";

export default function BuyerDashboardOverview() {
  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="gc-hero-title text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-teal-600 mb-2">
              Buyer Dashboard
            </h1>
            <p className="gc-hero-subtitle text-slate-600">
              Manage your sustainable sourcing projects and RFQs.
            </p>
          </div>
          <Link
            href="/dashboard/buyer/rfqs/new"
            className="gc-btn gc-btn-primary"
          >
            + Create New RFQ
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="gc-card p-6 flex flex-col items-center justify-center hover:scale-[1.02] transition-transform">
            <div className="font-bold text-4xl text-emerald-600 mb-2">4</div>
            <div className="font-semibold text-slate-500 uppercase text-sm tracking-wider">
              Active RFQs
            </div>
          </div>
          <div className="gc-card p-6 flex flex-col items-center justify-center hover:scale-[1.02] transition-transform">
            <div className="font-bold text-4xl text-teal-600 mb-2">12</div>
            <div className="font-semibold text-slate-500 uppercase text-sm tracking-wider">
              New Quotes
            </div>
          </div>
          <div className="gc-card p-6 flex flex-col items-center justify-center hover:scale-[1.02] transition-transform">
            <div className="font-bold text-4xl text-slate-700 mb-2">45%</div>
            <div className="font-semibold text-slate-500 uppercase text-sm tracking-wider">
              Carbon Reduction
            </div>
          </div>
        </div>

        {/* Recent Activity / Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active RFQs Snippet */}
          <div className="gc-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Recent RFQs</h2>
              <Link
                href="/dashboard/buyer/rfqs"
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
              >
                View All &rarr;
              </Link>
            </div>

            <div className="space-y-4">
              {[
                {
                  id: "RFQ-1024",
                  title: "Recycled Steel Beams for Office Complex",
                  status: "Open",
                  quotes: 5,
                  date: "2 days ago",
                },
                {
                  id: "RFQ-1023",
                  title: "Low-Carbon Concrete - Phase 2",
                  status: "Reviewing",
                  quotes: 3,
                  date: "1 week ago",
                },
                {
                  id: "RFQ-1021",
                  title: "Solar Panel Installation",
                  status: "Draft",
                  quotes: 0,
                  date: "2 weeks ago",
                },
              ].map((rfq) => (
                <div
                  key={rfq.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer border border-slate-100"
                >
                  <div>
                    <div className="font-bold text-slate-800">{rfq.title}</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      {rfq.id} • Created {rfq.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded mb-1 inline-block
                      ${
                        rfq.status === "Open"
                          ? "bg-green-100 text-green-700"
                          : rfq.status === "Reviewing"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {rfq.status}
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold">
                      {rfq.quotes > 0
                        ? `${rfq.quotes} Quotes`
                        : "No quotes yet"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications / System Feed */}
          <div className="gc-card p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              Activity Feed
            </h2>
            <div className="space-y-6">
              {[
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
                  type: "system",
                  msg: "Your deposit verification was successful.",
                  time: "1 day ago",
                },
              ].map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
                      ${
                        item.type === "quote"
                          ? "bg-emerald-100 text-emerald-600"
                          : item.type === "status"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-blue-100 text-blue-600"
                      }`}
                  >
                    <span className="text-sm font-bold">
                      {item.type === "quote"
                        ? "Q"
                        : item.type === "status"
                          ? "!"
                          : "✓"}
                    </span>
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
      </div>
    </div>
  );
}
