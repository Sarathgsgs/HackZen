import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyHackathons, toggleHackathonRegistration, toggleHackathonVisibility } from '../../services/organizer/myHackathonsApi';

const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('active') || s.includes('open')) {
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
    }
    if (s.includes('pending') || s.includes('review') || s.includes('change')) {
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
    }
    if (s.includes('rejected')) {
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
    }
    if (s.includes('draft')) {
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
};

const MyHackathons = () => {
    const navigate = useNavigate();

    // --- State Management ---
    const [hackathons, setHackathons] = useState([]);
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('organizer_hackathons_tab') || 'All');
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('organizer_hackathons_search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});

    const tabs = ['All', 'Active', 'Upcoming', 'Past', 'Drafts'];

    // --- Persistence & Initial Load ---
    useEffect(() => {
        const savedScroll = sessionStorage.getItem('organizer_hackathons_scroll');
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll));
        }

        const fetchHackathons = async () => {
            setIsLoading(true);
            try {
                const data = await fetchMyHackathons();
                setHackathons(data);
            } catch (error) {
                console.error('Failed to fetch hackathons', error);
                setHackathons([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHackathons();

        const handleScroll = () => {
            sessionStorage.setItem('organizer_hackathons_scroll', window.scrollY.toString());
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        sessionStorage.setItem('organizer_hackathons_tab', activeTab);
        sessionStorage.setItem('organizer_hackathons_search', searchQuery);
    }, [activeTab, searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // --- Filtering Logic ---
    const filteredHackathons = useMemo(() => {
        return hackathons.filter((h) => {
            const matchesTab = activeTab === 'All'
                ? true
                : activeTab === 'Drafts'
                    ? h.status === 'Draft'
                    : h.status === activeTab;
            const matchesSearch = h.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                h.category?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                h.mode.toLowerCase().includes(debouncedSearch.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [hackathons, activeTab, debouncedSearch]);

    // --- Action Handlers ---
    const handleToggleVisibility = async (id) => {
        const hackathon = hackathons.find((h) => h.id === id);
        if (!hackathon) return;

        const previousState = [...hackathons];
        setHackathons((prev) => prev.map((h) => (h.id === id ? { ...h, isVisible: !h.isVisible } : h)));
        setActionLoading((prev) => ({ ...prev, [`vis-${id}`]: true }));

        try {
            const result = await toggleHackathonVisibility(id);
            setHackathons((prev) => prev.map((h) => (h.id === id ? { ...h, isVisible: result.hackathon.isVisible } : h)));
        } catch (error) {
            setHackathons(previousState);
            alert('Failed to update visibility. Please try again.');
        } finally {
            setActionLoading((prev) => ({ ...prev, [`vis-${id}`]: false }));
        }
    };

    const handleToggleRegistrations = async (id) => {
        const hackathon = hackathons.find((h) => h.id === id);
        if (!hackathon) return;

        const isCurrentlyOpen = hackathon.regStatus === 'Open';
        const newStatus = isCurrentlyOpen ? 'Closed' : 'Open';

        const previousState = [...hackathons];
        setHackathons((prev) => prev.map((h) => (h.id === id ? { ...h, regStatus: newStatus } : h)));
        setActionLoading((prev) => ({ ...prev, [`reg-${id}`]: true }));

        try {
            const result = await toggleHackathonRegistration(id);
            setHackathons((prev) => prev.map((h) => (h.id === id ? { ...h, regStatus: result.hackathon.regStatus } : h)));
        } catch (error) {
            setHackathons(previousState);
            alert('Failed to update registration status. Please try again.');
        } finally {
            setActionLoading((prev) => ({ ...prev, [`reg-${id}`]: false }));
        }
    };

    const handleEditTimeline = (id) => {
        navigate(`/organizer/hackathons/${id}/timeline`);
    };

    const handleManage = (id) => {
        navigate(`/organizer/hackathons/${id}/manage`);
    };

    const handleCreateNew = () => {
        navigate('/organizer/create-hackathon');
    };

    if (isLoading && hackathons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 animate-pulse">
                <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-semibold">Loading hackathons...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-12 text-slate-900 dark:text-white transition-colors duration-200">
            {/* 1. Header (Admin Benchmark) */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        My Hackathons
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Manage timelines, participant registrations, and publication visibility for your hosted events.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCreateNew}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95 cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Create Hackathon
                    </button>
                </div>
            </header>

            {/* 2. Filter Tabs & Search Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-2">
                <div className="flex gap-1 overflow-x-auto w-full sm:w-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`px-4 py-2 text-xs font-bold transition-all rounded-xl cursor-pointer ${
                                activeTab === tab
                                    ? 'bg-[#2563eb] text-white shadow-xs'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search title or category..."
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                </div>
            </div>

            {/* 3. Hackathon Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredHackathons.length > 0 ? (
                    filteredHackathons.map((hackathon) => (
                        <div
                            key={hackathon.id}
                            className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700/50 shadow-xs hover:shadow-md transition-all flex flex-col h-full group"
                        >
                            {/* Banner Image */}
                            <div className="h-40 relative overflow-hidden bg-slate-100 dark:bg-navy-950">
                                <img
                                    src={hackathon.banner}
                                    alt={hackathon.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border backdrop-blur-md ${getStatusBadge(hackathon.status)}`}>
                                        {hackathon.status}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#2563eb] transition-colors line-clamp-1">
                                    {hackathon.title}
                                </h3>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        {hackathon.startDate} - {hackathon.endDate}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                        {hackathon.mode}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-slate-50 dark:bg-navy-950/60 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                                        <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Registrations</p>
                                        <p className="text-xl font-extrabold text-slate-900 dark:text-white">{hackathon.registrations}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-navy-950/60 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                                        <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Days Left</p>
                                        <p className="text-xl font-extrabold text-[#2563eb] dark:text-blue-400">{hackathon.daysLeft}</p>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="space-y-2.5 mb-5 bg-slate-50 dark:bg-navy-950/60 p-3 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-600 dark:text-slate-300">Public Visibility</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={hackathon.isVisible}
                                                className="sr-only peer"
                                                onChange={() => handleToggleVisibility(hackathon.id)}
                                                disabled={actionLoading[`vis-${hackathon.id}`]}
                                            />
                                            <div className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#2563eb]"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-600 dark:text-slate-300">Registrations ({hackathon.regStatus})</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={hackathon.regStatus === 'Open'}
                                                className="sr-only peer"
                                                onChange={() => handleToggleRegistrations(hackathon.id)}
                                                disabled={actionLoading[`reg-${hackathon.id}`]}
                                            />
                                            <div className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-auto flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                    <button
                                        onClick={() => handleEditTimeline(hackathon.id)}
                                        className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                    >
                                        Timeline
                                    </button>
                                    <button
                                        onClick={() => handleManage(hackathon.id)}
                                        className="flex-1 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                                    >
                                        Manage
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-navy-900 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                        <svg className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No hackathons found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search keywords</p>
                        <button
                            onClick={() => { setActiveTab('All'); setSearchQuery(''); }}
                            className="mt-4 text-xs font-bold text-[#2563eb] dark:text-blue-400 hover:underline cursor-pointer"
                        >
                            Reset filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyHackathons;
