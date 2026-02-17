"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface ValidationStats {
  total: number;
  approved: number;
  experimental: number;
  rejected: number;
  averageScore: number;
  recentValidations: any[];
}

interface ValidationRecord {
  id: number;
  incumbent_material_id: number;
  sustainable_material_id: number;
  validation_status: string;
  overall_score: number;
  showstopper_results: any;
  failed_checks: number;
  passed_checks: number;
  skipped_checks: number;
  recommendation: string;
  validated_at: string;
  project_state: string;
  project_city: string;
  project_type: string;
  incumbent_name: string;
  sustainable_name: string;
  incumbent_category: string;
  sustainable_category: string;
}

const statusColors: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800 border-green-300",
  EXPERIMENTAL: "bg-yellow-100 text-yellow-800 border-yellow-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
};

const statusIcons: Record<string, string> = {
  APPROVED: "✅",
  EXPERIMENTAL: "⚠️",
  REJECTED: "❌",
};

export default function SwapValidationDashboard() {
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, validationsRes] = await Promise.all([
        fetch("/api/swap-validation/stats"),
        fetch(`/api/swap-validation${statusFilter ? `?status=${statusFilter}` : ""}`),
      ]);

      if (!statsRes.ok || !validationsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const statsData = await statsRes.json();
      const validationsData = await validationsRes.json();

      setStats(statsData);
      setValidations(validationsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !stats) {
    return (
      <div className="gc-page min-h-screen p-6 md:p-10">
        <div className="gc-container">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[#1a1a1a] rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-[#1a1a1a] rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-[#1a1a1a] rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Swap Validation Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              Material substitution validation engine — 12 showstopper checks
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="gc-btn gc-btn-secondary text-sm">
              ← Back to Admin
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button onClick={fetchData} className="text-red-600 underline mt-1">
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-[#111111] rounded-xl border border-[#aaff00]/10 p-5 shadow-sm">
              <p className="text-sm text-slate-500 uppercase tracking-wide">Total Validations</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-5 shadow-sm">
              <p className="text-sm text-green-600 uppercase tracking-wide">Approved</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{stats.approved}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-5 shadow-sm">
              <p className="text-sm text-yellow-600 uppercase tracking-wide">Experimental</p>
              <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.experimental}</p>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-5 shadow-sm">
              <p className="text-sm text-red-600 uppercase tracking-wide">Rejected</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{stats.rejected}</p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 shadow-sm">
              <p className="text-sm text-blue-600 uppercase tracking-wide">Avg Score</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">
                {stats.averageScore.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-slate-500">Filter by status:</span>
          {["", "APPROVED", "EXPERIMENTAL", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === status
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-[#111111] text-slate-400 border-[#aaff00]/15 hover:bg-[#0a0a0a]"
              }`}
            >
              {status || "All"}
            </button>
          ))}
          <button
            onClick={fetchData}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm bg-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Validations Table */}
        <div className="bg-[#111111] rounded-xl border border-[#aaff00]/10 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0a0a0a] border-b border-[#aaff00]/10">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Incumbent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Sustainable</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Checks</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Location</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {validations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    {loading ? "Loading..." : "No validation records found. Run your first swap validation to see results here."}
                  </td>
                </tr>
              ) : (
                validations.map((v) => (
                  <tr key={v.id} className="border-b border-white/5 hover:bg-[#0a0a0a] transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-slate-400">#{v.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{v.incumbent_name || `Material #${v.incumbent_material_id}`}</div>
                      <div className="text-xs text-slate-400">{v.incumbent_category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{v.sustainable_name || `Material #${v.sustainable_material_id}`}</div>
                      <div className="text-xs text-slate-400">{v.sustainable_category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[v.validation_status] || "bg-[#1a1a1a]"}`}>
                        {statusIcons[v.validation_status]} {v.validation_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              v.overall_score >= 80 ? "bg-green-500" :
                              v.overall_score >= 60 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${v.overall_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-300">{Number(v.overall_score).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      <span className="text-green-600">{v.passed_checks}P</span>
                      {" / "}
                      <span className="text-red-600">{v.failed_checks}F</span>
                      {v.skipped_checks > 0 && (
                        <span className="text-slate-400"> / {v.skipped_checks}S</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {v.project_city && v.project_state
                        ? `${v.project_city}, ${v.project_state}`
                        : v.project_state || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(v.validated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Showstopper Checks Legend */}
        <div className="mt-8 bg-[#0a0a0a] rounded-xl border border-[#aaff00]/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">12 Showstopper Checks</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "ASTM Match", desc: "Code compatibility" },
              { name: "Fire Rating", desc: "Equal or better" },
              { name: "Compressive Strength", desc: "±10% tolerance" },
              { name: "Tensile Strength", desc: "±10% tolerance" },
              { name: "Modulus of Elasticity", desc: "±15% tolerance" },
              { name: "R-Value", desc: "Thermal performance" },
              { name: "Perm Rating", desc: "Moisture vapor" },
              { name: "STC Rating", desc: "Sound transmission" },
              { name: "NRC Coefficient", desc: "Noise reduction" },
              { name: "Certifications", desc: "Required certs present" },
              { name: "Warranty", desc: "Equal or better" },
              { name: "Install Method", desc: "Compatible methods" },
            ].map((check) => (
              <div key={check.name} className="bg-[#111111] rounded-lg border border-[#aaff00]/10 p-3">
                <p className="text-sm font-medium text-slate-300">{check.name}</p>
                <p className="text-xs text-slate-400">{check.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
