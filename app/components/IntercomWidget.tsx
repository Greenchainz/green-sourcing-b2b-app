'use client'

import { useEffect } from 'react'
import Intercom from '@intercom/messenger-js-sdk'

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
            if (typeof window !== 'undefined' && (window as any).Intercom) {
                ; (window as any).Intercom('shutdown')
            }
        }

        const tryBootWithConsent = async () => {
            const ketch = (typeof window !== 'undefined' ? (window as any).ketch : undefined)
            if (!ketch || typeof ketch.getConsent !== 'function') {
                console.info('[Intercom] Ketch not detected; skipping consent gate')
                return // Do not boot if consent is required but Ketch is unavailable
            }
            try {
                const consent = await ketch.getConsent()
                const functional = !!(consent?.functional?.consented ?? consent?.functional)
                const marketing = !!(consent?.marketing?.consented ?? consent?.marketing)
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
            window.addEventListener('ketch:consent', handler as any)
            return () => {
                window.removeEventListener('ketch:consent', handler as any)
                shutdownIntercom()
            }
        } else {
            bootIntercom()
            return () => shutdownIntercom()
        }
    }, [user])

    return null // This component doesn't render anything
}
