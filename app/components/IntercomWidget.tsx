'use client'

import { useEffect, useState, useCallback } from 'react'
import { useIntercom } from './IntercomProvider'
import { BlockerAlert } from './BlockerAlert'

// Type for Ketch consent object
interface KetchConsent {
    functional?: boolean | { consented?: boolean };
    marketing?: boolean | { consented?: boolean };
}

interface IntercomWidgetProps {
    user?: {
        id: string
        name?: string
        email?: string
        createdAt?: number
        role?: string
        layer?: string
        primaryMotivation?: string
        priorityLevel?: string
        jobTitle?: string
        rfqCount?: number
        tier?: string
    }
    userHash?: string
}

/**
 * IntercomWidget - Manages Intercom user data updates and consent
 * 
 * This component works with the IntercomProvider to:
 * - Update user data when authentication changes
 * - Handle consent management (Ketch integration)
 * - Provide AdBlock detection and fallback
 */
export default function IntercomWidget({ user, userHash }: IntercomWidgetProps) {
    const { shutdown, update, show } = useIntercom()
    const [blockerDetected, setBlockerDetected] = useState(false)

    useEffect(() => {
        const requireConsent = process.env.NEXT_PUBLIC_INTERCOM_REQUIRE_CONSENT === 'true'

        // Check if Intercom is blocked (AdBlock detection)
        let checkBlockerTimeout: NodeJS.Timeout | undefined

        const checkIntercomBlocked = () => {
            // Wait for Intercom to potentially load, then check for the launcher frame
            checkBlockerTimeout = setTimeout(() => {
                const intercomFrame = document.querySelector('iframe[name="intercom-launcher-frame"]')
                if (!intercomFrame) {
                    console.warn('[Intercom] Launcher frame not found - may be blocked')
                }
            }, 2000) // Give Intercom time to initialize
        }

        const updateIntercomUser = () => {
            if (user?.id) {
                const userData: Record<string, unknown> = {
                    userId: user.id,
                    name: user.name || undefined,
                    email: user.email || undefined,
                    createdAt: user.createdAt || undefined,
                }

                // Add identity verification hash if available (required for Secure Mode)
                if (userHash) {
                    userData.userHash = userHash
                }

                // Add Decision Maker attributes for strategic context
                const customAttributes: Record<string, unknown> = {}
                if (user.layer) customAttributes.role_layer = user.layer
                if (user.primaryMotivation) customAttributes.decision_metric = user.primaryMotivation
                if (user.priorityLevel) customAttributes.sustainability_priority = user.priorityLevel
                if (user.rfqCount !== undefined) customAttributes.active_rfqs = user.rfqCount
                if (user.role) customAttributes.user_role = user.role
                if (user.tier) customAttributes.subscription_tier = user.tier
                if (user.jobTitle) customAttributes.job_title = user.jobTitle

                if (Object.keys(customAttributes).length > 0) {
                    userData.customAttributes = customAttributes
                }

                update(userData)
            }
        }

        const tryBootWithConsent = async () => {
            const win = typeof window !== 'undefined' ? window as Window & { ketch?: { getConsent: () => Promise<KetchConsent> } } : undefined
            const ketch = win?.ketch
            if (!ketch || typeof ketch.getConsent !== 'function') {
                console.info('[Intercom] Ketch not detected; proceeding without consent gate')
                updateIntercomUser()
                checkIntercomBlocked()
                return
            }
            try {
                const consent = await ketch.getConsent()
                const functionalConsent = consent?.functional
                const marketingConsent = consent?.marketing
                const functional = typeof functionalConsent === 'boolean' 
                    ? functionalConsent 
                    : !!(functionalConsent && typeof functionalConsent === 'object' && 'consented' in functionalConsent ? functionalConsent.consented : false)
                const marketing = typeof marketingConsent === 'boolean'
                    ? marketingConsent
                    : !!(marketingConsent && typeof marketingConsent === 'object' && 'consented' in marketingConsent ? marketingConsent.consented : false)
                if (functional || marketing) {
                    updateIntercomUser()
                    checkIntercomBlocked()
                } else {
                    console.info('[Intercom] Consent not granted; chat disabled')
                    shutdown()
                }
            } catch (err) {
                console.warn('[Intercom] Consent check failed', err)
            }
        }

        if (requireConsent) {
            // Attempt initial update based on current consent
            tryBootWithConsent()
            // Listen for consent change events (event name may vary by Ketch setup)
            const handler = () => tryBootWithConsent()
            window.addEventListener('ketch:consent', handler as EventListener)
            return () => {
                window.removeEventListener('ketch:consent', handler as EventListener)
                if (checkBlockerTimeout) clearTimeout(checkBlockerTimeout)
            }
        } else {
            updateIntercomUser()
            checkIntercomBlocked()
            return () => {
                if (checkBlockerTimeout) clearTimeout(checkBlockerTimeout)
            }
        }
    }, [user, userHash, shutdown, update])

    /**
     * Opens Intercom with AdBlock fallback
     * Can be called from other components via ref or context
     */
    const handleShowChat = useCallback(() => {
        try {
            show()
            
            // Double-check: If 'show' was called but the frame doesn't appear after 500ms,
            // it means the network request was blocked
            setTimeout(() => {
                const intercomFrame = document.querySelector('iframe[name="intercom-launcher-frame"]')
                if (!intercomFrame) {
                    setBlockerDetected(true)
                }
            }, 500)
        } catch (err) {
            console.error('[Intercom] Failed to open chat:', err)
            setBlockerDetected(true)
        }
    }, [show])

    // Expose handleShowChat for external use
    useEffect(() => {
        // Make the show function available globally for components that need it
        if (typeof window !== 'undefined') {
            (window as Window & { openIntercomChat?: () => void }).openIntercomChat = handleShowChat
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete (window as Window & { openIntercomChat?: () => void }).openIntercomChat
            }
        }
    }, [handleShowChat])

    return (
        <BlockerAlert 
            isOpen={blockerDetected} 
            onClose={() => setBlockerDetected(false)} 
        />
    )
}
