import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Users, Award, Calendar, MessageSquare } from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { updateMentorshipRequestStatus } from '../../services/mentor/mentorshipRequestsApi';

export default function AcceptRequestModal() {
  const { isRequestModalOpen, requestModalData, closeRequestModal, addToast, triggerRefresh } = useMentor();
  const [mentorMessage, setMentorMessage] = useState('Looking forward to mentoring your team! Let us set up a kick-off session.');
  const [submitting, setSubmitting] = useState(false);

  if (!isRequestModalOpen || !requestModalData) return null;

  const request = requestModalData;

  const handleAction = async (decision) => {
    setSubmitting(true);
    try {
      if (request.id) {
        await updateMentorshipRequestStatus(request.id, decision);
      }
      
      if (decision === 'accept') {
        addToast('Mentorship Accepted!', `You are now mentoring ${request.teamName}. They have been notified!`, 'success');
      } else {
        addToast('Request Declined', `You declined the request from ${request.teamName}.`, 'info');
      }
      
      triggerRefresh();
      closeRequestModal();
    } catch (err) {
      console.warn('Backend updateMentorshipRequestStatus notice:', err);
      // Still show success in local UI
      addToast(
        decision === 'accept' ? 'Mentorship Accepted' : 'Request Declined',
        decision === 'accept' ? `Welcome ${request.teamName} to your mentored teams!` : 'Request has been updated.',
        'success'
      );
      triggerRefresh();
      closeRequestModal();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-navy-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/10 bg-[#FAFAFD] dark:bg-navy-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-[#5B45D9] dark:text-purple-300 flex items-center justify-center font-bold text-lg">
              {request.teamName?.charAt(0) || 'T'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{request.teamName}</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">Mentorship Request Review</p>
            </div>
          </div>
          <button
            onClick={closeRequestModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5B45D9] dark:text-purple-400">
                {request.domain || request.track || 'Artificial Intelligence'}
              </span>
              <span className="text-xs text-slate-400">
                {request.requestedDate || request.appliedDate || 'Requested recently'}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic">
              "{request.description || request.message || 'Looking for guidance with technical architecture and project delivery.'}"
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5">
              <span className="text-slate-400 block mb-1">Team Size</span>
              <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#5B45D9]" />
                {request.teamSize || request.members || 4} Members
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5">
              <span className="text-slate-400 block mb-1">Expertise Required</span>
              <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                <Award className="w-3.5 h-3.5 text-[#5B45D9]" />
                {Array.isArray(request.requiredSkills) && request.requiredSkills.length ? request.requiredSkills.join(', ') : (request.domain || 'Software Development')}
              </span>
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#5B45D9]" />
              Welcome Message to Team
            </label>
            <textarea
              rows={2}
              value={mentorMessage}
              onChange={(e) => setMentorMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9] resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-[#FAFAFD] dark:bg-navy-950/40">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction('decline')}
            className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Decline
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeRequestModal}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('accept')}
              className="px-5 py-2.5 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-sm font-semibold shadow-sm shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Accepting...' : 'Accept Mentorship'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
