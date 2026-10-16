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
    <div className="min-h-screen space-y-8 bg-[#fbf9ff] px-4 py-6 pb-10 text-[#202432] animate-in fade-in duration-500 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#776b9d]">Portfolio</p>
          <h1 className="mt-2 text-3xl font-bold text-[#202432] md:text-4xl">My Teams</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/student/teams/join')} className="rounded-xl border border-[#d9d3e8] bg-white px-4 py-2.5 text-sm font-semibold text-[#514b63] transition hover:border-[#b8aee0] hover:bg-[#f8f6ff]">Join Team</button>
          <button onClick={() => navigate('/student/teams/create')} className="rounded-xl bg-[#5d4be5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4e3bd1]">Create Team</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#e4dfed] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#777287]">Teams</p>
          <p className="mt-4 text-3xl font-bold text-[#202432]">{teams.length}</p>
        </div>
        <div className="rounded-2xl border border-[#e4dfed] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#777287]">Avg. Progress</p>
          <p className="mt-4 text-3xl font-bold text-[#5140c8]">{avgProgress === null ? 'Unavailable' : `${avgProgress}%`}</p>
        </div>
        <div className="rounded-2xl border border-[#e4dfed] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#777287]">Members</p>
          <p className="mt-4 text-3xl font-bold text-[#5140c8]">{allMemberCountsKnown ? teams.reduce((sum, team) => sum + team.members, 0) : 'Unavailable'}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e4dfed] bg-white p-4 shadow-sm md:p-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by team or hackathon"
          className="w-full rounded-xl border border-[#e2ddec] bg-[#fbfaff] px-4 py-3 text-sm text-[#202432] placeholder:text-[#898397] focus:border-[#8b7be8] focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] border border-[#e4dfed] bg-white p-8 text-sm text-[#697386] shadow-sm">Loading your teams...</div>
      ) : loadError ? (
        <div role="alert" className="rounded-[1.5rem] border border-red-200 bg-white p-8 text-center text-sm text-red-700 shadow-sm">{loadError}</div>
      ) : filteredTeams.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-[#d8d1e4] bg-white p-12 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-[#202432]">No teams yet</h2>
          <p className="mt-3 text-[#697386]">Join an existing team or create one for your next hackathon.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => navigate('/student/teams/join')} className="rounded-xl border border-[#d9d3e8] bg-white px-4 py-2.5 text-sm font-semibold text-[#514b63]">Join Team</button>
            <button onClick={() => navigate('/student/teams/create')} className="rounded-xl bg-[#5d4be5] px-4 py-2.5 text-sm font-semibold text-white">Create Team</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {filteredTeams.map((team) => (
            <div key={team.id} className="overflow-hidden rounded-[1.75rem] border border-[#e4dfed] bg-white shadow-sm">
              <div className={`h-28 bg-gradient-to-r ${team.gradient || 'from-violet-600 to-indigo-600'} p-5`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">{team.members === null ? 'Member count unavailable' : `${team.members} ${team.members === 1 ? 'member' : 'members'}`}</span>
                </div>
                <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/80">{team.hackathon || 'Hackathon name unavailable'}</p>
              </div>

              <div className="space-y-5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#202432]">{team.name || 'Team name unavailable'}</h2>
                    <p className="mt-1 text-sm text-[#777287]">{team.roleInTeam || 'Team role unavailable'}</p>
                  </div>
                  <button onClick={() => navigate(`/student/teams/${team.id}/workspace`)} className="rounded-xl border border-[#ddd6f5] bg-[#f3f0ff] px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#5140c8]">Open</button>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[#777287]">
                    <span>Progress</span>
                    <span className="font-semibold text-[#202432]">{team.progress === null ? 'Unavailable' : `${team.progress}%`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eeeaf6]">
                    {team.progress !== null && <div className="h-full rounded-full bg-[#5d4be5]" style={{ width: `${Math.max(0, Math.min(100, team.progress))}%` }} />}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => navigate(`/student/teams/${team.id}/workspace`)} className="flex-1 rounded-xl bg-[#5d4be5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4e3bd1]">Workspace</button>
                  <button onClick={() => navigate(`/student/teams/${team.id}/members`)} className="flex-1 rounded-xl border border-[#d9d3e8] bg-white px-4 py-3 text-sm font-semibold text-[#514b63] transition hover:border-[#b8aee0] hover:bg-[#f8f6ff]">Members</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentTeamOverview;
