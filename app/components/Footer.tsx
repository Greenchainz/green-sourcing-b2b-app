import Image from "next/image";
import Link from "next/link";
import TrustBadges from "./TrustBadges";
import PoweredBy from "./PoweredBy";
import { Sparkles, Heart } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #f5faf0 50%, #f0fdfa 100%)'
    }}>
      {/* Decorative top border - brand gradient */}
      <div className="h-1 w-full" style={{
        background: 'linear-gradient(90deg, #11270b 0%, #3c5a14 25%, #71b340 50%, #0d9488 75%, #14b8a6 100%)'
      }}></div>
      
      <div className="gc-container py-16">
        {/* Trust Badges (Compact) */}
        <div className="mb-8">
          <TrustBadges variant="compact" size="sm" />
        </div>

        {/* Powered By Partners */}
        <div className="mb-12">
          <PoweredBy />
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-10">
          {/* Column 1: Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" aria-label="GreenChainz home" className="inline-block">
              <Image
                src="/brand/logo-main.png"
                alt="GreenChainz"
                width={160}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="m-0 text-sm text-slate-600 leading-relaxed max-w-[280px]">
              The data-driven B2B marketplace for verified green building materials. Making sustainability simple.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>for a greener planet</span>
            </div>
          </div>

          {/* Column 2: Company */}
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-8 h-0.5 rounded" style={{ background: 'linear-gradient(90deg, #71b340, transparent)' }}></span>
              Company
            </h3>
            <nav aria-label="Company links" className="flex flex-col gap-2">
              <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-gc-fern transition-colors">
                About
              </Link>
              <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-gc-fern transition-colors">
                Blog
              </Link>
              <Link href="/careers" className="text-sm font-medium text-slate-600 hover:text-gc-fern transition-colors">
                Careers
              </Link>
              <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-gc-fern transition-colors">
                Contact
              </Link>
            </nav>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-8 h-0.5 rounded" style={{ background: 'linear-gradient(90deg, #0d9488, transparent)' }}></span>
              Resources
            </h3>
            <nav aria-label="Resources links" className="flex flex-col gap-2">
              <Link href="/how-it-works" className="text-sm font-medium text-slate-600 hover:text-gc-teal transition-colors">
                How It Works
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-gc-teal transition-colors">
                Pricing
              </Link>
              <Link href="/help" className="text-sm font-medium text-slate-600 hover:text-gc-teal transition-colors">
                Help Center
              </Link>
              <Link href="/developers" className="text-sm font-medium text-slate-600 hover:text-gc-teal transition-colors">
                API Docs
              </Link>
              <Link href="/partners" className="text-sm font-medium text-slate-600 hover:text-gc-teal transition-colors">
                Partner Program
              </Link>
            </nav>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-8 h-0.5 rounded" style={{ background: 'linear-gradient(90deg, #669d31, transparent)' }}></span>
              Legal
            </h3>
            <nav aria-label="Legal links" className="flex flex-col gap-2">
              <Link href="/legal/privacy" className="text-sm font-medium text-slate-600 hover:text-gc-sage transition-colors">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="text-sm font-medium text-slate-600 hover:text-gc-sage transition-colors">
                Terms of Service
              </Link>
              <Link href="/legal/supplier-agreement" className="text-sm font-medium text-slate-600 hover:text-gc-sage transition-colors">
                Supplier Agreement
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-8 border-t border-gc-fern/10 flex flex-wrap items-center justify-between gap-6">
          {/* Social Icons */}
          <div className="flex items-center gap-3">
            <a
              href="https://linkedin.com/company/greenchainz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-gc-fern hover:border-gc-fern/30 hover:shadow-lg hover:shadow-gc-fern/10 transition-all duration-300"
              aria-label="LinkedIn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a
              href="https://twitter.com/greenchainzhq"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-gc-teal hover:border-gc-teal/30 hover:shadow-lg hover:shadow-gc-teal/10 transition-all duration-300"
              aria-label="Twitter / X"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com/greenchainz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-gc-sage hover:border-gc-sage/30 hover:shadow-lg hover:shadow-gc-sage/10 transition-all duration-300"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>

          {/* Copyright */}
          <p className="m-0 text-sm text-slate-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gc-fern" />
            © {currentYear} GreenChainz, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
