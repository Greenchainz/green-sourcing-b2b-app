'use client'
import { useState, useEffect } from 'react'

export interface AuthUser {
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
        // Fetch user data
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
          const fullName = data.user.name || data.user.fullName || `${firstName} ${lastName}`.trim() || undefined
          
          setUser({
            id: data.user.userId || data.user.id,
            name: fullName,
            email: data.user.email,
            createdAt: data.user.createdAt ? Math.floor(new Date(data.user.createdAt).getTime() / 1000) : undefined,
            role: data.user.role,
            layer: data.user.layer,
            primaryMotivation: data.user.primaryMotivation,
            priorityLevel: data.user.priorityLevel,
            jobTitle: data.user.jobTitle,
            rfqCount: data.user.rfqCount || 0,
            tier: data.user.tier
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
