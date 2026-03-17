/**
 * Convert timestamp to relative time (eBay-style)
 * Examples: "Just now", "5 min ago", "Yesterday 3:45 PM", "Dec 25, 2025"
 */
export function getRelativeTime(timestamp: string | Date): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Just now (< 1 min)
  if (diffMin < 1) {
    return "Just now";
  }

  // Minutes ago (< 1 hour)
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }

  // Hours ago (< 24 hours)
  if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  }

  // Yesterday
  if (diffDay === 1) {
    return `Yesterday ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }

  // This week (< 7 days) - show day name + time
  if (diffDay < 7) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${dayName} ${time}`;
  }

  // This year - show month + day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Older - show full date
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
