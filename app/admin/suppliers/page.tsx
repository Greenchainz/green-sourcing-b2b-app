"use client";

import React from "react";
import DataTable, { Column } from "../../components/admin/DataTable";
import StatusBadge from "../../components/admin/StatusBadge";

// Mock Data
const MOCK_SUPPLIERS = [
  {
    id: 1,
    company: "EcoConcrete Ltd",
    tier: "Premium",
    verified: true,
    founding50: true,
    region: "East Coast",
  },
  {
    id: 2,
    company: "Standard Steel",
    tier: "Standard",
    verified: true,
    founding50: false,
    region: "Midwest",
  },
  {
    id: 3,
    company: "Shadow Supplies Inc",
    tier: "Free",
    verified: false,
    founding50: false,
    region: "West Coast",
  },
];

export default function AdminSuppliersPage() {
  const columns: Column<(typeof MOCK_SUPPLIERS)[0]>[] = [
    {
      key: "company",
      header: "Company Name",
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{s.company}</span>
          {s.founding50 && <span title="Founding 50 Member">🏆</span>}
        </div>
      ),
    },
    { key: "region", header: "Region", sortable: true },
    {
      key: "tier",
      header: "Subscription",
      sortable: true,
      render: (s) => <StatusBadge status={s.tier} />,
    },
    {
      key: "verified",
      header: "Verified",
      sortable: true,
      render: (s) =>
        s.verified ? (
          <span className="text-emerald-600 text-xs font-bold uppercase">
            ✓ Verified
          </span>
        ) : (
          <button className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700">
            Verify Now
          </button>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <div className="flex justify-end gap-2">
          <button className="text-xs text-slate-500 underline hover:text-emerald-600">
            Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Supplier Management
        </h1>

        <DataTable
          data={MOCK_SUPPLIERS}
          columns={columns}
          keyField="id"
          searchPlaceholder="Search suppliers..."
        />
      </div>
    </div>
  );
}
