'use client'

import { useAuth } from './hooks/useAuth'
import { IntercomProvider } from './components/IntercomProvider'
import IntercomWidget from './components/IntercomWidget'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, intercomIdentity, loading } = useAuth()

  // Build user object with intercomHash for the provider
  const intercomUser = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    intercomHash: intercomIdentity?.userHash,
    role: user.role,
    layer: user.layer,
    primaryMotivation: user.primaryMotivation,
    priorityLevel: user.priorityLevel,
    jobTitle: user.jobTitle,
    rfqCount: user.rfqCount,
    tier: user.tier,
  } : undefined

  return (
    <IntercomProvider user={intercomUser}>
      {!loading && (
        <IntercomWidget 
          user={user || undefined} 
          userHash={intercomIdentity?.userHash}
        />
      )}
      {children}
    </IntercomProvider>
  )
}
