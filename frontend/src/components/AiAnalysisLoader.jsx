import React from 'react';

/**
 * AI Multi-Ring Pulse Animation Loader (Uiverse.io by Nawsome)
 */
export const AiAnalysisLoader = ({ label = "Performing AI Analysis...", subtext = "Evaluating repository deliverables, originality, and scoring rubrics..." }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in duration-300">
            {/* Multi-Ring SVG Loader */}
            <div className="relative flex items-center justify-center">
                <svg className="pl" width="240" height="240" viewBox="0 0 240 240">
                    <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
                </svg>
            </div>

            <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{label}</h4>
                {subtext && <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 max-w-sm">{subtext}</p>}
            </div>
        </div>
    );
};

export default AiAnalysisLoader;
