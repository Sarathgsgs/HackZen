import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, Users, Link as LinkIcon, FileText, CheckCircle2 } from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { createMeeting } from '../../api/mentorApi';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';

export default function ScheduleSessionModal() {
  const { isScheduleModalOpen, scheduleModalData, closeScheduleModal, addToast, triggerRefresh } = useMentor();

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    teamId: '',
    title: '',
    topic: 'Architecture Review',
    date: '',
    time: '14:00',
    duration: '45',
    meetingType: 'Google Meet',
    meetingLink: '',
    description: '',
  });

  useEffect(() => {
    if (isScheduleModalOpen) {
      // Default to tomorrow or today + 2 hours
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 1);
      const dateStr = nextDate.toISOString().split('T')[0];

      setFormData((prev) => ({
        ...prev,
        teamId: scheduleModalData.teamId || '',
        title: scheduleModalData.title || (scheduleModalData.teamName ? `Consultation with ${scheduleModalData.teamName}` : 'Project Architecture Review'),
        topic: scheduleModalData.topic || 'Architecture Review',
        date: scheduleModalData.date || dateStr,
        time: scheduleModalData.time || '14:00',
        duration: '45',
        meetingType: 'Google Meet',
        meetingLink: scheduleModalData.meetingLink || '',
        description: scheduleModalData.description || 'Discuss sprint milestones, technical architecture, and answer team questions.',
      }));

      // Load teams for dropdown
      setLoadingTeams(true);
      fetchAssignedTeams()
        .then((res) => {
          const list = res?.activeTeams || [];
          setTeams(list);
          if (list.length > 0 && !scheduleModalData.teamId) {
            setFormData((f) => ({ ...f, teamId: list[0].id }));
          }
        })
        .catch((error) => {
          setTeams([]);
          addToast('Teams unavailable', 'Could not load your assigned teams from the database.', 'error');
          console.error('Assigned teams load failed:', error);
        })
        .finally(() => setLoadingTeams(false));
    }
  }, [isScheduleModalOpen, scheduleModalData]);

  if (!isScheduleModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time) {
      addToast('Missing Information', 'Please fill in all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTeam = teams.find((t) => t.id === formData.teamId) || { name: 'Assigned Team' };
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const durationMinutes = parseInt(formData.duration || '45', 10);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

      await createMeeting({
          teamId: formData.teamId,
        title: formData.title,
          description: formData.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: formData.meetingType,
          meetingLink: formData.meetingLink,
        });

      addToast('Session Scheduled!', `Meeting with ${selectedTeam.name} scheduled for ${formData.date} at ${formData.time}.`, 'success');
      triggerRefresh();
      closeScheduleModal();
    } catch (err) {
      console.error(err);
      addToast('Error', 'Unable to schedule session. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-navy-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/10 bg-[#FAFAFD] dark:bg-navy-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-[#5B45D9] dark:text-purple-300 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Mentorship Session</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">Set up a 1-on-1 or team consultation</p>
            </div>
          </div>
          <button
            onClick={closeScheduleModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Team Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
              Select Team <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9] focus:ring-1 focus:ring-[#5B45D9]"
                required
              >
                {loadingTeams && <option>Loading teams...</option>}
                {!loadingTeams && teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.teamName} {t.domain ? `(${t.domain})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Session Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
              Session Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Architecture Review & Cloud Deploy"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9] focus:ring-1 focus:ring-[#5B45D9]"
              required
              disabled={loadingTeams || teams.length === 0}
            />
          </div>

          {/* Topic & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Topic / Category
              </label>
              <select
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              >
                <option value="Architecture Review">Architecture Review</option>
                <option value="AI / ML Model Guidance">AI / ML Model Guidance</option>
                <option value="Frontend & UX Design">Frontend & UX Design</option>
                <option value="Pitch & Presentation Prep">Pitch & Presentation Prep</option>
                <option value="Code Review & Debugging">Code Review & Debugging</option>
                <option value="General Check-in">General Check-in</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Duration
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              >
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
                <option value="90">90 Minutes</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
                required
              />
            </div>
          </div>

          {/* Meeting Platform & Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Meeting Platform
              </label>
              <select
                value={formData.meetingType}
                onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              >
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom Meeting</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Discord">Discord Channel</option>
                <option value="In Person">In Person</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Meeting Link / Room
              </label>
              <input
                type="text"
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              />
            </div>
          </div>

          {/* Agenda / Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
              Agenda & Session Notes
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Outline what you plan to discuss or any prerequisites for the team..."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={closeScheduleModal}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-sm font-semibold shadow-sm shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Scheduling...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
