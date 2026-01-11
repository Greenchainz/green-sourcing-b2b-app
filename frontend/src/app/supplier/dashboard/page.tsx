"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate, cn } from "../../../lib/utils";

// Types
interface SupplierStats {
  activeRfqs: number;
  pendingQuotes: number;
  materialsListed: number;
  responseRate: number;
  avgResponseTime: string;
}

interface RFQItem {
  id: string;
  projectName: string;
  materialNeeded: string;
  quantity: string;
  deadline: string;
  status: "new" | "pending" | "quoted" | "won" | "lost";
  buyerCompany: string;
  createdAt: string;
}

// Stat Card Component
const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) => (
  <div className="stat-card">
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-content">
      <h3 className="stat-card-title">{title}</h3>
      <div className="stat-card-value">{value}</div>
      {trendLabel && (
        <div className={cn("stat-card-trend", trend && `trend-${trend}`)}>
          {trend === "up" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
              />
            </svg>
          )}
          {trend === "down" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181"
              />
            </svg>
          )}
          {trendLabel}
        </div>
      )}
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }: { status: RFQItem["status"] }) => {
  const statusConfig = {
    new: { label: "New", className: "status-new" },
    pending: { label: "Pending", className: "status-pending" },
    quoted: { label: "Quoted", className: "status-quoted" },
    won: { label: "Won", className: "status-won" },
    lost: { label: "Lost", className: "status-lost" },
  };

  const config = statusConfig[status];
  return (
    <span className={cn("status-badge", config.className)}>{config.label}</span>
  );
};

// Quick Action Button
const QuickAction = ({
  href,
  icon,
  label,
  variant = "default",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "primary";
}) => (
  <Link
    href={href}
    className={cn(
      "quick-action",
      variant === "primary" && "quick-action-primary"
    )}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

// Main Supplier Dashboard Page
export default function SupplierDashboard() {
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "new" | "pending">("all");

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch stats
        const statsResponse = await fetch("/api/v1/supplier/stats");
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Fetch RFQs
        const rfqsResponse = await fetch("/api/v1/supplier/rfqs");
        if (rfqsResponse.ok) {
          const rfqsData = await rfqsResponse.json();
          setRfqs(rfqsData.rfqs || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Filter RFQs by tab
  const filteredRfqs = rfqs.filter((rfq) => {
    if (activeTab === "all") return true;
    if (activeTab === "new") return rfq.status === "new";
    if (activeTab === "pending") return rfq.status === "pending";
    return true;
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="supplier-dashboard">
        <div className="dashboard-loading">
          <div className="spinner-large" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="supplier-dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Dashboard</h2>
        </div>

        <nav className="sidebar-nav">
          <Link href="/supplier/dashboard" className="sidebar-link active">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            Overview
          </Link>
          <Link href="/supplier/materials" className="sidebar-link">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
              />
            </svg>
            My Materials
          </Link>
          <Link href="/supplier/rfqs" className="sidebar-link">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            RFQ Inbox
          </Link>
          <Link href="/supplier/quotes" className="sidebar-link">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
              />
            </svg>
            My Quotes
          </Link>
          <Link href="/supplier/profile" className="sidebar-link">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
            Profile
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <h1>Welcome back!</h1>
            <p>Here's what's happening with your materials today.</p>
          </div>
          <div className="dashboard-header-actions">
            <QuickAction
              href="/supplier/materials/add"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              }
              label="Add Material"
              variant="primary"
            />
            <QuickAction
              href="/supplier/profile"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              }
              label="View Profile"
            />
          </div>
        </header>

        {/* Stats Grid */}
        <section className="stats-grid">
          <StatCard
            title="Active RFQs"
            value={stats?.activeRfqs || 0}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            }
            trend="up"
            trendLabel="+12% this week"
          />
          <StatCard
            title="Pending Quotes"
            value={stats?.pendingQuotes || 0}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            }
            trendLabel="Respond within 24h"
          />
          <StatCard
            title="Materials Listed"
            value={stats?.materialsListed || 0}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                />
              </svg>
            }
            trend="up"
            trendLabel="+3 this month"
          />
          <StatCard
            title="Response Rate"
            value={`${stats?.responseRate || 0}%`}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            }
            trend="up"
            trendLabel="Above average"
          />
        </section>

        {/* RFQ Table Section */}
        <section className="rfq-section">
          <div className="rfq-section-header">
            <h2>Recent RFQs</h2>
            <div className="rfq-tabs">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "rfq-tab",
                  activeTab === "all" && "rfq-tab-active"
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("new")}
                className={cn(
                  "rfq-tab",
                  activeTab === "new" && "rfq-tab-active"
                )}
              >
                New
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={cn(
                  "rfq-tab",
                  activeTab === "pending" && "rfq-tab-active"
                )}
              >
                Pending
              </button>
            </div>
          </div>

          {filteredRfqs.length === 0 ? (
            <div className="rfq-empty">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="rfq-empty-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
                />
              </svg>
              <h3>No RFQs yet</h3>
              <p>New RFQ requests from architects will appear here.</p>
            </div>
          ) : (
            <div className="rfq-table-wrapper">
              <table className="rfq-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Material</th>
                    <th>Quantity</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRfqs.map((rfq) => (
                    <tr key={rfq.id}>
                      <td>
                        <div className="rfq-project-cell">
                          <span className="rfq-project-name">
                            {rfq.projectName}
                          </span>
                          <span className="rfq-buyer-company">
                            {rfq.buyerCompany}
                          </span>
                        </div>
                      </td>
                      <td>{rfq.materialNeeded}</td>
                      <td>{rfq.quantity}</td>
                      <td>
                        <div className="rfq-deadline">
                          {formatDate(rfq.deadline)}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={rfq.status} />
                      </td>
                      <td>
                        <Link
                          href={`/supplier/rfqs/${rfq.id}`}
                          className="btn-view-details"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredRfqs.length > 0 && (
            <div className="rfq-section-footer">
              <Link href="/supplier/rfqs" className="btn-view-all">
                View All RFQs →
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
