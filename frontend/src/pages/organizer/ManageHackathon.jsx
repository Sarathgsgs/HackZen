import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import apiClient from '../../api/api';

const formatDate = (value) => {
    if (!value) return 'TBD';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'TBD' : date.toLocaleDateString();
};

const getDisplayStatus = (value) => {
    if (!value) return 'Draft';
    const raw = String(value).toLowerCase();
    if (raw.includes('draft')) return 'Draft';
    if (raw.includes('completed') || raw.includes('results')) return 'Past';
    if (raw.includes('registration')) return 'Registration Open';
    return 'Active';
};

const getDisplayRegistrationStatus = (value) => {
    if (!value) return 'Closed';
    const raw = String(value).toLowerCase();
    if (raw.includes('draft')) return 'Closed';
    if (raw.includes('registration')) return 'Open';
    return 'Open';
};

const getCategory = (hackathon) => {
    if (Array.isArray(hackathon?.themes) && hackathon.themes.length > 0) {
        return hackathon.themes[0];
    }

    return hackathon?.category || 'General';
};

const getBanner = (hackathon) => {
    return hackathon?.posterUrl || hackathon?.banner || 'https://images.unsplash.com/photo-1504384308090-c54be3852f33?auto=format&fit=crop&q=80&w=1000';
};

const getMode = (hackathon) => {
    if (!hackathon?.location) return 'Hybrid';
    const location = String(hackathon.location).toLowerCase();
    if (location.includes('online')) return 'Online';
    return 'Hybrid';
};

const normalizeHackathonForView = (detail, fallbackId) => {
    const normalizedStatus = getDisplayStatus(detail?.status);
    const registrationStatus = getDisplayRegistrationStatus(detail?.status);
    const registrationOpen = registrationStatus === 'Open' || (detail?.registrationEnd && new Date(detail.registrationEnd) > new Date());

    return {
        id: detail?._id || detail?.id || fallbackId,
        title: detail?.title || 'Untitled Hackathon',
        banner: getBanner(detail),
        status: normalizedStatus,
        category: getCategory(detail),
        mode: getMode(detail),
        location: detail?.location || 'Online',
        visibility: detail?.isPublic ?? true,
        registrationOpen,
        daysLeft: detail?.hackathonEnd ? Math.max(0, Math.ceil((new Date(detail.hackathonEnd) - new Date()) / (1000 * 60 * 60 * 24))) : null,
        progress: detail?.hackathonStart && detail?.hackathonEnd ? Math.max(0, Math.min(100, Math.round(((new Date() - new Date(detail.hackathonStart)) / (new Date(detail.hackathonEnd) - new Date(detail.hackathonStart))) * 100))) : 0,
        registrationStart: detail?.registrationStart,
        registrationEnd: detail?.registrationEnd,
        hackathonStart: detail?.hackathonStart,
        hackathonEnd: detail?.hackathonEnd,
        rawStatus: detail?.status,
        rawData: detail
    };
};

// --- Stat Card Helper Component (Lifted outside for performance and clarity) ---
const StatCard = ({ stat }) => (
    <div className="glass p-5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl">
                {stat.icon}
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                {stat.trend}
            </span>
        </div>
        <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
        <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
    </div>
);

