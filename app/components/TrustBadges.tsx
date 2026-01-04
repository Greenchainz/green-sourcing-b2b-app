import Image from 'next/image'

type TrustBadge = {
  src: string
  alt: string
  label: string
  href?: string
  width: number
  height: number
  unoptimized?: boolean
}

export type TrustBadgesProps = {
  /** "full" shows labels + description; "compact" is logo-first minimal */
  variant?: 'full' | 'compact'
  /** smaller footprint for tight surfaces (e.g. header/footer) */
  size?: 'sm' | 'md'
  /** Additional class names */
  className?: string
}

const BADGES: TrustBadge[] = [
  {
    src: '/trust/leed.png',
    alt: 'LEED Certification',
    label: 'LEED',
    href: 'https://www.usgbc.org/leed',
    width: 132,
    height: 48,
  },
  {
    src: '/trust/usgbc.png',
    alt: 'U.S. Green Building Council',
    label: 'USGBC',
    href: 'https://www.usgbc.org/',
    width: 132,
    height: 48,
  },
  {
    src: '/trust/epd.png',
    alt: 'Environmental Product Declaration',
    label: 'EPD',
    href: 'https://www.environdec.com/',
    width: 120,
    height: 48,
  },
  {
    src: '/trust/fsc.png',
    alt: 'Forest Stewardship Council',
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
    alt: 'BREEAM Certification',
    label: 'BREEAM',
    href: 'https://www.breeam.com/',
    width: 140,
    height: 36,
    unoptimized: true,
  },
  {
    src: '/trust/wap.svg',
    alt: 'WAP Verified',
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
  const logoHeight = isSm ? 24 : 28

  return (
    <section
      aria-label="Verification standards and partners"
      className={['gc-trust', className || ''].filter(Boolean).join(' ')}
    >
      <div className="gc-trust-inner">
        {/* Full variant: Icon + description on left, badges on right */}
        {!isCompact && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: '1rem',
              justifyContent: 'space-between',
            }}
          >
            {/* Verified icon + text */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                minWidth: 260,
                maxWidth: 320,
              }}
            >
              <div className="gc-verified-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--gc-slate-900)',
                    margin: 0,
                  }}
                >
                  Verified Standards
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--gc-slate-600)',
                    margin: '3px 0 0 0',
                    lineHeight: 1.5,
                  }}
                >
                  Certifications and data sources powering our sustainability verification.
                </p>
              </div>
            </div>

            {/* Badges grid */}
            <div className="gc-trust-row" role="list" aria-label="Certification badges">
              {BADGES.map((badge, index) => (
                <BadgeItem
                  key={badge.src}
                  badge={badge}
                  logoHeight={logoHeight}
                  showLabel={!isCompact}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* Compact variant: Just the badges in a row */}
        {isCompact && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isSm ? '0.5rem 0.85rem' : '0.65rem 1rem',
            }}
            role="list"
            aria-label="Certification badges"
          >
            {BADGES.map((badge, index) => (
              <BadgeItem
                key={badge.src}
                badge={badge}
                logoHeight={isSm ? 20 : 24}
                showLabel={false}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function BadgeItem({
  badge,
  logoHeight,
  showLabel,
  index,
}: {
  badge: TrustBadge
  logoHeight: number
  showLabel: boolean
  index: number
}) {
  const content = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: showLabel ? 8 : 0,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: logoHeight,
        }}
      >
        <Image
          src={badge.src}
          alt={badge.alt}
          width={badge.width}
          height={badge.height}
          unoptimized={Boolean(badge.unoptimized)}
          className="gc-badge-logo"
          style={{
            height: '100%',
            width: 'auto',
            objectFit: 'contain',
          }}
        />
      </span>
      {showLabel && <span className="gc-badge-label">{badge.label}</span>}
      {!showLabel && <span className="sr-only">{badge.label}</span>}
    </span>
  )

  const baseClass = `gc-badge gc-animate-fade-in gc-stagger-${Math.min(index + 1, 5)}`

  if (badge.href) {
    return (
      <a
        href={badge.href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClass}
        role="listitem"
      >
        {content}
      </a>
    )
  }

  return (
    <span className={baseClass} role="listitem">
      {content}
    </span>
  )
}
