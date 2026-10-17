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
            console.error('Failed to update profile mode:', error);
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

    // Handle password form input
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    // Submit password change
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            showToast('Please fill in all password fields', 'error');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            showToast('New password must be at least 8 characters long', 'error');
            return;
        }

        setIsChangingPassword(true);

        try {
            const result = await changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
                confirmPassword: passwordForm.confirmPassword
            });

            showToast(result.message || 'Password changed successfully', 'success');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Password change failed:', error);
            showToast(error.message || 'Failed to change password', 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    // Handle account deactivation
    const handleDeactivate = async () => {
        const confirmed = window.confirm(
            'Are you absolutely sure you want to deactivate your account? This action cannot be undone immediately. Your account will be scheduled for deletion after 30 days.'
        );

        if (!confirmed) return;

        setIsDeactivating(true);

        try {
            const response = await deactivateStudentAccount();
            showToast(response.message || 'Account deactivated successfully', 'success');
            
            // Redirect to home after short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } catch (error) {
            console.error('Deactivation failed:', error);
            showToast(error.message || 'Failed to deactivate account', 'error');
            setIsDeactivating(false);
        }
    };

    // Handle reset settings
    const handleResetSettings = async () => {
        const confirmed = window.confirm('Are you sure you want to reset all settings to defaults?');
        
        if (!confirmed) return;

        setIsSaving(true);

        try {
            const result = await resetStudentSettings();
            setSettings(result.data);
            showToast('Settings reset to defaults successfully', 'success');
        } catch (error) {
            console.error('Reset settings failed:', error);
            showToast(error.message || 'Failed to reset settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-full items-center justify-center bg-[#f3f0f8] px-4 py-8 sm:px-6 lg:px-8">
                <div className="w-full max-w-2xl rounded-[20px] border border-[#e5dff0] bg-white p-8 shadow-[0_8px_20px_rgba(33,22,58,0.03)]">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 w-3/4 rounded-lg bg-[#eeeaf5]"></div>
                        <div className="h-4 w-1/2 rounded-lg bg-[#eeeaf5]"></div>
                        <div className="space-y-3 mt-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-12 rounded-lg bg-[#f3f0f8]"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg font-semibold text-white z-50 animate-in fade-in slide-in-from-top-2 transition-all ${
                    toast.type === 'success' 
                        ? 'bg-green-500/90' 
                        : toast.type === 'error' 
                        ? 'bg-red-500/90' 
                        : 'bg-blue-500/90'
                }`}>
                    {toast.message}
                </div>
            )}

            <div className="min-h-full space-y-7 bg-[#f3f0f8] px-4 pb-12 pt-6 text-[#181524] animate-in fade-in slide-in-from-bottom-5 duration-500 sm:px-6 sm:pt-8 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7a7098]">Account</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1d1a2a] sm:text-4xl">
                        Settings
                    </h1>
                    <p className="mt-2 text-sm text-[#6e6882]">Manage your privacy, notifications, and student workspace preferences in the same clean dashboard style.</p>
                </div>

                {/* Settings Overview Cards */}
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
                    <div className="rounded-[20px] border border-[#e5dff0] bg-white p-6 shadow-[0_8px_20px_rgba(33,22,58,0.03)]">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a7098]">Profile Mode</p>
                        <p className="text-2xl font-bold text-[#242136]">{settings.profileMode}</p>
                    </div>
                    
                    <div className="rounded-[20px] border border-[#e5dff0] bg-white p-6 shadow-[0_8px_20px_rgba(33,22,58,0.03)]">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a7098]">Theme</p>
                        <p className="text-2xl font-bold text-[#242136]">{settings.theme}</p>
                    </div>
                    <div className="rounded-[20px] border border-[#e5dff0] bg-white p-6 shadow-[0_8px_20px_rgba(33,22,58,0.03)]">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7a7098]">Language</p>
                        <p className="text-2xl font-bold text-[#242136]">{settings.contentLanguage}</p>
                    </div>
                </div>

                {/* Privacy & Account Section */}
                <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="space-y-6 rounded-[20px] border border-[#e5dff0] bg-white p-6 shadow-[0_8px_20px_rgba(33,22,58,0.03)] sm:p-8">
                        <div>
                            <h2 className="mb-2 text-xl font-bold text-[#1d1a2a] sm:text-2xl">Privacy & Account</h2>
                            <p className="text-sm text-[#6e6882]">Control visibility, language, and data-sharing preferences.</p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#6e6882]">Profile Visibility</label>
                                <select
                                    value={settings.profileMode}
                                    onChange={handleProfileModeChange}
                                    disabled={isSaving}
                                    className="w-full rounded-xl border border-[#ded8eb] bg-white px-4 py-3 text-[#242136] focus:border-[#5c46c7] focus:outline-none focus:ring-2 focus:ring-[#5c46c7]/15 disabled:opacity-50"
                                >
                                    <option>Public</option>
                                    <option>Private</option>
                                    <option>Connections Only</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#6e6882]">Notification Frequency</label>
                                <select
                                    value={settings.notificationFrequency}
                                    onChange={handleNotificationFrequencyChange}
                                    disabled={isSaving}
                                    className="w-full rounded-xl border border-[#ded8eb] bg-white px-4 py-3 text-[#242136] focus:border-[#5c46c7] focus:outline-none focus:ring-2 focus:ring-[#5c46c7]/15 disabled:opacity-50"
                                >
                                    <option>Instant</option>
                                    <option>Daily</option>
                                    <option>Weekly</option>
                                    <option>Never</option>
                                </select>
                            </div>

                            {[
                                { key: 'dataSharing', title: 'Data Sharing', description: 'Allow product insights to improve recommendations.' },
                                { key: 'allowTeamInvitations', title: 'Allow Team Invitations', description: 'Let other students invite you to their teams.' }
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => toggleSetting(item.key)}
                                    disabled={isSaving}
                                    className={`w-full flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all disabled:opacity-50 ${settings[item.key] ? 'border-[#cfc5f3] bg-[#f4f0ff]' : 'border-[#e5dff0] bg-[#fbfaff] hover:bg-[#f8f6fc]'}`}
                                >
                                    <div className="text-left">
                                        <h3 className="font-bold text-[#242136]">{item.title}</h3>
                                        <p className="text-xs text-[#6e6882]">{item.description}</p>
                                    </div>
                                    <div className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${settings[item.key] ? 'bg-[#5c46c7]' : 'bg-[#cbc6d6]'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings[item.key] ? 'left-7' : 'left-1'}`} />
                                    </div>
                                </button>
                            ))}

                            <button
                                onClick={() => toggleSetting('twoFactorEnabled')}
                                disabled={isSaving}
                                className={`w-full flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all disabled:opacity-50 ${settings.twoFactorEnabled ? 'border-[#cfc5f3] bg-[#f4f0ff]' : 'border-[#e5dff0] bg-[#fbfaff] hover:bg-[#f8f6fc]'}`}
                            >
                                <div className="text-left">
                                    <h3 className="font-bold text-[#242136]">Two-Factor Authentication</h3>
                                    <p className="text-xs text-[#6e6882]">Add another layer of security to your student account.</p>
                                </div>
                                <div className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${settings.twoFactorEnabled ? 'bg-[#5c46c7]' : 'bg-[#cbc6d6]'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.twoFactorEnabled ? 'left-7' : 'left-1'}`} />
                                </div>
                            </button>
                        </div>

                        {/* Security Section */}
                        <div className="space-y-4 border-t border-[#eeeaf5] pt-6">
                            <div>
                                <h3 className="text-lg font-semibold text-[#1d1a2a]">Security</h3>
                                <p className="text-sm text-[#6e6882]">Keep your account protected with a strong password.</p>
                            </div>
                            <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-2xl border border-[#e5dff0] bg-[#f8f6fc] p-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[#6e6882]">Current Password</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordForm.currentPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter current password"
                                        disabled={isChangingPassword}
                                        className="w-full rounded-xl border border-[#ded8eb] bg-white px-4 py-3 text-[#242136] placeholder:text-[#9a93aa] focus:border-[#5c46c7] focus:outline-none focus:ring-2 focus:ring-[#5c46c7]/15 disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[#6e6882]">New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter new password (min 8 characters)"
                                        disabled={isChangingPassword}
                                        className="w-full rounded-xl border border-[#ded8eb] bg-white px-4 py-3 text-[#242136] placeholder:text-[#9a93aa] focus:border-[#5c46c7] focus:outline-none focus:ring-2 focus:ring-[#5c46c7]/15 disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[#6e6882]">Confirm Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm new password"
                                        disabled={isChangingPassword}
                                        className="w-full rounded-xl border border-[#ded8eb] bg-white px-4 py-3 text-[#242136] placeholder:text-[#9a93aa] focus:border-[#5c46c7] focus:outline-none focus:ring-2 focus:ring-[#5c46c7]/15 disabled:opacity-50"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="rounded-xl bg-[#5c46c7] px-6 py-3 font-bold text-white transition-colors hover:bg-[#4d3bb1] disabled:cursor-not-allowed disabled:bg-[#5c46c7]/50"
                                >
                                    {isChangingPassword ? 'Updating...' : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Notifications Section */}
                    <div className="space-y-6 rounded-[20px] border border-[#e5dff0] bg-white p-6 shadow-[0_8px_20px_rgba(33,22,58,0.03)] sm:p-8">
                        <div>
                            <h2 className="mb-2 text-xl font-bold text-[#1d1a2a] sm:text-2xl">Notifications</h2>
                            <p className="text-sm text-[#6e6882]">Choose how the platform keeps you updated.</p>
                        </div>

                        <div className="space-y-5">
                            {[
                                {
                                    key: 'emailNotifications',
                                    title: 'Email Notifications',
                                    description: 'Receive hackathon updates and team requests by email.'
                                },
                                {
                                    key: 'pushNotifications',
                                    title: 'Browser Push Notifications',
                                    description: 'Get real-time alerts for submissions, invites, and reminders.'
                                },
                                {
                                    key: 'accessibilityMode',
                                    title: 'Accessibility Mode',
                                    description: 'Enable easier-to-read preferences and reduced visual complexity.'
                                }
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => toggleSetting(item.key)}
                                    disabled={isSaving}
                                    className={`w-full flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all disabled:opacity-50 ${settings[item.key] ? 'border-[#cfc5f3] bg-[#f4f0ff]' : 'border-[#e5dff0] bg-[#fbfaff] hover:bg-[#f8f6fc]'}`}
                                >
                                    <div className="text-left">
                                        <h3 className="font-bold text-[#242136]">{item.title}</h3>
                                        <p className="text-xs text-[#6e6882]">{item.description}</p>
                                    </div>
                                    <div className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${settings[item.key] ? 'bg-[#5c46c7]' : 'bg-[#cbc6d6]'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings[item.key] ? 'left-7' : 'left-1'}`} />
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-[#eeeaf5] pt-6">
                            <button
                                onClick={handleResetSettings}
                                disabled={isSaving}
                                className="w-full rounded-xl border border-[#d8d0f1] bg-[#f4f0ff] px-6 py-3 font-bold text-[#5c46c7] transition-colors hover:bg-[#5c46c7] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? 'Resetting...' : 'Reset Settings to Defaults'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="mx-auto w-full max-w-6xl space-y-4 rounded-[20px] border border-rose-200 bg-white p-6 shadow-[0_8px_20px_rgba(33,22,58,0.03)] sm:p-8">
                    <h2 className="text-xl font-bold text-rose-700 sm:text-2xl">Danger Zone</h2>
                    <p className="text-sm text-[#6e6882]">Deactivate your account if you no longer want access to your student profile, teams, and certificates. Your data will be retained for 30 days before permanent deletion.</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-start">
                        <button
                            onClick={handleDeactivate}
                            disabled={isDeactivating}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-3 font-bold text-rose-700 transition-colors hover:bg-rose-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StudentSettings;
