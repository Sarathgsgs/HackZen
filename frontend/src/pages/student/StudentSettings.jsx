import React, { useEffect, useState } from 'react';
import { fetchStudentSettings, updateStudentSettings, changePassword, deactivateStudentAccount, resetStudentSettings } from '../../services/student/studentSettingsApi';

const StudentSettings = () => {
    const [settings, setSettings] = useState({
        profileMode: 'Public',
        emailNotifications: true,
        pushNotifications: false,
        theme: 'Purple Dark',
        accessibilityMode: false,
        contentLanguage: 'English (US)',
        twoFactorEnabled: false,
        dataSharing: true,
        allowTeamInvitations: true,
        notificationFrequency: 'Instant'
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Toast notification helper
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    // Load settings on component mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                setIsLoading(true);
                const data = await fetchStudentSettings();
                setSettings(data);
            } catch (error) {
                console.error('Failed to load settings:', error);
                showToast(error.message || 'Failed to load settings', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    // Toggle boolean settings
    const toggleSetting = async (key) => {
        const newValue = !settings[key];
        const oldValue = settings[key];
        setSettings((prev) => ({ ...prev, [key]: newValue }));
        setIsSaving(true);

        try {
            await updateStudentSettings({ [key]: newValue });
            showToast(`${key.replace(/([A-Z])/g, ' $1')} updated successfully`, 'success');
        } catch (error) {
            console.error(`Failed to update ${key}:`, error);
            setSettings((prev) => ({ ...prev, [key]: oldValue }));
            showToast(error.message || `Failed to update ${key}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle profile mode change
    const handleProfileModeChange = async (e) => {
        const newValue = e.target.value;
        const oldValue = settings.profileMode;
        setSettings((prev) => ({ ...prev, profileMode: newValue }));
        setIsSaving(true);

        try {
            await updateStudentSettings({ profileMode: newValue });
            showToast('Profile visibility updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update profile visibility:', error);
            setSettings((prev) => ({ ...prev, profileMode: oldValue }));
            showToast(error.message || 'Failed to update profile visibility', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle notification frequency change
    const handleNotificationFrequencyChange = async (e) => {
        const newValue = e.target.value;
        const oldValue = settings.notificationFrequency;
        setSettings((prev) => ({ ...prev, notificationFrequency: newValue }));
        setIsSaving(true);

        try {
            await updateStudentSettings({ notificationFrequency: newValue });
            showToast('Notification frequency updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update notification frequency:', error);
            setSettings((prev) => ({ ...prev, notificationFrequency: oldValue }));
            showToast(error.message || 'Failed to update notification frequency', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle password change form
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (!passwordForm.currentPassword) {
            showToast('Current password is required', 'error');
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            showToast('New password must be at least 8 characters long', 'error');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setIsChangingPassword(true);

        try {
            await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
            showToast('Password updated successfully', 'success');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Failed to change password:', error);
            showToast(error.message || 'Failed to change password', 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    // Handle account deactivation
    const handleDeactivate = async () => {
        if (!window.confirm('Are you sure you want to deactivate your student account? This action will schedule your profile for deletion in 30 days.')) {
            return;
        }

        setIsDeactivating(true);

        try {
            await deactivateStudentAccount();
            showToast('Account deactivated successfully. You will be redirected...', 'success');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (error) {
            console.error('Failed to deactivate account:', error);
            showToast(error.message || 'Failed to deactivate account', 'error');
            setIsDeactivating(false);
        }
    };

    // Reset settings to defaults
    const handleResetSettings = async () => {
        if (!window.confirm('Reset all settings to defaults?')) {
            return;
        }

        setIsSaving(true);

        try {
            const defaultSettings = await resetStudentSettings();
            setSettings(defaultSettings);
            showToast('Settings restored to defaults', 'success');
        } catch (error) {
            console.error('Failed to reset settings:', error);
            showToast(error.message || 'Failed to reset settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-navy-950 px-4 py-8">
                <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-8 shadow-xs">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 w-3/4 rounded-xl bg-slate-200 dark:bg-navy-800"></div>
                        <div className="h-4 w-1/2 rounded-xl bg-slate-200 dark:bg-navy-800"></div>
                        <div className="space-y-3 mt-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-navy-950"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-navy-950 px-4 py-6 md:px-8 text-slate-900 dark:text-white transition-colors duration-200">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-4 right-4 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white z-50 shadow-xl transition-all ${
                    toast.type === 'success' 
                        ? 'bg-emerald-600' 
                        : toast.type === 'error' 
                        ? 'bg-rose-600' 
                        : 'bg-indigo-600'
                }`}>
                    {toast.message}
                </div>
            )}

            <div className="mx-auto max-w-7xl space-y-6">
                {/* 1. Header (Admin Standard) */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            Settings
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Manage your privacy visibility, security credentials, and alert notification preferences.
                        </p>
                    </div>
                </header>

                {/* 2. Overview Stat Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 shadow-xs">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Profile Mode</span>
                        <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{settings.profileMode}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 shadow-xs">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Theme Preference</span>
                        <p className="mt-2 text-2xl font-extrabold text-[#7C65F6] dark:text-purple-400">{settings.theme}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 shadow-xs">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Content Language</span>
                        <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{settings.contentLanguage}</p>
                    </div>
                </div>

                {/* 3. Settings Split: Privacy & Security | Notifications */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* Privacy & Account */}
                    <div className="space-y-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                        <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Privacy & Visibility</h2>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Control who can see your portfolio and send invitations.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Profile Visibility</label>
                                <select
                                    value={settings.profileMode}
                                    onChange={handleProfileModeChange}
                                    disabled={isSaving}
                                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#7C65F6] disabled:opacity-50"
                                >
                                    <option>Public</option>
                                    <option>Private</option>
                                    <option>Connections Only</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notification Frequency</label>
                                <select
                                    value={settings.notificationFrequency}
                                    onChange={handleNotificationFrequencyChange}
                                    disabled={isSaving}
                                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#7C65F6] disabled:opacity-50"
                                >
                                    <option>Instant</option>
                                    <option>Daily</option>
                                    <option>Weekly</option>
                                    <option>Never</option>
                                </select>
                            </div>

                            {[
                                { key: 'dataSharing', title: 'Data Sharing', description: 'Allow anonymized platform telemetry to improve team matching.' },
                                { key: 'allowTeamInvitations', title: 'Allow Team Invitations', description: 'Allow participants from your hackathons to invite you to teams.' }
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => toggleSetting(item.key)}
                                    disabled={isSaving}
                                    className={`w-full flex items-center justify-between gap-4 rounded-xl border p-3.5 text-left transition-all disabled:opacity-50 cursor-pointer ${
                                        settings[item.key]
                                            ? 'border-purple-300 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20'
                                            : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-navy-950/40 hover:bg-slate-100/60 dark:hover:bg-navy-900'
                                    }`}
                                >
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                                    </div>
                                    <div className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${settings[item.key] ? 'bg-[#7C65F6]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-xs ${settings[item.key] ? 'left-5' : 'left-0.5'}`} />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Security Sub-section */}
                        <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-5">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Password</h3>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Update your access password regularly to keep your credentials safe.</p>
                            </div>
                            <form onSubmit={handlePasswordSubmit} className="space-y-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-navy-950/40 p-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Password</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordForm.currentPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="••••••••"
                                        disabled={isChangingPassword}
                                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 px-3.5 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6] disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="At least 8 characters"
                                        disabled={isChangingPassword}
                                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 px-3.5 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6] disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirm Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm new password"
                                        disabled={isChangingPassword}
                                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 px-3.5 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:border-[#7C65F6] disabled:opacity-50"
                                    />
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isChangingPassword}
                                        className="rounded-xl bg-[#7C65F6] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#6D28D9] active:scale-95 disabled:opacity-50 cursor-pointer"
                                    >
                                        {isChangingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Notifications & System Preferences */}
                    <div className="space-y-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="border-b border-slate-100 dark:border-white/5 pb-3 mb-5">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Alerts & System Preferences</h2>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Manage device push channels and visual options.</p>
                            </div>

                            <div className="space-y-4">
                                {[
                                    {
                                        key: 'emailNotifications',
                                        title: 'Email Notifications',
                                        description: 'Receive event announcements and mentor review alerts via email.'
                                    },
                                    {
                                        key: 'pushNotifications',
                                        title: 'Browser Push Alerts',
                                        description: 'Real-time desktop alerts when milestones or submission reviews complete.'
                                    },
                                    {
                                        key: 'twoFactorEnabled',
                                        title: 'Two-Factor Authentication (2FA)',
                                        description: 'Require cryptographic verification code on login.'
                                    },
                                    {
                                        key: 'accessibilityMode',
                                        title: 'High Contrast Mode',
                                        description: 'Amplify borders and contrast for enhanced visibility.'
                                    }
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => toggleSetting(item.key)}
                                        disabled={isSaving}
                                        className={`w-full flex items-center justify-between gap-4 rounded-xl border p-3.5 text-left transition-all disabled:opacity-50 cursor-pointer ${
                                            settings[item.key]
                                                ? 'border-purple-300 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20'
                                                : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-navy-950/40 hover:bg-slate-100/60 dark:hover:bg-navy-900'
                                        }`}
                                    >
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                                        </div>
                                        <div className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${settings[item.key] ? 'bg-[#7C65F6]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-xs ${settings[item.key] ? 'left-5' : 'left-0.5'}`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-5 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={handleResetSettings}
                                disabled={isSaving}
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {isSaving ? 'Resetting...' : 'Restore Default Settings'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. Danger Zone */}
                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                    <h2 className="text-base font-bold text-rose-600 dark:text-rose-400">Danger Zone</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Deactivate your student account. Your submissions and active registrations will be scheduled for permanent removal after a 30-day grace period.
                    </p>
                    <div className="mt-4 flex">
                        <button
                            onClick={handleDeactivate}
                            disabled={isDeactivating}
                            className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentSettings;
