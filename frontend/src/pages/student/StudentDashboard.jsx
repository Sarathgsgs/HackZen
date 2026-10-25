import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardData } from '../../services/student/dashboardApi';

const metricDefinitions = [
    { key: 'registeredHackathons', label: 'Registered Hackathons' },
    { key: 'activeTeams', label: 'Active Teams' },
    { key: 'submissions', label: 'Submissions' },
    { key: 'certificates', label: 'Certificates' },
];

const metricIcons = {
    registeredHackathons: (
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
    ),
    activeTeams: (
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    ),
    submissions: (
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    certificates: (
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    ),
};

const formatDate = (value) => {
    if (!value) return 'Date to be announced';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Date to be announced'
        : new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

const formatDateRange = (start, end) => {
    if (!start && !end) return 'Dates to be announced';
    if (!end) return formatDate(start);
    if (!start) return formatDate(end);
    return `${formatDate(start)} – ${formatDate(end)}`;
};

const formatStatus = (status) => {
    if (!status) return 'Registered';
    return status
        .split(/[-_ ]/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const prizePool = (prizes) => {
    if (!Array.isArray(prizes) || prizes.length === 0) return null;

    const values = prizes
        .map((prize) => (typeof prize === 'object' ? prize.amount ?? prize.value ?? prize.prize ?? null : prize))
        .filter((value) => value !== null && value !== undefined && value !== '');

    return values.length ? values.join(' · ') : null;
};

const dashboardHackathonBanners = [
    { name: 'ai', src: '/assets/hackathon-ai.svg', keywords: ['artificial intelligence', 'machine learning', 'aiml', 'genai', 'llm', 'data science'] },
    { name: 'cyber', src: '/assets/hackathon-cyber.svg', keywords: ['cyber', 'security', 'privacy', 'devsecops'] },
    { name: 'robotics', src: '/assets/hackathon-robotics.svg', keywords: ['robot', 'iot', 'internet of things', 'hardware'] },
    { name: 'climate', src: '/assets/hackathon-climate.svg', keywords: ['sustain', 'climate', 'environment', 'energy', 'green'] },
    { name: 'web', src: '/assets/hackathon-web.svg', keywords: ['web', 'blockchain', 'cloud', 'mobile', 'gaming', 'finance'] },
    { name: 'health', src: '/assets/hackathon-health.svg', keywords: ['health', 'medical', 'social good', 'education'] },
];

const bannerForDashboardHackathon = (hackathon) => {
    const themeText = (Array.isArray(hackathon.themes) ? hackathon.themes : []).join(' ').toLowerCase();
    const themedBanner = dashboardHackathonBanners.find(({ name, keywords }) =>
        (name === 'ai' && /\bai\b/.test(themeText))
        || keywords.some((keyword) => themeText.includes(keyword))
    );
    if (themedBanner) return themedBanner.src;

    const stableKey = String(hackathon.id || hackathon._id || hackathon.title || 'hackathon');
    const stableHash = [...stableKey].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
    return dashboardHackathonBanners[stableHash % dashboardHackathonBanners.length].src;
};

const getStatusClasses = (status) => {
    const normalized = `${status || ''}`.toLowerCase();
    if (normalized.includes('accepted') || normalized.includes('active') || normalized.includes('approved')) {
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    }
    if (normalized.includes('pending') || normalized.includes('in review') || normalized.includes('review')) {
        return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400';
    }
    if (normalized.includes('rejected') || normalized.includes('declined')) {
        return 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400';
    }
    return 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400';
};

const DashboardSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-slate-200 dark:bg-navy-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-28 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900" />
            ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
            <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-6">
                <div className="h-6 w-40 rounded bg-slate-200 dark:bg-navy-800" />
                <div className="h-56 rounded-xl bg-slate-100 dark:bg-navy-950" />
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-6">
                <div className="h-6 w-36 rounded bg-slate-200 dark:bg-navy-800" />
                <div className="h-48 rounded-xl bg-slate-100 dark:bg-navy-950" />
            </div>
        </div>
    </div>
);

const MetricCard = ({ label, value, metricKey }) => (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                {metricIcons[metricKey]}
            </div>
        </div>
        <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">{value}</div>
        </div>
    </div>
);

const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recently';
    const diffSec = Math.floor((new Date() - date) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
};

const getActivityBadge = (type) => {
    switch (type?.toLowerCase()) {
        case 'registration':
            return { icon: '📝', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
        case 'submission':
            return { icon: '🚀', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
        case 'certificate':
            return { icon: '🏆', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
        case 'team':
            return { icon: '👥', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
        default:
            return { icon: '⚡', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    }
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            setDashboard(await fetchDashboardData());
        } catch (requestError) {
            console.error('Unable to load student dashboard:', requestError);
            setError('We could not load your dashboard. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
        const refreshDashboard = () => loadDashboard();
        window.addEventListener('user-update', refreshDashboard);
        return () => window.removeEventListener('user-update', refreshDashboard);
    }, [loadDashboard]);

    const registeredHackathons = dashboard?.registeredHackathons ?? [];
    const upcomingHackathons = dashboard?.upcomingHackathons ?? [];
    const recentActivity = dashboard?.recentActivity ?? [];
    const studentName = dashboard?.student?.name?.split(' ')[0] || 'Student';

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-navy-950 px-4 py-6 md:px-8 text-slate-900 dark:text-white transition-colors duration-200">
            <div className="mx-auto max-w-7xl space-y-6">
                {isLoading ? (
                    <DashboardSkeleton />
                ) : error ? (
                    <div className="mx-auto flex min-h-[380px] max-w-lg flex-col items-center justify-center rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-navy-900 p-8 text-center shadow-xs">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard unavailable</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
                        <button
                            onClick={loadDashboard}
                            className="mt-6 rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <>
                        {/* 1. Page Header (Admin Benchmark) */}
                        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                                    Welcome back, <span className="text-[#2563eb] dark:text-blue-400">{studentName}</span>!
                                </h1>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Track your active hackathon registrations, squad milestones, submissions, and credentials.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => navigate('/student/hackathons')}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95 cursor-pointer"
                                >
                                    Explore Hackathons
                                </button>
                            </div>
                        </header>

                        {/* 2. KPI Metrics Grid (Admin Benchmark) */}
                        <section aria-label="Dashboard metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {metricDefinitions.map((metric) => (
                                <MetricCard
                                    key={metric.key}
                                    metricKey={metric.key}
                                    label={metric.label}
                                    value={dashboard?.metrics?.[metric.key] ?? '0'}
                                />
                            ))}
                        </section>

                        {/* 3. Main Workspace Split: My Hackathons & Feed */}
                        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
                            {/* My Hackathons */}
                            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                                <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">My Hackathons</h2>
                                    <span className="text-xs font-semibold text-slate-400">{registeredHackathons.length} Enrolled</span>
                                </div>

                                {registeredHackathons.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-navy-950/40 p-8 text-center">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">No registered hackathons yet</h3>
                                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Explore upcoming events and register for a hackathon to see it here.</p>
                                        <button
                                            onClick={() => navigate('/student/hackathons')}
                                            className="mt-4 rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95"
                                        >
                                            Explore Hackathons
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {registeredHackathons.map((hackathon) => {
                                            const rawProgress = hackathon.team?.progress?.percentage ?? hackathon.progress;
                                            const progressValue = rawProgress !== null && rawProgress !== undefined && Number.isFinite(Number(rawProgress))
                                                ? Math.max(0, Math.min(100, Number(rawProgress)))
                                                : null;
                                            const status = hackathon.team?.progress?.status || hackathon.status || hackathon.applicationStatus || 'Registered';
                                            const teamName = hackathon.team?.name || 'No team assigned';
                                            const workspaceRoute = hackathon.team?.id ? `/student/teams/${hackathon.team.id}/workspace` : `/student/hackathons/${hackathon.id}`;
                                            const fallbackBanner = bannerForDashboardHackathon(hackathon);

                                            return (
                                                <article
                                                    key={hackathon.id}
                                                    className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-navy-950/40 p-4 sm:p-5 transition-all hover:border-blue-300 dark:hover:border-blue-700/50"
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                                        <div className="aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-navy-900 sm:w-[140px]">
                                                            <img
                                                                src={hackathon.posterUrl || fallbackBanner}
                                                                alt={`${hackathon.title || 'Hackathon'} banner`}
                                                                onError={hackathon.posterUrl ? (event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackBanner; } : undefined}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                <div className="min-w-0">
                                                                    <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{hackathon.title}</h3>
                                                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Team: <span className="font-semibold text-slate-700 dark:text-slate-300">{teamName}</span></p>
                                                                </div>
                                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusClasses(status)}`}>
                                                                    {formatStatus(status)}
                                                                </span>
                                                            </div>

                                                            <div className="mt-4">
                                                                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                                                                    <span>Progress</span>
                                                                    <span className="font-bold text-slate-900 dark:text-white">{progressValue === null ? '0%' : `${progressValue}%`}</span>
                                                                </div>
                                                                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800">
                                                                    {progressValue !== null && (
                                                                        <div className="h-full rounded-full bg-[#2563eb] transition-all duration-500" style={{ width: `${progressValue}%` }} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-end border-t border-slate-200/60 dark:border-white/5 pt-3">
                                                        <button
                                                            onClick={() => navigate(workspaceRoute)}
                                                            className="rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95 cursor-pointer"
                                                        >
                                                            View Workspace
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Upcoming Hackathons & Recent Activity */}
                            <div className="space-y-6">
                                {/* Upcoming Hackathons */}
                                <aside className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Upcoming Events</h2>
                                        <button
                                            onClick={() => navigate('/student/hackathons')}
                                            className="text-xs font-bold text-[#2563eb] dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                            See all
                                        </button>
                                    </div>

                                    {upcomingHackathons.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-navy-950/40 p-6 text-center">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">There are no upcoming hackathons available right now.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {upcomingHackathons.map((hackathon) => {
                                                const prize = prizePool(hackathon.prizes);
                                                return (
                                                    <article
                                                        key={hackathon.id}
                                                        className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-navy-950/40 p-3.5 transition-all hover:border-blue-300 dark:hover:border-blue-700/50"
                                                    >
                                                        <h3 className="text-sm font-bold leading-tight text-slate-900 dark:text-white truncate">{hackathon.title}</h3>
                                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateRange(hackathon.hackathonStart, hackathon.hackathonEnd)}</p>

                                                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200/60 dark:border-white/5 pt-2.5">
                                                            <div>
                                                                 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prize Pool</p>
                                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{prize || 'TBA'}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => navigate(`/student/hackathons/${hackathon.id}/register`)}
                                                                className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95 cursor-pointer"
                                                            >
                                                                Register
                                                            </button>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </aside>

                                {/* Live Activity Feed */}
                                <aside className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Activity</h2>
                                        <span className="text-[11px] font-medium text-slate-400">Live feed</span>
                                    </div>

                                    {recentActivity.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-navy-950/40 p-6 text-center">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">No recent activity yet. Register for a hackathon or create a team to get started!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {recentActivity.map((activity) => {
                                                const badge = getActivityBadge(activity.type);
                                                return (
                                                    <div
                                                        key={activity.id}
                                                        className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-navy-950/40 p-3 transition-all hover:bg-white dark:hover:bg-navy-800/60"
                                                    >
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${badge.color}`}>
                                                            {badge.icon}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{activity.title}</p>
                                                                <span className="shrink-0 text-[10px] font-medium text-slate-400">
                                                                    {formatRelativeTime(activity.timestamp)}
                                                                </span>
                                                            </div>
                                                            {activity.description && (
                                                                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">{activity.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </aside>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
