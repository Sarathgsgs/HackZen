import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../../api/api';
import { createMeeting, getMentorMeetings } from '../../api/mentorApi';
import TeamChat from '../../components/TeamChat';

const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not submitted';

const formatMemberRole = (role) => {
  if (role === 'leader') return 'Team Lead';
  return String(role || '').split(/[_-]/).filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const toDateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

const getSevenDayProgress = (team) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });
  const history = (team.progressHistory || [])
    .map((point) => ({ date: new Date(point.updatedAt), progress: Number(point.percentage) }))
    .filter((point) => !Number.isNaN(point.date.getTime()) && Number.isFinite(point.progress))
    .sort((a, b) => a.date - b.date);

  if (history.length) {
    let latest = history.filter((point) => point.date < dates[0]).at(-1)?.progress ?? 0;
    return { isDemo: false, points: dates.map((date) => {
      const entries = history.filter((point) => toDateKey(point.date) === toDateKey(date));
      if (entries.length) latest = entries.at(-1).progress;
      return { label: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), progress: Math.max(0, Math.min(100, latest)) };
    }) };
  }

  return { isDemo: false, points: [] };
};

function ProgressChart({ team }) {
  const series = getSevenDayProgress(team);
  const box = { left: 38, top: 14, width: 500, height: 142 };
  const position = (point, index) => ({ x: box.left + (box.width * index) / 6, y: box.top + ((100 - point.progress) / 100) * box.height });
  const path = series.points.map((point, index) => { const { x, y } = position(point, index); return `${index ? 'L' : 'M'} ${x} ${y}`; }).join(' ');
  return <>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Last 7 Days Progress</h2><p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Progress percentage by recorded updates</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">Saved progress</span></div>
    {series.points.length ? <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-navy-900/50"><svg viewBox="0 0 565 200" className="h-auto min-w-[500px] w-full text-purple-700 dark:text-purple-300" role="img" aria-label={`Last seven days progress for ${team.name}`}>
      {[0, 25, 50, 75, 100].map((value) => { const y = box.top + ((100 - value) / 100) * box.height; return <g key={value}><line x1={box.left} x2={box.left + box.width} y1={y} y2={y} stroke="rgba(100,116,139,.28)" /><text x="2" y={y + 4} fill="#64748b" fontSize="10">{value}%</text></g>; })}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {series.points.map((point, index) => { const { x, y } = position(point, index); return <g key={point.label}><circle cx={x} cy={y} r="4" fill="currentColor" stroke="white" strokeWidth="2" /><text x={x} y={Math.max(10, y - 10)} textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="700">{point.progress}%</text><text x={x} y="174" textAnchor="middle" fill="#64748b" fontSize="10">{point.label}</text></g>; })}
      <text x="288" y="195" textAnchor="middle" fill="#6b7280" fontSize="10">Last 7 Days / Dates</text>
    </svg></div> : <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/10">No progress updates have been recorded yet.</p>}
  </>;
}

/** Displays the overview for the team selected from the mentor dashboard. */
export default function TeamMentorshipWorkspace() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [meetingForm, setMeetingForm] = useState({ title: '', description: '', startTime: '', endTime: '', location: '', meetingLink: '' });
  const [meetingStatus, setMeetingStatus] = useState({ loading: false, error: '', success: '' });

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/mentor/teams/${teamId}/mentorship`);
      setTeam(data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to load this team overview.');
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const loadMeetings = useCallback(async () => {
    try {
      const records = await getMentorMeetings(true);
      setMeetings(records.filter((meeting) => meeting.teamId === teamId));
    } catch {
      setMeetings([]);
    }
  }, [teamId]);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  const scheduleMeeting = async (event) => {
    event.preventDefault();
    setMeetingStatus({ loading: true, error: '', success: '' });
    try {
      const meeting = await createMeeting({ ...meetingForm, teamId, startTime: new Date(meetingForm.startTime).toISOString(), endTime: new Date(meetingForm.endTime).toISOString() });
      setMeetings((current) => [...current, meeting].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      setMeetingForm({ title: '', description: '', startTime: '', endTime: '', location: '', meetingLink: '' });
      setMeetingStatus({ loading: false, error: '', success: 'Meeting scheduled. The team will receive a reminder 30 minutes before it starts.' });
    } catch (requestError) {
      setMeetingStatus({ loading: false, success: '', error: requestError.response?.data?.error?.message || requestError.response?.data?.detail || 'Unable to schedule the meeting.' });
    }
  };

  if (loading) return <main className="p-8 text-center text-gray-400">Loading team overview…</main>;
  if (error) return <main className="space-y-4 p-8"><p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-300">{error}</p><Link to="/mentor/teams" className="text-sm font-semibold text-purple-300 hover:text-purple-200">← Back to assigned teams</Link></main>;
  if (!team) return null;
  const teamInitials = team.name.split(' ').filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();

  return <main className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-500">
    <Link to="/mentor/teams" className="inline-flex text-sm font-semibold text-purple-300 hover:text-purple-200">← Assigned teams</Link>

    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-2xl font-bold text-purple-800 dark:bg-purple-500/20 dark:text-purple-200">{teamInitials}</div>
          <div>
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">{team.domain || 'General'}</p>
            <h1 className="mt-1 text-3xl font-bold text-white">{team.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">{team.description}</p>
          </div>
        </div>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-3">
      <Stat label="Current stage" value={team.stage} />
      <Stat label="Team progress" value={`${team.progress}%`} />
      <Stat label="Team members" value={team.memberCount} />
    </section>

    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div><h2 className="text-xl font-bold text-white">Schedule a meeting</h2><p className="mt-1 text-sm text-gray-400">This meeting is saved for {team.name} and appears in the Upcoming Meetings dashboard.</p></div>
      {meetingStatus.error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{meetingStatus.error}</p>}
      {meetingStatus.success && <p role="status" className="mt-4 rounded-lg border border-emerald-700 bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm dark:border-emerald-400 dark:bg-emerald-600">{meetingStatus.success}</p>}
      <form onSubmit={scheduleMeeting} className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Meeting title"><input required value={meetingForm.title} onChange={(event) => setMeetingForm({ ...meetingForm, title: event.target.value })} className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-white outline-none focus:border-purple-400" placeholder="Weekly project review" /></Field>
        <Field label="Location / platform"><input value={meetingForm.location} onChange={(event) => setMeetingForm({ ...meetingForm, location: event.target.value })} className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-white outline-none focus:border-purple-400" placeholder="Google Meet or Room 101" /></Field>
        <Field label="Start time"><input required type="datetime-local" value={meetingForm.startTime} onChange={(event) => setMeetingForm({ ...meetingForm, startTime: event.target.value })} className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-white outline-none focus:border-purple-400" /></Field>
        <Field label="End time"><input required type="datetime-local" value={meetingForm.endTime} onChange={(event) => setMeetingForm({ ...meetingForm, endTime: event.target.value })} className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-white outline-none focus:border-purple-400" /></Field>
        <Field label="Meeting link (optional)"><input type="url" value={meetingForm.meetingLink} onChange={(event) => setMeetingForm({ ...meetingForm, meetingLink: event.target.value })} className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-white outline-none focus:border-purple-400" placeholder="https://meet.google.com/..." /></Field>
        <Field label="Agenda"><input required value={meetingForm.description} onChange={(event) => setMeetingForm({ ...meetingForm, description: event.target.value })} className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-white outline-none focus:border-purple-400" placeholder="Discuss milestones and blockers" /></Field>
        <div className="md:col-span-2"><button disabled={meetingStatus.loading} className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60">{meetingStatus.loading ? 'Scheduling…' : 'Schedule meeting'}</button></div>
      </form>
      <div className="mt-6 border-t border-white/10 pt-5"><h3 className="font-bold text-white">Upcoming for this team</h3>{meetings.length ? <div className="mt-3 space-y-2">{meetings.map((meeting) => <div key={meeting._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-navy-900/50 p-3 text-sm"><span><strong className="text-white">{meeting.title}</strong><span className="ml-2 text-gray-400">{formatDate(meeting.startTime)}</span></span>{meeting.meetingLink && <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="font-semibold text-purple-300 hover:text-purple-200">Join meeting</a>}</div>)}</div> : <p className="mt-3 text-sm text-gray-400">No upcoming meetings for this team.</p>}</div>
    </section>

    <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Team members</h2>
        {team.members.length ? <div className="mt-4 space-y-3">{team.members.filter(member => member.name).map(member => <div key={member.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-navy-900/50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-800 dark:bg-purple-500/20 dark:text-purple-200">{member.avatar}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-white">{member.name}</strong>{member.email && <span className="block truncate text-xs text-slate-500 dark:text-gray-400">{member.email}</span>}</span>{member.role && <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-purple-200 bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:border-purple-400/30 dark:bg-purple-500/20 dark:text-purple-100">{formatMemberRole(member.role)}</span>}</div>)}</div> : <p className="mt-4 text-sm text-slate-500 dark:text-gray-400">No members have been added yet.</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <ProgressChart team={team} />
        <div className="my-6 border-t border-white/10" />
        <h2 className="text-lg font-bold text-white">Recent submissions</h2>
        {team.submissions.length ? <div className="mt-4 space-y-3">{team.submissions.map(submission => <div key={submission.id} className="rounded-xl bg-navy-900/50 p-4"><div className="flex items-start justify-between gap-3"><div><strong className="block text-sm text-white">{submission.title}</strong><span className="mt-1 block text-xs text-gray-400">{submission.stage} · {submission.type} · {submission.size}</span></div><span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-200">{submission.status}</span></div><p className="mt-3 text-xs text-gray-500">Submitted {formatDate(submission.submittedAt)}</p></div>)}</div> : <p className="mt-4 text-sm text-gray-400">This team has not submitted any work yet.</p>}
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <TeamChat team={{ id: teamId, name: team.name, domain: team.domain, members: team.memberCount, hackathon: team.stage }} />
    </section>
  </main>;
}

function Stat({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p><p className="mt-2 text-xl font-bold text-white">{value}</p></div>;
}

function Field({ label, children }) {
  return <label className="block text-sm font-medium text-gray-300"><span className="mb-2 block">{label}</span>{children}</label>;
}
