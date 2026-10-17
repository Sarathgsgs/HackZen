import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../services/admin/dashboardApi';

// --- Time Formatter for Real-Time & Timezone-Aware Display ---
export const formatNotificationTime = (timeVal) => {
    if (!timeVal) return 'Just now';
    try {
        let date;
        if (typeof timeVal === 'string') {
            const hasT = timeVal.includes('T');
            const hasZ = timeVal.endsWith('Z') || timeVal.includes('+');
            const normalized = hasT && !hasZ ? `${timeVal}Z` : timeVal;
            const parsed = new Date(normalized);
            if (!isNaN(parsed.getTime())) {
                date = parsed;
            } else {
                const direct = new Date(timeVal);
                if (!isNaN(direct.getTime())) {
                    date = direct;
                } else {
                    return timeVal;
                }
            }
        } else if (timeVal instanceof Date) {
            date = timeVal;
        } else {
            return 'Just now';
        }

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 60 && diffSec >= -15) return 'Just now';
        if (diffSec < 3600 && diffSec >= 60) return `${Math.floor(diffSec / 60)}m ago`;

        // If sent today: e.g. "07:45 PM"
        const isToday = now.toDateString() === date.toDateString();
        const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        if (isToday) return timePart;

        // If sent yesterday: "Yesterday, 07:45 PM"
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (yesterday.toDateString() === date.toDateString()) {
            return `Yesterday, ${timePart}`;
        }

        // Otherwise: "Oct 09, 07:45 PM"
        const datePart = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `${datePart}, ${timePart}`;
    } catch {
        return timeVal || 'Just now';
    }
};

// --- Single Message Popup Modal ---
const MessageModal = ({ message, onClose }) => {
    if (!message) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-slate-900 dark:text-white">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors p-1 rounded-lg"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                <div className="flex items-center gap-3 mb-4 border-b border-slate-200 dark:border-white/10 pb-3">
                    <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m3 11 18-5v12L3 14v-3z"/>
                            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{message.title}</h2>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">{formatNotificationTime(message.createdAt || message.time)}</span>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                    <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{message.message}</p>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95">Close</button>
                </div>
            </div>
        </div>
    );
};

// --- Global Omnibox Search Items Dataset ---
const globalSearchItems = [
    // Navigation Pages
    { id: 'p1', title: 'Operational Command Center', subtitle: 'Admin Executive Overview & Metrics', category: 'Pages', path: '/admin/dashboard' },
    { id: 'p2', title: 'Organizer Approvals', subtitle: 'Review & Verify Organizer Applications', category: 'Pages', path: '/admin/organizer-approvals' },
    { id: 'p3', title: 'Hackathon Approvals', subtitle: 'Approve & Moderate Hackathon Proposals', category: 'Pages', path: '/admin/hackathon-approvals' },
    { id: 'p4', title: 'Users Management & Directory', subtitle: 'Inspect, Role-Edit & Governance Directory', category: 'Pages', path: '/admin/users' },
    { id: 'p5', title: 'Submissions Scrutiny & Review', subtitle: 'Evaluate deliverables & originality scores', category: 'Pages', path: '/admin/submissions' },
    { id: 'p6', title: 'Certificates & Credential Ledger', subtitle: 'Issue, Revoke & Verify Certificates', category: 'Pages', path: '/admin/certificates' },
    { id: 'p7', title: 'Disputes & Incident Reports', subtitle: 'Resolve team disputes and plagiarism flags', category: 'Pages', path: '/admin/disputes' },
    { id: 'p8', title: 'Analytics & College Rankings', subtitle: 'Participation trends & performance benchmarks', category: 'Pages', path: '/admin/analytics' },
    { id: 'p9', title: 'Platform Security Settings', subtitle: 'Access controls and system preferences', category: 'Pages', path: '/admin/settings' },
    // Organizer Navigation Pages
    { id: 'op1', title: 'Organizer Executive Dashboard', subtitle: 'Operational command and KPI analytics', category: 'Organizer', path: '/organizer/dashboard' },
    { id: 'op2', title: 'Hackathon Approval Status', subtitle: '4-step approval standing & admin feedback', category: 'Organizer', path: '/organizer/approval-status' },
    { id: 'op3', title: 'Manage Registrations & Timeline', subtitle: '142 registered teams & milestones ledger', category: 'Organizer', path: '/organizer/teams-mentors' },
    { id: 'op4', title: 'Hackathon Operations Hub', subtitle: 'Mentors, judges, submissions & evaluation', category: 'Organizer', path: '/organizer/evaluation' },
    { id: 'op5', title: 'Create Hackathon Wizard', subtitle: 'Submit new event proposal for approval', category: 'Organizer', path: '/organizer/create-hackathon' },
    { id: 'op6', title: 'My Hackathons Portfolio', subtitle: 'Active, upcoming and past organized events', category: 'Organizer', path: '/organizer/my-hackathons' },
    { id: 'op7', title: 'Organizer Settings', subtitle: 'Profile, notifications, and security preferences', category: 'Organizer', path: '/organizer/settings' },

    // Current navigation pages are searchable; dashboard records come from APIs.
];


