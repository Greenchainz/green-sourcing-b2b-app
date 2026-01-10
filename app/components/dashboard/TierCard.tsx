"use client";

export type SupplierTier = "free" | "standard" | "premium";

interface TierCardProps {
  currentTier: SupplierTier;
  rfqsUsed: number;
  rfqsLimit: number;
  onUpgradeClick?: () => void;
}

const tierConfig: Record<
  SupplierTier,
  {
    name: string;
    color: string;
    bgGradient: string;
    iconBg: string;
    shadowColor: string;
    benefits: string[];
  }
> = {
  free: {
    name: "Free",
    color: "var(--gc-slate-600)",
    bgGradient:
      "linear-gradient(135deg, var(--gc-slate-50), var(--gc-slate-100))",
    iconBg: "linear-gradient(135deg, var(--gc-slate-400), var(--gc-slate-500))",
    shadowColor: "rgba(100, 116, 139, 0.2)",
    benefits: [
      "Wave 3 access only",
      "5 RFQs per month",
      "Basic profile listing",
    ],
  },
  standard: {
    name: "Standard",
    color: "#1d4ed8",
    bgGradient: "linear-gradient(135deg, #eff6ff, #dbeafe)",
    iconBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    shadowColor: "rgba(59, 130, 246, 0.3)",
    benefits: [
      "Wave 2 access (24h head start)",
      "25 RFQs per month",
      "Enhanced profile with certifications",
      "Priority support",
    ],
  },
  premium: {
    name: "Premium",
    color: "var(--gc-emerald-700)",
    bgGradient:
      "linear-gradient(135deg, var(--gc-emerald-50), var(--gc-emerald-100))",
    iconBg:
      "linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))",
    shadowColor: "rgba(16, 185, 129, 0.3)",
    benefits: [
      "Wave 1 access (first to respond)",
      "Unlimited RFQs",
      "Featured supplier badge",
      "Analytics dashboard",
      "Dedicated account manager",
    ],
  },
};

export default function TierCard({
  currentTier,
  rfqsUsed,
  rfqsLimit,
  onUpgradeClick,
}: TierCardProps) {
  const config = tierConfig[currentTier];
  const usagePercent =
    rfqsLimit > 0 ? Math.min((rfqsUsed / rfqsLimit) * 100, 100) : 0;
  const isUnlimited = currentTier === "premium";
  const isNearLimit = usagePercent >= 80;
  const isAtLimit = usagePercent >= 100;

  const getProgressGradient = () => {
    if (isAtLimit) return "linear-gradient(90deg, #dc2626, #f87171)";
    if (isNearLimit) return "linear-gradient(90deg, #ea580c, #fb923c)";
    return config.iconBg;
  };

  const getUsageColor = () => {
    if (isAtLimit) return "#dc2626";
    if (isNearLimit) return "#ea580c";
    return "var(--gc-slate-800)";
  };

  return (
    <div
      className="gc-card gc-tier-card"
      style={{ background: config.bgGradient }}
    >
      {/* Background decoration */}
      <div
        className="gc-tier-card-decoration"
        style={{ background: config.iconBg }}
      />

      {/* Header */}
      <div className="gc-tier-header">
        <div
          className="gc-tier-icon"
          style={{
            background: config.iconBg,
            boxShadow: `0 6px 20px ${config.shadowColor}`,
          }}
        >
          {currentTier === "premium" ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ) : currentTier === "standard" ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
        </div>

        <div className="gc-tier-info">
          <div className="gc-tier-label">Current Tier</div>
          <h3 className="gc-tier-name" style={{ color: config.color }}>
            {config.name}
          </h3>
        </div>
      </div>

      {/* Usage */}
      <div className="gc-tier-usage">
        <div className="gc-tier-usage-header">
          <span className="gc-tier-usage-label">RFQs This Month</span>
          <span
            className="gc-tier-usage-value"
            style={{ color: getUsageColor() }}
          >
            {rfqsUsed}
            <span className="gc-tier-usage-divider">
              /{isUnlimited ? "∞" : rfqsLimit}
            </span>
          </span>
        </div>

        {/* Progress bar */}
        {!isUnlimited && (
          <div className="gc-tier-progress">
            <div
              className="gc-tier-progress-bar"
              style={{
                width: `${usagePercent}%`,
                background: getProgressGradient(),
              }}
            />
          </div>
        )}

        {isAtLimit && (
          <p className="gc-tier-limit-warning">
            You've reached your monthly limit. Upgrade to respond to more RFQs.
          </p>
        )}
      </div>

      {/* Benefits */}
      <div className="gc-tier-benefits">
        <h4 className="gc-tier-benefits-title">Your Benefits</h4>
        <ul className="gc-tier-benefits-list">
          {config.benefits.map((benefit) => (
            <li key={benefit} className="gc-tier-benefit-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={config.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade CTA */}
      {currentTier !== "premium" && (
        <button
          onClick={onUpgradeClick}
          className="gc-btn gc-btn-primary gc-tier-upgrade-btn"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
          Upgrade to {currentTier === "free" ? "Standard" : "Premium"}
        </button>
      )}
    </div>
  );
}

export { TierCard };
