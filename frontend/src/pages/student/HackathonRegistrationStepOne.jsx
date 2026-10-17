import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { getStepOneConfig, saveStepOneData } from '../../services/student/hackathonRegistrationStepOneApi';

const HackathonRegistrationStepOne = () => {
    const navigate = useNavigate();
    const { hackathonId } = useParams();
    const { hackathon, draft, setDraft } = useOutletContext();
    const [formData, setFormData] = useState({
        teamName: draft.teamName,
        teamSize: draft.teamSize,
        leaderName: draft.leaderName,
        leaderEmail: draft.leaderEmail,
    });
    const [config, setConfig] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let storedUser = {};
        try {
            storedUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        } catch {
            storedUser = {};
        }

        getStepOneConfig(hackathon, storedUser).then(setConfig);
    }, [hackathon]);

    const handleContinue = async () => {
        const nextErrors = {};

        if (!formData.teamName.trim()) {
            nextErrors.teamName = 'Team name is required.';
        }

        if (!formData.leaderEmail.trim()) {
            nextErrors.leaderEmail = 'Leader email is required.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setIsSaving(true);
        try {
            const nextDraft = await saveStepOneData(hackathonId, draft, formData);
            setDraft(nextDraft);
            navigate(`/student/hackathons/${hackathonId}/register/step-2`);
        } finally {
            setIsSaving(false);
        }
    };

    const [selectedParticipation, setSelectedParticipation] = useState('individual');

    return (
        <div className="space-y-7">
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">Registration Type *</label>
                    <div className="relative">
                        <select
                            value={formData.teamSize || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, teamSize: Number(e.target.value) }))}
                            className="w-full appearance-none rounded-xl border border-[#dfe3ee] bg-white px-4 py-3.5 pr-10 text-base text-[#4d5363] outline-none transition focus:border-[#6d58db] focus:ring-2 focus:ring-[#6d58db]/10"
                        >
                            <option value="">Select Registration Type</option>
                            <option value="solo">Solo</option>
                            <option value="team">Team</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                        <svg className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-[#7d8291]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">Participation Type *</label>
                    <div className="grid gap-3 md:grid-cols-3">
                        {[
                            { key: 'individual', label: 'Individual' },
                            { key: 'new-team', label: 'Create New Team' },
                            { key: 'existing-team', label: 'Join Existing Team' },
                        ].map((option) => {
                            const isSelected = selectedParticipation === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setSelectedParticipation(option.key)}
                                    className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-base font-medium transition ${
                                        isSelected
                                            ? 'border-[#6d58db] bg-[#f0edff] text-[#2d2b45] shadow-[0_0_0_1px_rgba(109,88,219,0.15)]'
                                            : 'border-[#dfe3ee] bg-white text-[#4c5363] hover:border-[#cfd6ea]'
                                    }`}
                                >
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${isSelected ? 'border-[#5d4ad8] bg-[#5d4ad8]' : 'border-[#b7bdca] bg-white'}`}>
                                        {isSelected ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                                    </span>
                                    <span>{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">Problem Statement Preference *</label>
                    <textarea
                        value={formData.teamName || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, teamName: e.target.value }))}
                        placeholder="Describe the problem below you want to solve..."
                        className="h-24 w-full resize-none rounded-xl border border-[#dfe3ee] bg-white px-4 py-3 text-base text-[#4d5363] outline-none placeholder:text-[#8d93a5] focus:border-[#6d58db] focus:ring-2 focus:ring-[#6d58db]/10"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6e7483]">Why Do You Want to Participate? *</label>
                    <textarea
                        value={formData.leaderName || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, leaderName: e.target.value }))}
                        placeholder="Tell us your motivation..."
                        className="h-24 w-full resize-none rounded-xl border border-[#dfe3ee] bg-white px-4 py-3 text-base text-[#4d5363] outline-none placeholder:text-[#8d93a5] focus:border-[#6d58db] focus:ring-2 focus:ring-[#6d58db]/10"
                    />
                </div>
            </div>

            <div className="pt-2">
                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#5b45d7] to-[#4a3cc0] px-6 py-4 text-lg font-bold text-white shadow-[0_10px_25px_rgba(93,74,216,0.35)] transition hover:brightness-105 disabled:opacity-80"
                >
                    <span>{isSaving ? 'Saving...' : 'Complete Registration'}</span>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m13 5 7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default HackathonRegistrationStepOne;
