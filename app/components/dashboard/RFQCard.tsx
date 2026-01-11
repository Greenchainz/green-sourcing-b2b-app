"use client";

import Link from "next/link";
import WaveBadge, { type WaveNumber } from "./WaveBadge";

export interface RFQSummary {
  id: string;
  projectName: string;
  materialsCount: number;
  deadline: Date;
  wave: WaveNumber;
  minutesUntilVisible?: number;
  depositVerified: boolean;
  buyerLinkedInVerified: boolean;
  buyerCompany: string;
  status: "pending" | "responded" | "expired" | "awarded";
  createdAt: Date;
}

interface RFQCardProps {
  rfq: RFQSummary;
  onRespond?: (rfqId: string) => void;
}

const statusConfig: Record<
  RFQSummary["status"],
  {
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  pending: {
    label: "Pending Response",
    color: "#ea580c",
    bgColor: "#fff7ed",
  },
  responded: {
    label: "Response Sent",
    color: "var(--gc-emerald-700)",
    bgColor: "var(--gc-emerald-50)",
  },
  expired: {
    label: "Expired",
    color: "var(--gc-slate-500)",
    bgColor: "var(--gc-slate-100)",
  },
  awarded: {
    label: "Awarded",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
  },
};

function formatDeadline(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diff < 0) return "Expired";
  if (days > 7)
    return deadline.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return "Less than 1h";
}

function isUrgent(deadline: Date): boolean {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  const hoursLeft = diff / (1000 * 60 * 60);
  return hoursLeft > 0 && hoursLeft <= 24;
}

export default function RFQCard({ rfq, onRespond }: RFQCardProps) {
  const statusInfo = statusConfig[rfq.status];
  const urgent = isUrgent(rfq.deadline);
  const isVisible = !rfq.minutesUntilVisible || rfq.minutesUntilVisible <= 0;
  const canRespond = rfq.status === "pending" && isVisible;

  return (
    <article
      className={`gc-card gc-card-hover gc-rfq-card ${!isVisible ? "gc-rfq-card--dimmed" : ""}`}
    >
      {/* Header */}
      <div className="gc-rfq-card-header">
        <div className="gc-rfq-card-header-content">
          <Link href={`/rfqs/${rfq.id}`} className="gc-rfq-project-link">
            {rfq.projectName}
          </Link>
          <div className="gc-rfq-buyer-info">
            <span className="gc-rfq-buyer-name">{rfq.buyerCompany}</span>
            {rfq.buyerLinkedInVerified && (
              <span
                className="gc-linkedin-badge"
                title="LinkedIn Verified Buyer"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                Verified
              </span>
            )}
          </div>
        </div>

        {/* Wave Badge */}
        <WaveBadge
          wave={rfq.wave}
          minutesUntilVisible={rfq.minutesUntilVisible}
          size="sm"
        />
      </div>

      {/* Details Row */}
      <div className="gc-rfq-details-row">
        {/* Materials Count */}
        <div className="gc-rfq-detail-item">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gc-slate-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span className="gc-rfq-buyer-name">
            {rfq.materialsCount} material{rfq.materialsCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Deadline */}
        <div
          className={`gc-rfq-detail-item ${urgent ? "gc-rfq-detail-item--urgent" : ""}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={urgent ? "#dc2626" : "var(--gc-slate-400)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{formatDeadline(rfq.deadline)}</span>
          {urgent && <span className="gc-urgent-badge">Urgent</span>}
        </div>

        {/* Deposit Verified */}
        {rfq.depositVerified && (
          <div
            className="gc-deposit-badge"
            title="Buyer has placed a refundable deposit"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            Deposit Verified
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="gc-rfq-card-footer">
        {/* Status Badge */}
        <span
          className={`gc-rfq-status-badge gc-rfq-status-badge--${rfq.status}`}
        >
          {rfq.status === "responded" && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {rfq.status === "awarded" && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          )}
          {statusInfo.label}
        </span>

        {/* Actions */}
        <div className="gc-rfq-actions">
          {canRespond ? (
            <button
              onClick={() => onRespond?.(rfq.id)}
              className="gc-btn gc-btn-primary gc-rfq-respond-btn"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Respond
            </button>
          ) : !isVisible ? (
            <span className="gc-rfq-pending-label">
              Available in {rfq.minutesUntilVisible}m
            </span>
          ) : (
            <Link
              href={`/rfqs/${rfq.id}`}
              className="gc-btn gc-btn-secondary gc-rfq-respond-btn"
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export { RFQCard };
