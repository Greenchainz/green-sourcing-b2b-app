import { Link } from 'wouter';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';
import { trpc } from '../lib/trpc';
import { Menu, X, ChevronDown, Zap, Layers, BarChart2, GitCompare, FileSearch, Camera, ClipboardList } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const ARCHITECT_TOOLS = [
  { href: "/buyer/new-request", icon: Zap, label: "Smart RFx Builder", desc: "Turn a material need into a structured RFI, RFQ, or RFP in seconds", highlight: true },
  { href: "/architect/specs/upload", icon: FileSearch, label: "Spec Lookup", desc: "Find green alternatives for one assembly or a full project" },
  { href: "/architect/specs", icon: ClipboardList, label: "My Specs", desc: "View past lookups and uploaded specs" },
  { href: "/assemblies", icon: Layers, label: "Assemblies", desc: "Build and compare wall assembly systems" },
  { href: "/carbon-compare", icon: GitCompare, label: "Carbon Compare", desc: "Side-by-side embodied carbon comparison" },
  { href: "/carbon-dashboard", icon: BarChart2, label: "Carbon Dashboard", desc: "Track carbon across your projects" },
];

function ToolsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        Tools <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {ARCHITECT_TOOLS.map(({ href, icon: Icon, label, desc, highlight }, idx) => (
            <div key={href}>
              {/* Divider after the highlighted first item */}
              {idx === 1 && <div className="border-t border-border mx-4 my-1" />}
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${highlight ? "hover:bg-green-50 dark:hover:bg-green-950/30" : "hover:bg-accent"}`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${highlight ? "bg-green-600" : "bg-green-100"}`}>
                  <Icon className={`w-3.5 h-3.5 ${highlight ? "text-white" : "text-green-700"}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${highlight ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Clickable avatar with photo upload ────────────────────────────────────────
function UserAvatar() {
  const { user, refetch } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(user?.avatarUrl ?? null);

  // Sync preview when user data changes
  useEffect(() => {
    setPreview(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl); // optimistic preview

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json() as { url: string };
      setPreview(url);
      toast.success("Profile photo updated");
      void refetch();
    } catch (err) {
      setPreview(user?.avatarUrl ?? null); // revert
      toast.error("Upload failed — try again");
      console.error("[avatar upload]", err);
    } finally {
      setUploading(false);
    }
  }, [user, refetch]);

  const initials = user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
        {preview ? (
          <img src={preview} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-primary-foreground">{initials}</span>
        )}
      </div>
      {/* Camera overlay on hover */}
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Camera className="w-3 h-3 text-white" />
        }
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
    </div>
  );
}

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  useNotifications(); // Initialize real-time notifications
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Unread message count for the Messages nav badge (only when logged in)
  const { data: unreadData } = trpc.messaging.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30_000, // poll every 30s as a lightweight fallback
  });
  const unreadCount = unreadData?.count ?? 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <picture>
            <source srcSet="/brand/greenchainz-icon.webp" type="image/webp" />
            <img
              src="/brand/greenchainz-icon.webp"
              alt="GreenChainz Logo"
              className="h-12 w-auto"
              width={30}
              height={48}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
          </picture>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">GreenChainz</span>
            <span className="text-xs text-muted-foreground">The Digital Interceptor</span>
          </div>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 hover:bg-accent rounded-md"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/about" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            About
          </Link>
          <Link href="/materials" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Explore
          </Link>
          <Link href="/manufacturers" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Suppliers
          </Link>
          {/* Tools dropdown — hidden for suppliers */}
          {user?.role !== 'supplier' && <ToolsDropdown />}
          {user?.role !== 'supplier' && (
            <Link href="/rfq/new" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Submit RFQ
            </Link>
          )}
          {user?.role !== 'supplier' && (
            <Link
              href="/tools/submittal"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-md px-2.5 py-1 hover:bg-primary/5"
            >
              Submittal Pack
            </Link>
          )}
          {user?.role !== 'supplier' && (
            <Link href="/buyer/ca" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              CA Docs
            </Link>
          )}
          {user?.role !== 'supplier' && (
            <Link href="/rfq-status" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              My RFQs
            </Link>
          )}
          {user && user?.role !== 'supplier' && (
            <Link
              href="/buyer/new-request"
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              New Request
            </Link>
          )}
          <Link href="/insider" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors">
            Insider
          </Link>
          {user?.role === 'admin' && (
            <Link href="/admin" className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
              Admin
            </Link>
          )}
          <Link href="/messages" className="text-sm font-medium text-foreground hover:text-primary transition-colors relative inline-flex items-center gap-1.5">
            Messages
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Pricing
          </Link>
          {user?.role === 'supplier' ? (
            <Link href="/supplier/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              My Hub
            </Link>
          ) : (
            <Link href="/supplier/register" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Supplier Hub
            </Link>
          )}
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <>
              <NotificationCenter />
              {user.role === 'supplier' ? (
                <Link href="/supplier/rfqs">
                  <Button variant="ghost" size="sm">
                    My Bids
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign out
                </Button>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border border-border text-muted-foreground bg-muted/50">
                  {user.role ?? "user"}
                </span>
                <UserAvatar />
              </div>
            </>
          ) : (
            <>
              <a href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </a>
              <a href="/rfq/new">
                <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                  Submit RFQ
                </Button>
              </a>
              <a href="/get-started">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(159,232,112,0.6)] transition-all duration-300">
                  Explore Materials
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container py-4 flex flex-col space-y-3">
            <Link href="/about" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
              onClick={() => setMobileMenuOpen(false)}>
              About
            </Link>
            <Link href="/materials" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
              onClick={() => setMobileMenuOpen(false)}>
              Explore Materials
            </Link>
            <Link href="/manufacturers" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
              onClick={() => setMobileMenuOpen(false)}>
              Suppliers
            </Link>
            {user?.role !== 'supplier' && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-4 pt-2">Start Here</p>
                <Link href="/buyer/new-request"
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors py-2 px-4 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}>
                  <Zap className="w-4 h-4" />
                  Smart RFx Builder — New Request
                </Link>
                <Link href="/rfq/new"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                  onClick={() => setMobileMenuOpen(false)}>
                  Submit classic RFQ
                </Link>
                <Link href="/tools/submittal"
                  className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                  onClick={() => setMobileMenuOpen(false)}>
                  Generate Submittal Pack
                </Link>
                <Link href="/buyer/ca"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                  onClick={() => setMobileMenuOpen(false)}>
                  CA Docs
                </Link>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-4 pt-2">Tools</p>
                {ARCHITECT_TOOLS.map(({ href, label }) => (
                  <Link key={href} href={href}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                    onClick={() => setMobileMenuOpen(false)}>
                    {label}
                  </Link>
                ))}
              </>
            )}
            {user?.role !== 'supplier' && (
              <>
                <Link href="/rfq-status" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                  onClick={() => setMobileMenuOpen(false)}>
                  My RFQs
                </Link>
                <Link href="/buyer/requests" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                  onClick={() => setMobileMenuOpen(false)}>
                  My Requests
                </Link>
              </>
            )}
            <Link href="/insider" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors py-2 px-4 hover:bg-accent rounded-md block"
              onClick={() => setMobileMenuOpen(false)}>
              Insider
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin" className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                onClick={() => setMobileMenuOpen(false)}>
                Admin
              </Link>
            )}
            <Link href="/messages" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md flex items-center justify-between"
              onClick={() => setMobileMenuOpen(false)}>
              Messages
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
              onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </Link>
            {user?.role === 'supplier' ? (
              <Link href="/supplier/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                onClick={() => setMobileMenuOpen(false)}>
                My Hub
              </Link>
            ) : (
              <Link href="/supplier/register" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                onClick={() => setMobileMenuOpen(false)}>
                Supplier Hub
              </Link>
            )}
            {user && (
              <button
                type="button"
                className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors py-2 px-4 hover:bg-accent rounded-md text-left"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                Sign out
              </button>
            )}
            {!user && (
              <div className="flex flex-col space-y-2 pt-2">
                <a href="/login">
                  <Button variant="ghost" size="sm" className="w-full">
                    Sign In
                  </Button>
                </a>
                <a href="/rfq">
                  <Button variant="outline" size="sm" className="w-full">
                    Submit RFQ
                  </Button>
                </a>
                <a href="/get-started">
                  <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Explore Materials
                  </Button>
                </a>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
