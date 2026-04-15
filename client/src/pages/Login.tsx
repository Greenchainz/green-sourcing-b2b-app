import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// SVG icons for providers
const MicrosoftIcon = () => (
  <svg viewBox="0 0 21 21" className="w-5 h-5" width="20" height="20" fill="none">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

type EmailMode = "login" | "signup";

export default function Login() {
  const { user, isLoading } = useAuth();

  // Parse returnPath and role from query string
  const params = new URLSearchParams(window.location.search);
  const returnPath = params.get("returnPath") || "/dashboard";
  const role = params.get("role") || "";
  const error = params.get("error");

  // In local dev, skip the OAuth provider buttons entirely — email/password works with zero Azure config.
  const isLocalDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Email/password form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>(() => {
    // Default to signup if the user came from /get-started or the role param is set
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'login' ? 'login' : 'signup';
  });
  const [emailVal, setEmailVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [nameVal, setNameVal] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (!isLoading && user) {
      window.location.href = returnPath;
    }
  }, [user, isLoading, returnPath]);

  // Pending role — set by the role picker, read by ArchitectOnboardingGuard /
  // SupplierOnboardingGuard after login.
  const [pendingRole, setPendingRole] = useState<"architect" | "supplier" | null>(() => {
    try {
      return (sessionStorage.getItem("gc_pending_role") as "architect" | "supplier" | null) ?? null;
    } catch {
      return null;
    }
  });

  function selectRole(r: "architect" | "supplier") {
    setPendingRole(r);
    try { sessionStorage.setItem("gc_pending_role", r); } catch { /* ignore */ }
  }

  // All providers use direct server-side OAuth — no Easy Auth sidecar dependency.
  // All set the same app_session_id JWT cookie. One auth system.
  const roleParam = pendingRole ?? role ?? "";
  const microsoftUrl = `/api/auth/microsoft?returnPath=${encodeURIComponent(returnPath)}${roleParam ? `&role=${encodeURIComponent(roleParam)}` : ""}`;

  const errorMessages: Record<string, string> = {
    callback_failed: "Sign-in failed. Please try again.",
    missing_code: "Authorization was cancelled. Please try again.",
    access_denied: "Access was denied. Please try again.",
  };

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);

    const endpoint = emailMode === "signup"
      ? "/api/auth/email/signup"
      : "/api/auth/email/login";

    const body: Record<string, string> = { email: emailVal, password: passwordVal };
    if (emailMode === "signup") {
      body.name = nameVal;
      // Prefer the explicit role picker selection; fall back to URL param or default buyer
      body.role = pendingRole ?? (role || "buyer");
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.redirectTo || returnPath;
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/brand/greenchainz-icon.png" alt="GreenChainz" className="w-10 h-10" width="40" height="40" style={{width:40,height:40,flexShrink:0}} />
            <span className="text-2xl font-bold text-white">GreenChainz</span>
          </div>
          <p className="text-gray-400 text-sm">Verified Sustainable Sourcing</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-white text-center mb-2">
            Sign in to your account
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            {role === "supplier"
              ? "Continue as a Supplier"
              : role === "buyer"
              ? "Continue as a Buyer"
              : "Choose how you'd like to sign in"}
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm text-center">
              {errorMessages[error] ?? "An error occurred. Please try again."}
            </div>
          )}

          {/* Dev-mode notice */}
          {isLocalDev && (
            <div className="mb-5 p-3 bg-amber-900/30 border border-amber-700 rounded-lg text-amber-300 text-xs text-center">
              <strong>Local dev:</strong> OAuth requires Azure config. Email/password works right now — no setup needed.
            </div>
          )}

          {!showEmailForm ? (
            <>
              {/* Role picker — sets sessionStorage hint for onboarding guards */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 text-center mb-3">I am…</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => selectRole("architect")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      pendingRole === "architect"
                        ? "border-emerald-500 bg-emerald-900/30 text-white"
                        : "border-gray-700 hover:border-gray-500 text-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium leading-tight">🏛 Sourcing materials</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Architect / designer / PM</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRole("supplier")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      pendingRole === "supplier"
                        ? "border-emerald-500 bg-emerald-900/30 text-white"
                        : "border-gray-700 hover:border-gray-500 text-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium leading-tight">🏭 Selling materials</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Manufacturer / supplier</p>
                  </button>
                </div>
              </div>

              {/* Provider buttons — using <a> tags so the browser navigates to the
                  Easy Auth sidecar endpoints, bypassing client-side routing */}
              <div className="flex flex-col gap-3">
                <a
                  href={microsoftUrl}
                  className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl transition-colors duration-200 border border-gray-200"
                >
                  <MicrosoftIcon />
                  Continue with Microsoft
                </a>
              </div>

              {/* Email/password toggle */}
              <div className="mt-5 relative flex items-center">
                <div className="flex-grow border-t border-gray-800" />
                <span className="mx-3 text-xs text-gray-600 shrink-0">or</span>
                <div className="flex-grow border-t border-gray-800" />
              </div>

              <button
                onClick={() => setShowEmailForm(true)}
                className="mt-4 w-full px-4 py-3 bg-transparent border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-xl transition-colors duration-200 text-sm"
              >
                Continue with Email / Password
              </button>
            </>
          ) : (
            <>
              {/* Email/password form */}
              <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-6">
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${emailMode === "login" ? "bg-emerald-700 text-white" : "text-gray-400 hover:text-gray-200"}`}
                  onClick={() => { setEmailMode("login"); setEmailError(""); }}
                >
                  Sign In
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${emailMode === "signup" ? "bg-emerald-700 text-white" : "text-gray-400 hover:text-gray-200"}`}
                  onClick={() => { setEmailMode("signup"); setEmailError(""); }}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {emailMode === "signup" && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Full name</label>
                    <input
                      type="text"
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email address</label>
                  <input
                    type="email"
                    value={emailVal}
                    onChange={(e) => setEmailVal(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={passwordVal}
                    onChange={(e) => setPasswordVal(e.target.value)}
                    placeholder={emailMode === "signup" ? "Min 8 characters" : "Your password"}
                    required
                    minLength={emailMode === "signup" ? 8 : undefined}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {emailError && (
                  <p className="text-red-400 text-xs">{emailError}</p>
                )}

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors duration-200 text-sm"
                >
                  {emailLoading
                    ? "Please wait…"
                    : emailMode === "signup"
                    ? "Create Account"
                    : "Sign In"}
                </button>
              </form>

              <button
                onClick={() => { setShowEmailForm(false); setEmailError(""); }}
                className="mt-4 w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                ← Back to all sign-in options
              </button>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{" "}
              <a href="/terms" className="text-emerald-400 hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Sign up CTA — prominent, not buried */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm mb-3">New to GreenChainz?</p>
          <a
            href="/get-started"
            className="inline-flex items-center justify-center gap-2 w-full max-w-sm px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-emerald-500/25"
          >
            Create a free account →
          </a>
          <p className="text-xs text-gray-600 mt-3">
            Free to start · No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}
