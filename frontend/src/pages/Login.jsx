import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/userApi';
import Logo from '../components/Logo';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isMaintenanceMode } = usePlatformSettings();

    const searchParams = new URLSearchParams(location.search);
    const isSessionExpired = searchParams.get('reason') === 'session_expired' || searchParams.get('expired') === 'true';
    const isResetSuccess = searchParams.get('reset') === 'success';

    const [formData, setFormData] = useState({
        email: localStorage.getItem('rememberedEmail') || '',
        password: ''
    });
    const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberedEmail'));
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleGoogleLogin = () => {
        const originParam = encodeURIComponent(window.location.origin);
        window.location.href = `${backendUrl}/api/auth/oauth/google?origin=${originParam}`;
    };

    const handleGithubLogin = () => {
        const originParam = encodeURIComponent(window.location.origin);
        window.location.href = `${backendUrl}/api/auth/oauth/github?origin=${originParam}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            const response = await login({
                email: formData.email,
                password: formData.password
            });

            const { token, user } = response;
            const role = String(user.role || 'student').toLowerCase();
            const normalizedUser = { ...user, role };

            const storageData = {
                isLoggedIn: 'true',
                userRole: role,
                user: JSON.stringify(normalizedUser),
                token: token
            };

            Object.entries(storageData).forEach(([key, val]) => {
                sessionStorage.setItem(key, val);
                localStorage.setItem(key, val);
            });

            window.dispatchEvent(new Event('user-update'));

            const targetPath = role === 'admin' ? '/admin/dashboard' : 
                               role === 'organizer' ? '/organizer/dashboard' : 
                               role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard';
            
            navigate(targetPath, { replace: true });
        } catch (err) {
            const errorMessage = err?.detail ||
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                err?.message ||
                'Login failed. Please check your credentials.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white dark:bg-navy-900 transition-colors duration-300">
            {/* LEFT HERO / ARTWORK PANEL */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-8 sm:p-12 lg:p-16 bg-[#EEF0FD] dark:bg-navy-950 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Brand Logo */}
                <div className="relative z-10">
                    <Link to="/" className="inline-block">
                        <Logo size="md" showSubtext={true} />
                    </Link>
                </div>

                {/* Center 3D Holographic Collaboration Card */}
                <div className="my-8 lg:my-0 flex items-center justify-center relative z-10">
                    <div className="w-full max-w-md bg-white/70 dark:bg-navy-900/70 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border border-white/60 dark:border-slate-700/50 transition-transform duration-500 hover:scale-[1.02]">
                        <img 
                            src="/assets/auth/signin-card.png" 
                            alt="Innovators collaborating around holographic table" 
                            className="w-full h-auto rounded-xl object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80";
                            }}
                        />
                    </div>
                </div>

                {/* Bottom Tagline & Value Proposition */}
                <div className="relative z-10 max-w-lg">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-4">
                        Join.<br />
                        Collaborate.<br />
                        Innovate.
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                        Empowering the next generation of builders through seamless hackathon management and team collaboration.
                    </p>
                </div>

                {/* Subtle decorative background circles */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-200/30 dark:bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/4 -right-20 w-80 h-80 bg-blue-200/30 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* RIGHT FORM PANEL */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-10 lg:p-16 bg-white dark:bg-navy-900 min-h-screen lg:min-h-0">
                <div className="w-full max-w-[420px] mx-auto py-6">
                    {/* Mobile Brand Logo Header */}
                    <div className="lg:hidden mb-6 flex justify-center">
                        <Link to="/" className="inline-block">
                            <Logo size="md" showSubtext={true} />
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="mb-6 sm:mb-8 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Welcome Back
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Please enter your details to sign in.
                        </p>
                    </div>

                    {/* Session Expired Notice */}
                    {isSessionExpired && (
                        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2.5">
                            <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="font-medium">Your session has expired. Please sign in again to continue.</span>
                        </div>
                    )}

                    {/* Reset Success Notice */}
                    {isResetSuccess && (
                        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2.5">
                            <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">Your password has been successfully reset. Please sign in with your new password.</span>
                        </div>
                    )}

                    {/* Maintenance Notice */}
                    {isMaintenanceMode && (
                        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                            <span className="font-bold">Notice:</span> Platform is currently in maintenance mode. Only administrators may log in.
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-6 p-4 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2">
                            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Address */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                required
                                className="w-full px-4 py-3 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3 pr-11 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Options: Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 dark:text-slate-400">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                                />
                                <span>Remember me</span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 px-4 font-semibold text-sm text-white rounded-xl bg-[#4338ca] hover:bg-[#3730a3] shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                                loading ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Signing In...</span>
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-7">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-3 bg-white dark:bg-navy-900 text-slate-400 dark:text-slate-500">
                                Or sign in with
                            </span>
                        </div>
                    </div>

                    {/* Social OAuth Sign In Buttons */}
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-950 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-sm transition shadow-sm hover:shadow"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                            </svg>
                            <span>Sign in with Google</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleGithubLogin}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-950 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-sm transition shadow-sm hover:shadow"
                        >
                            <svg className="w-5 h-5 text-slate-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                            </svg>
                            <span>Sign in with GitHub</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
