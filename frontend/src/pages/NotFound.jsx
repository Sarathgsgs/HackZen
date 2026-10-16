import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const NotFound = () => {
    const { platformName } = usePlatformSettings();
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const userRole = sessionStorage.getItem('userRole');

    const getDashboardPath = () => {
        if (!isLoggedIn) return '/';
        switch (userRole) {
            case 'admin': return '/admin/dashboard';
            case 'organizer': return '/organizer/dashboard';
            case 'mentor': return '/mentor/dashboard';
            default: return '/student/dashboard';
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-navy-900 text-white p-6 text-center">
            {/* Top Navigation Row */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
                <Logo size="md" />
            </div>
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>

            <div className="w-28 h-28 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-8 shadow-xl shadow-purple-500/5">
                <span className="text-5xl">🧭</span>
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest mb-4">
                404 Error
            </span>

            <h1 className="text-4xl sm:text-5xl font-black mb-4 gradient-text">
                Page Not Found
            </h1>
            <p className="text-gray-400 max-w-md mb-8 text-sm sm:text-base leading-relaxed">
                The requested URL does not exist or has been relocated within {platformName || 'ProEduvate'}.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                    to={getDashboardPath()}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg shadow-purple-500/25 text-sm"
                >
                    {isLoggedIn ? 'Go to Dashboard' : 'Back to Home'}
                </Link>
                <Link
                    to="/login"
                    className="px-6 py-3 glass rounded-xl font-semibold hover:bg-white/10 transition-colors text-sm border border-white/10"
                >
                    Sign In
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
