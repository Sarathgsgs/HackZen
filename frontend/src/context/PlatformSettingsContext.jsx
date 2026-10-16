import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api/api';

const PlatformSettingsContext = createContext();

export const defaultPlatformSettings = {
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
    logoUrl: '',

    // Hackathons Domain
    maxTeamSize: 4,
    minTeamSize: 1,
    allowTeamChanges: true,
    allowLateSubmissions: false,
    publicLeaderboard: true,
    plagiarismDetect: true,

    // Submissions Domain
    maxUploadFileSize: '100 MB',
    maxUploadSizeMB: '100 MB',
    allowedFileTypes: ['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4'],
    gitHubRepo: true,
    requireGithubRepo: true,
    demoUrl: true,
    requireLiveDemo: true,

    // Certificates Domain
    prefix: 'PROEDU',
    certificatePrefix: 'PROEDU',
    autoGenWinner: true,
    autoGenerateWinners: true,
    autoGenParticipant: false,
    autoGenerateParticipants: false,
    publicVerification: true,
    publicQrVerification: true,

    // Nested structures
    hackathons: {
        maxTeamSize: 4,
        minTeamSize: 1,
        allowTeamChanges: true,
        allowLateSubmissions: false,
        publicLeaderboard: true,
        plagiarismDetect: true,
    },
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
    },
    submissions: {
        maxUploadFileSize: '100 MB',
        allowedFileTypes: ['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4', 'TAR.GZ'],
        gitHubRepo: true,
        demoUrl: true,
    },
    certificates: {
        prefix: 'PROEDU',
        autoGenWinner: true,
        autoGenParticipant: false,
        publicVerification: true,
    }
};

