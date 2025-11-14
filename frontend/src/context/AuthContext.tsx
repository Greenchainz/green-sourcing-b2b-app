 fix/add-data-provider-signup
// frontend/src/context/AuthContext.tsx
import { useEffect, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from './authContextDefinition';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from './authContextDefinition';
main

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setLoading(false);
        };
 fix/add-data-provider-signup

        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
           (_event: AuthChangeEvent, session: Session | null) => {


        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
 main
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

fix/add-data-provider-signup
// ADD THIS EXPORT
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// RE-EXPORT TYPES
export type { User, Session } from '@supabase/supabase-js';

 main
