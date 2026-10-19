import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { register, login } from '../api/userApi';
import Logo from '../components/Logo';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const SignUp = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isPublicRegistrationAllowed } = usePlatformSettings();
    const searchParams = new URLSearchParams(location.search);
    const initialRole = searchParams.get('role') || location.state?.role || sessionStorage.getItem('temp_selected_role') || 'student';

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: initialRole,
        password: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleGoogleSignUp = () => {
        window.location.href = `${backendUrl}/api/auth/oauth/google`;
    };

    const handleGithubSignUp = () => {
        window.location.href = `${backendUrl}/api/auth/oauth/github`;
    };

    const passwordChecks = {
        hasLength: formData.password.length >= 8,
        hasUpper: /[A-Z]/.test(formData.password),
        hasLower: /[a-z]/.test(formData.password),
        hasNumber: /\d/.test(formData.password),
        hasSpecial: /[@$!%*?&#^()_\-+=[\\]{}|:;<>,.~]/.test(formData.password),
    };

    const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isPublicRegistrationAllowed) {
            setError('Public registrations are currently closed by platform administration.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match!");
            return;
        }

        if (!isPasswordStrong) {
            setError("Password must meet all strength requirements: 8+ characters, uppercase, lowercase, number, and special character.");
            return;
        }

        setLoading(true);

        try {
            await register({
                name: formData.fullName,
                email: formData.email,
                password: formData.password,
                role: formData.role
            });

            // Auto log in after successful account creation
            const loginResponse = await login({
                email: formData.email,
                password: formData.password
            });

            const role = String(loginResponse.user.role || 'student').toLowerCase();
            const normalizedUser = { ...loginResponse.user, role };

            const storageData = {
                isLoggedIn: 'true',
                userRole: role,
                user: JSON.stringify(normalizedUser),
                token: loginResponse.token
            };

            Object.entries(storageData).forEach(([k, v]) => {
                sessionStorage.setItem(k, v);
                localStorage.setItem(k, v);
            });

            window.dispatchEvent(new Event('user-update'));

            const targetPath = role === 'admin' ? '/admin/dashboard' : 
                               role === 'organizer' ? '/organizer/dashboard' : 
                               role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard';

            navigate(targetPath, { replace: true });
        } catch (err) {
            const errText = typeof err?.detail === 'string'
                ? err.detail
                : typeof err?.message === 'string'
                ? err.message
                : 'Failed to create account. Please check your details.';

            if (err?.status === 409 || errText.toLowerCase().includes('already registered')) {
                setError('This email is already registered. Please sign in or use a different email address.');
            } else {
                setError(errText);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white dark:bg-navy-900 transition-colors duration-300">
            {/* LEFT HERO PANEL (Full-bleed workspace illustration) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-8 sm:p-12 lg:p-16 bg-[#EEF0FD] dark:bg-navy-950 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 overflow-hidden min-h-screen">
                {/* Background Illustration */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-90 dark:opacity-40 transition-opacity duration-300"
                    style={{ 
                        backgroundImage: "url('/assets/auth/signup-hero.png')",
                        backgroundPosition: "center left"
                    }}
                />

                {/* Soft gradient overlay for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#EEF0FD] via-[#EEF0FD]/40 to-transparent dark:from-navy-950 dark:via-navy-950/60 dark:to-transparent" />

                {/* Brand Logo */}
                <div className="relative z-10">
                    <Link to="/" className="inline-block">
                        <Logo size="md" showSubtext={true} />
                    </Link>
                </div>

                {/* Bottom Tagline & Value Proposition */}
                <div className="relative z-10 max-w-lg mt-auto pt-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-4">
                        Join the Future of<br />
                        Innovation.
                    </h2>
                    <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
                        Create an account to participate in world-class hackathons, collaborate with top talent, and build solutions that matter.
                    </p>
                </div>
            </div>

            {/* RIGHT FORM PANEL */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-10 lg:p-14 bg-white dark:bg-navy-900 min-h-screen lg:min-h-0">
                <div className="w-full max-w-[440px] mx-auto py-4">
                    {/* Mobile Brand Logo Header */}
                    <div className="lg:hidden mb-6 flex justify-center">
                        <Link to="/" className="inline-block">
                            <Logo size="md" showSubtext={true} />
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="mb-6 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Create Your Account
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                            Enter your details below to get started on the platform.
                        </p>
                    </div>

                    {/* Registration Status Warning */}
                    {!isPublicRegistrationAllowed && (
                        <div className="mb-5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                            <span className="font-bold">Notice:</span> Public registration is currently closed.
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-5 p-4 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2">
                            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Full Name
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="e.g. Alex Johnson"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition"
                                />
                            </div>
                        </div>

                        {/* Email Address */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="name@university.edu"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition"
                                />
                            </div>
                        </div>

                        {/* Role Selector */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    I am registering as:
                                </label>
                                <Link 
                                    to="/role-selection" 
                                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    View All Roles &rarr;
                                </Link>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'student', label: 'Student', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
                                    { id: 'mentor', label: 'Mentor', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                                    { id: 'organizer', label: 'Organizer', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
                                ].map((r) => {
                                    const isSelected = formData.role === r.id;
                                    return (
                                        <button
                                            type="button"
                                            key={r.id}
                                            onClick={() => setFormData({ ...formData, role: r.id })}
                                            className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'border-[#4338ca] bg-[#EEF2FD] dark:bg-indigo-950/50 text-[#4338ca] dark:text-indigo-400 font-bold shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                            }`}
                                        >
                                            <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={r.icon} />
                                            </svg>
                                            <span className="text-xs">{r.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Password & Confirm Password (Side-by-side) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                                    >
                                        {showPassword ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </span>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                                    >
                                        {showConfirmPassword ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Real-time Password Strength Guidance */}
                        {formData.password.length > 0 && (
                            <div className="p-3 bg-slate-50 dark:bg-navy-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Password Requirements:</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                        <span>{passwordChecks.hasLength ? '✓' : '○'}</span>
                                        <span>8+ characters</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                        <span>{passwordChecks.hasUpper ? '✓' : '○'}</span>
                                        <span>Uppercase letter</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasLower ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                        <span>{passwordChecks.hasLower ? '✓' : '○'}</span>
                                        <span>Lowercase letter</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                        <span>{passwordChecks.hasNumber ? '✓' : '○'}</span>
                                        <span>At least 1 number</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 col-span-2 ${passwordChecks.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                        <span>{passwordChecks.hasSpecial ? '✓' : '○'}</span>
                                        <span>Special symbol (@$!%*?&#)</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Agreement Checkbox */}
                        <div className="flex items-start pt-1">
                            <input
                                type="checkbox"
                                id="terms"
                                required
                                className="w-4 h-4 mt-0.5 rounded text-indigo-600 border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="terms" className="ml-2 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                                I agree to the{' '}
                                <Link to="/terms" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline">
                                    Terms of Service
                                </Link>{' '}
                                and{' '}
                                <Link to="/privacy" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline">
                                    Privacy Policy
                                </Link>.
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !isPublicRegistrationAllowed}
                            className={`w-full py-3 px-4 font-semibold text-sm text-white rounded-xl bg-[#4338ca] hover:bg-[#3730a3] shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                                (loading || !isPublicRegistrationAllowed) ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase tracking-wider">
                            <span className="px-3 bg-white dark:bg-navy-900 text-slate-400 dark:text-slate-500 font-medium">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    {/* Side-by-side Social Buttons (Google & GitHub) */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={handleGoogleSignUp}
                            className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-950 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-sm transition shadow-sm hover:shadow"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                            </svg>
                            <span>Google</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleGithubSignUp}
                            className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-950 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-sm transition shadow-sm hover:shadow"
                        >
                            <svg className="w-4 h-4 text-slate-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                            </svg>
                            <span>GitHub</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
