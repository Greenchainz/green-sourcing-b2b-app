'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './hooks/useAuth'
import IntercomWidget from './components/IntercomWidget'

// Define types for Intercom
type IntercomWindow = Window & {
  Intercom?: (command: string, data?: Record<string, unknown>) => void
  intercomSettings?: {
    api_base?: string
    app_id: string
    [key: string]: unknown
  }
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, intercomIdentity, loading } = useAuth()

  useEffect(() => {
    // Initialize Intercom AFTER page load
    if (typeof window !== 'undefined') {
      const win = window as IntercomWindow
      const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID

      if (!appId) {
        console.warn('[Intercom] NEXT_PUBLIC_INTERCOM_APP_ID not configured - chat widget disabled')
        return
      }

      win.intercomSettings = {
        api_base: "https://api-iam.intercom.io",
        app_id: appId,
      }

      // Load Intercom script
      const script = document.createElement('script')
      script.async = true
      script.src = `https://widget.intercom.io/widget/${appId}`
      document.body.appendChild(script)

      script.onload = () => {
        if (win.Intercom) {
          win.Intercom('boot', win.intercomSettings)
        }
      }

      // Cleanup function
      return () => {
        // Remove the script on unmount
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      }
    }
  }, [])

  // Update Intercom on route change
  useEffect(() => {
    const win = window as IntercomWindow
    if (win.Intercom) {
      win.Intercom('update')
    }
  }, [pathname])

  return (
    <>
      {!loading && (
        <IntercomWidget 
          user={user || undefined} 
          userHash={intercomIdentity?.userHash}
        />
      )}
      {children}
    </>
  )
}
