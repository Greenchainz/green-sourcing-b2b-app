"use client";

import React from "react";
import Image from "next/image";

interface PoweredByProps {
  variant?: "light" | "dark";
  className?: string;
}

export const PoweredBy: React.FC<PoweredByProps> = ({
  variant = "light",
  className = "",
}) => {
  const isDark = variant === "dark";

  const containerStyles: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "24px",
    padding: "16px 24px",
    background: isDark ? "#1f2937" : "#f9fafb",
    borderRadius: "8px",
    marginTop: "40px",
  };

  const badgeStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: isDark ? "#374151" : "#ffffff",
    border: `1px solid ${isDark ? "#4b5563" : "#e5e7eb"}`,
    borderRadius: "20px",
    fontSize: "13px",
    color: isDark ? "#d1d5db" : "#6b7280",
  };

  return (
    <div style={containerStyles} className={className}>
      <div style={badgeStyles}>
        <Image
          src="/brand/autodesk-sustainability-partner.png"
          alt="Autodesk Sustainability Tech Partner"
          width={160}
          height={32}
          style={{ height: "32px", width: "auto" }}
        />
      </div>
      <div style={badgeStyles}>
        <span>Data verified by</span>
        <strong style={{ color: isDark ? "#ffffff" : "#111827" }}>
          Building Transparency
        </strong>
      </div>
      <div style={badgeStyles}>
        <span>EPD certified by</span>
        <strong style={{ color: isDark ? "#ffffff" : "#111827" }}>
          EPD International
        </strong>
      </div>
    </div>
  );
};

export default PoweredBy;
