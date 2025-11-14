import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
});
