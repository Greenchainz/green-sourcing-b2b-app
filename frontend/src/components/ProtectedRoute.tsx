// frontend/src/components/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '@supabase/supabase-js';

// Define the props for the ProtectedRoute component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Optional array of roles that are allowed to access the route
}

/**
 * @interface AppUser
 * @description Extends the Supabase User to include our custom app_metadata with roles.
 */
interface AppUser extends User {
  app_metadata: {
    role?: string;
  };
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const location = useLocation();
    const appUser = user as AppUser; // Cast the user to our custom AppUser type

    console.log('ProtectedRoute loading state:', loading);
    console.log('ProtectedRoute user state:', user);

    if (loading) {
        // While checking authentication state, show a loading indicator.
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-lg font-semibold text-green-500">Loading...</div>
            </div>
        );
    }

    if (!appUser) {
        // If the user is not authenticated, redirect them to the login page.
        // We also pass the original location in state so we can redirect back after login.
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // If allowedRoles are specified, check if the user's role is one of them.
    const userRole = appUser.app_metadata?.role;
    if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
        // If the user's role is not allowed, redirect to a "Not Authorized" page or the homepage.
        // For this example, we'll redirect to a generic unauthorized page.
        return <Navigate to="/unauthorized" replace />;
    }

    // If the user is authenticated and their role is allowed, render the children components.
    return <>{children}</>;
}
