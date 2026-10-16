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

    // --- Backend Data Initialization ---
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch criteria and real submissions
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
            if (activeTeam.existingScores) {
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
            const matchesSearch = t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                t.project.toLowerCase().includes(debouncedSearch.toLowerCase());
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

        // Optimistic Update
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
            
            // Move to next pending team if any
            const nextPending = teams.find(t => t.id !== activeTeam.id && t.status !== 'Evaluated');
            if (nextPending && activeTab === 'pending') {
                setSelectedTeamId(nextPending.id);
            }
        } catch (error) {
            setTeams(previousTeams);
            alert("Failed to synchronize evaluation with backend. Data rolled back.");
        } finally {
            setIsSubmitting(false);
        }

    };

    const handleShortlistToggle = async () => {
        const nextState = !isShortlisted;
        setIsShortlisted(nextState);
        if (activeTeam) {
            try {
                await updateTeamShortlistStatus(activeTeam.submissionId || activeTeam.id, nextState);
                setTeams(prev => prev.map(t => t.id === activeTeam.id ? { ...t, shortlisted: nextState } : t));
            } catch (err) {
                console.error("Failed to toggle shortlist:", err);
            }
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-140px)] flex flex-col pb-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
                <div>
                    <h1 className="title-primary">Evaluation Panel</h1>
                    <p className="description-primary">Score submissions, add comments, and shortlist top teams</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/organizer/evaluation/criteria')}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    >
                        <Icon name="Settings" className="w-4 h-4" />
                        Criteria Settings
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                        <Icon name="Check" className="w-4 h-4" />
                        Finalize Shortlist
                    </button>
                </div>
            </div>

            {/* Main Content Two-Column Layout */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">

                {/* Left Panel: Team List */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 glass rounded-2xl border border-white/5 p-4 h-full relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-[2px] z-10 rounded-2xl flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    {/* Search & Tabs */}
                    <div className="space-y-3 shrink-0">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Icon name="Search" className="w-4 h-4 text-gray-400 group-focus-within:text-cyan-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Filter teams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-navy-900/50 border border-white/10 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            />
                        </div>
                        <div className="flex p-1 bg-white/5 rounded-lg border border-white/5">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'pending' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Pending ({teams.filter(t => t.status !== 'Evaluated').length})
                            </button>
                            <button
                                onClick={() => setActiveTab('done')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'done' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Done ({teams.filter(t => t.status === 'Evaluated').length})
                            </button>
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {filteredTeams.length > 0 ? (
                            filteredTeams.map((team) => (
                                <div
                                    key={team.id}
                                    onClick={() => setSelectedTeamId(team.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:bg-white/5 group relative
                                        ${selectedTeamId === team.id
                                            ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/10 border-cyan-500/30 shadow-indigo-500/5'
                                            : 'bg-white/5 border-white/5 hover:border-white/10'}
                                    `}
                                >
                                    {selectedTeamId === team.id && (
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
                                    )}
                                    <div className="flex justify-between items-start mb-1 pl-2">
                                        <h3 className={`font-semibold text-sm transition-colors group-hover:text-cyan-400 ${selectedTeamId === team.id ? 'text-white' : 'text-gray-200'}`}>
                                            {team.name}
                                        </h3>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-tighter uppercase border 
                                            ${team.status === 'Evaluated' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                team.status === 'Reviewing' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                            {team.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 pl-2 mb-2 line-clamp-1">{team.project}</p>
                                    <div className="flex justify-between items-center pl-2">
                                        <span className="text-[10px] text-gray-600 font-medium uppercase tracking-tight">{team.submitted}</span>
                                        {team.score !== null && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-cyan-400">{team.score}</span>
                                                <span className="text-[8px] text-gray-600 font-bold">PTS</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : !isLoading && (
                            <div className="text-center py-20 flex flex-col items-center">
                                <svg className="w-12 h-12 text-gray-700 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">No teams found</p>
                                <button onClick={() => { setSearchTerm(''); setActiveTab('pending'); }} className="mt-2 text-cyan-400 text-[10px] font-bold uppercase hover:underline">Reset filters</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Evaluation Form */}
                <div className="w-full lg:w-2/3 glass rounded-2xl border border-white/5 flex flex-col h-full overflow-hidden relative">
                    {!activeTeam ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-10 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                                <Icon name="Check" className="w-8 h-8 text-gray-700" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Select a team</h3>
                            <p className="max-w-[300px] text-sm text-gray-500 leading-relaxed uppercase tracking-tighter font-medium">Select a team from the left sidebar to begin evaluating their project submission.</p>
                        </div>
                    ) : (
                        <>
                            {/* Form Header / Team Details */}
                            <div className="p-6 border-b border-white/10 shrink-0 bg-white/[0.02] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Icon name="Star" className="w-32 h-32 text-white" />
                                </div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">{activeTeam.name}</h2>
                                        <h3 className="text-lg font-medium text-cyan-400 mb-2 truncate max-w-md">{activeTeam.project}</h3>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            <span>{activeTeam.members?.length > 0 ? activeTeam.members.join(', ') : 'Member details in Teams & Mentors'}</span>
                                            <span className="w-1.5 h-1.5 bg-gray-700 rounded-full animate-pulse"></span>
                                            <span className="text-gray-400">{activeTeam.submitted}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Global Score</div>
                                        <div className="text-4xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tighter">
                                            {totalScore}<span className="text-[15px] text-gray-600 font-bold ml-1 uppercase">/ {criteria.reduce((a, b) => a + b.maxScore, 0)}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Quick Links */}
                                <div className="flex items-center gap-3 mt-5 relative z-10">
                                    {[
                                        { id: 'details', label: 'Project Details', icon: 'FileText' },
                                        { id: 'repo', label: 'Repository', icon: 'GitHub' },
                                        { id: 'demo', label: 'Demo Video', icon: 'Video' }
                                    ].map(btn => (
                                        <button key={btn.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-sm active:scale-95">
                                            <Icon name={btn.icon} className="w-3.5 h-3.5" />
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scrollable Form Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
                                {/* Scorecard */}
                                <div>
                                    <h3 className="section-header-panel">
                                        Evaluation Matrix
                                    </h3>
                                    <div className="space-y-8">
                                        {criteria.map((c) => (
                                            <div key={c.id} className="group/criteria">
                                                <div className="flex justify-between items-end mb-3">
                                                    <div>
                                                        <label className="text-[11px] font-black text-white block uppercase tracking-wide group-hover/criteria:text-cyan-400 transition-colors">{c.label}</label>
                                                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">{c.description}</span>
                                                    </div>
                                                    <div className="flex items-end gap-1">
                                                        <span className="text-xl font-black text-cyan-400 leading-none">{scores[c.id] || 0}</span>
                                                        <span className="text-[9px] text-gray-700 font-black tracking-tighter mb-0.5">/ {c.maxScore}</span>
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
                                                        className="w-full h-1.5 bg-navy-900 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all border border-white/5 z-20"
                                                    />
                                                    <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none opacity-20 transition-opacity group-hover/criteria:opacity-40">
                                                        {[...Array(c.maxScore + 1)].map((_, i) => (
                                                            <div key={i} className={`w-0.5 h-2 ${i % 5 === 0 ? 'h-3 bg-white' : 'bg-gray-500'}`}></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Comments */}
                                <div>
                                    <h3 className="section-header-panel mb-4">Critique & Feedback</h3>
                                    <div className="relative">
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Enter detailed feedback for the team..."
                                            className="w-full h-32 px-4 py-4 bg-navy-900/50 border border-white/10 rounded-2xl text-[13px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none shadow-inner"
                                        ></textarea>
                                        <div className="absolute bottom-3 right-4 px-2 py-0.5 bg-white/5 rounded text-[8px] font-black text-gray-600 uppercase tracking-widest border border-white/5">
                                            MD Support
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Footer Actions */}
                            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-between items-center shrink-0">
                                <button className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5 px-4 py-2 rounded-lg">
                                    Save Draft
                                </button>
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleShortlistToggle}
                                        className={`px-5 py-2.5 border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-sm
                                            ${isShortlisted
                                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon name="Star" className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-amber-500' : ''}`} />
                                            {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                                        </div>
                                    </button>
                                    <button
                                        onClick={handleSubmitScore}
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-2 min-w-[180px] justify-center disabled:opacity-50"
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

