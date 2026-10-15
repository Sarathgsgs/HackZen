import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchHackathonById } from '../../services/student/upcomingHackathonsApi';
import { getRegistrationDraft } from '../../services/student/hackathonRegistrationApi';

const steps = [
    { 
        key: 'step-1', 
        label: 'Step 1', 
        title: 'Team Basics',
        description: 'Lead info and team name'
    },
    { 
        key: 'step-2', 
        label: 'Step 2', 
        title: 'Members & Notes',
        description: 'Collaborators and details'
    },
    { 
        key: 'step-3', 
        label: 'Step 3', 
        title: 'Review & Submit',
        description: 'Final application review'
    },
];

const StudentHackathonRegistration = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { hackathonId } = useParams();
    const [hackathon, setHackathon] = useState(null);
    const [draft, setDraft] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadRegistrationFlow = async () => {
            setIsLoading(true);

            try {
                const nextHackathon = await fetchHackathonById(hackathonId);
                let storedUser = {};
                try {
                    storedUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
                } catch {
                    storedUser = {};
                }
                const nextDraft = await getRegistrationDraft(nextHackathon, storedUser);
                setHackathon(nextHackathon);
                setDraft(nextDraft);
            } catch (error) {
                console.error('Failed to load hackathon registration flow:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadRegistrationFlow();
    }, [hackathonId]);

    const currentStepIndex = useMemo(() => {
        const index = steps.findIndex((step) => location.pathname.endsWith(step.key));
        return index === -1 ? 0 : index;
    }, [location.pathname]);

    const currentStep = steps[currentStepIndex];

    if (isLoading) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="glass rounded-2xl border border-white/5 h-[70vh] animate-pulse bg-navy-900/40" />
            </div>
        );
    }

    if (!hackathon || !draft) {
        return (
            <div className="glass rounded-2xl border border-white/5 p-10 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Registration unavailable</h1>
                <p className="text-gray-400 mb-6">We could not load this hackathon registration flow right now.</p>
                <button
                    onClick={() => navigate('/student/hackathons')}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors"
                >
                    Back to Hackathons
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f2eef5] px-4 pb-10 pt-6 text-[#1f2430] sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1200px]">
                <div className="mb-8 text-center">
                    <h1 className="text-[clamp(2rem,3vw,3rem)] font-black tracking-[-0.06em] text-[#1e2433]">Register for Hackathon</h1>
                    <p className="mt-3 text-lg font-medium text-[#5a5d6d]">{hackathon?.title || 'Hackathon title unavailable'}</p>
                </div>

                <div className="mx-auto mb-8 flex max-w-[720px] items-center justify-center gap-3 sm:gap-4">
                    {steps.map((step, index) => {
                        const isActive = location.pathname.endsWith(step.key) || (index === 0 && location.pathname.endsWith('register'));
                        const isCompleted = currentStepIndex > index;

                        return (
                            <React.Fragment key={step.key}>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/student/hackathons/${hackathonId}/register/${step.key}`)}
                                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition-colors ${
                                            isActive
                                                ? 'border-[#5e4be0] bg-[#5e4be0] text-white shadow-[0_0_0_5px_rgba(94,75,224,0.12)]'
                                                : isCompleted
                                                    ? 'border-[#5e4be0] bg-[#f0edff] text-[#5e4be0]'
                                                    : 'border-[#d9d9df] bg-[#f7f4fa] text-[#7a7f90]'
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            index + 1
                                        )}
                                    </button>
                                    <span className={`hidden text-sm font-semibold sm:inline ${isActive ? 'text-[#202531]' : 'text-[#7b7e8a]'}`}>
                                        {step.title}
                                    </span>
                                </div>

                                {index < steps.length - 1 && (
                                    <div key={`${step.key}-line`} className="h-px flex-1 max-w-[120px] bg-[#dfe3ec]">
                                        <div className={`h-full transition-all ${isCompleted ? 'w-full bg-[#5e4be0]' : 'w-0 bg-transparent'}`} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="overflow-hidden rounded-[22px] border border-[#dfe3ee] bg-[#f8f8fb] shadow-[0_1px_0_rgba(16,24,40,0.02)]">
                    <div className="border-b border-[#dfe3ee] bg-[#f4f2f7] px-5 py-5 sm:px-8">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#5d4ad8] shadow-[0_0_0_4px_rgba(93,74,216,0.12)]" />
                            <h2 className="text-[clamp(1.25rem,2vw,1.8rem)] font-black tracking-[-0.04em] text-[#1d2431]">Registration Details</h2>
                        </div>
                    </div>

                    <div className="px-5 py-6 sm:px-8 sm:py-8">
                        <Outlet
                            context={{
                                hackathon,
                                draft,
                                setDraft,
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentHackathonRegistration;