export const PlatformSettingsProvider = ({ children }) => {
    const [platformSettings, setPlatformSettings] = useState(() => {
        try {
            const cached = localStorage.getItem('cachedPlatformSettings');
            return cached ? { ...defaultPlatformSettings, ...JSON.parse(cached) } : defaultPlatformSettings;
        } catch {
            return defaultPlatformSettings;
        }
    });
    const [isLoading, setIsLoading] = useState(true);

    const mergeAndApplySettings = useCallback((incomingData) => {
        if (!incomingData || typeof incomingData !== 'object') return;
        setPlatformSettings(prev => {
            const maxTeamSize = incomingData.maxTeamSize !== undefined 
                ? Number(incomingData.maxTeamSize) 
                : (incomingData.hackathons?.maxTeamSize !== undefined ? Number(incomingData.hackathons.maxTeamSize) : prev.maxTeamSize);
            const minTeamSize = incomingData.minTeamSize !== undefined 
                ? Number(incomingData.minTeamSize) 
                : (incomingData.hackathons?.minTeamSize !== undefined ? Number(incomingData.hackathons.minTeamSize) : prev.minTeamSize);

            const maxUploadFileSize = incomingData.maxUploadFileSize || incomingData.submissions?.maxUploadFileSize || prev.maxUploadFileSize || '100 MB';
            let allowedFileTypes = incomingData.allowedFileTypes || incomingData.submissions?.allowedFileTypes || prev.allowedFileTypes || ['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4', 'TAR.GZ'];
            if (typeof allowedFileTypes === 'string') {
                allowedFileTypes = allowedFileTypes.split(',').map(s => s.trim().toUpperCase().replace(/^\./, '')).filter(Boolean);
            }
            const gitHubRepo = incomingData.gitHubRepo !== undefined
                ? Boolean(incomingData.gitHubRepo)
                : (incomingData.submissions?.gitHubRepo !== undefined ? Boolean(incomingData.submissions.gitHubRepo) : Boolean(prev.gitHubRepo ?? true));
            const demoUrl = incomingData.demoUrl !== undefined
                ? Boolean(incomingData.demoUrl)
                : (incomingData.submissions?.demoUrl !== undefined ? Boolean(incomingData.submissions.demoUrl) : Boolean(prev.demoUrl ?? true));

            const prefix = incomingData.prefix || incomingData.certificatePrefix || incomingData.certificates?.prefix || prev.prefix || 'PROEDU';
            const autoGenWinner = incomingData.autoGenWinner !== undefined 
                ? Boolean(incomingData.autoGenWinner) 
                : (incomingData.certificates?.autoGenWinner !== undefined ? Boolean(incomingData.certificates.autoGenWinner) : Boolean(prev.autoGenWinner ?? true));
            const autoGenParticipant = incomingData.autoGenParticipant !== undefined 
                ? Boolean(incomingData.autoGenParticipant) 
                : (incomingData.certificates?.autoGenParticipant !== undefined ? Boolean(incomingData.certificates.autoGenParticipant) : Boolean(prev.autoGenParticipant ?? false));
            const publicVerification = incomingData.publicVerification !== undefined 
                ? Boolean(incomingData.publicVerification) 
                : (incomingData.certificates?.publicVerification !== undefined ? Boolean(incomingData.certificates.publicVerification) : Boolean(prev.publicVerification ?? true));

            const merged = {
                ...prev,
                ...incomingData,
                maxTeamSize,
                minTeamSize,
                maxUploadFileSize,
                allowedFileTypes,
                gitHubRepo,
                demoUrl,
                prefix,
                certificatePrefix: prefix,
                autoGenWinner,
                autoGenerateWinners: autoGenWinner,
                autoGenParticipant,
                autoGenerateParticipants: autoGenParticipant,
                publicVerification,
                publicQrVerification: publicVerification,
                hackathons: {
                    ...prev.hackathons,
                    ...(incomingData.hackathons || {}),
                    maxTeamSize,
                    minTeamSize
                },
                general: {
                    ...prev.general,
                    ...(incomingData.general || {})
                },
                submissions: {
                    ...prev.submissions,
                    ...(incomingData.submissions || {}),
                    maxUploadFileSize,
                    allowedFileTypes,
                    gitHubRepo,
                    demoUrl
                },
                certificates: {
                    ...prev.certificates,
                    ...(incomingData.certificates || {}),
                    prefix,
                    autoGenWinner,
                    autoGenParticipant,
                    publicVerification
                }
            };
            try {
                localStorage.setItem('cachedPlatformSettings', JSON.stringify(merged));
            } catch (err) {
                console.warn('Failed to cache settings:', err);
            }
            return merged;
        });
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/admin/settings/public');
            if (data && typeof data === 'object') {
                mergeAndApplySettings(data);
            }
        } catch (error) {
            console.warn('Failed to load public platform settings, using cached/defaults:', error);
        } finally {
            setIsLoading(false);
        }
    }, [mergeAndApplySettings]);

    // Broadcast channel & window events for real-time synchronization
    useEffect(() => {
        fetchSettings();

        // 1. BroadcastChannel for sub-millisecond cross-tab communication
        let channel = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                channel = new BroadcastChannel('platform_settings_channel');
                channel.onmessage = (event) => {
                    if (event.data?.type === 'SETTINGS_UPDATED') {
                        if (event.data.payload) {
                            mergeAndApplySettings(event.data.payload);
                        } else {
                            fetchSettings();
                        }
                    }
                };
            }
        } catch (e) {
            console.warn('BroadcastChannel not supported:', e);
        }

        // 2. Custom DOM event for instant intra-window updates
        const handleSettingsUpdated = (e) => {
            if (e.detail) {
                mergeAndApplySettings(e.detail);
            } else {
                fetchSettings();
            }
        };

        // 3. Storage event for cross-tab sync in older contexts
        const handleStorageChange = (e) => {
            if (e.key === 'cachedPlatformSettings' && e.newValue) {
                try {
                    mergeAndApplySettings(JSON.parse(e.newValue));
                } catch {
                    fetchSettings();
                }
            } else if (e.key === 'platformSettingsTimestamp') {
                fetchSettings();
            }
        };

        window.addEventListener('platform-settings-updated', handleSettingsUpdated);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('focus', fetchSettings);

        // Polling every 10 seconds for real-time background sync
        const pollInterval = setInterval(fetchSettings, 10000);

        return () => {
            if (channel) {
                channel.close();
            }
            window.removeEventListener('platform-settings-updated', handleSettingsUpdated);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', fetchSettings);
            clearInterval(pollInterval);
        };
    }, [fetchSettings, mergeAndApplySettings]);

    // Dynamically update document title with real-time platform name
    useEffect(() => {
        if (platformSettings.platformName) {
            const currentTitle = document.title;
            const suffix = currentTitle.includes('-') ? currentTitle.split('-').slice(1).join('-') : 'Build. Compete. Innovate.';
            document.title = `${platformSettings.platformName} -${suffix}`;
        }
    }, [platformSettings.platformName]);

    // Broadcast updated settings to other tabs and current window
    const broadcastSettingsUpdate = useCallback((updatedSettings) => {
        mergeAndApplySettings(updatedSettings);

        // Notify other tabs via BroadcastChannel
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                const channel = new BroadcastChannel('platform_settings_channel');
                channel.postMessage({ type: 'SETTINGS_UPDATED', payload: updatedSettings });
                channel.close();
            }
        } catch (e) {
            console.warn('Failed to post message on BroadcastChannel:', e);
        }

        // Notify local window components
        window.dispatchEvent(new CustomEvent('platform-settings-updated', { detail: updatedSettings }));
        try {
            localStorage.setItem('platformSettingsTimestamp', Date.now().toString());
        } catch {}
    }, [mergeAndApplySettings]);

    // Real-time Date Formatter based on admin configured dateFormat
    const formatDate = useCallback((dateInput) => {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);

        const format = platformSettings.dateFormat || 'MMM DD, YYYY';

        const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = d.getFullYear();
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const monthShort = monthsShort[d.getMonth()];
        const day = String(d.getDate()).padStart(2, '0');

        switch (format) {
            case 'DD/MM/YYYY':
                return `${day}/${monthNum}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${monthNum}-${day}`;
            case 'MMM DD, YYYY':
            default:
                return `${monthShort} ${day}, ${year}`;
        }
    }, [platformSettings.dateFormat]);

    // Helper: generate valid team sizes strictly within [minTeamSize, min(hackathonLimit, maxTeamSize)]
    const getTeamSizeOptions = useCallback((hackathonLimit) => {
        const min = Math.max(1, Number(platformSettings.minTeamSize) || 1);
        const globalMax = Math.max(min, Number(platformSettings.maxTeamSize) || 4);
        const limit = hackathonLimit ? Math.min(Number(hackathonLimit), globalMax) : globalMax;
        const effectiveMax = Math.max(min, limit);
        return Array.from({ length: effectiveMax - min + 1 }, (_, i) => min + i);
    }, [platformSettings.minTeamSize, platformSettings.maxTeamSize]);

    // Helper: evaluate if submission is permitted under deadline and late submission rules
    const isSubmissionAllowed = useCallback((deadline) => {
        if (!deadline) return true;
        const now = new Date();
        const end = new Date(deadline);
        if (isNaN(end.getTime())) return true;
        const isPast = now > end;
        return !isPast || Boolean(platformSettings.allowLateSubmissions);
    }, [platformSettings.allowLateSubmissions]);

    // Helper: calculate max file size in bytes
    const getMaxUploadSizeBytes = useCallback(() => {
        const sizeStr = platformSettings.maxUploadFileSize || platformSettings.submissions?.maxUploadFileSize || '100 MB';
        const num = parseInt(sizeStr, 10) || 100;
        return num * 1024 * 1024;
    }, [platformSettings.maxUploadFileSize, platformSettings.submissions?.maxUploadFileSize]);

    // Helper: get HTML accept attribute string for allowed extensions
    const getAllowedExtensionsAcceptString = useCallback(() => {
        const rawList = platformSettings.allowedFileTypes || platformSettings.submissions?.allowedFileTypes || ['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4', 'TAR.GZ'];
        const list = Array.isArray(rawList) ? rawList : String(rawList).split(',');
        return list.map(ext => `.${ext.trim().toLowerCase()}`).join(',');
    }, [platformSettings.allowedFileTypes, platformSettings.submissions?.allowedFileTypes]);

    // Helper: validate a deliverable file against active platform deliverable rules
    const validateDeliverableFile = useCallback((file) => {
        if (!file) {
            return { valid: false, error: 'No file selected.' };
        }

        // 1. Check file size
        const maxBytes = getMaxUploadSizeBytes();
        const sizeLabel = platformSettings.maxUploadFileSize || platformSettings.submissions?.maxUploadFileSize || '100 MB';
        if (file.size > maxBytes) {
            const actualMb = (file.size / (1024 * 1024)).toFixed(1);
            return {
                valid: false,
                error: `File size (${actualMb} MB) exceeds platform limit of ${sizeLabel}.`
            };
        }

        // 2. Check file extension (with .tar.gz compound extension support)
        const rawAllowed = platformSettings.allowedFileTypes || platformSettings.submissions?.allowedFileTypes || ['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4', 'TAR.GZ'];
        const allowed = (Array.isArray(rawAllowed) ? rawAllowed : String(rawAllowed).split(','))
            .map(x => x.trim().toUpperCase().replace(/^\./, ''));

        const fileNameLower = file.name.toLowerCase();
        let ext = '';
        if (fileNameLower.endsWith('.tar.gz')) {
            ext = 'TAR.GZ';
        } else {
            ext = file.name.split('.').pop().toUpperCase();
        }

        if (!allowed.includes(ext)) {
            return {
                valid: false,
                error: `File type .${ext.toLowerCase()} is not permitted by platform policy. Allowed formats: ${allowed.join(', ')}`
            };
        }

        return { valid: true, error: null };
    }, [getMaxUploadSizeBytes, platformSettings.maxUploadFileSize, platformSettings.submissions?.maxUploadFileSize, platformSettings.allowedFileTypes, platformSettings.submissions?.allowedFileTypes]);

    const value = useMemo(() => ({
        platformSettings,
        isLoading,
        formatDate,
        refreshPlatformSettings: fetchSettings,
        broadcastSettingsUpdate,
        getTeamSizeOptions,
        isSubmissionAllowed,
        getMaxUploadSizeBytes,
        getAllowedExtensionsAcceptString,
        validateDeliverableFile,

        // Direct getters
        platformName: platformSettings.platformName || 'ProEduvate',
        supportEmail: platformSettings.supportEmail || 'support@proeduvate.com',
        supportPhone: platformSettings.supportPhone || '+91 800 123 4567',
        website: platformSettings.website || 'https://proeduvate.com',
        timezone: platformSettings.timezone || 'Asia/Kolkata (IST)',
        country: platformSettings.country || 'India',
        dateFormat: platformSettings.dateFormat || 'MMM DD, YYYY',
        isMaintenanceMode: Boolean(platformSettings.maintenanceMode),
        isPublicRegistrationAllowed: Boolean(platformSettings.publicRegistrations ?? true),

        // Hackathon rules
        maxTeamSize: Number(platformSettings.maxTeamSize) || 4,
        minTeamSize: Number(platformSettings.minTeamSize) || 1,
        allowTeamChanges: Boolean(platformSettings.allowTeamChanges ?? true),
        allowLateSubmissions: Boolean(platformSettings.allowLateSubmissions),
        publicLeaderboard: Boolean(platformSettings.publicLeaderboard ?? true),
        plagiarismDetect: Boolean(platformSettings.plagiarismDetect ?? true),

        // Submissions rules
        maxUploadFileSize: platformSettings.maxUploadFileSize || '100 MB',
        allowedFileTypes: platformSettings.allowedFileTypes || ['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4', 'TAR.GZ'],
        gitHubRepo: Boolean(platformSettings.gitHubRepo ?? true),
        demoUrl: Boolean(platformSettings.demoUrl ?? true),

        // Certificates rules & helpers
        prefix: platformSettings.prefix || 'PROEDU',
        autoGenWinner: Boolean(platformSettings.autoGenWinner ?? true),
        autoGenParticipant: Boolean(platformSettings.autoGenParticipant),
        publicVerification: Boolean(platformSettings.publicVerification ?? true),
        formatValidationId: (serial = 'XXXXX') => `${platformSettings.prefix || 'PROEDU'}-${new Date().getFullYear()}-${serial}`,
        isPublicVerificationAllowed: () => Boolean(platformSettings.publicVerification ?? true),
    }), [platformSettings, isLoading, formatDate, fetchSettings, broadcastSettingsUpdate, getTeamSizeOptions, isSubmissionAllowed, getMaxUploadSizeBytes, getAllowedExtensionsAcceptString, validateDeliverableFile]);

    return (
        <PlatformSettingsContext.Provider value={value}>
            {children}
        </PlatformSettingsContext.Provider>
    );
};

