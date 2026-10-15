import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTeams, getTeamMembers, joinTeamByCode, lookupTeamByCode } from '../../api/teamApi';

const StudentJoinTeam = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState(() => new URLSearchParams(window.location.search).get('code') || '');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinedTeamId, setJoinedTeamId] = useState('');
  const [team, setTeam] = useState(null);

  const handleFindTeam = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return setError('Enter the team code shared by your team leader.');
    setJoining(true);
    setError('');
    try {
      setTeam(await lookupTeamByCode(code));
      setJoinedTeamId('');
    } catch (requestError) {
      const detail = requestError?.response?.data?.error?.message || requestError?.response?.data?.detail || requestError?.message;
      setError(detail || 'Could not join this team. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!team?.teamCode) return;
    setJoining(true);
    setError('');
    try {
      const result = await joinTeamByCode(team.teamCode);
      const teamId = result?.teamId || result?.team?._id || result?._id;
      if (!teamId) throw new Error('The server did not return the team ID. Refresh your teams to continue.');
      setJoinedTeamId(teamId);
      try {
        await Promise.all([getMyTeams(), getTeamMembers(teamId)]);
      } catch {
        setError('Membership was saved, but the updated team roster could not be refreshed. Open Team Members to reload it.');
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.detail || requestError?.message || 'Could not join this team.');
    } finally { setJoining(false); }
  };

  return (
    <main className="min-h-screen bg-[#fbf8ff] px-5 py-10 text-[#1f2430] md:px-10">
      <div className="mx-auto max-w-[1440px]">
        <h1 className="text-4xl font-bold tracking-tight">Join a Team</h1>
        <p className="mt-3 text-lg text-[#686779]">Enter the team code shared by its team lead to review the real roster and request to join.</p>
        <section className="mt-10 rounded-2xl border border-[#eeeaf4] bg-white p-6 shadow-sm md:p-10">
          <h2 className="text-2xl font-bold">Join a Team</h2>
          <p className="mt-2 text-[#71758a]">Enter the team code shared by your team leader to join an existing team.</p>
          <label htmlFor="team-code" className="mt-10 block font-semibold">Team Code</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input id="team-code" value={inviteCode} onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setJoinedTeamId(''); setTeam(null); setError(''); }} maxLength={32} placeholder="Enter team code" className="min-w-0 flex-1 rounded-xl border border-[#dfe5f2] bg-[#f0f4ff] px-5 py-4 text-lg outline-none focus:border-[#6151df]" />
            <button onClick={handleFindTeam} disabled={joining} className="rounded-xl bg-[#5b4ce1] px-7 py-4 font-semibold text-white disabled:opacity-60">{joining ? 'Finding...' : 'Find Team'}</button>
          </div>
          <p className="mt-2 text-sm text-[#85879a]">Enter the code exactly as it was shared with you.</p>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {team && !joinedTeamId ? (
            <div className="mt-8 rounded-2xl bg-[#eef3ff] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold text-[#1f2b40]">{team.teamName}</h3><span className={`rounded-full px-3 py-1 text-sm font-semibold ${team.canJoin ? 'bg-white text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{team.alreadyMember ? 'Already a member' : !team.isOpen ? 'Team Full' : team.canJoin ? 'Eligible to join' : 'Already on a team for this hackathon'}</span></div>
              <div className="mt-5 rounded-xl bg-white p-5"><div className="flex justify-between font-semibold"><span>Team Members</span><span>{team.memberCount} / {team.maxTeamSize} Members</span></div><div className="mt-3 h-2.5 rounded-full bg-[#e3eaff]"><div className="h-2.5 rounded-full bg-[#2864e8]" style={{ width: `${Math.min(100, 100 * team.memberCount / Math.max(1, team.maxTeamSize))}%` }} /></div></div>
              <h4 className="mt-6 text-sm font-bold uppercase tracking-wide text-[#657087]">Current members roster</h4>
              <div className="mt-3 flex flex-wrap gap-2">{team.members.map((member, index) => <span key={`${member.name}-${index}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold">{index + 1} - {member.name}{member.role === 'leader' ? ' (Leader)' : ''}</span>)}</div>
              <button onClick={handleJoinTeam} disabled={joining || !team.canJoin} className="mt-6 rounded-xl bg-[#5b4ce1] px-6 py-3 font-semibold text-white disabled:opacity-50">{joining ? 'Joining...' : team.canJoin ? 'Join Team' : team.alreadyMember ? 'Already a member' : !team.isOpen ? 'Team Full' : 'Already on a team for this hackathon'}</button>
            </div>
          ) : joinedTeamId ? (
            <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-bold text-emerald-900">You joined {team?.teamName || 'the team'}</h3>
              <p className="mt-1 text-sm text-emerald-800">Your membership is saved. Open your team workspace to continue.</p>
              <button onClick={() => navigate(`/student/teams/${joinedTeamId}/members`)} className="mt-4 rounded-lg bg-[#5b4ce1] px-5 py-3 font-semibold text-white">View Team Members</button>
            </div>
          ) : (
            <div className="mt-8 rounded-xl bg-[#fbfaff] p-5 text-[#545d73]">
              <h3 className="font-bold text-[#1f2b40]">Ready to join?</h3>
              <p className="mt-2">After you enter a valid team code, the server will confirm eligibility and save your membership.</p>
            </div>
          )}
          <div className="mt-8 flex items-center justify-between border-t border-[#e6e9f1] pt-6">
            <button onClick={() => navigate('/student/teams')} className="font-semibold text-[#475569]">Back</button>
            {joinedTeamId && <button onClick={() => navigate(`/student/teams/${joinedTeamId}/members`)} className="rounded-xl bg-[#5b4ce1] px-6 py-3 font-semibold text-white">View Team Members</button>}
          </div>
        </section>
      </div>
    </main>
  );
};

export default StudentJoinTeam;
