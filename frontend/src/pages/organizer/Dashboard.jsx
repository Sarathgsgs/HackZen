import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Rocket, 
    Users, 
    FileText, 
    Shield, 
    Search, 
    MoreVertical, 
    Megaphone, 
    Download, 
    X,
    Calendar,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
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

export default function OrganizerDashboard() {
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
            
            // Core 4 Stats matching Figma screenshot
            const rawStats = data.stats || [];
            const activeHackathonsCount = data.raw?.totalHackathons ?? 3;
            const totalRegistrationsCount = data.raw?.totalParticipants ?? 1240;
            const submissionsCount = data.raw?.totalSubmissions ?? 458;
            const mentorsCount = data.raw?.stats?.find(s => s.id === 'mentorsJudges')?.value ?? 86;

            setStats([
                {
                    id: 'active_hackathons',
                    title: 'ACTIVE HACKATHONS',
                    value: activeHackathonsCount,
                    icon: Rocket,
                    color: 'text-[#7C65F6] dark:text-purple-400',
                    bg: 'bg-purple-50 dark:bg-purple-950/40',
                },
                {
                    id: 'total_registrations',
                    title: 'TOTAL REGISTRATIONS',
                    value: totalRegistrationsCount,
                    icon: Users,
                    color: 'text-blue-600 dark:text-blue-400',
                    bg: 'bg-blue-50 dark:bg-blue-950/40',
                },
                {
                    id: 'submissions',
                    title: 'SUBMISSIONS',
                    value: submissionsCount,
                    icon: FileText,
                    color: 'text-[#7C65F6] dark:text-purple-400',
                    bg: 'bg-purple-50 dark:bg-purple-950/40',
                },
                {
                    id: 'mentors_judges',
                    title: 'MENTORS & JUDGES',
                    value: mentorsCount,
                    icon: Shield,
                    color: 'text-[#7C65F6] dark:text-purple-400',
                    bg: 'bg-purple-50 dark:bg-purple-950/40',
                }
            ]);

            // Table of Active Hackathons
            const loadedHackathons = (data.activeHackathons && data.activeHackathons.length > 0)
                ? data.activeHackathons
                : [
                    { id: 'h1', title: 'Global Fintech Hack', participants: '342 Participants', status: 'Active', timeline: 'Oct 12 - Oct 15' },
                    { id: 'h2', title: 'Eco-Innovation Challenge', participants: '128 Participants', status: 'Pending Review', timeline: 'Nov 01 - Nov 05' },
                    { id: 'h3', title: 'AI for Good 2024', participants: '85 Participants', status: 'Approved', timeline: 'Nov 20 - Nov 22' },
                ];
            setActiveHackathons(loadedHackathons);

            // Recent Registrations Feed
            const loadedRegistrations = (data.recentRegistrations && data.recentRegistrations.length > 0)
                ? data.recentRegistrations
                : [
                    { id: 'r1', name: 'Sarah Jenkins', initials: 'SJ', hackathon: 'Global Fintech Hack', roleOrMembers: 'Developer', timeAgo: '2 mins ago' },
                    { id: 'r2', name: 'Team Mavericks', initials: 'TM', hackathon: 'AI for Good', roleOrMembers: '4 Members', timeAgo: '15 mins ago' },
                ];
            setRecentRegistrations(loadedRegistrations);

            // Upcoming Deadlines Feed
            const loadedDeadlines = (data.upcomingDeadlines && data.upcomingDeadlines.length > 0)
                ? data.upcomingDeadlines
                : [
                    { id: 'd1', time: 'Today, 11:59 PM', label: 'Registration Closes', hackathon: 'Global Fintech Hack', color: 'red' },
                    { id: 'd2', time: 'Tomorrow, 9:00 AM', label: 'Judging Commences', hackathon: 'Global Fintech Hack', color: 'purple' },
                    { id: 'd3', time: 'Oct 25, 5:00 PM', label: 'Submission Deadline', hackathon: 'Eco-Innovation Challenge', color: 'gray' },
                ];
            setUpcomingDeadlines(loadedDeadlines);
        } catch (error) {
            console.error("Failed to load organizer dashboard data:", error);
            showToast("Unable to load live dashboard data. Displaying cached view.", "error");
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

    // Status Pill Formatter matching Figma
    const getStatusBadge = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('active') || s.includes('live')) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
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

            {/* Header Section matching Figma Screenshot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
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
                        className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#111625] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                        title="Download CSV breakdown of events and metrics"
                    >
                        {isExporting ? (
                            <svg className="w-4 h-4 animate-spin text-[#5B45D9]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                        ) : (
                            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        )}
                        <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
                    </button>
                </div>
            </div>

            {/* 4 Metric Cards Grid matching Figma screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat) => {
                    const IconComponent = stat.icon;
                    return (
                        <div 
                            key={stat.id} 
                            className="p-5 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
                                    {stat.title}
                                </span>
                                <div className={`w-9 h-9 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                    <IconComponent className="w-4 h-4" />
                                </div>
                            </div>

                            <div className="mt-2.5">
                                <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    <AnimatedStat value={stat.value} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Responsive 2-Column Grid: Left Column (Table & Registrations), Right Column (Deadlines & Announcement) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Active Hackathons Table & Recent Registrations */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Active Hackathons Table Card */}
                    <div className="rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                Active Hackathons
                            </h2>
                            <Link
                                to="/organizer/my-hackathons"
                                className="text-xs font-semibold text-[#5B45D9] dark:text-purple-400 hover:underline transition-colors"
                            >
                                View All
                            </Link>
                        </div>

                        {/* Responsive Table matching Figma layout */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                        <th className="py-3.5 px-6 text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
                                            Event Name
                                        </th>
                                        <th className="py-3.5 px-4 text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="py-3.5 px-4 text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
                                            Timeline
                                        </th>
                                        <th className="py-3.5 px-6 text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:border-white/5">
                                    {activeHackathons.length === 0 ? (
                                        <tr><td colSpan={4} className="py-8 text-center text-xs text-slate-400">No hackathons are available.</td></tr>
                                    ) : activeHackathons.map((event) => (
                                        <tr 
                                            key={event.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                                        >
                                            <td className="py-4 px-6">
                                                <div 
                                                    onClick={() => navigate(`/organizer/manage-hackathon/${event.id}`)}
                                                    className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-[#5B45D9] transition-colors cursor-pointer"
                                                >
                                                    {event.title}
                                                </div>
                                                <div className="text-xs text-slate-400 dark:text-gray-400 mt-0.5">
                                                    {event.participants}
                                                </div>
                                            </td>

                                            <td className="py-4 px-4 whitespace-nowrap">
                                                {getStatusBadge(event.status)}
                                            </td>

                                            <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-gray-300 font-medium">
                                                {event.timeline}
                                            </td>

                                            <td className="py-4 px-6 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => navigate(`/organizer/manage-hackathon/${event.id}`)}
                                                    className="p-1.5 rounded-lg text-[#5B45D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer inline-flex items-center justify-center"
                                                    title="Inspect Event"
                                                    aria-label="Inspect Event"
                                                >
                                                    <Search className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Registrations Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                Recent Registrations
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {recentRegistrations.length === 0 ? (
                                <p className="py-6 text-center text-xs text-slate-400">No recent registrations.</p>
                            ) : recentRegistrations.map((reg, idx) => {
                                const avatarBg = idx === 0 
                                    ? 'bg-[#EDE9FE] text-[#5B45D9] dark:bg-purple-950/50 dark:text-purple-300' 
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';

                                return (
                                    <div key={reg.id || idx} className="flex items-center justify-between gap-3 py-1">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${avatarBg}`}>
                                                {reg.initials || reg.name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {reg.name}
                                                </div>
                                                <div className="text-xs text-slate-400 dark:text-gray-400 truncate mt-0.5">
                                                    {reg.hackathon} • {reg.roleOrMembers}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-400 dark:text-gray-500 font-normal shrink-0">
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
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                Upcoming Deadlines
                            </h2>
                            <button 
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                                aria-label="Deadline Options"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {upcomingDeadlines.length === 0 ? (
                                <p className="py-6 text-center text-xs text-slate-400">No upcoming deadlines.</p>
                            ) : upcomingDeadlines.map((dl, idx) => {
                                const dotColor = dl.color === 'red'
                                    ? 'bg-rose-500'
                                    : dl.color === 'purple'
                                    ? 'bg-[#5B45D9]'
                                    : 'bg-slate-300 dark:bg-slate-600';

                                const timeColor = dl.color === 'red'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : dl.color === 'purple'
                                    ? 'text-[#5B45D9] dark:text-purple-300'
                                    : 'text-slate-500 dark:text-slate-400';

                                return (
                                    <div key={dl.id || idx} className="flex items-start gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${dotColor}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-xs font-bold ${timeColor}`}>
                                                {dl.time}
                                            </div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                                                {dl.label}
                                            </div>
                                            <div className="text-xs text-slate-400 dark:text-gray-400 mt-0.5 truncate">
                                                {dl.hackathon}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 pt-2">
                            <button
                                onClick={() => navigate('/organizer/edit-timeline')}
                                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#5B45D9]/50 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:text-[#5B45D9] transition-all cursor-pointer text-center"
                            >
                                View Full Calendar
                            </button>
                        </div>
                    </div>

                    {/* "Need to announce something?" Broadcast Card matching Figma Screenshot */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#5B45D9] to-[#6852F6] text-white shadow-md relative overflow-hidden">
                        {/* Soft subtle background glow circles */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
                        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-black/10 blur-lg pointer-events-none"></div>

                        <div className="relative z-10 space-y-4">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                                <Megaphone className="w-5 h-5 text-white" />
                            </div>

                            <div>
                                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                                    Need to announce something?
                                </h3>
                                <p className="text-xs text-purple-100/90 mt-1.5 leading-relaxed">
                                    Send a broadcast message to all participants of your active hackathons.
                                </p>
                            </div>

                            <div>
                                <button
                                    onClick={() => setIsBroadcastOpen(true)}
                                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-purple-50 text-[#5B45D9] text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
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
                    <div className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5B45D9] flex items-center justify-center text-lg">
                                    <Megaphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Event Broadcast</h3>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Push notice to registered participants</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBroadcastOpen(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
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
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9] transition-colors"
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
                                    Announcement Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={broadcastTitle}
                                    onChange={(e) => setBroadcastTitle(e.target.value)}
                                    placeholder="e.g., Submission Portal Opens Tonight at 11:59 PM"
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9] transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                    Broadcast Message
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={broadcastMessageText}
                                    onChange={(e) => setBroadcastMessageText(e.target.value)}
                                    placeholder="Enter your announcement details, submission instructions, or judging updates here..."
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9] transition-colors resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-medium">Urgency:</span>
                                    <select
                                        value={broadcastUrgency}
                                        onChange={(e) => setBroadcastUrgency(e.target.value)}
                                        className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="high">Important (High)</option>
                                        <option value="critical">Critical Alert</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsBroadcastOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSendingBroadcast}
                                        className="px-5 py-2 rounded-xl bg-[#5B45D9] hover:bg-[#4E39C4] text-white text-xs font-bold shadow-md transition-all disabled:opacity-60 cursor-pointer flex items-center gap-2"
                                    >
                                        {isSendingBroadcast && (
                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                            </svg>
                                        )}
                                        <span>{isSendingBroadcast ? 'Sending...' : 'Dispatch Broadcast'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
