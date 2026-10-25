import React, { useState, useEffect, useMemo } from 'react';
import { fetchOrganizerSettings, updateOrganizerSettings } from '../../services/organizer/organizerSettingsApi';

const OrganizerSettings = () => {
    // --- State Management ---
    const [orgSettings, setOrgSettings] = useState({
        orgName: '',
        emailReports: 'weekly',
        autoApproveMentors: false
    });

    const [initialSettings, setInitialSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    // --- Data Initialization ---
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await fetchOrganizerSettings();
                setOrgSettings(data);
                setInitialSettings(data);
            } catch (error) {
                console.error("Failed to load organizer settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    // --- Dirty State Detection ---
    const isDirty = useMemo(() => {
        if (!initialSettings) return false;
        return (
            orgSettings.orgName !== initialSettings.orgName ||
            orgSettings.emailReports !== initialSettings.emailReports ||
            orgSettings.autoApproveMentors !== initialSettings.autoApproveMentors
        );
    }, [orgSettings, initialSettings]);

    const isValid = orgSettings.orgName.trim().length > 0;

    const handleSave = async () => {
        if (!isValid || !isDirty || isSaving) return;
        setIsSaving(true);
        setSaveStatus(null);

        try {
            const response = await updateOrganizerSettings(orgSettings);
            setInitialSettings(response.data);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-900 dark:text-white transition-colors duration-200">
            {/* 1. Header (Admin Benchmark) */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Organization Settings
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Define your organizational profile, analytical digest frequency, and automated workflows.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {saveStatus === 'success' && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            ✓ Settings Updated
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || !isValid || isSaving}
                        className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                            !isDirty || !isValid || isSaving
                                ? 'border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-navy-800 text-slate-400 cursor-not-allowed'
                                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
                        }`}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </header>

            {/* 2. Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Organization Identity */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                        <div className="border-b border-slate-100 dark:border-white/5 pb-3.5 mb-5">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Organization Profile
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Public profile details displayed on hackathon announcements.</p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Official Organization Name</label>
                                <input
                                    type="text"
                                    value={orgSettings.orgName}
                                    placeholder="e.g. Acme Tech Innovations"
                                    onChange={(e) => setOrgSettings({ ...orgSettings, orgName: e.target.value })}
                                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 px-4 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Analytical Digest Frequency</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['daily', 'weekly', 'monthly'].map((freq) => (
                                        <button
                                            key={freq}
                                            type="button"
                                            onClick={() => setOrgSettings({ ...orgSettings, emailReports: freq })}
                                            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                orgSettings.emailReports === freq
                                                    ? 'bg-[#2563eb] text-white shadow-xs'
                                                    : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800'
                                            }`}
                                        >
                                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workflow Automations */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                        <div className="border-b border-slate-100 dark:border-white/5 pb-3.5 mb-5">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Workflow Automations
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Automate participant approvals and communication channels.</p>
                        </div>

                        <div className="space-y-4">
                            <div
                                className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-navy-950/40 hover:bg-slate-100/60 dark:hover:bg-navy-900 transition-all cursor-pointer flex items-center justify-between"
                                onClick={() => setOrgSettings({ ...orgSettings, autoApproveMentors: !orgSettings.autoApproveMentors })}
                            >
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Auto-approve Verified Mentors</h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Automatically grant access to approved mentors.</p>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${
                                    orgSettings.autoApproveMentors ? 'bg-[#2563eb]' : 'bg-slate-300 dark:bg-slate-700'
                                }`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-xs ${
                                        orgSettings.autoApproveMentors ? 'left-5' : 'left-0.5'
                                    }`} />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50/30 dark:bg-navy-950/20 opacity-60 cursor-not-allowed">
                                <div className="space-y-0.5">
                                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">Slack & Discord Webhooks</h3>
                                    <p className="text-[11px] text-slate-400">Integration channel coming soon in next release.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizerSettings;
