import { Link } from 'wouter';

/**
 * Footer — site-wide footer with crawlable internal links.
 *
 * SEO note: These links use wouter <Link> (client-side nav) but render as
 * standard <a> tags in the DOM, making them visible to Googlebot even when
 * the JS-rendered navigation is not. This is the crawl safety net recommended
 * in the April 2026 website audit.
 */
export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center space-x-3">
              <img
                src="/brand/greenchainz-icon.png"
                alt="GreenChainz Logo"
                className="h-10 w-auto"
                width={40}
                height={40}
              />
              <span className="text-lg font-bold text-foreground">GreenChainz</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The digital interceptor for the built environment. Data in. Specs out.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.linkedin.com/company/greenchainz"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GreenChainz on LinkedIn"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/materials" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Materials Catalog
                </Link>
              </li>
              <li>
                <Link href="/carbon-compare" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Carbon Compare
                </Link>
              </li>
              <li>
                <Link href="/tools/extension" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Browser Extension
                </Link>
              </li>
              <li>
                <Link href="/tools/revit" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Revit Plugin
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Solutions</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/rfq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  RFQ Cart
                </Link>
              </li>
              <li>
                <Link href="/assemblies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Assemblies
                </Link>
              </li>
              <li>
                <Link href="/compare" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Compare Materials
                </Link>
              </li>
              <li>
                <Link href="/manufacturers" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Supplier Directory
                </Link>
              </li>
              <li>
                <Link href="/supplier/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Supplier Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/get-started" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <a
                  href="https://appsource.microsoft.com/en-us/product/web-apps/jeritnorville.greenchainz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Microsoft Marketplace
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} GreenChainz Inc. All rights reserved. Virginia, USA.
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>LEED v5</span>
              <span>&middot;</span>
              <span>Buy Clean</span>
              <span>&middot;</span>
              <span>Local Law 97</span>
              <span>&middot;</span>
              <span>Title 24</span>
            </div>
          </div>
        </div>
      </div>

      {/* 
        SSR crawl safety net — noscript fallback with plain <a> tags.
        If JS fails to hydrate, crawlers still see these links.
      */}
      <noscript>
        <nav aria-label="Site navigation fallback" style={{ padding: '1rem', fontSize: '0.75rem' }}>
          <a href="/">Home</a> | <a href="/about">About</a> | <a href="/features">Features</a> |{' '}
          <a href="/pricing">Pricing</a> | <a href="/materials">Materials</a> |{' '}
          <a href="/how-it-works">How It Works</a> | <a href="/carbon-compare">Carbon Compare</a> |{' '}
          <a href="/tools/extension">Browser Extension</a> | <a href="/tools/revit">Revit Plugin</a> |{' '}
          <a href="/manufacturers">Supplier Directory</a> | <a href="/supplier/register">Supplier Sign Up</a> |{' '}
          <a href="/support">Support</a> | <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a>
        </nav>
      </noscript>
    </footer>
  );
}
