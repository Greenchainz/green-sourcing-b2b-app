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
    const fetchUser = async () => {
      // Get the stored token from localStorage
      const token = localStorage.getItem('accessToken')
      
      // If no token, user is not authenticated - don't call the API
      if (!token) {
        console.warn('[Auth] No access token found')
        setLoading(false)
        return
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      
      try {
        const res = await fetch(`${backendUrl}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include'
        })

        if (!res.ok) {
          console.warn('[Auth] User not authenticated or session expired')
          // Token might be expired - clear it
          if (res.status === 401) {
            localStorage.removeItem('accessToken')
          }
          setLoading(false)
          return
        }

        const data = await res.json()
        if (data?.user) {
          const firstName = data.user.firstName || ''
          const lastName = data.user.lastName || ''
          const fullName = data.user.name || `${firstName} ${lastName}`.trim() || undefined
          
          setUser({
            id: data.user.userId || data.user.id,
            name: fullName,
            email: data.user.email,
            createdAt: data.user.createdAt ? Math.floor(new Date(data.user.createdAt).getTime() / 1000) : undefined
          })
        }
      } catch (err) {
        console.error('[Auth] Failed to fetch user:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading }
}
