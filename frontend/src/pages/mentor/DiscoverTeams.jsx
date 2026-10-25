import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { fetchDiscoverableTeams, requestMentorTeam } from '../../services/mentor/discoverTeamsApi';

const DiscoverTeams = () => {
    const navigate = useNavigate();
    const { addToast } = useMentor();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        hackathon: 'All',
        domain: 'All',
        size: 'All',
        status: 'All'
    });
    const [requesting, setRequesting] = useState({});
    const [teams, setTeams] = useState([]);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const loadTeams = async () => {
            try {
                setIsLoading(true);
                const data = await fetchDiscoverableTeams();
                setTeams(Array.isArray(data) ? data : []);
                setLoadError('');
            } catch (err) {
                console.error("Failed to load discoverable teams:", err);
                setTeams([]);
                setLoadError("Unable to load discoverable teams. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        loadTeams();
    }, []);

    const filteredTeams = useMemo(() => {
        return teams.filter(team => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = team.name.toLowerCase().includes(searchLower) ||
                team.description.toLowerCase().includes(searchLower) ||
                team.requiredSkills.some(s => s.toLowerCase().includes(searchLower));
            const matchesHackathon = filters.hackathon === 'All' || team.hackathon === filters.hackathon;
            const matchesDomain = filters.domain === 'All' || team.domain === filters.domain;
            const matchesSize = filters.size === 'All' || (filters.size === 'Open' ? team.members < team.maxSize : team.members >= team.maxSize);
            const matchesStatus = filters.status === 'All' || team.status === filters.status;

            return matchesSearch && matchesHackathon && matchesDomain && matchesSize && matchesStatus;
        });
    }, [teams, searchTerm, filters]);

    const handleJoinRequest = async (teamId) => {
        if (requesting[teamId]) return;
        setRequesting(prev => ({ ...prev, [teamId]: true }));
        try {
            await requestMentorTeam(teamId);
            const targetTeam = teams.find(t => t.id === teamId);
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, requested: true } : t));
            addToast(
                'Mentorship Offer Sent!',
                `Mentorship request sent to ${targetTeam?.name || 'the team'}.`,
                'success'
            );
        } catch (error) {
            console.error("Error requesting to mentor:", error);
            addToast('Request Failed', 'Unable to submit mentorship request. Please try again.', 'error');
        } finally {
            setRequesting(prev => {
                const next = { ...prev };
                delete next[teamId];
                return next;
            });
        }
    };

    const hackathons = ['All', ...new Set(teams.map(t => t.hackathon))];
    const domains = ['All', ...new Set(teams.map(t => t.domain))];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Header Card */}
            <div className="p-6 sm:p-7 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        Discover Teams
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Scout for high-potential cohorts and establish mentorship protocols.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/mentor/teams')}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                >
                    View Assigned Teams
                </button>
            </div>

            {/* Filter Matrix Card */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111625] shadow-xs space-y-5">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search teams by name, domain, or skillset..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563eb] transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Hackathon', value: filters.hackathon, options: hackathons, key: 'hackathon' },
                        { label: 'Domain', value: filters.domain, options: domains, key: 'domain' },
                        { label: 'Team Size', value: filters.size, options: ['All', 'Open', 'Full'], key: 'size' },
                        { label: 'Status', value: filters.status, options: ['All', 'Ideating', 'Building', 'Done'], key: 'status' }
                    ].map((f) => (
                        <div key={f.key} className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                                {f.label}
                            </label>
                            <div className="relative">
                                <select
                                    value={f.value}
                                    onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#2563eb] transition-all cursor-pointer appearance-none pr-8"
                                >
                                    {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-navy-900/40 animate-pulse" />
                    ))
                ) : filteredTeams.length > 0 ? (
                    filteredTeams.map(team => (
                        <div
                            key={team.id}
                            className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#2563eb]/40 transition-all flex flex-col justify-between group"
                        >
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-white/5 border border-blue-100 dark:border-white/5 flex items-center justify-center text-2xl shadow-xs">
                                        {team.icon}
                                    </div>
                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                        team.members < team.maxSize
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                    }`}>
                                        {team.members}/{team.maxSize} Members
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#2563eb] transition-colors">
                                        {team.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>
                                        <p className="text-xs font-semibold text-[#2563eb] dark:text-blue-400">{team.hackathon}</p>
                                    </div>
                                </div>

                                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed line-clamp-3">
                                    {team.description}
                                </p>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {team.requiredSkills.map(skill => (
                                        <span
                                            key={skill}
                                            className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10"
                                        >
                                            #{skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <button
                                disabled={team.requested || requesting[team.id]}
                                onClick={() => handleJoinRequest(team.id)}
                                className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                                    team.requested
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 cursor-default'
                                        : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-blue-500/20 active:scale-98'
                                }`}
                            >
                                {requesting[team.id] ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Sending Request...</span>
                                    </>
                                ) : team.requested ? (
                                    <>
                                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>Request Sent</span>
                                    </>
                                ) : (
                                    'Request to Mentor'
                                )}
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-16 text-center bg-white dark:bg-[#111625] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 shadow-xs">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl opacity-60">🔍</div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">{loadError ? "Teams unavailable" : "No teams found"}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting your search query or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiscoverTeams;
