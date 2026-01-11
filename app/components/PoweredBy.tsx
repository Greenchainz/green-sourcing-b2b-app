import React from "react";

interface PoweredByProps {
  variant?: "light" | "dark";
  className?: string;
}

export const PoweredBy: React.FC<PoweredByProps> = ({
  variant = "light",
  className = "",
}) => {
  const isDark = variant === "dark";

  return (
    <div
      className={`powered-by-container ${isDark ? "powered-by-dark" : ""} ${className}`}
    >
      <div className="powered-by-badge">
        <img
          src="/brand/autodesk-sustainability-partner.png"
          alt="Autodesk Sustainability Tech Partner"
          className="h-8 w-auto"
        />
      </div>
      <div className="powered-by-badge">
        <span>Data verified by</span>
        <strong>Building Transparency</strong>
      </div>
      <div className="powered-by-badge">
        <span>EPD certified by</span>
        <strong>EPD International</strong>
      </div>
    </div>
  );
};

export default PoweredBy;
