'use client'

import { useState } from 'react'
import Link from 'next/link'
import TierCard, { type SupplierTier } from '../../components/dashboard/TierCard'

interface NotificationPreferences {
  emailNewRFQ: boolean
  emailDeadlineReminder: boolean
  emailWaveAccess: boolean
  emailWeeklyDigest: boolean
  pushNewRFQ: boolean
  pushDeadlineReminder: boolean
}

const tierPricing: Record<SupplierTier, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  standard: { monthly: 49, annual: 470 },
  premium: { monthly: 199, annual: 1910 },
}

const tierBenefits: Record<SupplierTier, string[]> = {
  free: [
    'Wave 3 access (48+ hours after RFQ creation)',
    '5 RFQ responses per month',
    'Basic company profile',
    'Email notifications',
  ],
  standard: [
    'Wave 2 access (24h head start)',
    '25 RFQ responses per month',
    'Enhanced profile with certifications',
    'Priority customer support',
    'RFQ analytics dashboard',
    'Custom branding on quotes',
  ],
  premium: [
    'Wave 1 access (First to respond)',
    'Unlimited RFQ responses',
    'Featured supplier badge',
    'Advanced analytics & insights',
    'Dedicated account manager',
    'API access for integrations',
    'Multi-user team accounts',
    'Custom RFQ templates',
  ],
}

