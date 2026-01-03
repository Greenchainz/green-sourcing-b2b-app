import TrustBadges from './components/TrustBadges';

export default function Home() {
  return (
    <div className="gc-page">
      <div className="gc-container" style={{ paddingTop: 56, paddingBottom: 64 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 14px 0' }}>
            <span style={{ color: 'var(--gc-slate-900)', fontWeight: 900 }}>The Trust Layer</span>
            <br />
            <span style={{ fontWeight: 900, color: 'var(--gc-emerald-700)' }}>for Sustainable Commerce</span>
          </h1>
          <p style={{ maxWidth: 860, margin: '0 auto', fontSize: 18, lineHeight: 1.7, color: 'var(--gc-slate-700)' }}>
            Connect verified suppliers with architects & builders. Automated certification verification. Real-time material sourcing.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 26 }}>
          <a href="/signup?type=supplier" className="gc-btn gc-btn-primary" style={{ padding: '0.95rem 1.35rem', fontSize: 16 }}>
            Join as Supplier
          </a>
          <a
            href="/signup?type=architect"
            className="gc-btn"
            style={{
              padding: '0.95rem 1.35rem',
              fontSize: 16,
              background: 'rgba(255,255,255,0.82)',
              borderColor: 'rgba(5,150,105,0.25)',
              borderStyle: 'solid',
              borderWidth: 1,
              boxShadow: '0 10px 30px rgba(2, 44, 34, 0.08)',
              color: 'var(--gc-emerald-700)',
            }}
          >
            Join as Architect
          </a>
        </div>

        <div style={{ maxWidth: 980, margin: '0 auto 24px auto' }}>
          <TrustBadges />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            maxWidth: 980,
            margin: '0 auto',
          }}
        >
          {[
            { k: '50+', v: 'Verified Suppliers' },
            { k: 'Fast', v: 'RFQ distribution' },
            { k: '24/7', v: 'Verification checks' },
          ].map((s) => (
            <div key={s.v} className="gc-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--gc-emerald-700)' }}>{s.k}</div>
              <div style={{ marginTop: 6, color: 'var(--gc-slate-700)', fontWeight: 700 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
