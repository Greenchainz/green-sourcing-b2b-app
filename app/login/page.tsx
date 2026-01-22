import { signIn } from "@/app/app.auth";
import Image from "next/image";
import Link from "next/link";

export default async function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-teal-200/30 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-emerald-100 bg-white/90 p-8 shadow-xl backdrop-blur">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <Image
              src="/brand/logo-main.png"
              alt="GreenChainz"
              width={180}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </Link>
          <h2 className="mt-5 text-2xl font-semibold text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access the Global Trust Layer
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
          }}
          className="space-y-4"
        >
          <button
            type="submit"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0078D4] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#006abc] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-2"
          >
            <svg
              className="h-4 w-4 text-white"
              viewBox="0 0 23 23"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="currentColor"
                d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"
              />
            </svg>
            Sign in with Microsoft Entra ID
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
