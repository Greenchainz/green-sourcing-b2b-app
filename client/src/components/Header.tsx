import { Link } from 'wouter';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getLoginUrl } from '../const';

export default function Header() {
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-primary-foreground"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">GreenChainz</span>
              <span className="text-xs text-muted-foreground">Verified Sustainable Sourcing</span>
            </div>
          </a>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/materials">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Materials
            </a>
          </Link>
          <Link href="/suppliers">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Suppliers
            </a>
          </Link>
          <Link href="/how-it-works">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              How It Works
            </a>
          </Link>
          <Link href="/pricing">
            <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Pricing
            </a>
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <>
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
