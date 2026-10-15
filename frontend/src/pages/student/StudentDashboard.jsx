import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardData } from '../../services/student/dashboardApi';

const metricDefinitions = [
    { key: 'registeredHackathons', label: 'REGISTERED HACKATHONS' },
    { key: 'activeTeams', label: 'ACTIVE TEAMS' },
    { key: 'submissions', label: 'SUBMISSIONS' },
    { key: 'certificates', label: 'CERTIFICATES' },
];

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
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600';
    }
    if (normalized.includes('pending') || normalized.includes('in review') || normalized.includes('review')) {
        return 'border-amber-500/20 bg-amber-500/10 text-amber-700';
    }
    if (normalized.includes('rejected') || normalized.includes('declined')) {
        return 'border-rose-500/20 bg-rose-500/10 text-rose-600';
    }
    return 'border-violet-500/20 bg-violet-500/10 text-violet-700';
};

const DashboardSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        <div className="h-12 w-72 rounded-xl bg-[#ece5f5]" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-28 rounded-[18px] border border-[#e6e0f0] bg-white" />
            ))}
        </div>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <div className="space-y-6 rounded-[22px] border border-[#e6e0f0] bg-[#f7f4fb] p-6">
                <div className="h-8 w-52 rounded bg-[#efe9f8]" />
                <div className="h-56 rounded-[18px] bg-white" />
            </div>
            <div className="space-y-6 rounded-[22px] border border-[#e6e0f0] bg-[#f7f4fb] p-6">
                <div className="h-8 w-40 rounded bg-[#efe9f8]" />
                <div className="h-48 rounded-[18px] bg-white" />
            </div>
        </div>
    </div>
);

