import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  Layers,
  ExternalLink
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';

export default function AssignedTeams() {
  const navigate = useNavigate();
  const { openScheduleModal, globalSearch } = useMentor();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setLoading(true);
        const data = await fetchAssignedTeams();
        setTeams(data?.activeTeams || []);
      } catch (err) {
        console.error('Failed to load teams:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTeams();
  }, []);

  const filteredTeams = useMemo(() => {
    let list = [...teams];
    const q = (searchQuery || globalSearch).toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.domain && t.domain.toLowerCase().includes(q)) ||
          (t.hackathon && t.hackathon.toLowerCase().includes(q))
      );
    }
    if (selectedDomain !== 'All') {
      list = list.filter((t) => t.domain === selectedDomain);
    }
    return list;
  }, [teams, searchQuery, globalSearch, selectedDomain]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Card */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Assigned Cohort Teams
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review, guide, and manage your active hackathon cohort assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cohorts or domain..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5B45D9]"
            />
          </div>

          <button
            onClick={() => navigate('/mentor/teams/join')}
            className="px-4 py-2 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs shadow-purple-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Discover & Join
          </button>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading teams...</div>
      ) : filteredTeams.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-sm">
          No teams matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((team) => {
            const status = team.status || (team.progress >= 75 ? 'On Track' : team.progress < 40 ? 'Needs Attention' : 'On Track');
            const isCompleted = status === 'Completed';
            const isNeedsAttention = status === 'Needs Attention';

            return (
              <div
                key={team.id}
                className="p-5 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#5B45D9]/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                      {team.domain || 'Technology'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                          : isNeedsAttention
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                          : 'bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors mt-2">
                    {team.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {team.hackathon || 'Active Hackathon'}
                  </p>

                  <div className="flex items-center gap-2 mt-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex -space-x-2">
                      {(team.avatars || [
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80',
                      ]).map((avatar, idx) => (
                        <img
                          key={idx}
                          src={avatar}
                          alt="member"
                          className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-navy-900 object-cover"
                        />
                      ))}
                    </div>
                    <span className="font-medium">
                      {team.members || 4} members
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600 dark:text-slate-300">Progress</span>
                      <span className="text-[#5B45D9] dark:text-purple-300 font-bold">{team.progress || 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5B45D9] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, team.progress || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {team.lastActivity || 'Active today'}
                  </span>
                  <button
                    onClick={() => navigate(`/mentor/teams/${team.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 hover:border-[#5B45D9] text-[#5B45D9] dark:text-purple-300 font-bold hover:bg-[#5B45D9] hover:text-white transition-all shadow-2xs"
                  >
                    View Team
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
