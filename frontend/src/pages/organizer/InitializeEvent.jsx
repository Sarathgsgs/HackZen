import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, validateEventSchema } from '../../services/organizer/initializeEventApi';

const InitializeEvent = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    
    // --- Event State ---
    const [formData, setFormData] = useState({
        name: '',
        category: 'Emerging Tech',
        mode: 'Hybrid',
        startDate: '',
        endDate: '',
        description: '',
        location: '',
        maxParticipants: 500,
        prizePool: '',
        difficulty: 'Intermediate'
    });

    const categories = ['Emerging Tech', 'Sustainability', 'FinTech', 'AI/ML', 'Cybersecurity', 'Healthcare'];
    const modes = ['Online', 'In-Person', 'Hybrid'];
    const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleInitialize = async () => {
        setIsLoading(true);
        setValidationErrors({});

        try {
            const { isValid, errors } = await validateEventSchema(formData);
            if (!isValid) {
                setValidationErrors(errors);
                setIsLoading(false);
                return;
            }

            await createEvent(formData);
            // Redirect to dashboard or my hackathons
            navigate('/organizer/dashboard');
        } catch (error) {
            console.error("Initialization failed:", error);
            alert("System Error: Failed to commit event to ledger.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
            {/* Header: Control Center Protocol */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 transition-all active:scale-90"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white">Initialize Event</h1>
                    <p className="text-sm text-gray-400 mt-1">Command Center // Event Origin Protocol</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Configuration Terminal */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Basic Identity Section */}
                    <div className="glass p-8 rounded-xl border border-white/5 shadow-2xl bg-navy-900/40 space-y-8">
                        <h3 className="text-lg font-semibold text-white">
                            <span className="text-cyan-500">01</span> // Basic Identity
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 ml-1">Event Designation (Name)</label>
                                <input 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter event name..."
                                    className={`w-full bg-white/5 border ${validationErrors.name ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-gray-500`}
                                />
                                {validationErrors.name && <p className="text-xs text-rose-500 font-semibold ml-1">{validationErrors.name}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Event Class (Category)</label>
                                    <select 
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:ring-1 focus:ring-cyan-500/50 outline-none cursor-pointer"
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Operational Mode</label>
                                    <select 
                                        name="mode"
                                        value={formData.mode}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:ring-1 focus:ring-cyan-500/50 outline-none cursor-pointer"
                                    >
                                        {modes.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 ml-1">Mission Objective (Description)</label>
                                <textarea 
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="4"
                                    placeholder="Describe the hackathon's mission and goals..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-gray-500 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Temporal Coordinates Section */}
                    <div className="glass p-8 rounded-xl border border-white/5 shadow-2xl bg-navy-900/40 space-y-8">
                        <h3 className="text-lg font-semibold text-white border-l-4 border-blue-500 pl-4">
                            <span className="text-blue-500">02</span> // Temporal Coordinates
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 ml-1">Genesis Date (Start)</label>
                                <input 
                                    type="datetime-local"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                    className={`w-full bg-white/5 border ${validationErrors.startDate ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:ring-1 focus:ring-blue-500/50 outline-none`}
                                />
                                {validationErrors.startDate && <p className="text-xs text-rose-500 font-semibold ml-1">{validationErrors.startDate}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 ml-1">Termination Date (End)</label>
                                <input 
                                    type="datetime-local"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logistics & Execution Side Panel */}
                <div className="space-y-8">
                    <div className="glass p-8 rounded-xl border border-white/5 shadow-2xl bg-navy-900/40 space-y-8">
                        <h3 className="text-lg font-semibold text-white border-l-4 border-amber-500 pl-4">
                            <span className="text-amber-500">03</span> // Execution Parameters
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 ml-1">Max Capacity (Nodes)</label>
                                <input 
                                    type="number"
                                    name="maxParticipants"
                                    value={formData.maxParticipants}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-amber-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 ml-1">Reward Pool (Credits)</label>
                                <input 
                                    name="prizePool"
                                    value={formData.prizePool}
                                    onChange={handleInputChange}
                                    placeholder="$5,000 Total"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-amber-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 ml-1">Skill Complexity</label>
                                <select 
                                    name="difficulty"
                                    value={formData.difficulty}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none cursor-pointer"
                                >
                                    {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-8 rounded-xl border border-white/5 shadow-2xl bg-navy-900/40">
                        <button 
                            onClick={handleInitialize}
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold shadow-2xl shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Syncing Ledger...
                                </div>
                            ) : (
                                "Commit to Origin"
                            )}
                        </button>
                        <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
                            Initializing will create a draft record in the event repository. 
                            Manual activation required for visibility.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InitializeEvent;
