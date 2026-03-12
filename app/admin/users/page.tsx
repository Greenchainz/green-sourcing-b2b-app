"use client";
import React, { useState } from "react";
import { trpc } from "~/lib/trpc";

type Tier = "free" | "standard" | "premium";
type Role = "user" | "admin" | "buyer" | "supplier";

export default function AdminUsersPage() {
  const [filterRole, setFilterRole] = useState<string>("All");
  const [pendingTier, setPendingTier] = useState<Record<number, Tier>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, string>>({});

  const { data: users, isLoading, refetch } = trpc.admin.getAllUsers.useQuery();
  const setTierMutation = trpc.admin.setUserTier.useMutation();
  const setRoleMutation = trpc.admin.setUserRole.useMutation();

  const filteredUsers = (users ?? []).filter(u =>
    filterRole === "All" ? true : u.role === filterRole.toLowerCase()
  );

  const handleTierChange = (userId: number, tier: Tier) => {
    setPendingTier(prev => ({ ...prev, [userId]: tier }));
  };

  const handleSaveTier = async (userId: number) => {
    const tier = pendingTier[userId];
    if (!tier) return;
    setSaving(userId);
    try {
      await setTierMutation.mutateAsync({ userId, tier });
      setFeedback(prev => ({ ...prev, [userId]: `✓ Tier set to ${tier}` }));
      await refetch();
    } catch (e: any) {
      setFeedback(prev => ({ ...prev, [userId]: `✗ ${e.message}` }));
    } finally {
      setSaving(null);
      setTimeout(() => setFeedback(prev => { const n = { ...prev }; delete n[userId]; return n; }), 3000);
    }
  };

  const handleRoleChange = async (userId: number, role: Role) => {
    setSaving(userId);
    try {
      await setRoleMutation.mutateAsync({ userId, role });
      setFeedback(prev => ({ ...prev, [userId]: `✓ Role set to ${role}` }));
      await refetch();
    } catch (e: any) {
      setFeedback(prev => ({ ...prev, [userId]: `✗ ${e.message}` }));
    } finally {
      setSaving(null);
      setTimeout(() => setFeedback(prev => { const n = { ...prev }; delete n[userId]; return n; }), 3000);
    }
  };

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-100 text-gray-700",
      standard: "bg-blue-100 text-blue-700",
      premium: "bg-emerald-100 text-emerald-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[tier] ?? "bg-gray-100 text-gray-700"}`}>
        {tier}
      </span>
    );
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-700",
      buyer: "bg-indigo-100 text-indigo-700",
      supplier: "bg-amber-100 text-amber-700",
      user: "bg-gray-100 text-gray-600",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[role] ?? "bg-gray-100 text-gray-600"}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              {users?.length ?? 0} total users — upgrade/downgrade tiers, change roles
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-500">Filter:</span>
            <select
              className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 bg-white"
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
            >
              <option value="All">All Users</option>
              <option value="buyer">Buyers</option>
              <option value="supplier">Suppliers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400 py-20">Loading users...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tier</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Last Sign-In</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{user.name ?? "—"}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                      <div className="text-xs text-slate-300">id={user.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {roleBadge(user.role)}
                        <select
                          className="text-xs border border-slate-200 rounded px-1 py-0.5 text-slate-600 bg-white"
                          value={user.role}
                          disabled={saving === user.id}
                          onChange={e => handleRoleChange(user.id, e.target.value as Role)}
                        >
                          <option value="buyer">buyer</option>
                          <option value="supplier">supplier</option>
                          <option value="admin">admin</option>
                          <option value="user">user</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tierBadge(user.tier)}
                        <select
                          className="text-xs border border-slate-200 rounded px-1 py-0.5 text-slate-600 bg-white"
                          defaultValue={user.tier}
                          disabled={saving === user.id}
                          onChange={e => handleTierChange(user.id, e.target.value as Tier)}
                        >
                          <option value="free">free</option>
                          <option value="standard">standard</option>
                          <option value="premium">premium</option>
                        </select>
                        {pendingTier[user.id] && pendingTier[user.id] !== user.tier && (
                          <button
                            onClick={() => handleSaveTier(user.id)}
                            disabled={saving === user.id}
                            className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {saving === user.id ? "..." : "Save"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {user.lastSignedIn
                        ? new Date(user.lastSignedIn).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      {feedback[user.id] ? (
                        <span className={`text-xs font-medium ${feedback[user.id].startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>
                          {feedback[user.id]}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">{user.subscriptionStatus}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center text-slate-400 py-12">No users found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
