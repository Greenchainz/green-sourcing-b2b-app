import { useState, useEffect, FormEvent, FocusEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// --- Validation Utilities ---
const validatePassword = (password: string) => {
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
    if (!passwordRegex.test(password)) return "Must include 1 uppercase, 1 number, & 1 special character.";
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

export default function ResetPasswordConfirm() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState({ password: '', confirmPassword: '', form: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                // Let user set a new password
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let error = "";
        if (name === 'password') {
            error = validatePassword(value);
        } else if (name === 'confirmPassword' && password && value !== password) {
            error = "Passwords do not match.";
        }
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const validateForm = () => {
        const passwordError = validatePassword(password);
        const confirmPasswordError = password !== confirmPassword ? "Passwords do not match." : "";
        setErrors({ password: passwordError, confirmPassword: confirmPasswordError, form: '' });
        return !passwordError && !confirmPasswordError;
    };

    const handleSetNewPassword = async (e: FormEvent) => {
        e.preventDefault();
        setErrors(prev => ({ ...prev, form: '' }));

        if (!validateForm()) return;

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;
            setMessage('Password reset successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setErrors(prev => ({...prev, form: 'Failed to reset password. The link may have expired.'}));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                     <img src="/brand/greenchainz-logo.png" alt="GreenChainz" className="mx-auto h-16 w-auto" />
                    <h2 className="mt-6 text-3xl font-bold text-foreground">Set New Password</h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSetNewPassword} noValidate>
                    {message && <div className="p-4 rounded-md bg-primary/10 border border-primary/50 text-primary-dark text-sm">{message}</div>}
                    {errors.form && <div className="p-4 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm" role="alert">{errors.form}</div>}

                    <div className="rounded-md shadow-sm flex flex-col gap-y-4">
                        <Input id="password" name="password" label="New Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onBlur={handleBlur} placeholder="••••••••" error={errors.password} />
                        <Input id="confirmPassword" name="confirmPassword" label="Confirm New Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onBlur={handleBlur} placeholder="••••••••" error={errors.confirmPassword} />
                    </div>

                    <button type="submit" disabled={loading || !!message} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors">{loading ? 'Resetting...' : 'Reset Password'}</button>
                </form>
            </div>
        </div>
    );
}
