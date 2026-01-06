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

        if (!appId) {
            console.warn('[Intercom] NEXT_PUBLIC_INTERCOM_APP_ID not configured')
            return
        }

        // Boot Intercom with user identity if logged in
        if (user?.id) {
            Intercom({
                app_id: appId,
                user_id: user.id,
                name: user.name || undefined,
                email: user.email || undefined,
                created_at: user.createdAt || undefined,
            })
        } else {
            // Boot Intercom anonymously for visitors
            Intercom({
                app_id: appId,
            })
        }

        // Cleanup on unmount
        return () => {
            if (typeof window !== 'undefined' && (window as any).Intercom) {
                ; (window as any).Intercom('shutdown')
            }
        }
    }, [user])

    return null // This component doesn't render anything
}
