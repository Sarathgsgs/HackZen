import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    fetchPlatformSettings, 
    updatePlatformSettings, 
    fetchAdminsList, 
    createAdmin,
    updateAdminPermissions,
    revokeAdminAccess,
    fetchActiveSessions,
    revokeSession,
    revokeAllOtherSessions,
    fetchAuditLogs,
    uploadPlatformLogo,
    sendTestNotification,
    broadcastPlatformAnnouncement,
    fetchNotificationHistory,
    testSmtpConnection
} from '../../services/admin/adminSettingsApi';

import { 
    CheckIcon, 
    TriangleAlertIcon, 
    ShieldIcon, 
    UsersIcon, 
    RocketIcon, 
    StarIcon, 
    SearchIcon, 
    ZapIcon, 
    EditIcon, 
    ClockIcon, 
    XIcon,
    LockIcon,
    BoxIcon,
    CertificateIcon,
    ToolsIcon
} from '../../components/AdminIcons';

import { usePlatformSettings } from '../../context/PlatformSettingsContext';

// --- Animated Subtle Toggle Component ---
const Toggle = ({ enabled, onChange, disabled = false }) => (
    <button 
        type="button"
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            enabled 
                ? 'bg-indigo-600 dark:bg-indigo-500' 
                : 'bg-slate-300 dark:bg-white/20'
        }`}
    >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
    </button>
);

// --- Reusable Modal Component ---
const ActionModal = ({ isOpen, onClose, title, subtitle, children, maxWidth = "max-w-lg" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            <div className={`bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full ${maxWidth} shadow-2xl relative text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors p-1 rounded-lg"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>

                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">{title}</h2>
                {subtitle && <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 mb-4">{subtitle}</p>}
                {children}
            </div>
        </div>
    );
};

