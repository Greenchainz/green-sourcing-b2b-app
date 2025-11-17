import { useState, FormEvent, FocusEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({ email: '', password: '', form: '' });
    const [loading, setLoading] = useState(false);

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let error = "";
        if (name === 'email') {
            error = validateEmail(value);
        } else if (name === 'password' && !value) {
            error = "Password is required.";
        }
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const validateForm = () => {
        const emailError = validateEmail(email);
        const passwordError = !password ? "Password is required." : "";
        setErrors({ email: emailError, password: passwordError, form: '' });
        return !emailError && !passwordError;
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setErrors(prev => ({ ...prev, form: '' }));

        if (!validateForm()) return;

        setLoading(true);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) throw signInError;
            navigate('/dashboard');
        } catch (err) {
            setErrors(prev => ({...prev, form: 'Invalid email or password.'}));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <img src="/brand/greenchainz-logo.png" alt="GreenChainz" className="mx-auto h-16 w-auto" />
                    <h2 className="mt-6 text-3xl font-bold text-foreground">Sign in to your account</h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin} noValidate>
                     {errors.form && <div className="p-4 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm" role="alert">{errors.form}</div>}

                    <div className="rounded-md shadow-sm flex flex-col gap-y-4">
                        <Input id="email" name="email" label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={handleBlur} placeholder="you@company.com" error={errors.email} />

                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
                                <div className="text-sm"><Link to="/auth/reset-password" className="font-medium text-primary hover:underline">Forgot Password?</Link></div>
                            </div>
                            <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} onBlur={handleBlur} placeholder="••••••••" required className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition ${errors.password ? 'border-destructive ring-destructive' : 'border-border focus:ring-primary'}`} />
                            {errors.password && <p className="mt-1 text-sm text-destructive" role="alert">{errors.password}</p>}
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors">{loading ? 'Signing In...' : 'Sign In'}</button>
                </form>

                <p className="text-center text-sm text-muted-foreground">Don't have an account?{' '}<Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link></p>
            </div>
        </div>
    );
}
