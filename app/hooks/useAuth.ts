'use client'
import { useState, useEffect } from 'react'

export interface AuthUser {
  id: string
  name?: string
  email?: string
  createdAt?: number
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch current user from backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    fetch(`${backendUrl}/api/v1/auth/me`, {
      credentials: 'include'
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setUser({
            id: data.user.userId || data.user.id,
            name: data.user.name || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || undefined,
            email: data.user.email,
            createdAt: data.user.createdAt ? Math.floor(new Date(data.user.createdAt).getTime() / 1000) : undefined
          })
        }
      })
      .catch(err => console.error('[Auth] Failed to fetch user:', err))
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}