const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logoutUser } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showOrganizerActionMenu, setShowOrganizerActionMenu] = useState(false);
    const organizerActionRef = React.useRef(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [toastPopup, setToastPopup] = useState(null);
    const mainRef = React.useRef(null);

    // Global Omnibox Search State
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = React.useRef(null);


    // Scroll to top on every route transition
    React.useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }, [location.pathname]);

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

    // --- LocalStorage Read Notification Persistence ---
    const getReadIds = () => {
        try {
            return JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
        } catch (e) {
            return [];
        }
    };

    const saveReadId = (id) => {
        if (!id) return;
        const current = getReadIds();
        if (!current.includes(id)) {
            localStorage.setItem('read_notification_ids', JSON.stringify([...current, id]));
        }
    };

    const saveAllReadIds = (ids) => {
        const current = getReadIds();
        const combined = Array.from(new Set([...current, ...ids]));
        localStorage.setItem('read_notification_ids', JSON.stringify(combined));
    };

    // --- Notifications Integration ---
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        const localReadIds = getReadIds();
        try {
            const res = await fetchNotifications();
            if (res && res.success && Array.isArray(res.notifications)) {
                const list = res.notifications.map(n => {
                    const isRead = n.read || n.isRead || localReadIds.includes(n.id);
                    return { ...n, read: isRead, isRead: isRead };
                });
                // Deduplicate by title + message to prevent duplicate broadcast rows
                const uniqueMap = new Map();
                list.forEach(n => {
                    const key = `${(n.title || '').trim().toLowerCase()}|${(n.message || '').trim().toLowerCase()}`;
                    if (!uniqueMap.has(key)) {
                        uniqueMap.set(key, n);
                    }
                });
                const sortedList = Array.from(uniqueMap.values()).sort((a, b) => {
                    if (a.id && b.id) return b.id.localeCompare(a.id);
                    return 0;
                });
                setNotifications(sortedList);
                const unread = sortedList.filter(n => !n.read && !n.isRead);
                setUnreadCount(unread.length);

                // Auto-trigger Toast popup ONLY for new unread notifications that haven't popped up yet
                if (unread.length > 0) {
                    const latest = unread[0];
                    const lastSeenId = localStorage.getItem('last_seen_announcement_id');
                    if (lastSeenId !== latest.id && !localReadIds.includes(latest.id)) {
                        setToastPopup(latest);
                        localStorage.setItem('last_seen_announcement_id', latest.id);
                        setTimeout(() => {
                            setToastPopup(prev => (prev?.id === latest.id ? null : prev));
                        }, 7000);
                    }
                }
                return;
            }
        } catch (e) {
            console.error("Failed to load dashboard notifications:", e);
        }

        try {
            const data = await import('../api/userApi').then(m => m.fetchMyNotifications());
            if (Array.isArray(data) && data.length > 0) {
                const list = data.map(n => {
                    const isRead = n.isRead || n.read || localReadIds.includes(n.id);
                    return { ...n, isRead, read: isRead };
                });
                const uniqueMap = new Map();
                list.forEach(n => {
                    const key = `${(n.title || '').trim().toLowerCase()}|${(n.message || '').trim().toLowerCase()}`;
                    if (!uniqueMap.has(key)) {
                        uniqueMap.set(key, n);
                    }
                });
                const sortedList = Array.from(uniqueMap.values()).sort((a, b) => {
                    if (a.id && b.id) return b.id.localeCompare(a.id);
                    return 0;
                });
                setNotifications(sortedList);
                setUnreadCount(sortedList.filter(n => !n.isRead).length);
            }
        } catch (e) {
            setNotifications([]);
            setUnreadCount(0);
        }
    };


    React.useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 10000);
        window.addEventListener('announcement-sent', loadNotifications);
        return () => {
            clearInterval(interval);
            window.removeEventListener('announcement-sent', loadNotifications);
        };
    }, []);

    // --- Click Outside Dropdowns Ref ---
    const dropdownRef = React.useRef(null);
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowNotifications(false);
                setShowProfileMenu(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
            if (organizerActionRef.current && !organizerActionRef.current.contains(event.target)) {
                setShowOrganizerActionMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter live search items based on omnibox query
    const searchResults = React.useMemo(() => {
        const q = globalSearchQuery.trim().toLowerCase();
        if (!q) return [];
        return globalSearchItems.filter(item => {
            return item.title.toLowerCase().includes(q) ||
                   item.subtitle.toLowerCase().includes(q) ||
                   item.category.toLowerCase().includes(q);
        }).slice(0, 8);
    }, [globalSearchQuery]);

    const handleSearchSelect = (item) => {
        navigate(item.path);
        setGlobalSearchQuery('');
        setIsSearchOpen(false);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            const results = location.pathname.startsWith('/student')
                ? studentNav.filter(item => item.name.toLowerCase().includes(globalSearchQuery.trim().toLowerCase()))
                : searchResults;
            if (results.length > 0) {
                handleSearchSelect(results[0]);
            } else if (globalSearchQuery.trim()) {
                if (!location.pathname.startsWith('/student')) {
                    navigate(`/admin/users?search=${encodeURIComponent(globalSearchQuery.trim())}`);
                }
                setIsSearchOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsSearchOpen(false);
        }
    };


    const handleMarkAllRead = async () => {
        const allIds = notifications.map(n => n.id).filter(Boolean);
        saveAllReadIds(allIds);
        setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
        setUnreadCount(0);
        try {
            await markAllNotificationsRead();
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const handleOpenMessage = async (notif) => {
        setSelectedMessage(notif);
        setShowNotifications(false);
        if (notif.id) {
            saveReadId(notif.id);
        }
        setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, read: true, isRead: true } : n)));
        setUnreadCount(prev => Math.max(0, prev - 1));

        if (!notif.read && !notif.isRead) {
            try {
                if (notif.id) {
                    await markNotificationRead(notif.id);
                }
            } catch (error) {
                console.error("Failed to mark single notification as read", error);
            }
        }
    };

    // Determine Role based on URL path
    const currentPath = location.pathname;
    const isStudent = currentPath.startsWith('/student');
    const isAdmin = currentPath.startsWith('/admin');
    const isOrganizer = currentPath.startsWith('/organizer');
    const isMentor = currentPath.startsWith('/mentor');

    // Admin Navigation Layout Preference: 'navbar' (Figma Spec) vs 'sidebar' (Classic)
    const [adminNavLayout, setAdminNavLayout] = useState(() => {
        return localStorage.getItem('admin_nav_layout') || 'navbar';
    });

    React.useEffect(() => {
        const handleLayoutChange = () => {
            const current = localStorage.getItem('admin_nav_layout') || 'navbar';
            setAdminNavLayout(current);
        };
        window.addEventListener('admin-nav-layout-change', handleLayoutChange);
        window.addEventListener('storage', handleLayoutChange);
        return () => {
            window.removeEventListener('admin-nav-layout-change', handleLayoutChange);
            window.removeEventListener('storage', handleLayoutChange);
        };
    }, []);

    const isTopNavbarMode = (isAdmin && adminNavLayout === 'navbar') || isOrganizer;

    // Role Config
    const roleConfig = {
        student: {
            name: storedUser?.name?.split(' ')[0] || 'Student',
            fullName: storedUser?.name || 'Student User',
            roleName: 'Student',
            email: storedUser?.email || '',
            theme: 'purple',
            path: 'student',
            avatarGradient: 'from-purple-500 to-indigo-500',
        },
        organizer: {
            name: (storedUser?.name && storedUser.name !== 'Guest' && storedUser.name !== 'Organizer User') ? storedUser.name.split(' ')[0] : 'Alex',
            fullName: (storedUser?.name && storedUser.name !== 'Guest' && storedUser.name !== 'Organizer User') ? storedUser.name : 'Alex Morgan',
            roleName: 'Organizer',
            email: storedUser?.email || 'alex.morgan@proeduvate.com',
            theme: 'purple',
            path: 'organizer',
            avatarGradient: 'from-purple-500 to-indigo-500',
            avatarUrl: storedUser?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        },
        mentor: {
            name: storedUser?.name?.split(' ')[0] || 'Mentor',
            fullName: storedUser?.name || 'Mentor User',
            roleName: 'Mentor',
            email: storedUser?.email || '',
            theme: 'purple',
            path: 'mentor',
            avatarGradient: 'from-purple-500 to-indigo-500',
        },
        admin: {
            name: storedUser?.name?.split(' ')[0] || 'Admin',
            fullName: storedUser?.name || 'Admin User',
            roleName: 'Super Admin',
            email: storedUser?.email || '',
            theme: 'blue',
            path: 'admin',
            avatarGradient: 'from-blue-600 to-indigo-700',
        }
    };

    const handleLogout = () => {
        logoutUser();
        navigate('/login', { replace: true });
    };

    const currentRole = isAdmin ? roleConfig.admin : (isOrganizer ? roleConfig.organizer : (isMentor ? roleConfig.mentor : roleConfig.student));

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
            name: 'My Submissions', path: '/student/submissions', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
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
            name: 'Dashboard', 
            path: '/organizer/dashboard', 
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            )
        },
        {
            name: 'My Hackathons',
            path: '/organizer/my-hackathons',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            )
        },
        {
            name: 'Create Hackathon', 
            path: '/organizer/create-hackathon', 
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            name: 'Registrations', 
            path: '/organizer/teams-mentors', 
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            )
        },
        {
            name: 'Timeline', 
            path: '/organizer/edit-timeline', 
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            name: 'Mentors & Judges', 
            path: '/organizer/evaluation', 
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            )
        },
        {
            name: 'Settings', 
            path: '/organizer/settings', 
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
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

    const displayedSearchResults = isStudent
        ? studentNav
            .filter(item => item.name.toLowerCase().includes(globalSearchQuery.trim().toLowerCase()))
            .map(item => ({ ...item, id: item.path, title: item.name, subtitle: 'Student page', category: 'Navigation' }))
            .slice(0, 8)
        : searchResults;

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
        <div className={`flex h-screen bg-[#f8fafc] dark:bg-navy-950 text-slate-900 dark:text-white overflow-hidden font-sans transition-colors duration-300 ${isStudent ? 'flex-col' : ''}`}>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* --- SIDEBAR CONTAINER --- */}
            <div 
                className={`${isStudent ? '!hidden' : ''} ${isAdmin ? 'bg-white' : 'bg-[#f9f9f9]'} dark:bg-navy-900 border-r border-[#e2e8f0] dark:border-white/10 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
                    isSidebarExpanded ? 'w-64' : 'w-[72px]'
                } ${isTopNavbarMode ? (sidebarOpen ? 'translate-x-0 fixed inset-y-0 left-0 z-40 lg:hidden' : 'hidden') : (sidebarOpen ? 'translate-x-0 fixed inset-y-0 left-0 z-40' : '-translate-x-full lg:translate-x-0 fixed lg:relative h-full z-20')}`}
            >

                {/* Sidebar Top Header */}
                {isSidebarExpanded ? (
                    <div className="h-16 flex items-center justify-between px-4 border-b border-[#e2e8f0] dark:border-white/10 shrink-0">
                        {/* Left: Brand Logo (No Tooltip) */}
                        <Link to="/" className="flex items-center gap-2.5 focus:outline-none select-none">
                            <Logo size="sm" showSubtext={isOrganizer} />
                        </Link>

                        {/* Right: Sidebar Toggle Button (Collapse Sidebar) */}
                        <div className="relative group/toggle">
                            <button 
                                onClick={() => setIsSidebarExpanded(false)}
                                className="p-2 rounded-xl text-slate-600 dark:text-gray-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
                                aria-label="Collapse Sidebar"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect width="18" height="18" x="3" y="3" rx="2" strokeWidth="2" />
                                    <path strokeWidth="2" strokeLinecap="round" d="M9 3v18" />
                                </svg>
                            </button>
                            {/* Tooltip for Collapse Sidebar */}
                            <span 
                                style={{ color: '#ffffff' }}
                                className="absolute right-0 top-full mt-2 px-3 py-1 text-xs font-medium !text-white bg-[#1A1F2C] backdrop-blur-sm rounded-lg shadow-2xl border border-neutral-800/20 pointer-events-none opacity-0 group-hover/toggle:opacity-100 transition-all duration-200 ease-in-out whitespace-nowrap z-[9999]"
                            >
                                Collapse Sidebar
                                <span className="absolute w-2 h-2 bg-[#1A1F2C] transform rotate-45 right-3 top-[-4px] border-t border-l border-neutral-800/20"></span>
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="h-16 flex items-center justify-center border-b border-[#e2e8f0] dark:border-white/10 shrink-0">
                        {/* Collapsed Mode: ProEduvate Emblem button that morphs into Sidebar Toggle icon on hover */}
                        <div className="relative group/logo">
                            <button 
                                onClick={() => setIsSidebarExpanded(true)}
                                className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors flex items-center justify-center focus:outline-none cursor-pointer group/icon"
                                aria-label="Open Sidebar"
                            >
                                <div className="w-7 h-7 relative flex items-center justify-center">
                                    {/* Default Rocket Emblem SVG */}
                                    <svg className={`w-7 h-7 ${isAdmin ? 'text-[#7C65F6]' : 'text-[#0ea5e9]'} transform -rotate-12 transition-all duration-200 group-hover/icon:opacity-0 group-hover/icon:scale-75 absolute`} fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M3.4 20.4l17.4-7.5c.8-.3.8-1.4 0-1.7L3.4 3.7c-.7-.3-1.4.3-1.2 1l2.4 6.8c.1.3.3.5.6.6l8.8 1.4-8.8 1.4c-.3.1-.5.3-.6.6l-2.4 6.9c-.2.7.5 1.3 1.2 1z"/>
                                    </svg>
                                    {/* On Hover: Sidebar Toggle Icon [ ] */}
                                    <svg className="w-5 h-5 text-slate-700 dark:text-white transition-all duration-200 opacity-0 scale-75 group-hover/icon:opacity-100 group-hover/icon:scale-100 absolute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect width="18" height="18" x="3" y="3" rx="2" strokeWidth="2" />
                                        <path strokeWidth="2" strokeLinecap="round" d="M9 3v18" />
                                    </svg>
                                </div>
                            </button>
                            {/* Tooltip for Open Sidebar when collapsed */}
                            <span 
                                style={{ color: '#ffffff' }}
                                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1 text-xs font-medium !text-white bg-[#1A1F2C] backdrop-blur-sm rounded-lg shadow-2xl border border-neutral-800/20 pointer-events-none opacity-0 group-hover/logo:opacity-100 transition-all duration-200 ease-in-out whitespace-nowrap z-[9999]"
                            >
                                Open Sidebar
                                <span className="absolute w-2 h-2 bg-[#1A1F2C] transform rotate-45 left-[-4px] top-1/2 -translate-y-1/2 border-l border-b border-neutral-800/20"></span>
                            </span>
                        </div>
                    </div>
                )}
                
                {/* Navigation Links with Hover Tooltips */}
                <nav className="flex-1 py-4 px-3 space-y-1.5 scrollbar-hide">
                    {navItems.map((item) => {
                        const isDashboardRoot = item.path.endsWith('/dashboard');
                        const isActive = isDashboardRoot
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);

                        const activeClass = (isOrganizer || isAdmin)
                            ? (isActive ? 'bg-[#7C65F6] !text-white shadow-sm shadow-[#7C65F6]/25 font-bold' : 'text-slate-600 dark:text-gray-400 hover:bg-purple-50/70 hover:text-[#7C65F6] dark:hover:bg-white/5')
                            : (isActive ? 'bg-sky-50 text-[#0ea5e9] dark:bg-sky-500/10 dark:text-sky-400' : 'text-[#64748b] dark:text-gray-400 hover:bg-[#f1f5f9] dark:hover:bg-white/5');

                        return (
                            <div key={item.name} className="relative group">
                                <button
                                    onClick={() => {
                                        navigate(item.path);
                                        setSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center ${isSidebarExpanded ? 'px-3.5 justify-start' : 'justify-center'} py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${activeClass}`}
                                >
                                    <span className={`shrink-0 ${
                                        isActive 
                                            ? ((isOrganizer || isAdmin) ? 'opacity-100 !text-white' : 'opacity-100 text-[#0ea5e9] dark:text-sky-400') 
                                            : 'opacity-70'
                                    } ${isSidebarExpanded ? 'mr-3' : ''}`}>
                                        {item.icon}
                                    </span>
                                    
                                    {/* Text (Visible only when expanded) */}
                                    {isSidebarExpanded && <span className={`truncate uppercase tracking-wider text-[11px] ${isActive && (isOrganizer || isAdmin) ? '!text-white font-extrabold' : ''}`}>{item.name}</span>}
                                </button>

                                {/* Tooltip rendered ONLY when sidebar is collapsed (icon-only mode) */}
                                {!isSidebarExpanded && (
                                    <span 
                                        style={{ color: '#ffffff' }}
                                        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-4 py-2 text-sm font-medium !text-white bg-[#1A1F2C] backdrop-blur-sm rounded-lg shadow-2xl border border-neutral-800/20 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 ease-in-out whitespace-nowrap z-[9999]"
                                    >
                                        {item.name}
                                        <span className="absolute w-2 h-2 bg-[#1A1F2C] transform rotate-45 left-[-4px] top-1/2 -translate-y-1/2 border-l border-b border-neutral-800/20"></span>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Organizer Specific + Create Project Button */}
                {isOrganizer && (
                    <div className="px-3 pb-3">
                        <button
                            onClick={() => navigate('/organizer/create-hackathon')}
                            className={`w-full py-2.5 px-3 rounded-xl bg-[#7C65F6] hover:bg-[#6851ec] text-white font-bold text-xs flex items-center ${isSidebarExpanded ? 'justify-center gap-2' : 'justify-center'} shadow-md shadow-[#7C65F6]/30 transition-all duration-200 active:scale-95 cursor-pointer`}
                            title="Create Hackathon"
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                            </svg>
                            {isSidebarExpanded && <span>+ Create Project</span>}
                        </button>
                    </div>
                )}

                {/* Bottom Profile Section */}
                {isOrganizer ? (
                    <div className="p-3 border-t border-[#e2e8f0] dark:border-white/10 shrink-0 relative" ref={organizerActionRef}>
                        <div className={`flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'} w-full`}>
                            <div 
                                className="flex items-center gap-2.5 min-w-0 cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                onClick={() => navigate('/organizer/profile')}
                            >
                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 text-[#7C65F6] border border-purple-200 dark:border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                    {(currentRole.fullName || 'Alex Morgan').charAt(0).toUpperCase()}
                                </div>
                                {isSidebarExpanded && (
                                    <div className="flex flex-col text-left overflow-hidden">
                                        <span className="text-xs font-bold text-[#1e293b] dark:text-white truncate">
                                            {currentRole.fullName || 'Alex Morgan'}
                                        </span>
                                        <span className="text-[10px] text-[#7C65F6] font-bold tracking-wide uppercase">
                                            Organizer
                                        </span>
                                    </div>
                                )}
                            </div>
                            {isSidebarExpanded && (
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowOrganizerActionMenu(prev => !prev)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                        aria-label="Organizer options"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="5" r="2" />
                                            <circle cx="12" cy="12" r="2" />
                                            <circle cx="12" cy="19" r="2" />
                                        </svg>
                                    </button>
                                    {showOrganizerActionMenu && (
                                        <div className="absolute right-0 bottom-full mb-2 w-44 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in duration-150">
                                            <button 
                                                onClick={() => { navigate('/organizer/profile'); setShowOrganizerActionMenu(false); }} 
                                                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-[#7C65F6] transition-colors"
                                            >
                                                Profile
                                            </button>
                                            <button 
                                                onClick={() => { navigate('/organizer/settings'); setShowOrganizerActionMenu(false); }} 
                                                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-[#7C65F6] transition-colors"
                                            >
                                                Settings
                                            </button>
                                            <div className="h-px bg-slate-100 dark:bg-white/10 my-1"></div>
                                            <button 
                                                onClick={() => { handleLogout(); setShowOrganizerActionMenu(false); }} 
                                                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-3 border-t border-[#e2e8f0] dark:border-white/10 shrink-0 relative group">
                        <button 
                            onClick={() => navigate(`/${currentRole.path}/profile`)}
                            className={`flex items-center gap-3 w-full p-2 rounded-full hover:bg-[#f1f5f9] dark:hover:bg-white/5 transition-colors ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
                        >
                            <div className={`w-8 h-8 rounded-full ${isAdmin ? 'bg-purple-100 dark:bg-purple-500/20 text-[#7C65F6] dark:text-purple-300 border-purple-200/80 dark:border-purple-500/30' : 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-500/30'} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                                {currentRole.name.charAt(0).toUpperCase()}
                            </div>
                            {isSidebarExpanded && (
                                <div className="flex flex-col text-left overflow-hidden">
                                    <span className="text-xs font-bold text-[#1e293b] dark:text-white truncate">{currentRole.roleName}</span>
                                    <span className="text-[10px] text-[#64748b] dark:text-gray-400 truncate">{currentRole.fullName}</span>
                                </div>
                            )}
                        </button>

                        {/* Tooltip rendered ONLY when sidebar is collapsed (icon-only mode) */}
                        {!isSidebarExpanded && (
                            <span 
                                style={{ color: '#ffffff' }}
                                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-4 py-2 text-sm font-medium !text-white bg-[#1A1F2C] backdrop-blur-sm rounded-lg shadow-2xl border border-neutral-800/20 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 ease-in-out whitespace-nowrap z-[9999]"
                            >
                                {currentRole.roleName} ({currentRole.fullName})
                                <span className="absolute w-2 h-2 bg-[#1A1F2C] transform rotate-45 left-[-4px] top-1/2 -translate-y-1/2 border-l border-b border-neutral-800/20"></span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col relative overflow-hidden ${isStudent ? 'min-h-0' : 'h-full'}`}>
                {/* --- MAIN CONTENT HEADER --- */}
                <header className={`h-16 ${isStudent ? 'bg-white border-slate-200' : 'bg-[#ffffff] dark:bg-navy-900/80 border-b border-[#e2e8f0] dark:border-white/10'} backdrop-blur-md border-b flex items-center justify-between px-3.5 sm:px-6 shrink-0 z-10 transition-colors overflow-visible`}>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Mobile Drawer Trigger (when on small screens or when sidebar mode is active) */}
                        {!isStudent && <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 text-[#64748b] dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-white/10 rounded-full lg:hidden transition-colors"
                            aria-label="Toggle Navigation Drawer"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>}

                        {/* Top Navbar Brand Logo (displayed when in Top Navbar mode) */}
                        {(isTopNavbarMode || isStudent) && (
                            <Link to={isStudent ? '/student/dashboard' : (isOrganizer ? '/organizer/dashboard' : '/admin/dashboard')} className="flex items-center gap-2 select-none shrink-0 pr-1 sm:pr-3">
                                <Logo size="sm" showSubtext={false} forceLight={isStudent} />
                            </Link>
                        )}

                        {/* Search Bar Container with Live Omnibox Dropdown */}
                        <div className={`relative hidden ${isTopNavbarMode ? 'xl:block w-48 2xl:w-64' : isStudent ? 'lg:block w-48 xl:w-64' : 'md:block w-80 xl:w-96'}`} ref={searchRef}>
                            <div className="relative flex items-center">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <svg className={`w-4 h-4 text-slate-400 ${isStudent ? '' : 'dark:text-gray-400'} ${isAdmin ? 'group-focus-within:text-indigo-600' : 'group-focus-within:text-[#0ea5e9]'} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={globalSearchQuery}
                                    onChange={(e) => {
                                        setGlobalSearchQuery(e.target.value);
                                        setIsSearchOpen(true);
                                    }}
                                    onFocus={() => {
                                        if (globalSearchQuery.trim().length > 0) setIsSearchOpen(true);
                                    }}
                                    onKeyDown={handleSearchKeyDown}
                                    placeholder={isStudent ? "Search student pages..." : (isOrganizer ? "Search..." : (isAdmin ? "Search..." : "SEARCH..."))}
                                    className={`w-full pl-9 pr-9 py-2 ${isStudent ? 'bg-slate-100 border border-slate-200 text-slate-800 placeholder-slate-400' : 'bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500'} rounded-2xl text-[11px] font-bold focus:outline-none transition-all shadow-sm ${isOrganizer ? 'focus:border-[#7C65F6] focus:ring-2 focus:ring-purple-500/20' : isAdmin ? 'focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20' : 'focus:border-[#0ea5e9] focus:ring-2 focus:ring-sky-500/20'}`}
                                />
                                {globalSearchQuery && (
                                    <button 
                                        onClick={() => { setGlobalSearchQuery(''); setIsSearchOpen(false); }}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 ${isStudent ? '' : 'dark:hover:text-white'} transition-colors`}
                                        aria-label="Clear search"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"/>
                                            <line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown Popup */}
                            {isSearchOpen && globalSearchQuery.trim().length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150">
                                    <div className="p-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-gray-400 px-3">
                                        <span>Quick Jump Results ({displayedSearchResults.length})</span>
                                        <span>Press ↵ Enter to Open</span>
                                    </div>

                                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 scrollbar-hide">
                                        {displayedSearchResults.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-500 dark:text-gray-400">
                                                <p className="font-bold">No exact match found for "{globalSearchQuery}"</p>
                                                {!isStudent && <button
                                                    onClick={() => {
                                                        navigate(`/admin/users?search=${encodeURIComponent(globalSearchQuery.trim())}`);
                                                        setIsSearchOpen(false);
                                                    }}
                                                    className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline"
                                                >
                                                    Search Directory for "{globalSearchQuery}" →
                                                </button>}
                                            </div>
                                        ) : (
                                            displayedSearchResults.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleSearchSelect(item)}
                                                    className={`p-3 ${isAdmin ? 'hover:bg-indigo-50' : 'hover:bg-sky-50'} dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between group`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-8 h-8 shrink-0 rounded-xl ${isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-sky-50 text-sky-600 border border-sky-200'} dark:bg-white/10 dark:text-indigo-400 dark:border-white/10 flex items-center justify-center text-[10px] font-black uppercase`}>
                                                            {item.category === 'Pages' ? 'PG' : item.category === 'Users' ? 'USR' : item.category === 'Hackathons' ? 'HCK' : item.category === 'Submissions' ? 'SUB' : item.category === 'Certificates' ? 'CRT' : 'DSP'}
                                                        </span>
                                                        <div>
                                                            <p className={`text-xs font-extrabold text-slate-900 dark:text-white ${isAdmin ? 'group-hover:text-indigo-600' : 'group-hover:text-sky-500'} transition-colors`}>
                                                                {item.title}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">
                                                                {item.subtitle}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-white/10">
                                                            {item.category}
                                                        </span>
                                                        <span className={`text-xs ${isAdmin ? 'text-indigo-600' : 'text-sky-500'} font-bold opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                            →
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                    </div>

                    {/* Center: In Top Navbar Mode, render horizontal navigation links as in Figma reference */}
                    {isTopNavbarMode && (
                        <nav className="hidden lg:flex items-center h-full gap-0.5 xl:gap-1.5 overflow-x-auto scrollbar-hide px-2">
                            {(isOrganizer ? organizerNav : adminNav).map((item) => {
                                const isActive = location.pathname === item.path || (item.path !== '/admin/dashboard' && item.path !== '/organizer/dashboard' && location.pathname.startsWith(item.path));
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={`h-full flex items-center px-2.5 xl:px-3 text-xs xl:text-[13px] font-semibold transition-all whitespace-nowrap border-b-2 ${
                                            isActive
                                                ? (isOrganizer
                                                    ? 'text-[#7C65F6] dark:text-purple-400 font-bold border-[#7C65F6] dark:border-purple-400 bg-purple-50/40 dark:bg-purple-950/20'
                                                    : 'text-[#7C65F6] dark:text-purple-400 font-bold border-[#7C65F6] dark:border-purple-400 bg-purple-50/40 dark:bg-purple-950/20')
                                                : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border-transparent hover:border-slate-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    )}
                    
                    {/* Right side (Theme, Notifications, Admin Dropdown) - Gemini Chat style spacing */}
                    <div className="flex items-center gap-1.5 sm:gap-3 relative shrink-0" ref={dropdownRef}>
                        
                        {/* Theme Toggle */}
                        <div className="relative flex items-center justify-center">
                            <ThemeToggle variant="button" forceLightAppearance={isStudent} />
                        </div>

                        {/* Help Guide for Organizer */}
                        {isOrganizer && (
                            <div className="relative flex items-center justify-center">
                                <button
                                    onClick={() => navigate('/organizer/settings')}
                                    className="relative w-9 h-9 flex items-center justify-center text-slate-600 dark:text-gray-300 hover:text-[#7C65F6] hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-purple-200 dark:hover:border-purple-500/20"
                                    title="Help & Guides"
                                    aria-label="Help"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Notification Bell */}
                        <div className="relative flex items-center justify-center">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`relative w-9 h-9 flex items-center justify-center text-slate-600 ${isStudent ? '' : 'dark:text-gray-300'} hover:text-slate-900 ${isStudent ? '' : 'dark:hover:text-white'} hover:bg-slate-100 ${isStudent ? '' : 'dark:hover:bg-white/10'} rounded-xl transition-colors border border-transparent hover:border-slate-200 ${isStudent ? '' : 'dark:hover:border-white/10'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white animate-pulse shadow-lg shadow-rose-600/30 tracking-tighter">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Profile Dropdown Button */}
                        <div className="relative flex items-center justify-center">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className={`flex items-center justify-center gap-1.5 sm:gap-2 p-1 pr-1.5 sm:pr-3 rounded-xl sm:rounded-full transition-colors border cursor-pointer ${
                                    isOrganizer 
                                        ? 'bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 border-purple-200 dark:border-purple-500/20' 
                                        : isStudent ? 'bg-slate-100 hover:bg-slate-200 border-slate-200' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/10'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm ${
                                    isOrganizer
                                        ? 'bg-purple-100 dark:bg-purple-500/20 text-[#7C65F6] border border-purple-200 dark:border-purple-500/30'
                                        : isAdmin
                                            ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30'
                                            : 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-500/30'
                                }`}>
                                    {currentRole.avatarUrl ? (
                                        <img src={currentRole.avatarUrl} alt={currentRole.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        currentRole.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="hidden md:flex flex-col text-left leading-none">
                                    <span className={`text-[11px] font-bold text-slate-800 ${isStudent ? '' : 'dark:text-white'} leading-tight`}>
                                        {currentRole.fullName}
                                    </span>
                                    <span className="text-[9px] text-[#7C65F6] font-semibold leading-none">
                                        {currentRole.roleName}
                                    </span>
                                </div>
                                <svg className={`w-3.5 h-3.5 text-slate-500 ${isStudent ? '' : 'dark:text-gray-400'} transition-transform duration-200 shrink-0 ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </button>

                            {/* Profile Dropdown Menu */}
                            {showProfileMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 mb-2">
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">{currentRole.fullName}</p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{currentRole.email}</p>
                                    </div>
                                    <Link to={`/${currentRole.path}/profile`} className="block px-4 py-2 text-xs font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors">My Profile</Link>
                                    <Link to={`/${currentRole.path}/settings`} className="block px-4 py-2 text-xs font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors">Settings</Link>
                                    <div className="h-px bg-slate-200 dark:bg-white/10 my-2"></div>
                                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Notification Dropdown Panel */}
                        {showNotifications && (
                            <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-full mt-2 w-auto sm:w-80 max-w-sm mx-auto sm:mx-0 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 transform origin-top-right z-50">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Notifications ({unreadCount})</h3>
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={handleMarkAllRead}
                                            className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:text-blue-700 text-[10px] font-bold transition-colors"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.map((notif, i) => (
                                            <div 
                                                key={notif.id || i} 
                                                onClick={() => handleOpenMessage(notif)}
                                                className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors flex gap-3 ${(notif.read || notif.isRead) ? 'opacity-60' : 'bg-blue-50/50 dark:bg-blue-500/5'}`}
                                            >
                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${(notif.read || notif.isRead) ? 'bg-transparent' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]'}`}></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <h4 className={`text-xs font-bold ${(notif.read || notif.isRead) ? 'text-slate-600 dark:text-gray-300' : 'text-slate-900 dark:text-white'}`}>{notif.title || 'Announcement'}</h4>
                                                        <span className="text-[9px] text-slate-400 whitespace-nowrap ml-2">
                                                            {formatNotificationTime(notif.createdAt || notif.time)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{notif.message}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-sm text-slate-400 italic">No notifications yet</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 border-t border-slate-200 dark:border-white/10 text-center">
                                    <button 
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold transition-colors"
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {isStudent && (
                    <nav aria-label="Student navigation" className="flex h-14 shrink-0 items-stretch gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 shadow-sm scrollbar-hide sm:px-6">
                        {studentNav.map((item) => {
                            const isDashboardRoot = item.path === '/student/dashboard';
                            const isActive = isDashboardRoot
                                ? location.pathname === item.path
                                : location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`flex shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition-colors sm:px-4 ${isActive ? 'border-[#7C65F6] bg-purple-50/50 text-[#684ee8]' : 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    <span className={isActive ? 'text-[#684ee8]' : 'text-slate-500'}>{item.icon}</span>
                                    <span className="whitespace-nowrap">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                )}

                {/* Main Content from child routes */}
                <main ref={mainRef} className={`flex-1 overflow-y-auto scrollbar-hide ${isStudent ? 'min-h-0 p-0' : 'p-3.5 sm:p-6 lg:p-10'}`}>
                    <Outlet />
                </main>
            </div>

            {/* Global Real-time Toast Popup Banner */}
            {toastPopup && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300 max-w-md w-full px-4 pointer-events-auto">
                    <div className="bg-white/95 dark:bg-navy-950/95 backdrop-blur-xl border border-violet-300/80 dark:border-violet-500/40 text-slate-900 dark:text-white p-4 rounded-2xl shadow-2xl shadow-violet-900/10 dark:shadow-violet-900/30 flex items-start gap-3.5 relative group">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-violet-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m3 11 18-5v12L3 14v-3z"/>
                                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0 pr-6">

                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/30">Announcement</span>
                                <span className="text-[9.5px] text-slate-500 dark:text-gray-400 font-mono">{formatNotificationTime(toastPopup.createdAt || toastPopup.time)}</span>
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{toastPopup.title}</h4>
                            <p className="text-xs text-slate-600 dark:text-gray-300 line-clamp-2 mt-0.5 leading-relaxed">{toastPopup.message}</p>
                            <div className="mt-2.5 flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedMessage(toastPopup);
                                        setToastPopup(null);
                                    }}
                                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline underline-offset-2 transition-colors"
                                >
                                    View Full Message →
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setToastPopup(null)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white p-1 rounded-lg transition-colors text-xs font-bold"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}


            {/* Single Notification Message Modal */}
            <MessageModal 
                message={selectedMessage} 
                onClose={() => setSelectedMessage(null)} 
            />
        </div>
    );
};

export default DashboardLayout;
