"use client";

import React from "react";
import DataTable, { Column } from "../../components/admin/DataTable";
import StatusBadge from "../../components/admin/StatusBadge";

// Mock Data
const MOCK_RFQS = [
  {
    id: "RFQ-001",
    title: "Steel Beams NY",
    buyer: "Alice Architect",
    amount: "$50k",
    status: "Open",
    deposit: "Paid",
    date: "2024-03-01",
  },
  {
    id: "RFQ-002",
    title: "Concrete Mix",
    buyer: "Bob Builder",
    amount: "$12k",
    status: "Reviewing",
    deposit: "Paid",
    date: "2024-03-05",
  },
  {
    id: "RFQ-003",
    title: "Glass Panels",
    buyer: "Glassy Towers",
    amount: "$120k",
    status: "Draft",
    deposit: "Pending",
    date: "2024-03-08",
  },
];

export default function AdminRFQsPage() {
  const columns: Column<(typeof MOCK_RFQS)[0]>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.id}</span>,
    },
    {
      key: "title",
      header: "Project Title",
      sortable: true,
      render: (r) => (
        <span className="font-bold text-slate-700">{r.title}</span>
      ),
    },
    { key: "buyer", header: "Buyer", sortable: true },
    { key: "amount", header: "Est. Value", sortable: true },
    {
      key: "deposit",
      header: "Deposit",
      sortable: true,
      render: (r) => (
        <span
          className={`text-xs font-bold ${r.deposit === "Paid" ? "text-emerald-600" : "text-amber-600"}`}
        >
          {r.deposit === "Paid" ? "✓ Paid" : "⏳ Pending"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button className="gc-btn gc-btn-ghost text-xs py-1 px-2 h-auto">
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          RFQ Management
        </h1>

        <DataTable
          data={MOCK_RFQS}
          columns={columns}
          keyField="id"
          searchPlaceholder="Search RFQs or buyers..."
        />
      </div>
    </div>
  );
}
