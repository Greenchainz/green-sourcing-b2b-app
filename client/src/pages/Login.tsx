import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { setUserRole } from "@/lib/api-client";
import { getLoginUrl } from "@/const";

type DesiredRole = "architect" | "supplier" | null;

export default function Login() {
    const { user, isLoading } = useAuth();

    const params = new URLSearchParams(window.location.search);
    const returnPath = params.get("returnPath") || "/dashboard";
    const roleParam = params.get("role");

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
    }, [isLoading, pendingRole, roleParam, returnPath, user]);

    useEffect(() => {
        if (!pendingRole) return;
        try {
            sessionStorage.setItem("gc_pending_role", pendingRole);
        } catch {
            // ignore
        }
    }, [pendingRole]);

    const selectedRole = pendingRole ?? (roleParam === "supplier" ? "supplier" : roleParam === "buyer" ? "architect" : null);
    const loginUrl = getLoginUrl(returnPath, selectedRole ?? undefined);

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8 sm:py-0">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src="/brand/greenchainz-icon.png" alt="GreenChainz" className="w-10 h-10" width="40" height="40" style={{ width: 40, height: 40, flexShrink: 0 }} />
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
                        {roleSyncing ? "Syncing your role after sign-in…" : "You will return here after Easy Auth finishes sign-in."}
                    </div>
                </div>
            </div>
        </div>
    );
}
