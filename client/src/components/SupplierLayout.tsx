import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Package,
  BarChart3,
  Upload,
  User,
  Settings,
  MessageSquare,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/supplier/rfqs", label: "RFQs", icon: FileText },
  { href: "/supplier-dashboard", label: "Messages", icon: MessageSquare },
  { href: "/supplier/materials", label: "Materials", icon: Package },
  { href: "/supplier/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/supplier/dashboard", label: "Profile", icon: User },
  { href: "/supplier/upload", label: "Bulk Upload", icon: Upload },
];

export function SupplierLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: profile } = trpc.supplierOnboarding.getMyProfile.useQuery(undefined, {
    enabled: !!user,
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 bg-card border-r shrink-0 flex flex-col">
        {/* Company header */}
        <div className="p-4 border-b">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
            Supplier Portal
          </p>
          <p className="font-semibold text-sm truncate leading-tight">
            {profile?.companyName ?? user?.name ?? "My Company"}
          </p>
          {profile?.verificationStatus === "approved" && (
            <Badge className="mt-1.5 bg-green-100 text-green-800 text-[10px] px-1.5 py-0">
              Verified
            </Badge>
          )}
          {profile?.verificationStatus === "pending" && (
            <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0">
              Pending Review
            </Badge>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href}>
                <a
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="p-2 border-t space-y-0.5">
          <Link href="/supplier/agent-config">
            <a
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                location === "/supplier/agent-config"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="w-4 h-4 shrink-0" />
              Agent Config
            </a>
          </Link>
          <Link href="/">
            <a className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Home className="w-4 h-4 shrink-0" />
              Back to App
            </a>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
