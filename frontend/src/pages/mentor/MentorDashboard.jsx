import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Inbox,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Clock,
  Video,
  FileText,
  Plus,
  Share2,
  ListChecks,
  ExternalLink,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Eye,
  Check,
  X,
  Trophy
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { fetchMentorDashboard } from '../../services/mentor/dashboardApi';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';
import { fetchMentorshipRequests, updateMentorshipRequestStatus } from '../../services/mentor/mentorshipRequestsApi';
import { getMentorMeetings } from '../../api/mentorApi';
import { fetchMentorHackathons } from '../../services/mentor/hackathonsApi';

export default function MentorDashboard() {
  const navigate = useNavigate();
  const { openScheduleModal, openRequestModal, addToast, refreshKey, triggerRefresh, globalSearch } = useMentor();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [requests, setRequests] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [hackathons, setHackathons] = useState([]);

  // Load real API data with robust fallback
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, teamsRes, reqsRes, meetingsRes, hackathonsRes] = await Promise.allSettled([
        fetchMentorDashboard(),
        fetchAssignedTeams(),
        fetchMentorshipRequests('pending'),
        getMentorMeetings(true),
        fetchMentorHackathons(),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value) {
        setDashboardData(dashRes.value);
      }

      setTeams(teamsRes.status === 'fulfilled' ? (teamsRes.value?.activeTeams || []) : []);
      setRequests(reqsRes.status === 'fulfilled' ? (reqsRes.value || []) : []);
      setMeetings(meetingsRes.status === 'fulfilled' ? (meetingsRes.value || []) : []);
      setHackathons(hackathonsRes.status === 'fulfilled' ? (hackathonsRes.value || []) : []);
    } catch (e) {
      console.error('Error loading mentor dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Handle Quick Accept / Decline directly from dashboard
  const handleQuickAccept = (request) => {
    openRequestModal(request);
  };

  const handleQuickDecline = async (requestId, teamName) => {
    try {
      await updateMentorshipRequestStatus(requestId, 'reject');
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      addToast('Request Declined', `Declined mentorship request from ${teamName}.`, 'info');
      triggerRefresh();
    } catch (e) {
      console.error('Mentorship request update failed:', e);
      addToast('Unable to decline request', 'The database did not save this change.', 'error');
    }
  };

  // 4 Top Summary Stats
  const stats = useMemo(() => {
    const summary = dashboardData?.summary || {};
    return [
      {
        id: 'active-teams',
        title: 'Active Teams',
        value: summary.activeTeams ?? teams.length,
        subtitle: 'Currently mentoring',
        icon: Users,
        iconBg: 'bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300',
        path: '/mentor/teams',
      },
      {
        id: 'pending-requests',
        title: 'Pending Requests',
        value: summary.mentorshipRequests ?? requests.length,
        subtitle: 'Need your attention',
        icon: Inbox,
        iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
        path: '/mentor/requests',
      },
      {
        id: 'upcoming-sessions',
        title: 'Upcoming Sessions',
        value: summary.upcomingMeetings ?? meetings.length,
        subtitle: 'This week',
        icon: Calendar,
        iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
        path: '/mentor/sessions',
      },
      {
        id: 'completed-mentorships',
        title: 'Completed Mentorships',
        value: summary.completedMentorships ?? 0,
        subtitle: 'Total completed',
        icon: CheckCircle2,
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
        path: '/mentor/teams',
      },
    ];
  }, [dashboardData, teams.length, requests.length, meetings.length]);

  // Filtered teams if global search has content
  const filteredTeams = useMemo(() => {
    if (!globalSearch.trim()) return teams;
    const q = globalSearch.toLowerCase();
    return teams.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.hackathon?.toLowerCase().includes(q) ||
        t.domain?.toLowerCase().includes(q)
    );
  }, [teams, globalSearch]);

  const recentActivities = useMemo(() => (dashboardData?.todayActivity || []).map((activity) => ({
    id: activity.id,
    text: activity.description,
    timestamp: activity.timestamp ? new Date(activity.timestamp).toLocaleString() : '',
    icon: activity.type === 'progress' ? TrendingUp : CheckCircle2,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
  })), [dashboardData]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ================================================== */}
      {/* 4 SUMMARY STAT CARDS */}
      {/* ================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              onClick={() => navigate(stat.path)}
              className="group p-5 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md hover:border-[#5B45D9]/40 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stat.title}
                </span>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${stat.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">
                  {stat.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* ================================================== */}
      {/* MAIN TWO-COLUMN LAYOUT */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================================================== */}
        {/* LEFT / LARGER COLUMN (span 8) */}
        {/* ================================================== */}
        <div className="lg:col-span-8 space-y-8">
          {/* SECTION: TEAMS YOU'RE MENTORING */}
          <section className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Teams You're Mentoring
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time milestones and progress for assigned cohorts
                </p>
              </div>
              <Link
                to="/mentor/teams"
                className="text-xs font-bold text-[#5B45D9] dark:text-purple-300 hover:underline flex items-center gap-1"
              >
                View all teams <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Teams Grid / List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeams.slice(0, 4).map((team) => {
                const status = team.status || (team.progress >= 75 ? 'On Track' : team.progress < 40 ? 'Needs Attention' : 'On Track');
                const isNeedsAttention = status === 'Needs Attention';
                const isCompleted = status === 'Completed';

                return (
                  <div
                    key={team.id}
                    className="p-5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/30 hover:border-[#5B45D9]/50 hover:bg-white dark:hover:bg-navy-900/60 transition-all flex flex-col justify-between group shadow-2xs"
                  >
                    <div>
                      {/* Top Team Info & Status Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] dark:group-hover:text-purple-300 transition-colors">
                            {team.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {team.hackathon || 'Hackathon not set'}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-full shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                              : isNeedsAttention
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                              : 'bg-purple-50 text-[#5B45D9] dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      {/* Team Member Avatars & Count */}
                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex -space-x-2 overflow-hidden">
                          {(team.avatars || [
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80',
                          ]).map((avatar, idx) => (
                            <img
                              key={idx}
                              src={avatar}
                              alt="member"
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-navy-900 object-cover"
                            />
                          ))}
                        </div>
                        <span className="font-medium">
                          {team.members || 4} members
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                          <span className="text-slate-600 dark:text-slate-300">
                            Progress
                          </span>
                          <span className="text-[#5B45D9] dark:text-purple-300">
                            {team.progress || 0}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#5B45D9] dark:bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, team.progress || 0))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Last Activity + View Team Button */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        Last activity: {team.lastActivity || '2 hours ago'}
                      </span>
                      <button
                        onClick={() => navigate(`/mentor/teams/${team.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 hover:border-[#5B45D9] text-[#5B45D9] dark:text-purple-300 font-bold hover:bg-[#5B45D9] hover:text-white dark:hover:bg-[#5B45D9] transition-all shadow-xs"
                      >
                        View Team
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION: MENTORSHIP REQUESTS */}
          <section className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mentorship Requests
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Teams awaiting your acceptance and technical guidance
                </p>
              </div>
              <Link
                to="/mentor/requests"
                className="text-xs font-bold text-[#5B45D9] dark:text-purple-300 hover:underline flex items-center gap-1"
              >
                View all ({requests.length}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No pending mentorship requests at this time.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20 hover:border-slate-300 dark:hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Team info & Request Preview */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-[#5B45D9] dark:text-purple-300 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-100 dark:border-purple-800/40">
                        {req.teamName?.charAt(0) || 'T'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {req.teamName}
                          </h4>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
                            {req.domain || req.track || 'Artificial Intelligence'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 italic">
                          "{req.description || req.message || 'Looking for guidance with our AI recommendation model.'}"
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Topic: <span className="font-medium text-slate-700 dark:text-slate-300">{req.domain || req.track || 'Artificial Intelligence'}</span> · Requested: {req.requestedDate || 'Today'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: [Accept] [Decline] */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleQuickDecline(req.id, req.teamName)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleQuickAccept(req)}
                        className="px-4 py-1.5 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs shadow-purple-500/20 transition-all"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ================================================== */}
        {/* RIGHT COLUMN (span 4) */}
        {/* ================================================== */}
        <div className="lg:col-span-4 space-y-8">
          {/* SECTION: UPCOMING SESSIONS */}
          <section className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Upcoming Sessions
              </h2>
              <button
                onClick={() => openScheduleModal()}
                className="text-xs font-bold text-[#5B45D9] dark:text-purple-300 hover:underline flex items-center gap-1"
              >
                + Schedule
              </button>
            </div>

            {/* Vertical timeline/list */}
            <div className="space-y-4">
              {meetings.slice(0, 3).map((session, index) => {
                const dateLabel = session.dateLabel || (session.startTime ? new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today');
                const timeLabel = session.timeLabel || (session.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:30 AM');

                return (
                  <div
                    key={session.id || index}
                    className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20 hover:border-purple-200 dark:hover:border-purple-900/40 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#5B45D9] dark:text-purple-300">
                        {dateLabel} · {timeLabel}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-50 dark:bg-purple-950/40 text-[#5B45D9] dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                        {session.meetingType || session.type || 'Google Meet'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {session.teamName || session.team || 'Assigned team'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {session.topic || session.title || 'Project Architecture Review'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-end">
                      {session.link || session.meetingLink ? (
                        <a
                          href={session.link || session.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Session
                        </a>
                      ) : (
                        <button
                          onClick={() => navigate('/mentor/sessions')}
                          className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-[#5B45D9] hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 text-center border-t border-slate-100 dark:border-white/5">
              <Link
                to="/mentor/sessions"
                className="text-xs font-bold text-[#5B45D9] dark:text-purple-300 hover:underline"
              >
                View full calendar & session history →
              </Link>
            </div>
          </section>

          {/* SECTION: MENTOR ACTIVITY */}
          <section className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Mentor Activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Recent mentorship log and submissions
            </p>

            <div className="space-y-4">
              {recentActivities.map((act) => {
                const Icon = act.icon;
                return (
                  <div key={act.id} className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${act.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                        {act.text}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {act.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ================================================== */}
      {/* SECTION: UPCOMING HACKATHONS */}
      {/* ================================================== */}
      <section className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#5B45D9] dark:text-purple-300" />
              Upcoming Hackathons
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Explore upcoming hackathon cohorts and events seeking technical mentors
            </p>
          </div>
          <button
            onClick={() => navigate('/mentor/hackathons')}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-[#5B45D9] dark:text-purple-300 hover:bg-[#F2EEFD] dark:hover:bg-purple-950/30 transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
          >
            View All Hackathons <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hackathons.filter((item) => item.status === 'Upcoming' || item.status === 'Ongoing').slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/20 hover:border-[#5B45D9]/40 hover:bg-white dark:hover:bg-navy-900/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.prizePool || item.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] dark:group-hover:text-purple-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {item.organizer}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.startDate ? new Date(item.startDate).toLocaleDateString() : 'Dates not announced'}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  {item.status}
                </span>
                <button
                  onClick={() => navigate('/mentor/hackathons')}
                  className="text-xs font-bold text-[#5B45D9] dark:text-purple-300 hover:underline flex items-center gap-1"
                >
                  Explore <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================== */}
      {/* BOTTOM SECTION: QUICK ACTIONS */}
      {/* ================================================== */}
      <section className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Quick Actions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Key tools and shortcuts for fast cohort management
          </p>
        </div>

        {/* 5 Compact Cards/Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. My Hackathons */}
          <button
            onClick={() => navigate('/mentor/hackathons')}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#FAFAFD]/60 dark:bg-navy-950/30 hover:border-[#5B45D9] hover:bg-white dark:hover:bg-navy-900 transition-all text-left group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5B45D9] dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors">
                My Hackathons
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Cohorts & events</p>
            </div>
          </button>

          {/* 2. Schedule a Session */}
          <button
            onClick={() => openScheduleModal()}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#FAFAFD]/60 dark:bg-navy-950/30 hover:border-[#5B45D9] hover:bg-white dark:hover:bg-navy-900 transition-all text-left group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors">
                Schedule Session
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">1-on-1 or group call</p>
            </div>
          </button>

          {/* 3. Review Teams */}
          <button
            onClick={() => navigate('/mentor/teams')}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#FAFAFD]/60 dark:bg-navy-950/30 hover:border-[#5B45D9] hover:bg-white dark:hover:bg-navy-900 transition-all text-left group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors">
                Review Teams
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Active cohorts</p>
            </div>
          </button>

          {/* 4. View Requests */}
          <button
            onClick={() => navigate('/mentor/requests')}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#FAFAFD]/60 dark:bg-navy-950/30 hover:border-[#5B45D9] hover:bg-white dark:hover:bg-navy-900 transition-all text-left group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors">
                View Requests
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Team applications</p>
            </div>
          </button>

          {/* 5. Share Resource */}
          <button
            onClick={() => navigate('/mentor/resources')}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#FAFAFD]/60 dark:bg-navy-950/30 hover:border-[#5B45D9] hover:bg-white dark:hover:bg-navy-900 transition-all text-left group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors">
                Share Resource
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Guides & templates</p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
