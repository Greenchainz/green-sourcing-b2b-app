import React from "react";

type StatusType =
  | "active"
  | "pending"
  | "suspended"
  | "draft"
  | "open"
  | "closed"
  | "awarded"
  | "verified"
  | "unverified";

interface StatusBadgeProps {
  status: string;
  type?: StatusType; // Optional explicit type override if status string doesn't match keys
  className?: string; // Allow custom classes
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  open: "bg-emerald-100 text-emerald-700 border-emerald-200",
  verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  awarded: "bg-purple-100 text-purple-700 border-purple-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  reviewing: "bg-amber-100 text-amber-700 border-amber-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  unverified: "bg-slate-100 text-slate-600 border-slate-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  banned: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  premium: "bg-violet-100 text-violet-700 border-violet-200",
  standard: "bg-blue-100 text-blue-700 border-blue-200",
  free: "bg-gray-100 text-gray-600 border-gray-200",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const normalizedStatus = status.toLowerCase();
  const styleClass =
    STATUS_STYLES[normalizedStatus] ||
    "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${styleClass} ${className}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
