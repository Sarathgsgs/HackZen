import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';
import { fetchMyHackathons } from '../../services/organizer/myHackathonsApi';

const EditTimeline = () => {
    const { hackathonId } = useParams();
    const navigate = useNavigate();

    // --- State Management ---
    const [allHackathons, setAllHackathons] = useState([]);
    const [selectedHackathonId, setSelectedHackathonId] = useState(hackathonId || '');
    const [hackathon, setHackathon] = useState(null);
    const [phases, setPhases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [validationErrors, setValidationErrors] = useState({});

    // --- Helper: Format Date for Input ---
    const formatDateForInput = (dateString) => {
        if (!dateString || dateString === 'TBD') return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 16);
    };

    // --- Helper: Calculate Status ---
    const calculateStatus = (startDate, endDate) => {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Upcoming';
        if (now < start) return 'Upcoming';
        if (now >= start && now <= end) return 'Ongoing';
        return 'Completed';
    };

    // --- Load Hackathons List ---
    useEffect(() => {
        const loadHackathons = async () => {
            try {
                const list = await fetchMyHackathons();
                setAllHackathons(list || []);
                if (!hackathonId && list && list.length > 0) {
                    setSelectedHackathonId(list[0].id);
                }
            } catch (err) {
                console.warn("Failed to load organizer hackathons list", err);
            }
        };
        loadHackathons();
    }, [hackathonId]);

    // --- Initial Data Fetch for Selected Hackathon ---
    useEffect(() => {
        const currentId = hackathonId || selectedHackathonId;
        if (!currentId) return;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data } = await apiClient.get(`/hackathon/${currentId}`);
                
                const mappedHackathon = {
                    id: data._id || data.id || currentId,
                    title: data.title || "Hackathon Event",
                    mode: data.location?.toLowerCase().includes('online') ? 'Online' : 'Hybrid',
                    registrations: data.participants_count || data.totalParticipants || 0,
                    status: data.status || "Active",
                    startDate: data.registrationStart || data.hackathonStart || new Date().toISOString(),
                    endDate: data.hackathonEnd || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
                    banner: data.posterUrl || "https://images.unsplash.com/photo-1504384308090-c54be3852f33?auto=format&fit=crop&q=80&w=1000"
                };

                let loadedPhases = Array.isArray(data.phases) && data.phases.length > 0 ? data.phases : [];

                if (loadedPhases.length === 0) {
                    const regStart = formatDateForInput(data.registrationStart) || formatDateForInput(new Date().toISOString());
                    const regEnd = formatDateForInput(data.registrationEnd) || formatDateForInput(new Date(Date.now() + 5 * 86400000).toISOString());
                    const hackStart = formatDateForInput(data.hackathonStart) || formatDateForInput(new Date(Date.now() + 6 * 86400000).toISOString());
                    const hackEnd = formatDateForInput(data.hackathonEnd) || formatDateForInput(new Date(Date.now() + 8 * 86400000).toISOString());
                    const evalEnd = formatDateForInput(new Date(Date.now() + 10 * 86400000).toISOString());
                    const resultDate = formatDateForInput(new Date(Date.now() + 12 * 86400000).toISOString());

                    loadedPhases = [
                        { id: 'p1', name: 'Registration Period', startDate: regStart, endDate: regEnd, isDefault: true },
                        { id: 'p2', name: 'Submission Period', startDate: hackStart, endDate: hackEnd, isDefault: true },
                        { id: 'p3', name: 'Evaluation Period', startDate: hackEnd, endDate: evalEnd, isDefault: true },
                        { id: 'p4', name: 'Result Announcement', startDate: evalEnd, endDate: resultDate, isDefault: true }
                    ];
                } else {
                    loadedPhases = loadedPhases.map(p => ({
                        ...p,
                        startDate: formatDateForInput(p.startDate),
                        endDate: formatDateForInput(p.endDate)
                    }));
                }

                setHackathon(mappedHackathon);
                setPhases(loadedPhases);
            } catch (err) {
                console.error("Failed to fetch hackathon timeline", err);
                setError(err.response?.data?.detail || "Failed to load timeline data. Please check event status.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [hackathonId, selectedHackathonId]);

    // --- Validation Logic ---
    const validatePhases = (currentPhases) => {
        const errors = {};
        let hasErrors = false;

        currentPhases.forEach((phase, index) => {
            const start = new Date(phase.startDate);
            const end = new Date(phase.endDate);

            if (!phase.name?.trim()) {
                errors[phase.id] = "Phase name cannot be empty";
                hasErrors = true;
            }

            if (start >= end) {
                errors[phase.id] = "End date must be strictly after start date";
                hasErrors = true;
            }

            for (let i = 0; i < currentPhases.length; i++) {
                if (i === index) continue;
                const otherPhase = currentPhases[i];
                const otherStart = new Date(otherPhase.startDate);
                const otherEnd = new Date(otherPhase.endDate);

                if (start < otherEnd && end > otherStart) {
                    errors[phase.id] = (errors[phase.id] ? errors[phase.id] + ". " : "") + "Overlaps with '" + otherPhase.name + "'";
                    hasErrors = true;
                }
            }
        });

        setValidationErrors(errors);
        return !hasErrors;
    };

    // --- Form Action Handlers ---
    const handleAddPhase = () => {
        const lastPhase = phases[phases.length - 1];
        let newStartDate = new Date();
        let newEndDate = new Date();

        if (lastPhase && lastPhase.endDate) {
            newStartDate = new Date(lastPhase.endDate);
            newStartDate.setHours(newStartDate.getHours() + 1);
            newEndDate = new Date(newStartDate);
            newEndDate.setDate(newEndDate.getDate() + 2);
        } else {
            newEndDate.setDate(newEndDate.getDate() + 2);
        }

        const newPhase = {
            id: 'p_' + Date.now(),
            name: `Phase ${phases.length + 1}`,
            startDate: formatDateForInput(newStartDate),
            endDate: formatDateForInput(newEndDate),
            isDefault: false
        };

        const updatedPhases = [...phases, newPhase];
        setPhases(updatedPhases);
        validatePhases(updatedPhases);
    };

    const handleRemovePhase = (id) => {
        const updatedPhases = phases.filter(p => p.id !== id);
        setPhases(updatedPhases);
        validatePhases(updatedPhases);
    };

    const handlePhaseChange = (id, field, value) => {
        const updatedPhases = phases.map(phase => {
            if (phase.id === id) {
                return { ...phase, [field]: value };
            }
            return phase;
        });

        setPhases(updatedPhases);
        validatePhases(updatedPhases);
    };

    const handleSave = async () => {
        if (!validatePhases(phases)) return;

        const currentId = hackathonId || selectedHackathonId;
        if (!currentId) return;

        setIsSaving(true);
        setError(null);
        setSuccessMessage('');

        try {
            const regPhase = phases.find(p => p.name.toLowerCase().includes('reg')) || phases[0];
            const subPhase = phases.find(p => p.name.toLowerCase().includes('sub')) || phases[1] || phases[0];

            const payload = {
                registrationStart: regPhase ? new Date(regPhase.startDate).toISOString() : undefined,
                registrationEnd: regPhase ? new Date(regPhase.endDate).toISOString() : undefined,
                hackathonStart: subPhase ? new Date(subPhase.startDate).toISOString() : undefined,
                hackathonEnd: subPhase ? new Date(subPhase.endDate).toISOString() : undefined,
                phases: phases.map(p => ({
                    id: p.id,
                    name: p.name,
                    startDate: new Date(p.startDate).toISOString(),
                    endDate: new Date(p.endDate).toISOString(),
                    status: calculateStatus(p.startDate, p.endDate)
                }))
            };

            await apiClient.put(`/hackathon/${currentId}`, payload);
            setSuccessMessage("Timeline updated and synchronized with event schedule successfully!");
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (err) {
            console.error("Failed to save timeline", err);
            setError(err.response?.data?.detail || "Failed to save timeline. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        navigate('/organizer/my-hackathons');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to My Hackathons
                    </button>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Edit Timeline
                    </h1>
                    <p className="text-gray-400">
                        Manage phases, dates, and milestones for this hackathon
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {allHackathons.length > 1 && (
                        <select
                            value={selectedHackathonId || hackathonId}
                            onChange={(e) => {
                                setSelectedHackathonId(e.target.value);
                                navigate(`/organizer/edit-timeline/${e.target.value}`);
                            }}
                            className="bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500"
                        >
                            {allHackathons.map(h => (
                                <option key={h.id} value={h.id} className="bg-gray-900 text-white">
                                    {h.title}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(validationErrors).length > 0}
                        className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-emerald-200 text-sm">✕</button>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-between animate-in fade-in">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200 text-sm">✕</button>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 animate-pulse">
                    <svg className="w-10 h-10 mb-4 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>Loading event timeline details...</p>
                </div>
            ) : (
                <>
                    {/* Hackathon Overview Card */}
                    {hackathon && (
                        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center gap-6">
                            <img
                                src={hackathon.banner}
                                alt={hackathon.title}
                                className="w-full md:w-48 h-28 object-cover rounded-xl border border-white/10 shadow-lg"
                            />
                            <div className="space-y-2 flex-1 text-center md:text-left">
                                <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold rounded-full uppercase">
                                    {hackathon.mode} • {hackathon.status}
                                </span>
                                <h2 className="text-2xl font-bold text-white">{hackathon.title}</h2>
                                <p className="text-sm text-gray-400">
                                    {hackathon.registrations} registered participants • Timeline configuration controls live submission portals
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Timeline Phases Editor */}
                    <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">Event Phases</h2>
                                <p className="text-sm text-gray-400">Configure milestone dates and participant schedules</p>
                            </div>
                            <button
                                onClick={handleAddPhase}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                Add Phase
                            </button>
                        </div>

                        <div className="space-y-4">
                            {phases.map((phase, index) => {
                                const currentStatus = calculateStatus(phase.startDate, phase.endDate);
                                const isInvalid = !!validationErrors[phase.id];

                                return (
                                    <div
                                        key={phase.id}
                                        className={`p-5 rounded-xl border transition-all ${
                                            isInvalid
                                                ? 'bg-rose-500/5 border-rose-500/30'
                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                            {/* Phase Name & Index */}
                                            <div className="flex items-center gap-3 w-full lg:w-1/3">
                                                <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/30 shrink-0">
                                                    {index + 1}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={phase.name}
                                                    onChange={(e) => handlePhaseChange(phase.id, 'name', e.target.value)}
                                                    placeholder="Phase Title"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-medium outline-none focus:border-cyan-500"
                                                />
                                            </div>

                                            {/* Start and End Date Inputs */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-1/2">
                                                <div>
                                                    <label className="text-xs text-gray-400 block mb-1">Start Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={phase.startDate}
                                                        onChange={(e) => handlePhaseChange(phase.id, 'startDate', e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 block mb-1">End Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={phase.endDate}
                                                        onChange={(e) => handlePhaseChange(phase.id, 'endDate', e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Status Badge and Delete Action */}
                                            <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto shrink-0">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${
                                                    currentStatus === 'Ongoing'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : currentStatus === 'Upcoming'
                                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                }`}>
                                                    {currentStatus}
                                                </span>

                                                <button
                                                    onClick={() => handleRemovePhase(phase.id)}
                                                    className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    title="Remove Phase"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>
                                        </div>

                                        {isInvalid && (
                                            <p className="text-xs text-rose-400 mt-3 font-medium flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                {validationErrors[phase.id]}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default EditTimeline;
