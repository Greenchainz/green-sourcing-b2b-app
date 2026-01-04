"use client";

import React from "react";
import Link from "next/link";

// Mock Data
const MOCK_RFQS = [
  {
    id: "RFQ-1024",
    title: "Recycled Steel Beams for Office Complex",
    status: "Open",
    quotes: 5,
    date: "2025-01-01",
  },
  {
    id: "RFQ-1023",
    title: "Low-Carbon Concrete - Phase 2",
    status: "Reviewing",
    quotes: 3,
    date: "2024-12-28",
  },
  {
    id: "RFQ-1022",
    title: "Sustainable Insulation Batch A",
    status: "Closed",
    quotes: 8,
    date: "2024-12-15",
  },
  {
    id: "RFQ-1021",
    title: "Solar Panel Installation",
    status: "Draft",
    quotes: 0,
    date: "2024-12-10",
  },
];

export default function BuyerRFQList() {
  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              My RFQs
            </h1>
            <p className="text-slate-500 mt-1">
              View and manage all your material requests.
            </p>
          </div>
          <Link
            href="/dashboard/buyer/rfqs/new"
            className="gc-btn gc-btn-primary"
          >
            + New Request
          </Link>
        </div>

        {/* Filters (Visual Only) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["All", "Open", "Reviewing", "Closed", "Drafts"].map((filter, i) => (
            <button
              key={filter}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                    ${i === 0 ? "bg-emerald-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-emerald-50"}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="gc-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  RFQ Details
                </th>
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Quotes
                </th>
                <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_RFQS.map((rfq) => (
                <tr
                  key={rfq.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-4 md:p-5">
                    <Link
                      href={`/dashboard/buyer/rfqs/${rfq.id}`}
                      className="block group"
                    >
                      <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {rfq.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        ID: {rfq.id} • Created {rfq.date}
                      </div>
                    </Link>
                  </td>
                  <td className="p-4 md:p-5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded inline-block
                                  ${
                                    rfq.status === "Open"
                                      ? "bg-green-100 text-green-700"
                                      : rfq.status === "Reviewing"
                                        ? "bg-amber-100 text-amber-700"
                                        : rfq.status === "Closed"
                                          ? "bg-slate-200 text-slate-600"
                                          : "bg-slate-100 text-slate-500 border border-slate-200"
                                  }`}
                    >
                      {rfq.status}
                    </span>
                  </td>
                  <td className="p-4 md:p-5">
                    <div className="text-sm font-semibold text-slate-700">
                      {rfq.quotes} active
                    </div>
                  </td>
                  <td className="p-4 md:p-5 text-right">
                    <Link
                      href={`/dashboard/buyer/rfqs/${rfq.id}`}
                      className="gc-btn gc-btn-ghost text-xs py-1.5 px-3"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