const ManageHackathon = () => {
    const { hackathonId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // --- State Management ---
    const [hackathon, setHackathon] = useState(() => {
        const initialHackathon = location.state?.hackathon;
        return initialHackathon ? normalizeHackathonForView(initialHackathon, hackathonId) : null;
    });
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [isActionLoading, setIsActionLoading] = useState({});
    const [pageError, setPageError] = useState(null);
    const [registrationCount, setRegistrationCount] = useState(0);
    const [teams, setTeams] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    const stats = useMemo(() => [
        { label: 'Total Registrations', value: registrationCount.toString(), icon: '👥', trend: registrationCount > 0 ? '+12%' : '0', color: 'cyan' },
        { label: 'Active Teams', value: '—', icon: '🚀', trend: 'Live', color: 'purple' },
        { label: 'Submissions', value: '—', icon: '📁', trend: 'Pending', color: 'blue' },
        { label: 'Registration', value: hackathon?.registrationOpen ? 'Open' : 'Closed', icon: '📊', trend: hackathon?.registrationOpen ? 'Live' : 'Closed', color: 'green' },
    ], [hackathon?.registrationOpen, registrationCount]);

    const tabs = ['Overview', 'Participants', 'Submissions', 'Mentors', 'Broadcast'];

    // --- Data Fetching ---
    useEffect(() => {
        const fetchHackathonDetails = async () => {
            if (!hackathonId) {
                setPageError('Hackathon ID not found.');
                setIsLoading(false);
                return;
            }

            const initialHackathon = location.state?.hackathon;
            if (initialHackathon) {
                setHackathon(normalizeHackathonForView(initialHackathon, hackathonId));
                setPageError(null);
                setIsLoading(false);
            } else {
                setIsLoading(true);
            }

            setRegistrationCount(0);
            setTeams([]);
            setRecentActivity([]);

            try {
                const [hackathonResponse, applicationsResponse] = await Promise.all([
                    apiClient.get(`/hackathons/${hackathonId}`),
                    apiClient.get(`/applications/hackathon/${hackathonId}`)
                ]);

                const detail = hackathonResponse.data;
                const applications = Array.isArray(applicationsResponse.data) ? applicationsResponse.data : [];
                const normalizedHackathon = normalizeHackathonForView(detail, hackathonId);

                setHackathon(normalizedHackathon);
                setRegistrationCount(applications.length);
                setTeams([]);
                setRecentActivity(
                    applications.slice(0, 4).map((application, index) => ({
                        id: application._id || `${hackathonId}-${index}`,
                        title: `Application ${application.status || 'received'}`,
                        detail: application.status ? `Current status: ${application.status}` : 'New registration is pending review',
                        time: application.appliedAt ? formatDate(application.appliedAt) : 'Just now',
                        icon: index % 2 === 0 ? '🆕' : '📁'
                    }))
                );
            } catch (error) {
                console.error('Error fetching hackathon details:', error);
                if (!initialHackathon) {
                    setPageError('Failed to load hackathon details. Please refresh the page.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchHackathonDetails();
    }, [hackathonId, location.state]);

    // --- Filter Logic ---
    const filteredTeams = useMemo(() => {
        return teams.filter(team =>
            team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.leader.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [teams, searchQuery]);

    // --- Action Handlers ---
    const handleAction = async (id, action) => {
        setIsActionLoading(prev => ({ ...prev, [`${id}-${action}`]: true }));
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (action === 'approve') {
                setTeams(prev => prev.map(t => t.id === id ? { ...t, status: 'Approved' } : t));
            } else if (action === 'reject') {
                setTeams(prev => prev.map(t => t.id === id ? { ...t, status: 'Rejected' } : t));
            }
        } finally {
            setIsActionLoading(prev => ({ ...prev, [`${id}-${action}`]: false }));
        }
    };

    const toggleStatus = (field) => {
        if (!hackathon) return;
        setHackathon(prev => ({ ...prev, [field]: !prev[field] }));
    };

    // --- Render States ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-gray-400 animate-pulse">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                <p className="font-bold tracking-widest uppercase text-xs">Initializing Command Center...</p>
            </div>
        );
    }

    if (pageError || !hackathon) {
        return (
            <div className="p-20 text-center flex flex-col items-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-2xl font-bold">!</div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{pageError || "Something went wrong."}</h2>
                <button
                    onClick={() => navigate('/organizer/my-hackathons')}
                    className="text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest text-xs border-b border-cyan-500/20 pb-1"
                >
                    ← Back to My Hackathons
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10 px-0">

            {/* Back Button */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => navigate('/organizer/my-hackathons')}
                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 transition-all active:scale-90"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white">Manage Hackathon</h1>
                    <p className="text-sm text-gray-400 mt-1">Control and monitor your event operations</p>
                </div>
            </div>

            {/* Header / Hero Section */}
            <div className="relative group rounded-3xl overflow-hidden border border-white/10 h-64 md:h-80 shadow-2xl">
                <img
                    src={hackathon.banner}
                    alt="Banner"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/60 to-transparent"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-cyan-600/90 text-white rounded-full">
                                {hackathon.category}
                            </span>
                            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                                {hackathon.status}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-white">
                            {hackathon.title}
                        </h1>
                        <p className="text-gray-300 font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            {hackathon.location} • {hackathon.mode}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Link
                            to={`/organizer/hackathons/${hackathonId}/edit-timeline`}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Timeline
                        </Link>
                        <button className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold shadow-2xl shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-2">
                            Launch Hub
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => <StatCard key={i} stat={stat} />)}
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* Left Column - Tabs & Controls */}
                <div className="xl:col-span-3 space-y-6">

                    {/* Tabs Navigation */}
                    <div className="glass-strong p-1.5 rounded-2xl border border-white/10 flex gap-1 overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-1 ${activeTab === tab
                                        ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Panels */}
                    <div className="min-h-[500px]">

                        {activeTab === 'Overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass p-6 rounded-xl border border-white/10 space-y-6">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                                        <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                                        Recent Activity
                                    </h3>
                                    <div className="space-y-4">
                                        {recentActivity.length > 0 ? recentActivity.map((activity) => (
                                            <div key={activity.id} className="flex gap-4 group cursor-pointer">
                                                <div className="w-10 h-10 rounded-full bg-navy-900 border border-white/5 flex items-center justify-center text-lg flex-shrink-0 group-hover:border-cyan-500/50 transition-colors">
                                                    {activity.icon}
                                                </div>
                                                <div className="pb-4 border-b border-white/5 flex-1">
                                                    <p className="text-sm text-gray-300">
                                                        <span className="font-bold text-white">{activity.title}</span>
                                                        {activity.detail}
                                                    </p>
                                                    <span className="text-xs text-gray-500 mt-1 block font-medium uppercase tracking-tighter">{activity.time}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-sm text-gray-400">No recent activity yet.</div>
                                        )}
                                    </div>
                                    <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95">
                                        View All System Logs
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="glass p-6 rounded-xl border border-white/10">
                                        <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-cyan-500/30 transition-all">
                                                <div>
                                                    <p className="font-semibold text-white text-sm">Registrations</p>
                                                    <p className="text-xs text-gray-400">Toggle new signups</p>
                                                </div>
                                                <button
                                                    onClick={() => toggleStatus('registrationOpen')}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${hackathon.registrationOpen ? 'bg-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hackathon.registrationOpen ? 'right-1' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-cyan-500/30 transition-all">
                                                <div>
                                                    <p className="font-semibold text-white text-sm">Make Public</p>
                                                    <p className="text-xs text-gray-400">Event search visibility</p>
                                                </div>
                                                <button
                                                    onClick={() => toggleStatus('visibility')}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${hackathon.visibility ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hackathon.visibility ? 'right-1' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                            <button className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-500 transition-all hover:text-white active:scale-95">
                                                Emergency Stop
                                            </button>
                                        </div>
                                    </div>

                                    <div className="glass p-6 rounded-xl border border-white/10 bg-gradient-to-br from-cyan-600/10 to-transparent">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold text-white">Event Health</h3>
                                            <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">⚡</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase">
                                                <span>PROJECT COMPLETION</span>
                                                <span className="text-cyan-400">{hackathon.progress}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-1000"
                                                    style={{ width: `${hackathon.progress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2 text-center">Everything is running smoothly</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Participants' && (
                            <div className="glass rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5">
                                    <h3 className="text-lg font-semibold text-white">Registered Teams</h3>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search teams..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-cyan-500/50 w-full md:w-64 transition-all placeholder:text-gray-500"
                                        />
                                        <svg className="absolute left-3 top-3 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    </div>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white/5">
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Team Name</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-center">Members</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-center">Reg. Date</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-center">Status</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredTeams.length > 0 ? filteredTeams.map(team => (
                                                <tr key={team.id} className="hover:bg-white/10 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-navy-900 border border-white/10 flex items-center justify-center font-black italic text-cyan-400 shadow-lg">
                                                                {team.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-white group-hover:text-cyan-400 transition-colors text-sm">{team.name}</p>
                                                                <p className="text-xs text-gray-400">LEAD: {team.leader}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center text-sm text-gray-300 font-semibold">
                                                        {team.members} / 4
                                                    </td>
                                                    <td className="px-6 py-5 text-center text-xs text-gray-400">
                                                        {team.registrationDate}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${team.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                team.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                            }`}>
                                                            {team.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleAction(team.id, 'approve')}
                                                                disabled={isActionLoading[`${team.id}-approve`] || team.status === 'Approved'}
                                                                className="p-2.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                                title="Approve Team"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(team.id, 'reject')}
                                                                disabled={isActionLoading[`${team.id}-reject`] || team.status === 'Rejected'}
                                                                className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                                title="Reject Team"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-400">
                                                        No registered teams yet for this hackathon.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-white/5 text-center border-t border-white/5">
                                    <button className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all">Show More Teams</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Broadcast' && (
                            <div className="glass p-8 md:p-12 rounded-3xl border border-white/10 max-w-3xl mx-auto shadow-2xl">
                                <div className="space-y-8">
                                    <div className="flex items-center gap-5 border-b border-white/10 pb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-3xl shadow-lg italic">
                                            📢
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white italic tracking-tight">Mass Broadcast</h3>
                                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Direct deployment to all command devices</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Broadcast Signature</label>
                                            <input
                                                type="text"
                                                placeholder="PHASE 1 DEADLINE EXTENSION"
                                                className="w-full px-6 py-4 bg-navy-900/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-bold placeholder-gray-800"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Core Information Transmittance</label>
                                            <textarea
                                                rows="6"
                                                placeholder="Write your mission objective here..."
                                                className="w-full px-6 py-4 bg-navy-900/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium placeholder-gray-800 resize-none"
                                            ></textarea>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 p-6 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" id="sendEmail" className="w-5 h-5 rounded bg-navy-950 border-white/10 text-purple-600 focus:ring-purple-500" />
                                                <label htmlFor="sendEmail" className="text-[10px] text-gray-400 font-black uppercase tracking-widest cursor-pointer">Email Uplink</label>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" id="sendPush" className="w-5 h-5 rounded bg-navy-950 border-white/10 text-purple-600 focus:ring-purple-500" defaultChecked />
                                                <label htmlFor="sendPush" className="text-[10px] text-gray-400 font-black uppercase tracking-widest cursor-pointer">Mobile Alert</label>
                                            </div>
                                        </div>
                                        <button className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-xl hover:shadow-purple-500/40 text-white rounded-2xl font-black italic uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg">
                                            Execute Broadcast
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Mentors' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="glass p-6 rounded-3xl border border-white/10 hover:border-purple-500/30 transition-all group relative overflow-hidden shadow-xl">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-[40px] pointer-events-none"></div>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-0.5 shadow-lg">
                                                <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center text-white font-black text-xl italic shadow-inner">
                                                    {i === 1 ? 'M' : i === 2 ? 'L' : 'K'}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg tracking-tight group-hover:text-purple-400 transition-colors">{i === 1 ? 'Marcus Thorne' : i === 2 ? 'Lila Vance' : 'Kobe Bryant'}</h4>
                                                <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">{i === 1 ? 'AI/ML Expert' : 'UI/UX Lead'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 mb-8">
                                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Teams</span>
                                                <span className="text-white font-black italic text-lg">{i * 2 + 1}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Res. Time</span>
                                                <span className="text-green-400 font-black italic text-lg">~12m</span>
                                            </div>
                                        </div>
                                        <button className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[10px] hover:bg-white/10 transition-all uppercase tracking-widest active:scale-95">
                                            Inspect Logs
                                        </button>
                                    </div>
                                ))}
                                <button className="border-3 border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-500 hover:text-purple-400 hover:border-purple-500/50 transition-all group bg-white/5 hover:bg-purple-500/5">
                                    <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-3xl font-bold border border-white/10">
                                        +
                                    </div>
                                    <span className="font-black uppercase tracking-[0.2em] text-[11px]">Enlist Mentor</span>
                                </button>
                            </div>
                        )}

                        {(activeTab === 'Submissions') && (
                            <div className="glass-strong rounded-3xl border border-white/10 p-24 text-center space-y-6 shadow-2xl">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">📂</div>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Deployment phase not yet finalized</p>
                                <button
                                    onClick={() => navigate('/organizer/evaluation')}
                                    className="px-8 py-3 bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-cyan-600 hover:text-white transition-all italic active:scale-95"
                                >
                                    Launch Evaluation Interface
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Mission Specs */}
                <div className="space-y-6">

                    {/* Time Counter */}
                    <div className="glass-strong p-8 rounded-3xl border border-white/10 text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse"></div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 italic opacity-70">Operation Remaining</p>
                        <div className="flex justify-center gap-5">
                            <div className="space-y-1">
                                <p className="text-4xl font-black text-white italic tracking-tighter shadow-cyan-500/10">14</p>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Days</p>
                            </div>
                            <div className="text-3xl font-black text-cyan-500 mt-0.5 animate-pulse">:</div>
                            <div className="space-y-1">
                                <p className="text-4xl font-black text-white italic tracking-tighter">08</p>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Hrs</p>
                            </div>
                            <div className="text-3xl font-black text-cyan-500 mt-0.5 animate-pulse">:</div>
                            <div className="space-y-1">
                                <p className="text-4xl font-black text-white italic tracking-tighter">45</p>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Mins</p>
                            </div>
                        </div>
                    </div>

                    {/* Operational Alerts */}
                    <div className="glass p-6 rounded-3xl border border-white/10 space-y-5 bg-gradient-to-b from-white/5 to-transparent shadow-xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                            System Alerts
                        </h4>
                        <div className="space-y-3">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl group hover:bg-red-500/20 transition-all cursor-crosshair">
                                <p className="text-xs font-black text-red-500 uppercase tracking-tight italic">Low Expert Coverage</p>
                                <p className="text-[9px] text-red-300/60 mt-1 uppercase font-bold leading-relaxed">CyberSec vector has 0 active mentors. immediate recruitment required.</p>
                            </div>
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl group hover:bg-yellow-500/20 transition-all cursor-help">
                                <p className="text-xs font-black text-yellow-500 uppercase tracking-tight italic">Delayed Transfers</p>
                                <p className="text-[9px] text-yellow-300/60 mt-1 uppercase font-bold leading-relaxed">12 fleet units missed internal transmission synchronization.</p>
                            </div>
                        </div>
                    </div>

                    {/* Operational Linkage */}
                    <div className="glass p-7 rounded-3xl border border-white/10 space-y-5 shadow-xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Command Links</h4>
                        <div className="grid grid-cols-1 gap-3">
                            <Link to="/organizer/analytics" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all flex items-center justify-between group">
                                <span className="text-[11px] font-black text-gray-400 group-hover:text-cyan-400 uppercase tracking-widest transition-colors">Tactical Data</span>
                                <span className="text-lg group-hover:scale-125 transition-transform duration-300">📈</span>
                            </Link>
                            <Link to="/organizer/results" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all flex items-center justify-between group">
                                <span className="text-[11px] font-black text-gray-400 group-hover:text-blue-400 uppercase tracking-widest transition-colors">Official Assets</span>
                                <span className="text-lg group-hover:scale-125 transition-transform duration-300">🎓</span>
                            </Link>
                            <Link to="/organizer/evaluation" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all flex items-center justify-between group">
                                <span className="text-[11px] font-black text-gray-400 group-hover:text-purple-400 uppercase tracking-widest transition-colors">Review Center</span>
                                <span className="text-lg group-hover:scale-125 transition-transform duration-300">⚖️</span>
                            </Link>
                        </div>
                    </div>

                    {/* HQ Uplink */}
                    <div className="glass-strong p-8 rounded-3xl border border-white/10 text-center space-y-4 shadow-2xl bg-navy-950/40">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.25em]">HQ Connectivity</p>
                        <button className="w-full py-4 bg-white text-navy-950 rounded-2xl font-black italic uppercase tracking-[0.25em] text-[10px] hover:bg-cyan-500 hover:text-white transition-all shadow-lg active:scale-95">
                            Contact Admin
                        </button>
                    </div>

                </div>

            </div>

        </div>
    );
};

export default ManageHackathon;
