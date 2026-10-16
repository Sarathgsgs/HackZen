import React from 'react';
import { X, HelpCircle, BookOpen, MessageCircle, Mail, ExternalLink, ShieldCheck } from 'lucide-react';
import { useMentor } from '../../context/MentorContext';

export default function HelpSupportModal() {
  const { isHelpModalOpen, closeHelpModal } = useMentor();

  if (!isHelpModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-navy-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/10 bg-[#FAFAFD] dark:bg-navy-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-[#5B45D9] dark:text-purple-300 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mentor Help & Support</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">Resources, guidelines, and direct support</p>
            </div>
          </div>
          <button
            onClick={closeHelpModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Frequently Asked Questions</h3>
            
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-navy-950/50">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">How do I schedule a mentorship session?</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Click "Schedule a Session" from your dashboard or team page. Fill in the meeting platform, date, and agenda. A reminder will be sent to team members.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-navy-950/50">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">How is team progress calculated?</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Progress reflects completed milestones, code reviews, and mentor checkpoint approvals throughout the hackathon lifecycle.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-navy-950/50">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Where do I submit milestone feedback?</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Go to "Teams", select the team, and use the "Mentor Feedback" panel or structured rubric under the Feedback tab.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Need Immediate Help?</h3>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="mailto:support@proeduvate.com"
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#5B45D9] dark:hover:border-purple-500/50 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <Mail className="w-4 h-4 text-[#5B45D9]" />
                support@proeduvate.com
              </a>
              <div
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                Hackathon Ops: 24/7
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-[#FAFAFD] dark:bg-navy-950/40">
          <button
            onClick={closeHelpModal}
            className="px-5 py-2.5 rounded-xl bg-[#5B45D9] text-white text-sm font-semibold hover:bg-[#4E3AC2] transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