export const usePlatformSettings = () => {
    const context = useContext(PlatformSettingsContext);
    if (!context) {
        return {
            platformSettings: defaultPlatformSettings,
            isLoading: false,
            formatDate: (d) => String(d || ''),
            refreshPlatformSettings: () => {},
            broadcastSettingsUpdate: () => {},
            getTeamSizeOptions: (limit) => Array.from({ length: (Number(limit) || 4) }, (_, i) => i + 1),
            isSubmissionAllowed: () => true,
            platformName: defaultPlatformSettings.platformName,
            supportEmail: defaultPlatformSettings.supportEmail,
            supportPhone: defaultPlatformSettings.supportPhone,
            website: defaultPlatformSettings.website,
            timezone: defaultPlatformSettings.timezone,
            country: defaultPlatformSettings.country,
            dateFormat: defaultPlatformSettings.dateFormat,
            isMaintenanceMode: defaultPlatformSettings.maintenanceMode,
            isPublicRegistrationAllowed: defaultPlatformSettings.publicRegistrations,
            maxTeamSize: 4,
            minTeamSize: 1,
            allowTeamChanges: true,
            allowLateSubmissions: false,
            publicLeaderboard: true,
            plagiarismDetect: true,
            maxUploadFileSize: '100 MB',
            allowedFileTypes: ['ZIP', 'PDF', 'PPTX', 'DOCX', 'MP4'],
            gitHubRepo: true,
            demoUrl: true,
            prefix: 'PROEDU',
            autoGenWinner: true,
            autoGenParticipant: false,
            publicVerification: true,
            formatValidationId: (serial = 'XXXXX') => `PROEDU-${new Date().getFullYear()}-${serial}`,
            isPublicVerificationAllowed: () => true,
        };
    }
    return context;
};
