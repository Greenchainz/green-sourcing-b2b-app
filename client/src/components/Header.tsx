import { Link } from 'wouter';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getLoginUrl } from '../const';
import { NotificationCenter } from './NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { user, isLoading } = useAuth();
  useNotifications(); // Initialize real-time notifications
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <span className="text-xs text-muted-foreground">Verified Sustainable Sourcing</span>
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
          <Link href="/assemblies" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Assemblies
          </Link>
          <Link href="/rfq" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            RFQ
          </Link>
          <Link href="/rfq-status" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            RFQ Status
          </Link>
          <Link href="/compare" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Compare
          </Link>
          <Link href="/messages" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Messages
          </Link>
          <Link href="/subscription" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Subscription
          </Link>
          <Link href="/supplier/register" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Become a Supplier
          </Link>
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
              ) : user.role === 'admin' ? (
                <Link href="/admin/verification">
                  <Button variant="ghost" size="sm">
                    Admin Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/materials">
                  <Button variant="ghost" size="sm">
                    Catalog
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
              <a href="/login">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(159,232,112,0.6)] transition-all duration-300">
                  Get Started
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
            <Link href="/assemblies" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              Assemblies
            </Link>
            <Link href="/rfq" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              RFQ
            </Link>
            <Link href="/rfq-status" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              RFQ Status
            </Link>
            <Link href="/compare" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              Compare
            </Link>
            <Link href="/messages" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              Messages
            </Link>
            <Link href="/subscription" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              Subscription
            </Link>
            <Link href="/supplier/register" className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-4 hover:bg-accent rounded-md block"
               onClick={() => setMobileMenuOpen(false)}>
              Become a Supplier
            </Link>
            {!user && (
              <div className="flex flex-col space-y-2 pt-2">
                <a href="/login">
                  <Button variant="ghost" size="sm" className="w-full">
                    Sign In
                  </Button>
                </a>
                <a href="/login">
                  <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Get Started
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
