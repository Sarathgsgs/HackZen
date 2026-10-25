import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    Plus
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';

export default function AssignedTeams() {
    const navigate = useNavigate();
    const { globalSearch } = useMentor();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('All');
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const loadTeams = async () => {
            try {
                setLoading(true);
                const data = await fetchAssignedTeams();
                setTeams(Array.isArray(data?.activeTeams) ? data.activeTeams : []);
            } catch (err) {
                console.error('Failed to load teams:', err);
                setTeams([]);
                setLoadError('Unable to load teams. Please try again.');
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
        <div className="mx-auto max-w-7xl space-y-6 pb-12 transition-colors duration-200 text-slate-900 dark:text-white">
            {/* 1. Header (Admin Benchmark) */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Assigned Cohort Teams
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Oversee squad progress, track development milestones, and launch mentorship workspaces.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search cohorts or domain..."
                            className="h-11 w-full pl-9 pr-3.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563eb]"
                        />
                    </div>

                    <button
                        onClick={() => navigate('/mentor/teams/join')}
                        className="h-11 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Discover & Join
                    </button>
                </div>
            </header>

            {/* 2. Teams Grid */}
            {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">Loading teams...</div>
            ) : loadError ? (
                <div role="alert" className="p-8 text-center bg-white dark:bg-navy-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
                    {loadError}
                </div>
            ) : filteredTeams.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 p-12 text-center shadow-xs">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 mb-3">
                        <Users className="w-6 h-6" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">No teams found</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">There are no cohort teams matching your search query.</p>
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
                                className="p-5 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-blue-300 dark:hover:border-blue-700/50 transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-300 border border-blue-100 dark:border-blue-800/40">
                                            {team.domain || 'Technology'}
                                        </span>
                                        <span
                                            className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                                                isCompleted
                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                                    : isNeedsAttention
                                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                                            }`}
                                        >
                                            {status}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#2563eb] transition-colors mt-2">
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
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {team.members || 4} members
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                                            <span className="text-slate-500 dark:text-slate-400">Milestone Progress</span>
                                            <span className="text-[#2563eb] dark:text-blue-300 font-bold">{team.progress || 0}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 dark:bg-navy-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#2563eb] rounded-full transition-all duration-500"
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
                                        className="px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
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
