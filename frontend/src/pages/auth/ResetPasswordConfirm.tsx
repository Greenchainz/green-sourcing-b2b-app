import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Input = ({ id, label, type = 'password', value, onChange, placeholder, required = true }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
        </label>
        <input
            id={id}
            name={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
        />
    </div>
);

export default function ResetPasswordConfirm() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // This effect handles the session update from the reset token in the URL.
    // Supabase automatically detects the `access_token` and updates the session.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // The user is now in a password recovery state.
                // We don't need to do anything here, just let them set a new password.
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleSetNewPassword = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setMessage('Your password has been reset successfully! Redirecting to login...');

            // Redirect to login after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            setError((err as Error).message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                     <img
                        src="/brand/greenchainz-logo.png"
                        alt="GreenChainz"
                        className="mx-auto h-16 w-auto"
                    />
                    <h2 className="mt-6 text-3xl font-bold text-foreground">
                        Set New Password
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSetNewPassword}>
                    {message && (
                         <div className="p-4 rounded-md bg-primary/10 border border-primary/50 text-primary-dark text-sm">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="rounded-md shadow-sm flex flex-col gap-y-4">
                        <Input id="newPassword" label="New Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                        <Input id="confirmNewPassword" label="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
