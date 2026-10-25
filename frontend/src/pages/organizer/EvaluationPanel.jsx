import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCriteria, submitEvaluation, fetchSubmissionsForEvaluation } from '../../services/organizer/evaluationApi';
import { updateTeamShortlistStatus } from '../../services/organizer/evaluationPanelApi';

const EvaluationPanel = () => {
    const navigate = useNavigate();

    // --- State Management ---
    const [selectedTeamId, setSelectedTeamId] = useState(() => {
        return sessionStorage.getItem('eval_selectedTeamId') || null;
    });
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('eval_searchTerm') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('eval_activeTab') || 'pending');

    // Evaluation Form State
    const [scores, setScores] = useState({});
    const [comment, setComment] = useState('');
    const [isShortlisted, setIsShortlisted] = useState(false);

    // Data State
    const [teams, setTeams] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Toast auto-dismiss
    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(null), 3500);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    // --- Backend Data Initialization ---
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [backendCriteria, backendSubmissions] = await Promise.all([
                    fetchCriteria(),
                    fetchSubmissionsForEvaluation()
                ]);

                setCriteria(backendCriteria);
                setTeams(backendSubmissions);

                // Initialize scores based on criteria labels
                const initialScores = {};
                backendCriteria.forEach(c => { initialScores[c.id] = 0; });
                setScores(initialScores);

                // Set default selection if none saved or if saved one isn't in the list
                if (!selectedTeamId && backendSubmissions.length > 0) {
                    setSelectedTeamId(backendSubmissions[0].id);
                }
            } catch (error) {
                console.error("Failed to load evaluation data", error);
                setToastMessage({ type: 'error', text: 'Failed to load evaluation submissions.' });
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    // --- Persistence & Search Debouncing ---
    useEffect(() => {
        sessionStorage.setItem('eval_searchTerm', searchTerm);
        sessionStorage.setItem('eval_activeTab', activeTab);
        if (selectedTeamId) sessionStorage.setItem('eval_selectedTeamId', selectedTeamId);
    }, [searchTerm, activeTab, selectedTeamId]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Derived Logic for Active Team & Form Reset
    const activeTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);

    useEffect(() => {
        if (activeTeam) {
            // Check if draft exists in localStorage
            const savedDrafts = JSON.parse(localStorage.getItem('evaluation_drafts') || '{}');
            const teamDraft = savedDrafts[activeTeam.id];

            if (teamDraft) {
                setScores(teamDraft.scores || {});
                setComment(teamDraft.comment || '');
                setIsShortlisted(teamDraft.isShortlisted || false);
            } else if (activeTeam.existingScores) {
                setScores(activeTeam.existingScores);
                setComment(activeTeam.comment || '');
                setIsShortlisted(activeTeam.shortlisted || false);
            } else {
                const resetScores = {};
                criteria.forEach(c => { resetScores[c.id] = 0; });
                setScores(resetScores);
                setComment('');
                setIsShortlisted(false);
            }
        }
    }, [selectedTeamId, activeTeam, criteria]);

    // --- Filtering Logic ---
    const filteredTeams = useMemo(() => {
        return teams.filter(t => {
            const matchesSearch = (t.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (t.project || '').toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesTab = activeTab === 'pending'
                ? t.status !== 'Evaluated'
                : t.status === 'Evaluated';
            return matchesSearch && matchesTab;
        });
    }, [teams, debouncedSearch, activeTab]);

    const totalScore = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);

    // --- Action Handlers ---
    const handleSubmitScore = async () => {
        if (!activeTeam) return;

        const previousTeams = [...teams];
        setTeams(prev => prev.map(t =>
            t.id === activeTeam.id
                ? { ...t, status: 'Evaluated', score: totalScore, existingScores: { ...scores }, comment, shortlisted: isShortlisted }
                : t
        ));
        setIsSubmitting(true);

        try {
            const payload = {
                submissionId: activeTeam.submissionId,
                teamId: activeTeam.teamId,
                scores: { ...scores },
                feedback: comment || 'No comments provided',
                totalScore: totalScore
            };

            await submitEvaluation(payload);
            setToastMessage({ type: 'success', text: `Evaluation submitted for ${activeTeam.name}!` });

            // Remove any draft for this team
            const savedDrafts = JSON.parse(localStorage.getItem('evaluation_drafts') || '{}');
            delete savedDrafts[activeTeam.id];
            localStorage.setItem('evaluation_drafts', JSON.stringify(savedDrafts));

            // Move to next pending team if any
            const nextPending = teams.find(t => t.id !== activeTeam.id && t.status !== 'Evaluated');
            if (nextPending && activeTab === 'pending') {
                setSelectedTeamId(nextPending.id);
            }
        } catch (error) {
            setTeams(previousTeams);
            setToastMessage({ type: 'error', text: 'Failed to submit evaluation. Changes rolled back.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveDraft = () => {
        if (!activeTeam) return;
        const savedDrafts = JSON.parse(localStorage.getItem('evaluation_drafts') || '{}');
        savedDrafts[activeTeam.id] = {
            scores,
            comment,
            isShortlisted,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('evaluation_drafts', JSON.stringify(savedDrafts));
        setToastMessage({ type: 'success', text: `Draft saved locally for ${activeTeam.name}.` });
    };

    const handleShortlistToggle = async () => {
        if (!activeTeam) return;
        const subId = activeTeam.submissionId || activeTeam.id;
        const nextState = !isShortlisted;
        setIsShortlisted(nextState);
        try {
            await updateTeamShortlistStatus(subId, nextState);
            setTeams(prev => prev.map(t => t.id === activeTeam.id ? { ...t, shortlisted: nextState } : t));
            setToastMessage({ 
                type: 'success', 
                text: nextState ? `${activeTeam.name} added to shortlist.` : `${activeTeam.name} removed from shortlist.` 
            });
        } catch (err) {
            console.error("Failed to toggle shortlist:", err);
            setIsShortlisted(!nextState);
            setToastMessage({ type: 'error', text: 'Failed to update shortlist status.' });
        }
    };

    const handleQuickLink = (type) => {
        if (!activeTeam) return;

        let targetUrl = '';
        let label = '';

        if (type === 'repo') {
            targetUrl = activeTeam.repoUrl;
            label = 'Repository';
        } else if (type === 'demo') {
            targetUrl = activeTeam.demoUrl;
            label = 'Demo Video';
        } else if (type === 'details') {
            targetUrl = activeTeam.projectUrl;
            label = 'Project Details';
        }

        if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else {
            setToastMessage({ 
                type: 'error', 
                text: `No external link available for ${label} on this submission.` 
            });
        }
    };

    // --- Icons Component ---
    const Icon = ({ name, className }) => {
        const icons = {
            Search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
            Filter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />,
            Settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
            Check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
            Star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
            ExternalLink: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />,
            Video: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />,
            GitHub: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
            FileText: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
        };
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {icons[name]}
            </svg>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[calc(100vh-140px)] flex flex-col pb-6 relative">

            {/* Floating Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition-all animate-bounce ${
                    toastMessage.type === 'success' 
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                }`}>
                    <span>{toastMessage.type === 'success' ? '✓' : '⚠️'}</span>
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Evaluation Panel</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Score submissions, add comments, and shortlist top teams</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/organizer/evaluation/criteria')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    >
                        <Icon name="Settings" className="w-4 h-4" />
                        Criteria Settings
                    </button>
                    <button 
                        onClick={() => navigate('/organizer/results')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Icon name="Check" className="w-4 h-4" />
                        Finalize Shortlist
                    </button>
                </div>
            </div>

            {/* Main Content Two-Column Layout */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1">

                {/* Left Panel: Team List */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs relative min-h-[550px]">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-navy-900/60 backdrop-blur-[2px] z-10 rounded-2xl flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    {/* Search & Tabs */}
                    <div className="space-y-3 shrink-0">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Icon name="Search" className="w-4 h-4 text-slate-400 dark:text-gray-400 group-focus-within:text-[#2563eb] transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Filter teams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
                            />
                        </div>
                        <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'pending' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                Pending ({teams.filter(t => t.status !== 'Evaluated').length})
                            </button>
                            <button
                                onClick={() => setActiveTab('done')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'done' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                Evaluated ({teams.filter(t => t.status === 'Evaluated').length})
                            </button>
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[600px] custom-scrollbar">
                        {filteredTeams.length > 0 ? (
                            filteredTeams.map((team) => (
                                <div
                                    key={team.id}
                                    onClick={() => setSelectedTeamId(team.id)}
                                    className={`p-3.5 rounded-xl border cursor-pointer transition-all group relative ${
                                        selectedTeamId === team.id
                                            ? 'bg-blue-500/10 border-[#2563eb] dark:border-[#2563eb]'
                                            : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
                                    }`}
                                >
                                    {selectedTeamId === team.id && (
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#2563eb] rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                                    )}
                                    <div className="flex justify-between items-start mb-1 pl-2">
                                        <h3 className={`font-semibold text-sm transition-colors group-hover:text-[#2563eb] ${selectedTeamId === team.id ? 'text-[#2563eb] dark:text-blue-300' : 'text-slate-800 dark:text-gray-200'}`}>
                                            {team.name}
                                        </h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                            team.status === 'Evaluated' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                            team.status === 'Reviewing' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                            'bg-blue-500/10 text-[#2563eb] dark:text-blue-300 border-blue-500/20'
                                        }`}>
                                            {team.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 pl-2 mb-2 line-clamp-1">{team.project}</p>
                                    <div className="flex justify-between items-center pl-2">
                                        <span className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">{team.submitted}</span>
                                        {team.score !== null && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold text-[#2563eb] dark:text-blue-300">{team.score}</span>
                                                <span className="text-[9px] text-slate-400 dark:text-gray-500 font-bold">PTS</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : !isLoading && (
                            <div className="text-center py-20 flex flex-col items-center">
                                <p className="text-slate-400 dark:text-gray-500 text-xs uppercase tracking-widest font-bold">No submissions found</p>
                                <button onClick={() => { setSearchTerm(''); setActiveTab('pending'); }} className="mt-2 text-[#2563eb] dark:text-blue-400 text-xs font-bold uppercase hover:underline">Reset filters</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Evaluation Form */}
                <div className="w-full lg:w-2/3 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col shadow-xs overflow-hidden relative min-h-[550px]">
                    {!activeTeam ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 p-10 text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 border border-slate-200 dark:border-white/10 shadow-inner">
                                <Icon name="Check" className="w-8 h-8 text-slate-400 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wide">Select a team</h3>
                            <p className="max-w-[320px] text-sm text-slate-500 dark:text-gray-400 leading-relaxed">Select a submission from the list on the left to review and evaluate their work.</p>
                        </div>
                    ) : (
                        <>
                            {/* Form Header / Team Details */}
                            <div className="p-6 border-b border-slate-200/80 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-white/[0.02] relative">
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{activeTeam.name}</h2>
                                        <h3 className="text-lg font-medium text-[#2563eb] dark:text-blue-300 mb-2 truncate max-w-md">{activeTeam.project}</h3>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400">
                                            <span>{activeTeam.members?.length > 0 ? activeTeam.members.join(', ') : 'Team submission'}</span>
                                            <span>•</span>
                                            <span>{activeTeam.submitted}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-slate-400 dark:text-gray-400 mb-1 uppercase tracking-widest">Total Score</div>
                                        <div className="text-4xl font-black text-[#2563eb] dark:text-blue-300 tracking-tighter">
                                            {totalScore}<span className="text-base text-slate-400 dark:text-gray-500 font-bold ml-1 uppercase">/ {criteria.reduce((a, b) => a + (b.maxScore || 10), 0)}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Quick Links */}
                                <div className="flex items-center gap-3 mt-5 relative z-10">
                                    <button 
                                        onClick={() => handleQuickLink('details')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-gray-300 transition-all active:scale-95"
                                    >
                                        <Icon name="FileText" className="w-3.5 h-3.5" />
                                        Project Details
                                    </button>
                                    <button 
                                        onClick={() => handleQuickLink('repo')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-gray-300 transition-all active:scale-95"
                                    >
                                        <Icon name="GitHub" className="w-3.5 h-3.5" />
                                        Repository
                                    </button>
                                    <button 
                                        onClick={() => handleQuickLink('demo')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-gray-300 transition-all active:scale-95"
                                    >
                                        <Icon name="Video" className="w-3.5 h-3.5" />
                                        Demo Video
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Form Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                {/* Scorecard */}
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
                                        Evaluation Matrix
                                    </h3>
                                    <div className="space-y-6">
                                        {criteria.map((c) => (
                                            <div key={c.id} className="group/criteria">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <label className="text-sm font-bold text-slate-800 dark:text-white block group-hover/criteria:text-[#2563eb] transition-colors">{c.label}</label>
                                                        <span className="text-xs text-slate-500 dark:text-gray-400">{c.description}</span>
                                                    </div>
                                                    <div className="flex items-end gap-1">
                                                        <span className="text-xl font-bold text-[#2563eb] dark:text-blue-300 leading-none">{scores[c.id] || 0}</span>
                                                        <span className="text-xs text-slate-400 dark:text-gray-500 font-semibold mb-0.5">/ {c.maxScore}</span>
                                                    </div>
                                                </div>
                                                <div className="relative flex items-center h-4">
                                                    <input
                                                        type="range"
                                                        min={c.minScore}
                                                        max={c.maxScore}
                                                        step="1"
                                                        value={scores[c.id] || 0}
                                                        onChange={(e) => setScores({ ...scores, [c.id]: parseInt(e.target.value) })}
                                                        className="w-full h-2 bg-slate-200 dark:bg-navy-950 rounded-lg appearance-none cursor-pointer accent-[#2563eb] hover:accent-[#1d4ed8] transition-all z-20"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Comments */}
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
                                        Critique & Feedback
                                    </h3>
                                    <div className="relative">
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Enter comprehensive feedback, strengths, and areas for improvement..."
                                            className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all resize-none shadow-xs"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Form Footer Actions */}
                            <div className="p-6 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                                <button 
                                    onClick={handleSaveDraft}
                                    className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                >
                                    Save Draft
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleShortlistToggle}
                                        className={`px-4 py-2.5 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                                            isShortlisted
                                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                                                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                        }`}
                                    >
                                        <Icon name="Star" className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-amber-500 text-amber-500' : ''}`} />
                                        {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                                    </button>
                                    <button
                                        onClick={handleSubmitScore}
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 justify-center disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Icon name="Check" className="w-4 h-4" />
                                                Confirm Evaluation
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EvaluationPanel;
