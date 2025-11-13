import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        // Supabase handles the OAuth callback automatically
        // Just check if we have a session and redirect
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error('OAuth error:', error);
                navigate('/login?error=' + encodeURIComponent(error.message));
                return;
            }

            if (session) {
                // Successfully authenticated, redirect to dashboard
                navigate('/dashboard/architect');
            } else {
                // No session, redirect to login
                navigate('/login?error=auth_failed');
            }
        });
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-300 text-lg">Completing sign in...</p>
            </div>
        </div>
    );
}
