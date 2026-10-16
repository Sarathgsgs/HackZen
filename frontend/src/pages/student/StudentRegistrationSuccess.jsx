import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchHackathonById } from '../../services/student/upcomingHackathonsApi';
import { fetchMyApplications } from '../../api/applicationApi';

const StudentRegistrationSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { hackathonId } = useParams();
    const [hackathon, setHackathon] = useState(null);
    const [application, setApplication] = useState(null);
    const [applicationUnavailable, setApplicationUnavailable] = useState(false);

    useEffect(() => {
        const loadHackathon = async () => {
            try {
                const data = await fetchHackathonById(hackathonId);
                setHackathon(data);
            } catch (error) {
                console.error('Failed to load registered hackathon details:', error);
            }
        };

        if (hackathonId) {
            loadHackathon();
        }
    }, [hackathonId]);

    useEffect(() => {
        let active = true;
        fetchMyApplications()
            .then((applications) => {
                if (!active) return;
                setApplication(applications.find((item) => String(item.hackathonId) === String(hackathonId)) || null);
            })
            .catch(() => { if (active) setApplicationUnavailable(true); });
        return () => { active = false; };
    }, [hackathonId]);

    const steps = [
        { number: 1, label: 'Registration', active: true },
        { number: 2, label: 'Team', active: false },
        { number: 3, label: 'Confirmation', active: false },
    ];

    const registrationId = application?.id || application?._id || location.state?.registrationId || 'Not available';
    const registeredAt = application?.appliedAt || application?.createdAt || location.state?.registeredAt;
    const registeredOn = registeredAt
        ? new Date(registeredAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
        : 'Not available';
    const confirmed = Boolean(application || location.state?.registrationId);
    const registrationStatus = application?.status || location.state?.status || null;

    return (
        <div className="min-h-screen bg-[#f2eef5] px-4 py-8 text-[#1d2431] sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1180px]">
                <div className="mb-8 pt-2 text-left sm:pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/student/hackathons')}
                        className="inline-flex items-center gap-2 text-lg font-semibold text-[#2a2e38] transition hover:text-[#5c4fd5]"
                    >
                        <span className="text-2xl leading-none">‹</span>
                        <span>{confirmed ? 'Registration Submitted' : 'Registration Status'}</span>
                    </button>
                    <p className="mt-3 text-base text-[#6a6f7d]">
                        Registration information for {hackathon?.title || 'Hackathon title unavailable'}.
                    </p>
                </div>

                <div className="mx-auto mb-8 flex max-w-[500px] items-center justify-center gap-3 sm:gap-4">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                                        index === 0
                                            ? 'border-[#5d4ad8] bg-[#5d4ad8] text-white shadow-[0_0_0_5px_rgba(93,74,216,0.12)]'
                                            : 'border-[#d6d9e4] bg-[#f7f4fa] text-[#7b7e8d]'
                                    }`}
                                >
                                    {step.number}
                                </div>
                                <span className={`hidden text-sm font-medium sm:inline ${index === 0 ? 'text-[#1d2431]' : 'text-[#7b7e8d]'}`}>
                                    {step.label}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="h-px w-16 bg-[#dfe3ec] sm:w-20" />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="mx-auto max-w-[920px] rounded-[22px] border border-[#dfe3ee] bg-[#f9f9fb] p-6 shadow-[0_1px_0_rgba(16,24,40,0.02)] sm:p-8 lg:p-10">
                    <div className="flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#dfeaff] text-3xl text-[#4a73d8] shadow-[0_0_0_8px_rgba(94,121,212,0.08)]">
                            ✓
                        </div>
                    </div>

                    <h1 className="mt-8 text-center text-4xl font-black tracking-[-0.06em] text-[#1d2431] sm:text-[2.7rem]">
                        {confirmed ? 'Registration Submitted' : 'Registration Unavailable'}
                    </h1>
                    <p className="mt-4 text-center text-lg text-[#676d7d]">
                        {confirmed ? `Your registration request for ${hackathon?.title || 'this hackathon'} was received by the server.` : applicationUnavailable ? 'Registration status could not be loaded. Please return to the hackathons page and check your registration.' : 'No registration record is available for this hackathon.'}
                    </p>
                    <p className="mt-2 text-center text-lg text-[#676d7d]">
                        {registrationStatus ? `Current status: ${registrationStatus}.` : 'A registration confirmation is unavailable.'}
                    </p>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-[#dfe3ee] bg-[#eef5fb] p-4 text-left">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6f7587]">Registration status</p>
                            <div className="mt-4 flex items-center gap-2 text-lg font-bold text-[#1d2431]">
                                <span className={`h-2.5 w-2.5 rounded-full ${registrationStatus ? 'bg-[#2ac07d]' : 'bg-[#98a2b3]'}`} />
                                <span>{registrationStatus || 'Unavailable'}</span>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-[#dfe3ee] bg-[#f5f7fb] p-4 text-left">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6f7587]">Registration ID</p>
                            <p className="mt-4 text-lg font-bold text-[#1d2431]">{registrationId}</p>
                        </div>
                        <div className="rounded-2xl border border-[#dfe3ee] bg-[#f5f7fb] p-4 text-left">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6f7587]">Registered on</p>
                            <p className="mt-4 text-lg font-bold text-[#1d2431]">{registeredOn}</p>
                        </div>
                    </div>

                    <div className="mt-10">
                        <h2 className="mb-5 text-2xl font-black tracking-[-0.04em] text-[#1d2431]">What’s Next?</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => navigate('/student/teams')}
                                className="rounded-2xl border border-[#dfe3ee] bg-[#f6f4fb] p-5 text-left transition hover:border-[#5d4ad8]/40 hover:bg-[#f1edff]"
                            >
                                <p className="text-2xl font-black tracking-[-0.04em] text-[#1d2431]">Create Your Team</p>
                                <p className="mt-3 text-base text-[#646d7d]">Create or view a team for an eligible hackathon.</p>
                                <div className="mt-6 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#5b45d7] to-[#4a3cc0] px-6 py-4 text-lg font-bold text-white shadow-[0_10px_25px_rgba(93,74,216,0.35)]">
                                    Create Your Team →
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/student/teams')}
                                className="rounded-2xl border border-[#dfe3ee] bg-[#f9f9fb] p-5 text-left transition hover:border-[#5d4ad8]/40 hover:bg-[#f1edff]"
                            >
                                <p className="text-2xl font-black tracking-[-0.04em] text-[#1d2431]">Join a Team</p>
                                <p className="mt-3 text-base text-[#646d7d]">Join an existing team using a code or invite.</p>
                                <div className="mt-6 flex items-center justify-center rounded-xl border border-[#5d4ad8] bg-white px-6 py-4 text-lg font-bold text-[#4f41d1] shadow-[0_0_0_1px_rgba(93,74,216,0.08)]">
                                    Join a Team →
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentRegistrationSuccess;
