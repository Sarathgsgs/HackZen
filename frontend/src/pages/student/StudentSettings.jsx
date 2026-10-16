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
            <div className="flex items-center justify-center h-[60vh]">
                <div className="bg-navy-800 rounded-2xl border border-white/10 p-8 w-full max-w-2xl">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-white/10 rounded-lg w-3/4"></div>
                        <div className="h-4 bg-white/10 rounded-lg w-1/2"></div>
                        <div className="space-y-3 mt-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-12 bg-white/10 rounded-lg"></div>
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

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 max-w-6xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Account <span className="gradient-text">Settings</span>
                    </h1>
                    <p className="text-gray-400">Manage your privacy, notifications, and student workspace preferences in the same clean dashboard style.</p>
                </div>

                {/* Settings Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-navy-800 rounded-2xl border border-white/10 p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Profile Mode</p>
                        <p className="text-2xl font-bold text-white">{settings.profileMode}</p>
                    </div>
                    
                    <div className="bg-navy-800 rounded-2xl border border-white/10 p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Theme</p>
                        <p className="text-2xl font-bold text-white">{settings.theme}</p>
                    </div>
                    <div className="bg-navy-800 rounded-2xl border border-white/10 p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Language</p>
                        <p className="text-2xl font-bold text-white">{settings.contentLanguage}</p>
                    </div>
                </div>

                {/* Privacy & Account Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-navy-800 rounded-2xl border border-white/10 p-8 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Privacy & Account</h2>
                            <p className="text-sm text-gray-400">Control visibility, language, and data-sharing preferences.</p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Profile Visibility</label>
                                <select
                                    value={settings.profileMode}
                                    onChange={handleProfileModeChange}
                                    disabled={isSaving}
                                    className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                                >
                                    <option>Public</option>
                                    <option>Private</option>
                                    <option>Connections Only</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notification Frequency</label>
                                <select
                                    value={settings.notificationFrequency}
                                    onChange={handleNotificationFrequencyChange}
                                    disabled={isSaving}
                                    className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
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
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all disabled:opacity-50 ${settings[item.key] ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}
                                >
                                    <div className="text-left">
                                        <h3 className="font-bold text-white">{item.title}</h3>
                                        <p className="text-xs text-gray-400">{item.description}</p>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full relative transition-colors ${settings[item.key] ? 'bg-purple-600' : 'bg-gray-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings[item.key] ? 'left-7' : 'left-1'}`} />
                                    </div>
                                </button>
                            ))}

                            <button
                                onClick={() => toggleSetting('twoFactorEnabled')}
                                disabled={isSaving}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all disabled:opacity-50 ${settings.twoFactorEnabled ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}
                            >
                                <div className="text-left">
                                    <h3 className="font-bold text-white">Two-Factor Authentication</h3>
                                    <p className="text-xs text-gray-400">Add another layer of security to your student account.</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors ${settings.twoFactorEnabled ? 'bg-purple-600' : 'bg-gray-700'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.twoFactorEnabled ? 'left-7' : 'left-1'}`} />
                                </div>
                            </button>
                        </div>

                        {/* Security Section */}
                        <div className="border-t border-white/5 pt-6 space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Security</h3>
                                <p className="text-sm text-gray-400">Keep your account protected with a strong password.</p>
                            </div>
                            <form onSubmit={handlePasswordSubmit} className="bg-navy-900 rounded-2xl border border-white/10 p-5 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Password</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordForm.currentPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter current password"
                                        disabled={isChangingPassword}
                                        className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter new password (min 8 characters)"
                                        disabled={isChangingPassword}
                                        className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm new password"
                                        disabled={isChangingPassword}
                                        className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 rounded-xl text-white font-bold transition-all disabled:cursor-not-allowed"
                                >
                                    {isChangingPassword ? 'Updating...' : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Notifications Section */}
                    <div className="bg-navy-800 rounded-2xl border border-white/10 p-8 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
                            <p className="text-sm text-gray-400">Choose how the platform keeps you updated.</p>
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
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all disabled:opacity-50 ${settings[item.key] ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}
                                >
                                    <div className="text-left">
                                        <h3 className="font-bold text-white">{item.title}</h3>
                                        <p className="text-xs text-gray-400">{item.description}</p>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full relative transition-colors ${settings[item.key] ? 'bg-purple-600' : 'bg-gray-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings[item.key] ? 'left-7' : 'left-1'}`} />
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-white/5 pt-6">
                            <button
                                onClick={handleResetSettings}
                                disabled={isSaving}
                                className="w-full px-6 py-3 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Resetting...' : 'Reset Settings to Defaults'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-950/40 rounded-2xl border border-red-500/20 p-8 space-y-4">
                    <h2 className="text-2xl font-bold text-red-400">Danger Zone</h2>
                    <p className="text-sm text-gray-300">Deactivate your account if you no longer want access to your student profile, teams, and certificates. Your data will be retained for 30 days before permanent deletion.</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-start">
                        <button
                            onClick={handleDeactivate}
                            disabled={isDeactivating}
                            className="px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