const MetricCard = ({ label, value }) => (
    <div className="rounded-[18px] border border-[#e6e0f0] bg-[#f9f7fb] p-5 shadow-[0_12px_30px_rgba(76,59,183,0.04)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7a7098]">{label}</div>
        <div className="mt-4 text-[42px] font-bold leading-none tracking-[-0.05em] text-[#4d3bb5]">{value}</div>
    </div>
);

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
    const studentName = dashboard?.student?.name?.split(' ')[0] || 'Student';

    return (
        <div className="min-h-screen bg-[#f3f0f8] px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto max-w-[1400px]">
                {isLoading ? (
                    <DashboardSkeleton />
                ) : error ? (
                    <div className="mx-auto flex min-h-[420px] max-w-lg flex-col items-center justify-center rounded-[22px] border border-red-200 bg-white p-8 text-center shadow-[0_12px_35px_rgba(116,82,196,0.08)]">
                        <h1 className="text-2xl font-bold text-[#1d1a2a]">Dashboard unavailable</h1>
                        <p className="mt-3 text-sm text-slate-500">{error}</p>
                        <button onClick={loadDashboard} className="mt-6 rounded-xl bg-[#5c46c7] px-5 py-3 font-semibold text-white transition hover:bg-[#4c3bb7]">Try again</button>
                    </div>
                ) : (
                    <>
                        <header className="mb-8">
                            <h1 className="text-[40px] font-bold tracking-[-0.05em] text-[#1d1a2a] md:text-[52px]">
                                Welcome back, <span className="text-[#4f3ec7]">{studentName}</span>!
                            </h1>
                        </header>

                        <section aria-label="Dashboard metrics" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                            {metricDefinitions.map((metric) => (
                                <MetricCard
                                    key={metric.key}
                                    label={metric.label}
                                    value={dashboard?.metrics?.[metric.key] ?? '—'}
                                />
                            ))}
                        </section>

                        <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.92fr)]">
                            <div className="rounded-[22px] border border-[#e5dff0] bg-[#f8f6fb] p-5 shadow-[0_10px_28px_rgba(76,59,183,0.05)] sm:p-6">
                                <div className="mb-6 flex items-center justify-between gap-3">
                                    <h2 className="text-[14px] font-bold uppercase tracking-[0.18em] text-[#6f5da7]">My Hackathons</h2>
                                </div>

                                {registeredHackathons.length === 0 ? (
                                    <div className="rounded-[18px] border border-dashed border-[#d6d0e9] bg-white p-8 text-center">
                                        <h3 className="text-lg font-bold text-[#1d1a2a]">No registered hackathons yet</h3>
                                        <p className="mt-2 text-sm text-slate-500">Explore upcoming events and register for a hackathon to see it here.</p>
                                        <button onClick={() => navigate('/student/hackathons')} className="mt-5 rounded-xl bg-[#5c46c7] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4c3bb7]">Explore Hackathons</button>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
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
                                                <article key={hackathon.id} className="rounded-[20px] border border-[#e3dff0] bg-white p-4 shadow-[0_8px_20px_rgba(33,22,58,0.03)] sm:p-5">
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                                        <div className="aspect-video w-full shrink-0 overflow-hidden rounded-[16px] border border-[#eae3f6] bg-[#eeebf6] sm:w-[142px]">
                                                            <img
                                                                src={hackathon.posterUrl || fallbackBanner}
                                                                alt={`${hackathon.title || 'Hackathon'} banner`}
                                                                onError={hackathon.posterUrl ? (event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackBanner; } : undefined}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                <div className="min-w-0">
                                                                    <h3 className="truncate text-[18px] font-bold text-[#1d1a2a]">{hackathon.title}</h3>
                                                                    <p className="mt-1 text-sm text-[#5f5a6d]">Team: {teamName}</p>
                                                                </div>
                                                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusClasses(status)}`}>
                                                                    {formatStatus(status)}
                                                                </span>
                                                            </div>

                                                            <div className="mt-5">
                                                                <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-[#6a647c]">
                                                                    <span>Progress</span>
                                                                    <span className="font-semibold text-[#3b2d63]">{progressValue === null ? 'Unavailable' : `${progressValue}%`}</span>
                                                                </div>
                                                                <div className="h-2.5 overflow-hidden rounded-full bg-[#efe9fb]">
                                                                    {progressValue !== null && <div className="h-full rounded-full bg-gradient-to-r from-[#4b3bc0] to-[#6f5bd4]" style={{ width: `${progressValue}%` }} />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-end">
                                                        <button
                                                            onClick={() => navigate(workspaceRoute)}
                                                            className="rounded-xl bg-[#5c46c7] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c3bb7]"
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

                            <aside className="rounded-[22px] border border-[#e5dff0] bg-[#f8f6fb] p-5 shadow-[0_10px_28px_rgba(76,59,183,0.05)] sm:p-6">
                                <div className="mb-6 flex items-center justify-between gap-3">
                                    <h2 className="text-[14px] font-bold uppercase tracking-[0.18em] text-[#6f5da7]">Upcoming</h2>
                                    <button onClick={() => navigate('/student/hackathons')} className="text-sm font-semibold text-[#5c46c7] transition hover:text-[#4331a6]">See all</button>
                                </div>

                                {upcomingHackathons.length === 0 ? (
                                    <div className="rounded-[18px] border border-dashed border-[#d6d0e9] bg-white p-8 text-center">
                                        <p className="text-sm text-slate-500">There are no upcoming hackathons available right now.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {upcomingHackathons.map((hackathon) => {
                                            const prize = prizePool(hackathon.prizes);
                                            return (
                                                <article key={hackathon.id} className="rounded-[18px] border border-[#e3dff2] bg-white p-4 shadow-[0_8px_20px_rgba(33,22,58,0.03)]">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <h3 className="text-[18px] font-bold leading-tight text-[#1d1a2a]">{hackathon.title}</h3>
                                                            <p className="mt-2 text-sm text-[#5f5a6d]">{formatDateRange(hackathon.hackathonStart, hackathon.hackathonEnd)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#f1ecf9] pt-4">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7b748d]">Prize Pool</p>
                                                            <p className="mt-1 text-base font-bold text-[#3d2d7d]">{prize || 'Not announced'}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate(`/student/hackathons/${hackathon.id}/register`)}
                                                            className="rounded-xl bg-[#5c46c7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c3bb7]"
                                                        >
                                                            Register Now
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </aside>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
