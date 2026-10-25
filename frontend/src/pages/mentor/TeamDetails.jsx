import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Send,
  Save,
  ArrowLeft,
  Award,
  Code2,
  Layers,
  AlertTriangle,
  FileCheck,
  Video,
  Plus
} from 'lucide-react';

const GitHubIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);
import { useMentor } from '../../context/MentorContext';
import apiClient from '../../api/api';
import { createMeeting, getMentorMeetings } from '../../api/mentorApi';
import TeamChat from '../../components/TeamChat';

export default function TeamDetails() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { openScheduleModal, addToast, triggerRefresh } = useMentor();

  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [meetings, setMeetings] = useState([]);

  // Mentor Feedback state
  const [feedbackText, setFeedbackText] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savedDraft, setSavedDraft] = useState('');

  // Rubric Scores
  const [rubricScores, setRubricScores] = useState({
    innovation: 0,
    feasibility: 0,
    execution: 0,
    presentation: 0,
  });

  // Load team data
  const loadTeamData = useCallback(async () => {
    setLoading(true);
    try {
      // Try real backend endpoint first
      const { data } = await apiClient.get(`/mentor/teams/${teamId}/mentorship`);
      if (data?.data) {
        setTeam(data.data);
      }
    } catch (err) {
      console.error('Failed to load team details:', err);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  // Load meetings
  useEffect(() => {
    getMentorMeetings(true)
      .then((records) => {
        setMeetings(Array.isArray(records) ? records.filter((m) => String(m.teamId) === String(teamId)) : []);
      })
      .catch((error) => {
        console.error('Failed to load team meetings:', error);
        setMeetings([]);
      });
  }, [teamId]);

  // Feedback drafts and submissions are loaded and saved through the MongoDB API.
  useEffect(() => {
    apiClient.get(`/mentor/feedback/team/${teamId}`).then(({ data }) => {
      const draft = data?.draft;
      if (draft) {
        const text = draft.guidance || draft.content || '';
        setFeedbackText(text);
        setSavedDraft(text);
        setRubricScores((current) => ({ ...current, ...(draft.criteriaRatings || {}) }));
      }
    }).catch((error) => console.error('Could not load saved feedback:', error));
  }, [teamId]);

  const handleSaveFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSavingFeedback(true);
    try {
      await apiClient.post('/mentor/feedback', {
        teamId,
        status: 'draft',
        guidance: feedbackText,
        criteriaRatings: rubricScores,
      });
      setSavedDraft(feedbackText);
      addToast('Feedback Draft Saved', 'Your draft was saved to the database.', 'success');
    } catch (error) {
      console.error('Feedback draft save failed:', error);
      addToast('Could not save draft', 'The database did not save your feedback.', 'error');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      addToast('Empty Feedback', 'Please enter some feedback for the team.', 'error');
      return;
    }
    setSavingFeedback(true);
    try {
      await apiClient.post('/mentor/feedback', {
        teamId,
        status: 'submitted',
        guidance: feedbackText,
        criteriaRatings: rubricScores,
      });
      setSavedDraft('');
      setFeedbackText('');
      addToast('Feedback Sent!', `Your feedback was shared with ${team?.name}.`, 'success');
      triggerRefresh();
    } catch (error) {
      console.error('Feedback submission failed:', error);
      addToast('Unable to send feedback', 'The database did not accept this feedback. Check the required ratings and try again.', 'error');
    } finally {
      setSavingFeedback(false);
    }
  };

  const tabs = ['Overview', 'Members', 'Project', 'Progress', 'Feedback', 'Sessions'];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-slate-400 animate-pulse">
        Loading team details...
      </div>
    );
  }

  if (!team) return <div role="status" className="max-w-6xl mx-auto py-12 text-center text-slate-500">Team details are unavailable.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Back button */}
      <Link
        to="/mentor/teams"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#2563eb] dark:hover:text-blue-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Mentored Teams
      </Link>

      {/* ================================================== */}
      {/* TEAM HEADER */}
      {/* ================================================== */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-[#2563eb] dark:text-blue-400 font-extrabold text-xl flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/40 shadow-xs">
            {team.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {team.name}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-[#2563eb] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                {team.status || 'On Track'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {team.hackathon} · <span className="font-semibold text-slate-700 dark:text-slate-300">{team.domain}</span>
            </p>

            {/* Team Members small avatars */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                {(team.members || []).map((m, i) => (
                  <img
                    key={i}
                    src={m.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`}
                    alt={m.name}
                    title={m.name}
                    className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-navy-900 object-cover"
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {team.members?.length || 4} Members
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
          <button
            onClick={() => openScheduleModal({ teamId: team.id, teamName: team.name })}
            className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-xs shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            Schedule Session
          </button>
          <button
            onClick={() => setActiveTab('Feedback')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#2563eb]" />
            Send Feedback
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* NAVIGATION TABS */}
      {/* ================================================== */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab
                ? 'border-[#2563eb] text-[#2563eb] dark:text-blue-400 dark:border-blue-500'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ================================================== */}
      {/* TAB CONTENT */}
      {/* ================================================== */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Project Details & Goals */}
          <div className="lg:col-span-7 space-y-6">
            {/* Description & Progress */}
            <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Project Description
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {team.description}
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">Overall Progress</span>
                  <span className="text-[#2563eb] dark:text-blue-400">{team.progress}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563eb] rounded-full transition-all duration-500"
                    style={{ width: `${team.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Goals & Milestones */}
            <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Sprint Goals & Deliverables
                </h2>
                <span className="text-xs font-semibold text-[#2563eb] dark:text-blue-400">
                  {team.goals?.filter((g) => g.done).length} of {team.goals?.length} Completed
                </span>
              </div>
              <div className="space-y-2.5 pt-1">
                {(team.goals || []).map((goal) => (
                  <div
                    key={goal.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                      goal.done
                        ? 'bg-emerald-50/50 border-emerald-200/70 text-slate-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-slate-200'
                        : 'bg-slate-50 border-slate-200/70 text-slate-700 dark:bg-navy-950/30 dark:border-white/5 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          goal.done
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {goal.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className={goal.done ? 'line-through text-slate-400' : ''}>
                        {goal.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{goal.due}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technologies */}
            <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Technologies & Stack
              </h2>
              <div className="flex flex-wrap gap-2 pt-1">
                {(team.technologies || []).map((tech, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-[#2563eb] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Challenges */}
            <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Key Challenges & Blockers
              </h2>
              <div className="space-y-2 pt-1">
                {(team.challenges || []).map((ch, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{ch}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Mentor Feedback Panel & Recent Activity */}
          <div className="lg:col-span-5 space-y-6">
            {/* MENTOR FEEDBACK PANEL */}
            <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#2563eb]" /> Mentor Feedback
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Direct guidance, code suggestions, and review commentary
                </p>
              </div>

              <textarea
                rows={5}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your feedback with this team..."
                className="w-full p-3.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  {savedDraft && savedDraft === feedbackText ? 'Draft saved' : ''}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    disabled={savingFeedback || !feedbackText.trim()}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Feedback
                  </button>
                  <button
                    type="button"
                    onClick={handleSendFeedback}
                    disabled={savingFeedback || !feedbackText.trim()}
                    className="px-4 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-xs shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Feedback
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Recent Team Activity
              </h2>
              <div className="space-y-3 pt-1">
                {(team.recentActivity || []).map((act, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#2563eb] mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {act.text}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Project Links
              </h2>
              <div className="space-y-2 pt-1 text-xs">
                {team.links?.github && (
                  <a
                    href={team.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-white/5 hover:border-[#2563eb] text-slate-800 dark:text-slate-200 font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <GitHubIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      GitHub Repository
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                )}
                {team.links?.demo && (
                  <a
                    href={team.links.demo}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200/80 dark:border-white/5 hover:border-[#2563eb] text-slate-800 dark:text-slate-200 font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[#2563eb]" />
                      Live Demo Prototype
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MEMBERS TAB */}
      {activeTab === 'Members' && (
        <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Team Members ({team.members?.length || 4})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(team.members || []).map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20 text-center flex flex-col items-center"
              >
                <img
                  src={m.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`}
                  alt={m.name}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-100 dark:ring-blue-900/40 mb-3"
                />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{m.name}</h3>
                <p className="text-xs text-[#2563eb] dark:text-blue-400 font-medium mt-0.5">
                  {m.role}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{m.email}</p>
                <button
                  onClick={() => navigate('/mentor/messages')}
                  className="mt-4 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Direct Message
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PROJECT TAB */}
      {activeTab === 'Project' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Project Architecture & Repository
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {team.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20">
                <span className="text-xs font-bold text-slate-400 block mb-1">Architecture</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">Client-Server REST + WS</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20">
                <span className="text-xs font-bold text-slate-400 block mb-1">Hosting</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">AWS ECS & Vercel</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20">
                <span className="text-xs font-bold text-slate-400 block mb-1">Database</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">MongoDB Atlas + Redis</span>
              </div>
            </div>
          </div>

          {/* Embedded Team Chat preview */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
            <TeamChat team={{ id: team.id, name: team.name, domain: team.domain, members: team.members?.length || 4 }} />
          </div>
        </div>
      )}

      {/* 4. PROGRESS TAB */}
      {activeTab === 'Progress' && (
        <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Progress Analytics</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Weekly velocity and completion percentage</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
              {team.progress}% Total Progress
            </span>
          </div>

          <div className="p-6 rounded-xl bg-slate-50 dark:bg-navy-950/40 border border-slate-200/60 dark:border-white/5">
            <div className="h-40 flex items-end justify-between gap-3 pt-6 px-4">
              {[
                { day: 'Day 1', val: 20 },
                { day: 'Day 2', val: 38 },
                { day: 'Day 3', val: 54 },
                { day: 'Day 4', val: 62 },
                { day: 'Day 5', val: 72 },
                { day: 'Day 6', val: 72 },
                { day: 'Today', val: team.progress || 72 },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-[#2563eb]">{bar.val}%</span>
                  <div
                    className="w-full max-w-[42px] bg-[#2563eb] hover:bg-[#1d4ed8] rounded-t-lg transition-all"
                    style={{ height: `${bar.val}%` }}
                  />
                  <span className="text-[10px] text-slate-400 font-medium">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. FEEDBACK TAB */}
      {activeTab === 'Feedback' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Evaluate Project & Provide Feedback
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Score across rubric dimensions from 1 to 10
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {Object.entries(rubricScores).map(([key, val]) => (
                <div key={key} className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold capitalize text-slate-700 dark:text-slate-300">
                      {key}
                    </span>
                    <span className="text-sm font-extrabold text-[#2563eb]">{val}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={val}
                    onChange={(e) => setRubricScores({ ...rubricScores, [key]: Number(e.target.value) })}
                    className="w-full accent-[#2563eb] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-2">
                Feedback Commentary
              </label>
              <textarea
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your structured feedback with this team..."
                className="w-full p-3.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveFeedback}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Save Feedback
              </button>
              <button
                type="button"
                onClick={handleSendFeedback}
                className="px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SESSIONS TAB */}
      {activeTab === 'Sessions' && (
        <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Scheduled Consultations with {team.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1-on-1 code reviews and milestone checkpoints
              </p>
            </div>
            <button
              onClick={() => openScheduleModal({ teamId: team.id, teamName: team.name })}
              className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Session
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {meetings.map((m) => (
              <div
                key={m.id || m._id}
                className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#2563eb] dark:text-blue-400 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(m.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {m.location || 'Google Meet'}
                    </p>
                  </div>
                </div>

                {m.meetingLink && (
                  <a
                    href={m.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 self-end sm:self-center cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Join Call
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
