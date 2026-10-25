import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchAllHackathons } from '../../api/hackathonApi';
import { fetchMyApplications } from '../../api/applicationApi';

const formatDate = (value) => {
    if (!value) return 'Date to be announced';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Date to be announced'
        : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const dateRange = (start, end) => `${formatDate(start)} – ${formatDate(end)}`;

const modeFor = (location) => {
    if (!location) return 'Mode not specified';
    const normalized = location.toLowerCase();
    if (normalized.includes('online') && normalized.length > 'online'.length) return `Hybrid (${location})`;
    if (normalized.includes('online') || normalized.includes('virtual')) return 'Online';
    return `In-person (${location})`;
};

const isUpcomingHackathon = (hackathon) => {
    const status = `${hackathon.status || ''}`.toLowerCase();
    if (['draft', 'completed', 'results announced'].includes(status)) {
        return false;
    }

    const hasValidStart = hackathon.hackathonStart && !Number.isNaN(new Date(hackathon.hackathonStart).getTime());
    if (!hasValidStart) {
        return true;
    }

    const start = new Date(hackathon.hackathonStart);
    const end = new Date(hackathon.hackathonEnd || start);
    const now = new Date();
    return end >= now;
};

const matchesDateFilter = (hackathon, filter) => {
    if (!isUpcomingHackathon(hackathon)) {
        return false;
    }

    if (filter === 'anytime') return true;
    const start = new Date(hackathon.hackathonStart);
    if (Number.isNaN(start.getTime())) return false;
    const now = new Date();
    const end = new Date(now);
    if (filter === 'this-week') end.setDate(now.getDate() + 7);
    if (filter === 'this-month') end.setMonth(now.getMonth() + 1);
    return start >= now && start <= end;
};

const statusLabel = (hackathon, registered) => {
    if (registered) return 'Registered';
    return hackathon.status || 'Available';
};

const hackathonBanners = [
    { name: 'ai', src: '/assets/hackathon-ai.svg', keywords: ['artificial intelligence', 'machine learning', 'aiml', 'genai', 'llm', 'data science'] },
    { name: 'cyber', src: '/assets/hackathon-cyber.svg', keywords: ['cyber', 'security', 'privacy', 'devsecops'] },
    { name: 'robotics', src: '/assets/hackathon-robotics.svg', keywords: ['robot', 'iot', 'internet of things', 'hardware'] },
    { name: 'climate', src: '/assets/hackathon-climate.svg', keywords: ['sustain', 'climate', 'environment', 'energy', 'green'] },
    { name: 'web', src: '/assets/hackathon-web.svg', keywords: ['web', 'blockchain', 'cloud', 'mobile', 'gaming', 'finance'] },
    { name: 'health', src: '/assets/hackathon-health.svg', keywords: ['health', 'medical', 'social good', 'education'] },
];

const bannerForHackathon = (hackathon, id) => {
    const themeText = (Array.isArray(hackathon.themes) ? hackathon.themes : [])
        .join(' ')
        .toLowerCase();
    const themedBanner = hackathonBanners.find(({ name, keywords }) =>
        (name === 'ai' && /\bai\b/.test(themeText))
        || keywords.some((keyword) => themeText.includes(keyword))
    );
    if (themedBanner) return themedBanner.src;

    const stableKey = String(id || hackathon.title || 'hackathon');
    const stableHash = [...stableKey].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
    return hackathonBanners[stableHash % hackathonBanners.length].src;
};

const Select = ({ label, value, onChange, children }) => (
    <label className="relative block min-w-0">
        <span className="sr-only">{label}</span>
        <select
            value={value}
            onChange={onChange}
            className="h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 px-3.5 pr-9 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
            {children}
        </select>
        <svg className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
        </svg>
    </label>
);

const StudentHackathons = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [hackathons, setHackathons] = useState([]);
    const [registeredIds, setRegisteredIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [dateFilter, setDateFilter] = useState('anytime');
    const [mode, setMode] = useState('all');
    const [sort, setSort] = useState('newest');
    const [selectedHackathon, setSelectedHackathon] = useState(null);

    useEffect(() => {
        const selectedId = location.state?.hackathonId;
        if (selectedId) {
            navigate(`/student/hackathons/${encodeURIComponent(selectedId)}`, { replace: true, state: null });
        }
    }, [location.state, navigate]);

    const loadHackathons = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [events, applications] = await Promise.all([
                fetchAllHackathons(),
                fetchMyApplications().catch(() => []),
            ]);
            setHackathons(Array.isArray(events) ? events : []);
            setRegisteredIds(new Set((Array.isArray(applications) ? applications : []).map((application) => application.hackathonId)));
        } catch (requestError) {
            console.error('Failed to load student hackathons:', requestError);
            setError('We could not load hackathons right now. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadHackathons(); }, []);

    const categories = useMemo(() => [...new Set(hackathons.flatMap((hackathon) => hackathon.themes || []))].sort(), [hackathons]);
    const visibleHackathons = useMemo(() => {
        const query = search.trim().toLowerCase();
        const result = hackathons.filter((hackathon) => {
            const titleAndDescription = `${hackathon.title || ''} ${hackathon.description || ''}`.toLowerCase();
            const hackathonMode = modeFor(hackathon.location);
            return (!query || titleAndDescription.includes(query))
                && (category === 'all' || (hackathon.themes || []).includes(category))
                && matchesDateFilter(hackathon, dateFilter)
                && (mode === 'all' || hackathonMode.toLowerCase().startsWith(mode));
        });
        return result.sort((first, second) => {
            if (sort === 'popular') return (second.participants_count || 0) - (first.participants_count || 0);
            if (sort === 'soonest') return new Date(first.hackathonStart) - new Date(second.hackathonStart);
            return new Date(second.createdAt) - new Date(first.createdAt);
        });
    }, [hackathons, search, category, dateFilter, mode, sort]);

    if (selectedHackathon) {
        const id = selectedHackathon.id || selectedHackathon._id;
        const registered = registeredIds.has(id);
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-navy-950 px-4 py-6 md:px-8 text-slate-900 dark:text-white transition-colors duration-200">
                <div className="mx-auto max-w-5xl space-y-6">
                    <button
                        onClick={() => setSelectedHackathon(null)}
                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                        <span aria-hidden="true">←</span> Back to Hackathons
                    </button>
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-xs">
                        <div className="relative h-64 bg-slate-100 dark:bg-navy-950 sm:h-80">
                            {selectedHackathon.posterUrl ? (
                                <img src={selectedHackathon.posterUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center px-8 text-center text-2xl font-bold text-slate-400 dark:text-slate-500">
                                    {selectedHackathon.title}
                                </div>
                            )}
                        </div>
                        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-8">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    {selectedHackathon.title}
                                </h1>
                                {(selectedHackathon.organizerName || selectedHackathon.organizer_name) && (
                                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                                        by {selectedHackathon.organizerName || selectedHackathon.organizer_name}
                                    </p>
                                )}
                                <h2 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">About this hackathon</h2>
                                <p className="mt-2.5 whitespace-pre-wrap leading-relaxed text-sm text-slate-600 dark:text-slate-300">
                                    {selectedHackathon.description || 'No description has been provided yet.'}
                                </p>
                            </div>
                            <aside className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-navy-950/60 p-5">
                                <dl className="space-y-4 text-xs sm:text-sm">
                                    <div>
                                        <dt className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">Schedule</dt>
                                        <dd className="mt-1 font-bold text-slate-900 dark:text-white">{dateRange(selectedHackathon.hackathonStart, selectedHackathon.hackathonEnd)}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">Mode</dt>
                                        <dd className="mt-1 font-bold text-slate-900 dark:text-white">{modeFor(selectedHackathon.location)}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">Team size</dt>
                                        <dd className="mt-1 font-bold text-slate-900 dark:text-white">{selectedHackathon.minTeamSize || 1} – {selectedHackathon.maxTeamSize || 1} members</dd>
                                    </div>
                                </dl>
                                <button
                                    onClick={() => registered ? navigate('/student/dashboard') : navigate(`/student/hackathons/${id}/register`)}
                                    className="mt-6 w-full rounded-xl bg-[#2563eb] py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95 cursor-pointer"
                                >
                                    {registered ? 'Go to Dashboard' : 'Register Now'}
                                </button>
                            </aside>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-navy-950 px-4 py-6 md:px-8 text-slate-900 dark:text-white transition-colors duration-200">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* 1. Header (Admin Standard) */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            Explore Hackathons
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Discover cutting-edge hackathons, register teams, and build innovative solutions.
                        </p>
                    </div>
                </header>

                {/* 2. Standardized Search & Filter Bar */}
                <section aria-label="Hackathon filters" className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-4 shadow-xs">
                    <div className="grid gap-3 xl:grid-cols-[minmax(260px,2.6fr)_repeat(4,minmax(140px,.65fr))]">
                        <label className="relative block">
                            <span className="sr-only">Search hackathons</span>
                            <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m21 21-4.35-4.35m1.1-5.4a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                            </svg>
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by name or description..."
                                className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 pl-10 pr-4 text-xs sm:text-sm text-slate-800 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20"
                            />
                        </label>
                        <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
                            <option value="all">Category: All</option>
                            {categories.map((item) => <option key={item} value={item}>Category: {item}</option>)}
                        </Select>
                        <Select label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                            <option value="anytime">Date: Anytime</option>
                            <option value="this-week">Date: This week</option>
                            <option value="this-month">Date: This month</option>
                        </Select>
                        <Select label="Mode" value={mode} onChange={(event) => setMode(event.target.value)}>
                            <option value="all">Mode: All</option>
                            <option value="online">Mode: Online</option>
                            <option value="in-person">Mode: In-person</option>
                            <option value="hybrid">Mode: Hybrid</option>
                        </Select>
                        <Select label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                            <option value="newest">Sort: Newest</option>
                            <option value="soonest">Sort: Soonest</option>
                            <option value="popular">Sort: Popular</option>
                        </Select>
                    </div>
                </section>

                {/* 3. Content Body */}
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {[0, 1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="h-[460px] animate-pulse rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-navy-900 p-8 text-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Hackathons unavailable</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
                        <button onClick={loadHackathons} className="mt-6 rounded-xl bg-[#2563eb] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95">Try again</button>
                    </div>
                ) : visibleHackathons.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 p-10 text-center">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">No hackathons found</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try changing your search keywords or filter criteria.</p>
                    </div>
                ) : (
                    <section aria-label="Available hackathons" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {visibleHackathons.map((hackathon) => {
                            const id = hackathon.id || hackathon._id;
                            const registered = registeredIds.has(id);
                            const poster = hackathon.posterUrl;
                            const fallbackBanner = bannerForHackathon(hackathon, id);

                            return (
                                <article
                                    key={id}
                                    className="flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-xs transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/50"
                                >
                                    <div className="relative aspect-video w-full shrink-0 bg-slate-100 dark:bg-navy-950">
                                        <img
                                            src={poster || fallbackBanner}
                                            alt={`${hackathon.title} banner`}
                                            onError={poster ? (event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackBanner; } : undefined}
                                            className="h-full w-full object-cover"
                                        />
                                        <span className={`absolute right-3.5 top-3.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                                            registered
                                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 backdrop-blur-md bg-white/90 dark:bg-navy-900/90'
                                                : 'bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 backdrop-blur-md bg-white/90 dark:bg-navy-900/90'
                                        }`}>
                                            {statusLabel(hackathon, registered)}
                                        </span>
                                    </div>

                                    <div className="flex flex-1 flex-col p-5">
                                        <h2 className="text-base sm:text-lg font-bold leading-snug tracking-tight text-slate-900 dark:text-white line-clamp-2">
                                            {hackathon.title}
                                        </h2>
                                        {(hackathon.organizerName || hackathon.organizer_name) && (
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                by {hackathon.organizerName || hackathon.organizer_name}
                                            </p>
                                        )}

                                        <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                            <p className="flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>{dateRange(hackathon.hackathonStart, hackathon.hackathonEnd)}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span>{modeFor(hackathon.location)}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span>Team: {hackathon.minTeamSize || 1} – {hackathon.maxTeamSize || 1} Members</span>
                                            </p>
                                        </div>

                                        <div className="mt-auto pt-5 border-t border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                                            <button
                                                onClick={() => navigate(`/student/hackathons/${encodeURIComponent(id)}`)}
                                                className={`flex-1 inline-flex items-center justify-center rounded-xl py-2 px-3 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                                                    registered
                                                        ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                                                        : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700'
                                                }`}
                                            >
                                                View Details
                                            </button>
                                            {!registered && (
                                                <button
                                                    onClick={() => navigate(`/student/hackathons/${encodeURIComponent(id)}/register`)}
                                                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-[#2563eb] py-2 px-3 text-xs font-bold text-white shadow-xs hover:bg-[#1d4ed8] transition-all active:scale-95 cursor-pointer"
                                                >
                                                    Register Now
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>
        </div>
    );
};

export default StudentHackathons;
