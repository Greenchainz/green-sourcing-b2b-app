'use client';

import { ReactNode } from 'react';
import { IntercomProvider as ReactIntercomProvider } from 'react-use-intercom';

// Re-export the hook from react-use-intercom for convenience
export { useIntercom } from 'react-use-intercom';

interface IntercomProviderProps {
  children: ReactNode;
  user?: {
    id: string;
    name?: string;
    email?: string;
    createdAt?: number;
    intercomHash?: string;
    // Decision Maker attributes
    role?: string;
    layer?: string;
    primaryMotivation?: string;
    priorityLevel?: string;
    jobTitle?: string;
    rfqCount?: number;
    tier?: string;
  };
}

/**
 * IntercomProvider - Wrapper around react-use-intercom for Next.js PWA
 * 
 * This implementation:
 * - Uses the NPM method which bypasses some AdBlockers
 * - Automatically handles SPA route changes
 * - Supports Intercom's Secure Mode via userHash
 */
export function IntercomProvider({ children, user }: IntercomProviderProps) {
  const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;

  if (!appId) {
    console.warn('[Intercom] NEXT_PUBLIC_INTERCOM_APP_ID not configured - chat widget disabled');
    return <>{children}</>;
  }

  // Build user props for authenticated users
  const userProps = user ? {
    userId: user.id,
    email: user.email,
    name: user.name,
    userHash: user.intercomHash, // Required for Secure Mode
    createdAt: user.createdAt,
    // Custom attributes for Decision Maker targeting
    customAttributes: {
      role_layer: user.layer,
      decision_metric: user.primaryMotivation,
      sustainability_priority: user.priorityLevel,
      active_rfqs: user.rfqCount,
      user_role: user.role,
      subscription_tier: user.tier,
      job_title: user.jobTitle,
    },
  } : undefined;

  return (
    <ReactIntercomProvider
      appId={appId}
      apiBase="https://api-iam.intercom.io" // US Region
      autoBoot={true}
      shouldInitialize={true}
      initializeDelay={500}
      {...userProps}
    >
      {children}
    </ReactIntercomProvider>
  );
}
