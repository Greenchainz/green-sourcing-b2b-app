import Image from 'next/image'

type TrustBadge = {
  src: string
  alt: string
  label: string
  href?: string
  width: number
  height: number
  invertOnDark?: boolean
  unoptimized?: boolean
}

export type TrustBadgesProps = {
  /** "full" shows labels; "compact" is logo-first */
  variant?: 'full' | 'compact'
  /** smaller footprint for tight surfaces (e.g. header/footer) */
  size?: 'sm' | 'md'
  className?: string
}

const BADGES: TrustBadge[] = [
  {
    src: '/trust/leed.png',
    alt: 'LEED',
    label: 'LEED',
    href: 'https://www.usgbc.org/leed',
    width: 132,
    height: 48,
  },
  {
    src: '/trust/usgbc.png',
    alt: 'USGBC',
    label: 'USGBC',
    href: 'https://www.usgbc.org/',
    width: 132,
    height: 48,
  },
  {
    src: '/trust/epd.png',
    alt: 'EPD',
    label: 'EPD',
    href: 'https://www.epd-system.org/',
    width: 120,
    height: 48,
  },
  {
    src: '/trust/fsc.png',
    alt: 'FSC',
    label: 'FSC',
    href: 'https://fsc.org/en',
    width: 120,
    height: 48,
  },
  {
    src: '/trust/building-transparency.svg',
    alt: 'Building Transparency',
    label: 'Building Transparency',
    href: 'https://buildingtransparency.org/',
    width: 170,
    height: 36,
    unoptimized: true,
  },
  {
    src: '/trust/breeam.svg',
    alt: 'BREEAM',
    label: 'BREEAM',
    href: 'https://www.breeam.com/',
    width: 140,
    height: 36,
    unoptimized: true,
  },
  {
    src: '/trust/wap.svg',
    alt: 'WAP',
    label: 'WAP',
    width: 120,
    height: 36,
    unoptimized: true,
  },
]

export default function TrustBadges({
  variant = 'full',
  size = 'md',
  className,
}: TrustBadgesProps) {
  const isCompact = variant === 'compact'
  const isSm = size === 'sm'

  return (
    <section
      aria-label="Verification standards and partners"
      className={['gc-trust', className || ''].join(' ')}
    >
      <div className="gc-trust-inner">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '0.75rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', minWidth: 260 }}>
            <div
              aria-hidden="true"
              style={{
                marginTop: 2,
                height: 36,
                width: 36,
                borderRadius: 14,
                background: 'linear-gradient(135deg, var(--gc-emerald-600), #16a34a)',
                boxShadow: '0 10px 30px rgba(2, 44, 34, 0.10)',
                border: '1px solid rgba(6, 95, 70, 0.10)',
              }}
            />
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--gc-slate-900)', margin: 0 }}>
                Verified standards
              </p>
              <p style={{ fontSize: 12, color: 'var(--gc-slate-600)', margin: '2px 0 0 0' }}>
                Certifications and data sources used to validate sustainability claims.
              </p>
            </div>
          </div>

          <div className="gc-trust-row" aria-label="Badges">
            {BADGES.map((b) => {
              const Logo = (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: isSm ? 28 : 32 }}>
                    <Image
                      src={b.src}
                      alt={b.alt}
                      width={b.width}
                      height={b.height}
                      unoptimized={Boolean(b.unoptimized)}
                      className="gc-badge-logo"
                      style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
                    />
                  </span>
                  {!isCompact && (
                    <span className="gc-badge-label">
                      {b.label}
                    </span>
                  )}
                  {isCompact && <span className="sr-only">{b.label}</span>}
                </span>
              )

              if (b.href) {
                return (
                  <a
                    key={b.src}
                    href={b.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gc-badge"
                  >
                    {Logo}
                  </a>
                )
              }

              return (
                <span key={b.src} className="gc-badge">
                  {Logo}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