export default function SettingsPage() {
  const [currentTier] = useState<SupplierTier>('standard')
  const [rfqsUsed] = useState(18)
  const [rfqsLimit] = useState(25)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<SupplierTier | null>(null)
  
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNewRFQ: true,
    emailDeadlineReminder: true,
    emailWaveAccess: true,
    emailWeeklyDigest: false,
    pushNewRFQ: true,
    pushDeadlineReminder: true,
  })

  const handleNotificationChange = (key: keyof NotificationPreferences) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleUpgradeClick = (tier: SupplierTier) => {
    setSelectedUpgradeTier(tier)
    setShowUpgradeModal(true)
  }

  const handleManageBilling = () => {
    // In production, this would redirect to Stripe billing portal
    window.open('https://billing.stripe.com/p/login/demo', '_blank')
  }

  return (
    <div className="gc-page" style={{ minHeight: '100vh' }}>
      <div className="gc-container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.875rem',
                color: 'var(--gc-slate-500)',
                textDecoration: 'none',
                transition: 'color var(--gc-duration) var(--gc-ease)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Dashboard
            </Link>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 900,
              color: 'var(--gc-slate-900)',
              letterSpacing: '-0.02em',
            }}
          >
            Account Settings
          </h1>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Current Tier Section */}
          <section>
            <h2 className="gc-section-title">Current Subscription</h2>
            <TierCard
              currentTier={currentTier}
              rfqsUsed={rfqsUsed}
              rfqsLimit={rfqsLimit}
              onUpgradeClick={() => handleUpgradeClick('premium')}
            />
          </section>

          {/* Tier Comparison */}
          <section>
            <h2 className="gc-section-title">Available Plans</h2>
            
            {/* Billing Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: billingCycle === 'monthly' ? 700 : 500,
                  color: billingCycle === 'monthly' ? 'var(--gc-slate-900)' : 'var(--gc-slate-500)',
                }}
              >
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                style={{
                  width: 48,
                  height: 26,
                  padding: 2,
                  borderRadius: 13,
                  background: billingCycle === 'annual'
                    ? 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))'
                    : 'var(--gc-slate-300)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background var(--gc-duration) var(--gc-ease)',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    transform: billingCycle === 'annual' ? 'translateX(22px)' : 'translateX(0)',
                    transition: 'transform var(--gc-duration) var(--gc-ease)',
                  }}
                />
              </button>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: billingCycle === 'annual' ? 700 : 500,
                  color: billingCycle === 'annual' ? 'var(--gc-slate-900)' : 'var(--gc-slate-500)',
                }}
              >
                Annual
              </span>
              {billingCycle === 'annual' && (
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: 'var(--gc-emerald-700)',
                    background: 'var(--gc-emerald-100)',
                    borderRadius: 'var(--gc-radius-sm)',
                  }}
                >
                  Save 20%
                </span>
              )}
            </div>

            {/* Plan Cards */}
            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              }}
            >
              {(['free', 'standard', 'premium'] as SupplierTier[]).map((tier) => {
                const isCurrent = tier === currentTier
                const price = billingCycle === 'monthly' 
                  ? tierPricing[tier].monthly 
                  : Math.round(tierPricing[tier].annual / 12)
                
                return (
                  <div
                    key={tier}
                    className="gc-card"
                    style={{
                      padding: '1.5rem',
                      border: isCurrent ? '2px solid var(--gc-emerald-500)' : undefined,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isCurrent && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          color: 'white',
                          background: 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))',
                          borderRadius: 'var(--gc-radius-sm)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Current Plan
                      </div>
                    )}

                    {tier === 'premium' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          color: '#a855f7',
                          background: '#faf5ff',
                          borderRadius: 'var(--gc-radius-sm)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Most Popular
                      </div>
                    )}

                    <h3
                      style={{
                        margin: '0 0 0.5rem',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--gc-slate-900)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {tier}
                    </h3>

                    <div style={{ marginBottom: '1.25rem' }}>
                      <span
                        style={{
                          fontSize: '2rem',
                          fontWeight: 900,
                          color: tier === 'free' ? 'var(--gc-slate-600)' : 'var(--gc-emerald-700)',
                        }}
                      >
                        ${price}
                      </span>
                      <span
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--gc-slate-500)',
                        }}
                      >
                        /month
                      </span>
                      {billingCycle === 'annual' && tier !== 'free' && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--gc-slate-500)',
                            marginTop: '0.25rem',
                          }}
                        >
                          Billed ${tierPricing[tier].annual}/year
                        </div>
                      )}
                    </div>

                    <ul
                      style={{
                        margin: '0 0 1.25rem',
                        padding: 0,
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      {tierBenefits[tier].slice(0, 5).map((benefit) => (
                        <li
                          key={benefit}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            fontSize: '0.8125rem',
                            color: 'var(--gc-slate-700)',
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--gc-emerald-600)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginTop: 2, flexShrink: 0 }}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {benefit}
                        </li>
                      ))}
                      {tierBenefits[tier].length > 5 && (
                        <li
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--gc-slate-500)',
                            fontWeight: 600,
                            paddingLeft: 22,
                          }}
                        >
                          + {tierBenefits[tier].length - 5} more benefits
                        </li>
                      )}
                    </ul>

                    {isCurrent ? (
                      <button
                        onClick={handleManageBilling}
                        className="gc-btn gc-btn-secondary"
                        style={{ width: '100%' }}
                      >
                        Manage Billing
                      </button>
                    ) : tier === 'free' && currentTier !== 'free' ? (
                      <button
                        className="gc-btn gc-btn-ghost"
                        style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
                        disabled
                      >
                        Downgrade
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgradeClick(tier)}
                        className={`gc-btn ${tier === 'premium' ? 'gc-btn-primary' : 'gc-btn-secondary'}`}
                        style={{ width: '100%' }}
                      >
                        {currentTier === 'free' || (currentTier === 'standard' && tier === 'premium')
                          ? 'Upgrade'
                          : 'Select Plan'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Notification Preferences */}
          <section>
            <h2 className="gc-section-title">Notification Preferences</h2>
            <div className="gc-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--gc-slate-800)',
                  }}
                >
                  Email Notifications
                </h3>
                
                {[
                  { key: 'emailNewRFQ' as const, label: 'New RFQ matches', desc: 'Get notified when a new RFQ matches your profile' },
                  { key: 'emailDeadlineReminder' as const, label: 'Deadline reminders', desc: 'Reminder 24h before RFQ deadlines' },
                  { key: 'emailWaveAccess' as const, label: 'Wave access alerts', desc: 'When new RFQs become available in your wave' },
                  { key: 'emailWeeklyDigest' as const, label: 'Weekly digest', desc: 'Summary of RFQ activity and opportunities' },
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      padding: '0.75rem',
                      background: 'var(--gc-slate-50)',
                      borderRadius: 'var(--gc-radius)',
                      cursor: 'pointer',
                      transition: 'background var(--gc-duration) var(--gc-ease)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifications[item.key]}
                      onChange={() => handleNotificationChange(item.key)}
                      style={{
                        width: 18,
                        height: 18,
                        marginTop: 2,
                        accentColor: 'var(--gc-emerald-600)',
                        cursor: 'pointer',
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          color: 'var(--gc-slate-800)',
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--gc-slate-500)',
                          marginTop: '0.15rem',
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </label>
                ))}

                <hr className="gc-divider" />

                <h3
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--gc-slate-800)',
                  }}
                >
                  Push Notifications
                </h3>

                {[
                  { key: 'pushNewRFQ' as const, label: 'New RFQ alerts', desc: 'Instant push when new RFQs are available' },
                  { key: 'pushDeadlineReminder' as const, label: 'Deadline reminders', desc: 'Push notification before deadlines' },
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      padding: '0.75rem',
                      background: 'var(--gc-slate-50)',
                      borderRadius: 'var(--gc-radius)',
                      cursor: 'pointer',
                      transition: 'background var(--gc-duration) var(--gc-ease)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifications[item.key]}
                      onChange={() => handleNotificationChange(item.key)}
                      style={{
                        width: 18,
                        height: 18,
                        marginTop: 2,
                        accentColor: 'var(--gc-emerald-600)',
                        cursor: 'pointer',
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          color: 'var(--gc-slate-800)',
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--gc-slate-500)',
                          marginTop: '0.15rem',
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <button
                className="gc-btn gc-btn-primary"
                style={{ marginTop: '1.5rem' }}
              >
                Save Preferences
              </button>
            </div>
          </section>

          {/* Billing Portal Link */}
          {currentTier !== 'free' && (
            <section>
              <h2 className="gc-section-title">Billing & Payments</h2>
              <div className="gc-card" style={{ padding: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--gc-radius-lg)',
                      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--gc-slate-900)',
                      }}
                    >
                      Stripe Billing Portal
                    </h3>
                    <p
                      style={{
                        margin: '0.25rem 0 0',
                        fontSize: '0.875rem',
                        color: 'var(--gc-slate-600)',
                      }}
                    >
                      Manage payment methods, view invoices, and update billing info
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="gc-btn gc-btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open Billing Portal
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedUpgradeTier && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100,
          }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="gc-card gc-animate-scale-in"
            style={{
              padding: '2rem',
              maxWidth: 450,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.5rem',
                fontWeight: 900,
                color: 'var(--gc-slate-900)',
              }}
            >
              Upgrade to {selectedUpgradeTier.charAt(0).toUpperCase() + selectedUpgradeTier.slice(1)}
            </h2>
            <p
              style={{
                margin: '0 0 1.5rem',
                fontSize: '0.9375rem',
                color: 'var(--gc-slate-600)',
              }}
            >
              You'll be redirected to our secure checkout to complete your upgrade.
            </p>

            <div
              style={{
                padding: '1rem',
                background: 'var(--gc-emerald-50)',
                borderRadius: 'var(--gc-radius)',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--gc-slate-700)' }}>
                  {selectedUpgradeTier.charAt(0).toUpperCase() + selectedUpgradeTier.slice(1)} Plan
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--gc-emerald-700)' }}>
                  ${billingCycle === 'monthly' 
                    ? tierPricing[selectedUpgradeTier].monthly 
                    : Math.round(tierPricing[selectedUpgradeTier].annual / 12)}/mo
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="gc-btn gc-btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // In production, redirect to Stripe checkout
                  window.location.href = `/api/checkout?tier=${selectedUpgradeTier}&cycle=${billingCycle}`
                }}
                className="gc-btn gc-btn-primary"
                style={{ flex: 1 }}
              >
                Continue to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
