import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { saveHackathonDraft } from '../../services/organizer/createHackathonApi';

const THEME_OPTIONS = [
    'AI & Machine Learning',
    'FinTech & Banking',
    'Web3 & Blockchain',
    'HealthTech',
    'EdTech',
    'Cybersecurity',
    'Open Innovation',
    'Climate & Sustainability',
    'IoT & Hardware'
];

const CreateHackathonStepOne = () => {
    const { draft, setDraft, handleStepChange } = useOutletContext();

    const [formData, setFormData] = useState({
        title: draft.title || '',
        description: draft.description || '',
        category: draft.category || 'AI & Machine Learning',
        mode: draft.mode || 'Online',
        minTeamSize: draft.minTeamSize || 1,
        maxTeamSize: draft.maxTeamSize || 4,
        posterFile: draft.posterFile || null,
        posterPreview: draft.posterPreview || '',
        posterDataUrl: draft.posterDataUrl || ''
    });

    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [draftSavedToast, setDraftSavedToast] = useState(false);

    const handleTextChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handlePosterChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, poster: 'File size must be under 10MB.' }));
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                posterFile: file,
                posterPreview: previewUrl,
                posterDataUrl: reader.result
            }));
            setErrors(prev => ({ ...prev, poster: null }));
        };
        reader.readAsDataURL(file);
    };

    const validate = () => {
        const nextErrors = {};
        if (!formData.title.trim()) {
            nextErrors.title = 'Hackathon name is required.';
        }
        if (!formData.description.trim()) {
            nextErrors.description = 'Description is required.';
        } else if (formData.description.length > 500) {
            nextErrors.description = 'Description cannot exceed 500 characters.';
        }
        if (Number(formData.minTeamSize) < 1) {
            nextErrors.teamSize = 'Minimum team size must be at least 1.';
        }
        if (Number(formData.maxTeamSize) < Number(formData.minTeamSize)) {
            nextErrors.teamSize = 'Max team size cannot be smaller than min team size.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            const updated = {
                ...draft,
                ...formData,
                themes: [formData.category]
            };
            await saveHackathonDraft(updated);
            setDraft(updated);
            setDraftSavedToast(true);
            setTimeout(() => setDraftSavedToast(false), 3000);
        } catch (e) {
            console.error("Draft save failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = async () => {
        if (!validate()) return;

        setIsSaving(true);
        try {
            const updated = {
                ...draft,
                ...formData,
                themes: [formData.category]
            };
            await saveHackathonDraft(updated);
            setDraft(updated);
            handleStepChange(2);
        } catch (e) {
            console.error("Failed to proceed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-8 space-y-7">
            {/* Draft Saved Toast */}
            {draftSavedToast && (
                <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-950/90 text-emerald-200 border border-emerald-500/30 text-xs font-bold shadow-2xl animate-in slide-in-from-bottom-5">
                    ✓ Draft saved successfully
                </div>
            )}

            {/* Field: Hackathon Name */}
            <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                    Hackathon Name <span className="text-rose-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleTextChange('title', e.target.value)}
                    placeholder="e.g. Global AI Challenge 2024"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none transition-all ${
                        errors.title 
                            ? 'border-rose-400 ring-2 ring-rose-400/20' 
                            : 'border-slate-200 dark:border-white/10 focus:border-[#7C65F6] focus:ring-2 focus:ring-purple-500/20'
                    }`}
                />
                {errors.title && (
                    <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.title}</p>
                )}
            </div>

            {/* Field: Description with Character Counter */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider">
                        Description <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[11px] font-semibold ${
                        formData.description.length > 500 ? 'text-rose-500 font-bold' : 'text-slate-400 dark:text-gray-500'
                    }`}>
                        {formData.description.length} / 500 characters
                    </span>
                </div>
                <textarea
                    rows="4"
                    maxLength={500}
                    value={formData.description}
                    onChange={(e) => handleTextChange('description', e.target.value)}
                    placeholder="Briefly describe the purpose and goals of this hackathon..."
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none transition-all resize-none ${
                        errors.description 
                            ? 'border-rose-400 ring-2 ring-rose-400/20' 
                            : 'border-slate-200 dark:border-white/10 focus:border-[#7C65F6] focus:ring-2 focus:ring-purple-500/20'
                    }`}
                />
                {errors.description && (
                    <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.description}</p>
                )}
            </div>

            {/* 2 Columns: Theme/Category and Event Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Theme / Category Dropdown */}
                <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                        Theme / Category
                    </label>
                    <div className="relative">
                        <select
                            value={formData.category}
                            onChange={(e) => handleTextChange('category', e.target.value)}
                            className="w-full appearance-none px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6] focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                        >
                            {THEME_OPTIONS.map(opt => (
                                <option key={opt} value={opt} className="bg-white dark:bg-navy-900 text-slate-900 dark:text-white">
                                    {opt}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3.5 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Event Mode Radio Buttons matching Figma */}
                <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                        Event Mode <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-4 sm:gap-6 pt-2">
                        {['Online', 'In-Person', 'Hybrid'].map((mode) => {
                            const isSelected = formData.mode === mode;
                            return (
                                <label 
                                    key={mode} 
                                    className="flex items-center gap-2 cursor-pointer select-none group"
                                    onClick={() => handleTextChange('mode', mode)}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                        isSelected 
                                            ? 'border-[#7C65F6] bg-purple-50 dark:bg-purple-950/30' 
                                            : 'border-slate-300 dark:border-white/20 group-hover:border-slate-400'
                                    }`}>
                                        {isSelected && (
                                            <div className="w-2 h-2 rounded-full bg-[#7C65F6]" />
                                        )}
                                    </div>
                                    <span className={`text-xs sm:text-sm font-medium ${
                                        isSelected 
                                            ? 'text-slate-900 dark:text-white font-bold' 
                                            : 'text-slate-600 dark:text-gray-400'
                                    }`}>
                                        {mode}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Team Size Limits: min - max */}
            <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                    Team Size limits
                </label>
                <div className="flex items-center gap-3 max-w-sm">
                    <div className="relative flex-1">
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={formData.minTeamSize}
                            onChange={(e) => handleTextChange('minTeamSize', e.target.value)}
                            placeholder="min"
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6] focus:ring-2 focus:ring-purple-500/20 text-center"
                        />
                    </div>
                    <span className="text-slate-400 font-bold">-</span>
                    <div className="relative flex-1">
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={formData.maxTeamSize}
                            onChange={(e) => handleTextChange('maxTeamSize', e.target.value)}
                            placeholder="max"
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6] focus:ring-2 focus:ring-purple-500/20 text-center"
                        />
                    </div>
                </div>
                {errors.teamSize && (
                    <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.teamSize}</p>
                )}
            </div>

            {/* Optional Banner Image Upload */}
            <div className="pt-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                    Event Banner or Poster (Optional)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
                    {formData.posterPreview ? (
                        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 relative group">
                            <img src={formData.posterPreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-[#7C65F6] flex items-center justify-center text-2xl shrink-0">
                            🖼️
                        </div>
                    )}
                    <div className="flex-1 text-center sm:text-left">
                        <p className="text-xs font-bold text-slate-700 dark:text-gray-300">
                            Upload high-resolution event banner
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                            Supports PNG, JPG, or WEBP (Max 10MB)
                        </p>
                        <label className="inline-block mt-2.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:border-[#7C65F6] text-xs font-bold text-slate-700 dark:text-gray-200 cursor-pointer transition-colors">
                            Choose File
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handlePosterChange}
                                className="hidden" 
                            />
                        </label>
                    </div>
                </div>
                {errors.poster && (
                    <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.poster}</p>
                )}
            </div>

            {/* Bottom Actions: Save as Draft & Next Step */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl border border-[#7C65F6] text-[#7C65F6] hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                    Save as Draft
                </button>

                <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-[#7C65F6] hover:bg-[#6852F6] text-white text-xs font-bold shadow-md shadow-[#7C65F6]/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                    <span>Next Step</span>
                    <span>&rarr;</span>
                </button>
            </div>
        </div>
    );
};

export default CreateHackathonStepOne;
