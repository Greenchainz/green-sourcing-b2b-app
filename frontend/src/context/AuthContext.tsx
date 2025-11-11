import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

type Role = 'Admin' | 'Buyer' | 'Supplier';

export interface AuthUser {
    userId: number;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: Role;
    companyId?: number | null;
}

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Bootstrap auth from storage
    useEffect(() => {
        const stored = localStorage.getItem('greenchainz-token');
        if (!stored) {
            setLoading(false);
            return;
        }
        setToken(stored);
        // api interceptor will attach token from localStorage
        api.get('/users/me')
            .then((res) => {
                const u = res.data;
                setUser({
                    userId: Number(u.userId),
                    email: u.email,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    role: u.role,
                    companyId: u.company?.companyId ?? null,
                });
            })
            .catch(() => {
                // invalid token
                localStorage.removeItem('greenchainz-token');
                setToken(null);
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { token: t, user: u } = res.data;
        localStorage.setItem('greenchainz-token', t);
        setToken(t);
        setUser({
            userId: Number(u.userId),
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            companyId: u.companyId ?? null,
        });
    };

    const logout = () => {
        localStorage.removeItem('greenchainz-token');
        setToken(null);
        setUser(null);
    };

    const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
