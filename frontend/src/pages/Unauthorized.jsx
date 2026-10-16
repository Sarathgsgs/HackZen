import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const Unauthorized = () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const userRole = sessionStorage.getItem('userRole');

    const getDashboardPath = () => {
        if (!isLoggedIn) return '/login';
        switch (userRole) {
            case 'admin': return '/admin/dashboard';
            case 'organizer': return '/organizer/dashboard';
            case 'mentor': return '/mentor/dashboard';
            default: return '/student/dashboard';
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-navy-900 text-white p-6 text-center">
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>
            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-8 border border-red-500/20">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4 gradient-text">Access Denied</h1>
            <p className="text-gray-400 max-w-md mb-8 text-sm sm:text-base">
                You do not have permission to access this page. This area requires different user authorization privileges.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                    to={getDashboardPath()}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg shadow-purple-500/25 text-sm"
                >
                    {isLoggedIn ? 'Go to My Dashboard' : 'Sign In'}
                </Link>
                <Link
                    to="/"
                    className="px-8 py-3 glass rounded-xl font-semibold hover:bg-white/10 transition-colors text-sm border border-white/10"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default Unauthorized;
