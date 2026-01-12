'use client';

import { ReactNode, createContext, useContext } from 'react';
import { IntercomProvider as ReactIntercomProvider, useIntercom as useReactIntercom } from 'react-use-intercom';

// Context to track if Intercom is enabled
const IntercomEnabledContext = createContext(false);

// Custom hook that safely returns a no-op when Intercom is disabled
export function useIntercom() {
  const isEnabled = useContext(IntercomEnabledContext);
  const realIntercom = isEnabled ? useReactIntercom() : null;
  
  // Return no-op functions when Intercom is disabled
  if (!realIntercom) {
    return {
      boot: () => {},
      shutdown: () => {},
      update: () => {},
      show: () => {},
      hide: () => {},
      showMessages: () => {},
      showNewMessage: () => {},
      getVisitorId: () => '',
      startTour: () => {},
      trackEvent: () => {},
      startSurvey: () => {},
      showArticle: () => {},
      showSpace: () => {},
      startChecklist: () => {},
      showTicket: () => {},
      showConversation: () => {},
      showNews: () => {},
    };
  }
  
  return realIntercom;
}

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
    return (
      <IntercomEnabledContext.Provider value={false}>
        {children}
      </IntercomEnabledContext.Provider>
    );
  }

  // Build user props for authenticated users
  const userProps = user ? (() => {
    // Filter out undefined custom attributes
    const customAttributes: Record<string, unknown> = {};
    if (user.layer !== undefined) customAttributes.role_layer = user.layer;
    if (user.primaryMotivation !== undefined) customAttributes.decision_metric = user.primaryMotivation;
    if (user.priorityLevel !== undefined) customAttributes.sustainability_priority = user.priorityLevel;
    if (user.rfqCount !== undefined) customAttributes.active_rfqs = user.rfqCount;
    if (user.role !== undefined) customAttributes.user_role = user.role;
    if (user.tier !== undefined) customAttributes.subscription_tier = user.tier;
    if (user.jobTitle !== undefined) customAttributes.job_title = user.jobTitle;

    const props: Record<string, unknown> = {
      userId: user.id,
    };
    if (user.email !== undefined) props.email = user.email;
    if (user.name !== undefined) props.name = user.name;
    if (user.intercomHash !== undefined) props.userHash = user.intercomHash;
    if (user.createdAt !== undefined) props.createdAt = user.createdAt;
    if (Object.keys(customAttributes).length > 0) props.customAttributes = customAttributes;

    return props;
  })() : undefined;

  return (
    <IntercomEnabledContext.Provider value={true}>
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
    </IntercomEnabledContext.Provider>
  );
}
