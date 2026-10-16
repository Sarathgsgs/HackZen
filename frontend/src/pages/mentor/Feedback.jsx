import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    fetchTeams,
    fetchTeamFeedback,
    saveFeedbackDraft,
    submitFeedback,
} from '../../services/mentor/feedbackApi';

const CRITERIA_CONFIG = [
    { key: 'projectUnderstanding', label: 'Project Understanding', desc: 'Grasp of problem statement and domain context' },
    { key: 'technicalApproach', label: 'Technical Approach', desc: 'Architecture, stack selection, and code quality' },
    { key: 'innovation', label: 'Innovation', desc: 'Novelty and uniqueness of the proposed solution' },
    { key: 'feasibility', label: 'Feasibility', desc: 'Realistic scope, execution viability, and milestones' },
    { key: 'presentationReadiness', label: 'Presentation Readiness', desc: 'Pitch quality, demo readiness, and communication' },
    { key: 'marketPotential', label: 'Market Potential', desc: 'Target audience value, scalability, and impact' },
    { key: 'userExperience', label: 'User Experience (UX)', desc: 'Design usability, interface aesthetics, and flow' },
    { key: 'collaboration', label: 'Collaboration', desc: 'Team coordination, role balance, and sprint velocity' },
];

const formatMemberRole = (role) => {
    if (role === 'leader') return 'Team Lead';
    if (!role) return 'Member';
    return role
        .split(/[_-]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Rating Star Component
const StarRating = ({ value = 0, onChange, disabled = false }) => {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(star)}
                    onMouseEnter={() => !disabled && setHover(star)}
                    onMouseLeave={() => !disabled && setHover(0)}
                    className={`p-1 rounded-lg transition-all focus:outline-none ${
                        disabled ? 'cursor-default' : 'hover:scale-110 active:scale-95'
                    }`}
                    aria-label={`${star} star`}
                >
                    <svg
                        className={`w-6 h-6 transition-colors ${
                            star <= (hover || value)
                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : 'text-slate-300 dark:text-slate-700 hover:text-slate-400'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                    </svg>
                </button>
            ))}
            <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[36px]">
                {value > 0 ? `${value} / 5` : 'Not rated'}
            </span>
        </div>
    );
};

export default function Feedback() {
    // --- STATE ---
    const [teamsList, setTeamsList] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [isLoadingTeams, setIsLoadingTeams] = useState(true);

    // Form inputs
    const [feedbackType, setFeedbackType] = useState('Code Quality');
    const [ratings, setRatings] = useState({
        projectUnderstanding: 0,
        technicalApproach: 0,
        innovation: 0,
        feasibility: 0,
        presentationReadiness: 0,
        marketPotential: 0,
        userExperience: 0,
        collaboration: 0,
    });
    const [writtenGuidance, setWrittenGuidance] = useState('');

    // Active draft id if loaded from DB
    const [activeDraftId, setActiveDraftId] = useState(null);

    // UI & Action States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
    const [actionMessage, setActionMessage] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [feedbackHistory, setFeedbackHistory] = useState([]);

    // --- INITIAL LOAD: Assigned Teams ---
    useEffect(() => {
        const loadTeams = async () => {
            setIsLoadingTeams(true);
            try {
                const teams = await fetchTeams();
                setTeamsList(teams);
                if (teams.length > 0) {
                    setSelectedTeamId(teams[0].id);
                }
            } catch (err) {
                console.error('Failed to load assigned teams for feedback:', err);
            } finally {
                setIsLoadingTeams(false);
            }
        };

        loadTeams();
    }, []);

    // --- LOAD TEAM FEEDBACK HISTORY & ACTIVE DRAFT ON TEAM SELECTION ---
    const loadTeamData = useCallback(async (teamId) => {
        if (!teamId) return;
        setHistoryLoading(true);
        try {
            const { history, draft } = await fetchTeamFeedback(teamId);
            setFeedbackHistory(history || []);

            if (draft) {
                // Restore draft from DB
                setActiveDraftId(draft.id);
                setRatings({
                    projectUnderstanding: draft.criteriaRatings?.projectUnderstanding || 0,
                    technicalApproach: draft.criteriaRatings?.technicalApproach || 0,
                    innovation: draft.criteriaRatings?.innovation || 0,
                    feasibility: draft.criteriaRatings?.feasibility || 0,
                    presentationReadiness: draft.criteriaRatings?.presentationReadiness || 0,
                    marketPotential: draft.criteriaRatings?.marketPotential || 0,
                    userExperience: draft.criteriaRatings?.userExperience || 0,
                    collaboration: draft.criteriaRatings?.collaboration || 0,
                });
                setWrittenGuidance(draft.guidance || draft.message || '');
                setFeedbackType(draft.type || 'Code Quality');
                setSaveStatus('Draft restored from database');
                setTimeout(() => setSaveStatus(null), 3000);
            } else {
                // Reset form to fresh state
                setActiveDraftId(null);
                setRatings({
                    projectUnderstanding: 0,
                    technicalApproach: 0,
                    innovation: 0,
                    feasibility: 0,
                    presentationReadiness: 0,
                    marketPotential: 0,
                    userExperience: 0,
                    collaboration: 0,
                });
                setWrittenGuidance('');
            }
        } catch (err) {
            console.error('Failed to load team feedback history:', err);
            setFeedbackHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedTeamId) {
            setActionMessage(null);
            loadTeamData(selectedTeamId);
        }
    }, [selectedTeamId, loadTeamData]);

    // Selected Team Details
    const selectedTeam = useMemo(() => {
        return teamsList.find((team) => team.id === selectedTeamId);
    }, [teamsList, selectedTeamId]);

    // Calculate Overall Average Score
    const overallAverageScore = useMemo(() => {
        const values = Object.values(ratings).filter((v) => typeof v === 'number' && v > 0);
        if (values.length === 0) return 0;
        return (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1);
    }, [ratings]);

    // Criteria change handler
    const handleRatingChange = (key, value) => {
        setRatings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    // --- SAVE DRAFT HANDLER ---
    const handleSaveDraft = async () => {
        if (!selectedTeamId) return;

        setIsSavingDraft(true);
        setSaveStatus('Saving draft to database…');
        setActionMessage(null);

        try {
            const savedDraft = await saveFeedbackDraft(selectedTeamId, {
                criteriaRatings: ratings,
                guidance: writtenGuidance,
                type: feedbackType,
                title: `${feedbackType} Feedback`,
            });

            setActiveDraftId(savedDraft.id);
            setSaveStatus('Draft saved in database');
            setTimeout(() => setSaveStatus(null), 3000);

            // Reload history to show updated draft badge
            loadTeamData(selectedTeamId);
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: err.message || 'Failed to save draft in database.',
            });
            setSaveStatus(null);
        } finally {
            setIsSavingDraft(false);
        }
    };

    // --- SUBMIT FEEDBACK HANDLER ---
    const handleSubmitFeedback = async () => {
        if (!selectedTeamId) return;

        // Validation check
        const missingCriteria = CRITERIA_CONFIG.filter((c) => !ratings[c.key] || ratings[c.key] < 1);
        if (missingCriteria.length > 0) {
            setActionMessage({
                type: 'error',
                text: `Please provide a rating for all 8 evaluation criteria before submitting. Missing: ${missingCriteria.map((c) => c.label).join(', ')}`,
            });
            return;
        }

        if (!writtenGuidance || writtenGuidance.trim().length < 5) {
            setActionMessage({
                type: 'error',
                text: 'Please provide at least 5 characters of written guidance or recommendations.',
            });
            return;
        }

        setIsSubmitting(true);
        setActionMessage(null);

        try {
            const submitted = await submitFeedback(selectedTeamId, {
                criteriaRatings: ratings,
                guidance: writtenGuidance.trim(),
                type: feedbackType,
                title: `${feedbackType} Evaluation`,
            });

            // Reset Form on successful submission
            setActiveDraftId(null);
            setRatings({
                projectUnderstanding: 0,
                technicalApproach: 0,
                innovation: 0,
                feasibility: 0,
                presentationReadiness: 0,
                marketPotential: 0,
                userExperience: 0,
                collaboration: 0,
            });
            setWrittenGuidance('');
            setFeedbackType('Code Quality');

            setActionMessage({
                type: 'success',
                text: `Feedback submitted successfully for ${selectedTeam?.name}! Notifications sent to team members.`,
            });

            // Reload history & teams list
            loadTeamData(selectedTeamId);
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: err.message || 'Failed to submit feedback. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingTeams) {
        return (
            <div className="h-[calc(100vh-140px)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-medium animate-pulse">Loading Assigned Teams…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500 text-slate-800 dark:text-white">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 flex-none px-1">
                <div className="space-y-1.5">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Provide Feedback
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                        {selectedTeam ? `Reviewing mentorship request for ${selectedTeam.name}.` : 'Select a team to provide structured evaluation.'}
                    </p>
                </div>

                {/* Team Selector Dropdown in Header */}
                <div className="flex items-center gap-3">
                    <label htmlFor="team-select" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                        Select Team:
                    </label>
                    <select
                        id="team-select"
                        value={selectedTeamId || ''}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="bg-white dark:bg-navy-900 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-sm cursor-pointer"
                    >
                        {teamsList.map((team) => (
                            <option key={team.id} value={team.id}>
                                {team.name} ({team.domain || 'General'})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Notification Banner */}
            {actionMessage && (
                <div
                    className={`mb-6 p-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-all ${
                        actionMessage.type === 'success'
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/5'
                            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-lg shadow-rose-500/5'
                    }`}
                >
                    <span>{actionMessage.text}</span>
                    <button onClick={() => setActionMessage(null)} className="text-xs uppercase hover:underline">Dismiss</button>
                </div>
            )}

            {/* Main Content: Scrollable Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10">
                {selectedTeam ? (
                    <>
                        {/* 1. Team Summary Card */}
                        <div className="glass border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-navy-900/50 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                                        {selectedTeam.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedTeam.name}</h2>
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                                Active Mentorship
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                            Domain / Project Challenge: <strong className="text-purple-600 dark:text-purple-300 font-bold">{selectedTeam.domain}</strong> · Current Stage: <strong className="text-slate-800 dark:text-white">{selectedTeam.stage}</strong>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 bg-slate-50 dark:bg-navy-950/60 px-5 py-3 rounded-xl border border-slate-100 dark:border-white/5">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Progress</p>
                                        <p className="text-lg font-black text-purple-600 dark:text-purple-400">{selectedTeam.progress}%</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Members</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-white">{selectedTeam.memberCount}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Team Members List */}
                            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                    Team Members & Roles
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {selectedTeam.members && selectedTeam.members.length > 0 ? (
                                        selectedTeam.members.map((member) => (
                                            <div
                                                key={member.id || member._id || member.userId}
                                                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950/40 border border-slate-100 dark:border-white/5"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {(member.name || '?').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                        {member.name || 'Student'}
                                                    </p>
                                                    <p className="text-[11px] text-purple-600 dark:text-purple-400 truncate">
                                                        {formatMemberRole(member.role)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic col-span-full">No member details available.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Evaluation Criteria & Written Guidance Form */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Evaluation Criteria (2 Cols) */}
                            <div className="xl:col-span-2 glass border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-navy-900/50 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                            Evaluation Criteria
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                            Rate the team across each of the 8 evaluation metrics (1 to 5 stars).
                                        </p>
                                    </div>

                                    {saveStatus && (
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                                            {saveStatus}
                                        </span>
                                    )}
                                </div>

                                {/* Criteria Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {CRITERIA_CONFIG.map((item) => {
                                        const currentVal = ratings[item.key] || 0;
                                        return (
                                            <div
                                                key={item.key}
                                                className="p-4 rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-white/5 space-y-2 hover:border-purple-500/30 transition-all"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {item.label}
                                                    </h4>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-tight">
                                                    {item.desc}
                                                </p>
                                                <div className="pt-2">
                                                    <StarRating
                                                        value={currentVal}
                                                        onChange={(val) => handleRatingChange(item.key, val)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Written Guidance & Form Submit (1 Col) */}
                            <div className="glass border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-navy-900/50 shadow-sm flex flex-col justify-between space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Written Guidance
                                        </h3>
                                        <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                                            Avg: ★ {overallAverageScore} / 5.0
                                        </span>
                                    </div>

                                    {/* Feedback Type Selector */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                                            Feedback Category
                                        </label>
                                        <select
                                            value={feedbackType}
                                            onChange={(e) => setFeedbackType(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                                        >
                                            <option>Code Quality</option>
                                            <option>Technical Architecture</option>
                                            <option>Progress & Velocity</option>
                                            <option>Presentation & Pitch</option>
                                            <option>UX / UI Design</option>
                                            <option>General Mentorship</option>
                                        </select>
                                    </div>

                                    {/* Written Guidance Textarea */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                                                Recommendations & Remarks <span className="text-rose-500">*</span>
                                            </label>
                                            <span className="text-[11px] font-mono text-slate-400">
                                                {writtenGuidance.length} / 2000
                                            </span>
                                        </div>
                                        <textarea
                                            rows="8"
                                            maxLength={2000}
                                            value={writtenGuidance}
                                            onChange={(e) => setWrittenGuidance(e.target.value)}
                                            placeholder="Highlight team strengths, technical weaknesses, next architectural steps, and actionable guidance for the next review..."
                                            className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-300 dark:border-white/10 rounded-xl p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 resize-none font-sans leading-relaxed"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons: Save Draft & Submit Feedback */}
                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            type="button"
                                            onClick={handleSaveDraft}
                                            disabled={isSavingDraft || isSubmitting}
                                            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-navy-900 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs text-slate-700 dark:text-gray-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSavingDraft ? (
                                                <div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                </svg>
                                            )}
                                            <span>{activeDraftId ? 'Update Draft' : 'Save Draft'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleSubmitFeedback}
                                            disabled={isSubmitting || isSavingDraft}
                                            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                            <span>Submit Feedback</span>
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-center text-slate-400 dark:text-gray-500">
                                        Drafts auto-save into persistent MongoDB database storage.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Feedback History / List Section */}
                        <div className="glass border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-navy-900/50 shadow-sm space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Feedback History for {selectedTeam.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                        Persistent audit trail of all evaluations and draft notes for this team.
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
                                    {feedbackHistory.length} total entries
                                </span>
                            </div>

                            {historyLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-20 bg-slate-100 dark:bg-navy-950/60 rounded-xl animate-pulse"></div>
                                    ))}
                                </div>
                            ) : feedbackHistory.length > 0 ? (
                                <div className="space-y-3">
                                    {feedbackHistory.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-4 rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-white/5 hover:border-purple-500/30 transition-all space-y-2"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                                        item.status === 'draft'
                                                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                    }`}>
                                                        {item.status === 'draft' ? 'Draft' : 'Submitted'}
                                                    </span>
                                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                                                        {item.type || 'General'}
                                                    </span>
                                                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                                        ★ {item.ratingScore ? Number(item.ratingScore).toFixed(1) : '4.0'} / 5.0
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-400 dark:text-gray-500">
                                                    {item.date}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed italic">
                                                "{item.message || item.guidance}"
                                            </p>

                                            {/* Criteria badges if available */}
                                            {item.criteriaRatings && Object.keys(item.criteriaRatings).length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                                                    {Object.entries(item.criteriaRatings).map(([key, val]) => (
                                                        <span
                                                            key={key}
                                                            className="text-[10px] font-semibold text-slate-600 dark:text-gray-400 bg-white dark:bg-navy-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5"
                                                        >
                                                            {key.replace(/([A-Z])/g, ' $1').trim()}: <strong className="text-amber-400">{val}★</strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                                <span>Evaluated by: <strong className="text-slate-700 dark:text-gray-300">{item.mentorName || 'Mentor'}</strong></span>
                                                {item.status === 'draft' && (
                                                    <button
                                                        onClick={() => {
                                                            setActiveDraftId(item.id);
                                                            if (item.criteriaRatings) setRatings(item.criteriaRatings);
                                                            setWrittenGuidance(item.message || item.guidance || '');
                                                            setFeedbackType(item.type || 'Code Quality');
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
                                                    >
                                                        Resume editing draft →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-400 dark:text-gray-500 bg-slate-50 dark:bg-navy-950/30 rounded-xl border border-dashed border-slate-200 dark:border-white/10 italic text-sm">
                                    No feedback history recorded for {selectedTeam.name} yet. Use the evaluation form above to save a draft or submit feedback.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="p-12 text-center text-slate-400 dark:text-gray-500 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                        No assigned teams found.
                    </div>
                )}
            </div>
        </div>
    );
}
