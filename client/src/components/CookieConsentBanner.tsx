import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { X } from 'lucide-react';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieConsent = localStorage.getItem('gc_cookie_consent');
    if (!cookieConsent) {
      // Small delay to let Cookieyes load first
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('gc_cookie_consent', JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      type: 'all',
    }));
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    localStorage.setItem('gc_cookie_consent', JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      type: 'none',
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">Cookie Consent</h3>
            <p className="text-sm text-muted-foreground mb-3 sm:mb-0">
              We use cookies to enhance your experience, analyze traffic, and for marketing purposes. 
              By clicking "Accept All", you consent to our use of cookies. 
              Read our{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              {' '}for more information.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
              className="whitespace-nowrap"
            >
              Reject All
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptAll}
              className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
            >
              Accept All
            </Button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-muted rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
