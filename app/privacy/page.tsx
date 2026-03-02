'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PrivacyRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/legal/privacy')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 text-lg">Loading Privacy Policy...</p>
        <p className="text-slate-400 text-sm mt-2">
          If you are not redirected,{' '}
          <a href="/legal/privacy" className="text-green-600 underline">
            click here
          </a>
          .
        </p>
      </div>
    </div>
  )
}
