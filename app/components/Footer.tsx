import Image from 'next/image';
import Link from 'next/link';
import TrustBadges from './TrustBadges';

export default function Footer() {
  return (
    <footer style={{ background: '#ffffff', borderTop: '1px solid rgba(209, 250, 229, 0.85)' }}>
      <div className="gc-container" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div style={{ marginBottom: 40 }}>
          <TrustBadges variant="compact" size="sm" />
        </div>
        {/* Footer Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 28,
          }}
        >

          {/* Column 1: Logo + Tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="/" className="inline-block">
              <Image
                src="/assets/logo/greenchainz-full.svg"
                alt="GreenChainz"
                width={160}
                height={40}
                style={{ height: 40, width: 'auto' }}
              />
            </Link>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--gc-slate-600)', lineHeight: 1.6 }}>
              The Data-Driven B2B Marketplace for Verified Green Materials
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--gc-slate-900)', margin: '0 0 12px 0' }}>Company</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              <li><Link href="/about" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>About</Link></li>
              <li><Link href="/blog" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Blog</Link></li>
              <li><Link href="/careers" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Careers</Link></li>
              <li><Link href="/contact" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Contact</Link></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--gc-slate-900)', margin: '0 0 12px 0' }}>Resources</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              <li><Link href="/how-it-works" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>How It Works</Link></li>
              <li><Link href="/pricing" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Pricing</Link></li>
              <li><Link href="/help" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Help Center</Link></li>
              <li><Link href="/developers" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>API Docs</Link></li>
              <li><Link href="/partners" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Partner Program</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--gc-slate-900)', margin: '0 0 12px 0' }}>Legal</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              <li><Link href="/legal/privacy" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Terms of Service</Link></li>
              <li><Link href="/legal/supplier-agreement" className="gc-link" style={{ padding: 0, borderRadius: 0, fontWeight: 600 }}>Supplier Agreement</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Social + Copyright */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: '1px solid rgba(209, 250, 229, 0.85)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >

          {/* Social Media Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <a
              href="https://linkedin.com/company/greenchainz"
              target="_blank"
              rel="noopener noreferrer"
              className="gc-link"
              style={{ padding: 8 }}
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
              className="gc-link"
              style={{ padding: 8 }}
              aria-label="Twitter"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
          </div>

          {/* Copyright */}
          <p style={{ margin: 0, fontSize: 14, color: 'var(--gc-slate-600)' }}>
            © {new Date().getFullYear()} GreenChainz. All rights reserved.
          </p>

        </div>
      </div>
    </footer>
  );
}
