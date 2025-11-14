feat/supplier-dashboard
import { useEffect, useState, useContext } from 'react';

// frontend/src/context/AuthContext.tsx
import { useEffect, useState, useContext, createContext } from 'react';
main
import type { ReactNode } from 'react';
import { supabase } from '../../lib/supabase'; // Corrected path
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
 feat/supplier-dashboard


// Define the shape of the context
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

feat/rfq-protected-routes
// Create the context with a default undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

 feature/search-bar
// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the context with a default undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
import { supabase } from '../../lib/supabase';
import { AuthContext } from './authContextDefinition';
import type { Session, User } from '@supabase/supabase-js';
main
 main
 main
main
 main
main
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

        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
 feat/supplier-dashboard
            (_event, session) => {

 feat/filter-sidebar
            (_event, session) => {

 feature/search-bar
           (_event: AuthChangeEvent, session: Session | null) => {
 feat/rfq-protected-routes


 feature/product-card-component
            (_event: AuthChangeEvent, session: Session | null) => {

feat/product-card-component
           (_event: AuthChangeEvent, session: Session | null) => {
feat/greenchainz-search-bar


            (_event, session) => {
main
main
 main
 main
 main
main
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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export type { User, Session } from '@supabase/supabase-js';
