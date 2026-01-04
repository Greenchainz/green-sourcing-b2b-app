import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string; // e.g. "vs last month"
  };
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  className = "",
}) => {
  return (
    <div className={`gc-card p-6 flex flex-col justify-between ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </h3>
          <div className="text-3xl font-bold text-slate-800 mt-1">{value}</div>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`font-bold flex items-center ${trend.isPositive ? "text-emerald-600" : "text-red-500"}`}
          >
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="text-slate-400 font-medium">
            {trend.label || "vs last month"}
          </span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
