import React from 'react';

/**
 * AI Analysis Confirmation Popup Card (inspired by Uiverse.io by 00Kubi)
 * Styled with theme-aware subtle button colors and clean typography.
 */
export const AiAnalysisPopup = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Run AI Analysis", 
    description = "Perform automated AI analysis to evaluate requirements, rubrics, similarity, and compliance metrics.",
    confirmText = "Analyze",
    cancelText = "Cancel",
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            <div className="w-[340px] bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl relative flex flex-col items-center justify-center text-center gap-3 text-slate-800 dark:text-white animate-in zoom-in-95 duration-200">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 rounded-lg"
                    aria-label="Close popup"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>


                {/* AI Sparkle Icon Visual */}
                <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-1">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                </div>

                {/* Heading */}
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 leading-relaxed px-2">
                    {description}
                </p>

                {/* Action Buttons with Subtle Styling */}
                <div className="flex items-center justify-center gap-3 pt-2 w-full">
                    <button 
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-2 px-3.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 py-2 px-3.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                    >
                        {isLoading ? 'Analyzing...' : confirmText}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AiAnalysisPopup;
