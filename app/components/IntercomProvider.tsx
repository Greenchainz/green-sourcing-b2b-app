"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import Intercom from "@intercom/messenger-js-sdk";

interface IntercomContextType {
  boot: (user?: any) => void;
  shutdown: () => void;
  update: (data: any) => void;
  show: () => void;
  hide: () => void;
}

const IntercomContext = createContext<IntercomContextType | undefined>(
  undefined
);

interface IntercomProviderProps {
  children: ReactNode;
  appId?: string;
}

export function IntercomProvider({
  children,
  appId: propAppId,
}: IntercomProviderProps) {
  const appId = propAppId || process.env.NEXT_PUBLIC_INTERCOM_APP_ID;

  const boot = (user?: any) => {
    if (!appId) return;

    if (user) {
      Intercom({
        app_id: appId,
        user_id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.createdAt,
        ...user,
      });
    } else {
      Intercom({ app_id: appId });
    }
  };

  const shutdown = () => {
    (Intercom as any)("shutdown");
  };

  const update = (data: any) => {
    (Intercom as any)("update", data);
  };

  const show = () => {
    (Intercom as any)("show");
  };

  const hide = () => {
    (Intercom as any)("hide");
  };

  return (
    <IntercomContext.Provider value={{ boot, shutdown, update, show, hide }}>
      {children}
    </IntercomContext.Provider>
  );
}

export function useIntercom() {
  const context = useContext(IntercomContext);
  if (context === undefined) {
    throw new Error("useIntercom must be used within an IntercomProvider");
  }
  return context;
}
