"use client";

import React from "react";
import DataTable, { Column } from "../../components/admin/DataTable";
import StatusBadge from "../../components/admin/StatusBadge";

// Mock Data
const MOCK_USERS = [
  {
    id: 1,
    name: "Alice Architect",
    email: "alice@archfirm.com",
    role: "Buyer",
    tier: "Free",
    status: "Active",
    joined: "2024-01-15",
  },
  {
    id: 2,
    name: "Bob Builder",
    email: "bob@constco.com",
    role: "Supplier",
    tier: "Standard",
    status: "Active",
    joined: "2024-02-20",
  },
  {
    id: 3,
    name: "Charlie Cement",
    email: "sales@cement.com",
    role: "Supplier",
    tier: "Premium",
    status: "Verified",
    joined: "2023-12-05",
  },
  {
    id: 4,
    name: "David Designer",
    email: "dave@design.io",
    role: "Buyer",
    tier: "Free",
    status: "Suspended",
    joined: "2024-03-10",
  },
];

export default function AdminUsersPage() {
  const columns: Column<(typeof MOCK_USERS)[0]>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (u) => (
        <div>
          <div className="font-bold text-slate-800">{u.name}</div>
          <div className="text-xs text-slate-500">{u.email}</div>
        </div>
      ),
    },
    { key: "role", header: "Role", sortable: true },
    {
      key: "tier",
      header: "Tier",
      sortable: true,
      render: (u) => <StatusBadge status={u.tier} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (u) => <StatusBadge status={u.status} />,
    },
    { key: "joined", header: "Joined", sortable: true },
    {
      key: "actions",
      header: "",
      render: (_u) => (
        <div className="flex justify-end gap-2">
          <button className="text-xs font-semibold text-slate-500 hover:text-emerald-600">
            Edit
          </button>
          <button className="text-xs font-semibold text-red-400 hover:text-red-600">
            Suspend
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          User Management
        </h1>

        <DataTable
          data={MOCK_USERS}
          columns={columns}
          keyField="id"
          searchPlaceholder="Search users..."
        />
      </div>
    </div>
  );
}
