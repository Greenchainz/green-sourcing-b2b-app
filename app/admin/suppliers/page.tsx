"use client";

import React, { useState } from "react";
import DataTable, { Column } from "../../components/admin/DataTable";
import StatusBadge from "../../components/admin/StatusBadge";

// Mock Data
const INITIAL_SUPPLIERS = [
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
  {
    id: 4,
    company: "Green Lumber Co",
    tier: "Premium",
    verified: false,
    founding50: true,
    region: "Pacific NW",
  },
];

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS);

  const handleVerify = (id: number) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, verified: true } : s))
    );
  };

  const handleReject = (id: number) => {
      // In a real app, this would open a modal for rejection reason or API call
      if(confirm("Are you sure you want to reject this supplier?")) {
        console.log("Rejected supplier", id);
      }
  }

  const columns: Column<(typeof INITIAL_SUPPLIERS)[0]>[] = [
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
          <div className="flex gap-2">
            <button
              onClick={() => handleVerify(s.id)}
              className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors"
            >
              Verify
            </button>
            <button
                onClick={() => handleReject(s.id)}
                className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
                Reject
            </button>
          </div>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (_s) => (
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
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
            Supplier Management
            </h1>
            <div className="text-sm text-slate-500">
                {suppliers.filter(s => !s.verified).length} Pending Verification
            </div>
        </div>


        <DataTable
          data={suppliers}
          columns={columns}
          keyField="id"
          searchPlaceholder="Search suppliers..."
        />
      </div>
    </div>
  );
}
