import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTeam } from '../../services/mentor/createTeamApi';
import { fetchAllHackathons } from '../../api/hackathonApi';

const CreateTeam = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState(() => {
        const saved = sessionStorage.getItem('create_team_draft');
        return saved ? JSON.parse(saved) : {
            hackathon: '',
            teamName: '',
            problemDefinition: '',
            domain: '',
            description: '',
            requiredSkills: [],
            teamSize: 4,
            roles: [],
            visibility: 'Public'
        };
    });

    const [errors, setErrors] = useState({});
    const [availableHackathons, setAvailableHackathons] = useState([]);
    const [loadingHackathons, setLoadingHackathons] = useState(true);

    // Fetch real hackathons
    useEffect(() => {
        const loadHackathons = async () => {
            try {
                setLoadingHackathons(true);
                const data = await fetchAllHackathons();
                setAvailableHackathons(data || []);
            } catch (err) {
                console.error("Failed to fetch hackathons:", err);
            } finally {
                setLoadingHackathons(false);
            }
        };
        loadHackathons();
    }, []);

    // Persistence
    useEffect(() => {
        sessionStorage.setItem('create_team_draft', JSON.stringify(formData));
    }, [formData]);

    // Mock Options
    const domains = ['Artificial Intelligence', 'Sustainability', 'Cybersecurity', 'FinTech', 'Healthcare', 'EdTech'];
    const commonSkills = ['React', 'Node.js', 'Python', 'UI/UX Design', 'Machine Learning', 'Blockchain', 'Cloud Architecture'];

    // Validation
    const validateStep = (currentStep) => {
        let newErrors = {};
        if (currentStep === 1) {
            if (!formData.hackathon) newErrors.hackathon = 'Please select a hackathon';
            if (!formData.teamName.trim()) newErrors.teamName = 'Team name is required';
        } else if (currentStep === 2) {
            if (!formData.domain) newErrors.domain = 'Please select a domain';
            if (!formData.problemDefinition.trim()) newErrors.problemDefinition = 'Problem definition is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(step)) return;

        setIsSubmitting(true);
        try {
            await createTeam({
                name: formData.teamName,
                hackathonId: formData.hackathon, // This should now be an ID
                domain: formData.domain,
                description: formData.description,
            });
            sessionStorage.removeItem('create_team_draft');
            navigate('/mentor/teams');
        } catch (error) {
            console.error("Failed to create team:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleSkill = (skill) => {
        setFormData(prev => ({
            ...prev,
            requiredSkills: prev.requiredSkills.includes(skill)
                ? prev.requiredSkills.filter(s => s !== skill)
                : [...prev.requiredSkills, skill]
        }));
    };

    // Team creation is deliberately a student workflow. The API enforces the
    // same rule, so mentors are guided to teams that need mentorship instead
    // of being shown a form that cannot be submitted successfully.
    const effectiveRole = (
        sessionStorage.getItem('userRole') ||
        localStorage.getItem('userRole') ||
        (() => {
            try {
                return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}')?.role;
            } catch {
                return null;
            }
        })() ||
        'mentor'
    ).toLowerCase();

    if (effectiveRole === 'mentor' || window.location.pathname.startsWith('/mentor')) {
        return (
            <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111625] p-10 text-center shadow-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-500/15 text-2xl text-[#5B45D9] dark:text-purple-400">👥</div>
                <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Teams are created by students</h1>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-gray-400">
                    A student first selects an open event and creates or joins a team. Once the team requests mentorship, it will appear in your mentor workspace.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <button onClick={() => navigate('/mentor/teams/join')} className="rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] px-5 py-3 text-sm font-semibold text-white shadow-xs transition-all">
                        Browse teams needing a mentor
                    </button>
                    <button onClick={() => navigate('/mentor/teams')} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                        Back to assigned teams
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/mentor/teams')}
                        className="flex items-center gap-3 text-sm font-semibold text-gray-400 hover:text-purple-400 transition-all group"
                    >
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Assigned Teams
                    </button>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-white">
                            Create New Team
                        </h1>
                        <p className="text-gray-400 mt-2">Define your project details and setup team requirements.</p>
                    </div>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center gap-6 glass-strong px-6 py-4 rounded-[1.5rem] border border-white/5 bg-navy-900/40 shadow-xl">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4">
                            <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-500 border overflow-hidden ${step >= i ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-navy-950/80 border-white/5 text-gray-400'}`}>
                                <div className={`absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 ${step === i ? 'opacity-100 animate-pulse' : ''}`}></div>
                                <span className="relative z-10">{step > i ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                ) : i}</span>
                            </div>
                            {i !== 3 && <div className={`w-8 h-px transition-all duration-700 ${step > i ? 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,1)]' : 'bg-white/5'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {step === 1 && (
                    <div className="glass-strong p-10 rounded-[2.5rem] border border-white/10 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 bg-navy-900/40 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-3xl -mr-32 -mt-32"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-300 ml-1">Event Selection</label>
                                <div className="relative group/sel">
                                    <select
                                        value={formData.hackathon}
                                        onChange={(e) => setFormData({ ...formData, hackathon: e.target.value })}
                                        className={`w-full appearance-none bg-navy-900/50 border rounded-xl py-3 px-4 text-sm text-white focus:outline-none transition-all cursor-pointer hover:bg-navy-900 shadow-inner ${errors.hackathon ? 'border-red-500/50 ring-1 ring-red-500/10' : 'border-white/5 focus:border-purple-500/50'}`}
                                    >
                                        <option value="" className="bg-navy-950 text-gray-500">-- {loadingHackathons ? 'Loading Hackathons...' : 'Select Event'} --</option>
                                        {availableHackathons.map(h => <option key={h._id} value={h._id} className="bg-navy-950">{h.title}</option>)}
                                    </select>
                                    <svg className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover/sel:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                                {errors.hackathon && <p className="text-xs text-red-500 font-medium ml-1">{errors.hackathon}</p>}
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-300 ml-1">Team Name</label>
                                <input
                                    type="text"
                                    value={formData.teamName}
                                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                                    placeholder="e.g. Project Alpha"
                                    className={`w-full bg-navy-900/50 border rounded-xl py-3 px-4 text-sm text-white placeholder-gray-500 focus:outline-none transition-all shadow-inner group-hover:bg-navy-900 ${errors.teamName ? 'border-red-500/50 ring-1 ring-red-500/10' : 'border-white/5 focus:border-purple-500/50'}`}
                                />
                                {errors.teamName && <p className="text-xs text-red-500 font-medium ml-1">{errors.teamName}</p>}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-6 pt-10 border-t border-white/5">
                            <p className="text-xs text-gray-500 font-medium">Your progress is automatically saved to drafts</p>
                            <button
                                type="button"
                                onClick={nextStep}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-white text-sm font-bold shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2"
                            >
                                Continue to Project Details
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="glass-strong p-10 rounded-[2.5rem] border border-white/10 space-y-10 animate-in fade-in slide-in-from-right-8 duration-500 bg-navy-900/40 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-3xl -mr-32 -mt-32"></div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300 ml-1">Project Domain</label>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {domains.map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, domain: d })}
                                        className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all shadow-md active:scale-95 bg-navy-900/50 ${formData.domain === d ? 'bg-purple-600 border-purple-400 text-white shadow-purple-600/20' : 'border-white/5 text-gray-400 hover:border-white/10 hover:bg-navy-900'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                            {errors.domain && <p className="text-xs text-red-500 font-medium ml-1">{errors.domain}</p>}
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300 ml-1">Problem Definition</label>
                            <textarea
                                value={formData.problemDefinition}
                                onChange={(e) => setFormData({ ...formData, problemDefinition: e.target.value })}
                                placeholder="Describe the problem you are solving..."
                                rows="3"
                                className={`w-full bg-navy-900/50 border rounded-xl p-4 text-sm text-white focus:outline-none transition-all resize-none placeholder-gray-500 shadow-inner ${errors.problemDefinition ? 'border-red-500/50 ring-1 ring-red-500/10' : 'border-white/5 focus:border-purple-500/50'}`}
                            />
                            {errors.problemDefinition && <p className="text-xs text-red-500 font-medium ml-1">{errors.problemDefinition}</p>}
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300 ml-1">Project Description & Tech Stack</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Elaborate on your approach and planned tech stack..."
                                rows="5"
                                className="w-full bg-navy-900/50 border border-white/5 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all resize-none placeholder-gray-500 shadow-inner"
                            />
                        </div>

                        <div className="flex gap-4 pt-6 border-t border-white/5">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={nextStep}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                Continue to Requirements
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="glass-strong p-10 rounded-[2.5rem] border border-white/10 space-y-10 animate-in fade-in slide-in-from-right-8 duration-500 bg-navy-900/40 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-3xl -mr-32 -mt-32"></div>

                        <div className="space-y-5">
                            <label className="text-sm font-medium text-gray-300 ml-1">Required Skills</label>
                            <div className="flex flex-wrap gap-3">
                                {commonSkills.map(skill => (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${formData.requiredSkills.includes(skill) ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30' : 'bg-navy-900/50 border-white/10 text-gray-400 hover:border-purple-500/20'}`}
                                    >
                                        {formData.requiredSkills.includes(skill) ? '✓ ' : '+ '} {skill}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-5">
                            <label className="text-sm font-medium text-gray-300 ml-1">Required Roles</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['Frontend Developer', 'Backend Developer', 'Fullstack', 'UI/UX Designer', 'Product Lead', 'Data Specialist'].map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role]
                                        }))}
                                        className={`px-4 py-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${formData.roles.includes(role) ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/20' : 'bg-navy-900/50 border-white/5 text-gray-400 hover:border-blue-500/20'}`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-sm font-medium text-gray-300">Team Size</label>
                                    <span className="text-lg font-bold text-purple-400 tabular-nums">{formData.teamSize} Members</span>
                                </div>
                                <div className="relative pt-2">
                                    <input
                                        type="range"
                                        min="2"
                                        max="5"
                                        step="1"
                                        value={formData.teamSize}
                                        onChange={(e) => setFormData({ ...formData, teamSize: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-navy-950 rounded-full appearance-none cursor-pointer accent-purple-600 shadow-inner border border-white/5"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 font-medium mt-2">
                                        <span>Min: 2</span>
                                        <span>Max: 5</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <label className="text-sm font-medium text-gray-300 ml-1">Visibility</label>
                                <div className="flex gap-4">
                                    {['Public', 'Invite Only'].map(v => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, visibility: v })}
                                            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 bg-navy-900/50 ${formData.visibility === v ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30' : 'border-white/5 text-gray-400 hover:border-white/10'}`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-10 border-t border-white/5">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <span>Creating Team...</span>
                                    </>
                                ) : 'Create Team'}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );

};

export default CreateTeam;
