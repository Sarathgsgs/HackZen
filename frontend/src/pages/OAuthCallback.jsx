import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMe, setAuthToken } from '../api/userApi';
import Logo from '../components/Logo';

const OAuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { loginUser } = useAuth();

    const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const processOAuth = async () => {
            const token = searchParams.get('token');
            const error = searchParams.get('error');

            if (error) {
                setStatus('error');
                setErrorMessage(decodeURIComponent(error));
                return;
            }

            if (!token) {
                setStatus('error');
                setErrorMessage('No authentication token received from the provider. Please try signing in again.');
                return;
            }

            try {
                // Store token immediately so apiClient interceptor picks it up
                localStorage.setItem('token', token);
                sessionStorage.setItem('token', token);
                setAuthToken(token);

                let user;
                try {
                    user = await getMe();
                } catch (apiErr) {
                    console.warn('[OAuthCallback] getMe API failed, recovering user profile from JWT token:', apiErr);
                    try {
                        const base64Url = token.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(
                            atob(base64)
                                .split('')
                                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                                .join('')
                        );
                        const payload = JSON.parse(jsonPayload);
                        user = {
                            _id: payload.sub,
                            id: payload.sub,
                            email: payload.email,
                            role: payload.role || 'student',
                            name: payload.name || (payload.email ? payload.email.split('@')[0] : 'Student')
                        };
                    } catch (decodeErr) {
                        throw apiErr;
                    }
                }

                const role = String(user.role || 'student').toLowerCase();
                const normalizedUser = { ...user, role };

                // Update context and storage
                loginUser(normalizedUser, token);

                // Sync storage explicitly for persistence across tabs
                const storageData = {
                    isLoggedIn: 'true',
                    userRole: role,
                    user: JSON.stringify(normalizedUser),
                    token: token
                };
                Object.entries(storageData).forEach(([k, v]) => {
                    sessionStorage.setItem(k, v);
                    localStorage.setItem(k, v);
                });

                window.dispatchEvent(new Event('user-update'));

                setStatus('success');

                // Determine redirect path
                const targetPath = role === 'admin' ? '/admin/dashboard' :
                                   role === 'organizer' ? '/organizer/dashboard' :
                                   role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard';

                // Brief pause so the user perceives a clean, successful sign-in
                setTimeout(() => {
                    navigate(targetPath, { replace: true });
                }, 400);

            } catch (err) {
                console.error('[OAuthCallback] Auth failed:', err);
                setStatus('error');
                setErrorMessage(err.detail || err.message || 'Failed to authenticate user profile with server.');
            }
        };

        processOAuth();
    }, [searchParams, navigate, loginUser]);

    return (
        <div className="flex items-center justify-center min-h-screen px-4 py-8 bg-navy-900 bg-radial text-white">
            <div className="w-full max-w-md p-8 glass rounded-2xl border border-gray-700/60 shadow-2xl text-center">
                <div className="flex justify-center mb-6">
                    <Logo />
                </div>

                {status === 'processing' && (
                    <div className="flex flex-col items-center py-6 space-y-4">
                        <div className="relative flex items-center justify-center">
                            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                            <div className="absolute w-8 h-8 border-4 border-blue-500/20 border-b-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
                        </div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Authenticating Account
                        </h2>
                        <p className="text-sm text-gray-400">
                            Connecting with your OAuth provider and setting up your workspace...
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center py-6 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            Sign In Successful!
                        </h2>
                        <p className="text-sm text-gray-400">
                            Redirecting you to your dashboard...
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center py-4 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            Authentication Failed
                        </h2>
                        <p className="text-sm text-red-300/90 bg-red-950/40 border border-red-800/40 rounded-lg p-3 max-w-sm">
                            {errorMessage}
                        </p>
                        <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full justify-center">
                            <Link
                                to="/login"
                                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium text-sm transition shadow-lg"
                            >
                                Back to Sign In
                            </Link>
                            <Link
                                to="/"
                                className="px-5 py-2.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-gray-300 font-medium text-sm transition border border-gray-700"
                            >
                                Home
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OAuthCallback;
