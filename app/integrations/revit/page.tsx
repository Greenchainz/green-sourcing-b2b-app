import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Revit Integration | GreenChainz',
  description: 'Connect your Autodesk Revit projects with GreenChainz for real-time sustainability scoring and material sourcing.',
}

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: 'Real-Time Sustainability Scoring',
    description: 'See your project\'s LEED points, embodied carbon, and EPD coverage as you design.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </svg>
    ),
    title: 'Material Mapping',
    description: 'Automatically map Revit materials to verified sustainable products with certifications.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="m9 15 3-3 3 3" />
      </svg>
    ),
    title: 'One-Click RFQ Generation',
    description: 'Generate RFQs for sustainable materials directly from your Revit project.',
  },
] as const

const REQUIREMENTS = [
  'Autodesk Revit 2023, 2024, or 2025',
  'Microsoft Azure AD account (organization or personal)',
  'GreenChainz account (created automatically on first sign-in)',
  '.NET Framework 4.8 or later',
] as const

export default function RevitIntegrationPage() {
  return (
    <div className="gc-page">
      <div className="gc-container" style={{ paddingTop: 64, paddingBottom: 80 }}>
        {/* Hero Section */}
        <section style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24,
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(20, 184, 166, 0.08))',
              borderRadius: 24,
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--gc-emerald-700)' }}>
              🏗️ Autodesk Partnership
            </span>
          </div>

          <h1 className="gc-hero-title gc-animate-fade-in">
            <span style={{ color: 'var(--gc-slate-900)', fontWeight: 900 }}>
              Revit + GreenChainz
            </span>
            <br />
            <span
              style={{
                fontWeight: 900,
                background: 'linear-gradient(135deg, var(--gc-emerald-600), var(--gc-teal-600))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Sustainability in Your Workflow
            </span>
          </h1>

          <p
            className="gc-hero-subtitle gc-animate-fade-in gc-stagger-1"
            style={{ marginTop: 20, marginBottom: 0 }}
          >
            Bring real-time sustainability data directly into Autodesk Revit.
            Track LEED points, carbon footprint, and certifications as you design.
          </p>
        </section>

        {/* Download CTA */}
        <div
          className="gc-animate-fade-in gc-stagger-2"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 48,
          }}
        >
          <a
            href="#download"
            className="gc-btn gc-btn-primary"
            style={{ padding: '1rem 1.5rem', fontSize: 16 }}
          >
            Download Revit Add-in
          </a>
          <a
            href="/api/integrations/revit/v1/contract"
            className="gc-btn gc-btn-secondary"
            style={{ padding: '1rem 1.5rem', fontSize: 16 }}
            target="_blank"
            rel="noopener noreferrer"
          >
            View API Contract
          </a>
        </div>

        {/* Features Grid */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 800,
              color: 'var(--gc-slate-900)',
              marginBottom: 12,
            }}
          >
            Powerful Features
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--gc-slate-600)',
              maxWidth: 640,
              margin: '0 auto 40px auto',
              lineHeight: 1.7,
            }}
          >
            The Revit add-in connects directly to GreenChainz, giving you instant access
            to sustainability data while you work.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
              maxWidth: 1024,
              margin: '0 auto',
            }}
          >
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="gc-card gc-card-hover"
                style={{ padding: 24 }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, var(--gc-emerald-100), var(--gc-teal-100))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--gc-emerald-700)',
                    marginBottom: 16,
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--gc-slate-900)',
                    marginBottom: 8,
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--gc-slate-600)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 800,
              color: 'var(--gc-slate-900)',
              marginBottom: 40,
            }}
          >
            How It Works
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 24,
              maxWidth: 900,
              margin: '0 auto',
            }}
          >
            {[
              { step: '1', title: 'Install', desc: 'Download and install the Revit add-in' },
              { step: '2', title: 'Sign In', desc: 'Authenticate with your Azure AD account' },
              { step: '3', title: 'Sync', desc: 'Sync your project materials to GreenChainz' },
              { step: '4', title: 'Analyze', desc: 'View real-time sustainability scores' },
            ].map((item) => (
              <div key={item.step} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 24,
                    fontWeight: 900,
                    margin: '0 auto 16px auto',
                  }}
                >
                  {item.step}
                </div>
                <h4
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--gc-slate-900)',
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </h4>
                <p style={{ fontSize: 14, color: 'var(--gc-slate-600)', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Requirements */}
        <section
          className="gc-card"
          style={{
            marginBottom: 64,
            padding: '32px',
            maxWidth: 700,
            margin: '0 auto 64px auto',
          }}
        >
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--gc-slate-900)',
              marginBottom: 16,
            }}
          >
            System Requirements
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {REQUIREMENTS.map((req) => (
              <li
                key={req}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 0',
                  color: 'var(--gc-slate-700)',
                  fontSize: 15,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 18, height: 18, color: 'var(--gc-emerald-500)', flexShrink: 0 }}
                >
                  <path d="m9 12 2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {req}
              </li>
            ))}
          </ul>
        </section>

        {/* API Documentation Link */}
        <section
          className="gc-card"
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(20, 184, 166, 0.06))',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 800,
              color: 'var(--gc-slate-900)',
              marginBottom: 12,
            }}
          >
            Building Your Own Integration?
          </h2>
          <p
            style={{
              color: 'var(--gc-slate-600)',
              maxWidth: 520,
              margin: '0 auto 24px auto',
              lineHeight: 1.7,
            }}
          >
            Access our full API documentation and JSON contract for building custom integrations
            with the GreenChainz platform.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <a
              href="/api/integrations/revit/v1/contract"
              className="gc-btn gc-btn-primary"
              style={{ padding: '0.9rem 1.4rem', fontSize: 15 }}
              target="_blank"
              rel="noopener noreferrer"
            >
              View API Contract (JSON)
            </a>
            <Link
              href="/docs/api"
              className="gc-btn gc-btn-ghost"
              style={{ padding: '0.9rem 1.4rem', fontSize: 15 }}
            >
              Full Documentation →
            </Link>
          </div>
        </section>

        {/* Download Section */}
        <section id="download" style={{ marginTop: 64, textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 800,
              color: 'var(--gc-slate-900)',
              marginBottom: 12,
            }}
          >
            Get Started Today
          </h2>
          <p
            style={{
              color: 'var(--gc-slate-600)',
              maxWidth: 520,
              margin: '0 auto 24px auto',
              lineHeight: 1.7,
            }}
          >
            Download the GreenChainz Revit add-in and start tracking sustainability in your projects.
          </p>
          <div
            className="gc-card"
            style={{
              display: 'inline-block',
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: 'var(--gc-slate-500)',
                marginBottom: 16,
              }}
            >
              Coming Soon
            </div>
            <p
              style={{
                fontSize: 14,
                color: 'var(--gc-slate-600)',
                margin: '0 0 16px 0',
              }}
            >
              Join our waitlist to be notified when the Revit add-in is available.
            </p>
            <Link
              href="/signup?source=revit-integration"
              className="gc-btn gc-btn-primary"
              style={{ padding: '0.75rem 1.25rem', fontSize: 14 }}
            >
              Join Waitlist
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
