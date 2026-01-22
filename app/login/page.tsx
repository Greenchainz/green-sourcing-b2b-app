import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
