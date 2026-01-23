"use client";

import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";

const loginRequest = {
  scopes: ["User.Read"], // plus your api://... scope if needed
};

export default function LoginPage() {
  const { instance, accounts } = useMsal();

  const handleLogin = async () => {
    // Try SSO first (no popup if user already has Entra session)
    try {
      const account = accounts[0] ?? null;
      if (account) {
        await instance.ssoSilent({ ...loginRequest, account });
        return;
      }
    } catch {
      // falls through to interactive
    }

    await instance.loginRedirect(loginRequest);
  };

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <main>
      <AuthenticatedTemplate>
        <p>You are signed in.</p>
        <button onClick={handleLogout}>Sign out</button>
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <button onClick={handleLogin}>Sign in with Microsoft</button>
      </UnauthenticatedTemplate>
    </main>
  );
}
