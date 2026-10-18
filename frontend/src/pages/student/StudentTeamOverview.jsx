import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentTeams } from '../../services/student/teamsApi';

const StudentTeamOverview = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadTeams = async () => {
            try {
                const data = await fetchStudentTeams();
                if (isMounted) setTeams(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load student teams:', error);
                if (isMounted) setLoadError('Your teams could not be loaded. Please try again.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadTeams();
        return () => {
            isMounted = false;
        };
    }, []);

    const filteredTeams = useMemo(() => {
        const term = search.toLowerCase();
        return teams.filter((team) => {
            const searchable = `${team.name || ''} ${team.hackathon || ''} ${team.domain || ''}`.toLowerCase();
            return searchable.includes(term);
        });
    }, [search, teams]);

    const knownProgress = teams.map((team) => team.progress).filter((value) => Number.isFinite(value));
    const avgProgress = knownProgress.length
        ? Math.round(knownProgress.reduce((sum, value) => sum + value, 0) / knownProgress.length)
        : null;
    const allMemberCountsKnown = teams.every((team) => Number.isFinite(team.members));

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-navy-950 px-4 py-6 md:px-8 text-slate-900 dark:text-white transition-colors duration-200">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* 1. Header (Admin Standard) */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            My Teams
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Manage squad collaborators, track project milestone progression, and launch workspaces.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/student/teams/join')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700 shadow-xs transition active:scale-95 cursor-pointer"
                        >
                            Join Team
                        </button>
                        <button
                            onClick={() => navigate('/student/teams/create')}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#7C65F6] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#6D28D9] active:scale-95 cursor-pointer"
                        >
                            Create Team
                        </button>
                    </div>
                </header>

                {/* 2. KPI Metrics Grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 shadow-xs">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Teams</span>
                        <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white leading-none">{teams.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 shadow-xs">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Avg. Progress</span>
                        <p className="mt-3 text-3xl font-extrabold text-[#7C65F6] dark:text-purple-400 leading-none">
                            {avgProgress === null ? '0%' : `${avgProgress}%`}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 shadow-xs">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Collaborators</span>
                        <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
                            {allMemberCountsKnown ? teams.reduce((sum, team) => sum + team.members, 0) : '0'}
                        </p>
                    </div>
                </div>

                {/* 3. Search Bar */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-4 shadow-xs">
                    <div className="relative">
                        <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m21 21-4.35-4.35m1.1-5.4a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                        </svg>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by team, hackathon, or domain..."
                            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 pl-10 pr-4 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#7C65F6]"
                        />
                    </div>
                </div>

                {/* 4. Team Content Body */}
                {loading ? (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-xs">
                        Loading your teams...
                    </div>
                ) : loadError ? (
                    <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-navy-900 p-8 text-center text-sm text-rose-600 dark:text-rose-400 shadow-xs">
                        {loadError}
                    </div>
                ) : filteredTeams.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 p-12 text-center shadow-xs">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No teams yet</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Join an existing team or create one for your next hackathon challenge.</p>
                        <div className="mt-6 flex justify-center gap-3">
                            <button
                                onClick={() => navigate('/student/teams/join')}
                                className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700 cursor-pointer"
                            >
                                Join Team
                            </button>
                            <button
                                onClick={() => navigate('/student/teams/create')}
                                className="rounded-xl bg-[#7C65F6] px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#6D28D9] cursor-pointer"
                            >
                                Create Team
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 xl:grid-cols-2">
                        {filteredTeams.map((team) => (
                            <div key={team.id} className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-xs transition-all hover:shadow-md">
                                <div className={`h-24 bg-gradient-to-r ${team.gradient || 'from-indigo-600 to-violet-600'} p-5 flex flex-col justify-between`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 bg-black/20 px-2 py-0.5 rounded-md">
                                            {team.members === null ? 'Members TBA' : `${team.members} ${team.members === 1 ? 'Member' : 'Members'}`}
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-white/90 truncate">
                                        {team.hackathon || 'Hackathon Event'}
                                    </p>
                                </div>

                                <div className="space-y-4 p-5 sm:p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{team.name || 'Untitled Team'}</h2>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{team.roleInTeam || 'Member'}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/student/teams/${team.id}/workspace`)}
                                            className="rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#7C65F6] dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                                        >
                                            Open
                                        </button>
                                    </div>

                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                            <span>Progress</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{team.progress === null ? '0%' : `${team.progress}%`}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-200 dark:bg-navy-800 overflow-hidden">
                                            {team.progress !== null && (
                                                <div
                                                    className="h-full rounded-full bg-[#7C65F6]"
                                                    style={{ width: `${Math.max(0, Math.min(100, team.progress))}%` }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                        <button
                                            onClick={() => navigate(`/student/teams/${team.id}/workspace`)}
                                            className="flex-1 rounded-xl bg-[#7C65F6] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-[#6D28D9] active:scale-95 cursor-pointer"
                                        >
                                            Workspace
                                        </button>
                                        <button
                                            onClick={() => navigate(`/student/teams/${team.id}/members`)}
                                            className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-navy-700 active:scale-95 cursor-pointer"
                                        >
                                            Members
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTeamOverview;
