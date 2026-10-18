import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCriteria, saveCriteria, resetCriteria } from '../../services/organizer/evaluationApi';

const EvaluationCriteria = () => {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Toast auto-clear
    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(null), 3500);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    useEffect(() => {
        const loadCriteria = async () => {
            setIsLoading(true);
            try {
                const data = await fetchCriteria();
                setCriteria(data);
            } catch (error) {
                console.error("Failed to load criteria:", error);
                setToastMessage({ type: 'error', text: 'Failed to load evaluation criteria.' });
            } finally {
                setIsLoading(false);
            }
        };
        loadCriteria();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveCriteria(criteria);
            setToastMessage({ type: 'success', text: 'Evaluation criteria saved successfully!' });
        } catch (error) {
            console.error("Failed to save criteria:", error);
            setToastMessage({ type: 'error', text: 'Failed to save criteria. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmReset = async () => {
        setIsResetting(true);
        try {
            const data = await resetCriteria();
            setCriteria(data);
            setToastMessage({ type: 'success', text: 'Criteria restored to default parameters.' });
            setShowResetModal(false);
        } catch (error) {
            console.error("Failed to reset criteria:", error);
            setToastMessage({ type: 'error', text: 'Failed to reset criteria.' });
        } finally {
            setIsResetting(false);
        }
    };

    const handleUpdate = (id, field, value) => {
        setCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleRemove = (id) => {
        setCriteria(prev => prev.filter(c => c.id !== id));
    };

    const handleAdd = () => {
        const newId = `criteria_${Date.now()}`;
        setCriteria(prev => [
            ...prev,
            {
                id: newId,
                label: 'New Criterion',
                description: 'Description of what judges should look for.',
                weight: 10,
                minScore: 0,
                maxScore: 10
            }
        ]);
    };

    // --- Icons Component ---
    const Icon = ({ name, className }) => {
        const icons = {
            ArrowLeft: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
            Plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
            Trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
            Save: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />,
            Refresh: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
            Info: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        };
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {icons[name]}
            </svg>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-full flex flex-col pb-20 relative">

            {/* Floating Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition-all animate-bounce ${
                    toastMessage.type === 'success' 
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                }`}>
                    <span>{toastMessage.type === 'success' ? '✓' : '⚠️'}</span>
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Inline Confirmation Modal for Reset */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl">
                            ⚠️
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reset Criteria to Defaults?</h3>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-2 leading-relaxed">
                                This will erase all your custom rubric items and restore the standard evaluation parameters.
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setShowResetModal(false)}
                                disabled={isResetting}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReset}
                                disabled={isResetting}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-colors flex items-center gap-2"
                            >
                                {isResetting ? 'Restoring...' : 'Yes, Restore Defaults'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/organizer/evaluation')}
                        className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-95 group shadow-xs"
                    >
                        <Icon name="ArrowLeft" className="w-6 h-6 text-slate-500 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Criteria Settings</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fine-tune the scoring matrix and rubric for judges.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowResetModal(true)}
                        disabled={isResetting || isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Icon name="Refresh" className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                        Restore Defaults
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#7C65F6] hover:bg-[#6851ec] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#7C65F6]/20 active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : <Icon name="Save" className="w-4 h-4" />}
                        Save Rubric
                    </button>
                </div>
            </div>

            {/* Matrix Management Section */}
            <div className="flex-1 max-w-5xl mx-auto w-full">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-[#7C65F6]/30 border-t-[#7C65F6] rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">Synchronizing Rubric...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                Scoring Components
                                <span className="text-xs bg-[#7C65F6]/10 text-[#7C65F6] px-2.5 py-0.5 rounded-full border border-[#7C65F6]/20 font-bold">
                                    {criteria.length}
                                </span>
                            </h2>
                            <button 
                                onClick={handleAdd}
                                className="flex items-center gap-2 px-4 py-2 bg-[#7C65F6]/10 text-[#7C65F6] border border-[#7C65F6]/20 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7C65F6] hover:text-white transition-all active:scale-95"
                            >
                                <Icon name="Plus" className="w-3.5 h-3.5" />
                                Add Criterion
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {criteria.map((c, index) => (
                                <div 
                                    key={c.id} 
                                    className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 group hover:border-[#7C65F6]/40 transition-all shadow-xs relative overflow-hidden"
                                >
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Left Side: Inputs */}
                                        <div className="flex-1 space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider ml-1">Criterion Label</label>
                                                <input 
                                                    type="text" 
                                                    value={c.label} 
                                                    onChange={(e) => handleUpdate(c.id, 'label', e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C65F6]/30 focus:border-[#7C65F6] transition-all text-base"
                                                    placeholder="e.g., Technical Depth"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider ml-1">Evaluation Guidance (Description)</label>
                                                <textarea 
                                                    value={c.description} 
                                                    onChange={(e) => handleUpdate(c.id, 'description', e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-700 dark:text-gray-300 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C65F6]/30 focus:border-[#7C65F6] transition-all resize-none h-20"
                                                    placeholder="What should judges evaluate for this point?"
                                                />
                                            </div>
                                        </div>

                                        {/* Right Side: Parameters & Actions */}
                                        <div className="w-full md:w-60 space-y-4">
                                            <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-xs font-bold text-[#7C65F6] uppercase tracking-wider">Max Score</label>
                                                        <span className="text-base font-bold text-slate-900 dark:text-white">{c.maxScore} pts</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="1" 
                                                        max="100" 
                                                        value={c.maxScore} 
                                                        onChange={(e) => handleUpdate(c.id, 'maxScore', parseInt(e.target.value))}
                                                        className="w-full h-1.5 bg-slate-200 dark:bg-navy-950 rounded-full appearance-none cursor-pointer accent-[#7C65F6]"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Weight (%)</label>
                                                        <span className="text-base font-bold text-slate-900 dark:text-white">{c.weight}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        value={c.weight} 
                                                        onChange={(e) => handleUpdate(c.id, 'weight', parseInt(e.target.value))}
                                                        className="w-full h-1.5 bg-slate-200 dark:bg-navy-950 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleRemove(c.id)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                                >
                                                    <Icon name="Trash" className="w-3.5 h-3.5" />
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {criteria.length === 0 && (
                            <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-8">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Criteria Defined</h3>
                                <p className="text-slate-500 dark:text-gray-400 text-sm max-w-sm mx-auto mb-6">Create scoring criteria so that judges can score submissions appropriately.</p>
                                <button 
                                    onClick={handleAdd}
                                    className="px-6 py-2.5 bg-[#7C65F6] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#6851ec] transition-all active:scale-95"
                                >
                                    Add First Criterion
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Sticky Action Bar */}
            <div className="sticky bottom-4 mx-auto w-full max-w-lg bg-white/95 dark:bg-navy-900/95 border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 flex items-center justify-between gap-4 shadow-xl backdrop-blur-md z-40">
                <div className="px-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Weight</span>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-bold ${criteria.reduce((a, b) => a + (b.weight || 0), 0) === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {criteria.reduce((a, b) => a + (b.weight || 0), 0)}%
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">/ 100%</span>
                    </div>
                </div>
                <button 
                   onClick={handleSave}
                   className="px-8 py-2.5 bg-[#7C65F6] hover:bg-[#6851ec] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#7C65F6]/20 transition-all active:scale-95 whitespace-nowrap"
                >
                    Save Rubric
                </button>
            </div>
        </div>
    );
};

export default EvaluationCriteria;
