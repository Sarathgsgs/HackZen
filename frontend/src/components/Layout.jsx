import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Reactive User State
    const [storedUser, setStoredUser] = React.useState(() => {
        const session = sessionStorage.getItem('user');
        const local = localStorage.getItem('user');
        return JSON.parse(session || local || '{"name": "Guest", "email": "guest@example.com", "role": "student"}');
    });

    React.useEffect(() => {
        const handleUserUpdate = () => {
            const user = sessionStorage.getItem('user');
            if (user) setStoredUser(JSON.parse(user));
        };
        window.addEventListener('user-update', handleUserUpdate);
        return () => window.removeEventListener('user-update', handleUserUpdate);
    }, []);

    // --- Notifications Integration ---
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        const [list, count] = await Promise.all([
            import('../services/inboxApi').then(m => m.fetchNotifications({ limit: 5 })),
            import('../services/inboxApi').then(m => m.fetchUnreadCount())
        ]);
        setNotifications(list);
        setUnreadCount(count);
    };

    React.useEffect(() => {
        loadNotifications();
        // Poll for updates every 30 seconds
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAllRead = async () => {
        const success = await import('../services/inboxApi').then(m => m.markAllAsRead());
        if (success) loadNotifications();
    };

    // Determine Role based on URL path
    const currentPath = location.pathname;
    const isStudent = currentPath.startsWith('/student');
    const isAdmin = currentPath.startsWith('/admin');
    const isOrganizer = currentPath.startsWith('/organizer');
    const isMentor = currentPath.startsWith('/mentor');

    // Role Config
    const roleConfig = {
        student: {
            name: storedUser?.name?.split(' ')[0] || 'Student',
            fullName: storedUser?.name || 'Student User',
            roleName: 'Student',
            email: storedUser?.email || '',
            theme: 'purple',
            path: 'student',
            logoGradient: 'from-purple-600 to-blue-600',
            avatarGradient: 'from-purple-500 to-indigo-500',
        },
        organizer: {
            name: storedUser?.name?.split(' ')[0] || 'Organizer',
            fullName: storedUser?.name || 'Organizer User',
            roleName: 'Organizer',
            email: storedUser?.email || '',
            theme: 'cyan',
            path: 'organizer',
            logoGradient: 'from-cyan-600 to-blue-600',
            avatarGradient: 'from-cyan-500 to-blue-500',
        },
        mentor: {
            name: storedUser?.name?.split(' ')[0] || 'Mentor',
            fullName: storedUser?.name || 'Mentor User',
            roleName: 'Mentor',
            email: storedUser?.email || '',
            theme: 'purple',
            path: 'mentor',
            logoGradient: 'from-purple-600 to-blue-600',
            avatarGradient: 'from-purple-500 to-indigo-500',
        },
        admin: {
            name: storedUser?.name?.split(' ')[0] || 'Admin',
            fullName: storedUser?.name || 'Admin User',
            roleName: 'Super Admin',
            email: storedUser?.email || '',
            theme: 'blue',
            path: 'admin',
            logoGradient: 'from-blue-800 to-indigo-900',
            avatarGradient: 'from-blue-600 to-indigo-700',
        }
    };

    // Style configurations
    const indicatorStyles = {
        purple: "bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]",
        cyan: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]",
        blue: "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]"
    };

    const iconStyles = {
        purple: "group-hover:text-purple-400 group-hover:drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]",
        cyan: "group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]",
        blue: "group-hover:text-blue-400 group-hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]"
    };

    const activeStyles = {
        purple: "bg-purple-500/10 text-white border-purple-500/30",
        cyan: "bg-cyan-500/10 text-white border-cyan-500/30",
        blue: "bg-blue-500/10 text-white border-blue-500/30"
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/');
    };

    const currentRole = isAdmin ? roleConfig.admin : (isOrganizer ? roleConfig.organizer : (isMentor ? roleConfig.mentor : roleConfig.student));
    const themeColor = currentRole.theme;

    // Admin Navigation Items
    const adminNav = [
        {
            name: 'Dashboard', path: '/admin/dashboard', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            )
        },
        {
            name: 'Organizer Approvals', path: '/admin/organizer-approvals', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            )
        },
        {
            name: 'Hackathon Approvals', path: '/admin/hackathon-approvals', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            )
        },
        {
            name: 'Users Management', path: '/admin/users', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            )
        },
        {
            name: 'Submissions', path: '/admin/submissions', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            )
        },
        {
            name: 'Certificates', path: '/admin/certificates', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            )
        },
        {
            name: 'Disputes & Reports', path: '/admin/disputes', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            )
        },
        {
            name: 'Analytics', path: '/admin/analytics', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            )
        },
        {
            name: 'Settings', path: '/admin/settings', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            )
        },
    ];

    // Navigation Items
    const studentNav = [
        {
            name: 'Dashboard', path: '/student/dashboard', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            )
        },
        {
            name: 'Upcoming Hackathons', path: '/student/hackathons', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            )
        },
        {
            name: 'My Teams', path: '/student/teams', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            )
        },
        {
            name: 'Certificates', path: '/student/certificates', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            )
        },
        {
            name: 'AI Assistant', path: '/student/ai-assistant', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            )
        },
        {
            name: 'Settings', path: '/student/settings', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            )
        },
    ];

    const organizerNav = [
        {
            name: 'Dashboard', path: '/organizer/dashboard', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            )
        },
        {
            name: 'Create Hackathon', path: '/organizer/create-hackathon', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            )
        },
        {
            name: 'My Hackathons', path: '/organizer/my-hackathons', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            )
        },
        {
            name: 'Teams & Mentors', path: '/organizer/teams-mentors', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            )
        },
        {
            name: 'Submissions', path: '/organizer/submissions', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            )
        },
        {
            name: 'Evaluation Panel', path: '/organizer/evaluation', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            )
        },
        {
            name: 'Results & Certificates', path: '/organizer/results', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
            )
        },
        {
            name: 'Analytics', path: '/organizer/analytics', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            )
        },
        {
            name: 'Settings', path: '/organizer/settings', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            )
        },
    ];

    const mentorNav = [
        {
            name: 'Dashboard', path: '/mentor/dashboard', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            )
        },
        {
            name: 'Mentorship Requests', path: '/mentor/mentorship-requests', icon: (
                <svg className=" w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            )
        },
        {
            name: 'Assigned Teams', path: '/mentor/teams', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            )
        },
        {
            name: 'Feedback', path: '/mentor/feedback', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
            )
        },
        {
            name: 'Settings', path: '/mentor/settings', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            )
        },
    ];

    const userRole = sessionStorage.getItem('userRole');
    const isAdminUser = userRole === 'admin';

    let navItems = isAdmin ? adminNav : (isOrganizer ? organizerNav : (isMentor ? mentorNav : studentNav));

    // If user is admin but currently in another dashboard (e.g. mentor/organizer/student), 
    // add an "Admin Panel" link at the bottom of the nav
    if (isAdminUser && !isAdmin) {
        navItems = [...navItems, {
            name: 'Admin Panel',
            path: '/admin/dashboard',
            icon: (
                <svg className="w-5 h-5 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            )
        }];
    }

    return (
        <div className={`flex h-screen flex-col ${isStudent ? 'bg-white' : 'bg-navy-900 bg-radial'} text-white overflow-hidden font-sans`}>
            <header className={`shrink-0 border-b sticky top-0 z-30 ${isStudent ? 'bg-white border-gray-200 shadow-sm' : 'glass-strong border-white/10'}`}>
                <div className="h-16 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                        <Link to="/" className="shrink-0 group" aria-label="ProEduvate home">
                            <img
                                src="/proeduvatee-removebg-preview.png"
                                alt="ProEduvate"
                                className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
                            />
                        </Link>


                        {/* Search Bar - Common for dashboard */}
                        <div className="relative hidden min-w-0 max-w-96 flex-1 group lg:block">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className={`w-5 h-5 text-gray-400 ${isStudent ? 'group-focus-within:text-indigo-600' : `group-focus-within:text-${themeColor}-400`} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <input
                                type="text"
                                placeholder={isAdmin ? "SEARCH USERS, HACKATHONS..." : "SEARCH..."}
                                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 transition-all ${isStudent ? 'bg-slate-50 border-gray-200 text-slate-800 placeholder-slate-500 focus:ring-indigo-500/50' : `bg-navy-900/50 border-white/10 text-white placeholder-gray-600 focus:ring-${themeColor}-500/50`}`}
                            />
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
                        <div className="hidden items-center gap-2 text-[10px] uppercase tracking-wider sm:flex">
                            <span className="font-semibold text-gray-500">Deployment Role</span>
                            <span className={`font-bold ${isStudent ? 'text-slate-800' : 'text-white'}`}>{currentRole.roleName}</span>
                        </div>
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`relative p-2 transition-colors ${isStudent ? 'text-slate-600 hover:text-indigo-700' : 'text-gray-300 hover:text-white'}`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white animate-pulse shadow-lg shadow-red-600/30 tracking-tighter">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 glass-strong border border-white/10 rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 transform origin-top-right z-50">
                                    <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
                                        <h3 className="font-semibold text-white">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                                                {unreadCount} NEW
                                            </span>
                                        )}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map((notif, i) => (
                                                <div key={notif.id || i} className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors">
                                                    <p className="text-sm text-gray-300">{notif.message}</p>
                                                    <span className="text-xs text-gray-500 mt-1 block">
                                                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-8 text-center">
                                                <p className="text-sm text-gray-500 italic">No notifications yet</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-white/10 text-center">
                                        <button 
                                            onClick={handleMarkAllRead}
                                            className={`text-xs text-${themeColor}-400 hover:text-${themeColor}-300 font-medium transition-colors`}
                                        >
                                            Mark all as read
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className={`flex items-center gap-3 py-1.5 px-3 rounded-full transition-all border border-transparent ${isStudent ? 'text-slate-700 hover:bg-slate-100 hover:border-gray-200' : 'hover:bg-white/5 hover:border-white/10'}`}
                            >
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-r ${currentRole.avatarGradient} flex items-center justify-center text-white font-black shadow-lg shadow-purple-500/20 ring-2 ring-white/10 italic`}>
                                    {currentRole.name.charAt(0)}
                                </div>
                                <span className={`hidden md:block text-[12px] font-bold uppercase tracking-wider ${isStudent ? 'text-slate-800' : 'text-white'}`}>
                                    {currentRole.fullName.toUpperCase()}
                                </span>
                                <svg className={`w-4 h-4 transition-transform duration-200 ${isStudent ? 'text-slate-500' : 'text-gray-400'} ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-3 w-56 glass-strong border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-white/10 mb-2">
                                        <p className="text-sm font-medium text-white">{currentRole.fullName}</p>
                                        <p className="text-xs text-gray-400 truncate">{currentRole.email}</p>
                                    </div>
                                    <Link to={`/${currentRole.path}/profile`} className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">My Profile</Link>
                                    <Link to={`/${currentRole.path}/settings`} className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">Settings</Link>
                                    <div className="h-px bg-white/10 my-2"></div>
                                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <nav
                    aria-label={`${currentRole.roleName} navigation`}
                    className="custom-scrollbar flex items-center gap-1 overflow-x-auto px-3 pb-2 sm:px-6 lg:px-10"
                >
                    {navItems.map((item) => {
                        // Keep dashboard exact-match behavior and parent-route highlighting.
                        const isDashboardRoot = item.path.endsWith('/dashboard');
                        const isActive = isDashboardRoot
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`
                                    flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-all duration-300 group
                                    ${isStudent
                                        ? (isActive
                                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                            : 'text-slate-700 hover:text-indigo-700 hover:bg-slate-50')
                                        : (isActive
                                            ? `${activeStyles[themeColor] || activeStyles.purple} border`
                                            : 'text-gray-400 hover:text-white hover:bg-white/5')}
                                `}
                            >
                                <span className={`transition-transform duration-300 ${isStudent
                                    ? (isActive ? 'text-indigo-700' : 'text-slate-600 group-hover:text-indigo-600')
                                    : (iconStyles[themeColor] || iconStyles.purple)}`}>
                                    {item.icon}
                                </span>
                                <span className="whitespace-nowrap font-bold tracking-wide uppercase text-[10px] sm:text-[11px]">{item.name}</span>
                                {isActive && (
                                    <div className={`ml-1 h-1.5 w-1.5 shrink-0 rounded-full ${isStudent ? 'bg-indigo-600' : (indicatorStyles[themeColor] || indicatorStyles.purple)}`} />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            {/* Main content scrolls below the persistent navigation header. */}
            <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
