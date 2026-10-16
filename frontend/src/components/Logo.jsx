import React from 'react';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const Logo = ({ size = 'md', className = '', showSubtext = false }) => {
    const { platformName } = usePlatformSettings();

    const textSizes = {
        sm: 'text-lg sm:text-xl',
        md: 'text-xl sm:text-2xl',
        lg: 'text-2xl sm:text-3xl',
    };

    const iconSizes = {
        sm: 'w-6 h-6 sm:w-7 sm:h-7',
        md: 'w-7 h-7 sm:w-8 sm:h-8',
        lg: 'w-8 h-8 sm:w-10 sm:h-10',
    };

    // Format custom or default platform name
    const renderBrandName = () => {
        const name = platformName || 'ProEduvate';
        if (name.toLowerCase() === 'proeduvate') {
            return (
                <>
                    <span className="text-slate-900 dark:text-white transition-colors duration-300">Pro</span>
                    <span className="text-[#2563eb]">Eduvate</span>
                </>
            );
        }
        // For custom platform name, split first word / remaining or render clean text
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (
                <>
                    <span className="text-slate-900 dark:text-white transition-colors duration-300">{parts[0]} </span>
                    <span className="text-[#2563eb]">{parts.slice(1).join(' ')}</span>
                </>
            );
        }
        return <span className="text-slate-900 dark:text-white">{name}</span>;
    };

    return (
        <div className={`flex items-center gap-2 sm:gap-2.5 select-none shrink-0 ${className}`}>
            {/* Rocket Wing Emblem */}
            <div className="relative flex items-center justify-center shrink-0">
                <svg className={`${iconSizes[size] || iconSizes.md} text-[#2563eb] transform -rotate-12 transition-transform duration-300 group-hover:scale-110`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.4 20.4l17.4-7.5c.8-.3.8-1.4 0-1.7L3.4 3.7c-.7-.3-1.4.3-1.2 1l2.4 6.8c.1.3.3.5.6.6l8.8 1.4-8.8 1.4c-.3.1-.5.3-.6.6l-2.4 6.9c-.2.7.5 1.3 1.2 1z"/>
                </svg>
            </div>
            <div className="flex flex-col">
                <span className={`font-black tracking-tight leading-none ${textSizes[size] || textSizes.md}`}>
                    {renderBrandName()}
                </span>
                {showSubtext && (
                    <span className="text-[7.5px] uppercase font-black tracking-widest text-slate-500 dark:text-gray-400 mt-1">
                        People. Projects and Potential.
                    </span>
                )}
            </div>
        </div>
    );
};

export default Logo;
