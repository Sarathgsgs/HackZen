import React, { useState, useEffect, useMemo } from 'react';
import { CheckIcon, TriangleAlertIcon, ShieldIcon, UsersIcon, RocketIcon, StarIcon, SearchIcon, ZapIcon, ClockIcon } from '../../components/AdminIcons';
import AiAnalysisLoader from '../../components/AiAnalysisLoader';
import { 
    fetchOrganizerApprovals, 
    updateOrganizerStatus, 
    sendChangeRequest, 
    rejectOrganizer, 
    suspendOrganizer, 
    revertToPending,
    fetchOrganizerAiReview
} from '../../services/admin/organizerApprovalsApi';

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

const OrganizerApprovals = () => {
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAppId, setSelectedAppId] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState('registration'); // 'registration' | 'history' | 'risk'
    const [actionLoading, setActionLoading] = useState(false);

    // AI Review State per Organizer Application ID
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
    const [isSuspendOpen, setIsSuspendOpen] = useState(false);
    
    // Form States
    const [changeRequests, setChangeRequests] = useState({ 
        organization: false, 
        orgType: false, 
        designation: false, 
        website: false, 
        phone: false, 
        bio: false 
    });
    const [changeMessage, setChangeMessage] = useState('');
    const [rejectReason, setRejectReason] = useState('Incomplete Information');
    const [rejectMessage, setRejectMessage] = useState('');
    const [suspendReason, setSuspendReason] = useState('Policy Violation');

    const loadOrganizers = async () => {
        setIsLoading(true);
        try {
            const data = await fetchOrganizerApprovals();
            setApplications(data || []);
            if (data && data.length > 0) {
                if (!selectedAppId || !data.find(d => d.id === selectedAppId)) {
                    setSelectedAppId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch organizers from database:", error);
            setApplications([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrganizers();
    }, []);

    const currentAiReview = selectedAppId ? aiReviewsMap[selectedAppId] : null;

    const handleRunAiReview = async (force = false) => {
        if (!selectedAppId) return;
        if (!force && aiReviewsMap[selectedAppId]) return;
        
        setIsAiReviewLoading(true);
        try {
            const review = await fetchOrganizerAiReview(selectedAppId);
            setAiReviewsMap(prev => ({
                ...prev,
                [selectedAppId]: review
            }));
        } catch (error) {
            console.error("AI organizer review evaluation failed:", error);
            showToast("AI risk evaluation failed to respond", "error");
        } finally {
            setIsAiReviewLoading(false);
        }
    };

    useEffect(() => {
        if (activeDetailTab === 'risk' && selectedAppId) {
            if (!aiReviewsMap[selectedAppId]) {
                handleRunAiReview();
            }
        }
    }, [activeDetailTab, selectedAppId]);

    // Summary Counts
    const stats = useMemo(() => {
        const total = applications.length;
        const pending = applications.filter(a => a.status === 'Pending' || a.status === 'Needs Changes').length;
        const approved = applications.filter(a => a.status === 'Approved').length;
        const rejected = applications.filter(a => a.status === 'Rejected' || a.status === 'Suspended').length;
        return { total, pending, approved, rejected };
    }, [applications]);

    const filteredApps = useMemo(() => {
        return applications.filter(app => {
            let matchesTab = true;
            if (activeTab === 'Pending') {
                matchesTab = app.status === 'Pending' || app.status === 'Needs Changes';
            } else if (activeTab === 'Approved') {
                matchesTab = app.status === 'Approved';
            } else if (activeTab === 'Rejected') {
                matchesTab = app.status === 'Rejected';
            } else if (activeTab === 'Suspended') {
                matchesTab = app.status === 'Suspended';
            }
            
            const q = searchQuery.toLowerCase();
            const matchesSearch = 
                (app.applicantName || '').toLowerCase().includes(q) ||
                (app.organization || '').toLowerCase().includes(q) ||
                (app.email || '').toLowerCase().includes(q) ||
                (app.designation || '').toLowerCase().includes(q);
                
            return matchesTab && matchesSearch;
        });
    }, [applications, activeTab, searchQuery]);

    const selectedApp = applications.find(app => app.id === selectedAppId) || filteredApps[0] || null;

    // Action Handlers
    const handleApprove = async (id) => {
        setActionLoading(true);
        try {
            await updateOrganizerStatus(id, 'Approved', 'Approved by administrator');
            setApplications(apps => apps.map(app => app.id === id ? { ...app, status: 'Approved' } : app));
            showToast('Organizer successfully approved and activated!', 'success');
        } catch (error) {
            showToast('Failed to approve organizer', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendChangeRequest = async () => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            const selectedSections = Object.keys(changeRequests).filter(k => changeRequests[k]);
            await sendChangeRequest(selectedApp.id, selectedSections, changeMessage);
            setApplications(apps => apps.map(app => app.id === selectedApp.id ? { 
                ...app, 
                status: 'Needs Changes', 
                changeRequest: changeMessage,
                changeSections: selectedSections 
            } : app));
            setIsRequestChangesOpen(false);
            setChangeMessage('');
            setChangeRequests({ organization: false, orgType: false, designation: false, website: false, phone: false, bio: false });
            showToast('Change request sent to organizer!', 'info');
        } catch (error) {
            showToast('Failed to submit change request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedApp) return;
        if (!rejectReason) return alert("Please select a rejection reason.");
        setActionLoading(true);
        try {
            await rejectOrganizer(selectedApp.id, rejectReason, rejectMessage);
            setApplications(apps => apps.map(app => app.id === selectedApp.id ? { 
                ...app, 
                status: 'Rejected', 
                rejectionReason: rejectReason 
            } : app));
            setIsRejectOpen(false);
            setRejectReason('Incomplete Information');
            setRejectMessage('');
            showToast('Organizer application rejected', 'warning');
        } catch (error) {
            showToast('Failed to reject organizer', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            await suspendOrganizer(selectedApp.id, suspendReason);
            setApplications(apps => apps.map(app => app.id === selectedApp.id ? { ...app, status: 'Suspended' } : app));
            setIsSuspendOpen(false);
            showToast('Organizer account suspended', 'warning');
        } catch (error) {
            showToast('Failed to suspend organizer', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevert = async (id) => {
        setActionLoading(true);
        try {
            await revertToPending(id);
            setApplications(apps => apps.map(app => app.id === id ? { ...app, status: 'Pending' } : app));
            showToast('Application reverted to pending state', 'info');
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
                        : 'bg-violet-50 border-violet-300/80 text-violet-700'
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
                        Organizer Approvals
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Verify credentials and approve organizer applications based on their submitted registration details.
                    </p>
                </div>
                <button 
                    onClick={loadOrganizers} 
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
                            Total Applicants
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform text-indigo-600 dark:text-indigo-400 shrink-0">
                            <UsersIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-1.5">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                            {stats.total}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">Submitted applications</p>
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
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">Awaiting decision</p>
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
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">Verified host organizers</p>
                    </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider truncate">
                            Rejected / Suspended
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center group-hover:scale-105 transition-transform text-rose-600 dark:text-rose-400 shrink-0">
                            <TriangleAlertIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-1.5">
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight leading-tight">
                            {stats.rejected}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">Revoked or non-compliant</p>
                    </div>
                </div>
            </div>

            {/* Main Split-Pane Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT PANE: Application Directory (4 cols) */}
                <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-[360px] sm:h-[480px] lg:h-[680px]">
                    
                    {/* Status Filter Tabs */}
                    <div className="p-3 border-b border-slate-100 dark:border-white/5 flex gap-1.5 shrink-0 bg-slate-50/50 dark:bg-white/[0.02] overflow-x-auto scrollbar-hide">
                        {['All', 'Pending', 'Approved', 'Rejected', 'Suspended'].map((tab) => {
                            const count = tab === 'All' ? applications.length :
                                          tab === 'Pending' ? stats.pending :
                                          tab === 'Approved' ? stats.approved :
                                          tab === 'Rejected' ? applications.filter(a => a.status === 'Rejected').length :
                                          applications.filter(a => a.status === 'Suspended').length;
                            const isActive = activeTab === tab;
                            return (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-1.5 px-3 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                                        isActive 
                                        ? 'bg-purple-50 dark:bg-purple-500/20 text-[#6D5CE8] dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 shadow-xs' 
                                        : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                    }`}
                                >
                                    <span>{tab}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-indigo-200/70 dark:bg-indigo-400/20 text-indigo-800 dark:text-indigo-200' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'}`}>
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
                                placeholder="Search by name, org, email..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Cards Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center text-xs text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider animate-pulse">
                                Fetching Live Organizer Records...
                            </div>
                        ) : filteredApps.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-gray-400 text-xs">
                                No applications match the selected filter.
                            </div>
                        ) : (
                            filteredApps.map((app) => {
                                const isSelected = selectedAppId === app.id;
                                return (
                                    <div 
                                        key={app.id} 
                                        onClick={() => setSelectedAppId(app.id)}
                                        className={`p-3.5 rounded-xl cursor-pointer transition-all border text-left ${
                                            isSelected 
                                            ? 'bg-indigo-50/80 dark:bg-indigo-500/15 border-indigo-400 dark:border-indigo-500/60 shadow-sm' 
                                            : 'bg-white dark:bg-navy-800/40 border-slate-200/80 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                            <div className="min-w-0 pr-1">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{app.applicantName}</h4>
                                                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">{app.organization}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">{app.email}</p>
                                            </div>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                                app.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                app.status === 'Needs Changes' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                                app.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                                                app.status === 'Suspended' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                                'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-white/10'
                                            }`}>
                                                {app.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-gray-500 font-mono">
                                            <span>Score: <strong className={app.verificationScore >= 80 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>{app.verificationScore}%</strong></span>
                                            <span>{app.appliedDate}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Detail Investigation Workspace (8 cols) */}
                <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden flex flex-col relative min-h-[500px] lg:h-[680px]">
                    {selectedApp ? (
                        <>
                            {/* Selected Organizer Profile Top Bar */}
                            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/30 font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                                        {selectedApp.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'OR'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{selectedApp.applicantName}</h2>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                                selectedApp.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                selectedApp.status === 'Needs Changes' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                                selectedApp.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                                                selectedApp.status === 'Suspended' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                                'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                            }`}>
                                                {selectedApp.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                                            {selectedApp.designation} &bull; <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedApp.organization}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-bold">Completeness Score</p>
                                    <p className={`text-lg sm:text-xl font-extrabold tracking-tight mt-0.5 ${selectedApp.verificationScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {selectedApp.verificationScore}%
                                    </p>
                                </div>
                            </div>

                            {/* Sub-tab Navigation */}
                            <div className="flex border-b border-slate-100 dark:border-white/5 px-4 pt-1.5 gap-3 shrink-0 bg-white dark:bg-navy-900 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'registration', label: '1. Registration Details', icon: <UsersIcon className="w-3.5 h-3.5" /> },
                                    { id: 'history', label: '2. Platform History', icon: <RocketIcon className="w-3.5 h-3.5" /> },
                                    { id: 'risk', label: '3. Risk & AI Assessment', icon: <ShieldIcon className="w-3.5 h-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveDetailTab(tab.id)}
                                        className={`pb-2.5 px-1 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                                            activeDetailTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
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
                                
                                {activeDetailTab === 'registration' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Status Alert if Needs Changes or Rejected */}
                                        {selectedApp.status === 'Needs Changes' && selectedApp.changeRequest && (
                                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                                                <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-700 dark:text-amber-300">
                                                    <TriangleAlertIcon className="w-4 h-4 text-amber-500 shrink-0" /> Pending Organizer Changes:
                                                </p>
                                                <p className="font-medium pl-5 leading-relaxed">{selectedApp.changeRequest}</p>
                                            </div>
                                        )}

                                        {selectedApp.status === 'Rejected' && selectedApp.rejectionReason && (
                                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs">
                                                <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-700 dark:text-rose-300">
                                                    <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" /> Rejection Reason:
                                                </p>
                                                <p className="font-medium pl-5 leading-relaxed">{selectedApp.rejectionReason}</p>
                                            </div>
                                        )}

                                        {/* 1. Identity & Contact Box */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5 flex items-center justify-between">
                                                <span>Submitted Applicant Information</span>
                                                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">Role: {selectedApp.role}</span>
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                <div className="space-y-2.5">
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Full Name</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.applicantName}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Registered Email</span>
                                                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                                            {selectedApp.email} 
                                                            {selectedApp.emailVerified && <CheckIcon className="w-3.5 h-3.5 text-emerald-500 inline" />}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Contact Phone</span>
                                                        <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedApp.phone || "Not Provided"}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2.5">
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Account Created</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.appliedDate}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Designation / Title</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.designation}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Domain</span>
                                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedApp.domain}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Institutional Credentials */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5">
                                                Institution & Organization Credentials
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                                                <div className="space-y-2.5">
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Organization Name</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.organization}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Institution Type</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.orgType}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2.5">
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Official Website</span>
                                                        <a 
                                                            href={selectedApp.website.startsWith('http') ? selectedApp.website : `https://${selectedApp.website}`} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                                                        >
                                                            {selectedApp.website}
                                                        </a>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Applicant Designation</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.designation}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Bio Dossier */}
                                            {selectedApp.bio && (
                                                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
                                                    <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mb-1">Organization / Event Bio</p>
                                                    <p className="text-xs text-slate-700 dark:text-gray-300 italic leading-relaxed">{selectedApp.bio}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* 3. Onboarding Verification Checklist */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5">
                                                Onboarding Data Completeness Checklist
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                                <div className={`p-3 rounded-xl border flex items-center justify-between ${selectedApp.checklist?.emailVerified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    <span className="font-bold">Email Verified</span>
                                                    <span className="flex items-center gap-1 font-bold">{selectedApp.checklist?.emailVerified ? <><CheckIcon className="w-3.5 h-3.5" /> Verified</> : <><TriangleAlertIcon className="w-3.5 h-3.5" /> Pending</>}</span>
                                                </div>
                                                <div className={`p-3 rounded-xl border flex items-center justify-between ${selectedApp.checklist?.organizationProvided ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    <span className="font-bold">Organization Name</span>
                                                    <span className="flex items-center gap-1 font-bold">{selectedApp.checklist?.organizationProvided ? <><CheckIcon className="w-3.5 h-3.5" /> Provided</> : <><TriangleAlertIcon className="w-3.5 h-3.5" /> Missing</>}</span>
                                                </div>
                                                <div className={`p-3 rounded-xl border flex items-center justify-between ${selectedApp.checklist?.orgTypeProvided ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    <span className="font-bold">Institution Type</span>
                                                    <span className="flex items-center gap-1 font-bold">{selectedApp.checklist?.orgTypeProvided ? <><CheckIcon className="w-3.5 h-3.5" /> Configured</> : <><TriangleAlertIcon className="w-3.5 h-3.5" /> Missing</>}</span>
                                                </div>
                                                <div className={`p-3 rounded-xl border flex items-center justify-between ${selectedApp.checklist?.websiteProvided ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    <span className="font-bold">Official Website URL</span>
                                                    <span className="flex items-center gap-1 font-bold">{selectedApp.checklist?.websiteProvided ? <><CheckIcon className="w-3.5 h-3.5" /> Provided</> : <><TriangleAlertIcon className="w-3.5 h-3.5" /> Missing</>}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. AI Recommendation Box */}
                                        <div className="p-4 rounded-xl border bg-gradient-to-r from-indigo-500/10 to-indigo-500/10 border-indigo-500/20">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                                    <RocketIcon className="w-3.5 h-3.5" /> AI Recommendation Engine
                                                </h4>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    selectedApp.aiRecommendation?.decision === 'APPROVE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                                                    selectedApp.aiRecommendation?.decision === 'REJECT' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' :
                                                    'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                                }`}>
                                                    {selectedApp.aiRecommendation?.decision} ({selectedApp.aiRecommendation?.confidence}%)
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                                {selectedApp.aiRecommendation?.summary}
                                            </p>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'history' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* History Stat Cards */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-4 rounded-xl bg-white dark:bg-navy-800/50 border border-slate-200/70 dark:border-white/10 text-center shadow-xs">
                                                <p className="text-xl font-black text-slate-900 dark:text-white">{selectedApp.history?.events || 0}</p>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mt-1">Events Created</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white dark:bg-navy-800/50 border border-slate-200/70 dark:border-white/10 text-center shadow-xs">
                                                <p className="text-xl font-black text-slate-900 dark:text-white">{selectedApp.history?.participants || 0}</p>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mt-1">Participants</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white dark:bg-navy-800/50 border border-slate-200/70 dark:border-white/10 text-center shadow-xs">
                                                <p className="text-xl font-black text-amber-500 flex items-center justify-center gap-1">
                                                    <StarIcon className="w-4 h-4 text-amber-500" /> {selectedApp.history?.rating || "5.0"}
                                                </p>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mt-1">Organizer Rating</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white dark:bg-navy-800/50 border border-slate-200/70 dark:border-white/10 text-center shadow-xs">
                                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{selectedApp.history?.disputes || 0}</p>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-500 mt-1">Open Disputes</p>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5">
                                                Application & Account Audit Timeline
                                            </h4>
                                            <div className="space-y-3">
                                                {selectedApp.timeline?.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 text-xs">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{item.event}</p>
                                                            <p className="text-[10px] text-slate-400 dark:text-gray-500">{item.date}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* System Governance Notes */}
                                        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-2.5">
                                                Administrative Notes & Audit Dossier
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedApp.notes?.map((note, idx) => (
                                                    <div key={idx} className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-xs">
                                                        <p className="text-slate-700 dark:text-gray-300 font-medium leading-relaxed">{note.text}</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-mono">{note.author} &bull; {note.date}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'risk' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Top Header & Re-run Button */}
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                                <ZapIcon className="w-4 h-4" /> Live AI Risk & Verification Assessment
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
                                                label="Performing AI Risk Assessment..." 
                                                subtext="Evaluating institutional credentials, web presence, and platform compliance..."
                                            />
                                        ) : (
                                            <>
                                                {/* Risk Level Badge Box */}
                                                <div className={`p-5 rounded-2xl border ${
                                                    (currentAiReview?.riskTier || selectedApp.risk?.level) === 'HIGH' ? 'bg-rose-500/10 border-rose-500/20' :
                                                    (currentAiReview?.riskTier || selectedApp.risk?.level) === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20' :
                                                    'bg-emerald-500/10 border-emerald-500/20'
                                                }`}>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <h4 className={`text-xs font-bold uppercase tracking-wider ${
                                                            (currentAiReview?.riskTier || selectedApp.risk?.level) === 'HIGH' ? 'text-rose-700 dark:text-rose-400' :
                                                            (currentAiReview?.riskTier || selectedApp.risk?.level) === 'MEDIUM' ? 'text-amber-700 dark:text-amber-400' :
                                                            'text-emerald-700 dark:text-emerald-400'
                                                        }`}>
                                                            OVERALL RISK TIER: {currentAiReview?.riskTier || selectedApp.risk?.level || 'LOW'} RISK
                                                        </h4>
                                                        <span className="text-xs font-bold font-mono">
                                                            Score: {currentAiReview?.riskScore ?? selectedApp.risk?.score ?? 10}/100
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                                                        {currentAiReview?.aiSummary || (
                                                            (currentAiReview?.riskTier || selectedApp.risk?.level) === 'HIGH' 
                                                                ? 'Critical flags detected. Review organization identity and dispute history before approving.' 
                                                                : 'No elevated risk factors detected. Account is compliant with institutional guidelines.'
                                                        )}
                                                    </p>
                                                </div>

                                                {/* AI Recommendation & Verified Badges */}
                                                {currentAiReview && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="p-4 rounded-xl border bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">AI Recommendation</span>
                                                                <span className="text-xs font-bold text-slate-900 dark:text-white">{currentAiReview.recommendation || 'APPROVE'}</span>
                                                            </div>
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                                                currentAiReview.recommendation === 'APPROVE' 
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                                    : currentAiReview.recommendation === 'REJECT'
                                                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                                                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                            }`}>
                                                                {currentAiReview.recommendation || 'APPROVE'}
                                                            </span>
                                                        </div>

                                                        <div className="p-4 rounded-xl border bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Confidence Score</span>
                                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{currentAiReview.confidenceScore || 94}%</span>
                                                            </div>
                                                            <div className="flex gap-1.5 flex-wrap justify-end">
                                                                {(currentAiReview.verifiedBadges || ["Domain Verified", "Institutional Alignment"]).map((b, i) => (
                                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-500/20">
                                                                        ✓ {b}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Risk Factors Breakdown */}
                                                <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-3.5">
                                                        Identified Risk Factors
                                                    </h4>
                                                    {(() => {
                                                        const riskFactors = currentAiReview?.riskFactors || selectedApp?.risk?.factors || [];
                                                        return riskFactors.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {riskFactors.map((f, i) => (
                                                                <div key={i} className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-slate-800 dark:text-gray-200">{f.factor || f}</span>
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                                        (f.impact || '').toUpperCase() === 'HIGH' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20' :
                                                                        (f.impact || '').toUpperCase() === 'MEDIUM' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' :
                                                                        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                                                    }`}>
                                                                        {f.impact || "Review"}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Zero adverse risk factors detected for this organizer account.</p>
                                                    );
                                                })()}
                                                </div>

                                                {/* Quick Apply AI Recommendation Banner */}
                                                {currentAiReview && (
                                                    <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                                                        <div>
                                                            <span className="font-bold text-xs uppercase tracking-wider text-indigo-800 dark:text-indigo-300 block mb-0.5">
                                                                AI Verification Action: {currentAiReview.recommendation || 'APPROVE'}
                                                            </span>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                                                {currentAiReview.recommendation === 'APPROVE' && "Low risk rating. Credentials and institutional standing verified."}
                                                                {currentAiReview.recommendation === 'REQUEST_CHANGES' && "Medium risk tier. Additional organizational verification or credentials requested."}
                                                                {currentAiReview.recommendation === 'REJECT' && "High risk flags or unverifiable credentials detected."}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {currentAiReview.recommendation === 'APPROVE' && (
                                                                <button
                                                                    onClick={() => handleApprove(selectedApp.id)}
                                                                    disabled={actionLoading}
                                                                    className="px-5 py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-500/30 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                                >
                                                                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                    Approve Organizer Now
                                                                </button>
                                                            )}
                                                            {currentAiReview.recommendation === 'REQUEST_CHANGES' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setChangeMessage(currentAiReview.aiSummary || "Please provide official institutional affiliation verification.");
                                                                        setIsRequestChangesOpen(true);
                                                                    }}
                                                                    disabled={actionLoading}
                                                                    className="px-5 py-2 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/30 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                                >
                                                                    <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                                    Request Verification with AI Summary
                                                                </button>
                                                            )}
                                                            {currentAiReview.recommendation === 'REJECT' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setRejectReason('Unverified Identity');
                                                                        setRejectMessage(currentAiReview.aiSummary || "Application does not satisfy authenticity verification.");
                                                                        setIsRejectOpen(true);
                                                                    }}
                                                                    disabled={actionLoading}
                                                                    className="px-5 py-2 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-500/30 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                                >
                                                                    Reject with AI Dossier
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                    </div>
                                )}

                            </div>

                            {/* Bottom Action Bar */}
                            <div className="p-4 bg-white dark:bg-navy-900 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                                <div className="text-xs font-bold text-slate-500 dark:text-gray-400">
                                    Status: <span className="font-extrabold text-slate-900 dark:text-white uppercase">{selectedApp.status}</span>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2">
                                    {(selectedApp.status === 'Pending' || selectedApp.status === 'Needs Changes') && (
                                        <>
                                            <button 
                                                onClick={() => setIsRejectOpen(true)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                                            >
                                                Reject Application
                                            </button>
                                            <button 
                                                onClick={() => setIsRequestChangesOpen(true)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                                            >
                                                Request Changes
                                            </button>
                                            <button 
                                                onClick={() => handleApprove(selectedApp.id)}
                                                disabled={actionLoading}
                                                className="px-5 py-2.5 bg-[#7C65F6] hover:bg-[#6851ec] !text-white shadow-sm shadow-[#7C65F6]/20 text-xs font-bold rounded-xl shadow-md shadow-[#7C65F6]/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5 text-white" />
                                                Approve & Activate
                                            </button>
                                        </>
                                    )}

                                    {selectedApp.status === 'Approved' && (
                                        <>
                                            <button 
                                                onClick={() => setIsSuspendOpen(true)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                                            >
                                                Suspend Organizer
                                            </button>
                                            <button 
                                                onClick={() => handleRevert(selectedApp.id)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                                            >
                                                Revert to Pending
                                            </button>
                                        </>
                                    )}

                                    {(selectedApp.status === 'Rejected' || selectedApp.status === 'Suspended') && (
                                        <>
                                            <button 
                                                onClick={() => handleApprove(selectedApp.id)}
                                                disabled={actionLoading}
                                                className="px-5 py-2 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-300/80 dark:border-indigo-500/30 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                                            >
                                                Re-Approve Organizer
                                            </button>
                                            <button 
                                                onClick={() => handleRevert(selectedApp.id)}
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
                            <UsersIcon className="w-12 h-12 mb-3 opacity-30 text-indigo-500" />
                            <p className="font-bold text-sm text-slate-700 dark:text-gray-300">Select an organizer application from the left list to review.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* REQUEST CHANGES MODAL */}
            <ActionModal 
                isOpen={isRequestChangesOpen} 
                onClose={() => setIsRequestChangesOpen(false)} 
                title="Request Organizer Information Changes"
                subtitle="Select the specific fields the applicant must update or furnish."
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                            { key: 'organization', label: 'Organization / Institution Name' },
                            { key: 'orgType', label: 'Institution Type Classification' },
                            { key: 'designation', label: 'Official Role / Designation' },
                            { key: 'website', label: 'Official Website / Domain' },
                            { key: 'phone', label: 'Contact Phone Number' },
                            { key: 'bio', label: 'Organization & Event Bio' },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10">
                                <input 
                                    type="checkbox" 
                                    className="rounded text-indigo-600 focus:ring-indigo-500" 
                                    checked={changeRequests[key]} 
                                    onChange={(e) => setChangeRequests({...changeRequests, [key]: e.target.checked})} 
                                /> 
                                <span className="font-medium truncate">{label}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                            Custom Guidance Note to Applicant:
                        </label>
                        <textarea 
                            placeholder="Explain what specific details or verification documents are required..." 
                            rows="3" 
                            value={changeMessage} 
                            onChange={(e) => setChangeMessage(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors resize-none"
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
                            {actionLoading ? 'Sending...' : 'Send Change Request'}
                        </button>
                    </div>
                </div>
            </ActionModal>

            {/* REJECT MODAL */}
            <ActionModal 
                isOpen={isRejectOpen} 
                onClose={() => setIsRejectOpen(false)} 
                title="Reject Organizer Application"
                subtitle="Specify the justification for rejecting this organizer application."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {[
                            'Incomplete Information',
                            'Unverifiable Organization',
                            'Duplicate Account',
                            'Fraudulent Information / High Risk',
                            'Policy Violation',
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
                            Additional Explanation (Optional):
                        </label>
                        <textarea 
                            placeholder="Additional rejection context for audit log..." 
                            rows="2" 
                            value={rejectMessage} 
                            onChange={(e) => setRejectMessage(e.target.value)} 
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

            {/* SUSPEND MODAL */}
            <ActionModal 
                isOpen={isSuspendOpen} 
                onClose={() => setIsSuspendOpen(false)} 
                title="Suspend Organizer Account"
                subtitle="Temporarily disable organizer privileges on the platform."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {[
                            'Policy Violation',
                            'Unresolved Dispute Complaints',
                            'Event Cancellation Negligence',
                            'Identity Verification Revoked'
                        ].map(reason => (
                            <label key={reason} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10">
                                <input 
                                    type="radio" 
                                    name="suspendReason" 
                                    value={reason} 
                                    checked={suspendReason === reason}
                                    onChange={(e) => setSuspendReason(e.target.value)} 
                                    className="text-purple-600 focus:ring-purple-500" 
                                /> 
                                <span className="font-bold">{reason}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                        <button 
                            onClick={() => setIsSuspendOpen(false)} 
                            className="px-4 py-2.5 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSuspend} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-purple-50 dark:bg-purple-500/15 hover:bg-purple-100 dark:hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-300/80 dark:border-purple-500/30 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
                        </button>
                    </div>
                </div>
            </ActionModal>

        </div>
    );
};

export default OrganizerApprovals;
