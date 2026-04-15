import React from "react";

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      {...props}
    />
  )
);

Skeleton.displayName = "Skeleton";
export { Skeleton };
