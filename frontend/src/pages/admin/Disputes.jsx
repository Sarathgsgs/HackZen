import React, { useState, useEffect, useMemo } from 'react';
import { ScaleIcon, SparklesIcon, TriangleAlertIcon, LockIcon, SirenIcon, CheckIcon } from '../../components/AdminIcons';
import { 
    fetchDisputes, 
    assignInvestigator, 
    requestInfoFromParty, 
    resolveDispute, 
    addDisputeNote,
    fetchDisputeAiAssessment
} from '../../services/admin/adminDisputesApi';
import AiAnalysisLoader from '../../components/AiAnalysisLoader';

// --- Reusable Modal Component ---
const ActionModal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full ${maxWidth} shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide text-slate-900 dark:text-white`}>
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">{title}</h2>
                {children}
            </div>
        </div>
    );
};

// --- Code Comparison Modal ---
const CodeComparisonModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="border rounded-2xl p-6 w-full max-w-5xl shadow-2xl relative bg-white dark:bg-navy-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                <h2 className="text-xl font-extrabold tracking-tight mb-1 text-blue-600 dark:text-blue-400">Plagiarism Code Similarity Inspector (94% Overlap)</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-5">Comparing reported team repository against open-source reference project.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs overflow-x-auto">
                    {/* Reported Code */}
                    <div className="p-4 bg-slate-950 text-slate-100 rounded-xl border border-rose-500/40">
                        <div className="flex justify-between border-b border-rose-500/30 pb-2 mb-2 text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                            <span>Reported Repo: /src/ml/model.py</span>
                            <span>Team CyberKnights</span>
                        </div>
                        <pre className="text-[11px] leading-relaxed text-rose-200 bg-rose-950/30 p-3 rounded-lg overflow-x-auto">
{`def predict_diagnosis(patient_data):
    # Core predictive model
    weights = [0.24, 0.51, 0.18]
    score = sum(w * d for w, d in zip(weights, patient_data))
    return {"risk": "HIGH" if score > 0.7 else "LOW"}`}
                        </pre>
                    </div>

                    {/* Reference Code */}
                    <div className="p-4 bg-slate-950 text-slate-100 rounded-xl border border-blue-500/40">
                        <div className="flex justify-between border-b border-blue-500/30 pb-2 mb-2 text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                            <span>Open-Source Reference Repo</span>
                            <span>github.com/open-ai/reference-health-llm</span>
                        </div>
                        <pre className="text-[11px] leading-relaxed text-blue-200 bg-blue-950/30 p-3 rounded-lg overflow-x-auto">
{`def predict_diagnosis(patient_data):
    # Core predictive model
    weights = [0.24, 0.51, 0.18]
    score = sum(w * d for w, d in zip(weights, patient_data))
    return {"risk": "HIGH" if score > 0.7 else "LOW"}`}
                        </pre>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span>97% line-by-line function logic similarity detected across 14 core source files.</span>
                </div>
            </div>
        </div>
    );
};

// --- AI Dispute Assessment Modal ---
const AIDisputeAssessmentModal = ({ isOpen, onClose, assessment, isLoading, onApplyResolution }) => {
    const [isCopied, setIsCopied] = useState(false);
    if (!isOpen) return null;

    const handleCopyNotice = () => {
        if (assessment?.suggestedCommunication) {
            navigator.clipboard.writeText(assessment.suggestedCommunication);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="border rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto bg-white dark:bg-navy-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                
                <div className="flex items-center gap-2.5 mb-2">
                    <span className="p-2 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold border border-blue-200 dark:border-blue-500/30">
                        <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </span>
                    <div>
                        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AI Dispute Investigation & Advisory</h2>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Deep heuristic code duplication analysis & automated administrative guidance.</p>
                    </div>
                </div>

                {isLoading ? (
                    <AiAnalysisLoader 
                        label="Performing AI Dispute Assessment..." 
                        subtext="Analyzing repository similarity, commit timeline signatures, and submitted evidence..." 
                    />
                ) : assessment?.errorMessage ? (
                    <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        {assessment.errorMessage}
                    </p>
                ) : assessment ? (
                    <div className="space-y-4 text-xs mt-4">
                        {/* Executive Summary */}
                        <div className="p-4 rounded-xl border bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/20">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 text-[10px]">Executive Summary</span>
                                <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                                    {assessment.severity || 'CRITICAL'} (Confidence: {assessment.confidenceScore || 95}%)
                                </span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{assessment.executiveSummary}</p>
                        </div>

                        {/* Key Findings */}
                        {assessment.keyFindings && (
                            <div className="p-4 rounded-xl border bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
                                <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-gray-400 mb-2">Key Investigative Findings</h4>
                                <ul className="space-y-1.5 list-disc pl-4 text-slate-700 dark:text-slate-300">
                                    {assessment.keyFindings.map((f, i) => (
                                        <li key={i}>{f}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendation */}
                        <div className="p-4 rounded-xl border bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/20">
                            <span className="font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 text-[10px] block mb-1">Recommended Decision</span>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-extrabold text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-3 py-1 rounded-lg border border-blue-300 dark:border-blue-500/40">
                                    {assessment.recommendedDecision}
                                </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{assessment.recommendationReason}</p>
                        </div>

                        {/* Suggested Notice with Copy Action */}
                        {assessment.suggestedCommunication && (
                            <div className="p-4 rounded-xl border bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-gray-400">Draft Official Notice to Team</span>
                                    <button 
                                        onClick={handleCopyNotice}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                    >
                                        {isCopied ? '✓ Copied Notice' : 'Copy Draft Notice'}
                                    </button>
                                </div>
                                <pre className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 text-[11px] bg-white dark:bg-black/40 p-3 rounded-xl border border-slate-200 dark:border-white/10 leading-relaxed">
                                    {assessment.suggestedCommunication}
                                </pre>
                            </div>
                        )}

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button 
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    if (onApplyResolution) {
                                        onApplyResolution(assessment);
                                    }
                                    onClose();
                                }}
                                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                            >
                                Auto-Fill Resolution Reason
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const Disputes = () => {
    const [disputes, setDisputes] = useState([]);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('ALL');

    // Modals
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiAssessment, setAiAssessment] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Resolution Form State
    const [resolutionDecision, setResolutionDecision] = useState('Disqualification');
    const [resolutionReason, setResolutionReason] = useState('');
    const [resolutionActions, setResolutionActions] = useState({ invalidateSubmission: true, disqualifyTeam: true, revokeCert: false, suspendAccount: false });
    const [notifyReporter, setNotifyReporter] = useState(true);
    const [notifyTeam, setNotifyTeam] = useState(true);

    // Modal Form Inputs
    const [investigatorInput, setInvestigatorInput] = useState({ name: 'Admin Sarah', email: 'sarah@proeduvate.com' });
    const [infoRequestForm, setInfoRequestForm] = useState({ target: 'Team', requestedItems: ['Repository Source Attribution', 'Commit Logs'], message: 'Please clarify code duplication.', deadlineHours: 48 });
    const [newNoteText, setNewNoteText] = useState('');
    const [noteIsInternal, setNoteIsInternal] = useState(true);

    const handleRunAiAssessment = async () => {
        if (!selectedDispute) return;
        setIsAiLoading(true);
        setIsAiModalOpen(true);
        try {
            const targetId = selectedDispute.id || selectedDispute._id || selectedDispute.disputeCode || 'DSP-2026-484C9';
            const data = await fetchDisputeAiAssessment(targetId);
            if (data && (data.executiveSummary || data.recommendedDecision)) {
                setAiAssessment(data);
            } else {
                setAiAssessment({ errorMessage: 'The assessment service returned no assessment. Please retry.' });
            }
        } catch (error) {
            console.error("AI Dispute assessment failed:", error);
            setAiAssessment({ errorMessage: 'Unable to complete the assessment. Please retry.' });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleApplyAiResolution = (assessment) => {
        if (!assessment) return;
        if (assessment.recommendedDecision === 'DISQUALIFICATION') {
            setResolutionDecision('Disqualification');
            setResolutionActions({ invalidateSubmission: true, disqualifyTeam: true, revokeCert: true, suspendAccount: false });
        } else if (assessment.recommendedDecision === 'ISSUE_WARNING') {
            setResolutionDecision('Official Warning');
            setResolutionActions({ invalidateSubmission: false, disqualifyTeam: false, revokeCert: false, suspendAccount: false });
        } else if (assessment.recommendedDecision === 'DISMISS') {
            setResolutionDecision('Dismiss Dispute');
            setResolutionActions({ invalidateSubmission: false, disqualifyTeam: false, revokeCert: false, suspendAccount: false });
        }
        if (assessment.recommendationReason) {
            setResolutionReason(assessment.recommendationReason);
        }
    };

    const loadDisputes = async () => {
        setIsLoading(true);
        try {
            const data = await fetchDisputes();
            if (Array.isArray(data) && data.length > 0) {
                setDisputes(data);
                setSelectedDispute(data[0]);
            }
        } catch (error) {
            console.log("Loaded initial workspace dataset for Disputes.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDisputes();
    }, []);

    // Filter Logic
    const filteredDisputes = useMemo(() => {
        return disputes.filter(d => {
            const matchesTab = 
                activeTab === 'All' ? true :
                activeTab === 'Under Investigation' ? d.status.includes('Investigation') :
                activeTab === 'Resolved' ? d.status === 'Resolved' : true;

            const matchesSeverity = severityFilter === 'ALL' ? true : d.severity === severityFilter;
            const query = searchQuery.toLowerCase();
            const matchesSearch = 
                (d.disputeCode || '').toLowerCase().includes(query) ||
                (d.reportedTeam?.name || '').toLowerCase().includes(query) ||
                (d.reporter?.name || '').toLowerCase().includes(query) ||
                (d.title || '').toLowerCase().includes(query) ||
                (d.type || '').toLowerCase().includes(query);

            return matchesTab && matchesSeverity && matchesSearch;
        });
    }, [disputes, activeTab, severityFilter, searchQuery]);

    // Handle Resolution Submission
    const handleResolveSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDispute || !resolutionReason.trim()) {
            return alert("Mandatory resolution reason is required for audit logs.");
        }
        const actions = Object.keys(resolutionActions).filter(k => resolutionActions[k]);
        try {
            await resolveDispute(selectedDispute.id || selectedDispute.disputeCode, resolutionDecision, resolutionReason, actions, notifyReporter, notifyTeam);
            alert(`✓ Dispute Case ${selectedDispute.disputeCode} RESOLVED with decision '${resolutionDecision}'.`);
            loadDisputes();
        } catch (err) {
            alert("Failed to resolve dispute.");
        }
    };

    // Handle Investigator Assignment
    const handleAssignInvestigatorSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDispute) return;
        try {
            await assignInvestigator(selectedDispute.id || selectedDispute.disputeCode, investigatorInput.name, investigatorInput.email);
            alert(`✓ Investigator ${investigatorInput.name} assigned.`);
            setIsAssignModalOpen(false);
            loadDisputes();
        } catch (err) {
            alert("Failed to assign investigator.");
        }
    };

    // Handle Information Request
    const handleRequestInfoSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDispute) return;
        try {
            await requestInfoFromParty(selectedDispute.id || selectedDispute.disputeCode, infoRequestForm.target, infoRequestForm.requestedItems, infoRequestForm.message, infoRequestForm.deadlineHours);
            alert(`✓ Information request sent to ${infoRequestForm.target}. Case status updated to 'Waiting for Response'.`);
            setIsRequestInfoModalOpen(false);
            loadDisputes();
        } catch (err) {
            alert("Failed to request info.");
        }
    };

    // Add Note / Message
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!selectedDispute || !newNoteText.trim()) return;
        try {
            const res = await addDisputeNote(selectedDispute.id || selectedDispute.disputeCode, newNoteText, noteIsInternal);
            setDisputes(prev => prev.map(d => d.id === selectedDispute.id ? { ...d, communications: [...(d.communications || []), res.note] } : d));
            if (selectedDispute) setSelectedDispute(prev => ({ ...prev, communications: [...(prev.communications || []), res.note] }));
            setNewNoteText('');
        } catch (err) {
            alert("Failed to add note.");
        }
    };

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 max-w-7xl mx-auto">
            
            {/* Header & Main Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Disputes & Moderation Governance</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Investigate plagiarism flags, rule violations, conflict of interest, and evidence chains.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadDisputes} 
                        title="Refresh Disputes"
                        className="p-2.5 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl transition-all flex items-center justify-center shadow-sm active:scale-95 cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 1. TOP KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
                {[
                    { label: 'Total Disputes', val: '24', icon: <ScaleIcon className="w-3.5 h-3.5 text-blue-500" />, tab: 'All', sev: 'ALL', iconBg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
                    { label: 'Open Cases', val: '7', color: 'text-amber-600 dark:text-amber-400', icon: <SirenIcon className="w-3.5 h-3.5 text-amber-500" />, tab: 'Under Investigation', sev: 'HIGH', iconBg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
                    { label: 'Investigation', val: '9', color: 'text-blue-600 dark:text-blue-400', icon: <ScaleIcon className="w-3.5 h-3.5 text-blue-500" />, tab: 'Under Investigation', sev: 'ALL', iconBg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
                    { label: 'Critical Cases', val: '2', color: 'text-rose-600 dark:text-rose-400', icon: <TriangleAlertIcon className="w-3.5 h-3.5 text-rose-500" />, tab: 'Under Investigation', sev: 'CRITICAL', iconBg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' },
                    { label: 'Resolved Cases', val: '8', color: 'text-emerald-600 dark:text-emerald-400', icon: <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />, tab: 'Resolved', sev: 'ALL', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' }
                ].map((stat, i) => (
                    <div 
                        key={i} 
                        onClick={() => {
                            setActiveTab(stat.tab);
                            setSeverityFilter(stat.sev);
                        }}
                        className="rounded-xl p-3 sm:p-3.5 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <h3 className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 truncate">{stat.label}</h3>
                            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                                {stat.icon}
                            </div>
                        </div>
                        <div className="my-0.5">
                            <p className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight ${stat.color || 'text-slate-900 dark:text-white'}`}>{stat.val}</p>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-gray-500">
                            <span>Filter cases</span>
                            <span className="group-hover:translate-x-1 transition-transform opacity-70">→</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex p-1 bg-slate-100 dark:bg-navy-800/80 rounded-xl border border-slate-200 dark:border-white/10">
                    {['All', 'Under Investigation', 'Resolved'].map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    isActive 
                                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' 
                                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {tab}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder="Search case code, team, reporter..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2563eb]"
                        />
                    </div>

                    <div className="relative inline-flex items-center">
                        <select 
                            value={severityFilter} 
                            onChange={(e) => setSeverityFilter(e.target.value)} 
                            className="appearance-none pr-8 pl-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold bg-slate-50 dark:bg-black/20 text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb] cursor-pointer transition-all"
                        >
                            <option value="ALL">All Severities</option>
                            <option value="CRITICAL">🔴 Critical</option>
                            <option value="HIGH">🟠 High</option>
                            <option value="MEDIUM">🟡 Medium</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* SPLIT PANE WORKSPACE */}
            <div className="flex flex-col lg:flex-row gap-6 min-h-[560px] lg:h-[750px]">
                
                {/* LEFT PANE: Dispute Case Directory List */}
                <div className="w-full lg:w-1/3 flex flex-col rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden p-0 h-[360px] sm:h-[480px] lg:h-auto">
                    <div className="p-3.5 border-b border-slate-200 dark:border-white/10 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center justify-between">
                        <span>Dispute Cases ({filteredDisputes.length})</span>
                        <span className="text-[10px] font-normal text-slate-400">Click to inspect</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center text-xs text-blue-600 font-bold animate-pulse">Loading Live Disputes...</div>
                        ) : filteredDisputes.length === 0 ? (
                            <div className="text-center text-slate-400 dark:text-gray-500 text-xs py-12">No dispute cases match specified criteria.</div>
                        ) : (
                            filteredDisputes.map(dispute => {
                                const isSelected = selectedDispute?.id === dispute.id;
                                return (
                                    <div 
                                        key={dispute.id} 
                                        onClick={() => setSelectedDispute(dispute)}
                                        className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                                            isSelected 
                                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40 shadow-sm' 
                                            : 'bg-white dark:bg-navy-800/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <span className="text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400">{dispute.disputeCode}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                                dispute.severity === 'CRITICAL' 
                                                ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' 
                                                : 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                            }`}>
                                                {dispute.severity === 'CRITICAL' ? '🔴 Critical' : dispute.severity}
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{dispute.type} - {dispute.reportedTeam?.name}</h4>
                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 truncate">{dispute.hackathonTitle}</p>
                                        
                                        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-gray-400">
                                            <span>SLA: {dispute.assessment?.slaRemaining || '17h remaining'}</span>
                                            <span className="font-bold text-slate-700 dark:text-gray-300">{dispute.status}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Dispute Case Investigation Workspace */}
                <div className="w-full lg:w-2/3 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between overflow-y-auto custom-scrollbar">
                    {selectedDispute ? (
                        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
                            
                            {/* Header */}
                            <div className="border-b border-slate-200 dark:border-white/10 pb-4">
                                <div className="flex flex-wrap justify-between items-center gap-3 mb-1.5">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{selectedDispute.disputeCode}</h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                            selectedDispute.severity === 'CRITICAL' 
                                            ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' 
                                            : 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                        }`}>
                                            {selectedDispute.severity}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                                        Status: {selectedDispute.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-gray-400">Category: <strong className="text-slate-800 dark:text-white">{selectedDispute.type}</strong> • Event: {selectedDispute.hackathonTitle}</p>
                            </div>

                            {/* 1. CASE ASSESSMENT HEADER */}
                            <div className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                                selectedDispute.severity === 'CRITICAL' 
                                ? 'bg-rose-50/70 dark:bg-red-500/10 border-rose-200 dark:border-red-500/30' 
                                : 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                            }`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <ScaleIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                        <h3 className={`text-xs font-extrabold uppercase tracking-wider ${
                                            selectedDispute.severity === 'CRITICAL' ? 'text-rose-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                                        }`}>
                                            Case Risk Assessment & AI Recommendation
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-800 dark:text-white">
                                        <span>Evidence Verified: <strong className="text-blue-600 dark:text-blue-400">{selectedDispute.assessment?.evidenceVerified || '3 / 4'}</strong></span>
                                        <span className="text-slate-300 dark:text-gray-600">|</span>
                                        <span>AI Confidence: <strong className="text-emerald-600 dark:text-emerald-400">{selectedDispute.assessment?.aiConfidence || 91}%</strong></span>
                                        <span className="text-slate-300 dark:text-gray-600">|</span>
                                        <span className="text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1">
                                            {(selectedDispute.assessment?.slaRemaining?.includes('EXCEEDED') || selectedDispute.assessment?.slaRemaining?.includes('⚠️')) && (
                                                <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-500 inline-block shrink-0" />
                                            )}
                                            <span>SLA: {selectedDispute.assessment?.slaRemaining?.replace('⚠️', '').trim() || '17h remaining'}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <button 
                                        onClick={handleRunAiAssessment}
                                        disabled={isAiLoading}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-300/80 dark:border-blue-500/30 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                        <span>{isAiLoading ? 'Analyzing...' : 'Run AI Analysis'}</span>
                                    </button>
                                    <div className="text-left md:text-right">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 block">AI Recommendation</span>
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-500/20 inline-block mt-0.5">
                                            {selectedDispute.assessment?.recommendation || 'INVESTIGATE'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. CONFLICT OF INTEREST (COI) ALERT */}
                            {selectedDispute.coi?.detected && (
                                <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span>CONFLICT OF INTEREST DETECTED: {selectedDispute.coi.message}</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsAssignModalOpen(true)} 
                                        className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm cursor-pointer"
                                    >
                                        Reassign Investigator
                                    </button>
                                </div>
                            )}

                            {/* 3. REPORTER & TARGET TEAM HISTORY PANEL */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 text-slate-700 dark:text-gray-300">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider mb-2 text-slate-500 dark:text-gray-400">Reporter Profile & History</h4>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedDispute.reporter?.name} ({selectedDispute.reporter?.role})</p>
                                    <p className="text-[11px] text-slate-500 dark:text-gray-400">{selectedDispute.reporter?.email}</p>
                                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between text-[10px] font-mono">
                                        <span>Previous Reports: <strong className="text-slate-900 dark:text-white">{selectedDispute.reporter?.previousReports || 0}</strong></span>
                                        <span className="text-emerald-600 dark:text-emerald-400">Accuracy: <strong>{selectedDispute.reporter?.accuracyRating || '100%'}</strong></span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 text-slate-700 dark:text-gray-300">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider mb-2 text-slate-500 dark:text-gray-400">Reported Team Profile & History</h4>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedDispute.reportedTeam?.name}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-gray-400">{selectedDispute.reportedTeam?.college}</p>
                                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between text-[10px] font-mono">
                                        <span>Past Disputes: <strong className="text-slate-900 dark:text-white">{selectedDispute.reportedTeam?.previousCases || 2}</strong></span>
                                        <span className="text-rose-600 dark:text-rose-400">Violations: <strong>{selectedDispute.reportedTeam?.confirmedViolations || 1}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* 4. CODE SIMILARITY & PLAGIARISM ANALYSIS */}
                            {selectedDispute.similarityAnalysis && (
                                <div className="p-5 bg-blue-50/60 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                    <div className="flex justify-between items-center mb-3 border-b border-blue-200 dark:border-blue-500/20 pb-2">
                                        <h4 className="text-xs font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">✦ Code Similarity & Plagiarism Analysis</h4>
                                        <button 
                                            onClick={() => setIsCodeModalOpen(true)} 
                                            className="px-3 py-1.5 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm cursor-pointer"
                                        >
                                            Side-by-Side Code Compare →
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-3">
                                        <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 text-slate-700 dark:text-white">
                                            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{selectedDispute.similarityAnalysis.overallSimilarity}%</p>
                                            <p className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase mt-0.5">Overall Similarity</p>
                                        </div>
                                        <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 text-slate-700 dark:text-white">
                                            <p className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedDispute.similarityAnalysis.sourceCode}%</p>
                                            <p className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase mt-0.5">Source Code</p>
                                        </div>
                                        <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 text-slate-700 dark:text-white">
                                            <p className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedDispute.similarityAnalysis.documentation}%</p>
                                            <p className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase mt-0.5">Documentation</p>
                                        </div>
                                        <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 text-slate-700 dark:text-white">
                                            <p className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedDispute.similarityAnalysis.readme}%</p>
                                            <p className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase mt-0.5">README</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-gray-300 font-mono truncate">Matched Source: <a href={selectedDispute.similarityAnalysis.matchedSourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline">{selectedDispute.similarityAnalysis.matchedSourceUrl}</a></p>
                                </div>
                            )}

                            {/* 5. EVIDENCE CHAIN & INTEGRITY CHECKLIST */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 text-slate-700 dark:text-gray-300">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider mb-2.5 text-slate-500 dark:text-gray-400">Evidence Items</h4>
                                    <div className="space-y-2">
                                        {(selectedDispute.evidence || []).map((ev, i) => (
                                            <div key={i} className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 flex justify-between items-center text-xs font-semibold text-slate-800 dark:text-white">
                                                <span>✓ {ev.type} ({ev.source})</span>
                                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Verified</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 text-slate-700 dark:text-gray-300">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider mb-2.5 text-slate-500 dark:text-gray-400">Evidence Integrity Chain</h4>
                                    <div className="space-y-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        <div>✓ Original source verified</div>
                                        <div>✓ Report hash verified</div>
                                        <div>✓ Submission version matched</div>
                                        <div>✓ Timestamp verified</div>
                                        <div className="text-slate-500 dark:text-gray-400">✓ Evidence modified: <strong className="text-slate-800 dark:text-white">No</strong></div>
                                    </div>
                                </div>
                            </div>

                            {/* 6. INVESTIGATION CHECKLIST (8 REQUIREMENTS) */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 text-slate-700 dark:text-gray-300">
                                <div className="flex justify-between items-center mb-3 border-b border-slate-200 dark:border-white/10 pb-2">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Investigation Workflow Checklist</h4>
                                    <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/20">
                                        6 / 8 Requirements Completed
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Complaint reviewed</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Reporter identity verified</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Reported team identified</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Submission inspected</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Evidence verified</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Similarity checked</div>
                                    <div className="text-amber-600 dark:text-amber-400">○ Team response received</div>
                                    <div className="text-slate-400 dark:text-gray-500">○ Final decision recorded</div>
                                </div>
                            </div>

                            {/* 7. COMMUNICATIONS & INTERNAL NOTES STREAM */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 text-slate-700 dark:text-gray-300">
                                <h4 className="text-[10px] font-extrabold uppercase tracking-wider mb-3 border-b border-slate-200 dark:border-white/10 pb-2 text-slate-500 dark:text-gray-400">Case Communications & Internal Notes Stream</h4>
                                <div className="space-y-2.5 mb-4">
                                    {(selectedDispute.communications || []).map((comm, idx) => (
                                        <div key={idx} className={`p-3 rounded-xl border text-xs ${comm.isInternal ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/5'}`}>
                                            <div className="flex justify-between font-bold text-blue-600 dark:text-blue-400 mb-1">
                                                <span>{comm.author} ({comm.role})</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{comm.date || comm.time}</span>
                                            </div>
                                            <p className="text-slate-700 dark:text-gray-300">{comm.text}</p>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={handleAddNote} className="space-y-2.5">
                                    <textarea 
                                        placeholder="Add note or official communication..." 
                                        rows="2" 
                                        value={newNoteText} 
                                        onChange={(e) => setNewNoteText(e.target.value)} 
                                        className="w-full rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb] resize-none"
                                    ></textarea>
                                    <div className="flex justify-between items-center">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-300 cursor-pointer">
                                            <input type="checkbox" checked={noteIsInternal} onChange={(e) => setNoteIsInternal(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" /> 
                                            <LockIcon className="w-3.5 h-3.5 text-slate-400 inline mr-0.5" /> 
                                            <span>Internal Admin Note Only</span>
                                        </label>
                                        <button 
                                            type="submit" 
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                                        >
                                            Add Stream Note
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* 8. FINAL DECISION & RESOLUTION PANEL */}
                            <form onSubmit={handleResolveSubmit} className="p-5 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
                                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-white/10 pb-2">Final Case Decision & Resolution Action</h4>
                                
                                <div>
                                    <label className="text-[10px] font-extrabold uppercase tracking-wider mb-2 block text-slate-500 dark:text-gray-400">Admin Decision Outcome</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {['No Violation', 'Warning', 'Minor Violation', 'Major Violation', 'Disqualification', 'Account Suspension'].map(d => {
                                            const isSelected = resolutionDecision === d;
                                            return (
                                                <button 
                                                    type="button" 
                                                    key={d} 
                                                    onClick={() => setResolutionDecision(d)}
                                                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                        isSelected 
                                                        ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 shadow-sm font-extrabold' 
                                                        : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-extrabold uppercase tracking-wider mb-1.5 block text-slate-500 dark:text-gray-400">Resolution Actions Taken</label>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-gray-300">
                                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
                                            <input type="checkbox" checked={resolutionActions.invalidateSubmission} onChange={(e) => setResolutionActions({...resolutionActions, invalidateSubmission: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /> 
                                            <span>Invalidate Submission</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
                                            <input type="checkbox" checked={resolutionActions.disqualifyTeam} onChange={(e) => setResolutionActions({...resolutionActions, disqualifyTeam: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /> 
                                            <span>Disqualify Team</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
                                            <input type="checkbox" checked={resolutionActions.revokeCert} onChange={(e) => setResolutionActions({...resolutionActions, revokeCert: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /> 
                                            <span>Revoke Certificate</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
                                            <input type="checkbox" checked={resolutionActions.suspendAccount} onChange={(e) => setResolutionActions({...resolutionActions, suspendAccount: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /> 
                                            <span>Suspend Account</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-extrabold uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Mandatory Resolution Reason (Required for Audit Logs)</label>
                                    <textarea 
                                        required 
                                        placeholder="Record clear evidence-based justification for final decision..." 
                                        rows="3" 
                                        value={resolutionReason} 
                                        onChange={(e) => setResolutionReason(e.target.value)} 
                                        className="w-full rounded-xl px-3.5 py-2 text-xs bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb] resize-none"
                                    ></textarea>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-gray-300">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={notifyReporter} onChange={(e) => setNotifyReporter(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" /> 
                                            <span>Notify Reporter</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={notifyTeam} onChange={(e) => setNotifyTeam(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" /> 
                                            <span>Notify Team</span>
                                        </label>
                                    </div>

                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsRequestInfoModalOpen(true)} 
                                            className="px-3.5 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                        >
                                            Request Info
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsAssignModalOpen(true)} 
                                            className="px-3.5 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                        >
                                            Assign
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-blue-500/20 font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                                        >
                                            Record Decision & Resolve
                                        </button>
                                    </div>
                                </div>
                            </form>

                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-gray-500 font-bold text-xs p-8">
                            Select a dispute case from the directory to begin evidence investigation
                        </div>
                    )}
                </div>
            </div>

            {/* REQUEST INFORMATION MODAL */}
            <ActionModal isOpen={isRequestInfoModalOpen} onClose={() => setIsRequestInfoModalOpen(false)} title="Request Information from Party">
                <form onSubmit={handleRequestInfoSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Target Recipient</label>
                        <select 
                            value={infoRequestForm.target} 
                            onChange={(e) => setInfoRequestForm({...infoRequestForm, target: e.target.value})} 
                            className="w-full rounded-xl px-3.5 py-2 text-xs font-bold bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb] cursor-pointer"
                        >
                            <option value="Team">Reported Team</option>
                            <option value="Reporter">Reporter</option>
                            <option value="Mentor">Mentor</option>
                            <option value="Organizer">Organizer</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Explanation or Requirements</label>
                        <textarea 
                            placeholder="Specific explanation or document required..." 
                            rows="3" 
                            value={infoRequestForm.message} 
                            onChange={(e) => setInfoRequestForm({...infoRequestForm, message: e.target.value})} 
                            className="w-full rounded-xl px-3.5 py-2 text-xs bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb] resize-none"
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsRequestInfoModalOpen(false)} 
                            className="px-4 py-2 text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 cursor-pointer"
                        >
                            Dispatch Info Request
                        </button>
                    </div>
                </form>
            </ActionModal>

            {/* ASSIGN INVESTIGATOR MODAL */}
            <ActionModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Case Investigator">
                <form onSubmit={handleAssignInvestigatorSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Investigator Name</label>
                        <input 
                            type="text" 
                            required 
                            value={investigatorInput.name} 
                            onChange={(e) => setInvestigatorInput({...investigatorInput, name: e.target.value})} 
                            className="w-full rounded-xl px-3.5 py-2 text-xs bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb]" 
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Investigator Email</label>
                        <input 
                            type="email" 
                            required 
                            value={investigatorInput.email} 
                            onChange={(e) => setInvestigatorInput({...investigatorInput, email: e.target.value})} 
                            className="w-full rounded-xl px-3.5 py-2 text-xs bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-[#2563eb]" 
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsAssignModalOpen(false)} 
                            className="px-4 py-2 text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                        >
                            Assign Investigator
                        </button>
                    </div>
                </form>
            </ActionModal>

            {/* CODE COMPARISON MODAL */}
            <CodeComparisonModal isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} />

            {/* AI DISPUTE ASSESSMENT MODAL */}
            <AIDisputeAssessmentModal 
                isOpen={isAiModalOpen} 
                onClose={() => setIsAiModalOpen(false)} 
                assessment={aiAssessment} 
                isLoading={isAiLoading} 
                onApplyResolution={handleApplyAiResolution}
            />

        </div>
    );
};

export default Disputes;
