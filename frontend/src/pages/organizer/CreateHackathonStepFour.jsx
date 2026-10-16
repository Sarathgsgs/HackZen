import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { publishHackathon, saveHackathonDraft } from '../../services/organizer/createHackathonApi';

const CreateHackathonStepFour = () => {
    const navigate = useNavigate();
    const { draft, setDraft, handleStepChange } = useOutletContext();

    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successModal, setSuccessModal] = useState(false);

    const formatDate = (val) => {
        if (!val) return 'TBD';
        try {
            const d = new Date(val);
            return d.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        } catch {
            return val;
        }
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            await saveHackathonDraft(draft);
            navigate('/organizer/dashboard');
        } catch (e) {
            console.error("Draft save failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!acceptedTerms) {
            setErrorMessage('Please accept the platform organizer guidelines to proceed.');
            return;
        }

        if (!draft.title?.trim()) {
            setErrorMessage('Hackathon title is missing. Please return to Step 1.');
            return;
        }

        setIsPublishing(true);
        setErrorMessage('');

        try {
            await publishHackathon(draft);
            setSuccessModal(true);
        } catch (error) {
            console.error("Publishing hackathon failed:", error);
            const msg = error?.response?.data?.detail || error?.message || 'Failed to submit hackathon. Please try again.';
            setErrorMessage(msg);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-8 space-y-8">
            
            {/* Success Modal */}
            {successModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">
                            ✓
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                Hackathon Submitted!
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                                "{draft.title}" has been submitted for platform review. You can monitor registrations and manage event milestones from your Organizer Dashboard.
                            </p>
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={() => navigate('/organizer/dashboard')}
                                className="w-full py-2.5 px-4 rounded-xl bg-[#7C65F6] hover:bg-[#6852F6] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                            >
                                Go to Dashboard Overview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Review Event Details
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                    Review your configured event guidelines, tracks, and timeline before submitting for approval.
                </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400">
                    ⚠️ {errorMessage}
                </div>
            )}

            {/* Review Sections */}
            <div className="space-y-6">

                {/* Section 1: Basic Information */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2.5">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                            Basic Details
                        </span>
                        <button 
                            onClick={() => handleStepChange(1)}
                            className="text-xs font-bold text-[#7C65F6] hover:underline cursor-pointer"
                        >
                            Edit
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                            <span className="text-slate-400 font-semibold block">Event Name:</span>
                            <span className="font-bold text-slate-800 dark:text-white text-sm">{draft.title || 'Untitled Event'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-semibold block">Theme / Category:</span>
                            <span className="font-bold text-slate-800 dark:text-white">{draft.category || 'General'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-semibold block">Event Mode:</span>
                            <span className="font-bold text-slate-800 dark:text-white">{draft.mode || 'Online'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-semibold block">Team Size Limits:</span>
                            <span className="font-bold text-slate-800 dark:text-white">{draft.minTeamSize || 1} to {draft.maxTeamSize || 4} Members</span>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="text-slate-400 font-semibold block">Description:</span>
                            <p className="text-slate-600 dark:text-gray-300 mt-1 leading-relaxed">{draft.description || 'No description provided.'}</p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Tracks & Requirements */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2.5">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                            Challenge Tracks ({draft.tracks?.length || 0})
                        </span>
                        <button 
                            onClick={() => handleStepChange(2)}
                            className="text-xs font-bold text-[#7C65F6] hover:underline cursor-pointer"
                        >
                            Edit
                        </button>
                    </div>

                    <div className="space-y-2">
                        {draft.tracks && draft.tracks.length > 0 ? (
                            draft.tracks.map((t, i) => (
                                <div key={i} className="text-xs">
                                    <span className="font-bold text-slate-800 dark:text-white">{t.title}:</span>{' '}
                                    <span className="text-slate-500 dark:text-gray-400">{t.description}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 italic">No specific tracks configured.</p>
                        )}
                    </div>
                </div>

                {/* Section 3: Schedule & Timeline */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2.5">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                            Timeline & Deadlines
                        </span>
                        <button 
                            onClick={() => handleStepChange(3)}
                            className="text-xs font-bold text-[#7C65F6] hover:underline cursor-pointer"
                        >
                            Edit
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-slate-400 font-semibold block">Registration Window:</span>
                            <span className="font-medium text-slate-800 dark:text-white">
                                {formatDate(draft.registrationStart)} &rarr; {formatDate(draft.registrationEnd)}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-semibold block">Hacking Period:</span>
                            <span className="font-medium text-slate-800 dark:text-white">
                                {formatDate(draft.hackathonStart || draft.startDate)} &rarr; {formatDate(draft.hackathonEnd || draft.endDate)}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-semibold block">Judging Commences:</span>
                            <span className="font-medium text-slate-800 dark:text-white">
                                {formatDate(draft.judgingStart)}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-semibold block">Results Announcement:</span>
                            <span className="font-medium text-slate-800 dark:text-white">
                                {formatDate(draft.resultsDate)}
                            </span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Terms & Guidelines Checkbox */}
            <div className="pt-2">
                <label 
                    onClick={() => setAcceptedTerms(!acceptedTerms)}
                    className="flex items-start gap-3 cursor-pointer select-none group"
                >
                    <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-[#7C65F6] focus:ring-0 mt-0.5 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 dark:text-gray-300 font-medium leading-relaxed">
                        I confirm that all entered details and timeline milestones are accurate and comply with the ProEduvate Platform Code of Conduct and event moderation policies.
                    </span>
                </label>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={() => handleStepChange(3)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold transition-all cursor-pointer"
                >
                    &larr; Previous Step
                </button>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl border border-[#7C65F6] text-[#7C65F6] hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                        Save as Draft
                    </button>

                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={isPublishing || !acceptedTerms}
                        className="px-6 py-2.5 rounded-xl bg-[#7C65F6] hover:bg-[#6852F6] text-white text-xs font-bold shadow-md shadow-[#7C65F6]/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        {isPublishing ? (
                            <>
                                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <span>Publish Hackathon</span>
                                <span>🚀</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateHackathonStepFour;
