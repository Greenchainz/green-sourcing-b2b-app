import { Link, useLocation } from 'wouter';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getLoginUrl } from '../const';
import { NotificationCenter } from './NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';
import { trpc } from '../lib/trpc';
import { Menu, X, ChevronDown, Zap, FileUp, Layers, BarChart2, FileText, GitCompare, FileSearch } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const ARCHITECT_TOOLS = [
  { href: "/architect/specs/upload", icon: Zap,        label: "Spec Lookup",          desc: "Find green alternatives for one assembly or a full project" },
  { href: "/architect/specs",        icon: FileSearch,  label: "My Specs",             desc: "View past lookups and uploaded specs" },
  { href: "/assemblies",             icon: Layers,      label: "Assemblies",           desc: "Build and compare wall assembly systems" },
  { href: "/carbon-compare",         icon: GitCompare,  label: "Carbon Compare",       desc: "Side-by-side embodied carbon comparison" },
  { href: "/carbon-dashboard",       icon: BarChart2,   label: "Carbon Dashboard",     desc: "Track carbon across your projects" },
  { href: "/tools/submittal",        icon: FileText,    label: "Submittal Generator",  desc: "Generate CSI-compliant product submittals" },
];

function ToolsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

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
        <div className="absolute left-0 top-full mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {ARCHITECT_TOOLS.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, isLoading } = useAuth();
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
          <img 
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663343505136/zgZDqySaTSwFXoZl.png" 
            alt="GreenChainz Logo" 
            className="h-12 w-auto"
          />
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
            Materials
          </Link>
          <Link href="/manufacturers" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Suppliers
          </Link>
          {/* Architect tools dropdown — hidden for suppliers */}
          {user?.role !== 'supplier' && <ToolsDropdown />}
          {user?.role !== 'supplier' && (
            <Link href="/rfq" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              RFQ Cart
            </Link>
          )}
          {user?.role !== 'supplier' && (
            <Link href="/rfq-status" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              My RFQs
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
          <Link href="/subscription" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Subscription
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
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <a href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </a>
              <a href="/get-started">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(159,232,112,0.6)] transition-all duration-300">
                  Get Bulletproof Specs
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
              Materials
            </Link>
            <Link href="/manufacturers" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              Suppliers
            </Link>
            {user?.role !== 'supplier' && (
              <>
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
              <Link href="/rfq" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                 onClick={() => setMobileMenuOpen(false)}>
                RFQ Cart
              </Link>
            )}
            {user?.role !== 'supplier' && (
              <Link href="/rfq-status" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
                 onClick={() => setMobileMenuOpen(false)}>
                My RFQs
              </Link>
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
            <Link href="/subscription" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              Subscription
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
            {!user && (
              <div className="flex flex-col space-y-2 pt-2">
                <a href="/login">
                  <Button variant="ghost" size="sm" className="w-full">
                    Sign In
                  </Button>
                </a>
                <a href="/get-started">
                  <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Get Bulletproof Specs
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
