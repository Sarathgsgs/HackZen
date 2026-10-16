import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { saveHackathonDraft } from '../../services/organizer/createHackathonApi';

const CreateHackathonStepThree = () => {
    const { draft, setDraft, handleStepChange } = useOutletContext();

    // Default dates initialized to sensible future timestamps if empty
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000);
    const judgingEnd = new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000);

    const toInputFormat = (d) => {
        if (!d) return '';
        try {
            const date = new Date(d);
            return date.toISOString().slice(0, 16);
        } catch {
            return '';
        }
    };

    const [timeline, setTimeline] = useState({
        registrationStart: toInputFormat(draft.registrationStart || draft.startDate || now),
        registrationEnd: toInputFormat(draft.registrationEnd || tomorrow),
        hackathonStart: toInputFormat(draft.hackathonStart || draft.startDate || tomorrow),
        hackathonEnd: toInputFormat(draft.hackathonEnd || draft.endDate || nextWeek),
        judgingStart: toInputFormat(draft.judgingStart || nextWeek),
        resultsDate: toInputFormat(draft.resultsDate || judgingEnd)
    });

    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [draftSavedToast, setDraftSavedToast] = useState(false);

    const handleChange = (field, value) => {
        setTimeline(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const nextErrors = {};
        if (!timeline.registrationStart) nextErrors.registrationStart = 'Registration start is required.';
        if (!timeline.registrationEnd) nextErrors.registrationEnd = 'Registration end is required.';
        if (!timeline.hackathonStart) nextErrors.hackathonStart = 'Event start is required.';
        if (!timeline.hackathonEnd) nextErrors.hackathonEnd = 'Submission deadline is required.';

        if (timeline.registrationStart && timeline.registrationEnd && new Date(timeline.registrationStart) >= new Date(timeline.registrationEnd)) {
            nextErrors.registrationEnd = 'Registration end must be after registration start.';
        }
        if (timeline.hackathonStart && timeline.hackathonEnd && new Date(timeline.hackathonStart) >= new Date(timeline.hackathonEnd)) {
            nextErrors.hackathonEnd = 'Event end must be after event start.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            const updated = {
                ...draft,
                ...timeline,
                startDate: timeline.hackathonStart,
                endDate: timeline.hackathonEnd
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
        if (!validate()) return;

        setIsSaving(true);
        try {
            const updated = {
                ...draft,
                ...timeline,
                startDate: timeline.hackathonStart,
                endDate: timeline.hackathonEnd
            };
            await saveHackathonDraft(updated);
            setDraft(updated);
            handleStepChange(4);
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

            <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Event Schedule & Milestone Dates
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                    Establish key operational deadlines for registrations, hacking sprints, and evaluations.
                </p>
            </div>

            {/* 3 Phases: Registration, Hacking Sprint, Judging & Results */}
            <div className="space-y-6">
                
                {/* Phase 1: Registration Window */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/30 text-[#7C65F6] flex items-center justify-center text-xs font-bold">
                            1
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Registration Phase
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                Registration Opens <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={timeline.registrationStart}
                                onChange={(e) => handleChange('registrationStart', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6]"
                            />
                            {errors.registrationStart && (
                                <p className="text-xs text-rose-500 font-medium mt-1">{errors.registrationStart}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                Registration Closes <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={timeline.registrationEnd}
                                onChange={(e) => handleChange('registrationEnd', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6]"
                            />
                            {errors.registrationEnd && (
                                <p className="text-xs text-rose-500 font-medium mt-1">{errors.registrationEnd}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Phase 2: Hacking Period */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/30 text-[#7C65F6] flex items-center justify-center text-xs font-bold">
                            2
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Hacking & Submission Sprint
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                Hackathon Starts <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={timeline.hackathonStart}
                                onChange={(e) => handleChange('hackathonStart', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6]"
                            />
                            {errors.hackathonStart && (
                                <p className="text-xs text-rose-500 font-medium mt-1">{errors.hackathonStart}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                Submission Deadline <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={timeline.hackathonEnd}
                                onChange={(e) => handleChange('hackathonEnd', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6]"
                            />
                            {errors.hackathonEnd && (
                                <p className="text-xs text-rose-500 font-medium mt-1">{errors.hackathonEnd}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Phase 3: Judging & Results */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/30 text-[#7C65F6] flex items-center justify-center text-xs font-bold">
                            3
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Evaluation & Announcement
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                Judging Commences
                            </label>
                            <input
                                type="datetime-local"
                                value={timeline.judgingStart}
                                onChange={(e) => handleChange('judgingStart', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                Results & Awards Ceremony
                            </label>
                            <input
                                type="datetime-local"
                                value={timeline.resultsDate}
                                onChange={(e) => handleChange('resultsDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6]"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={() => handleStepChange(2)}
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

export default CreateHackathonStepThree;
