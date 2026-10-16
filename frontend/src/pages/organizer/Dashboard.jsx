import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    fetchOrganizerDashboardData, 
    sendOrganizerBroadcast, 
    exportOrganizerReport 
} from '../../services/organizer/dashboardApi';

// Animated Counter Hook for smooth numeric updates
const useAnimatedValue = (value, duration = 800) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let val = Number(value) || 0;
        let startTime;
        const startValue = displayValue;
        const diff = val - startValue;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(startValue + diff * easeOut));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return displayValue;
};

const OrganizerDashboard = () => {
    const navigate = useNavigate();

    // Data States
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [stats, setStats] = useState([]);
    const [activeHackathons, setActiveHackathons] = useState([]);
    const [recentRegistrations, setRecentRegistrations] = useState([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

    // Current organizer name from session
    const storedUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    const organizerName = (storedUser?.name && storedUser.name !== 'Guest' && storedUser.name !== 'Organizer User') 
        ? storedUser.name.split(' ')[0] 
        : 'Alex';

    // Broadcast Modal State
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastTarget, setBroadcastTarget] = useState('all');
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessageText, setBroadcastMessageText] = useState('');
    const [broadcastUrgency, setBroadcastUrgency] = useState('normal');
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Load Live Dashboard Data
    const loadDashboard = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await fetchOrganizerDashboardData();
            setStats(data.stats || []);
            setActiveHackathons(data.activeHackathons || []);
            setRecentRegistrations(data.recentRegistrations || []);
            setUpcomingDeadlines(data.upcomingDeadlines || []);
        } catch (error) {
            console.error("Failed to load organizer dashboard data:", error);
            showToast("Unable to load dashboard data. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // Handle CSV Export
    const handleExport = async () => {
        try {
            setIsExporting(true);
            await exportOrganizerReport();
            showToast("Operational CSV report generated and downloaded successfully!");
        } catch (error) {
            console.error("Export report failed:", error);
            showToast("Failed to export report. Please try again.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    // Handle Quick Broadcast Dispatch
    const handleBroadcastSubmit = async (e) => {
        e.preventDefault();
        if (!broadcastTitle.trim() || !broadcastMessageText.trim()) {
            showToast("Please provide both title and broadcast message.", "error");
            return;
        }

        try {
            setIsSendingBroadcast(true);
            const res = await sendOrganizerBroadcast({
                hackathonId: broadcastTarget,
                title: broadcastTitle.trim(),
                message: broadcastMessageText.trim(),
                urgency: broadcastUrgency
            });

            showToast(res.message || "Broadcast dispatched to all registered participants!");
            setIsBroadcastOpen(false);
            setBroadcastTitle('');
            setBroadcastMessageText('');
            setBroadcastUrgency('normal');
        } catch (error) {
            console.error("Broadcast dispatch failed:", error);
            showToast("Failed to dispatch broadcast. Check server connection.", "error");
        } finally {
            setIsSendingBroadcast(false);
        }
    };

    const AnimatedStat = ({ value }) => {
        const animated = useAnimatedValue(value);
        return <span>{animated.toLocaleString()}</span>;
    };

    // Icon Resolver matching lavender container in Figma Screenshot 1
    const renderStatIcon = (type) => {
        switch (type) {
            case 'hackathons':
                return (
                    <svg className="w-5 h-5 text-[#7C65F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                );
            case 'registrations':
                return (
                    <svg className="w-5 h-5 text-[#7C65F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                );
            case 'submissions':
                return (
                    <svg className="w-5 h-5 text-[#7C65F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            case 'mentors':
            default:
                return (
                    <svg className="w-5 h-5 text-[#7C65F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                );
        }
    };

    // Status Pill Formatter matching Figma
    const getStatusBadge = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('active') || s.includes('live')) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#6D28D9] dark:bg-[#7C65F6]/20 dark:text-[#A78BFA] border border-[#DDD6FE] dark:border-[#7C65F6]/30">
                    Active
                </span>
            );
        }
        if (s.includes('pending') || s.includes('review') || s.includes('draft')) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] dark:bg-amber-500/20 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-500/30">
                    Pending Review
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#D1FAE5] text-[#059669] dark:bg-emerald-500/20 dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-500/30">
                Approved
            </span>
        );
    };

    return (
        <div className="space-y-7 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
            {/* Notification Toast */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${
                    toastMessage.type === 'error' 
                        ? 'bg-rose-950/90 border-rose-500/30 text-rose-200' 
                        : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                }`}>
                    <span className="text-base">{toastMessage.type === 'error' ? '⚠️' : '✓'}</span>
                    <span className="text-sm font-medium">{toastMessage.text}</span>
                </div>
            )}

            {/* Header Section matching Figma Screenshot 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Dashboard Overview
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Welcome back, {organizerName}. Here's what's happening across your events.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-4 py-2.5 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                        {isExporting ? (
                            <svg className="w-4 h-4 animate-spin text-[#7C65F6]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        )}
                        <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
                    </button>
                </div>
            </div>

            {/* 4 Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat) => (
                    <div 
                        key={stat.id} 
                        className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                {stat.title}
                            </span>
                            <div className="w-10 h-10 rounded-full bg-[#EDE9FE] dark:bg-[#7C65F6]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                {renderStatIcon(stat.type)}
                            </div>
                        </div>

                        <div className="mt-3">
                            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                <AnimatedStat value={stat.value} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Responsive 2-Column Grid: Left 8 Cols, Right 4 Cols */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Active Hackathons Table & Recent Registrations */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Active Hackathons Table Card */}
                    <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                Active Hackathons
                            </h2>
                            <button
                                onClick={() => navigate('/organizer/my-hackathons')}
                                className="text-xs font-bold text-[#7C65F6] hover:text-[#6852F6] transition-colors flex items-center gap-1 group cursor-pointer"
                            >
                                <span>View All</span>
                                <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                            </button>
                        </div>

                        {/* Responsive Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                        <th className="py-3 px-5 text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
                                            Event Name
                                        </th>
                                        <th className="py-3 px-4 text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="py-3 px-4 text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
                                            Timeline
                                        </th>
                                        <th className="py-3 px-5 text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {activeHackathons.length === 0 ? (
                                        <tr><td colSpan={4} className="py-8 text-center text-xs text-slate-400">No hackathons are available.</td></tr>
                                    ) : activeHackathons.map((event) => (
                                        <tr 
                                            key={event.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                                        >
                                            <td className="py-4 px-5">
                                                <div 
                                                    onClick={() => navigate(`/organizer/manage-hackathon/${event.id}`)}
                                                    className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white hover:text-[#7C65F6] transition-colors cursor-pointer"
                                                >
                                                    {event.title}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                                                    {event.participants}
                                                </div>
                                            </td>

                                            <td className="py-4 px-4 whitespace-nowrap">
                                                {getStatusBadge(event.status)}
                                            </td>

                                            <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-gray-300 font-medium">
                                                {event.timeline}
                                            </td>

                                            <td className="py-4 px-5 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => navigate(`/organizer/manage-hackathon/${event.id}`)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#7C65F6] hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors cursor-pointer inline-flex items-center justify-center"
                                                    title="Inspect Event"
                                                    aria-label="Inspect Event"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Registrations Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                Recent Registrations
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {recentRegistrations.length === 0 ? (
                                <p className="py-6 text-center text-xs text-slate-400">No recent registrations.</p>
                            ) : recentRegistrations.map((reg, idx) => {
                                const avatarBg = idx === 0 
                                    ? 'bg-[#EDE9FE] text-[#7C65F6] dark:bg-purple-500/20' 
                                    : idx === 1 
                                    ? 'bg-slate-800 text-white dark:bg-slate-700' 
                                    : idx === 2 
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' 
                                    : 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400';

                                return (
                                    <div key={reg.id || idx} className="flex items-center justify-between gap-3 py-1">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm ${avatarBg}`}>
                                                {reg.initials}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {reg.name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                                                    {reg.hackathon} • {reg.roleOrMembers}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-400 dark:text-gray-500 font-medium shrink-0">
                                            {reg.timeAgo}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Right Column: Upcoming Deadlines & Announcement Card */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Upcoming Deadlines Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                Upcoming Deadlines
                            </h2>
                            <button 
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                                aria-label="Deadline Options"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="5" r="2" />
                                    <circle cx="12" cy="12" r="2" />
                                    <circle cx="12" cy="19" r="2" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {upcomingDeadlines.length === 0 ? (
                                <p className="py-6 text-center text-xs text-slate-400">No upcoming deadlines.</p>
                            ) : upcomingDeadlines.map((dl, idx) => {
                                const dotColor = dl.color === 'red'
                                    ? 'bg-rose-500'
                                    : dl.color === 'purple'
                                    ? 'bg-[#7C65F6]'
                                    : 'bg-slate-400';

                                return (
                                    <div key={dl.id || idx} className="flex items-start gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                {dl.time}
                                            </div>
                                            <div className="text-xs font-semibold text-slate-700 dark:text-gray-300 mt-0.5">
                                                {dl.label}
                                            </div>
                                            <div className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5 truncate">
                                                {dl.hackathon}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={() => navigate('/organizer/edit-timeline')}
                                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#7C65F6]/40 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-gray-300 hover:text-[#7C65F6] transition-all cursor-pointer text-center"
                            >
                                View Full Calendar
                            </button>
                        </div>
                    </div>

                    {/* "Need to announce something?" Broadcast Card matching Figma Screenshot 1 */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#6852F6] to-[#4F39E3] text-white shadow-xl relative overflow-hidden">
                        {/* Soft background glow circles */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
                        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-black/10 blur-lg pointer-events-none"></div>

                        <div className="relative z-10 space-y-4">
                            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
                                📢
                            </div>

                            <div>
                                <h3 className="text-lg font-extrabold tracking-tight">
                                    Need to announce something?
                                </h3>
                                <p className="text-xs text-purple-100 mt-1.5 leading-relaxed">
                                    Send a broadcast message to all participants of your active hackathons.
                                </p>
                            </div>

                            <div>
                                <button
                                    onClick={() => setIsBroadcastOpen(true)}
                                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-purple-50 text-[#6852F6] text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
                                >
                                    Send Broadcast
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Quick Broadcast Modal */}
            {isBroadcastOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] dark:bg-[#7C65F6]/20 text-[#7C65F6] flex items-center justify-center text-lg">
                                    📢
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Event Broadcast</h3>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Push notice to registered participants</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBroadcastOpen(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                    Target Hackathon
                                </label>
                                <select
                                    value={broadcastTarget}
                                    onChange={(e) => setBroadcastTarget(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6] transition-colors"
                                >
                                    <option value="all">All Active Hackathons</option>
                                    {activeHackathons.map(h => (
                                        <option key={h.id} value={h.id}>
                                            {h.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                    Broadcast Title
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Round 1 Judging Schedule Announced"
                                    value={broadcastTitle}
                                    onChange={(e) => setBroadcastTitle(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#7C65F6] transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                    Urgency Level
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setBroadcastUrgency('normal')}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            broadcastUrgency === 'normal'
                                                ? 'bg-[#EDE9FE] dark:bg-purple-900/30 border-[#7C65F6] text-[#7C65F6]'
                                                : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400'
                                        }`}
                                    >
                                        Standard Notice
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBroadcastUrgency('high')}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            broadcastUrgency === 'high'
                                                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-600 dark:text-rose-400'
                                                : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400'
                                        }`}
                                    >
                                        Urgent / Critical
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                    Message Content
                                </label>
                                <textarea
                                    rows="4"
                                    placeholder="Write your announcement message here..."
                                    value={broadcastMessageText}
                                    onChange={(e) => setBroadcastMessageText(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#7C65F6] transition-colors resize-none"
                                    required
                                ></textarea>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsBroadcastOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSendingBroadcast}
                                    className="px-5 py-2 rounded-xl bg-[#7C65F6] hover:bg-[#6852F6] text-white text-xs font-bold shadow-md shadow-[#7C65F6]/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                                >
                                    {isSendingBroadcast ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                            </svg>
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <span>Send Broadcast</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizerDashboard;
