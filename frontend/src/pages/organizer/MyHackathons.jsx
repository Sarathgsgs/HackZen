import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyHackathons, toggleHackathonRegistration, toggleHackathonVisibility } from '../../services/organizer/myHackathonsApi';

const MyHackathons = () => {
    const navigate = useNavigate();

    // --- State Management ---
    const [hackathons, setHackathons] = useState([]);
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('organizer_hackathons_tab') || 'All');
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('organizer_hackathons_search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({}); // Tracking loading for specific hackathon IDs

    const tabs = ['All', 'Active', 'Upcoming', 'Past', 'Drafts'];

    // --- Persistence & Initial Load ---
    useEffect(() => {
        // Hydrate scroll position
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

        // Scroll listener for persistence
        const handleScroll = () => {
            sessionStorage.setItem('organizer_hackathons_scroll', window.scrollY.toString());
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Save UI state on changes
    useEffect(() => {
        sessionStorage.setItem('organizer_hackathons_tab', activeTab);
        sessionStorage.setItem('organizer_hackathons_search', searchQuery);
    }, [activeTab, searchQuery]);

    // Handle Debounced Search
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

        const previousState = [...hackathons];
        const nextRegStatus = hackathon.regStatus === 'Open' ? 'Closed' : 'Open';
        setHackathons((prev) => prev.map((h) => (h.id === id ? { ...h, regStatus: nextRegStatus } : h)));
        setActionLoading((prev) => ({ ...prev, [`reg-${id}`]: true }));

        try {
            const result = await toggleHackathonRegistration(id);
            const nextStatus = result.hackathon.status === 'Registration Open' ? 'Open' : 'Closed';
            const nextDisplayStatus = result.hackathon.status === 'Draft' ? 'Draft' : 'Active';
            setHackathons((prev) => prev.map((h) => (h.id === id ? { ...h, regStatus: nextStatus, status: nextDisplayStatus } : h)));
        } catch (error) {
            setHackathons(previousState);
            alert('Failed to update registration status.');
        } finally {
            setActionLoading((prev) => ({ ...prev, [`reg-${id}`]: false }));
        }
    };

    const handleEditTimeline = (id) => {
        navigate(`/organizer/edit-timeline/${id}`);
    };

    const handleManage = (id) => {
        const selectedHackathon = hackathons.find((h) => h.id === id);
        navigate(`/organizer/manage-hackathon/${id}`, {
            state: { hackathon: selectedHackathon }
        });
    };

    const handleCreateNew = () => {
        navigate('/organizer/create-hackathon');
    };

    // --- Render Helpers ---
    if (isLoading && hackathons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 animate-pulse">
                <svg className="w-12 h-12 mb-4 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Loading your hackathons...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        My Hackathons
                    </h1>
                    <p className="text-sm text-gray-400">
                        Manage timeline, registrations, and visibility for your events
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95"
                        onClick={() => console.log("Exporting hackathons...")}
                    >
                        Export List
                    </button>
                    <button
                        onClick={handleCreateNew}
                        className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Create New
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-1">
                <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab
                                ? 'bg-white/10 text-white shadow-inner scale-105'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search title or category..."
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 min-h-[200px]">
                {filteredHackathons.length > 0 ? (
                    filteredHackathons.map((hackathon) => (
                        <div key={hackathon.id} className="group glass-strong border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                            {/* Banner Image */}
                            <div className="h-40 relative overflow-hidden">
                                <img
                                    src={hackathon.banner}
                                    alt={hackathon.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent"></div>

                                {/* Top Right Badges */}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-md backdrop-blur-md border shadow-sm ${
                                        hackathon.status === 'Active' || hackathon.status === 'Registration Open' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                        hackathon.status === 'Pending' || hackathon.status === 'Changes Requested' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                        hackathon.status === 'Draft' ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' :
                                        hackathon.status === 'Upcoming' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                        hackathon.status === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                                        'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                    }`}>
                                        {hackathon.status}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{hackathon.title}</h3>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        {hackathon.startDate} - {hackathon.endDate}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                        {hackathon.mode}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <p className="text-xs text-gray-400 mb-1">Registrations</p>
                                        <p className="text-xl font-bold text-white">{hackathon.registrations}</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <p className="text-xs text-gray-400 mb-1">Days Left</p>
                                        <p className="text-xl font-bold text-cyan-400">{hackathon.daysLeft}</p>
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div className="space-y-3 mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className={`flex items-center justify-between transition-opacity ${actionLoading[`vis-${hackathon.id}`] ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-300">Visibility</span>
                                            {actionLoading[`vis-${hackathon.id}`] && (
                                                <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                            )}
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={hackathon.isVisible}
                                                className="sr-only peer"
                                                onChange={() => handleToggleVisibility(hackathon.id)}
                                                disabled={actionLoading[`vis-${hackathon.id}`]}
                                            />
                                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                                        </label>
                                    </div>
                                    <div className={`flex items-center justify-between transition-opacity ${actionLoading[`reg-${hackathon.id}`] ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-300">Registrations</span>
                                            {actionLoading[`reg-${hackathon.id}`] && (
                                                <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-medium ${hackathon.regStatus === 'Open' ? 'text-green-400' : 'text-red-400'}`}>
                                                {hackathon.regStatus}
                                            </span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={hackathon.regStatus === 'Open'}
                                                    className="sr-only peer"
                                                    onChange={() => handleToggleRegistrations(hackathon.id)}
                                                    disabled={actionLoading[`reg-${hackathon.id}`]}
                                                />
                                                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-auto flex gap-2">
                                    <button
                                        onClick={() => handleEditTimeline(hackathon.id)}
                                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95"
                                    >
                                        Edit Timeline
                                    </button>
                                    <button
                                        onClick={() => handleManage(hackathon.id)}
                                        className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold transition-all active:scale-95"
                                    >
                                        Manage
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 bg-white/5 border border-dashed border-white/10 rounded-2xl animate-in fade-in duration-700">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <p className="text-lg">No hackathons found</p>
                        <p className="text-sm opacity-60 mt-1">Try adjusting your filters or search query</p>
                        <button
                            onClick={() => { setActiveTab('All'); setSearchQuery(''); }}
                            className="mt-6 text-cyan-400 hover:underline text-sm font-medium"
                        >
                            Reset all filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyHackathons;

