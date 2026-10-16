import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { getStepThreeReview, submitStepThreeRegistration } from '../../services/student/hackathonRegistrationStepThreeApi';

const HackathonRegistrationStepThree = () => {
    const navigate = useNavigate();
    const { hackathonId } = useParams();
    const { hackathon, draft } = useOutletContext();
    const [review, setReview] = useState(null);
    const [acceptedTerms, setAcceptedTerms] = useState(draft.acceptedTerms || false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getStepThreeReview(hackathon, draft).then(setReview);
    }, [draft, hackathon]);

    const handleSubmit = async () => {
        if (!acceptedTerms) {
            setError('Please accept the registration confirmation before submitting.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const result = await submitStepThreeRegistration(hackathonId, {
                ...draft,
                acceptedTerms,
            });
            navigate(`/student/hackathons/${hackathonId}/register/success`, {
                state: {
                    registrationId: result?.registrationId || null,
                    registeredAt: result?.timestamp || null,
                    status: result?.status || null,
                },
            });
        } catch (submitError) {
            console.error('Failed to submit registration:', submitError);

            const detail = submitError?.response?.data?.detail;
            const message = typeof detail === 'string'
                ? detail
                : detail?.message || submitError?.message || 'Registration could not be completed. Please try again.';

            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Review & Submit</h3>
                <p className="text-sm text-gray-400 italic">Confirm the full registration before locking in your team.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
                <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hackathon</p>
                            <p className="text-sm font-bold text-white">{review?.hackathonTitle}</p>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Organizer</p>
                            <p className="text-sm font-bold text-white">{review?.organizer}</p>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Team Name</p>
                            <p className="text-sm font-bold text-white">{review?.teamName}</p>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Team Size</p>
                            <p className="text-sm font-bold text-white">{review?.teamSize} Members</p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Leader</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Name</span>
                                <span className="text-white font-semibold text-right">{review?.leaderName}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Email</span>
                                <span className="text-white font-semibold text-right">{review?.leaderEmail}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm text-gray-400">Invited Members</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {review?.memberEmails?.map((email, index) => (
                                <div key={`${email}-${index}`} className="rounded-xl bg-white/5 border border-white/5 px-3 py-3 text-sm text-gray-200">
                                    {email || `Member ${index + 2} not added yet`}
                                </div>
                            ))}
                        </div>
                    </div>

                    {review?.notes ? (
                        <div className="space-y-2">
                            <span className="text-sm text-gray-400">Notes</span>
                            <div className="rounded-xl bg-white/5 border border-white/5 px-3 py-3 text-sm text-gray-200">
                                {review.notes}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-4">
                    <div className="glass p-6 rounded-2xl border border-white/5">
                        <h4 className="text-lg font-bold text-white mb-4">Final Confirmation</h4>
                        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => {
                                    setAcceptedTerms(e.target.checked);
                                    setError('');
                                }}
                                className="mt-1"
                            />
                            <span className="text-sm text-gray-300">
                                I confirm this team information is correct and I want to register this team for {hackathon.title}.
                            </span>
                        </label>

                        {error ? <p className="text-sm text-red-400 mt-4">{error}</p> : null}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-3 pt-2">
                <button
                    onClick={() => navigate(`/student/hackathons/${hackathonId}/register/step-2`)}
                    className="w-full md:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full md:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : 'Submit Registration'}
                </button>
            </div>
        </div>
    );
};

export default HackathonRegistrationStepThree;
