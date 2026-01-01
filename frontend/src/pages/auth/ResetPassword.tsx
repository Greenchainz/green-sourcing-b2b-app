import { useState, FormEvent, FocusEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// --- Validation Utilities ---
const validateEmail = (email: string) => {
    if (!email) return "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    return "";
};

// --- Reusable Input Component with Error Handling ---
const Input = ({ id, label, error, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
        </label>
        <input
            id={id}
            name={id}
            {...props}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition ${
                error ? 'border-destructive ring-destructive' : 'border-border focus:ring-primary'
            }`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && <p id={`${id}-error`} className="mt-1 text-sm text-destructive" role="alert">{error}</p>}
    </div>
);

export default function ResetPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        setEmailError(validateEmail(e.target.value));
    };

    const handlePasswordReset = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        const emailValError = validateEmail(email);
        setEmailError(emailValError);
        if (emailValError) return;

        setLoading(true);
        try {
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password-confirm`,
            });
            setMessage('If an account exists for this email, a password reset link has been sent.');
        } catch {
            setMessage('If an account exists for this email, a password reset link has been sent.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <img src="/brand/greenchainz-logo.png" alt="GreenChainz" className="mx-auto h-16 w-auto" />
                    <h2 className="mt-6 text-3xl font-bold text-foreground">Forgot Your Password?</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Enter your email address and we'll send you a link to reset it.</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handlePasswordReset} noValidate>
                    {message && <div className="p-4 rounded-md bg-primary/10 border border-primary/50 text-primary-dark text-sm">{message}</div>}
                    {error && <div className="p-4 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm">{error}</div>}

                    <div className="rounded-md shadow-sm">
                        <Input id="email" name="email" label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={handleBlur} placeholder="you@company.com" error={emailError} />
                    </div>

                    <button type="submit" disabled={loading || !!message} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors">{loading ? 'Sending...' : 'Send Reset Link'}</button>
                </form>

                <p className="text-center text-sm text-muted-foreground">Remember it?{' '}<Link to="/login" className="font-medium text-primary hover:underline">Back to Login</Link></p>
            </div>
        </div>
    );
}
