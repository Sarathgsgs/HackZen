import React from 'react';

const ToggleSwitch = ({ checked, onChange, label, description }) => {
    return (
        <div className="flex items-center justify-between p-6 bg-white dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 group hover:border-indigo-500/30 transition-all duration-300 shadow-sm dark:shadow-none">
            <div className="space-y-1">
                <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-[0.15em] group-hover:text-indigo-500 transition-colors">
                    {label}
                </h3>
                <p className="text-[9px] text-slate-500 dark:text-gray-500 font-semibold uppercase tracking-[0.2em] italic leading-relaxed">
                    {description}
                </p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${
                    checked
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-indigo-500/40 border border-indigo-400/30'
                        : 'bg-slate-200 dark:bg-navy-950 border border-slate-300 dark:border-white/10'
                }`}
            >
                <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${
                        checked ? 'left-7 scale-110' : 'left-1'
                    }`}
                />
            </button>
        </div>
    );
};

export default ToggleSwitch;
