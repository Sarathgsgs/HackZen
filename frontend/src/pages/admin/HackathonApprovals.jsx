import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    fetchAllHackathonsForAdmin, 
    approveHackathon, 
    requestHackathonChanges, 
    rejectHackathon, 
    revertHackathonToPending,
    fetchHackathonAiReview 
} from '../../services/admin/hackathonApprovalsApi';
import { CheckIcon, TriangleAlertIcon, ShieldIcon, UsersIcon, RocketIcon, StarIcon, SearchIcon, ZapIcon, EditIcon, ClockIcon } from '../../components/AdminIcons';
import { usePlatformSettings } from '../../context/PlatformSettingsContext';
import AiAnalysisLoader from '../../components/AiAnalysisLoader';

// --- Standardized Modal Component ---
const ActionModal = ({ isOpen, onClose, title, subtitle, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200">
                <button 
                    onClick={onClose} 
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>

                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    );
};

const HackathonApprovals = () => {
    const { maxTeamSize: platformMaxTeam } = usePlatformSettings();
    const [searchParams] = useSearchParams();

    const [hackathons, setHackathons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHackathonId, setSelectedHackathonId] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState('proposal'); // 'proposal' | 'stats' | 'ai-review'
    const [actionLoading, setActionLoading] = useState(false);

    // AI Review State per Hackathon ID
    const [aiReviewsMap, setAiReviewsMap] = useState({});
    const [isAiReviewLoading, setIsAiReviewLoading] = useState(false);

    // Toast Notification State
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Modals State
    const [isRequestChangesOpen, setIsRequestChangesOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    
    // Form States
    const [changeSections, setChangeSections] = useState({
        titleOrTagline: false,
        descriptionOrProblem: false,
        scheduleDates: false,
        challengeTracks: false,
        teamRules: false,
        submissionGuidelines: false
    });
    const [feedbackNote, setFeedbackNote] = useState('');
    const [rejectReason, setRejectReason] = useState('Insufficient Problem Statement');
    const [rejectExplanation, setRejectExplanation] = useState('');

    const loadHackathons = async () => {
        setIsLoading(true);
        try {
            const data = await fetchAllHackathonsForAdmin();
            setHackathons(data || []);
            if (data && data.length > 0) {
                if (!selectedHackathonId || !data.find(d => d.id === selectedHackathonId)) {
                    setSelectedHackathonId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to load hackathons:", error);
            setHackathons([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHackathons();
    }, []);

    // Sync URL search params (id, title/search, filter tab)
    useEffect(() => {
        if (!hackathons || hackathons.length === 0) return;

        const paramId = searchParams.get('id');
        const paramSearch = searchParams.get('search') || searchParams.get('title') || searchParams.get('hackathon');
        const filter = searchParams.get('filter');

        // 1. If explicit filter tab is passed
        if (filter) {
            const f = filter.toLowerCase();
            if (f === 'approved' || f === 'active' || f === 'running' || f === 'healthy') setActiveTab('Approved');
            else if (f === 'pending' || f === 'critical') setActiveTab('Pending');
            else if (f === 'needs revision' || f === 'needs_revision' || f === 'draft' || f === 'at_risk' || f === 'at risk') setActiveTab('Needs Revision');
            else if (f === 'rejected') setActiveTab('Rejected');
            else if (f === 'all') setActiveTab('All');
        }

        // 2. If target Hackathon ID is passed
        if (paramId) {
            const found = hackathons.find(h => String(h.id) === String(paramId) || String(h._id) === String(paramId));
            if (found) {
                setSelectedHackathonId(found.id);
                if (!filter) {
                    if (found.status === 'Pending') setActiveTab('Pending');
                    else if (found.status === 'Approved' || found.status === 'Active') setActiveTab('Approved');
                    else if (found.status === 'Needs Revision' || found.status === 'Draft') setActiveTab('Needs Revision');
                    else if (found.status === 'Rejected') setActiveTab('Rejected');
                    else setActiveTab('All');
                }
                return;
            }
        }

        // 3. If target Title / Search Query is passed (e.g. "Global AI Summit 2026")
        if (paramSearch) {
            const searchLower = paramSearch.toLowerCase();
            const found = hackathons.find(h => 
                (h.title || '').toLowerCase().includes(searchLower) ||
                searchLower.includes((h.title || '').toLowerCase())
            );
            if (found) {
                setSelectedHackathonId(found.id);
                if (!filter) {
                    if (found.status === 'Pending') setActiveTab('Pending');
                    else if (found.status === 'Approved' || found.status === 'Active') setActiveTab('Approved');
                    else if (found.status === 'Needs Revision' || found.status === 'Draft') setActiveTab('Needs Revision');
                    else if (found.status === 'Rejected') setActiveTab('Rejected');
                    else setActiveTab('All');
                }
                return;
            }
        }
    }, [searchParams, hackathons]);

    // Summary Counts
    const stats = useMemo(() => {
        const total = hackathons.length;
        const pending = hackathons.filter(h => h.status === 'Pending').length;
        const approved = hackathons.filter(h => h.status === 'Approved' || h.status === 'Active').length;
        const needsRevision = hackathons.filter(h => h.status === 'Needs Revision').length;
        const rejected = hackathons.filter(h => h.status === 'Rejected').length;
        return { total, pending, approved, needsRevision, rejected };
    }, [hackathons]);

    const filteredHackathons = useMemo(() => {
        return hackathons.filter(h => {
            let matchesTab = true;
            if (activeTab === 'Pending') {
                matchesTab = h.status === 'Pending';
            } else if (activeTab === 'Approved') {
                matchesTab = h.status === 'Approved' || h.status === 'Active';
            } else if (activeTab === 'Needs Revision') {
                matchesTab = h.status === 'Needs Revision';
            } else if (activeTab === 'Rejected') {
                matchesTab = h.status === 'Rejected';
            }
            
            const q = searchQuery.toLowerCase();
            const themesStr = Array.isArray(h.themes) ? h.themes.join(' ') : String(h.themes || '');
            const matchesSearch = 
                (h.title || '').toLowerCase().includes(q) ||
                themesStr.toLowerCase().includes(q) ||
                (h.organizer?.name || '').toLowerCase().includes(q) ||
                (h.organizer?.org || '').toLowerCase().includes(q);
                
            return matchesTab && matchesSearch;
        });
    }, [hackathons, activeTab, searchQuery]);

    const selectedHackathon = hackathons.find(h => h.id === selectedHackathonId) || filteredHackathons[0] || null;

    const selectedHackathonTargetId = selectedHackathon?.id || selectedHackathon?._id;
    const currentAiReview = selectedHackathonTargetId 
        ? (aiReviewsMap[selectedHackathonTargetId] || (selectedHackathon?.id && aiReviewsMap[selectedHackathon.id]) || (selectedHackathon?._id && aiReviewsMap[selectedHackathon._id])) 
        : null;

    // Run AI review whenever switching to AI review tab or selecting another hackathon
    const handleRunAiReview = async (force = false, explicitId = null) => {
        const targetId = explicitId || selectedHackathon?.id || selectedHackathon?._id;
        if (!targetId) return;
        if (!force && (aiReviewsMap[targetId] || (selectedHackathon?.id && aiReviewsMap[selectedHackathon.id]))) return;
        
        setIsAiReviewLoading(true);
        try {
            const review = await fetchHackathonAiReview(targetId);
            if (review) {
                setAiReviewsMap(prev => ({
                    ...prev,
                    [targetId]: review,
                    ...(selectedHackathon?.id ? { [selectedHackathon.id]: review } : {}),
                    ...(selectedHackathon?._id ? { [selectedHackathon._id]: review } : {})
                }));
            } else {
                showToast("AI review generated empty evaluation", "warning");
            }
        } catch (error) {
            console.error("AI review evaluation failed:", error);
            showToast("AI evaluation failed to respond", "error");
        } finally {
            setIsAiReviewLoading(false);
        }
    };

    useEffect(() => {
        const targetId = selectedHackathon?.id || selectedHackathon?._id;
        if (activeDetailTab === 'ai-review' && targetId) {
            if (!aiReviewsMap[targetId] && !aiReviewsMap[selectedHackathon?.id]) {
                handleRunAiReview(false, targetId);
            }
        }
    }, [activeDetailTab, selectedHackathon?.id, selectedHackathon?._id]);

    // Actions
    const handleApprove = async (id) => {
        setActionLoading(true);
        try {
            await approveHackathon(id);
            setHackathons(prev => prev.map(h => h.id === id ? { ...h, status: 'Approved' } : h));
            showToast('Hackathon proposal approved and published!', 'success');
        } catch (error) {
            showToast('Failed to approve hackathon', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendChangeRequest = async () => {
        if (!selectedHackathon) return;
        setActionLoading(true);
        try {
            const selected = Object.keys(changeSections).filter(k => changeSections[k]);
            await requestHackathonChanges(selectedHackathon.id, selected, feedbackNote);
            setHackathons(prev => prev.map(h => h.id === selectedHackathon.id ? { 
                ...h, 
                status: 'Needs Revision',
                feedbackNote,
                feedbackSections: selected
            } : h));
            setIsRequestChangesOpen(false);
            setFeedbackNote('');
            setChangeSections({
                titleOrTagline: false,
                descriptionOrProblem: false,
                scheduleDates: false,
                challengeTracks: false,
                teamRules: false,
                submissionGuidelines: false
            });
            showToast('Revision request sent to organizer!', 'info');
        } catch (error) {
            showToast('Failed to send revision request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedHackathon) return;
        setActionLoading(true);
        try {
            await rejectHackathon(selectedHackathon.id, rejectReason, rejectExplanation);
            setHackathons(prev => prev.map(h => h.id === selectedHackathon.id ? { 
                ...h, 
                status: 'Rejected',
                rejectionReason: rejectReason
            } : h));
            setIsRejectOpen(false);
            setRejectExplanation('');
            showToast('Hackathon proposal marked as Rejected', 'warning');
        } catch (error) {
            showToast('Failed to reject hackathon', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevert = async (id) => {
        setActionLoading(true);
        try {
            await revertHackathonToPending(id);
            setHackathons(prev => prev.map(h => h.id === id ? { ...h, status: 'Pending' } : h));
            showToast('Hackathon proposal reverted to Pending review', 'info');
        } catch (error) {
            showToast('Failed to revert status', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 max-w-7xl mx-auto">
            
            {/* Notification Toast */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 border backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-bottom-5 ${
                    toastMessage.type === 'error'
                        ? 'bg-rose-50 border-rose-300/80 text-rose-700'
                        : toastMessage.type === 'warning'
                        ? 'bg-amber-50 border-amber-300/80 text-amber-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                    <span className="text-base">
                        {toastMessage.type === 'error' ? '⚠️' : toastMessage.type === 'warning' ? '⚡' : '✓'}
                    </span>
                    <span className="text-sm font-medium">{toastMessage.text}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Hackathon Approvals
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Audit hackathon proposals directly matching the organizer creation flow across Basic Details, Tracks, and Rules.
                    </p>
                </div>
                <button 
                    onClick={loadHackathons} 
                    disabled={isLoading}
                    title="Refresh Live Data"
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-rotate-ccw ${isLoading ? 'animate-spin' : ''}`}>
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                    <span>{isLoading ? 'Refreshing...' : 'Refresh Records'}</span>
                </button>
            </div>

            {/* Top Metric Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
                <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider truncate">
                            Total Proposals
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform text-blue-600 dark:text-blue-400 shrink-0">
                            <RocketIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-1.5">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                            {stats.total}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">All historical submissions</p>
                    </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">
                            Pending Review
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform text-amber-600 dark:text-amber-400 shrink-0">
                            <ClockIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-1.5">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight leading-tight">
                            {stats.pending}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">Awaiting admin review</p>
                    </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">
                            Approved Active
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform text-emerald-600 dark:text-emerald-400 shrink-0">
                            <CheckIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-1.5">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight leading-tight">
                            {stats.approved}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">Published & running live</p>
                    </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider truncate">
                            Needs Revision / Rejected
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center group-hover:scale-105 transition-transform text-rose-600 dark:text-rose-400 shrink-0">
                            <TriangleAlertIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-1.5">
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight leading-tight">
                            {stats.needsRevision + stats.rejected}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">Requires organizer action</p>
                    </div>
                </div>
            </div>

            {/* Main Split-Pane Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: Hackathon Directory & Queue (4 Cols) */}
                <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-[360px] sm:h-[480px] lg:h-[680px]">
                    
                    {/* Status Filter Tabs */}
                    <div className="p-3 border-b border-slate-100 dark:border-white/5 flex gap-1.5 shrink-0 bg-slate-50/50 dark:bg-white/[0.02] overflow-x-auto scrollbar-hide">
                        {['All', 'Pending', 'Approved', 'Needs Revision', 'Rejected'].map((tab) => {
                            const count = tab === 'All' ? hackathons.length :
                                          tab === 'Pending' ? stats.pending :
                                          tab === 'Approved' ? stats.approved :
                                          tab === 'Needs Revision' ? stats.needsRevision :
                                          stats.rejected;
                            const isActive = activeTab === tab;
                            return (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-1.5 px-3 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                                        isActive 
                                        ? 'bg-blue-50 dark:bg-blue-500/20 text-[#2563eb] dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 shadow-xs' 
                                        : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                    }`}
                                >
                                    <span>{tab}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-blue-200/70 dark:bg-blue-400/20 text-blue-800 dark:text-blue-200' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div className="p-3 border-b border-slate-100 dark:border-white/5 shrink-0">
                        <div className="relative">
                            <SearchIcon className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400 dark:text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Search by title, track, organizer..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2563eb] transition-colors"
                            />
                        </div>
                    </div>

                    {/* Cards Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center text-xs text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider animate-pulse">
                                Loading Hackathon Proposals...
                            </div>
                        ) : filteredHackathons.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-gray-400 text-xs">
                                No hackathons match the selected filter.
                            </div>
                        ) : (
                            filteredHackathons.map((hackathon) => {
                                const isSelected = selectedHackathonId === hackathon.id;
                                return (
                                    <div 
                                        key={hackathon.id} 
                                        onClick={() => setSelectedHackathonId(hackathon.id)}
                                        className={`p-3.5 rounded-xl cursor-pointer transition-all border text-left ${
                                            isSelected 
                                            ? 'bg-blue-50/80 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/60 shadow-sm' 
                                            : 'bg-white dark:bg-navy-800/40 border-slate-200/80 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                            <div className="min-w-0 pr-1">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{hackathon.title}</h4>
                                                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5">{hackathon.organizer?.name || 'Platform Organizer'}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">{hackathon.organizer?.org}</p>
                                            </div>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                                hackathon.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                hackathon.status === 'Needs Revision' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                                hackathon.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                            }`}>
                                                {hackathon.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-gray-500 font-mono">
                                            <span className="truncate max-w-[150px]">
                                                {Array.isArray(hackathon.themes) ? hackathon.themes.join(', ') : hackathon.themes || 'General'}
                                            </span>
                                            <span>{hackathon.dates?.start || 'TBD'}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Detail Investigation Workspace (8 Cols) */}
                <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden flex flex-col relative min-h-[500px] lg:h-[680px]">
                    {selectedHackathon ? (
                        <>
                            {/* Selected Hackathon Top Bar */}
                            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm">
                                        <RocketIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{selectedHackathon.title}</h2>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                                selectedHackathon.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                selectedHackathon.status === 'Needs Revision' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                                selectedHackathon.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                            }`}>
                                                {selectedHackathon.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                                            Organized by <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedHackathon.organizer?.name}</span> ({selectedHackathon.organizer?.org})
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-bold">Event Schedule</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                                        {selectedHackathon.dates?.start} &rarr; {selectedHackathon.dates?.end}
                                    </p>
                                </div>
                            </div>

                            {/* Sub-tab Navigation */}
                            <div className="flex border-b border-slate-100 dark:border-white/5 px-4 pt-1.5 gap-3 shrink-0 bg-white dark:bg-navy-900 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'proposal', label: '1. Proposal Details', icon: <RocketIcon className="w-3.5 h-3.5" /> },
                                    { id: 'stats', label: '2. Organizer & Event Stats', icon: <UsersIcon className="w-3.5 h-3.5" /> },
                                    { id: 'ai-review', label: '3. Feasibility & AI Review', icon: <ZapIcon className="w-3.5 h-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveDetailTab(tab.id);
                                            if (tab.id === 'ai-review') {
                                                const targetId = selectedHackathon?.id || selectedHackathon?._id;
                                                if (targetId && !aiReviewsMap[targetId]) {
                                                    handleRunAiReview(false, targetId);
                                                }
                                            }
                                        }}
                                        className={`pb-3 px-1 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                                            activeDetailTab === tab.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-slate-400 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Main Body per Active Tab */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                                
                                {activeDetailTab === 'proposal' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Status Alert if Needs Revision or Rejected */}
                                        {selectedHackathon.status === 'Needs Revision' && selectedHackathon.feedbackNote && (
                                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                                                <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-700 dark:text-amber-300">
                                                    <TriangleAlertIcon className="w-4 h-4 text-amber-500 shrink-0" /> Organizer Revision Requested:
                                                </p>
                                                <p className="font-medium pl-5 leading-relaxed">{selectedHackathon.feedbackNote}</p>
                                            </div>
                                        )}

                                        {selectedHackathon.status === 'Rejected' && selectedHackathon.rejectionReason && (
                                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs">
                                                <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-700 dark:text-rose-300">
                                                    <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" /> Proposal Rejection Justification:
                                                </p>
                                                <p className="font-medium pl-5 leading-relaxed">{selectedHackathon.rejectionReason}</p>
                                            </div>
                                        )}

                                        {/* 1. Step 1: Basic Details & Overview */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5 flex items-center justify-between">
                                                <span>Step 1: Basic Details & Overview</span>
                                                <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">Status: {selectedHackathon.status}</span>
                                            </h4>
                                            
                                            <div className="space-y-3.5 text-xs">
                                                <div>
                                                    <span className="text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[10px] block mb-1">Tagline / Motto</span>
                                                    <p className="text-blue-600 dark:text-blue-400 font-medium italic">"{selectedHackathon.tagline}"</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[10px] block mb-1">Event Description</span>
                                                    <p className="text-slate-700 dark:text-gray-300 leading-relaxed">{selectedHackathon.description}</p>
                                                </div>
                                                {selectedHackathon.problemStatement && (
                                                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[10px] block mb-1">Problem Statement</span>
                                                        <p className="text-slate-800 dark:text-gray-200 leading-relaxed font-mono bg-white dark:bg-black/20 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                                                            {selectedHackathon.problemStatement}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Timeline & Registration Windows */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5">
                                                Event Timeline & Registration Windows
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                <div className="p-3.5 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Registration Window</span>
                                                    <p className="font-bold text-slate-900 dark:text-white font-mono">
                                                        {selectedHackathon.dates?.regStart} &rarr; {selectedHackathon.dates?.regEnd}
                                                    </p>
                                                </div>
                                                <div className="p-3.5 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Hackathon Execution Window</span>
                                                    <p className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                                                        {selectedHackathon.dates?.start} &rarr; {selectedHackathon.dates?.end}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Step 2: Tracks & Categories */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5 flex items-center justify-between">
                                                <span>Step 2: Challenge Tracks & Themes</span>
                                                <span className="font-mono text-blue-600 dark:text-blue-400 text-xs font-bold">{selectedHackathon.tracks?.length || 1} Tracks Configured</span>
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {selectedHackathon.tracks?.map((track, i) => (
                                                    <div key={i} className="p-3.5 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-xs">
                                                        <h5 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                                            {track.title}
                                                        </h5>
                                                        <p className="text-slate-500 dark:text-gray-400 leading-relaxed text-[11px]">{track.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 4. Step 3: Rules & Participation Settings */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5">
                                                Step 3: Participation Settings & Rules
                                            </h4>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 text-xs">
                                                <div className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-center">
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-gray-500 block">Team Limit</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">{selectedHackathon.minTeamSize}-{selectedHackathon.maxTeamSize} Members</span>
                                                    {Number(selectedHackathon.maxTeamSize) > platformMaxTeam ? (
                                                        <span className="text-[8px] font-bold uppercase text-amber-500 block mt-0.5 tracking-tight">Exceeds Baseline ({platformMaxTeam})</span>
                                                    ) : (
                                                        <span className="text-[8px] font-semibold text-emerald-500 block mt-0.5 tracking-tight">Within Baseline (Max {platformMaxTeam})</span>
                                                    )}
                                                </div>
                                                <div className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-center">
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-gray-500 block">Visibility</span>
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">{selectedHackathon.isPublic ? 'Public Event' : 'Private Event'}</span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-center">
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-gray-500 block">Auto-Approval</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">{selectedHackathon.autoApprove ? 'Enabled' : 'Manual'}</span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-center">
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-gray-500 block">Submission Fee</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Free</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-3 border-t border-slate-200/60 dark:border-white/5">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Official Submission Rules</span>
                                                <ul className="space-y-1 text-xs text-slate-700 dark:text-gray-300">
                                                    {Array.isArray(selectedHackathon.rules) ? selectedHackathon.rules.map((rule, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <span className="font-bold text-blue-500">{idx + 1}.</span>
                                                            <span>{rule}</span>
                                                        </li>
                                                    )) : (
                                                        <p className="font-mono">{selectedHackathon.rules}</p>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'stats' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Organizer Intelligence Card */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5">
                                                Host Organizer Profile & Trust Matrix
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                <div className="space-y-2.5">
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Organizer Name</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedHackathon.organizer?.name}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Organization</span>
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">{selectedHackathon.organizer?.org}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2.5">
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Official Email</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedHackathon.organizer?.email || "organizer@platform.org"}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Past Events Hosted</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedHackathon.organizer?.pastEvents || 1} Events</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Real-time Activity Stats */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-4 rounded-xl bg-white dark:bg-navy-800/50 border border-slate-200/70 dark:border-white/10 text-center shadow-xs">
                                                <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedHackathon.stats?.participants || 0}</p>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mt-1">Registrations</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white dark:bg-navy-800/50 border border-slate-200/70 dark:border-white/10 text-center shadow-xs">
                                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{selectedHackathon.stats?.teams || 0}</p>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mt-1">Teams Formed</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white dark:bg-navy-800/50 border border-slate-200/70 dark:border-white/10 text-center shadow-xs">
                                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{selectedHackathon.stats?.submissions || 0}</p>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mt-1">Submissions</p>
                                            </div>
                                        </div>

                                        {/* Audit Timeline */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5">
                                                Proposal Milestone Record
                                            </h4>
                                            <div className="space-y-3 text-xs">
                                                <div className="flex items-start gap-3">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0"></span>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">Proposal Drafted by Organizer</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-gray-500">{selectedHackathon.createdAt}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0"></span>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">Submitted for Administrative Review</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-gray-500">Current Queue State</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'ai-review' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                <ZapIcon className="w-4 h-4" /> AI Feasibility & Rubric Analysis
                                            </h4>
                                            <button 
                                                onClick={() => handleRunAiReview(true)}
                                                disabled={isAiReviewLoading}
                                                className="px-4 py-2 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                                            >
                                                {isAiReviewLoading ? 'Analyzing...' : 'Re-Run AI Analysis'}
                                            </button>
                                        </div>

                                        {isAiReviewLoading ? (
                                            <AiAnalysisLoader 
                                                label="Performing AI Feasibility Analysis..." 
                                                subtext="Evaluating track problem statements, timeline schedule sanity, and rule compliance..."
                                            />
                                        ) : currentAiReview ? (
                                            <div className="space-y-4 text-xs">
                                                {/* Score Overview */}
                                                <div className="p-5 rounded-2xl border bg-blue-50/70 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold uppercase tracking-wider text-[10px] text-blue-700 dark:text-blue-300 block mb-1">Proposal Score</span>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                                                                {currentAiReview.overallScore !== undefined ? currentAiReview.overallScore : 75}
                                                            </span>
                                                            <span className="text-xs text-slate-500 font-bold">/ 100</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-gray-400 block mb-1">AI Recommendation</span>
                                                        <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase border ${
                                                            currentAiReview.recommendation === 'APPROVE' 
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                                : currentAiReview.recommendation === 'REJECT'
                                                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                        }`}>
                                                            {currentAiReview.recommendation ? currentAiReview.recommendation.replace(/_/g, ' ') : 'APPROVE'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Compliance & Audit Badges */}
                                                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border bg-slate-50 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Audited Items:</span>
                                                    {currentAiReview.timelineValid !== undefined && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            currentAiReview.timelineValid 
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                        }`}>
                                                            {currentAiReview.timelineValid 
                                                                ? `✓ Timeline Valid (${currentAiReview.timelineDetails?.durationDays ?? 'Multi'}d)` 
                                                                : `⚠ ${currentAiReview.timelineStatus === 'INVALID_REVERSED' ? 'Reversed Timeline' : 'Timeline Incomplete'}`}
                                                        </span>
                                                    )}
                                                    {currentAiReview.hasPrizePool !== undefined && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            currentAiReview.hasPrizePool 
                                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                                                                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                        }`}>
                                                            {currentAiReview.hasPrizePool ? '✓ Prize Incentives' : '○ Prize Pool Missing'}
                                                        </span>
                                                    )}
                                                    {currentAiReview.hasJudgingCriteria !== undefined && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            currentAiReview.hasJudgingCriteria 
                                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                        }`}>
                                                            {currentAiReview.hasJudgingCriteria ? '✓ Judging Rubric' : '⚠ Rubric Missing'}
                                                        </span>
                                                    )}
                                                    {currentAiReview.rulesCount !== undefined && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            currentAiReview.rulesCount > 0 
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                        }`}>
                                                            {currentAiReview.rulesCount > 0 ? `✓ ${currentAiReview.rulesCount} Rules Defined` : '⚠ Rules Missing'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Metric Bars */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3.5 rounded-xl border bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/5">
                                                        <div className="flex justify-between font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                                                            <span>Clarity & Problem Scope</span>
                                                            <span className="text-blue-600 dark:text-blue-400">
                                                                {currentAiReview.clarityScore !== undefined ? currentAiReview.clarityScore : 70}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                                                style={{ width: `${Math.min(100, Math.max(5, currentAiReview.clarityScore !== undefined ? currentAiReview.clarityScore : 70))}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    <div className="p-3.5 rounded-xl border bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/5">
                                                        <div className="flex justify-between font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                                                            <span>Timeline & Feasibility</span>
                                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                                {currentAiReview.feasibilityScore !== undefined ? currentAiReview.feasibilityScore : 70}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                                                style={{ width: `${Math.min(100, Math.max(5, currentAiReview.feasibilityScore !== undefined ? currentAiReview.feasibilityScore : 70))}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Strengths & Concerns */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {currentAiReview.strengths && (
                                                        <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/20">
                                                            <span className="font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 text-[10px] block mb-1.5">✓ Strengths</span>
                                                            <ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300 text-[11px]">
                                                                {currentAiReview.strengths.map((s, i) => (
                                                                    <li key={i}>{s}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {currentAiReview.concerns && (
                                                        <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/20">
                                                            <span className="font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 text-[10px] block mb-1.5">⚠ Improvement Areas</span>
                                                            <ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300 text-[11px]">
                                                                {currentAiReview.concerns.map((c, i) => (
                                                                    <li key={i}>{c}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Suggested Feedback Note */}
                                                {currentAiReview.suggestedFeedback && (
                                                    <div className="p-4 rounded-xl border bg-blue-50/70 dark:bg-black/30 border-blue-200 dark:border-white/5">
                                                        <span className="font-bold text-[10px] uppercase text-blue-700 dark:text-blue-400 block mb-1">Recommended Organizer Guidance</span>
                                                        <p className="text-slate-700 dark:text-gray-300 italic mb-2.5 leading-relaxed">{currentAiReview.suggestedFeedback}</p>
                                                        <button 
                                                            onClick={() => {
                                                                setFeedbackNote(currentAiReview.suggestedFeedback);
                                                                setIsRequestChangesOpen(true);
                                                            }}
                                                            className="px-4 py-2 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                                        >
                                                            Use as Revision Feedback &rarr;
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Quick Apply AI Recommendation Banner */}
                                                <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                                                    <div>
                                                        <span className="font-bold text-xs uppercase tracking-wider text-blue-800 dark:text-blue-300 block mb-0.5">
                                                            Quick Apply AI Recommendation: {currentAiReview.recommendation ? currentAiReview.recommendation.replace(/_/g, ' ') : 'APPROVE'}
                                                        </span>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                                            {currentAiReview.recommendation === 'APPROVE' && "Proposal satisfies all criteria. One click applies platform approval."}
                                                            {currentAiReview.recommendation === 'REQUEST_CHANGES' && "Sends revision guidance directly to the organizer with pre-filled feedback."}
                                                            {currentAiReview.recommendation === 'REJECT' && "Rejects proposal and communicates identified shortcomings."}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {currentAiReview.recommendation === 'APPROVE' && (
                                                            <button
                                                                onClick={() => handleApprove(selectedHackathon.id)}
                                                                disabled={actionLoading}
                                                                className="px-5 py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-500/30 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                Approve Proposal Now
                                                            </button>
                                                        )}
                                                        {currentAiReview.recommendation === 'REQUEST_CHANGES' && (
                                                            <button
                                                                onClick={() => {
                                                                    setFeedbackNote(currentAiReview.suggestedFeedback || "Please address the itemized recommendations before resubmitting.");
                                                                    setIsRequestChangesOpen(true);
                                                                }}
                                                                disabled={actionLoading}
                                                                className="px-5 py-2 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/30 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                                Request Changes with AI Note
                                                            </button>
                                                        )}
                                                        {currentAiReview.recommendation === 'REJECT' && (
                                                            <button
                                                                onClick={() => {
                                                                    setFeedbackNote(currentAiReview.suggestedFeedback || "Proposal does not meet minimum quality criteria.");
                                                                    setIsRejectOpen(true);
                                                                }}
                                                                disabled={actionLoading}
                                                                className="px-5 py-2 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-500/30 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                Reject Proposal with AI Note
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-3">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/20 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <ZapIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white">AI Feasibility Rubric Ready to Run</p>
                                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Click below to generate an automated feasibility, clarity, and rules evaluation.</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleRunAiReview(true)}
                                                    disabled={isAiReviewLoading}
                                                    className="px-5 py-2.5 bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-300/80 dark:border-blue-500/30 font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <ZapIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                    {isAiReviewLoading ? 'Analyzing...' : 'Generate AI Proposal Review'}
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                )}

                            </div>

                            {/* Bottom Action Bar */}
                            <div className="p-4 bg-white dark:bg-navy-900 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                                <div className="text-xs font-bold text-slate-500 dark:text-gray-400">
                                    Status: <span className="font-extrabold text-slate-900 dark:text-white uppercase">{selectedHackathon.status}</span>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2">
                                    {(selectedHackathon.status === 'Pending' || selectedHackathon.status === 'Needs Revision') && (
                                        <>
                                            <button 
                                                onClick={() => setIsRejectOpen(true)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                                            >
                                                Reject Proposal
                                            </button>
                                            <button 
                                                onClick={() => setIsRequestChangesOpen(true)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                                            >
                                                Request Revision
                                            </button>
                                            <button 
                                                onClick={() => handleApprove(selectedHackathon.id)}
                                                disabled={actionLoading}
                                                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-blue-500/20 text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5 text-white" />
                                                Approve & Publish
                                            </button>
                                        </>
                                    )}

                                    {selectedHackathon.status === 'Approved' && (
                                        <button 
                                            onClick={() => handleRevert(selectedHackathon.id)}
                                            disabled={actionLoading}
                                            className="px-4 py-2 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                                        >
                                            Revert to Pending
                                        </button>
                                    )}

                                    {selectedHackathon.status === 'Rejected' && (
                                        <>
                                            <button 
                                                onClick={() => handleApprove(selectedHackathon.id)}
                                                disabled={actionLoading}
                                                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-blue-500/20 text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5 text-white" />
                                                Re-Approve Proposal
                                            </button>
                                            <button 
                                                onClick={() => handleRevert(selectedHackathon.id)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                                            >
                                                Revert to Pending
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 p-8 text-center">
                            <RocketIcon className="w-12 h-12 mb-3 opacity-30 text-blue-500" />
                            <p className="font-bold text-sm text-slate-700 dark:text-gray-300">Select a hackathon proposal from the left list to review.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* REQUEST REVISION MODAL */}
            <ActionModal 
                isOpen={isRequestChangesOpen} 
                onClose={() => setIsRequestChangesOpen(false)} 
                title="Request Proposal Revisions"
                subtitle="Select specific sections the organizer needs to modify before publishing."
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { key: 'titleOrTagline', label: 'Title or Tagline Details' },
                            { key: 'descriptionOrProblem', label: 'Description & Problem Statement' },
                            { key: 'scheduleDates', label: 'Event Schedule & Timelines' },
                            { key: 'challengeTracks', label: 'Challenge Tracks & Themes' },
                            { key: 'teamRules', label: 'Team Limit Constraints' },
                            { key: 'submissionGuidelines', label: 'Submission Rules & Policy' },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10">
                                <input 
                                    type="checkbox" 
                                    className="rounded text-blue-600 focus:ring-blue-500" 
                                    checked={changeSections[key]} 
                                    onChange={(e) => setChangeSections({...changeSections, [key]: e.target.checked})} 
                                /> 
                                <span className="font-medium truncate">{label}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                            Revision Feedback Note to Organizer:
                        </label>
                        <textarea 
                            placeholder="Detail exactly what modifications are requested..." 
                            rows="3" 
                            value={feedbackNote} 
                            onChange={(e) => setFeedbackNote(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#2563eb] transition-colors resize-none"
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                        <button 
                            onClick={() => setIsRequestChangesOpen(false)} 
                            className="px-4 py-2.5 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSendChangeRequest} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/30 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? 'Submitting...' : 'Send Revision Request'}
                        </button>
                    </div>
                </div>
            </ActionModal>

            {/* REJECT MODAL */}
            <ActionModal 
                isOpen={isRejectOpen} 
                onClose={() => setIsRejectOpen(false)} 
                title="Reject Hackathon Proposal"
                subtitle="Select the justification for rejecting this proposal."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {[
                            'Insufficient Problem Statement',
                            'Invalid Event Timeline / Schedule',
                            'Policy Violation',
                            'Duplicate Event Proposal',
                            'Organizer Verification Incomplete',
                            'Other Administrative Grounds'
                        ].map(reason => (
                            <label key={reason} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10">
                                <input 
                                    type="radio" 
                                    name="rejectReason" 
                                    value={reason} 
                                    checked={rejectReason === reason}
                                    onChange={(e) => setRejectReason(e.target.value)} 
                                    className="text-rose-600 focus:ring-rose-500" 
                                /> 
                                <span className="font-bold">{reason}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                            Additional Context (Optional):
                        </label>
                        <textarea 
                            placeholder="Provide any additional explanation for audit log..." 
                            rows="2" 
                            value={rejectExplanation} 
                            onChange={(e) => setRejectExplanation(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 transition-colors resize-none"
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                        <button 
                            onClick={() => setIsRejectOpen(false)} 
                            className="px-4 py-2.5 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleReject} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-500/30 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                    </div>
                </div>
            </ActionModal>

        </div>
    );
};

export default HackathonApprovals;
