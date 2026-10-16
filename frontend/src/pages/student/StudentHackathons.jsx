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
        <select value={value} onChange={onChange} className="h-14 w-full appearance-none rounded-xl border border-[#e2deec] bg-white px-4 pr-10 text-base font-medium text-[#373548] outline-none transition focus:border-[#6046dc] focus:ring-2 focus:ring-[#6046dc]/15">
            {children}
        </select>
        <svg className="pointer-events-none absolute right-4 top-5 h-5 w-5 text-[#777488]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" /></svg>
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
                fetchMyApplications(),
            ]);
            setHackathons(events);
            setRegisteredIds(new Set(applications.map((application) => application.hackathonId)));
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
            <div className="-m-6 min-h-full bg-[#fbf9ff] p-6 text-[#242334] lg:-m-10 lg:p-10">
                <button onClick={() => setSelectedHackathon(null)} className="mb-8 flex items-center gap-2 font-medium text-[#5740d6] transition hover:text-[#4530bd]"><span aria-hidden="true">←</span> Back to Hackathons</button>
                <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[#e5e1ed] bg-white shadow-[0_1px_2px_rgba(31,22,60,0.03)]">
                    <div className="relative h-64 bg-[#eeebf6] sm:h-80">
                        {selectedHackathon.posterUrl ? <img src={selectedHackathon.posterUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-8 text-center text-3xl font-bold text-[#777488]">{selectedHackathon.title}</div>}
                    </div>
                    <div className="grid gap-8 p-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-10">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{selectedHackathon.title}</h1>
                            {selectedHackathon.organizerName || selectedHackathon.organizer_name ? <p className="mt-2 text-[#777488]">by {selectedHackathon.organizerName || selectedHackathon.organizer_name}</p> : null}
                            <h2 className="mt-8 text-xl font-bold">About this hackathon</h2>
                            <p className="mt-3 whitespace-pre-wrap leading-7 text-[#626071]">{selectedHackathon.description || 'No description has been provided yet.'}</p>
                        </div>
                        <aside className="rounded-xl bg-[#f8f6fc] p-6">
                            <dl className="space-y-5 text-sm"><div><dt className="text-[#777488]">Schedule</dt><dd className="mt-1 font-semibold text-[#292738]">{dateRange(selectedHackathon.hackathonStart, selectedHackathon.hackathonEnd)}</dd></div><div><dt className="text-[#777488]">Mode</dt><dd className="mt-1 font-semibold text-[#292738]">{modeFor(selectedHackathon.location)}</dd></div><div><dt className="text-[#777488]">Team size</dt><dd className="mt-1 font-semibold text-[#292738]">{selectedHackathon.minTeamSize || 1} – {selectedHackathon.maxTeamSize || 1} members</dd></div></dl>
                            <button onClick={() => registered ? navigate('/student/dashboard') : navigate(`/student/hackathons/${id}/register`)} className="mt-8 w-full rounded-lg bg-[#5740d6] py-3 font-medium text-white transition hover:bg-[#4530bd]">{registered ? 'Go to Dashboard' : 'Register Now'}</button>
                        </aside>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="-m-6 min-h-full bg-[#fbf9ff] p-6 text-[#242334] lg:-m-10 lg:p-10">
            <header className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Upcoming Hackathons</h1>
                <p className="mt-3 text-lg text-[#777488]">Discover and register for the latest hackathons across various domains.</p>
            </header>

            <section aria-label="Hackathon filters" className="mb-10 rounded-2xl border border-[#e5e1ed] bg-white p-5 shadow-[0_1px_2px_rgba(31,22,60,0.03)]">
                <div className="grid gap-4 xl:grid-cols-[minmax(260px,2.6fr)_repeat(4,minmax(150px,.65fr))]">
                    <label className="relative block"><span className="sr-only">Search hackathons</span><svg className="absolute left-4 top-4 h-6 w-6 text-[#9a98aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="m21 21-4.35-4.35m1.1-5.4a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" /></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or description..." className="h-14 w-full rounded-xl border border-[#e2deec] bg-white pl-12 pr-4 text-base text-[#373548] outline-none transition placeholder:text-[#a3a0b1] focus:border-[#6046dc] focus:ring-2 focus:ring-[#6046dc]/15" /></label>
                    <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Category: All</option>{categories.map((item) => <option key={item} value={item}>Category: {item}</option>)}</Select>
                    <Select label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="anytime">Date: Anytime</option><option value="this-week">Date: This week</option><option value="this-month">Date: This month</option></Select>
                    <Select label="Mode" value={mode} onChange={(event) => setMode(event.target.value)}><option value="all">Mode: All</option><option value="online">Mode: Online</option><option value="in-person">Mode: In-person</option><option value="hybrid">Mode: Hybrid</option></Select>
                    <Select label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Sort: Newest</option><option value="soonest">Sort: Soonest</option><option value="popular">Sort: Popular</option></Select>
                </div>
            </section>

            {isLoading ? (
                <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-[510px] animate-pulse rounded-2xl border border-[#e5e1ed] bg-white" />)}</div>
            ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-white p-10 text-center"><h2 className="text-xl font-bold text-slate-900">Hackathons unavailable</h2><p className="mt-2 text-slate-600">{error}</p><button onClick={loadHackathons} className="mt-6 rounded-lg bg-[#5740d6] px-5 py-3 font-medium text-white hover:bg-[#4530bd]">Try again</button></div>
            ) : visibleHackathons.length === 0 ? (
                <div className="rounded-2xl border border-[#e5e1ed] bg-white p-10 text-center"><h2 className="text-xl font-bold text-slate-900">No hackathons found</h2><p className="mt-2 text-slate-600">Try changing your search or filters.</p></div>
            ) : (
                <section aria-label="Available hackathons" className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                    {visibleHackathons.map((hackathon) => {
                        const id = hackathon.id || hackathon._id;
                        const registered = registeredIds.has(id);
                        const poster = hackathon.posterUrl;
                        const fallbackBanner = bannerForHackathon(hackathon, id);
                        return <article key={id} className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-[#e5e1ed] bg-white shadow-[0_1px_2px_rgba(31,22,60,0.03)]">
                            <div className="relative aspect-video w-full shrink-0 bg-[#eeebf6]">
                                <img
                                    src={poster || fallbackBanner}
                                    alt={`${hackathon.title} banner`}
                                    onError={poster ? (event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackBanner; } : undefined}
                                    className="h-full w-full object-cover"
                                />
                                <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-[#5a42d8] shadow-sm">{statusLabel(hackathon, registered)}</span>
                            </div>
                            <div className="flex flex-1 flex-col p-6">
                                <h2 className="text-2xl font-bold leading-tight tracking-tight text-[#292738]">{hackathon.title}</h2>
                                {hackathon.organizerName || hackathon.organizer_name ? <p className="mt-2 text-base text-[#777488]">by {hackathon.organizerName || hackathon.organizer_name}</p> : null}
                                <div className="mt-6 space-y-4 text-base text-[#777488]">
                                    <p className="flex gap-3"><span aria-hidden="true">▣</span>{dateRange(hackathon.hackathonStart, hackathon.hackathonEnd)}</p>
                                    <p className="flex gap-3"><span aria-hidden="true">◎</span>{modeFor(hackathon.location)}</p>
                                    <p className="flex gap-3"><span aria-hidden="true">♧</span>Team: {hackathon.minTeamSize || 1} – {hackathon.maxTeamSize || 1} Members</p>
                                </div>
                                <div className="mt-auto flex gap-3">
                                    <button onClick={() => navigate(`/student/hackathons/${encodeURIComponent(id)}`)} className={`w-full rounded-lg py-3.5 text-lg font-medium transition ${registered ? 'bg-[#5740d6] text-white hover:bg-[#4530bd]' : 'border-2 border-[#6952e5] bg-white text-[#6149dc] hover:bg-[#f6f4ff]'}`}>View Details</button>
                                    {!registered && <button onClick={() => navigate(`/student/hackathons/${encodeURIComponent(id)}/register`)} className="w-full rounded-lg bg-[#5740d6] py-3.5 text-lg font-medium text-white transition hover:bg-[#4530bd]">Register Now</button>}
                                </div>
                            </div>
                        </article>;
                    })}
                </section>
            )}
        </div>
    );
};

export default StudentHackathons;
