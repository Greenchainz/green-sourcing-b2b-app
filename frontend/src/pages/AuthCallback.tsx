import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            // OAuth failed
            console.error('OAuth authentication failed:', error);
            navigate('/login?error=' + encodeURIComponent(error));
            return;
        }

        if (token) {
            // Store token and reload to trigger AuthContext bootstrap
            localStorage.setItem('greenchainz-token', token);
            // Redirect to home and let AuthContext pick up the token
            window.location.href = '/';
        } else {
            // No token or error, redirect to login
            navigate('/login?error=auth_failed');
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-300 text-lg">Completing sign in...</p>
            </div>
        </div>
    );
}
