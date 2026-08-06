import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { setUserRole } from "@/lib/api-client";
import { getMicrosoftLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

type DesiredRole = "architect" | "supplier" | null;

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    invalid_state: "Sign-in session expired or was tampered with. Please try again.",
    missing_code: "Sign-in was cancelled or didn't complete. Please try again.",
    invalid_grant: "Your Microsoft sign-in code expired or was already used. Please try signing in again.",
    aad_redirect_mismatch: "Microsoft sign-in redirect URI mismatch (AADSTS50011). Please contact support to verify Azure redirect settings.",
    oauth_config_missing: "Microsoft sign-in is temporarily unavailable due to server configuration. Please contact support.",
    callback_failed: "Sign-in failed on the server. Please try again — if this keeps happening, contact support.",
    unknown_provider: "Unknown sign-in provider. Please use the button below.",
    access_denied: "You cancelled the sign-in or denied access. Please try again.",
    marketplace_missing_token: "Marketplace sign-in token was missing. Please retry from Microsoft Marketplace.",
    marketplace_invalid_token: "Marketplace sign-in token was invalid or expired. Please retry from Microsoft Marketplace.",
    marketplace_resolve_failed: "We couldn't confirm your marketplace subscription yet. You can sign out and try again.",
    marketplace_provision_failed: "Your Microsoft callback succeeded, but account provisioning failed. You can sign out and retry safely.",
    marketplace_activation_failed: "Your account was created but activation confirmation failed. Please sign out and retry once.",
    marketplace_internal_error: "Marketplace sign-in hit an unexpected error. Sign out and retry to recover.",
};

function getOAuthErrorMessage(error: string | null): string | null {
    if (!error) return null;
    return OAUTH_ERROR_MESSAGES[error] ?? `Sign-in error: ${error}. Please try again.`;
}

export default function Login() {
    const { user, isLoading, logout } = useAuth();

    const params = new URLSearchParams(window.location.search);
    const rawReturnPath = params.get("returnPath") || "/dashboard";
    // Validate returnPath is a safe relative path (prevent open redirect)
    const returnPath = /^\/(?!\/)/.test(rawReturnPath) ? rawReturnPath : "/dashboard";
    const roleParam = params.get("role");
    const oauthError = getOAuthErrorMessage(params.get("error"));
    const hasBlockingError = Boolean(oauthError);

    const [pendingRole, setPendingRole] = useState<DesiredRole>(() => {
        try {
            return (sessionStorage.getItem("gc_pending_role") as DesiredRole) ?? null;
        } catch {
            return null;
        }
    });
    const [roleSyncing, setRoleSyncing] = useState(false);

    useEffect(() => {
        if (!isLoading && user) {
            if (hasBlockingError) {
                // Keep the user on this page so they can recover (sign out / retry)
                return;
            }
            // Prevent redirect loops: if we just arrived from the dashboard within the
            // last 3 seconds, don't immediately redirect back — the user is likely in a
            // loop where tRPC queries fail and bounce them back here.
            const LOOP_GUARD_KEY = "gc_login_redirect_ts";
            const now = Date.now();
            try {
                const lastRedirect = Number(sessionStorage.getItem(LOOP_GUARD_KEY) || "0");
                if (now - lastRedirect < 3000) {
                    // We're in a loop — clear cache and show login page instead of looping.
                    console.warn("[Login] Redirect loop detected — staying on login page");
                    sessionStorage.removeItem("gc_auth_user");
                    sessionStorage.removeItem(LOOP_GUARD_KEY);
                    return;
                }
                sessionStorage.setItem(LOOP_GUARD_KEY, String(now));
            } catch {
                // sessionStorage unavailable — proceed normally
            }

            const desiredRole = pendingRole ?? (roleParam === "supplier" ? "supplier" : roleParam === "buyer" ? "architect" : null);

            if (!desiredRole || user.role === desiredRole) {
                window.location.replace(returnPath);
                return;
            }

            let cancelled = false;
            setRoleSyncing(true);
            void setUserRole(desiredRole)
                .then(() => {
                    if (!cancelled) window.location.replace(returnPath);
                })
                .catch(() => {
                    if (!cancelled) window.location.replace(returnPath);
                })
                .finally(() => {
                    if (!cancelled) setRoleSyncing(false);
                });

            return () => {
                cancelled = true;
            };
        }
    }, [hasBlockingError, isLoading, pendingRole, roleParam, returnPath, user]);

    useEffect(() => {
        if (!pendingRole) return;
        try {
            sessionStorage.setItem("gc_pending_role", pendingRole);
        } catch {
            // ignore
        }
    }, [pendingRole]);

    const selectedRole = pendingRole ?? (roleParam === "supplier" ? "supplier" : roleParam === "buyer" ? "architect" : null);
    const loginUrl = getMicrosoftLoginUrl(returnPath, selectedRole ?? undefined);

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8 sm:py-0">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src="/brand/greenchainz-icon.webp" alt="GreenChainz" className="w-10 h-10 shrink-0" width="40" height="40" />
                        <span className="text-xl sm:text-2xl font-bold text-white">GreenChainz</span>
                    </div>
                    <p className="text-gray-400 text-sm">Verified Sustainable Sourcing</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-8 shadow-2xl">
                    <h1 className="text-xl font-semibold text-white text-center mb-2">Sign in to your account</h1>
                    <p className="text-gray-400 text-sm text-center mb-8">
                        {selectedRole === "supplier"
                            ? "Continue as a Supplier"
                            : selectedRole === "architect"
                                ? "Continue as an Architect"
                                : "Choose how you'd like to sign in"}
                    </p>

                    {oauthError && (
                        <div className="mb-5 rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300" role="alert" aria-live="polite">
                            {oauthError}
                        </div>
                    )}

                    {user && hasBlockingError && (
                        <div className="mb-5 rounded-lg border border-amber-700 bg-amber-900/30 px-4 py-3 text-sm text-amber-200">
                            You are currently signed in. If this page keeps failing, sign out to clear the session and retry.
                            <div className="mt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-amber-500/40 bg-transparent text-amber-100 hover:bg-amber-800/30"
                                    onClick={logout}
                                >
                                    Sign out and retry
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <p className="text-xs text-gray-500 text-center mb-3">I am…</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingRole("architect")}
                                className={`p-3 rounded-xl border text-left transition-all ${selectedRole === "architect"
                                    ? "border-emerald-500 bg-emerald-900/30 text-white"
                                    : "border-gray-700 hover:border-gray-500 text-gray-300"
                                    }`}
                            >
                                <p className="text-sm font-medium leading-tight">🏛 Sourcing materials</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Architect / designer / PM</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingRole("supplier")}
                                className={`p-3 rounded-xl border text-left transition-all ${selectedRole === "supplier"
                                    ? "border-emerald-500 bg-emerald-900/30 text-white"
                                    : "border-gray-700 hover:border-gray-500 text-gray-300"
                                    }`}
                            >
                                <p className="text-sm font-medium leading-tight">🏭 Selling materials</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Manufacturer / supplier</p>
                            </button>
                        </div>
                    </div>

                    <a
                        href={loginUrl}
                        className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl transition-colors duration-200 border border-gray-200"
                    >
                        Continue with Microsoft
                    </a>

                    <div className="mt-5 text-center text-xs text-gray-500">
                        {roleSyncing ? "Syncing your role after sign-in…" : "You will return here after Microsoft sign-in finishes."}
                    </div>
                </div>
            </div>
        </div>
    );
}
