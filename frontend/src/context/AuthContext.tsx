import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type Role = 'Admin' | 'Buyer' | 'Supplier';

export interface AuthUser {
    userId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: Role;
    companyId?: number | null;
}

interface AuthContextValue {
    user: AuthUser | null;
    supabaseUser: SupabaseUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Bootstrap auth from Supabase session
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSupabaseUser(session?.user ?? null);
            if (session?.user) {
                // Map Supabase user to AuthUser
                setUser({
                    userId: session.user.id,
                    email: session.user.email!,
                    firstName: session.user.user_metadata?.first_name ?? null,
                    lastName: session.user.user_metadata?.last_name ?? null,
                    role: session.user.user_metadata?.role ?? 'Buyer',
                    companyId: session.user.user_metadata?.company_id ?? null,
                });
            }
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSupabaseUser(session?.user ?? null);
            if (session?.user) {
                setUser({
                    userId: session.user.id,
                    email: session.user.email!,
                    firstName: session.user.user_metadata?.first_name ?? null,
                    lastName: session.user.user_metadata?.last_name ?? null,
                    role: session.user.user_metadata?.role ?? 'Buyer',
                    companyId: session.user.user_metadata?.company_id ?? null,
                });
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        if (data.user) {
            setSupabaseUser(data.user);
            setUser({
                userId: data.user.id,
                email: data.user.email!,
                firstName: data.user.user_metadata?.first_name ?? null,
                lastName: data.user.user_metadata?.last_name ?? null,
                role: data.user.user_metadata?.role ?? 'Buyer',
                companyId: data.user.user_metadata?.company_id ?? null,
            });
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setSupabaseUser(null);
        setUser(null);
    };

    const value = useMemo(() => ({ user, supabaseUser, loading, login, logout }), [user, supabaseUser, loading]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
