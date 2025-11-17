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

const validatePassword = (password: string) => {
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
    if (!passwordRegex.test(password)) return "Password must include 1 uppercase letter, 1 number, and 1 special character.";
    return "";
};

// --- Reusable Components with Error Handling ---
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

const Dropdown = ({ id, label, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
        <select id={id} name={id} {...props} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-white" />
    </div>
);

export default function Signup() {
    const navigate = useNavigate();
    // --- State Management ---
    const [formData, setFormData] = useState({
        role: 'buyer' as 'buyer' | 'supplier',
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        projectType: 'Residential',
        productCategory: 'Insulation',
        agreedToTerms: false,
    });

    const [errors, setErrors] = useState({
        email: '', password: '', confirmPassword: '', companyName: '', agreedToTerms: '', form: ''
    });

    const [loading, setLoading] = useState(false);

    // --- Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let error = "";
        switch (name) {
            case 'email':
                error = validateEmail(value);
                break;
            case 'password':
                error = validatePassword(value);
                break;
            case 'confirmPassword':
                if (formData.password && value !== formData.password) {
                    error = "Passwords do not match.";
                }
                break;
            case 'companyName':
                if (!value) error = "Company name is required.";
                break;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const validateForm = () => {
        const newErrors = {
            email: validateEmail(formData.email),
            password: validatePassword(formData.password),
            confirmPassword: formData.password !== formData.confirmPassword ? "Passwords do not match." : "",
            companyName: !formData.companyName ? "Company name is required." : "",
            agreedToTerms: !formData.agreedToTerms ? "You must agree to the Terms and Privacy Policy." : "",
            form: ''
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== '');
    };

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        setErrors(prev => ({ ...prev, form: '' }));

        if (!validateForm()) return;

        setLoading(true);
        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: { data: { company_name: formData.companyName, role: formData.role, ...(formData.role === 'buyer' && { project_type: formData.projectType }), ...(formData.role === 'supplier' && { product_category: formData.productCategory }) } }
            });

            if (signUpError) throw signUpError;

            if (formData.role === 'buyer') navigate('/dashboard');
            else if (formData.role === 'supplier') navigate('/supplier/pending-approval');

        } catch (err) {
            const errorMessage = (err as Error).message.includes('already exists')
                ? "This email is already registered. Please log in."
                : "An unexpected error occurred. Please try again.";
            setErrors(prev => ({...prev, form: errorMessage}));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-lg space-y-8">
                <div className="text-center">
                    <img src="/brand/greenchainz-logo.png" alt="GreenChainz" className="mx-auto h-16 w-auto" />
                    <h2 className="mt-6 text-3xl font-bold text-foreground">Create your account</h2>
                </div>

                <div className="flex justify-center bg-muted p-1 rounded-lg">
                    <button onClick={() => setFormData(prev => ({ ...prev, role: 'buyer' }))} className={`w-1/2 py-2 px-4 text-sm font-medium rounded-md transition-colors ${formData.role === 'buyer' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:bg-border'}`}>I'm a Buyer</button>
                    <button onClick={() => setFormData(prev => ({ ...prev, role: 'supplier' }))} className={`w-1/2 py-2 px-4 text-sm font-medium rounded-md transition-colors ${formData.role === 'supplier' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:bg-border'}`}>I'm a Supplier</button>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSignup} noValidate>
                    {errors.form && <div className="p-4 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm" role="alert">{errors.form}</div>}

                    <div className="flex flex-col gap-y-4">
                        <Input id="email" name="email" label="Email Address" type="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="you@company.com" error={errors.email} />
                        <Input id="companyName" name="companyName" label="Company Name" type="text" value={formData.companyName} onChange={handleChange} onBlur={handleBlur} placeholder="Your Company, Inc." error={errors.companyName} />

                        {formData.role === 'buyer' ? (
                            <Dropdown id="projectType" name="projectType" label="Project Type" value={formData.projectType} onChange={handleChange} options={[{ value: 'Residential', label: 'Residential' }, { value: 'Commercial', label: 'Commercial' }, { value: 'Both', label: 'Both' }]} />
                        ) : (
                            <Dropdown id="productCategory" name="productCategory" label="Product Category" value={formData.productCategory} onChange={handleChange} options={[{ value: 'Insulation', label: 'Insulation' }, { value: 'Flooring', label: 'Flooring' }, { value: 'Roofing', label: 'Roofing' }, { value: 'Other', label: 'Other' }]} />
                        )}

                        <Input id="password" name="password" label="Password" type="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} placeholder="••••••••" error={errors.password} />
                        <Input id="confirmPassword" name="confirmPassword" label="Confirm Password" type="password" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder="••••••••" error={errors.confirmPassword} />
                    </div>

                    <div className="flex items-center">
                        <input id="agreedToTerms" name="agreedToTerms" type="checkbox" checked={formData.agreedToTerms} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary border-border rounded" />
                        <label htmlFor="agreedToTerms" className="ml-2 block text-sm text-muted-foreground">I agree to the <Link to="/legal/terms" className="font-medium text-primary hover:underline">Terms of Service</Link> and <Link to="/legal/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link></label>
                    </div>
                     {errors.agreedToTerms && <p className="mt-1 text-sm text-destructive" role="alert">{errors.agreedToTerms}</p>}


                    <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors">{loading ? 'Creating Account...' : 'Create Account'}</button>
                </form>

                 <p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
            </div>
        </div>
    );
}
