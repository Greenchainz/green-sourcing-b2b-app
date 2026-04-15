import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const badgeVariants = {
  default: "border border-gray-200 bg-gray-100 text-gray-800",
  secondary: "border border-gray-300 bg-gray-50 text-gray-700",
  destructive: "border border-red-200 bg-red-100 text-red-800",
  outline: "border border-gray-200 text-gray-700",
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeVariants[variant]} ${className}`}
      {...props}
    />
  )
);

Badge.displayName = "Badge";
export { Badge };
