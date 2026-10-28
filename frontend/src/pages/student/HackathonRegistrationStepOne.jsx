import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { getStepOneConfig, saveStepOneData } from '../../services/student/hackathonRegistrationStepOneApi';

const HackathonRegistrationStepOne = () => {
    const navigate = useNavigate();
    const { hackathonId } = useParams();
    const { hackathon, draft, setDraft } = useOutletContext();
    
    let storedUser = {};
    try {
        storedUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    } catch {
        storedUser = {};
    }

    const [formData, setFormData] = useState({
        teamName: draft?.teamName || '',
        teamSize: draft?.teamSize || 2,
        leaderName: draft?.leaderName || storedUser?.name || '',
        leaderEmail: draft?.leaderEmail || storedUser?.email || '',
        problemFocus: draft?.problemFocus || '',
    });

    const [selectedParticipation, setSelectedParticipation] = useState(
        (draft?.teamSize === 1) ? 'individual' : 'new-team'
    );
    const [config, setConfig] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        getStepOneConfig(hackathon, storedUser).then((cfg) => {
            setConfig(cfg);
            if (!formData.leaderName && cfg.leaderName) {
                setFormData((prev) => ({ ...prev, leaderName: cfg.leaderName }));
            }
            if (!formData.leaderEmail && cfg.leaderEmail) {
                setFormData((prev) => ({ ...prev, leaderEmail: cfg.leaderEmail }));
            }
        });
    }, [hackathon]);

    const handleParticipationChange = (key) => {
        setSelectedParticipation(key);
        if (key === 'individual') {
            setFormData((prev) => ({
                ...prev,
                teamSize: 1,
                teamName: prev.teamName || (prev.leaderName ? `${prev.leaderName}'s Solo Team` : 'Solo Team'),
            }));
        } else if (key === 'new-team') {
            setFormData((prev) => ({
                ...prev,
                teamSize: prev.teamSize <= 1 ? 2 : prev.teamSize,
            }));
        } else if (key === 'existing-team') {
            navigate('/student/teams/join');
        }
    };

    const handleContinue = async () => {
        const nextErrors = {};

        if (!formData.teamName.trim()) {
            nextErrors.teamName = 'Please enter a team name.';
        }

        if (!formData.leaderEmail.trim()) {
            nextErrors.leaderEmail = 'Leader email is required.';
        }

        if (!formData.teamSize || formData.teamSize < 1) {
            nextErrors.teamSize = 'Please select a valid team size.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setIsSaving(true);
        setErrors({});

        try {
            const nextDraft = await saveStepOneData(hackathonId, draft, {
                ...formData,
                notes: formData.problemFocus ? `Focus: ${formData.problemFocus.trim()}` : (draft?.notes || ''),
            });
            setDraft(nextDraft);
            navigate(`/student/hackathons/${hackathonId}/register/step-2`);
        } catch (err) {
            console.error('Failed to save Step 1 draft:', err);
            setErrors({ general: 'Could not save team details. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const minSize = config?.minTeamSize ?? 1;
    const maxSize = config?.maxTeamSize ?? hackathon?.maxTeamSize ?? hackathon?.teamSizeLimit ?? 4;
    const sizeOptions = Array.from({ length: Math.max(1, maxSize - minSize + 1) }, (_, i) => minSize + i);

    return (
        <div className="space-y-7">
            {errors.general && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {errors.general}
                </div>
            )}

            <div className="space-y-6">
                {/* Participation Type */}
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">
                        Participation Mode *
                    </label>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            { key: 'new-team', label: 'Create New Team' },
                            { key: 'individual', label: 'Individual (Solo)' },
                            { key: 'existing-team', label: 'Join Existing Team' },
                        ].map((option) => {
                            const isSelected = selectedParticipation === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => handleParticipationChange(option.key)}
                                    className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm sm:text-base font-semibold transition ${
                                        isSelected
                                            ? 'border-[#6d58db] bg-[#f0edff] text-[#2d2b45] shadow-[0_0_0_1px_rgba(109,88,219,0.2)]'
                                            : 'border-[#dfe3ee] bg-white text-[#4c5363] hover:border-[#cfd6ea]'
                                    }`}
                                >
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[#5d4ad8] bg-[#5d4ad8]' : 'border-[#b7bdca] bg-white'}`}>
                                        {isSelected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                                    </span>
                                    <span>{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Team Name Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">
                            Team Name *
                        </label>
                        <span className="text-xs text-[#8c91a4]">Required for workspace &amp; invites</span>
                    </div>
                    <input
                        type="text"
                        value={formData.teamName}
                        onChange={(e) => {
                            setFormData((prev) => ({ ...prev, teamName: e.target.value }));
                            if (errors.teamName) setErrors((prev) => ({ ...prev, teamName: '' }));
                        }}
                        maxLength={80}
                        placeholder="e.g. Velocity X, ByteCrafters, NeuralForge"
                        className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#202531] font-medium outline-none transition placeholder:text-[#9ea3b3] focus:border-[#6d58db] focus:ring-2 focus:ring-[#6d58db]/15 ${
                            errors.teamName ? 'border-red-400 bg-red-50/20' : 'border-[#dfe3ee]'
                        }`}
                    />
                    {errors.teamName && (
                        <p className="text-xs font-semibold text-red-600">{errors.teamName}</p>
                    )}
                </div>

                {/* Team Size Dropdown */}
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">
                            Team Size *
                        </label>
                        <div className="relative">
                            <select
                                value={formData.teamSize || minSize}
                                onChange={(e) => setFormData((prev) => ({ ...prev, teamSize: Number(e.target.value) }))}
                                className="w-full appearance-none rounded-xl border border-[#dfe3ee] bg-white px-4 py-3.5 pr-10 text-base text-[#4d5363] font-medium outline-none transition focus:border-[#6d58db] focus:ring-2 focus:ring-[#6d58db]/10"
                            >
                                {sizeOptions.map((size) => (
                                    <option key={size} value={size}>
                                        {size} {size === 1 ? 'Member (Solo)' : 'Members'}
                                    </option>
                                ))}
                            </select>
                            <svg className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-[#7d8291]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">
                            Team Lead Name *
                        </label>
                        <input
                            type="text"
                            value={formData.leaderName}
                            onChange={(e) => setFormData((prev) => ({ ...prev, leaderName: e.target.value }))}
                            placeholder="Your full name"
                            className="w-full rounded-xl border border-[#dfe3ee] bg-[#f8f9fc] px-4 py-3.5 text-base text-[#383f50] font-medium outline-none focus:border-[#6d58db]"
                        />
                    </div>
                </div>

                {/* Team Lead Email */}
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">
                        Team Lead Email *
                    </label>
                    <input
                        type="email"
                        value={formData.leaderEmail}
                        onChange={(e) => {
                            setFormData((prev) => ({ ...prev, leaderEmail: e.target.value }));
                            if (errors.leaderEmail) setErrors((prev) => ({ ...prev, leaderEmail: '' }));
                        }}
                        placeholder="student@example.com"
                        className={`w-full rounded-xl border bg-[#f8f9fc] px-4 py-3.5 text-base text-[#383f50] font-medium outline-none focus:border-[#6d58db] ${
                            errors.leaderEmail ? 'border-red-400' : 'border-[#dfe3ee]'
                        }`}
                    />
                    {errors.leaderEmail && (
                        <p className="text-xs font-semibold text-red-600">{errors.leaderEmail}</p>
                    )}
                </div>

                {/* Optional Idea / Problem Statement Focus */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">
                            Project Idea / Problem Statement Preference (Optional)
                        </label>
                        <span className="text-xs text-[#8c91a4]">Optional</span>
                    </div>
                    <textarea
                        value={formData.problemFocus}
                        onChange={(e) => setFormData((prev) => ({ ...prev, problemFocus: e.target.value }))}
                        placeholder="Briefly describe what your team aims to build or the problem track you want to solve..."
                        maxLength={500}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-[#dfe3ee] bg-white px-4 py-3 text-sm text-[#4d5363] outline-none placeholder:text-[#8d93a5] focus:border-[#6d58db] focus:ring-2 focus:ring-[#6d58db]/10"
                    />
                </div>
            </div>

            <div className="pt-2">
                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#5b45d7] to-[#4a3cc0] px-6 py-4 text-lg font-bold text-white shadow-[0_10px_25px_rgba(93,74,216,0.35)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-80 cursor-pointer"
                >
                    <span>{isSaving ? 'Saving Team Details...' : 'Continue to Teammate Invites →'}</span>
                </button>
            </div>
        </div>
    );
};

export default HackathonRegistrationStepOne;
