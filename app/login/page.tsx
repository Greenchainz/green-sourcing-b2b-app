'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleAzureLogin = async () => {
    setLoading(true)
    try {
      await signIn('azure-ad-b2c', { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('Login failed:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6">Log In to GreenChainz</h1>
        
        <button
          onClick={handleAzureLogin}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Continue with Microsoft'}
        </button>
      </div>
    </div>
  )
}
