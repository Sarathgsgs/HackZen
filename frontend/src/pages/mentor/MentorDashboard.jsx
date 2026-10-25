import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ClipboardCheck, Inbox, Users } from 'lucide-react';
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
        { title: 'Mentorship Requests', value: summary.mentorshipRequests ?? 0, icon: Inbox, link: '/mentor/requests' },
        { title: 'Active Teams', value: summary.activeTeams ?? 0, icon: Users, link: '/mentor/teams' },
        { title: 'Pending Feedback', value: summary.pendingFeedback ?? 0, icon: ClipboardCheck, link: '/mentor/feedback' },
        { title: 'Completed Sessions', value: summary.completedMentorships ?? 0, icon: CheckCircle2, link: '/mentor/sessions' },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-6 pt-2 pb-12 text-slate-900 dark:text-white transition-colors duration-200">
            {/* 1. Header (Admin Benchmark) */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Welcome back, <span className="text-[#2563eb] dark:text-blue-400">{data?.mentor?.name || 'Mentor'}</span>!
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Review incoming mentorship inquiries, assess milestone progress, and coordinate active teams.
                    </p>
                </div>
            </header>

            {error && (
                <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs sm:text-sm text-rose-700 dark:text-rose-400 shadow-xs">
                    <span>{error}</span>
                    <button onClick={loadDashboard} className="font-bold underline cursor-pointer">Retry</button>
                </div>
            )}

            {/* 2. KPI Stat Cards (Admin Benchmark) */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Mentor summary">
                {stats.map(({ title, value, icon: Icon, link }) => (
                    <Link
                        key={title}
                        to={link}
                        className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/50 group"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                                {loading ? '—' : value}
                            </p>
                        </div>
                    </Link>
                ))}
            </section>

            {/* 3. Main Split: Mentorship Requests & Activities */}
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.35fr_1fr]">
                {/* Requests Container */}
                <section className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3.5 mb-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mentorship Requests</h2>
                        <Link className="text-xs font-bold text-[#2563eb] dark:text-blue-400 hover:underline" to="/mentor/requests">
                            View all
                        </Link>
                    </div>

                    {loading ? (
                        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading requests…</p>
                    ) : visibleRequests.length ? (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {visibleRequests.slice(0, 5).map((request) => (
                                <div key={request.id} className="grid gap-3 py-3.5 sm:grid-cols-[1fr_0.8fr_auto] sm:items-center">
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{request.teamName || 'Team'}</p>
                                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{request.message || request.track || 'Mentorship inquiry'}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {request.track || 'General'}{request.createdAt ? ` · ${dateOnly(request.createdAt)}` : ''}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => decline(request)}
                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700 transition active:scale-95 cursor-pointer"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            onClick={() => navigate('/mentor/requests')}
                                            className="rounded-xl bg-[#2563eb] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1d4ed8] transition active:scale-95 cursor-pointer"
                                        >
                                            Review
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center">
                            <p className="text-xs text-slate-500 dark:text-slate-400">No pending mentorship requests at this time.</p>
                        </div>
                    )}
                </section>

                {/* Upcoming Activities */}
                <section className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3.5 mb-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Upcoming Sessions</h2>
                        <Link to="/mentor/sessions" className="text-xs font-bold text-[#2563eb] dark:text-blue-400 hover:underline">
                            Calendar
                        </Link>
                    </div>

                    {loading ? (
                        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading activities…</p>
                    ) : meetings.length ? (
                        <div className="space-y-4">
                            {meetings.slice(0, 4).map((meeting) => (
                                <div key={meeting.id} className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-navy-950/60 p-3 transition hover:border-blue-300 dark:hover:border-blue-700/50">
                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#2563eb] ring-4 ring-blue-100 dark:ring-blue-950/50" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-[#2563eb] dark:text-blue-400">{dateTime(meeting.startTime)}</p>
                                        <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {meeting.title || 'Mentoring session'} · {meeting.teamName || 'Team'}
                                        </p>
                                        {meeting.location && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">{meeting.location}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center">
                            <p className="text-xs text-slate-500 dark:text-slate-400">No upcoming mentoring sessions scheduled.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* 4. Active Teams Section */}
            <section className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3.5 mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned Teams</h2>
                    <Link to="/mentor/teams" className="text-xs font-bold text-[#2563eb] dark:text-blue-400 hover:underline">
                        View All
                    </Link>
                </div>

                {loading ? (
                    <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading teams…</p>
                ) : visibleTeams.length ? (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {visibleTeams.slice(0, 6).map((team) => (
                            <Link
                                key={team.id}
                                to={`/mentor/teams/${team.id}`}
                                className="grid gap-3 py-3.5 transition hover:bg-slate-50/60 dark:hover:bg-navy-800/40 rounded-xl px-2 sm:grid-cols-[minmax(180px,1fr)_minmax(180px,2fr)_auto] sm:items-center"
                            >
                                <div className="min-w-0">
                                    <strong className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{team.team || 'Team'}</strong>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{team.stage || 'Milestone active'}</span>
                                </div>
                                <div>
                                    <div className="mb-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <span>Progress</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{team.progress ?? 0}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800">
                                        <div
                                            className="h-full rounded-full bg-[#2563eb]"
                                            style={{ width: `${Math.min(100, Math.max(0, Number(team.progress) || 0))}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-[11px] text-slate-400 truncate">
                                    {team.lastActivity ? `Active ${dateTime(team.lastActivity)}` : 'Recently active'}
                                </span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">No active teams currently assigned to your roster.</p>
                    </div>
                )}
            </section>

            {/* 5. Quick Actions Row */}
            <div className="flex flex-wrap gap-3">
                {[
                    [CalendarDays, 'Schedule a session', '/mentor/sessions'],
                    [ClipboardCheck, 'Review pending feedback', '/mentor/feedback'],
                    [Users, 'Open team workspace', '/mentor/teams']
                ].map(([Icon, label, to]) => (
                    <Link
                        key={to}
                        to={to}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 shadow-xs transition active:scale-95"
                    >
                        <Icon className="h-4 w-4 text-[#2563eb] dark:text-blue-400" />
                        {label}
                    </Link>
                ))}
            </div>
        </div>
    );
}