const Settings = () => {
    const { broadcastSettingsUpdate } = usePlatformSettings();

// Navigation Tabs
    const tabs = [
        { id: 'General', label: 'General', icon: ToolsIcon },
        { id: 'Security', label: 'Security & Access', icon: ShieldIcon },
        { id: 'Admins', label: 'Admins & RBAC', icon: UsersIcon },
        { id: 'Notifications', label: 'Notifications', icon: ZapIcon },
        { id: 'Hackathons', label: 'Hackathons', icon: RocketIcon },
        { id: 'Submissions', label: 'Submissions', icon: BoxIcon },
        { id: 'Certificates', label: 'Certificates', icon: CertificateIcon },
        { id: 'Audit Logs', label: 'Audit Logs', icon: ClockIcon }
    ];
    const [activeTab, setActiveTab] = useState('General');

    // Toast Alert State
    const [toastMessage, setToastMessage] = useState(null);
    const showToast = (text, type = 'info') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Admin Navigation Layout Preference: 'navbar' (Figma Spec) vs 'sidebar' (Classic)
    const [navLayout, setNavLayout] = useState(() => {
        return localStorage.getItem('admin_nav_layout') || 'navbar';
    });

    useEffect(() => {
        const handleLayoutChange = () => {
            setNavLayout(localStorage.getItem('admin_nav_layout') || 'navbar');
        };
        window.addEventListener('admin-nav-layout-change', handleLayoutChange);
        window.addEventListener('storage', handleLayoutChange);
        return () => {
            window.removeEventListener('admin-nav-layout-change', handleLayoutChange);
            window.removeEventListener('storage', handleLayoutChange);
        };
    }, []);

    const handleNavLayoutChange = (mode) => {
        localStorage.setItem('admin_nav_layout', mode);
        setNavLayout(mode);
        window.dispatchEvent(new Event('admin-nav-layout-change'));
        showToast(
            mode === 'navbar' 
                ? "Switched to Top Navbar navigation." 
                : "Switched to Sidebar navigation.",
            "success"
        );
    };

    // Global Configuration State
    const [config, setConfig] = useState({
        general: {
            platformName: 'ProEduvate',
            website: 'https://proeduvate.com',
            supportEmail: 'support@proeduvate.com',
            supportPhone: '+91 800 123 4567',
            timezone: 'Asia/Kolkata (IST)',
            country: 'India',
            dateFormat: 'MMM DD, YYYY',
            maintenanceMode: false,
            publicRegistrations: true,
            primaryColor: '#3B82F6',
            secondaryColor: '#0F172A',
            logoUrl: ''
        },
        security: {
            t2fa: false,
            sessionTimeout: '30 Minutes',
            maxLoginAttempts: '5 Attempts',
            lockoutDuration: '15 Minutes'
        },
        notifications: {
            orgApprovalNotif: true,
            newDisputeNotif: true,
            certVerifNotif: false,
            sysErrorNotif: true,
            secAlertNotif: true,
            smtpHost: 'smtp.gmail.com',
            smtpPort: 587,
            smtpUser: 'notifications@hackzen.org',
            smtpPassword: '••••••••••••',
            smtpFrom: 'HackZen Platform <notifications@hackzen.org>',
            smtpUseTls: true
        },
        hackathons: {
            maxTeamSize: 4,
            minTeamSize: 1,
            allowTeamChanges: true,
            allowLateSubmissions: false,
            publicLeaderboard: true,
            plagiarismDetect: true
        },
        submissions: {
            maxUploadFileSize: '100 MB',
            allowedFileTypes: ['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4', 'TAR.GZ'],
            gitHubRepo: true,
            demoUrl: true
        },
        certificates: {
            prefix: 'PROEDU',
            formatTemplate: '[PREFIX]-[YEAR]-[NUMBER]',
            autoGenWinner: true,
            autoGenParticipant: false,
            publicVerification: true
        }
    });

    // Administrators State (RBAC)
    const [admins, setAdmins] = useState([]);
    const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
    const [newAdminForm, setNewAdminForm] = useState({
        name: '',
        email: '',
        role: 'Admin',
        permissions: {
            users: true, hackathons: true, submissions: true,
            certificates: true, disputes: true, analytics: true, settings: false
        }
    });

    // Edit Admin Permissions State
    const [editingAdmin, setEditingAdmin] = useState(null);

    // Active Sessions State
    const [sessions, setSessions] = useState([]);

    // Audit Logs State
    const [auditLogs, setAuditLogs] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logFilters, setLogFilters] = useState({ admin: 'All Admins', category: 'All Categories', dateRange: 'All Time' });

    // UI Loading & Saving States
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Notification History & Broadcast State
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [isTestingAlert, setIsTestingAlert] = useState(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastForm, setBroadcastForm] = useState({
        title: '',
        message: '',
        audience: 'all',
        priority: 'high'
    });

    // SMTP Gateway Test State
    const [smtpTesting, setSmtpTesting] = useState(false);
    const [smtpTestRecipient, setSmtpTestRecipient] = useState('');
    const [smtpTestResult, setSmtpTestResult] = useState(null);


    // Initial Data Fetch
    const loadAllData = async () => {
        setIsLoadingSettings(true);
        try {
            const [settingsData, adminsData, sessionsData, logsData, notifsData] = await Promise.all([
                fetchPlatformSettings().catch(() => null),
                fetchAdminsList().catch(() => []),
                fetchActiveSessions().catch(() => []),
                fetchAuditLogs().catch(() => []),
                fetchNotificationHistory().catch(() => [])
            ]);

            if (settingsData) {
                setConfig(prev => ({
                    general: { ...prev.general, ...(settingsData.general || {}) },
                    security: { ...prev.security, ...(settingsData.security || {}) },
                    notifications: { ...prev.notifications, ...(settingsData.notifications || {}) },
                    hackathons: { ...prev.hackathons, ...(settingsData.hackathons || {}) },
                    submissions: { ...prev.submissions, ...(settingsData.submissions || {}) },
                    certificates: { ...prev.certificates, ...(settingsData.certificates || {}) }
                }));
            }

            if (Array.isArray(adminsData) && adminsData.length > 0) {
                setAdmins(adminsData);
            }
            if (Array.isArray(sessionsData) && sessionsData.length > 0) {
                setSessions(sessionsData);
            }
            if (Array.isArray(logsData) && logsData.length > 0) {
                setAuditLogs(logsData);
            }
            if (Array.isArray(notifsData) && notifsData.length > 0) {
                setNotificationHistory(notifsData);
            }
        } catch (error) {
            console.error("Settings initialization error:", error);
            showToast("Loaded platform configuration workspace.", "info");
        } finally {
            setIsLoadingSettings(false);
        }
    };


    useEffect(() => {
        loadAllData();
    }, []);

    // Filtered Audit Logs
    const handleFilterLogs = async (newFilters) => {
        setLogFilters(newFilters);
        setIsLoadingLogs(true);
        try {
            const logs = await fetchAuditLogs(newFilters);
            setAuditLogs(logs);
        } catch (e) {
            console.error("Failed to filter audit logs:", e);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    // Generic Toggle Handler
    const handleToggle = (domain, key) => {
        setConfig(prev => ({
            ...prev,
            [domain]: {
                ...prev[domain],
                [key]: !prev[domain][key]
            }
        }));
    };

    // Generic Input Change Handler
    const handleInputChange = (domain, key, value) => {
        setConfig(prev => ({
            ...prev,
            [domain]: {
                ...prev[domain],
                [key]: value
            }
        }));
    };

    // Save All Platform Changes
    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            await updatePlatformSettings(config);
            
            // Trigger real-time cross-component and cross-tab update
            if (typeof broadcastSettingsUpdate === 'function') {
                broadcastSettingsUpdate(config);
            } else {
                window.dispatchEvent(new CustomEvent('platform-settings-updated', { detail: config }));
                localStorage.setItem('platformSettingsTimestamp', Date.now().toString());
            }

            showToast("Platform configurations saved and propagated successfully!", "success");
            const freshLogs = await fetchAuditLogs(logFilters);
            if (Array.isArray(freshLogs) && freshLogs.length > 0) {
                setAuditLogs(freshLogs);
            }
        } catch (err) {
            console.error("Settings save error:", err);
            showToast("Failed to save settings to server. Stored locally.", "warning");
        } finally {
            setIsSaving(false);
        }
    };


    // Trigger Live Test Notification Alert
    const handleTriggerTestAlert = async (alertType) => {
        setIsTestingAlert(alertType);
        try {
            const res = await sendTestNotification(alertType);
            showToast(res.message || "Test alert generated and dispatched successfully!", "success");
            const updatedNotifs = await fetchNotificationHistory();
            if (Array.isArray(updatedNotifs) && updatedNotifs.length > 0) {
                setNotificationHistory(updatedNotifs);
            }
        } catch (err) {
            console.error("Test notification error:", err);
            showToast("Failed to dispatch test notification.", "error");
        } finally {
            setIsTestingAlert(null);
        }
    };

    // Broadcast Announcement Handler
    const handleBroadcastSubmit = async (e) => {
        e.preventDefault();
        if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
            showToast("Please enter an announcement title and message.", "warning");
            return;
        }

        setIsBroadcasting(true);
        try {
            const res = await broadcastPlatformAnnouncement(broadcastForm);
            showToast(res.message || "Announcement broadcasted successfully to all target users!", "success");
            setBroadcastForm({ title: '', message: '', audience: 'all', priority: 'high' });
            const updatedNotifs = await fetchNotificationHistory();
            if (Array.isArray(updatedNotifs) && updatedNotifs.length > 0) {
                setNotificationHistory(updatedNotifs);
            }
        } catch (err) {
            console.error("Broadcast error:", err);
            showToast("Failed to broadcast announcement.", "error");
        } finally {
            setIsBroadcasting(false);
        }
    };

    // Test Outbound SMTP Connection
    const handleTestSmtp = async () => {
        setSmtpTesting(true);
        setSmtpTestResult(null);
        try {
            const payload = {
                smtpHost: config.notifications.smtpHost,
                smtpPort: Number(config.notifications.smtpPort) || 587,
                smtpUser: config.notifications.smtpUser,
                smtpPassword: config.notifications.smtpPassword,
                smtpFrom: config.notifications.smtpFrom,
                smtpUseTls: config.notifications.smtpUseTls !== false,
                testRecipient: smtpTestRecipient.trim() || undefined
            };
            const result = await testSmtpConnection(payload);
            setSmtpTestResult(result);
            if (result.success) {
                showToast(result.message || "SMTP Connection Test Succeeded!", "success");
            } else {
                showToast(result.message || "SMTP Connection Test Encountered Issue", "warning");
            }
        } catch (err) {
            console.error("SMTP test error:", err);
            setSmtpTestResult({
                success: false,
                message: err.response?.data?.detail || err.message || "SMTP Connection Failed",
                details: "Check your SMTP host, port, credentials, and network connectivity."
            });
            showToast("SMTP Test Failed", "error");
        } finally {
            setSmtpTesting(false);
        }
    };

    // Add / Invite Administrator
    const handleAddAdminSubmit = async (e) => {

        e.preventDefault();
        if (!newAdminForm.email) {
            showToast("Please enter a valid administrator email.", "error");
            return;
        }

        try {
            const res = await createAdmin(newAdminForm);
            showToast(res.message || `Admin privileges granted to ${newAdminForm.email}!`, "success");
            setIsAddAdminOpen(false);
            setNewAdminForm({
                name: '',
                email: '',
                role: 'Admin',
                permissions: {
                    users: true, hackathons: true, submissions: true,
                    certificates: true, disputes: true, analytics: true, settings: false
                }
            });
            const updatedAdmins = await fetchAdminsList();
            if (Array.isArray(updatedAdmins) && updatedAdmins.length > 0) {
                setAdmins(updatedAdmins);
            } else {
                setAdmins(prev => [...prev, {
                    id: String(Date.now()),
                    name: newAdminForm.name || newAdminForm.email.split('@')[0],
                    email: newAdminForm.email,
                    role: newAdminForm.role,
                    status: 'Active',
                    permissions: newAdminForm.permissions
                }]);
            }
        } catch (err) {
            showToast(err.response?.data?.detail || "Failed to add administrator.", "error");
        }
    };

    // Update Permissions of Existing Admin
    const handleUpdatePermissionsSubmit = async (e) => {
        e.preventDefault();
        if (!editingAdmin) return;

        try {
            await updateAdminPermissions(editingAdmin.id, {
                role: editingAdmin.role,
                permissions: editingAdmin.permissions
            });
            showToast(`Permissions updated for ${editingAdmin.name}!`, "success");
            setEditingAdmin(null);
            const updatedAdmins = await fetchAdminsList();
            if (Array.isArray(updatedAdmins) && updatedAdmins.length > 0) {
                setAdmins(updatedAdmins);
            }
        } catch (err) {
            showToast("Failed to update administrator permissions.", "error");
        }
    };

    // Revoke Administrator Access
    const handleRevokeAdmin = async (id, name, role) => {
        if (role === 'Super Admin') {
            showToast("Cannot revoke access for Super Admin account.", "warning");
            return;
        }
        if (!window.confirm(`Are you sure you want to revoke administrator access for ${name}?`)) return;

        try {
            await revokeAdminAccess(id);
            setAdmins(prev => prev.filter(a => a.id !== id));
            showToast(`Administrator privileges revoked for ${name}.`, "info");
        } catch (err) {
            showToast("Failed to revoke administrator privileges.", "error");
        }
    };

    // Revoke Specific Session
    const handleRevokeSession = async (sessionId) => {
        try {
            await revokeSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            showToast("Remote session signed out successfully.", "info");
            const freshLogs = await fetchAuditLogs(logFilters).catch(() => []);
            if (freshLogs.length) setAuditLogs(freshLogs);
        } catch (err) {
            showToast("Failed to revoke session.", "error");
        }
    };

    // Revoke All Other Sessions
    const handleRevokeAllOtherSessions = async () => {
        if (!window.confirm("Are you sure you want to sign out of all other active sessions across all devices?")) return;
        try {
            await revokeAllOtherSessions();
            setSessions(prev => prev.filter(s => s.isCurrent));
            showToast("All other active sessions have been terminated.", "success");
            const freshLogs = await fetchAuditLogs(logFilters).catch(() => []);
            if (freshLogs.length) setAuditLogs(freshLogs);
        } catch (err) {
            showToast("Failed to sign out other sessions.", "error");
        }
    };

    // Toggle File Type in Submissions tab
    const handleFileTypeToggle = (type) => {
        const currentTypes = config.submissions.allowedFileTypes || [];
        const updated = currentTypes.includes(type)
            ? currentTypes.filter(t => t !== type)
            : [...currentTypes, type];
        handleInputChange('submissions', 'allowedFileTypes', updated);
    };

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 max-w-7xl mx-auto">

            {/* Toast Alert */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
                    <div className={`px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 font-bold text-xs border backdrop-blur-md transition-all ${
                        toastMessage.type === 'warning'
                            ? 'bg-amber-50/95 dark:bg-amber-950/80 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-amber-500/10'
                            : toastMessage.type === 'error'
                            ? 'bg-rose-50/95 dark:bg-rose-950/80 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 shadow-rose-500/10'
                            : 'bg-white/95 dark:bg-slate-900/90 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 shadow-slate-900/10'
                    }`}>
                        {toastMessage.type === 'warning' ? (
                            <TriangleAlertIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : toastMessage.type === 'error' ? (
                            <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                            <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span>{toastMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Platform Settings & Control Center
                    </h1>
                    <p className="text-slate-600 dark:text-gray-400 mt-0.5 text-xs sm:text-sm font-medium">
                        Super Admin Workspace. Configure platform policies, RBAC access, security parameters, and audit trails.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="w-full sm:w-auto justify-center px-5 py-2.5 bg-[#7C65F6] hover:bg-[#6851ec] !text-white shadow-sm shadow-[#7C65F6]/20 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#7C65F6]/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                        <CheckIcon className="w-3.5 h-3.5 text-white" />
                        <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
                    </button>
                </div>
            </div>

            {/* Responsive Flex Layout */}
            <div className="flex flex-col lg:flex-row gap-5 items-start">
                
                {/* LEFT SIDEBAR: Domain Navigation */}
                <div className="w-full lg:w-1/4 flex flex-col rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden p-0 h-fit lg:sticky lg:top-4">
                    <div className="p-3 border-b border-slate-200 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">Settings Domains</span>
                    </div>
                    <nav className="p-1.5 flex flex-row lg:flex-col overflow-x-auto scrollbar-hide gap-1 lg:gap-0 lg:space-y-0.5">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-auto lg:w-full shrink-0 whitespace-nowrap flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                        isActive 
                                            ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300/80 dark:border-indigo-500/40 font-extrabold shadow-sm' 
                                            : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-gray-500'}`} />
                                        <span>{tab.label}</span>
                                    </div>
                                    {tab.id === 'Admins' && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-indigo-200/70 dark:bg-indigo-400/20 text-indigo-800 dark:text-indigo-200' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'}`}>
                                            {admins.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* RIGHT MAIN CONTENT AREA */}
                <div className="w-full lg:w-3/4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-5 flex flex-col pb-8">
                    
                    {/* ========================================================= */}
                    {/* 1. GENERAL TAB */}
                    {/* ========================================================= */}
                    {activeTab === 'General' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-wider mb-3 border-b pb-2 text-slate-900 dark:text-white font-extrabold border-slate-200 dark:border-white/10`}>
                                    Platform Identification & Support
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Platform Name</label>
                                        <input 
                                            type="text" 
                                            value={config.general.platformName}
                                            onChange={(e) => handleInputChange('general', 'platformName', e.target.value)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Official Website URL</label>
                                        <input 
                                            type="text" 
                                            value={config.general.website}
                                            onChange={(e) => handleInputChange('general', 'website', e.target.value)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Support Email</label>
                                        <input 
                                            type="email" 
                                            value={config.general.supportEmail}
                                            onChange={(e) => handleInputChange('general', 'supportEmail', e.target.value)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Support Phone Hotline</label>
                                        <input 
                                            type="text" 
                                            value={config.general.supportPhone}
                                            onChange={(e) => handleInputChange('general', 'supportPhone', e.target.value)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-wider mb-3 border-b pb-2 text-slate-900 dark:text-white font-extrabold border-slate-200 dark:border-white/10`}>
                                    Localization & System Region
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Default Timezone</label>
                                        <select 
                                            value={config.general.timezone}
                                            onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                        >
                                            <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York (EST)">America/New_York (EST)</option>
                                            <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Country / Headquarters</label>
                                        <select 
                                            value={config.general.country}
                                            onChange={(e) => handleInputChange('general', 'country', e.target.value)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                        >
                                            <option value="India">India</option>
                                            <option value="United States">United States</option>
                                            <option value="Singapore">Singapore</option>
                                            <option value="Global">Global</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Date Format</label>
                                        <select 
                                            value={config.general.dateFormat}
                                            onChange={(e) => handleInputChange('general', 'dateFormat', e.target.value)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                        >
                                            <option value="MMM DD, YYYY">MMM DD, YYYY</option>
                                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-wider mb-3 border-b pb-2 text-slate-900 dark:text-white font-extrabold border-slate-200 dark:border-white/10`}>
                                    Operations & Public Access
                                </h3>
                                <div className="space-y-3">
                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Allow Public Student & Organizer Registrations</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">When disabled, new signups are blocked and only invited accounts can log in.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.general.publicRegistrations} 
                                            onChange={() => handleToggle('general', 'publicRegistrations')} 
                                        />
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Maintenance Mode</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Temporarily restrict platform access for non-administrators with a maintenance banner.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.general.maintenanceMode} 
                                            onChange={() => handleToggle('general', 'maintenanceMode')} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Workspace Navigation Layout */}
                            <div className="pt-2">
                                <div className="border-b pb-2.5 mb-4 border-slate-200 dark:border-white/10">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                        Admin Navigation Layout
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                                        Select your preferred navigation style for the administration portal.
                                    </p>
                                </div>

                                {/* Visual Choice Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Card 1: Top Navbar Navigation */}
                                    <div 
                                        onClick={() => handleNavLayoutChange('navbar')}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                                            navLayout === 'navbar'
                                                ? 'border-[#7C65F6] bg-purple-50/40 dark:bg-purple-950/20 ring-2 ring-[#7C65F6]/30 shadow-md'
                                                : 'border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <div>
                                            {/* Visual Wireframe Preview */}
                                            <div className="w-full h-20 rounded-xl bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-white/10 p-2 flex flex-col gap-1.5 mb-3 overflow-hidden pointer-events-none select-none">
                                                {/* Top navbar schematic */}
                                                <div className="w-full h-5 rounded-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 px-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-[#7C65F6]"></div>
                                                        <div className="w-8 h-1.5 rounded-sm bg-slate-300 dark:bg-white/30"></div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-7 h-1.5 rounded-sm bg-[#7C65F6]"></div>
                                                        <div className="w-7 h-1.5 rounded-sm bg-slate-200 dark:bg-white/20"></div>
                                                        <div className="w-7 h-1.5 rounded-sm bg-slate-200 dark:bg-white/20"></div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/30"></div>
                                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/30"></div>
                                                    </div>
                                                </div>
                                                {/* Full-width content body */}
                                                <div className="w-full flex-1 rounded-md bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 p-1.5 flex gap-1.5">
                                                    <div className="flex-1 rounded bg-white dark:bg-navy-900 border border-slate-200/60 dark:border-white/5"></div>
                                                    <div className="flex-1 rounded bg-white dark:bg-navy-900 border border-slate-200/60 dark:border-white/5"></div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                                    Top Navbar Navigation
                                                </span>
                                                {navLayout === 'navbar' && (
                                                    <span className="w-2 h-2 rounded-full bg-[#7C65F6] ring-4 ring-purple-400/30"></span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-gray-300 leading-relaxed">
                                                Places navigation links horizontally inside the top header. Expands the main page workspace.
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">
                                                {navLayout === 'navbar' ? '✓ Currently Active' : 'Click to select'}
                                            </span>
                                            <span className={`text-[11px] font-bold px-3 py-1 rounded-lg ${
                                                navLayout === 'navbar' 
                                                    ? 'bg-[#7C65F6] text-white shadow-xs' 
                                                    : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                                            }`}>
                                                {navLayout === 'navbar' ? 'Active' : 'Select'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card 2: Sidebar Navigation */}
                                    <div 
                                        onClick={() => handleNavLayoutChange('sidebar')}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                                            navLayout === 'sidebar'
                                                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-500/30 shadow-md'
                                                : 'border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <div>
                                            {/* Visual Wireframe Preview */}
                                            <div className="w-full h-20 rounded-xl bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-white/10 p-2 flex gap-1.5 mb-3 overflow-hidden pointer-events-none select-none">
                                                {/* Left sidebar schematic */}
                                                <div className="w-12 h-full rounded-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 p-1 flex flex-col gap-1 items-center shrink-0">
                                                    <div className="w-3 h-3 rounded-full bg-indigo-600 mb-0.5"></div>
                                                    <div className="w-8 h-1 rounded-xs bg-indigo-600"></div>
                                                    <div className="w-8 h-1 rounded-xs bg-slate-200 dark:bg-white/20"></div>
                                                    <div className="w-8 h-1 rounded-xs bg-slate-200 dark:bg-white/20"></div>
                                                    <div className="w-8 h-1 rounded-xs bg-slate-200 dark:bg-white/20"></div>
                                                </div>
                                                {/* Content area with header */}
                                                <div className="flex-1 h-full flex flex-col gap-1.5">
                                                    <div className="w-full h-4 rounded-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 px-1.5 flex items-center justify-between">
                                                        <div className="w-10 h-1.5 rounded-sm bg-slate-200 dark:bg-white/20"></div>
                                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/30"></div>
                                                    </div>
                                                    <div className="flex-1 rounded-md bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 p-1 flex gap-1">
                                                        <div className="flex-1 rounded bg-white dark:bg-navy-900 border border-slate-200/60 dark:border-white/5"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                                    Sidebar Navigation
                                                </span>
                                                {navLayout === 'sidebar' && (
                                                    <span className="w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-400/30"></span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-gray-300 leading-relaxed">
                                                Traditional collapsible vertical sidebar navigation with category groupings and quick access.
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">
                                                {navLayout === 'sidebar' ? '✓ Currently Active' : 'Click to select'}
                                            </span>
                                            <span className={`text-[11px] font-bold px-3 py-1 rounded-lg ${
                                                navLayout === 'sidebar' 
                                                    ? 'bg-indigo-600 text-white shadow-xs' 
                                                    : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                                            }`}>
                                                {navLayout === 'sidebar' ? 'Active' : 'Select'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* 2. SECURITY TAB */}
                    {/* ========================================================= */}
                    {activeTab === 'Security' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-wider mb-3 border-b pb-2 text-slate-900 dark:text-white font-extrabold border-slate-200 dark:border-white/10`}>
                                    Authentication & Lockout Policies
                                </h3>
                                <div className="space-y-3">
                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Require Two-Factor Authentication (2FA) for Admins</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Enforce authenticator app verification upon login for all administrator and moderator accounts.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.security.t2fa} 
                                            onChange={() => handleToggle('security', 't2fa')} 
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Admin Session Timeout</label>
                                            <select 
                                                value={config.security.sessionTimeout}
                                                onChange={(e) => handleInputChange('security', 'sessionTimeout', e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                            >
                                                <option value="15 Minutes">15 Minutes</option>
                                                <option value="30 Minutes">30 Minutes</option>
                                                <option value="1 Hour">1 Hour</option>
                                                <option value="12 Hours">12 Hours</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Max Login Attempts</label>
                                            <select 
                                                value={config.security.maxLoginAttempts}
                                                onChange={(e) => handleInputChange('security', 'maxLoginAttempts', e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                            >
                                                <option value="3 Attempts">3 Attempts</option>
                                                <option value="5 Attempts">5 Attempts</option>
                                                <option value="10 Attempts">10 Attempts</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Lockout Duration</label>
                                            <select 
                                                value={config.security.lockoutDuration}
                                                onChange={(e) => handleInputChange('security', 'lockoutDuration', e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                            >
                                                <option value="15 Minutes">15 Minutes</option>
                                                <option value="30 Minutes">30 Minutes</option>
                                                <option value="1 Hour">1 Hour</option>
                                                <option value="24 Hours">24 Hours</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Active Sessions */}
                            <div>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 border-b border-slate-200 dark:border-white/10 pb-2">
                                    <div>
                                        <h3 className={`text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-extrabold`}>
                                            Active Administrator Sessions
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-gray-400">Authenticated devices currently connected to the administration control deck.</p>
                                    </div>
                                    <button 
                                        onClick={handleRevokeAllOtherSessions}
                                        className="w-full sm:w-auto text-center px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                        Sign Out All Other Sessions
                                    </button>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 scrollbar-hide">
                                    <table className="w-full text-left text-xs min-w-[580px]">
                                        <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">
                                            <tr>
                                                <th className="p-3">Device / Browser</th>
                                                <th className="p-3">Location</th>
                                                <th className="p-3">IP Address</th>
                                                <th className="p-3">Last Active</th>
                                                <th className="p-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {sessions.map(sess => (
                                                <tr key={sess.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                    <td className="p-3 text-slate-800 dark:text-white font-bold flex items-center gap-2">
                                                        {sess.isCurrent && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                                        <span>{sess.device}</span>
                                                    </td>
                                                    <td className="p-3 text-slate-600 dark:text-gray-400">{sess.location}</td>
                                                    <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-gray-400">{sess.ip}</td>
                                                    <td className="p-3 text-slate-600 dark:text-gray-400">{sess.lastActive}</td>
                                                    <td className="p-3 text-right">
                                                        {sess.isCurrent ? (
                                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Current Device</span>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleRevokeSession(sess.id)}
                                                                className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-xs"
                                                            >
                                                                Revoke
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* 3. ADMINS TAB (RBAC) */}
                    {/* ========================================================= */}
                    {activeTab === 'Admins' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
                                <div>
                                    <h3 className={`text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-extrabold`}>
                                        Role-Based Access Control (RBAC)
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                                        Manage administrator credentials, assigned roles, and granular workspace permissions.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setIsAddAdminOpen(true)}
                                    className="w-full sm:w-auto justify-center px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                                >
                                    <span>+ Add Administrator</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 scrollbar-hide">
                                <table className="w-full text-left text-xs min-w-[620px]">
                                    <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">
                                        <tr>
                                            <th className="p-3.5">Administrator</th>
                                            <th className="p-3.5">Role</th>
                                            <th className="p-3.5">Assigned Permissions</th>
                                            <th className="p-3.5">Status</th>
                                            <th className="p-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {admins.map(admin => {
                                            const permsCount = Object.values(admin.permissions || {}).filter(Boolean).length;
                                            return (
                                                <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                    <td className="p-3.5">
                                                        <p className="font-bold text-slate-900 dark:text-white">{admin.name}</p>
                                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">{admin.email}</p>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                                                            admin.role === 'Super Admin' 
                                                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' 
                                                                : admin.role === 'Moderator'
                                                                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                                                                : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                                                        }`}>
                                                            {admin.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className="text-[11px] font-bold text-slate-600 dark:text-gray-300">
                                                            {admin.role === 'Super Admin' ? 'All Permissions (Full Control)' : `${permsCount} Active Permissions`}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            <span>Active</span>
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 text-right">
                                                        <button 
                                                            onClick={() => setEditingAdmin({ ...admin })}
                                                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-bold mr-3"
                                                        >
                                                            Edit
                                                        </button>
                                                        {admin.role !== 'Super Admin' && (
                                                            <button 
                                                                onClick={() => handleRevokeAdmin(admin.id, admin.name, admin.role)}
                                                                className="text-rose-600 dark:text-rose-400 hover:underline text-xs font-bold"
                                                            >
                                                                Revoke
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* 4. NOTIFICATIONS TAB */}
                    {/* ========================================================= */}
                    {activeTab === 'Notifications' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-wider mb-3 border-b pb-2 text-slate-900 dark:text-white font-extrabold border-slate-200 dark:border-white/10`}>
                                    System & Administrative Alerts
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                                    Configure which high-priority platform events trigger real-time administrator notifications, inboxes, and toast alerts.
                                </p>
                                <div className="space-y-3">
                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Organizer Application Requests</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Notify when a new organizer submits organization credentials for verification.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => handleTriggerTestAlert('orgApprovalNotif')}
                                                disabled={isTestingAlert === 'orgApprovalNotif'}
                                                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <span>{isTestingAlert === 'orgApprovalNotif' ? 'Sending...' : 'Send Test Alert'}</span>
                                            </button>
                                            <Toggle 
                                                enabled={config.notifications.orgApprovalNotif} 
                                                onChange={() => handleToggle('notifications', 'orgApprovalNotif')} 
                                            />
                                        </div>
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">New Dispute Escalations</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Notify immediately when a participant or judge files an official dispute or plagiarism claim.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => handleTriggerTestAlert('newDisputeNotif')}
                                                disabled={isTestingAlert === 'newDisputeNotif'}
                                                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <span>{isTestingAlert === 'newDisputeNotif' ? 'Sending...' : 'Send Test Alert'}</span>
                                            </button>
                                            <Toggle 
                                                enabled={config.notifications.newDisputeNotif} 
                                                onChange={() => handleToggle('notifications', 'newDisputeNotif')} 
                                            />
                                        </div>
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Certificate Verification Anomaly Alerts</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Send alerts whenever public QR verification attempts encounter a revoked or forged certificate ID.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => handleTriggerTestAlert('certVerifNotif')}
                                                disabled={isTestingAlert === 'certVerifNotif'}
                                                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <span>{isTestingAlert === 'certVerifNotif' ? 'Sending...' : 'Send Test Alert'}</span>
                                            </button>
                                            <Toggle 
                                                enabled={config.notifications.certVerifNotif} 
                                                onChange={() => handleToggle('notifications', 'certVerifNotif')} 
                                            />
                                        </div>
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">System Exceptions & Background Failures</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Forward backend unhandled exceptions, Celery task failures, and database connection timeouts.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => handleTriggerTestAlert('sysErrorNotif')}
                                                disabled={isTestingAlert === 'sysErrorNotif'}
                                                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <span>{isTestingAlert === 'sysErrorNotif' ? 'Sending...' : 'Send Test Alert'}</span>
                                            </button>
                                            <Toggle 
                                                enabled={config.notifications.sysErrorNotif} 
                                                onChange={() => handleToggle('notifications', 'sysErrorNotif')} 
                                            />
                                        </div>
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Security Alerts & Rate Limit Breaches</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Send high-priority notifications when anomalous IP traffic or repeated failed logins trigger Protocol Shield.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => handleTriggerTestAlert('secAlertNotif')}
                                                disabled={isTestingAlert === 'secAlertNotif'}
                                                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <span>{isTestingAlert === 'secAlertNotif' ? 'Sending...' : 'Send Test Alert'}</span>
                                            </button>
                                            <Toggle 
                                                enabled={config.notifications.secAlertNotif} 
                                                onChange={() => handleToggle('notifications', 'secAlertNotif')} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Broadcast Platform Announcement & In-App Notification */}
                            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h3 className={`text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-extrabold`}>
                                            Broadcast Platform Announcement
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                                            Push a real-time announcement and in-app notification directly to user notification inboxes.
                                        </p>
                                    </div>
                                </div>
                                <form onSubmit={handleBroadcastSubmit} className={`p-4 rounded-xl border space-y-3.5 bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Announcement Headline *</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Scheduled System Upgrade at 2 AM IST" 
                                                value={broadcastForm.title}
                                                onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Target Audience</label>
                                            <select 
                                                value={broadcastForm.audience}
                                                onChange={(e) => setBroadcastForm(prev => ({ ...prev, audience: e.target.value }))}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                            >
                                                <option value="all">All Platform Users</option>
                                                <option value="student">Students & Participants</option>
                                                <option value="mentor">Mentors & Judges</option>
                                                <option value="organizer">Event Organizers</option>
                                                <option value="admin">Administrators Only</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Message Content *</label>
                                        <textarea 
                                            rows={2}
                                            placeholder="Write your broadcast message..." 
                                            value={broadcastForm.message}
                                            onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                        />
                                    </div>

                                    <div className="flex justify-between items-center pt-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold">Priority:</span>
                                            {['normal', 'high', 'urgent'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setBroadcastForm(prev => ({ ...prev, priority: p }))}
                                                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                                        broadcastForm.priority === p
                                                            ? p === 'urgent' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40' :
                                                              p === 'high' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40' :
                                                              'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40'
                                                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 border-transparent'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={isBroadcasting}
                                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m3 11 18-5v12L3 14v-3z"/>
                                                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                                            </svg>
                                            <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast Announcement'}</span>
                                        </button>

                                    </div>
                                </form>
                            </div>

                            {/* Outbound SMTP Mail Gateway & Verification */}
                            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h3 className={`text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-extrabold`}>
                                            Outbound SMTP Mail Gateway & Verification
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                                            Configure enterprise SMTP credentials for automated applicant notifications, team invitations, and password resets.
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                                        config.notifications.smtpHost ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    }`}>
                                        {config.notifications.smtpHost ? 'Configured' : 'Needs Setup'}
                                    </span>
                                </div>

                                <div className={`p-4 rounded-xl border space-y-3.5 bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">SMTP Host / Server *</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. smtp.gmail.com or smtp.sendgrid.net" 
                                                value={config.notifications.smtpHost || ''}
                                                onChange={(e) => handleInputChange('notifications', 'smtpHost', e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Port *</label>
                                            <input 
                                                type="number" 
                                                placeholder="587" 
                                                value={config.notifications.smtpPort || 587}
                                                onChange={(e) => handleInputChange('notifications', 'smtpPort', e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Username / Account Email *</label>
                                            <input 
                                                type="text" 
                                                placeholder="notifications@hackzen.org" 
                                                value={config.notifications.smtpUser || ''}
                                                onChange={(e) => handleInputChange('notifications', 'smtpUser', e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">SMTP Password / App Key *</label>
                                            <input 
                                                type="password" 
                                                placeholder="••••••••••••" 
                                                value={config.notifications.smtpPassword || ''}
                                                onChange={(e) => handleInputChange('notifications', 'smtpPassword', e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Sender Address ('From')</label>
                                            <input 
                                                type="text" 
                                                placeholder="HackZen Platform <notifications@hackzen.org>" 
                                                value={config.notifications.smtpFrom || ''}
                                                onChange={(e) => handleInputChange('notifications', 'smtpFrom', e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end">
                                            <div className="flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                                                <span className="text-[11px] font-semibold text-slate-700 dark:text-gray-300">STARTTLS</span>
                                                <Toggle 
                                                    enabled={config.notifications.smtpUseTls !== false} 
                                                    onChange={() => handleToggle('notifications', 'smtpUseTls')} 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Test Connection & Dispatch Sub-Panel */}
                                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        <div className="flex-1 max-w-sm">
                                            <input 
                                                type="email" 
                                                placeholder="Test recipient email (defaults to admin)"
                                                value={smtpTestRecipient}
                                                onChange={(e) => setSmtpTestRecipient(e.target.value)}
                                                className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleTestSmtp}
                                            disabled={smtpTesting || !config.notifications.smtpHost}
                                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-[#7C65F6]/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {smtpTesting ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Connecting & Testing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                                    <span>Test Connection & Dispatch Email</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {smtpTestResult && (
                                        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                                            smtpTestResult.success 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400' 
                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400'
                                        }`}>
                                            <span className="font-bold text-sm leading-none mt-0.5">{smtpTestResult.success ? '✓' : '⚠️'}</span>
                                            <div>
                                                <p className="font-semibold">{smtpTestResult.message}</p>
                                                {smtpTestResult.details && <p className="text-[11px] opacity-80 mt-0.5">{smtpTestResult.details}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Notification Dispatches Feed */}
                            {notificationHistory.length > 0 && (
                                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                    <h3 className={`text-xs font-black uppercase tracking-wider mb-3 text-slate-900 dark:text-white font-extrabold`}>
                                        Recent Notification Dispatches & Alerts ({notificationHistory.length})
                                    </h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 scrollbar-hide">
                                        <table className="w-full text-left text-xs min-w-[540px]">
                                            <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">
                                                <tr>
                                                    <th className="p-3">Title & Message</th>
                                                    <th className="p-3">Audience</th>
                                                    <th className="p-3">Priority</th>
                                                    <th className="p-3">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                {notificationHistory.slice(0, 5).map((n) => (
                                                    <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                        <td className="p-3">
                                                            <p className="font-bold text-slate-900 dark:text-white text-xs">{n.title}</p>
                                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-1">{n.message}</p>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300">
                                                                {n.audience}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                                                n.priority === 'urgent' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                                                n.priority === 'high' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                                                'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                            }`}>
                                                                {n.priority}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-[10px] text-slate-400 font-mono">
                                                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}


                    {/* ========================================================= */}
                    {/* 5. HACKATHONS TAB */}
                    {/* ========================================================= */}
                    {activeTab === 'Hackathons' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-wider mb-3 border-b pb-2 text-slate-900 dark:text-white font-extrabold border-slate-200 dark:border-white/10`}>
                                    Default Platform Hackathon Rules
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                                    These baseline constraints apply to all hackathons created on ProEduvate unless explicitly overridden with administrative approval.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Maximum Team Size Limit</label>
                                        <input 
                                            type="number" 
                                            min={1} 
                                            max={12}
                                            value={config.hackathons.maxTeamSize}
                                            onChange={(e) => handleInputChange('hackathons', 'maxTeamSize', parseInt(e.target.value) || 4)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Minimum Team Size Limit</label>
                                        <input 
                                            type="number" 
                                            min={1} 
                                            max={4}
                                            value={config.hackathons.minTeamSize}
                                            onChange={(e) => handleInputChange('hackathons', 'minTeamSize', parseInt(e.target.value) || 1)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Allow Team Composition Changes After Registration</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Permit students to invite or remove members before final submission freeze.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.hackathons.allowTeamChanges} 
                                            onChange={() => handleToggle('hackathons', 'allowTeamChanges')} 
                                        />
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Allow Late Submissions (Auto-Flagged)</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Accept late project uploads with automated audit flag for judge discretion.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.hackathons.allowLateSubmissions} 
                                            onChange={() => handleToggle('hackathons', 'allowLateSubmissions')} 
                                        />
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Enable Public Live Leaderboard During Evaluation</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Display real-time scoring updates on the public hackathon page.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.hackathons.publicLeaderboard} 
                                            onChange={() => handleToggle('hackathons', 'publicLeaderboard')} 
                                        />
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Enforce AI Originality & Plagiarism Analysis</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Run automatic commit vector similarity and repository duplication checks.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.hackathons.plagiarismDetect} 
                                            onChange={() => handleToggle('hackathons', 'plagiarismDetect')} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* 6. SUBMISSIONS TAB */}
                    {/* ========================================================= */}
                    {activeTab === 'Submissions' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-wider mb-3 border-b pb-2 text-slate-900 dark:text-white font-extrabold border-slate-200 dark:border-white/10`}>
                                    Global Submission Deliverable Policies
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                                    Configure file upload constraints and mandatory submission artifacts for all hackathons.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Maximum Upload File Size</label>
                                        <select 
                                            value={config.submissions.maxUploadFileSize}
                                            onChange={(e) => handleInputChange('submissions', 'maxUploadFileSize', e.target.value)}
                                            className={`w-full px-3.5 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                                        >
                                            <option value="25 MB">25 MB</option>
                                            <option value="50 MB">50 MB</option>
                                            <option value="100 MB">100 MB</option>
                                            <option value="250 MB">250 MB</option>
                                            <option value="500 MB">500 MB</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-2 text-slate-500 dark:text-gray-400 font-extrabold`}>Allowed Deliverable File Types</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4', 'TAR.GZ'].map(ext => {
                                                const isSelected = (config.submissions.allowedFileTypes || []).includes(ext);
                                                return (
                                                    <button
                                                        key={ext}
                                                        type="button"
                                                        onClick={() => handleFileTypeToggle(ext)}
                                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                                                            isSelected 
                                                                ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40 shadow-sm' 
                                                                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 border-transparent hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {ext}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Require GitHub Repository URL</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Students must submit a valid public repository link for commit auditing.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.submissions.gitHubRepo} 
                                            onChange={() => handleToggle('submissions', 'gitHubRepo')} 
                                        />
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Require Live Demo URL</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Require an active deployment link (Vercel, Render, AWS) for judge verification.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.submissions.demoUrl} 
                                            onChange={() => handleToggle('submissions', 'demoUrl')} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* 7. CERTIFICATES TAB */}
                    {/* ========================================================= */}
                    {activeTab === 'Certificates' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-wider mb-3 border-b pb-2 text-slate-900 dark:text-white font-extrabold border-slate-200 dark:border-white/10`}>
                                    Certificate Automation & Credential Engine
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                                    Configure global certificate prefixes, automatic issuance pipelines, and public verification routing.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Global Certificate Prefix</label>
                                        <input 
                                            type="text" 
                                            value={config.certificates.prefix}
                                            onChange={(e) => {
                                                const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
                                                handleInputChange('certificates', 'prefix', sanitized);
                                            }}
                                            placeholder="PROEDU"
                                            className={`w-full px-3.5 py-2 text-xs font-mono font-bold focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 text-slate-500 dark:text-gray-400 font-extrabold`}>Validation ID Format Template</label>
                                        <input 
                                            type="text" 
                                            disabled 
                                            value={`${config.certificates.prefix || 'PROEDU'}-${new Date().getFullYear()}-XXXXX`}
                                            className={`w-full px-3.5 py-2 text-xs font-mono text-slate-500 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl cursor-not-allowed`} 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Auto-Generate Winner & Runner-Up Certificates</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Automatically issue verified winner certificates when organizer marks event concluded.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.certificates.autoGenWinner} 
                                            onChange={() => handleToggle('certificates', 'autoGenWinner')} 
                                        />
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Auto-Generate Participant Certificates</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Generate participation credentials for all valid submissions upon closing.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.certificates.autoGenParticipant} 
                                            onChange={() => handleToggle('certificates', 'autoGenParticipant')} 
                                        />
                                    </div>

                                    <div className={`flex justify-between items-center p-3.5 rounded-xl border bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl`}>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Enable Public QR Verification Portal</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Allow public recruiters and third parties to scan and verify certificate authenticity online.</p>
                                        </div>
                                        <Toggle 
                                            enabled={config.certificates.publicVerification} 
                                            onChange={() => handleToggle('certificates', 'publicVerification')} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* 8. AUDIT LOGS TAB */}
                    {/* ========================================================= */}
                    {activeTab === 'Audit Logs' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
                                <div>
                                    <h3 className={`text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-extrabold`}>
                                        Immutable Administrator Audit Ledger
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Real-time log of administrative policy modifications and security actions.</p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <select 
                                        value={logFilters.category}
                                        onChange={(e) => handleFilterLogs({ ...logFilters, category: e.target.value })}
                                        className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
                                    >
                                        <option value="All Categories">All Categories</option>
                                        <option value="Settings">Settings</option>
                                        <option value="Access">Access & RBAC</option>
                                        <option value="Security">Security</option>
                                    </select>
                                    <select 
                                        value={logFilters.dateRange}
                                        onChange={(e) => handleFilterLogs({ ...logFilters, dateRange: e.target.value })}
                                        className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
                                    >
                                        <option value="All Time">All Time</option>
                                        <option value="Last 24 Hours">Last 24 Hours</option>
                                        <option value="Last 7 Days">Last 7 Days</option>
                                        <option value="Last 30 Days">Last 30 Days</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 scrollbar-hide">
                                <table className="w-full text-left text-xs min-w-[620px]">
                                    <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400">
                                        <tr>
                                            <th className="p-3">Timestamp</th>
                                            <th className="p-3">Admin</th>
                                            <th className="p-3">Action</th>
                                            <th className="p-3">Details / Target</th>
                                            <th className="p-3">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {isLoadingLogs ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-400">Loading audit ledger entries...</td>
                                            </tr>
                                        ) : auditLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-400">No audit log entries matching filters.</td>
                                            </tr>
                                        ) : (
                                            auditLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                    <td className="p-3 text-slate-500 dark:text-gray-400 whitespace-nowrap font-mono text-[11px]">{log.date}</td>
                                                    <td className="p-3 font-bold text-slate-900 dark:text-white">{log.admin}</td>
                                                    <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">{log.action}</td>
                                                    <td className="p-3 text-slate-700 dark:text-gray-300">
                                                        <span className="text-[11px]">{log.details || log.target}</span>
                                                    </td>
                                                    <td className="p-3 font-mono text-slate-400 dark:text-gray-500 text-[10px]">{log.ip}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* ========================================================= */}
            {/* ADD ADMINISTRATOR MODAL */}
            {/* ========================================================= */}
            <ActionModal 
                isOpen={isAddAdminOpen} 
                onClose={() => setIsAddAdminOpen(false)} 
                title="Add Platform Administrator"
                subtitle="Invite an existing user or create a new administrator account with granular permissions."
            >
                <form onSubmit={handleAddAdminSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Full Name</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Sarah Chen" 
                                value={newAdminForm.name}
                                onChange={(e) => setNewAdminForm(prev => ({ ...prev, name: e.target.value }))}
                                className={`w-full px-3 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Email Address *</label>
                            <input 
                                type="email" 
                                required
                                placeholder="sarah@proeduvate.com" 
                                value={newAdminForm.email}
                                onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                                className={`w-full px-3 py-2 text-xs focus:outline-none rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Administrative Role</label>
                        <select 
                            value={newAdminForm.role}
                            onChange={(e) => setNewAdminForm(prev => ({ ...prev, role: e.target.value }))}
                            className={`w-full px-3 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                        >
                            <option value="Admin">Admin (Standard Governance)</option>
                            <option value="Moderator">Moderator (Disputes & Submissions)</option>
                            <option value="Support Admin">Support Admin (Approvals & Inquiries)</option>
                            <option value="Analytics Viewer">Analytics Viewer (Read-Only)</option>
                        </select>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                        <label className="text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                            Granular Workspace Permissions
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(newAdminForm.permissions).map(key => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-gray-300">
                                    <input 
                                        type="checkbox" 
                                        checked={newAdminForm.permissions[key]} 
                                        onChange={(e) => setNewAdminForm(prev => ({
                                            ...prev,
                                            permissions: { ...prev.permissions, [key]: e.target.checked }
                                        }))}
                                        className="rounded text-indigo-600 focus:ring-0" 
                                    />
                                    <span className="capitalize">{key} Management</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3">
                        <button 
                            type="button" 
                            onClick={() => setIsAddAdminOpen(false)} 
                            className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                            Grant Admin Access
                        </button>
                    </div>
                </form>
            </ActionModal>

            {/* ========================================================= */}
            {/* EDIT ADMINISTRATOR PERMISSIONS MODAL */}
            {/* ========================================================= */}
            {editingAdmin && (
                <ActionModal 
                    isOpen={Boolean(editingAdmin)} 
                    onClose={() => setEditingAdmin(null)} 
                    title={`Edit Permissions: ${editingAdmin.name}`}
                    subtitle={`Update administrative role and granular workspace permissions for ${editingAdmin.email}.`}
                >
                    <form onSubmit={handleUpdatePermissionsSubmit} className="space-y-4 text-xs">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1 block">Role</label>
                            <select 
                                value={editingAdmin.role}
                                onChange={(e) => setEditingAdmin(prev => ({ ...prev, role: e.target.value }))}
                                className={`w-full px-3 py-2 text-xs focus:outline-none cursor-pointer rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500`}
                            >
                                <option value="Super Admin">Super Admin</option>
                                <option value="Admin">Admin</option>
                                <option value="Moderator">Moderator</option>
                                <option value="Support Admin">Support Admin</option>
                                <option value="Analytics Viewer">Analytics Viewer</option>
                            </select>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                            <label className="text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                                Granular Permissions
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.keys(editingAdmin.permissions || {}).map(key => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-gray-300">
                                        <input 
                                            type="checkbox" 
                                            checked={Boolean(editingAdmin.permissions[key])} 
                                            onChange={(e) => setEditingAdmin(prev => ({
                                                ...prev,
                                                permissions: { ...prev.permissions, [key]: e.target.checked }
                                            }))}
                                            className="rounded text-indigo-600 focus:ring-0" 
                                        />
                                        <span className="capitalize">{key} Management</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3">
                            <button 
                                type="button" 
                                onClick={() => setEditingAdmin(null)} 
                                className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                                Save Permissions
                            </button>
                        </div>
                    </form>
                </ActionModal>
            )}

        </div>
    );
};

export default Settings;
