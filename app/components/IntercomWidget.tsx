'use client'

import { useEffect } from 'react'
import Intercom from '@intercom/messenger-js-sdk'

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
    }
}

export default function IntercomWidget({ user }: IntercomWidgetProps) {
    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID
        const requireConsent = process.env.NEXT_PUBLIC_INTERCOM_REQUIRE_CONSENT === 'true'

        if (!appId) {
            console.warn('[Intercom] NEXT_PUBLIC_INTERCOM_APP_ID not configured')
            return
        }

        const bootIntercom = () => {
            if (user?.id) {
                Intercom({
                    app_id: appId,
                    user_id: user.id,
                    name: user.name || undefined,
                    email: user.email || undefined,
                    created_at: user.createdAt || undefined,
                })
            } else {
                Intercom({ app_id: appId })
            }
        }

        const shutdownIntercom = () => {
            if (typeof window !== 'undefined') {
                const win = window as Window & { Intercom?: (command: string) => void };
                if (win.Intercom) {
                    win.Intercom('shutdown')
                }
            }
        }

        const tryBootWithConsent = async () => {
            const win = typeof window !== 'undefined' ? window as Window & { ketch?: { getConsent: () => Promise<KetchConsent> } } : undefined
            const ketch = win?.ketch
            if (!ketch || typeof ketch.getConsent !== 'function') {
                console.info('[Intercom] Ketch not detected; skipping consent gate')
                return // Do not boot if consent is required but Ketch is unavailable
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
                    bootIntercom()
                } else {
                    console.info('[Intercom] Consent not granted; chat disabled')
                }
            } catch (err) {
                console.warn('[Intercom] Consent check failed; not booting', err)
            }
        }

        if (requireConsent) {
            // Attempt initial boot based on current consent
            tryBootWithConsent()
            // Listen for consent change events (event name may vary by Ketch setup)
            const handler = () => tryBootWithConsent()
            window.addEventListener('ketch:consent', handler as EventListener)
            return () => {
                window.removeEventListener('ketch:consent', handler as EventListener)
                shutdownIntercom()
            }
        } else {
            bootIntercom()
            return () => shutdownIntercom()
        }
    }, [user])

    return null // This component doesn't render anything
}
