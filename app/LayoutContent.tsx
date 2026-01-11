'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    Intercom: any
    intercomSettings: any
  }
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Initialize Intercom AFTER page load
    if (typeof window !== 'undefined') {
      window.intercomSettings = {
        api_base: "https://api-iam.intercom.io",
        app_id: "cqtm1euj", // GET THIS FROM INTERCOM DASHBOARD
      }

      // Load Intercom script
      const script = document.createElement('script')
      script.async = true
      script.src = `https://widget.intercom.io/widget/yourAppIdHere`
      document.body.appendChild(script)

      script.onload = () => {
        if (window.Intercom) {
          window.Intercom('boot', window.intercomSettings)
        }
      }
    }
  }, [])

  // Update Intercom on route change
  useEffect(() => {
    if (window.Intercom) {
      window.Intercom('update')
    }
  }, [pathname])

  return <>{children}</>
}
