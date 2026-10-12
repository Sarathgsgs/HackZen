import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const RoleSelection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { platformName } = usePlatformSettings();

    // Check query param or state or storage for initially selected role
    const searchParams = new URLSearchParams(location.search);
    const initialRole = searchParams.get('role') || location.state?.role || sessionStorage.getItem('temp_selected_role') || 'student';

    const [selectedRole, setSelectedRole] = useState(initialRole === 'admin' ? 'student' : initialRole);
    const [openFaq, setOpenFaq] = useState(null);

    // If an authenticated user lands on /get-started, redirect them to their authentic dashboard
    useEffect(() => {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                const role = (user.role || 'student').toLowerCase();
                const targetPath = role === 'admin' || role === 'superadmin' ? '/admin/dashboard' :
                                   role === 'organizer' ? '/organizer/dashboard' :
                                   role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard';
                navigate(targetPath, { replace: true });
            } catch {
                // Invalid JSON, proceed
            }
        }
    }, [navigate]);

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const roles = [
        {
            id: 'student',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14v7" />
                </svg>
            ),
            title: 'Student / Team',
            description: 'Participate in hackathons, build teams and submit projects.'
        },
        {
            id: 'mentor',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            ),
            title: 'Mentor',
            description: 'Guide teams and provide feedback.'
        },
        {
            id: 'organizer',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            title: 'Organizer',
            description: 'Create and manage hackathons.'
        }
    ];

    const handleContinue = () => {
        if (!selectedRole || selectedRole === 'admin') return;

        sessionStorage.setItem('temp_selected_role', selectedRole);
        navigate(`/signup?role=${selectedRole}`, { state: { role: selectedRole } });
    };

    return (
        <div className="min-h-screen w-full bg-[#FAFBFD] dark:bg-navy-950 py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center transition-colors duration-300">
            <div className="w-full max-w-5xl">
                {/* TOP PROGRESS STEPPER */}
                <div className="w-full max-w-2xl mx-auto bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 rounded-full py-2 px-3 sm:px-8 mb-8 sm:mb-10 shadow-sm">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                        {/* Step 1: Account Creation */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                ✓
                            </span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden sm:inline">Account Creation</span>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:hidden">Account</span>
                        </div>
                        <div className="flex-1 h-[1.5px] bg-slate-200 dark:bg-slate-800 mx-1.5 sm:mx-4" />

                        {/* Step 2: Role Selection (Active) */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <span className="w-5 h-5 rounded-full bg-[#4338ca] text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                                2
                            </span>
                            <span className="text-xs font-bold text-[#4338ca] dark:text-indigo-400 hidden sm:inline">Role Selection</span>
                            <span className="text-[11px] font-bold text-[#4338ca] dark:text-indigo-400 sm:hidden">Role</span>
                        </div>
                        <div className="flex-1 h-[1.5px] bg-slate-200 dark:bg-slate-800 mx-1.5 sm:mx-4" />

                        {/* Step 3: Profile Setup */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 dark:text-slate-500 shrink-0">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[11px] font-medium">
                                3
                            </span>
                            <span className="text-xs font-medium hidden sm:inline">Profile Setup</span>
                        </div>
                        <div className="flex-1 h-[1.5px] bg-slate-200 dark:bg-slate-800 mx-1.5 sm:mx-4" />

                        {/* Step 4: Dashboard */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 dark:text-slate-500 shrink-0">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[11px] font-medium">
                                4
                            </span>
                            <span className="text-xs font-medium hidden sm:inline">Dashboard</span>
                        </div>
                    </div>
                </div>

                {/* HEADING */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                        Choose Your Role
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Select how you will use the {platformName || 'ProEduvate'} platform.
                    </p>
                </div>

                {/* 3 ROLE CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                    {roles.map((role) => {
                        const isSelected = selectedRole === role.id;
                        return (
                            <div
                                key={role.id}
                                onClick={() => setSelectedRole(role.id)}
                                className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[175px] ${
                                    isSelected
                                        ? 'bg-[#F4F6FF] dark:bg-indigo-950/40 border-2 border-[#4338ca] shadow-md ring-2 ring-indigo-500/10'
                                        : 'bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                                }`}
                            >
                                {/* Top-right selection indicator */}
                                {isSelected ? (
                                    <span className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-[#4338ca] text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                                        ✓
                                    </span>
                                ) : (
                                    <span className="absolute top-3.5 right-3.5 w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                                )}

                                <div>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#EEF2FD] dark:bg-indigo-950 text-[#4338ca] dark:text-indigo-400">
                                        {role.icon}
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1">
                                        {role.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {role.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CONTINUE BUTTON & ADMIN NOTICE */}
                <div className="flex flex-col items-center justify-center mb-10 gap-3">
                    <button
                        type="button"
                        onClick={handleContinue}
                        className="px-12 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
                    >
                        Continue
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                        <span>Are you a platform administrator?</span>
                        <Link to="/login?role=admin" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Sign in to Admin Console →
                        </Link>
                    </div>
                </div>

                {/* BOTTOM 2 CARDS: ROLE INFO & FAQ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    {/* Role Information Card */}
                    <div className="p-6 rounded-2xl bg-[#F5F7FF] dark:bg-navy-900/60 border border-[#E0E7FF] dark:border-slate-800">
                        <div className="flex items-center gap-2 text-[#4338ca] dark:text-indigo-400 font-bold text-sm mb-4">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Role Information</span>
                        </div>
                        <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                            <li className="flex items-start gap-2.5">
                                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-[#4338ca] dark:text-indigo-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                                    ✓
                                </span>
                                <span><strong className="text-slate-800 dark:text-white">Students:</strong> Join teams, find mentors, and submit innovative projects.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-[#4338ca] dark:text-indigo-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                                    ✓
                                </span>
                                <span><strong className="text-slate-800 dark:text-white">Mentors:</strong> Guide emerging talent and share industry expertise.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-[#4338ca] dark:text-indigo-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                                    ✓
                                </span>
                                <span><strong className="text-slate-800 dark:text-white">Organizers:</strong> Host and manage large-scale hackathon events.</span>
                            </li>
                        </ul>
                    </div>

                    {/* FAQ Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 text-[#4338ca] dark:text-indigo-400 font-bold text-sm mb-4">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Frequently Asked Questions</span>
                        </div>
                        <div className="space-y-3">
                            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                                <button
                                    type="button"
                                    onClick={() => toggleFaq(1)}
                                    className="w-full flex items-center justify-between text-left text-xs font-medium text-slate-700 dark:text-slate-300 py-1"
                                >
                                    <span>Can I change my role later?</span>
                                    <svg 
                                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openFaq === 1 ? 'transform rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {openFaq === 1 && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                        Yes, you can request role expansion or switch roles from your profile settings at any time with administrator confirmation.
                                    </p>
                                )}
                            </div>

                            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                                <button
                                    type="button"
                                    onClick={() => toggleFaq(2)}
                                    className="w-full flex items-center justify-between text-left text-xs font-medium text-slate-700 dark:text-slate-300 py-1"
                                >
                                    <span>What if I am both a student and mentor?</span>
                                    <svg 
                                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openFaq === 2 ? 'transform rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {openFaq === 2 && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                        Choose your primary activity now. You can participate in hackathons as a participant while also being assigned to mentor other events.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACK LINK */}
                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                        <span>&larr;</span>
                        <span>Back</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
