// frontend/src/types/auth.ts

/**
 * User type for authentication
 */
export interface User {
    id?: string;
    sub?: string;
    email: string;
    name?: string;
    createdAt?: string;
    companyName?: string;
    companyId?: string;
    role?: string;
}

/**
 * Auth context type
 */
export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    token: string | null;
}
