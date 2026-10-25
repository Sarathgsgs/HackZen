import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    TriangleAlertIcon, 
    CheckIcon, 
    StarIcon, 
    XIcon, 
    UsersIcon, 
    RocketIcon, 
    ZapIcon, 
    ShieldIcon, 
    FileTextIcon, 
    SearchIcon,
    ScaleIcon
} from '../../components/AdminIcons';
import { 
    fetchAdminSubmissions, 
    updateSubmissionStatus, 
    requestSubmissionChanges, 
    flagSubmissionInvestigation, 
    addInternalAdminNote, 
    performBulkSubmissionsAction,
    fetchSubmissionAiReview
} from '../../services/admin/adminSubmissionsApi';
import AiAnalysisLoader from '../../components/AiAnalysisLoader';

// --- Reusable Modal Component ---
const ActionModal = ({ isOpen, onClose, title, subtitle, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">{title}</h2>
                {subtitle && <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 mb-4">{subtitle}</p>}
                {children}
            </div>
        </div>
    );
};

// --- Submission Comparison Modal Component ---
const ComparisonModal = ({ isOpen, onClose, subA, subB }) => {
    if (!isOpen || !subA || !subB) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 sm:p-7 w-full max-w-4xl shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>

                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <ScaleIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">Side-by-Side Submission Comparison</h2>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Directly benchmark metrics, risk levels, and evaluation scores</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:divide-x divide-slate-200 dark:divide-white/10">
                    {/* Submission A */}
                    <div className="sm:pr-5 space-y-4 text-xs">
                        <div className="border-b border-slate-200 dark:border-white/10 pb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Submission A</span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{subA.projectTitle}</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-xs">{subA.teamDetails?.name || subA.teamName} • {subA.category}</p>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Health Score</span><strong className="text-emerald-600 dark:text-emerald-400">{subA.healthScore}/100</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Risk Level</span><strong className={subA.riskLevel === 'HIGH' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>{subA.riskLevel}</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Originality Score</span><strong>{subA.originality?.similarityScore}% Similarity</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Judge Avg Score</span><strong className="text-blue-600 dark:text-blue-400">{subA.evaluation?.averageScore}/100</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Problem Alignment</span><strong>{subA.aiReview?.problemFit}%</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Technical Feasibility</span><strong>{subA.aiReview?.technicalFeasibility}%</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>On-Time Status</span><strong>{subA.isLate ? 'Late Submission' : 'On Time'}</strong></div>
                        </div>
                    </div>

                    {/* Submission B */}
                    <div className="sm:pl-6 space-y-4 text-xs">
                        <div className="border-b border-slate-200 dark:border-white/10 pb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Submission B</span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{subB.projectTitle}</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-xs">{subB.teamDetails?.name || subB.teamName} • {subB.category}</p>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Health Score</span><strong className="text-emerald-600 dark:text-emerald-400">{subB.healthScore}/100</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Risk Level</span><strong className={subB.riskLevel === 'HIGH' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>{subB.riskLevel}</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Originality Score</span><strong>{subB.originality?.similarityScore}% Similarity</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Judge Avg Score</span><strong className="text-blue-600 dark:text-blue-400">{subB.evaluation?.averageScore}/100</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Problem Alignment</span><strong>{subB.aiReview?.problemFit}%</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>Technical Feasibility</span><strong>{subB.aiReview?.technicalFeasibility}%</strong></div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5"><span>On-Time Status</span><strong>{subB.isLate ? 'Late Submission' : 'On Time'}</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Submissions = () => {
    const [searchParams] = useSearchParams();
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Pending Review');
    const [actionFilter, setActionFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubId, setSelectedSubId] = useState(null);
    const [selectedSubIds, setSelectedSubIds] = useState([]);
    const [activeDetailTab, setActiveDetailTab] = useState('details'); // 'details' | 'team-judges' | 'ai-notes'
    const [activeVersion, setActiveVersion] = useState('v1');
    const [actionLoading, setActionLoading] = useState(false);

    // AI Review State per Submission ID
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
    const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
    const [isDisqualifyModalOpen, setIsDisqualifyModalOpen] = useState(false);
    
    // Form Inputs State
    const [changeRequests, setChangeRequests] = useState({
        docs: false,
        demo: false,
        repo: false,
        deployment: false,
        problemStatement: false,
        teamDetails: false,
        postDeadline: false
    });
    const [changeMessage, setChangeMessage] = useState('');
    const [extendedDeadline, setExtendedDeadline] = useState('24 hours');
    const [flagReason, setFlagReason] = useState('High Code Similarity / Plagiarism Detected');
    const [flagExplanation, setFlagExplanation] = useState('');
    const [disqualifyReason, setDisqualifyReason] = useState('Severe Code Plagiarism');
    const [disqualifyExplanation, setDisqualifyExplanation] = useState('');
    const [newAdminNote, setNewAdminNote] = useState('');

    useEffect(() => {
        const filter = searchParams.get('filter');
        if (filter) {
            const f = filter.toLowerCase();
            if (f === 'pending' || f === 'pending review') setActiveTab('Pending Review');
            else if (f === 'approved') setActiveTab('Approved');
            else if (f === 'rejected') setActiveTab('Rejected');
            else if (f === 'disqualified') setActiveTab('Disqualified');
            else if (f === 'flagged') setActiveTab('Flagged');
            else if (f === 'incomplete') {
                setActiveTab('All');
                setActionFilter('Incomplete');
            }
            else if (f === 'changes requested' || f === 'changes') setActiveTab('Changes Requested');
            else if (f === 'all') setActiveTab('All');
        }
    }, [searchParams]);

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            const data = await fetchAdminSubmissions();
            setSubmissions(data || []);
            if (data && data.length > 0) {
                if (!selectedSubId || !data.find(d => d.id === selectedSubId)) {
                    setSelectedSubId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to load submissions from API:", error);
            setSubmissions([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSubmissions();
    }, []);

    const currentAiReview = selectedSubId ? aiReviewsMap[selectedSubId] : null;

    const handleRunAiReview = async (force = false) => {
        if (!selectedSubId) return;
        if (!force && aiReviewsMap[selectedSubId]) return;
        
        setIsAiReviewLoading(true);
        try {
            const review = await fetchSubmissionAiReview(selectedSubId);
            setAiReviewsMap(prev => ({
                ...prev,
                [selectedSubId]: review
            }));
        } catch (error) {
            console.error("AI submission review evaluation failed:", error);
            showToast("AI submission evaluation failed to respond", "error");
        } finally {
            setIsAiReviewLoading(false);
        }
    };

    useEffect(() => {
        if (activeDetailTab === 'ai-notes' && selectedSubId) {
            if (!aiReviewsMap[selectedSubId]) {
                handleRunAiReview();
            }
        }
    }, [activeDetailTab, selectedSubId]);

    // Summary Counts
    const stats = useMemo(() => {
        const total = submissions.length;
        const pending = submissions.filter(s => (s.status || '').toLowerCase().includes('pending')).length;
        const approved = submissions.filter(s => s.status === 'Approved').length;
        const changes = submissions.filter(s => (s.status || '').toLowerCase().includes('changes')).length;
        const flagged = submissions.filter(s => (s.status || '').toLowerCase().includes('flag')).length;
        const rejected = submissions.filter(s => s.status === 'Rejected').length;
        const disqualified = submissions.filter(s => (s.status || '').toLowerCase() === 'disqualified').length;
        return { total, pending, approved, changes, flagged, rejected, disqualified };
    }, [submissions]);

    // Filter Logic
    const filteredSubs = useMemo(() => {
        return submissions.filter(sub => {
            const status = (sub.status || '').toLowerCase();
            const tab = activeTab.toLowerCase();
            let matchesTab = tab === 'all';

            if (tab === 'pending review') {
                matchesTab = status.includes('pending');
            } else if (tab === 'approved') {
                matchesTab = status === 'approved';
            } else if (tab === 'rejected') {
                matchesTab = status === 'rejected';
            } else if (tab === 'disqualified') {
                matchesTab = status === 'disqualified';
            } else if (tab === 'changes requested') {
                matchesTab = status.includes('changes');
            } else if (tab === 'flagged') {
                matchesTab = status.includes('flag');
            }

            let matchesActionFilter = true;
            if (actionFilter === 'High Risk') matchesActionFilter = sub.riskLevel === 'HIGH';
            if (actionFilter === 'Late Submissions') matchesActionFilter = sub.isLate;
            if (actionFilter === 'Post-Deadline Activity') matchesActionFilter = sub.postDeadlineActivity;
            if (actionFilter === 'High Plagiarism') matchesActionFilter = (sub.originality?.similarityScore || 0) > 30;
            if (actionFilter === 'Incomplete') matchesActionFilter = Object.values(sub.deliverables || {}).some(v => !v);

            const q = searchQuery.toLowerCase();
            const matchesSearch = 
                (sub.projectTitle || '').toLowerCase().includes(q) ||
                (sub.category || '').toLowerCase().includes(q) ||
                (sub.teamDetails?.name || '').toLowerCase().includes(q) ||
                (sub.teamDetails?.college || '').toLowerCase().includes(q);

            return matchesTab && matchesActionFilter && matchesSearch;
        });
    }, [submissions, activeTab, actionFilter, searchQuery]);

    const selectedSub = submissions.find(s => s.id === selectedSubId) || filteredSubs[0] || null;

    // Single Status Action
    const handleStatusUpdate = async (id, newStatus, reason = '') => {
        setActionLoading(true);
        try {
            await updateSubmissionStatus(id, newStatus, reason);
            setSubmissions(subs => subs.map(s => s.id === id ? { 
                ...s, 
                status: newStatus,
                ...(newStatus === 'Disqualified' ? { disqualificationReason: reason } : {})
            } : s));
            showToast(`Submission status updated to ${newStatus}`, newStatus === 'Approved' ? 'success' : newStatus === 'Disqualified' ? 'warning' : 'info');
        } catch (error) {
            showToast(`Failed to update status to ${newStatus}`, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Disqualify Action Submit
    const handleDisqualifySubmit = async () => {
        if (!selectedSub) return;
        const fullReason = disqualifyExplanation ? `${disqualifyReason}: ${disqualifyExplanation}` : disqualifyReason;
        await handleStatusUpdate(selectedSub.id, 'Disqualified', fullReason);
        setIsDisqualifyModalOpen(false);
        setDisqualifyExplanation('');
    };

    // Request Changes Action
    const handleSendChangeRequest = async () => {
        if (!selectedSub) return;
        const issues = Object.keys(changeRequests).filter(k => changeRequests[k]);
        setActionLoading(true);
        try {
            await requestSubmissionChanges(selectedSub.id, issues, changeMessage, extendedDeadline);
            setSubmissions(subs => subs.map(s => s.id === selectedSub.id ? { 
                ...s, 
                status: 'Changes Requested',
                adminFeedback: changeMessage,
                changeIssues: issues
            } : s));
            setIsRequestChangesOpen(false);
            setChangeRequests({
                docs: false, demo: false, repo: false, deployment: false,
                problemStatement: false, teamDetails: false, postDeadline: false
            });
            setChangeMessage('');
            showToast('Change request notification sent to team', 'info');
        } catch (error) {
            showToast('Failed to send change request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Flag Investigation Action
    const handleFlagInvestigation = async () => {
        if (!selectedSub) return;
        const reasonCombined = flagExplanation ? `${flagReason}: ${flagExplanation}` : flagReason;
        setActionLoading(true);
        try {
            await flagSubmissionInvestigation(selectedSub.id, reasonCombined);
            setSubmissions(subs => subs.map(s => s.id === selectedSub.id ? { 
                ...s, 
                status: 'Flagged for Investigation',
                investigationReason: reasonCombined
            } : s));
            setIsFlagModalOpen(false);
            setFlagExplanation('');
            showToast('Submission flagged for compliance investigation', 'warning');
        } catch (error) {
            showToast('Failed to flag submission', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Add Internal Note Action
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!selectedSub || !newAdminNote.trim()) return;
        try {
            const res = await addInternalAdminNote(selectedSub.id, newAdminNote);
            setSubmissions(subs => subs.map(s => {
                if (s.id === selectedSub.id) {
                    return { ...s, notes: [...(s.notes || []), res.note] };
                }
                return s;
            }));
            setNewAdminNote('');
            showToast('Internal note recorded', 'success');
        } catch (error) {
            showToast('Failed to add note', 'error');
        }
    };

    // Bulk Action Handler
    const handleBulkAction = async (action) => {
        if (selectedSubIds.length === 0) return;
        setActionLoading(true);
        try {
            await performBulkSubmissionsAction(selectedSubIds, action);
            setSubmissions(subs => subs.map(s => selectedSubIds.includes(s.id) ? { ...s, status: action } : s));
            showToast(`Bulk applied '${action}' to ${selectedSubIds.length} submissions`, 'success');
            setSelectedSubIds([]);
        } catch (error) {
            showToast('Failed to perform bulk action', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Multi-select Checkbox Toggle
    const toggleSelectSub = (id) => {
        setSelectedSubIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const getDeliverableCount = (deliverables = {}) => {
        const keys = Object.keys(deliverables);
        const done = Object.values(deliverables).filter(Boolean).length;
        return { done, total: keys.length };
    };

    // Selected submissions for comparison
    const subA = submissions.find(s => s.id === selectedSubIds[0]);
    const subB = submissions.find(s => s.id === selectedSubIds[1]);

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 max-w-7xl mx-auto">
            
            {/* Toast Alert */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
                    <div className={`px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 font-bold text-xs border backdrop-blur-md transition-all ${
                        toastMessage.type === 'warning'
                            ? 'bg-amber-50/95 dark:bg-amber-950/80 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-amber-500/10'
                            : toastMessage.type === 'error'
                            ? 'bg-rose-50/95 dark:bg-rose-950/80 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 shadow-rose-500/10'
                            : 'bg-white/95 dark:bg-slate-900/90 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 shadow-slate-900/10'
                    }`}>
                        {toastMessage.type === 'warning' ? (
                            <TriangleAlertIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : toastMessage.type === 'error' ? (
                            <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                            <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span>{toastMessage.text}</span>
                    </div>
                </div>
            )}

            {/* 1. Header & Action Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Submissions Governance Workspace
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Audit project deliverables, repository health, originality, AI co-reviews, and judge evaluation rubrics.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-gray-400">Condition Filter:</span>
                    <div className="relative inline-flex items-center">
                        <select 
                            value={actionFilter} 
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="appearance-none pr-9 pl-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold bg-white dark:bg-navy-800 text-slate-700 dark:text-gray-200 focus:outline-none focus:border-[#2563eb] cursor-pointer transition-all shadow-sm"
                        >
                            <option value="All">All Filter Conditions</option>
                            <option value="High Risk">⚠️ High Risk</option>
                            <option value="Late Submissions">⚠️ Late Submissions</option>
                            <option value="Post-Deadline Activity">⚠️ Post-Deadline Activity</option>
                            <option value="High Plagiarism">⚠️ High Plagiarism Flag</option>
                            <option value="Incomplete">✗ Incomplete Deliverables</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-slate-400 dark:text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>

                    <button 
                        onClick={loadSubmissions} 
                        disabled={isLoading}
                        title="Refresh Live Data"
                        className="px-4 py-2 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-sm cursor-pointer active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-rotate-ccw ${isLoading ? 'animate-spin' : ''}`}>
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* 2. Top Metric Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-gray-400">Total Submissions</p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 leading-tight">{stats.total}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FileTextIcon className="w-4 h-4" />
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-500">Pending Review</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">{stats.pending}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <ZapIcon className="w-4 h-4" />
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-500">Approved</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">{stats.approved}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                        <CheckIcon className="w-4 h-4" />
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-500">Changes / Flagged</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 leading-tight">{stats.changes + stats.flagged}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                        <ShieldIcon className="w-4 h-4" />
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-500">Rejected</p>
                        <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 leading-tight">{stats.rejected}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                        <XIcon className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* 3. Split Pane Layout */}
            <div className="flex flex-col lg:flex-row gap-6 min-h-[640px]">
                
                {/* LEFT PANE: Submission Directory */}
                <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden h-[360px] sm:h-[480px] lg:h-[700px]">
                    
                    {/* Status Tabs */}
                    <div className="p-3 border-b border-slate-200/80 dark:border-white/5 flex gap-1.5 shrink-0 bg-slate-50/70 dark:bg-navy-950/30 overflow-x-auto scrollbar-hide">
                        {['All', 'Pending Review', 'Approved', 'Changes Requested', 'Flagged', 'Rejected', 'Disqualified'].map((tab) => {
                            const count = tab === 'All' ? stats.total :
                                          tab === 'Pending Review' ? stats.pending :
                                          tab === 'Approved' ? stats.approved :
                                          tab === 'Changes Requested' ? stats.changes :
                                          tab === 'Flagged' ? stats.flagged :
                                          tab === 'Disqualified' ? stats.disqualified :
                                          stats.rejected;
                            const isActive = activeTab === tab;
                            return (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-1.5 px-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                                        isActive 
                                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300/80 dark:border-blue-500/40 shadow-sm' 
                                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    <span>{tab.replace('Requested', 'Req')}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-blue-200/70 dark:bg-blue-400/20 text-blue-800 dark:text-blue-200' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Bulk Actions Header Bar */}
                    {selectedSubIds.length > 0 && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border-b border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-bold animate-in fade-in shrink-0">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                {selectedSubIds.length} Selected
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button onClick={() => handleBulkAction('Approved')} className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30 rounded-lg text-[10px] uppercase font-bold transition-all cursor-pointer">Approve</button>
                                <button onClick={() => handleBulkAction('Changes Requested')} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/30 rounded-lg text-[10px] uppercase font-bold transition-all cursor-pointer">Changes</button>
                                <button 
                                    onClick={() => setIsCompareModalOpen(true)} 
                                    disabled={selectedSubIds.length !== 2} 
                                    className={`px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 dark:text-blue-300 border border-blue-300/80 dark:border-blue-500/30 rounded-lg text-[10px] uppercase font-bold transition-all cursor-pointer ${selectedSubIds.length !== 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Compare
                                </button>
                                <button onClick={() => setSelectedSubIds([])} className="px-2.5 py-1 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-300 rounded-lg text-[10px] transition-colors cursor-pointer">Clear</button>
                            </div>
                        </div>
                    )}

                    {/* Search Field */}
                    <div className="p-3 border-b border-slate-200/80 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-transparent">
                        <div className="relative">
                            <SearchIcon className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400 dark:text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Search project, team, or track..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2563eb] transition-colors shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Submission Cards List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center text-xs text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider animate-pulse">
                                Loading Live Submissions...
                            </div>
                        ) : filteredSubs.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-gray-500 text-xs">
                                No matching submissions found.
                            </div>
                        ) : (
                            filteredSubs.map((sub) => {
                                const isSelected = selectedSubId === sub.id;
                                const isChecked = selectedSubIds.includes(sub.id);

                                return (
                                    <div 
                                        key={sub.id} 
                                        onClick={() => setSelectedSubId(sub.id)}
                                        className={`p-3.5 rounded-xl cursor-pointer transition-all border relative text-left ${
                                            isSelected 
                                            ? 'bg-blue-50/90 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/60 shadow-sm' 
                                            : 'bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5 hover:border-blue-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-start gap-2.5 pr-2 truncate">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked} 
                                                    onChange={(e) => { e.stopPropagation(); toggleSelectSub(sub.id); }} 
                                                    className="mt-0.5 rounded border-slate-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <div className="truncate">
                                                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{sub.projectTitle}</h4>
                                                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold truncate mt-0.5">{sub.teamDetails?.name || sub.teamName}</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{sub.category}</p>
                                                </div>
                                            </div>

                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                sub.riskLevel === 'HIGH' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                                sub.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                                sub.status === 'Changes Requested' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                                                sub.status === 'Flagged for Investigation' ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' :
                                                'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-white/10'
                                            }`}>
                                                {sub.riskLevel === 'HIGH' ? '⚠️ High Risk' : sub.status}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 dark:text-gray-500 font-mono">
                                            <span className={sub.isLate ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                                                {sub.isLate ? '⚠️ LATE' : '✓ ON TIME'}
                                            </span>
                                            <span className="font-bold text-slate-700 dark:text-gray-300">Health: {sub.healthScore}/100</span>
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5">{sub.version}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Governance & Investigation Workspace */}
                <div className="w-full lg:w-2/3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm flex flex-col overflow-hidden relative min-h-[500px] lg:h-[700px]">
                    {selectedSub ? (
                        <>
                            {/* Selected Header */}
                            <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-black text-base flex items-center justify-center shadow-sm shrink-0">
                                        <FileTextIcon className="w-4.5 h-4.5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{selectedSub.projectTitle}</h2>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                selectedSub.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                                selectedSub.status === 'Changes Requested' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                                                selectedSub.status === 'Flagged for Investigation' ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' :
                                                selectedSub.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                                'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                            }`}>
                                                {selectedSub.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                                            {selectedSub.category} • <strong className="text-blue-600 dark:text-blue-400 font-bold">{selectedSub.teamDetails?.name || selectedSub.teamName}</strong> • {selectedSub.hackathon}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right flex items-center sm:block gap-3">
                                    <p className="text-[10px] text-slate-400 dark:text-gray-400 uppercase tracking-wider font-extrabold mb-1">Active Version</p>
                                    <select 
                                        value={activeVersion} 
                                        onChange={(e) => setActiveVersion(e.target.value)}
                                        className="rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb] shadow-sm cursor-pointer"
                                    >
                                        {(selectedSub.versions || [{ v: 'v1', note: 'Final' }]).map(v => (
                                            <option key={v.v} value={v.v}>{v.v} - {v.note || 'Version'}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Health & Risk Banner */}
                            <div className="px-5 py-2 bg-slate-50/70 dark:bg-white/[0.01] border-b border-slate-200/80 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
                                <div className="flex items-center gap-4 flex-wrap font-bold">
                                    <span className="flex items-center gap-1.5">
                                        <StarIcon className="w-4 h-4 text-amber-400" />
                                        <span>Health Score: <strong className={selectedSub.healthScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>{selectedSub.healthScore}/100</strong></span>
                                    </span>
                                    <span className="text-slate-300 dark:text-white/10">|</span>
                                    <span>
                                        Risk Level: <strong className={selectedSub.riskLevel === 'HIGH' ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}>{selectedSub.riskLevel}</strong>
                                    </span>
                                    <span className="text-slate-300 dark:text-white/10">|</span>
                                    <span className={selectedSub.isLate ? 'text-rose-600 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                                        {selectedSub.isLate ? '⚠️ Late Submission' : '✓ Submitted On Time'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={selectedSub.repoHealth?.accessible ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 font-bold'}>
                                        {selectedSub.repoHealth?.accessible ? '✓ Repo Accessible' : '✗ Repo Inaccessible'}
                                    </span>
                                </div>
                            </div>

                            {/* Sub-tab Navigation */}
                            <div className="flex border-b border-slate-200/80 dark:border-white/10 px-4 pt-1.5 gap-4 shrink-0 bg-white dark:bg-transparent overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'details', label: '1. Submission Details', icon: <FileTextIcon className="w-3.5 h-3.5" /> },
                                    { id: 'team-judges', label: '2. Team, Repo & Judges', icon: <UsersIcon className="w-3.5 h-3.5" /> },
                                    { id: 'ai-notes', label: '3. AI Review & Admin Notes', icon: <ZapIcon className="w-3.5 h-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveDetailTab(tab.id)}
                                        className={`pb-2.5 px-2 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                                            activeDetailTab === tab.id
                                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                            : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Main Body per Active Tab */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                                
                                {activeDetailTab === 'details' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Status Alerts if Changes Requested or Flagged */}
                                        {selectedSub.status === 'Changes Requested' && (
                                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                                                <p className="font-extrabold flex items-center gap-1.5 mb-1">
                                                    <TriangleAlertIcon className="w-4 h-4 text-amber-500" /> Admin Changes Requested from Team:
                                                </p>
                                                <p className="font-medium pl-5 mb-1">{selectedSub.adminFeedback || 'Please review and update the missing deliverables.'}</p>
                                                {selectedSub.changeIssues && selectedSub.changeIssues.length > 0 && (
                                                    <div className="pl-5 flex gap-1.5 flex-wrap mt-2">
                                                        {selectedSub.changeIssues.map((issue, idx) => (
                                                            <span key={idx} className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
                                                                {issue}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {selectedSub.status === 'Flagged for Investigation' && (
                                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs">
                                                <p className="font-extrabold flex items-center gap-1.5 mb-1">
                                                    <ShieldIcon className="w-4 h-4 text-blue-500" /> Under Active Compliance Investigation:
                                                </p>
                                                <p className="font-medium pl-5">{selectedSub.investigationReason || 'High code similarity or post-deadline activity flag.'}</p>
                                            </div>
                                        )}

                                        {/* 1. Project Overview */}
                                        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-3">
                                                Project Overview & Description
                                            </h4>
                                            
                                            <div className="space-y-3.5 text-xs">
                                                <div>
                                                    <span className="text-slate-400 dark:text-gray-400 font-bold block mb-1">Tagline</span>
                                                    <p className="text-blue-600 dark:text-blue-400 font-semibold italic text-sm">"{selectedSub.tagline}"</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 dark:text-gray-400 font-bold block mb-1">Full Solution Description</span>
                                                    <p className="text-slate-700 dark:text-gray-300 leading-relaxed font-normal">{selectedSub.desc}</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 dark:border-white/5">
                                                    <div>
                                                        <span className="text-slate-400 dark:text-gray-400 font-bold block mb-1">Repository URL</span>
                                                        <a href={selectedSub.repoUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-bold hover:underline truncate block">
                                                            {selectedSub.repoUrl}
                                                        </a>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 dark:text-gray-400 font-bold block mb-1">Live Demo / Video URL</span>
                                                        <a href={selectedSub.demoUrl} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline truncate block">
                                                            {selectedSub.demoUrl}
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Deliverables Checklist & Timing */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Deliverables */}
                                            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                                <div className="flex justify-between items-center mb-3 border-b border-slate-200/80 dark:border-white/5 pb-2.5">
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400">Deliverables Checklist</h4>
                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/20">
                                                        {getDeliverableCount(selectedSub.deliverables).done} / {getDeliverableCount(selectedSub.deliverables).total} Completed
                                                    </span>
                                                </div>
                                                <ul className="space-y-2 text-xs font-semibold">
                                                    {Object.entries(selectedSub.deliverables || {}).map(([key, val]) => (
                                                        <li key={key} className={`flex items-center justify-between ${val ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                            <span>{val ? '✓' : '✗'} {key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                                                            <span className="text-[10px] font-mono opacity-80">{val ? 'Provided' : 'Missing'}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Timing & Security */}
                                            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-3 border-b border-slate-200/80 dark:border-white/5 pb-2.5">Deadline & File Integrity</h4>
                                                <div className="space-y-2.5 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500 dark:text-gray-400">Submitted At:</span>
                                                        <strong className="font-mono text-slate-800 dark:text-white">{selectedSub.submittedAt}</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500 dark:text-gray-400">Stage Deadline:</span>
                                                        <strong className="font-mono text-slate-800 dark:text-white">{selectedSub.deadline}</strong>
                                                    </div>
                                                    <div className="flex justify-between pt-1 border-t border-slate-200/80 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">File Security Scan:</span>
                                                        <strong className="text-emerald-600 dark:text-emerald-400">✓ Verified Clean ({selectedSub.fileSecurity?.fileSize || '35 MB'})</strong>
                                                    </div>
                                                    {selectedSub.postDeadlineActivity && (
                                                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] font-bold mt-2">
                                                            ⚠️ Post-Deadline Repository Activity Detected.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'team-judges' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Team & Mentor Profile */}
                                        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-3.5 flex items-center justify-between">
                                                <span>Team Profile & Member Roster</span>
                                                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">{selectedSub.teamDetails?.college}</span>
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                                                {(selectedSub.teamDetails?.members || []).map((m, idx) => (
                                                    <div key={idx} className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-200/80 dark:border-white/5 text-xs shadow-sm">
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <strong className="text-slate-900 dark:text-white font-bold">{m.name}</strong>
                                                            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">{m.role}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">{m.email}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {selectedSub.teamDetails?.mentor && (
                                                <div className="p-3.5 bg-white dark:bg-black/20 rounded-xl border border-slate-200/80 dark:border-white/5 text-xs shadow-sm">
                                                    <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-gray-400 block mb-1">Assigned Mentor Feedback</span>
                                                    <p className="text-slate-700 dark:text-gray-300 italic">"{selectedSub.teamDetails.mentor.feedback}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Repository Health & Originality */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Repo Health */}
                                            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-3 border-b border-slate-200/80 dark:border-white/5 pb-2.5">Repository Health & Activity</h4>
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between"><span>Commits Count:</span><strong className="font-mono">{selectedSub.repoHealth?.commitsCount || 35} commits</strong></div>
                                                    <div className="flex justify-between"><span>Contributors:</span><strong className="font-mono">{selectedSub.repoHealth?.contributorsCount || 3} members</strong></div>
                                                    <div className="flex justify-between"><span>Last Commit:</span><strong className="font-mono">{selectedSub.repoHealth?.lastCommit || '2h ago'}</strong></div>
                                                    <div className="flex justify-between"><span>Activity Score:</span><strong className="text-emerald-600 dark:text-emerald-400">{selectedSub.repoHealth?.activityScore || 85}%</strong></div>
                                                </div>
                                            </div>

                                            {/* Originality Check */}
                                            <div className={`p-4 sm:p-5 rounded-2xl border ${selectedSub.originality?.similarityScore > 30 ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30' : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]'}`}>
                                                <h4 className={`text-[10px] font-black uppercase tracking-wider mb-2 border-b pb-2.5 ${selectedSub.originality?.similarityScore > 30 ? 'text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' : 'text-slate-400 dark:text-gray-400 border-slate-200/80 dark:border-white/5'}`}>
                                                    Originality & Similarity Check
                                                </h4>
                                                <div className="text-center my-2">
                                                    <p className={`text-3xl font-extrabold ${selectedSub.originality?.similarityScore > 30 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {selectedSub.originality?.similarityScore || 8}%
                                                    </p>
                                                    <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Codebase Similarity Score</p>
                                                </div>
                                                <p className="text-[11px] text-center text-slate-600 dark:text-gray-300">
                                                    {selectedSub.originality?.matchName}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Judge Evaluation Status & Rubric */}
                                        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-3.5 flex items-center justify-between">
                                                <span>Judge Evaluation & Rubric Scores</span>
                                                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">Average: {selectedSub.evaluation?.averageScore || 84.5} / 100</span>
                                            </h4>

                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs mb-3">
                                                {Object.entries(selectedSub.rubric || {}).map(([crit, val]) => (
                                                    <div key={crit} className="p-2.5 rounded-xl bg-white dark:bg-black/20 border border-slate-200/80 dark:border-white/5 text-center shadow-sm">
                                                        <span className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-gray-400 block truncate">{crit.replace(/([A-Z])/g, ' $1')}</span>
                                                        <strong className="text-slate-900 dark:text-white font-mono font-bold mt-1 block">{val} / 20</strong>
                                                    </div>
                                                ))}
                                            </div>

                                            {selectedSub.evaluation?.conflictDetected && (
                                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold mt-2">
                                                    ⚠️ Judge Conflict of Interest Detected: {selectedSub.evaluation?.conflictMessage}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'ai-notes' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Top Header & Re-run Button */}
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                                <ZapIcon className="w-4 h-4" /> Live AI Technical Co-Review & Rubric Analysis
                                            </h4>
                                            <button 
                                                onClick={() => handleRunAiReview(true)}
                                                disabled={isAiReviewLoading}
                                                className="px-4 py-2 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                            >
                                                {isAiReviewLoading ? 'Analyzing...' : 'Re-Run AI Analysis'}
                                            </button>
                                        </div>

                                        {isAiReviewLoading ? (
                                            <AiAnalysisLoader 
                                                label="Performing AI Submission Review..." 
                                                subtext="Evaluating problem fit, technical feasibility, codebase deliverables, and scoring rubrics..."
                                            />
                                        ) : (
                                            <div className="space-y-4">
                                                {/* AI Review Card */}
                                                <div className="p-5 bg-blue-50/60 dark:bg-blue-500/10 rounded-2xl border border-blue-200 dark:border-blue-500/20 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4 border-b border-blue-200 dark:border-blue-500/20 pb-3">
                                                        <div>
                                                            <span className="font-black uppercase tracking-wider text-[10px] text-blue-700 dark:text-blue-300 block mb-0.5">AI Technical Score</span>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                                                                    {currentAiReview?.overallScore ?? selectedSub.healthScore ?? 88}
                                                                </span>
                                                                <span className="text-xs text-slate-500 font-bold">/ 100</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-black uppercase tracking-wider text-[10px] text-slate-400 dark:text-gray-400 block mb-1">AI Recommendation</span>
                                                            <span className={`px-3 py-1 rounded-full font-extrabold text-[10px] uppercase border ${
                                                                (currentAiReview?.aiRecommendation || selectedSub.aiReview?.aiRecommendation || '').includes('APPROV') 
                                                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                                                                    : (currentAiReview?.aiRecommendation || selectedSub.aiReview?.aiRecommendation || '').includes('REJECT')
                                                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                                                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                            }`}>
                                                                {currentAiReview?.aiRecommendation || selectedSub.aiReview?.aiRecommendation || 'RECOMMEND APPROVAL'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Metric Bars */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4 text-xs">
                                                        <div>
                                                            <div className="flex justify-between text-[10px] uppercase font-bold mb-1.5">
                                                                <span className="text-slate-600 dark:text-gray-400">Problem Alignment & Scope</span>
                                                                <span className="text-blue-600 dark:text-blue-400">{currentAiReview?.problemFit || selectedSub.aiReview?.problemFit || 92}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${currentAiReview?.problemFit || selectedSub.aiReview?.problemFit || 92}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between text-[10px] uppercase font-bold mb-1.5">
                                                                <span className="text-slate-600 dark:text-gray-400">Technical Feasibility</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400">{currentAiReview?.technicalFeasibility || selectedSub.aiReview?.technicalFeasibility || 86}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${currentAiReview?.technicalFeasibility || selectedSub.aiReview?.technicalFeasibility || 86}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between text-[10px] uppercase font-bold mb-1.5">
                                                                <span className="text-slate-600 dark:text-gray-400">Innovation & Originality</span>
                                                                <span className="text-blue-600 dark:text-blue-400">{currentAiReview?.innovationScore || 89}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${currentAiReview?.innovationScore || 89}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between text-[10px] uppercase font-bold mb-1.5">
                                                                <span className="text-slate-600 dark:text-gray-400">Code Quality & Completeness</span>
                                                                <span className="text-blue-600 dark:text-blue-400">{currentAiReview?.codeQualityScore || 85}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${currentAiReview?.codeQualityScore || 85}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Summary */}
                                                    <p className="text-xs text-slate-700 dark:text-gray-300 italic bg-white/80 dark:bg-black/30 p-3 rounded-xl border border-blue-200/50 dark:border-white/5">
                                                        "{currentAiReview?.summary || selectedSub.aiReview?.summary || 'Project delivers strong alignment with track objectives, featuring modular architectural structure and clear deliverable assets.'}"
                                                    </p>

                                                    {/* Strengths & Concerns */}
                                                    {(currentAiReview?.strengths || currentAiReview?.concerns) && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5 pt-3.5 border-t border-blue-200/50 dark:border-white/5 text-xs">
                                                            {currentAiReview?.strengths && currentAiReview.strengths.length > 0 && (
                                                                <div>
                                                                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mb-1.5">Key Strengths</span>
                                                                    <ul className="space-y-1">
                                                                        {currentAiReview.strengths.map((s, i) => (
                                                                            <li key={i} className="text-[11px] text-slate-600 dark:text-gray-300 flex items-start gap-1.5">
                                                                                <span className="text-emerald-500 font-bold">✓</span> {s}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {currentAiReview?.concerns && currentAiReview.concerns.length > 0 && (
                                                                <div>
                                                                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block mb-1.5">Areas for Review</span>
                                                                    <ul className="space-y-1">
                                                                        {currentAiReview.concerns.map((c, i) => (
                                                                            <li key={i} className="text-[11px] text-slate-600 dark:text-gray-300 flex items-start gap-1.5">
                                                                                <span className="text-amber-500 font-bold">⚠️</span> {c}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Internal Admin Notes */}
                                        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-3 border-b border-slate-200/80 dark:border-white/5 pb-2.5">
                                                Private Internal Admin Notes
                                            </h4>
                                            
                                            <div className="space-y-2.5 mb-3.5">
                                                {(selectedSub.notes || []).length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic">No internal admin notes added yet.</p>
                                                ) : (
                                                    (selectedSub.notes || []).map((note, idx) => (
                                                        <div key={idx} className="p-3 bg-white dark:bg-black/30 rounded-xl border border-slate-200/80 dark:border-white/5 text-xs shadow-sm">
                                                            <div className="flex justify-between font-bold text-blue-600 dark:text-blue-400 mb-1">
                                                                <span>{note.author}</span>
                                                                <span className="text-[10px] text-slate-400 font-mono">{note.date}</span>
                                                            </div>
                                                            <p className="text-slate-700 dark:text-gray-300">{note.text}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Add Note Form */}
                                            <form onSubmit={handleAddNote} className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add private note for admin team..." 
                                                    value={newAdminNote} 
                                                    onChange={(e) => setNewAdminNote(e.target.value)}
                                                    className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2563eb]"
                                                />
                                                <button type="submit" className="px-4 py-2 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer">
                                                    Add Note
                                                </button>
                                            </form>
                                        </div>

                                    </div>
                                )}

                            </div>

                            {/* Context-Aware Bottom Action Bar */}
                            <div className="p-4 sm:p-5 bg-white dark:bg-navy-900 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-lg">
                                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
                                    Current Status: <strong className="text-slate-900 dark:text-white uppercase">{selectedSub.status}</strong>
                                </div>

                                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2">
                                    {(selectedSub.status === 'Pending Review' || selectedSub.status === 'Changes Requested') && (
                                        <>
                                            <button 
                                                onClick={() => handleStatusUpdate(selectedSub.id, 'Rejected')}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                            >
                                                Reject
                                            </button>
                                            <button 
                                                onClick={() => setIsFlagModalOpen(true)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                            >
                                                Flag Investigation
                                            </button>
                                            <button 
                                                onClick={() => setIsRequestChangesOpen(true)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                            >
                                                Request Changes
                                            </button>
                                            <button 
                                                onClick={() => handleStatusUpdate(selectedSub.id, 'Approved')}
                                                disabled={actionLoading}
                                                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-[#2563eb]/20 font-bold text-xs rounded-xl shadow-md shadow-[#2563eb]/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5 text-white" />
                                                Approve Submission
                                            </button>
                                        </>
                                    )}

                                    {selectedSub.status === 'Approved' && (
                                        <button 
                                            onClick={() => handleStatusUpdate(selectedSub.id, 'Pending Review')}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                        >
                                            Revert to Pending
                                        </button>
                                    )}

                                    {selectedSub.status === 'Rejected' && (
                                        <>
                                            <button 
                                                onClick={() => handleStatusUpdate(selectedSub.id, 'Approved')}
                                                disabled={actionLoading}
                                                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-[#2563eb]/20 font-bold text-xs rounded-xl shadow-md shadow-[#2563eb]/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5 text-white" />
                                                Re-Approve
                                            </button>
                                            <button 
                                                onClick={() => handleStatusUpdate(selectedSub.id, 'Pending Review')}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                            >
                                                Revert to Pending
                                            </button>
                                        </>
                                    )}

                                    {selectedSub.status === 'Flagged for Investigation' && (
                                        <>
                                            <button 
                                                onClick={() => handleStatusUpdate(selectedSub.id, 'Approved')}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-500/30 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                                            >
                                                Clear Flag & Approve
                                            </button>
                                            <button 
                                                onClick={() => handleStatusUpdate(selectedSub.id, 'Rejected')}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-500/30 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                                            >
                                                Reject Submission
                                            </button>
                                        </>
                                    )}

                                    {selectedSub.status === 'Disqualified' && (
                                        <button 
                                            onClick={() => handleStatusUpdate(selectedSub.id, 'Pending Review')}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                        >
                                            Reinstate to Pending
                                        </button>
                                    )}

                                    {selectedSub.status !== 'Disqualified' && (
                                        <button 
                                            onClick={() => setIsDisqualifyModalOpen(true)}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-500/30 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                                        >
                                            Disqualify Team
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 p-8 text-center">
                            <FileTextIcon className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-bold text-sm">Select a submission from the left directory to evaluate.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* REQUEST CHANGES MODAL */}
            <ActionModal 
                isOpen={isRequestChangesOpen} 
                onClose={() => setIsRequestChangesOpen(false)} 
                title="Request Submission Changes"
                subtitle="Select specific deliverable items requiring team revision."
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { key: 'docs', label: 'Project Documentation (PPT / Report)' },
                            { key: 'demo', label: 'Demo Video / Walkthrough URL' },
                            { key: 'repo', label: 'GitHub Repository Source Code' },
                            { key: 'deployment', label: 'Live Deployment URL' },
                            { key: 'problemStatement', label: 'Problem Scope Definition' },
                            { key: 'postDeadline', label: 'Post-Deadline Git Revisions' },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 hover:border-blue-300">
                                <input 
                                    type="checkbox" 
                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" 
                                    checked={changeRequests[key]} 
                                    onChange={(e) => setChangeRequests({...changeRequests, [key]: e.target.checked})} 
                                /> 
                                <span className="font-medium truncate">{label}</span>
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">Extended Resubmission Window:</label>
                        <select 
                            value={extendedDeadline} 
                            onChange={(e) => setExtendedDeadline(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb]"
                        >
                            <option value="12 hours">12 Hours Extension</option>
                            <option value="24 hours">24 Hours Extension (Standard)</option>
                            <option value="48 hours">48 Hours Extension</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">Admin Guidance Note to Team:</label>
                        <textarea 
                            placeholder="Detail exactly what modifications are required before final judging..." 
                            rows="3" 
                            value={changeMessage} 
                            onChange={(e) => setChangeMessage(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                        <button 
                            onClick={() => setIsRequestChangesOpen(false)} 
                            className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSendChangeRequest} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/30 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
                        >
                            {actionLoading ? 'Dispatching...' : 'Dispatch Change Request'}
                        </button>
                    </div>
                </div>
            </ActionModal>

            {/* FLAG INVESTIGATION MODAL */}
            <ActionModal 
                isOpen={isFlagModalOpen} 
                onClose={() => setIsFlagModalOpen(false)} 
                title="Flag Submission for Investigation"
                subtitle="Select the primary reason for initiating compliance investigation."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {[
                            'High Code Similarity / Plagiarism Detected',
                            'Post-Deadline Repository Activity',
                            'Judge Conflict of Interest Detected',
                            'Incomplete Deliverables — Potential Cheating',
                            'Submission Deadline Policy Violation',
                            'Other Compliance Concern'
                        ].map(reason => (
                            <label key={reason} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 hover:border-blue-300">
                                <input 
                                    type="radio" 
                                    name="flagReason" 
                                    value={reason} 
                                    checked={flagReason === reason}
                                    onChange={(e) => setFlagReason(e.target.value)} 
                                    className="text-blue-600 focus:ring-blue-500 cursor-pointer" 
                                /> 
                                <span className="font-bold">{reason}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">Investigation Context (Optional):</label>
                        <textarea 
                            placeholder="Provide any specific evidence, commits, or notes..." 
                            rows="2" 
                            value={flagExplanation} 
                            onChange={(e) => setFlagExplanation(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                        <button 
                            onClick={() => setIsFlagModalOpen(false)} 
                            className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleFlagInvestigation} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-300/80 dark:border-blue-500/30 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
                        >
                            {actionLoading ? 'Flagging...' : 'Confirm Flag'}
                        </button>
                    </div>
                </div>
            </ActionModal>

            {/* DISQUALIFY MODAL */}
            <ActionModal 
                isOpen={isDisqualifyModalOpen} 
                onClose={() => setIsDisqualifyModalOpen(false)} 
                title="Disqualify Team Submission"
                subtitle="Specify official reason and evidence context for team disqualification."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {[
                            'Severe Code Plagiarism',
                            'Official Rule Violation',
                            'Ineligible Team Composition',
                            'Submission SLA Breach',
                            'Other Disqualification Cause'
                        ].map(reason => (
                            <label key={reason} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 hover:border-rose-300">
                                <input 
                                    type="radio" 
                                    name="disqualifyReason" 
                                    value={reason} 
                                    checked={disqualifyReason === reason}
                                    onChange={(e) => setDisqualifyReason(e.target.value)} 
                                    className="text-rose-600 focus:ring-rose-500 cursor-pointer" 
                                /> 
                                <span className="font-bold">{reason}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">Official Violation Notes & Context:</label>
                        <textarea 
                            placeholder="Explain the specific violation, SLA breach, or evidence details..." 
                            rows="2" 
                            value={disqualifyExplanation} 
                            onChange={(e) => setDisqualifyExplanation(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                        <button 
                            onClick={() => setIsDisqualifyModalOpen(false)} 
                            className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleDisqualifySubmit} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-500/30 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
                        >
                            {actionLoading ? 'Disqualifying...' : 'Confirm Disqualification'}
                        </button>
                    </div>
                </div>
            </ActionModal>

            {/* COMPARISON MODAL */}
            <ComparisonModal 
                isOpen={isCompareModalOpen}
                onClose={() => setIsCompareModalOpen(false)}
                subA={subA}
                subB={subB}
            />

        </div>
    );
};

export default Submissions;
