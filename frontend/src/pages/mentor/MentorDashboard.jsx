import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ClipboardCheck, Inbox, Leaf, Users } from 'lucide-react';
import { fetchMentorDashboard } from '../../services/mentor/dashboardApi';
import { updateMentorshipRequestStatus } from '../../services/mentor/mentorshipRequestsApi';
import { useMentor } from '../../context/MentorContext';

const dateTime = (value) => value ? new Date(value).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const dateOnly = (value) => value ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

export default function MentorDashboard() {
  const navigate = useNavigate();
  const { globalSearch, refreshKey, triggerRefresh, addToast } = useMentor();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchMentorDashboard());
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not load mentor dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard, refreshKey]);

  const teams = data?.teams || [];
  const requests = (data?.requests || []).filter((request) => request.status === 'pending');
  const meetings = data?.upcomingMeetings || [];
  const query = globalSearch.trim().toLowerCase();
  const visibleTeams = useMemo(() => query
    ? teams.filter((team) => `${team.team || ''} ${team.project || ''} ${team.stage || ''}`.toLowerCase().includes(query))
    : teams, [teams, query]);
  const visibleRequests = useMemo(() => query
    ? requests.filter((request) => `${request.teamName || ''} ${request.track || ''} ${request.message || ''}`.toLowerCase().includes(query))
    : requests, [requests, query]);

  const decline = async (request) => {
    try {
      await updateMentorshipRequestStatus(request.id, 'reject');
      addToast('Request declined', `Declined ${request.teamName}'s request.`, 'info');
      triggerRefresh();
    } catch (requestError) {
      addToast('Could not decline request', requestError.response?.data?.detail || 'Please try again.', 'error');
    }
  };

  const summary = data?.summary || {};
  const stats = [
    { title: 'Mentorship Requests', value: summary.mentorshipRequests ?? 0, icon: Inbox, color: 'text-violet-700' },
    { title: 'Active Teams', value: summary.activeTeams ?? 0, icon: Users, color: 'text-violet-700' },
    { title: 'Pending Feedback', value: summary.pendingFeedback ?? 0, icon: ClipboardCheck, color: 'text-rose-700' },
    { title: 'Completed Mentorships', value: summary.completedMentorships ?? 0, icon: CheckCircle2, color: 'text-violet-700' },
  ];

  return (
    <div className="mx-auto max-w-[1480px] space-y-7 pt-2 pb-10 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {data?.mentor?.name || 'Mentor'}</h1>
        <p className="mt-1 text-sm text-slate-500">Here is what is happening with your teams.</p>
      </div>

      {error && <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button onClick={loadDashboard} className="font-semibold underline">Retry</button></div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Mentor summary">
        {stats.map(({ title, value, icon: Icon, color }) => (
          <Link key={title} to={title === 'Mentorship Requests' ? '/mentor/requests' : title === 'Pending Feedback' ? '/mentor/feedback' : '/mentor/teams'} className="rounded-2xl border border-slate-300 bg-white p-6 transition hover:border-violet-400 hover:shadow-sm dark:border-white/10 dark:bg-[#111625]">
            <div className="flex items-start justify-between gap-4"><span className="max-w-44 text-xs font-bold uppercase tracking-wide text-slate-600">{title}</span><Icon className={`h-5 w-5 ${color}`} /></div>
            <p className="mt-3 text-4xl font-bold">{loading ? '—' : value}</p>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white dark:border-white/10 dark:bg-[#111625]">
          <div className="flex items-center justify-between border-b border-slate-300 px-6 py-5 dark:border-white/10"><h2 className="text-xl font-bold">Mentorship Requests</h2><Link className="text-sm font-semibold text-violet-700 hover:underline" to="/mentor/requests">View all</Link></div>
          {loading ? <p className="p-6 text-sm text-slate-500">Loading requests…</p> : visibleRequests.length ? (
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {visibleRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_0.8fr_auto] sm:items-center">
                  <div><p className="font-semibold">{request.teamName || 'Team'}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{request.message || request.track || 'Mentorship request'}</p></div>
                  <p className="text-sm text-slate-600">{request.track || '—'}{request.createdAt ? ` · ${dateOnly(request.createdAt)}` : ''}</p>
                  <div className="flex gap-2"><button onClick={() => decline(request)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-white/20 dark:hover:bg-white/5">Decline</button><button onClick={() => navigate('/mentor/requests')} className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800">View Request</button></div>
                </div>
              ))}
            </div>
          ) : <p className="p-6 text-sm text-slate-500">No pending mentorship requests.</p>}
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-6 dark:border-white/10 dark:bg-[#111625]">
          <div className="flex items-center justify-between border-b border-slate-300 pb-4 dark:border-white/10"><h2 className="text-xl font-bold">Upcoming Activities</h2><Link to="/mentor/sessions" className="text-sm font-semibold text-violet-700 hover:underline">Calendar</Link></div>
          {loading ? <p className="pt-5 text-sm text-slate-500">Loading activities…</p> : meetings.length ? <div className="mt-5 space-y-5">{meetings.slice(0, 4).map((meeting) => <div key={meeting.id} className="flex gap-3"><span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-violet-600 ring-4 ring-violet-100"/><div><p className="text-sm font-semibold text-violet-700">{dateTime(meeting.startTime)}</p><p className="mt-1 font-semibold">{meeting.title || 'Mentoring session'} · {meeting.teamName || 'Team'}</p>{meeting.location && <p className="mt-1 text-sm text-slate-500">{meeting.location}</p>}</div></div>)}</div> : <p className="pt-5 text-sm text-slate-500">No upcoming activities scheduled.</p>}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-300 bg-white p-6 dark:border-white/10 dark:bg-[#111625]">
        <div className="flex items-center justify-between border-b border-slate-300 pb-4 dark:border-white/10"><h2 className="text-xl font-bold">Active Teams</h2><Link to="/mentor/teams" className="font-semibold text-violet-700 hover:underline">View All</Link></div>
        {loading ? <p className="pt-5 text-sm text-slate-500">Loading teams…</p> : visibleTeams.length ? <div className="divide-y divide-slate-100 dark:divide-white/10">{visibleTeams.slice(0, 6).map((team) => <Link key={team.id} to={`/mentor/teams/${team.id}`} className="grid gap-3 py-4 transition hover:bg-violet-50/40 sm:grid-cols-[minmax(150px,0.8fr)_minmax(180px,2fr)_auto] sm:items-center dark:hover:bg-white/5"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Leaf className="h-5 w-5"/></span><span><strong className="block">{team.team || 'Team'}</strong><span className="text-xs text-slate-500">{team.stage || 'No milestone recorded'}</span></span></div><div><div className="mb-2 flex justify-between text-xs"><span className="text-slate-500">Progress</span><span>{team.progress ?? 0}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(100, Math.max(0, Number(team.progress) || 0))}%` }}/></div></div><span className="text-xs text-slate-500">{team.lastActivity ? `Updated ${dateTime(team.lastActivity)}` : 'No recent activity'}</span></Link>)}</div> : <p className="pt-5 text-sm text-slate-500">No active teams assigned yet.</p>}
      </section>

      <div className="flex flex-wrap gap-3 text-sm">{[[CalendarDays, 'Schedule a session', '/mentor/sessions'], [ClipboardCheck, 'Review feedback', '/mentor/feedback'], [Users, 'Open team workspace', '/mentor/teams']].map(([Icon, label, to]) => <Link key={to} to={to} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold hover:border-violet-400 dark:border-white/10 dark:bg-[#111625]"><Icon className="h-4 w-4 text-violet-700"/>{label}</Link>)}</div>
    </div>
  );
}
