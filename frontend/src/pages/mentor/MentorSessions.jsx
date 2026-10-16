import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Plus,
  Users,
  CheckCircle2,
  CalendarDays,
  List,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  MessageSquare
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { getMentorMeetings } from '../../api/mentorApi';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';

export default function MentorSessions() {
  const { openScheduleModal, addToast, refreshKey, triggerRefresh, globalSearch } = useMentor();

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [activeFilter, setActiveFilter] = useState('Upcoming'); // 'Upcoming' | 'Completed' | 'All'
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const [records, assignedTeams] = await Promise.all([
        getMentorMeetings(false),
        fetchAssignedTeams(),
      ]);
      const teamsById = new Map(
        [...(assignedTeams?.activeTeams || []), ...(assignedTeams?.pastTeams || [])]
          .map((team) => [String(team.id), team.name])
      );

      const mapped = (Array.isArray(records) ? records : []).map((m) => {
        const startTime = m.startTime ? new Date(m.startTime) : null;
        return {
          id: m._id || m.id,
          teamName: m.teamName || teamsById.get(String(m.teamId)) || 'Assigned team',
          topic: m.title || 'Technical Guidance',
          date: startTime ? startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable',
          rawDate: startTime,
          time: startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          meetingType: m.location || 'Google Meet',
          meetingLink: m.meetingLink || '',
          status: m.status || (startTime && startTime < new Date() ? 'Completed' : 'Upcoming'),
          description: m.description || '',
        };
      });
      setSessions([...(Array.isArray(stored) ? stored : []), ...mapped]);
    } catch (e) {
      console.error('Meetings load failed:', e);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshKey]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    let list = [...sessions];

    if (activeFilter === 'Upcoming') {
      list = list.filter((s) => s.status === 'Upcoming');
    } else if (activeFilter === 'Completed') {
      list = list.filter((s) => s.status === 'Completed');
    }

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.teamName?.toLowerCase().includes(q) ||
          s.topic?.toLowerCase().includes(q) ||
          s.meetingType?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [sessions, activeFilter, globalSearch]);

  // Calendar calculations
  const monthYearStr = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays, year, month };
  }, [currentDate]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Card */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Sessions & Consultations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Coordinate, schedule, and lead consultations with your hackathon cohorts.
          </p>
        </div>

        {/* Action Controls: View mode toggle + Schedule CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-navy-950 border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-navy-900 text-[#5B45D9] dark:text-purple-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-navy-900 text-[#5B45D9] dark:text-purple-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>

          <button
            onClick={() => openScheduleModal()}
            className="px-4 py-2.5 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs shadow-purple-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Schedule Session
          </button>
        </div>
      </div>

      {/* Filter Tabs: Upcoming, Completed, All */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10">
        {['Upcoming', 'Completed', 'All'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
              activeFilter === tab
                ? 'border-[#5B45D9] text-[#5B45D9] dark:text-purple-300 dark:border-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {tab} Sessions
          </button>
        ))}
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-sm">
              No {activeFilter.toLowerCase()} sessions found.
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isUpcoming = s.status === 'Upcoming';

              return (
                <div
                  key={s.id}
                  className="p-5 sm:p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#5B45D9]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left: Date/Time Badge + Session Info */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-[#5B45D9] dark:text-purple-300 flex flex-col items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/40">
                      <CalendarIcon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#5B45D9] dark:text-purple-300">
                          {s.date} · {s.time}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          {s.meetingType}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isUpcoming
                              ? 'bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                        {s.topic}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Team: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{s.teamName}</strong>
                      </p>

                      {s.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-1 italic">
                          "{s.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    {s.meetingLink && isUpcoming ? (
                      <a
                        href={s.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Meeting
                      </a>
                    ) : (
                      <button
                        onClick={() => openScheduleModal({ teamName: s.teamName, title: `Follow-up with ${s.teamName}` })}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        Schedule Follow-up
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6 space-y-6">
          {/* Month Navigator */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {monthYearStr}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="font-bold text-slate-400 py-2 uppercase tracking-wider text-[11px]">
                {d}
              </span>
            ))}

            {/* Empty offset days */}
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3 rounded-xl border border-transparent" />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth.totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const daySessions = sessions.filter((session) => {
                const sessionDate = session.rawDate;
                return sessionDate instanceof Date &&
                  !Number.isNaN(sessionDate.valueOf()) &&
                  sessionDate.getDate() === dayNum &&
                  sessionDate.getMonth() === daysInMonth.month &&
                  sessionDate.getFullYear() === daysInMonth.year;
              });
              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === daysInMonth.month &&
                new Date().getFullYear() === daysInMonth.year;

              return (
                <div
                  key={dayNum}
                  onClick={() => openScheduleModal({ date: `${daysInMonth.year}-${String(daysInMonth.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` })}
                  className={`min-h-[70px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-start justify-between text-left group ${
                    isToday
                      ? 'border-[#5B45D9] bg-purple-50/40 dark:bg-purple-950/20'
                      : 'border-slate-100 dark:border-white/5 bg-[#FAFAFD]/60 dark:bg-navy-950/30 hover:border-[#5B45D9]/50 hover:bg-white dark:hover:bg-navy-900'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      isToday
                        ? 'bg-[#5B45D9] text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {daySessions.slice(0, 2).map((session) => (
                    <span
                      key={session.id}
                      title={`${session.time} · ${session.teamName} · ${session.topic}`}
                      className={`w-full truncate px-1 py-0.5 rounded text-[10px] font-bold text-white ${session.status === 'Completed' ? 'bg-emerald-600' : 'bg-[#5B45D9]'}`}
                    >
                      {session.time} {session.teamName}
                    </span>
                  ))}
                  {daySessions.length > 2 && (
                    <span className="text-[10px] font-semibold text-slate-500">+{daySessions.length - 2} more</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
