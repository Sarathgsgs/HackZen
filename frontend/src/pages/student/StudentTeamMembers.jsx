import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyTeams, getTeamMembers } from '../../api/teamApi';

const initials = (name = '') => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M';

const formatJoinedDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const StudentTeamMembers = () => {
  const navigate = useNavigate();
  const { teamId: routeTeamId } = useParams();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const loadTeam = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const teams = await getMyTeams();
      const activeTeam = (Array.isArray(teams) ? teams : []).find((item) =>
        String(item.id || item._id) === String(routeTeamId || item.id || item._id)
      );
      if (!activeTeam) {
        setTeam(null);
        setMembers([]);
        if (routeTeamId) setError('You do not have access to this team, or it is no longer available.');
        return;
      }
      const activeTeamId = activeTeam.id || activeTeam._id;
      setTeam(activeTeam);
      const roster = await getTeamMembers(activeTeamId);
      setMembers(Array.isArray(roster) ? roster : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.detail || 'Team details could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [routeTeamId]);

  useEffect(() => {
    loadTeam(true);
    const refreshOnFocus = () => loadTeam(false);
    window.addEventListener('focus', refreshOnFocus);
    const refreshTimer = window.setInterval(refreshOnFocus, 30000);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.clearInterval(refreshTimer);
    };
  }, [loadTeam]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => `${member.name || ''} ${member.email || ''} ${member.department || ''} ${member.role || ''}`.toLowerCase().includes(query));
  }, [members, search]);

  const currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id || currentUser.id || '';
  const isLeader = team?.myRole === 'leader' || team?.myRole === 'Team Lead' || team?.roleInTeam === 'Team Lead' || team?.leaderId === currentUserId || (team?.createdBy && (team.createdBy === currentUserId || team.createdBy === currentUser.name));

  const shareInviteCode = async () => {
    if (!team?.teamCode) return;
    const joinUrl = `${window.location.origin}/student/teams/join?code=${encodeURIComponent(team.teamCode)}`;
    const shareText = `Join our team "${team.teamName}" on ProEduvate with code ${team.teamCode}:`;
    setShareMessage('');
    try {
      if (navigator.share) {
        await navigator.share({ title: `Join ${team.teamName}`, text: shareText, url: joinUrl });
        setShareMessage('Share sheet opened.');
        return;
      }
      await navigator.clipboard.writeText(`${shareText} ${joinUrl}`);
      setShareMessage(`Team invite details copied to clipboard! (Code: ${team.teamCode})`);
      setTimeout(() => setShareMessage(''), 4000);
    } catch (shareError) {
      if (shareError?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(`${shareText} ${joinUrl}`);
        setShareMessage(`Team invite details copied to clipboard! (Code: ${team.teamCode})`);
        setTimeout(() => setShareMessage(''), 4000);
      } catch {
        setShareMessage(`Copy this code and share directly: ${team.teamCode}`);
      }
    }
  };

  if (loading) {
    return <main className="min-h-[420px] rounded-[22px] border border-[#e3e7f0] bg-white p-10 text-center text-[#667085]">Loading team members…</main>;
  }

  if (!team) {
    return (
      <main className="min-h-screen bg-[#fbf9ff] px-5 py-10 text-[#202432] md:px-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#e4e7f0] bg-white p-8 text-center shadow-sm md:p-12">
          <h1 className="text-3xl font-bold">{error ? 'Team members unavailable' : 'You are not in a team yet'}</h1>
          <p role={error ? 'alert' : undefined} className="mx-auto mt-3 max-w-xl text-[#697386]">{error || 'Create a team for your hackathon or join one with a code shared by its team lead.'}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate('/student/teams/create')} className="rounded-xl bg-[#5d4be5] px-5 py-3 font-semibold text-white">Create Team</button>
            <button onClick={() => navigate('/student/teams/join')} className="rounded-xl border border-[#dfe2ec] bg-white px-5 py-3 font-semibold text-[#34384a]">Join Team</button>
            <button onClick={() => navigate('/student/teams')} className="rounded-xl px-5 py-3 font-semibold text-[#5d4be5]">Back to My Teams</button>
          </div>
        </div>
      </main>
    );
  }

  const maxTeamSize = Number(team.maxTeamSize) || null;

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 py-8 text-[#202432] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <nav aria-label="Breadcrumb" className="mb-10 flex flex-wrap items-center gap-2 text-sm text-[#79839a]">
          <button onClick={() => navigate('/student/hackathons')} className="hover:text-[#5947df]">Hackathons</button><span>›</span>
          <span>{team.hackathonName || 'Hackathon'}</span><span>›</span>
          <button onClick={() => navigate(`/student/teams/${team.id || team._id}/workspace`)} className="hover:text-[#5947df]">My Team</button><span>›</span>
          <span className="font-semibold text-[#242735]">Team Members</span>
        </nav>

        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-[2.15rem]">Team Members</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.98rem] text-[#6d7487]">
              <span><strong className="font-semibold text-[#303342]">Team Name:</strong> {team.teamName}</span>
              <span className="hidden text-[#d9deea] sm:inline">•</span>
              <span>
                <strong className="font-semibold text-[#303342]">Team Code:</strong>{' '}
                {team.teamCode ? (
                  <span className="inline-flex items-center gap-2">
                    <code className="rounded-md bg-[#f1f4f8] px-2 py-0.5 font-mono font-bold text-[#343b4b]">{team.teamCode}</code>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(team.teamCode);
                          setShareMessage(`Team code ${team.teamCode} copied to clipboard!`);
                          setTimeout(() => setShareMessage(''), 3000);
                        }
                      }}
                      title="Copy code"
                      className="cursor-pointer text-xs font-bold text-[#5d4be5] hover:underline"
                    >
                      Copy
                    </button>
                  </span>
                ) : (
                  'Ask the team lead to share'
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={shareInviteCode}
            disabled={!team.teamCode}
            title={team.teamCode ? 'Share team invite link and code' : 'Team code unavailable'}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#5d4be5] px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(93,75,229,0.2)] transition hover:bg-[#4f3ed2] disabled:cursor-not-allowed disabled:bg-[#a5a0d7] sm:self-center cursor-pointer"
          >
            <span aria-hidden="true">＋</span> Invite Member
          </button>
        </header>

        {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {shareMessage && <p role="status" className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{shareMessage}</p>}

        <div className="grid items-start gap-6 xl:grid-cols-[1.62fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-[#e0e5ef] bg-white shadow-[0_2px_5px_rgba(31,41,55,0.04)]">
            <div className="flex flex-col gap-4 border-b border-[#e4e8f0] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">All Members</h2>
                <span className="rounded-full border border-[#e0e7f0] bg-[#f2f5f9] px-3 py-1 text-sm font-medium text-[#697991]">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
              </div>
              <label className="relative block sm:w-[250px]">
                <span className="sr-only">Filter members</span>
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#8490a5]">⌕</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter members…" className="w-full rounded-xl border border-[#dfe5ef] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#8c80ef] focus:ring-2 focus:ring-[#5d4be5]/10" />
              </label>
            </div>

            <div className="hidden grid-cols-[minmax(180px,1.1fr)_minmax(115px,.72fr)_minmax(140px,.8fr)_minmax(110px,.7fr)_auto] gap-4 bg-[#f8fafc] px-7 py-4 text-xs font-bold uppercase tracking-[0.08em] text-[#77849a] md:grid">
              <span>Name</span><span>Role</span><span>Profile</span><span>Joined</span><span className="text-right">Action</span>
            </div>
            {loading ? <p className="p-8 text-center text-sm text-[#79839a]">Refreshing members…</p> : filteredMembers.length ? (
              <div className="divide-y divide-[#e5e9f1]">
                {filteredMembers.map((member, index) => {
                  const role = member.role === 'leader' ? 'Team Lead' : 'Team Member';
                  return (
                    <article key={member.id || member._id || `${member.userId}-${index}`} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(180px,1.1fr)_minmax(115px,.72fr)_minmax(140px,.8fr)_minmax(110px,.7fr)_auto] md:items-center md:gap-4 md:px-7">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8e9fb] text-sm font-bold text-[#635bd8]">{initials(member.name)}</span>
                        <div className="min-w-0"><p className="truncate font-semibold text-[#252a39]">{member.name || 'Team member'}</p><p className="truncate text-sm text-[#78849a]">{member.email || 'Email unavailable'}</p></div>
                      </div>
                      <div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${member.role === 'leader' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{role}</span></div>
                      <div className="text-sm text-[#667085] md:text-[0.92rem]">{member.department || '?'}</div>
                      <div className="text-sm text-[#667085]"><span className="mr-2 text-xs font-semibold uppercase text-[#9099aa] md:hidden">Joined</span>{formatJoinedDate(member.joinedAt)}</div>
                      <button type="button" onClick={() => navigate(`/student/chat?teamId=${encodeURIComponent(team.id || team._id)}`)} className="justify-self-start rounded-lg border border-[#e1e5ee] px-3 py-2 text-xs font-semibold text-[#5550c8] transition hover:bg-[#f6f4ff] md:justify-self-end">Message</button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="px-6 py-10 text-center text-sm text-[#79839a]">{search ? 'No members match this filter.' : 'No team members were returned.'}</p>
            )}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e8f0] bg-[#fbfcfe] px-5 py-4 text-sm text-[#77849a] sm:px-7">
              <span>Showing {filteredMembers.length} of {members.length} {members.length === 1 ? 'team member' : 'team members'}</span>
              <button type="button" onClick={() => loadTeam(true)} className="font-semibold text-[#5546d2] hover:underline">Refresh</button>
            </footer>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#e0e5ef] bg-white p-5 shadow-[0_2px_5px_rgba(31,41,55,0.04)] sm:p-6">
              <div className="flex items-center justify-between border-b border-[#e5e9f1] pb-4">
                <h2 className="text-lg font-semibold">Team Overview</h2>
                <span className="rounded-lg bg-[#f1f4f8] px-3 py-1.5 text-xs font-semibold text-[#718096]">{team.hackathonName || 'Hackathon'}</span>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-[#4a5263]">Team capacity</span>
                  <span className="font-semibold text-[#4f63df]">{members.length}{maxTeamSize ? ` / ${maxTeamSize}` : ''} {members.length === 1 ? 'member' : 'members'}</span>
                </div>
                {maxTeamSize ? <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#eef1f6]"><div className="h-full rounded-full bg-[#604fe2] transition-all" style={{ width: `${Math.min(100, members.length / maxTeamSize * 100)}%` }} /></div> : null}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#e5e9f1] pt-5 text-sm">
                <span className="text-[#77849a]">Team Code</span>
                {team.teamCode ? (
                  <div className="flex items-center gap-2">
                    <code className="rounded-md bg-[#f1f4f8] px-2.5 py-1.5 font-mono font-bold text-[#343b4b]">{team.teamCode}</code>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(team.teamCode);
                          setShareMessage(`Team code ${team.teamCode} copied to clipboard!`);
                          setTimeout(() => setShareMessage(''), 3000);
                        }
                      }}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-[#5d4be5] hover:bg-slate-50 transition cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <span className="text-[#77849a]">Generating team code...</span>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#7b8495]">Share this code with teammates so they can join on the Join Team page.</p>
            </section>

            <section className="rounded-2xl border border-[#e0e5ef] bg-white p-5 shadow-[0_2px_5px_rgba(31,41,55,0.04)] sm:p-6">
              <h2 className="border-b border-[#e5e9f1] pb-4 text-lg font-semibold">Team workspace</h2>
              <p className="mt-4 text-sm leading-6 text-[#727d91]">Open your workspace to review current project work, or use team chat to coordinate with members.</p>
              <button onClick={() => navigate(`/student/teams/${team.id || team._id}/workspace`)} className="mt-5 w-full rounded-xl bg-[#5d4be5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4f3ed2]">Open Team Workspace</button>
              <button onClick={() => navigate(`/student/chat?teamId=${encodeURIComponent(team.id || team._id)}`)} className="mt-3 w-full rounded-xl border border-[#dfe3ed] bg-white px-4 py-3 text-sm font-semibold text-[#42495a] transition hover:bg-[#f8f8fc]">Open Team Chat</button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default StudentTeamMembers;
