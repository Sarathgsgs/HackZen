import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Inbox,
    CheckCircle,
    XCircle,
    Eye,
    Search,
    Users,
    Award,
    Clock
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { fetchMentorshipRequests, updateMentorshipRequestStatus } from '../../services/mentor/mentorshipRequestsApi';

export default function MentorshipRequests() {
    const navigate = useNavigate();
    const { openRequestModal, addToast, refreshKey, triggerRefresh, globalSearch } = useMentor();

    const [activeTab, setActiveTab] = useState('Pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTrack, setSelectedTrack] = useState('All');
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [loadError, setLoadError] = useState('');

    // Load requests
    const loadRequests = useCallback(async () => {
        setLoading(true);
        try {
            const apiStatus = activeTab === 'All' ? undefined : activeTab.toLowerCase() === 'accepted' ? 'approved' : activeTab.toLowerCase();
            const res = await fetchMentorshipRequests(apiStatus);
            setRequests(Array.isArray(res) ? res : []);
            setLoadError('');
        } catch (e) {
            console.error('Could not load mentorship requests:', e);
            setRequests([]);
            setLoadError('Unable to load mentorship requests. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests, refreshKey]);

    const handleDecline = async (id, teamName) => {
        try {
            await updateMentorshipRequestStatus(id, 'reject');
            setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)));
            addToast('Request Declined', `You declined the mentorship request from ${teamName}.`, 'info');
            triggerRefresh();
        } catch (e) {
            console.error('Could not decline mentorship request:', e);
            addToast('Request Failed', 'Unable to decline this request. Please try again.', 'error');
        }
    };

    const handleAccept = (request) => {
        openRequestModal(request);
    };

    // Filter tabs: All, Pending, Accepted, Declined
    const tabs = ['All', 'Pending', 'Accepted', 'Declined'];

    const filteredRequests = useMemo(() => {
        let list = [...requests];

        // Filter by tab
        if (activeTab === 'Pending') {
            list = list.filter((r) => r.status === 'pending');
        } else if (activeTab === 'Accepted') {
            list = list.filter((r) => r.status === 'approved' || r.status === 'accepted');
        } else if (activeTab === 'Declined') {
            list = list.filter((r) => r.status === 'rejected' || r.status === 'declined');
        }

        // Filter by search
        const query = (searchQuery || globalSearch).toLowerCase().trim();
        if (query) {
            list = list.filter(
                (r) =>
                    r.teamName?.toLowerCase().includes(query) ||
                    r.domain?.toLowerCase().includes(query) ||
                    r.track?.toLowerCase().includes(query) ||
                    r.description?.toLowerCase().includes(query)
            );
        }

        // Filter by track
        if (selectedTrack !== 'All') {
            list = list.filter((r) => (r.track || r.domain) === selectedTrack);
        }

        return list;
    }, [requests, activeTab, searchQuery, globalSearch, selectedTrack]);

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-12 transition-colors duration-200 text-slate-900 dark:text-white">
            {/* 1. Header (Admin Benchmark) */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Mentorship Requests
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Review, evaluate, and accept teams requesting your guidance for active hackathons.
                    </p>
                </div>

                {/* Search & Track Filter */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by team or topic..."
                            className="h-11 w-full pl-9 pr-3.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#7C65F6]"
                        />
                    </div>

                    <select
                        value={selectedTrack}
                        onChange={(e) => setSelectedTrack(e.target.value)}
                        className="h-11 px-3.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#7C65F6] cursor-pointer"
                    >
                        <option value="All">All Tracks</option>
                        <option value="Artificial Intelligence">Artificial Intelligence</option>
                        <option value="Climate & IoT">Climate & IoT</option>
                        <option value="Healthcare Tech">Healthcare Tech</option>
                        <option value="DeepTech">DeepTech</option>
                    </select>
                </div>
            </header>

            {/* 2. Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                            activeTab === tab
                                ? 'border-[#7C65F6] text-[#7C65F6] dark:text-purple-400 dark:border-purple-400'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* 3. Requests List */}
            {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">Loading requests...</div>
            ) : loadError ? (
                <div role="alert" className="p-8 text-center bg-white dark:bg-navy-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
                    {loadError}
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 p-12 text-center shadow-xs">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#7C65F6] dark:text-purple-400 mb-3">
                        <Inbox className="w-6 h-6" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">No requests found</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">There are no {activeTab.toLowerCase()} mentorship inquiries matching your filter.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map((req) => {
                        const isPending = req.status === 'pending';
                        const isApproved = req.status === 'approved' || req.status === 'accepted';

                        return (
                            <div
                                key={req.id}
                                className="p-5 sm:p-6 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-purple-300 dark:hover:border-purple-700/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                            >
                                {/* Team Info & Topic */}
                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#7C65F6] dark:text-purple-300 font-extrabold text-base flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/40">
                                        {req.teamName?.charAt(0) || 'T'}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                                {req.teamName}
                                            </h3>
                                            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#7C65F6] dark:text-purple-300 border border-purple-100 dark:border-purple-800/50">
                                                {req.domain || req.track}
                                            </span>
                                            <span
                                                className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                                                    isPending
                                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                                        : isApproved
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                                                }`}
                                            >
                                                {req.status}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed italic">
                                            "{req.description || req.message}"
                                        </p>

                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-[#7C65F6] dark:text-purple-400" />
                                                {req.teamSize || 4} Team Members
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                Requested: {req.requestedDate || 'Today'}
                                            </span>
                                            {req.requiredSkills?.length > 0 && (
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <Award className="w-3.5 h-3.5 text-amber-500" />
                                                    {req.requiredSkills.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                                    <button
                                        onClick={() => navigate(`/mentor/teams/${req.id}`)}
                                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-navy-800 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                                        View
                                    </button>

                                    {isPending && (
                                        <>
                                            <button
                                                onClick={() => handleDecline(req.id, req.teamName)}
                                                className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                Decline
                                            </button>
                                            <button
                                                onClick={() => handleAccept(req)}
                                                className="px-4 py-2 rounded-xl bg-[#7C65F6] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Accept
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
