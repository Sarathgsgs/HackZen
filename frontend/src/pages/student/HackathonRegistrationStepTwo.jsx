import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { getStepTwoConfig, saveStepTwoData } from '../../services/student/hackathonRegistrationStepTwoApi';

const HackathonRegistrationStepTwo = () => {
    const navigate = useNavigate();
    const { hackathonId } = useParams();
    const { draft, setDraft } = useOutletContext();
    const [memberEmails, setMemberEmails] = useState(draft.memberEmails);
    const [notes, setNotes] = useState(draft.notes || '');
    const [memberCount, setMemberCount] = useState(draft.teamSize - 1);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        getStepTwoConfig(draft).then((config) => {
            setMemberCount(config.memberCount);
            setMemberEmails(config.members);
        });
    }, [draft]);

    const handleEmailChange = (index, value) => {
        setMemberEmails((prev) => prev.map((email, currentIndex) => (
            currentIndex === index ? value : email
        )));
    };

    const handleContinue = async () => {
        setIsSaving(true);
        try {
            const nextDraft = await saveStepTwoData(hackathonId, draft, {
                memberEmails,
                notes,
            });
            setDraft(nextDraft);
            navigate(`/student/hackathons/${hackathonId}/register/step-3`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Members & Notes</h3>
                <p className="text-sm text-gray-400 italic">Invite teammates and add context for your registration.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
                <div className="glass p-6 rounded-2xl border border-white/5 space-y-5">
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-gray-500 ml-1">Invited Members</label>
                        {Array.from({ length: memberCount }, (_, index) => (
                            <input
                                key={index}
                                type="email"
                                value={memberEmails[index] || ''}
                                onChange={(e) => handleEmailChange(index, e.target.value)}
                                placeholder={`Member ${index + 2} email`}
                                className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        ))}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 ml-1">Registration Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any team context, domain focus, or logistics notes..."
                            className="w-full h-40 bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                        />
                    </div>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-lg font-bold text-white">Team Snapshot</h4>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Team Name</span>
                            <span className="text-white font-semibold text-right">{draft.teamName}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Team Size</span>
                            <span className="text-white font-semibold text-right">{draft.teamSize} Members</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Leader</span>
                            <span className="text-white font-semibold text-right">{draft.leaderName}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-3 pt-2">
                <button
                    onClick={() => navigate(`/student/hackathons/${hackathonId}/register/step-1`)}
                    className="w-full md:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                >
                    {isSaving ? 'Saving...' : 'Continue to Review'}
                </button>
            </div>
        </div>
    );
};

export default HackathonRegistrationStepTwo;
