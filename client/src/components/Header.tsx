import { Link } from 'wouter';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getLoginUrl } from '../const';
import { NotificationCenter } from './NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';

export default function Header() {
  const { user, isLoading } = useAuth();
  useNotifications(); // Initialize real-time notifications

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <img 
              src="/greenchainz-icon.png" 
              alt="GreenChainz Logo" 
              className="h-12 w-auto"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">GreenChainz</span>
              <span className="text-xs text-muted-foreground">Verified Sustainable Sourcing</span>
            </div>
          </a>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/about">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              About
            </a>
          </Link>
          <Link href="/materials">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Materials
            </a>
          </Link>
          <Link href="/assemblies">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Assemblies
            </a>
          </Link>
          <Link href="/rfq">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              RFQ
            </a>
          </Link>
          <Link href="/rfq-status">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              RFQ Status
            </a>
          </Link>
          <Link href="/compare">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Compare
            </a>
          </Link>
          <Link href="/messages">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Messages
            </a>
          </Link>
          <Link href="/supplier/register">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Become a Supplier
            </a>
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <>
              <NotificationCenter />
              <Link href="/dashboard">
                <a>
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </a>
              </Link>
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
              <a href={getLoginUrl()}>
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Get Started
                </Button>
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
