// app/login/page.tsx (or similar)
"use client";

import { useMsal } from "@azure/msal-react";

const loginRequest = {
  scopes: ["User.Read"], // Microsoft Graph basic scope
};

export default function LoginPage() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return (
    <main>
      <button onClick={handleLogin}>Sign in with Microsoft</button>
    </main>
  );
}
