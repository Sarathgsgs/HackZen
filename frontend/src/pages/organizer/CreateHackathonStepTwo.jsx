import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { saveHackathonDraft } from '../../services/organizer/createHackathonApi';

const CreateHackathonStepTwo = () => {
    const { draft, setDraft, handleStepChange } = useOutletContext();

    const [tracks, setTracks] = useState(draft.tracks && draft.tracks.length > 0 ? draft.tracks : [
        { id: 1, title: 'Open Innovation', description: 'Solve real-world challenges using modern technology stacks.' }
    ]);

    const [guidelines, setGuidelines] = useState(draft.guidelines || 'Projects must be developed during the hackathon period. All code repositories and demos must be accessible to mentors and judges.');
    const [requirements, setRequirements] = useState(draft.requirements || {
        requireGithub: true,
        requireDemo: true,
        requireDocumentation: false
    });

    const [newTrackTitle, setNewTrackTitle] = useState('');
    const [newTrackDesc, setNewTrackDesc] = useState('');
    const [trackError, setTrackError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [draftSavedToast, setDraftSavedToast] = useState(false);

    const handleAddTrack = () => {
        if (!newTrackTitle.trim()) {
            setTrackError('Please enter a track title.');
            return;
        }

        const newTrack = {
            id: Date.now(),
            title: newTrackTitle.trim(),
            description: newTrackDesc.trim() || 'Custom track challenge for participating teams.'
        };

        setTracks(prev => [...prev, newTrack]);
        setNewTrackTitle('');
        setNewTrackDesc('');
        setTrackError('');
    };

    const handleRemoveTrack = (id) => {
        if (tracks.length <= 1) {
            setTrackError('At least one challenge track is required.');
            return;
        }
        setTracks(prev => prev.filter(t => t.id !== id));
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            const updated = {
                ...draft,
                tracks,
                guidelines,
                requirements
            };
            await saveHackathonDraft(updated);
            setDraft(updated);
            setDraftSavedToast(true);
            setTimeout(() => setDraftSavedToast(false), 3000);
        } catch (e) {
            console.error("Draft save failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = async () => {
        if (tracks.length === 0) {
            setTrackError('Please add at least one track.');
            return;
        }

        setIsSaving(true);
        try {
            const updated = {
                ...draft,
                tracks,
                guidelines,
                requirements
            };
            await saveHackathonDraft(updated);
            setDraft(updated);
            handleStepChange(3);
        } catch (e) {
            console.error("Failed to proceed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-8 space-y-8">
            {/* Draft Saved Toast */}
            {draftSavedToast && (
                <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-950/90 text-emerald-200 border border-emerald-500/30 text-xs font-bold shadow-2xl animate-in slide-in-from-bottom-5">
                    ✓ Draft saved successfully
                </div>
            )}

            {/* Section: Challenge Tracks & Problem Statements */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Challenge Tracks & Problem Statements
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        Define distinct tracks or problem statements for participants to choose from.
                    </p>
                </div>

                {/* Track List */}
                <div className="space-y-3">
                    {tracks.map((track, idx) => (
                        <div 
                            key={track.id || idx}
                            className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-start justify-between gap-4"
                        >
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#EDE9FE] dark:bg-[#7C65F6]/20 text-[#7C65F6] text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">
                                        {track.title}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-gray-400 pl-7 leading-relaxed">
                                    {track.description}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleRemoveTrack(track.id)}
                                className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove track"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add New Track Input */}
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/30 dark:bg-white/[0.01] space-y-3">
                    <p className="text-xs font-bold text-slate-700 dark:text-gray-300">
                        + Add New Track or Problem Statement
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                            type="text"
                            placeholder="Track Title (e.g. FinTech Innovation)"
                            value={newTrackTitle}
                            onChange={(e) => setNewTrackTitle(e.target.value)}
                            className="sm:col-span-1 px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#7C65F6]"
                        />
                        <input
                            type="text"
                            placeholder="Track Brief / Challenge Details"
                            value={newTrackDesc}
                            onChange={(e) => setNewTrackDesc(e.target.value)}
                            className="sm:col-span-2 px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#7C65F6]"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        {trackError ? (
                            <span className="text-xs text-rose-500 font-medium">{trackError}</span>
                        ) : <span />}
                        <button
                            type="button"
                            onClick={handleAddTrack}
                            className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-[#7C65F6]/10 text-[#7C65F6] border border-[#7C65F6]/30 text-xs font-bold hover:bg-[#7C65F6] hover:text-white transition-all cursor-pointer"
                        >
                            Add Track
                        </button>
                    </div>
                </div>
            </div>

            {/* Section: Submission Rules & Deliverables */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Submission Requirements & Guidelines
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        Set guidelines and deliverables required from teams at final submission.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label 
                        onClick={() => setRequirements(r => ({ ...r, requireGithub: !r.requireGithub }))}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all ${
                            requirements.requireGithub 
                                ? 'border-[#7C65F6] bg-purple-50/50 dark:bg-purple-950/20' 
                                : 'border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02]'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={requirements.requireGithub}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-[#7C65F6] focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">GitHub Repo Required</span>
                    </label>

                    <label 
                        onClick={() => setRequirements(r => ({ ...r, requireDemo: !r.requireDemo }))}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all ${
                            requirements.requireDemo 
                                ? 'border-[#7C65F6] bg-purple-50/50 dark:bg-purple-950/20' 
                                : 'border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02]'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={requirements.requireDemo}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-[#7C65F6] focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">Demo Video URL</span>
                    </label>

                    <label 
                        onClick={() => setRequirements(r => ({ ...r, requireDocumentation: !r.requireDocumentation }))}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all ${
                            requirements.requireDocumentation 
                                ? 'border-[#7C65F6] bg-purple-50/50 dark:bg-purple-950/20' 
                                : 'border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02]'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={requirements.requireDocumentation}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-[#7C65F6] focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">Documentation / Slides</span>
                    </label>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                        Event Rules & Guidelines
                    </label>
                    <textarea
                        rows="3"
                        value={guidelines}
                        onChange={(e) => setGuidelines(e.target.value)}
                        placeholder="Provide any code of conduct, judging criteria hints, or general rules..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#7C65F6] transition-all resize-none"
                    />
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={() => handleStepChange(1)}
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
                        onClick={handleNext}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-xl bg-[#7C65F6] hover:bg-[#6852F6] text-white text-xs font-bold shadow-md shadow-[#7C65F6]/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <span>Next Step</span>
                        <span>&rarr;</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateHackathonStepTwo;
