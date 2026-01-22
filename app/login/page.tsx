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

        <div className="space-y-3">
          {/* LinkedIn Sign In */}
          <form
            action={async () => {
              "use server";
              await signIn("linkedin", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#004182] focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:ring-offset-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Sign in with LinkedIn
            </button>
          </form>

          {/* Google Sign In */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </form>

          {/* Microsoft Entra ID Sign In */}
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0078D4] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#006abc] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 23 23"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z" />
              </svg>
              Sign in with Microsoft
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
