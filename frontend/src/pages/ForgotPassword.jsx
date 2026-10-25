import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { forgotPassword, resetPassword } from '../api/userApi';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');

    const { platformName, supportEmail } = usePlatformSettings();
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const [openFaq, setOpenFaq] = useState(null);

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const passwordChecks = {
        hasLength: newPassword.length >= 8,
        hasUpper: /[A-Z]/.test(newPassword),
        hasLower: /[a-z]/.test(newPassword),
        hasNumber: /\d/.test(newPassword),
        hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newPassword),
    };

    const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await forgotPassword({ email });
            setStatusMessage(response.message || 'Reset link has been dispatched to your email address!');
            setIsSubmitted(true);
        } catch (err) {
            setError(err.detail || err.message || 'Unable to request password reset. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetNewPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("Passwords don't match!");
            return;
        }

        if (!isPasswordStrong) {
            setError("Password must meet all strength requirements: 8+ characters, uppercase, lowercase, number, and special character.");
            return;
        }

        setLoading(true);

        try {
            await resetPassword({ token, newPassword });
            navigate('/login?reset=success');
        } catch (err) {
            setError(err.detail || err.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white dark:bg-navy-900 transition-colors duration-300">
            {/* LEFT HERO / SECURITY PANEL */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-8 sm:p-12 lg:p-16 bg-[#eff6ff] dark:bg-navy-950 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
                {/* Brand Logo */}
                <div className="relative z-10">
                    <Link to="/" className="inline-block">
                        <Logo size="md" showSubtext={false} />
                    </Link>
                </div>

                {/* 3D Security Lock Card */}
                <div className="my-8 lg:my-0 flex items-center justify-center relative z-10">
                    <div className="w-full max-w-sm bg-white/70 dark:bg-navy-900/70 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border border-white/80 dark:border-slate-700/50 transition-transform duration-500 hover:scale-[1.02]">
                        <img 
                            src="/assets/auth/reset-lock.png" 
                            alt="Security Lock & Key" 
                            className="w-full h-auto rounded-xl object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=600&q=80";
                            }}
                        />
                    </div>
                </div>

                {/* Security Best Practices Card */}
                <div className="relative z-10 max-w-md bg-white/95 dark:bg-navy-900/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm mb-3">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Security Best Practices</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                        <li className="flex items-center gap-2.5">
                            <span className="w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                                ✓
                            </span>
                            <span>Use a strong password containing numbers and symbols.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <span className="w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                                ✓
                            </span>
                            <span>Never share your password or reuse it across sites.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <span className="w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                                ✓
                            </span>
                            <span>Enable Two-Factor Authentication (2FA) when possible.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* RIGHT FORM PANEL */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-10 lg:p-16 bg-white dark:bg-navy-900 min-h-screen lg:min-h-0">
                <div className="w-full max-w-[420px] mx-auto py-6">
                    {/* Mobile Brand Logo Header */}
                    <div className="lg:hidden mb-6 flex justify-center">
                        <Link to="/" className="inline-block">
                            <Logo size="md" showSubtext={false} />
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="mb-6 sm:mb-7 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {token ? 'Set New Password' : 'Reset Your Password'}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                            {token
                                ? 'Create a new, strong password to regain access to your account.'
                                : "Enter your registered email address and we'll send you a password reset link."}
                        </p>
                    </div>

                    {/* Form area */}
                    {token ? (
                        /* Set New Password Form */
                        <form onSubmit={handleSetNewPassword} className="space-y-4">
                            {error && (
                                <div className="p-3.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2">
                                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                        <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                            </div>

                            {/* Password Requirements Guidance */}
                            {newPassword.length > 0 && (
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

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 px-4 font-semibold text-sm text-white rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                                    loading ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            >
                                {loading ? 'Updating Password...' : 'Save New Password & Log In'}
                            </button>

                            <div className="text-center pt-1">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                >
                                    <span>&larr;</span>
                                    <span>Back to Sign In</span>
                                </Link>
                            </div>
                        </form>
                    ) : isSubmitted ? (
                        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white text-base">Check Your Inbox</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {statusMessage}
                            </p>
                            <Link
                                to="/login"
                                className="inline-block px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow transition"
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        /* Request Reset Form */
                        <form onSubmit={handleRequestReset} className="space-y-5">
                            {error && (
                                <div className="p-3.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2">
                                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                        <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                                        id="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 px-4 font-semibold text-sm text-white rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                                    loading ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Sending Link...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send Reset Link</span>
                                        <span>&rarr;</span>
                                    </>
                                )}
                            </button>

                            <div className="text-center pt-1">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                >
                                    <span>&larr;</span>
                                    <span>Back to Sign In</span>
                                </Link>
                            </div>
                        </form>
                    )}

                    {/* Need More Help Accordion */}
                    <div className="mt-10 pt-6">
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            Need more help?
                        </h4>
                        <div className="space-y-2">
                            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleFaq(1)}
                                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                                >
                                    <span>Didn't receive the email?</span>
                                    <svg 
                                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openFaq === 1 ? 'transform rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {openFaq === 1 && (
                                    <div className="p-3.5 pt-0 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-navy-950/50">
                                        Please check your spam or junk folder. If you still do not see it after 5 minutes, ensure the email address matches your registered account or contact support at {supportEmail || 'support@proeduvate.com'}.
                                    </div>
                                )}
                            </div>

                            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleFaq(2)}
                                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                                >
                                    <span>Account locked?</span>
                                    <svg 
                                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openFaq === 2 ? 'transform rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {openFaq === 2 && (
                                    <div className="p-3.5 pt-0 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-navy-950/50">
                                        Accounts are temporarily locked after multiple consecutive failed attempts. They unlock automatically after 30 minutes, or you can contact platform administrators to reset your session.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 text-center text-[11px] text-slate-400 flex items-center justify-center gap-4">
                        <span>&copy; 2024 {platformName || 'ProEduvate'} Inc.</span>
                        <Link to="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition">Terms of Service</Link>
                        <Link to="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
