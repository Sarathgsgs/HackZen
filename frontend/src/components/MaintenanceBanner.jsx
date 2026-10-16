import React from 'react';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const MaintenanceBanner = () => {
    const { isMaintenanceMode, platformName } = usePlatformSettings();

    if (!isMaintenanceMode) return null;

    return (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black shadow-md flex items-center justify-between z-[9999] sticky top-0 border-b border-amber-600 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-900"></span>
                </span>
                <span className="uppercase tracking-wider">
                    ⚠️ {platformName} Maintenance Notice:
                </span>
                <span className="font-semibold text-slate-900 hidden sm:inline">
                    Scheduled platform maintenance is currently active. Non-administrative features and submission changes may be temporarily restricted.
                </span>
            </div>
        </div>
    );
};

export default MaintenanceBanner;
