import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

          {/* Column 1: Logo + Tagline */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/assets/logo/greenchainz-logo.svg"
                alt="GreenChainz"
                width={160}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Data-Driven B2B Marketplace for Verified Green Materials
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About</Link></li>
              <li><Link href="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/help" className="text-sm text-muted-foreground hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link href="/developers" className="text-sm text-muted-foreground hover:text-primary transition-colors">API Docs</Link></li>
              <li><Link href="/partners" className="text-sm text-muted-foreground hover:text-primary transition-colors">Partner Program</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/legal/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/legal/supplier-agreement" className="text-sm text-muted-foreground hover:text-primary transition-colors">Supplier Agreement</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Social + Copyright */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">

          {/* Social Media Icons */}
          <div className="flex items-center gap-6">
            <a
              href="https://linkedin.com/company/greenchainz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a
              href="https://twitter.com/greenchainzhq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Twitter"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GreenChainz. All rights reserved.
          </p>

        </div>
      </div>
    </footer>
  );
}
