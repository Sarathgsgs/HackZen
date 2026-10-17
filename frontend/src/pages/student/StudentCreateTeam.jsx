import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllHackathons } from '../../api/hackathonApi';
import { createTeam, getMyTeams } from '../../api/teamApi';

const StudentCreateTeam = () => {
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [myTeams, setMyTeams] = useState([]);
  const [createdTeam, setCreatedTeam] = useState(null);
  const [form, setForm] = useState({
    teamName: '',
    hackathonId: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadHackathons = async () => {
      try {
        const [hackathonsResult, teamsResult] = await Promise.allSettled([fetchAllHackathons(), getMyTeams()]);
        if (isMounted) {
          if (hackathonsResult.status === 'fulfilled') {
            const data = Array.isArray(hackathonsResult.value) ? hackathonsResult.value : [];
            setHackathons(data);
            if (data[0]?._id || data[0]?.id) setForm((prev) => ({ ...prev, hackathonId: data[0]._id || data[0].id }));
          } else {
            setLoadError('Could not load hackathons. Please refresh and try again.');
          }
          if (teamsResult.status === 'fulfilled') {
            setMyTeams(Array.isArray(teamsResult.value) ? teamsResult.value : []);
          } else {
            setLoadError('Could not check your team membership. Please refresh before creating a team.');
          }
        }
      } catch (requestError) {
        console.error('Failed to load hackathons:', requestError);
        if (isMounted) {
          setLoadError('Could not load team setup data. Please refresh and try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHackathons();
    return () => {
      isMounted = false;
    };
  }, []);

  const existingTeam = myTeams.find((team) => String(team.hackathonId) === String(form.hackathonId));

  const handleCreateTeam = async () => {
    if (!form.teamName.trim()) {
      setError('Please enter a team name.');
      return;
    }

    if (!form.hackathonId) {
      setError('Please select an active hackathon.');
      return;
    }

    try {
      setError('');
      const result = await createTeam({
        teamName: form.teamName.trim(),
        hackathonId: form.hackathonId,
      });
      setCreatedTeam(result);
      const teamIdentifier = result?._id || result?.id || result?.team?._id || result?.team?.id;
      if (teamIdentifier) navigate(`/student/teams/${teamIdentifier}/workspace`);
    } catch (requestError) {
      console.error('Failed to create team:', requestError);
      setError(requestError?.response?.data?.detail || 'Could not create the team right now. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3eef7] px-4 py-8 text-[#1f2430] md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-6 text-sm text-[#6d6a7d]">
          <span>Hackathons</span>
          <span className="mx-2">&gt;</span>
          <span>Hackathon</span>
          <span className="mx-2">&gt;</span>
          <span className="font-semibold text-[#1f2430]">Create Your Team</span>
        </div>

        <h1 className="mb-8 text-[42px] font-bold tracking-[-0.05em] text-[#1d1a2a]">Create Your Team</h1>

        <div className="mb-8 flex items-center gap-4 text-sm">
          {[1, 2, 3].map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                  index === 1
                    ? 'border-[#6d5ef7] bg-[#ece9ff] text-[#4f46e5]'
                    : 'border-[#d9d1ef] bg-white text-[#6b7280]'
                }`}
              >
                {step}
              </div>
              <span className={index === 1 ? 'font-medium text-[#4b5563]' : 'text-[#7a7488]'}>
                {step === 1 ? 'Registration' : step === 2 ? 'Team' : 'Confirmation'}
              </span>
              {index < 2 && <span className="text-[#c9c1d8]">—</span>}
            </div>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.9fr)]">
          <div className="rounded-[22px] border border-[#e2dbee] bg-[#f8f6fb] p-6 shadow-[0_8px_26px_rgba(83,63,166,0.04)] md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[28px] font-bold tracking-[-0.04em] text-[#1d1a2a]">Team Information</h2>
                <p className="mt-2 text-[#716e80]">Define your team configuration, identity, and member invitations.</p>
              </div>
              <span className="rounded-full border border-[#d9d1ef] bg-[#f1ebff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5a44c9]">
                Step 2 of 3
              </span>
            </div>

            {loading ? (
              <div role="status" className="rounded-[18px] border border-dashed border-[#d9d1ef] bg-white/40 p-10 text-center text-[#5f5a74]">Loading team setup…</div>
            ) : loadError ? (
              <div role="alert" className="rounded-[18px] border border-[#f3b4b0] bg-[#fff1f0] p-6 text-[#b42318]">{loadError}</div>
            ) : existingTeam ? (
              <div className="rounded-2xl border border-[#c9dcff] bg-[#eef4ff] p-6">
                <h3 className="text-xl font-bold">You are already on a team</h3>
                <p className="mt-2 text-[#59657a]">{existingTeam.teamName || 'Your team'} is associated with this account for this hackathon. Open its workspace to continue.</p>
                <button onClick={() => navigate(`/student/teams/${existingTeam._id || existingTeam.id}/workspace`)} className="mt-5 rounded-xl bg-[#5949df] px-5 py-3 font-semibold text-white">Open Team Workspace →</button>
              </div>
            ) : createdTeam ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="text-xl font-bold text-emerald-900">Team created</h3>
                <p className="mt-2 text-emerald-800">Your team is saved. Share its invite code with teammates.</p>
                {createdTeam.teamCode && <p className="mt-4 rounded-lg bg-white p-4 font-mono text-lg font-bold tracking-widest">{createdTeam.teamCode}</p>}
              </div>
            ) : hackathons.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#d9d1ef] bg-white/40 p-10 text-center text-[#5f5a74]">
                <h3 className="text-xl font-bold text-[#1d1a2a]">No hackathons available</h3>
                <p className="mt-3">There are no active hackathons to create a team for right now.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[#2d2c39]">Team Name *</label>
                    <input
                      value={form.teamName}
                      onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                      placeholder="Enter your team name"
                      className="w-full rounded-xl border border-[#d7d0ea] bg-white px-4 py-3 text-[#1d1a2a] placeholder:text-[#8e8b98] focus:border-[#6d5ef7] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[#2d2c39]">Hackathon *</label>
                    <select
                      value={form.hackathonId}
                      onChange={(e) => setForm({ ...form, hackathonId: e.target.value })}
                      className="w-full rounded-xl border border-[#d7d0ea] bg-white px-4 py-3 text-[#1d1a2a] focus:border-[#6d5ef7] focus:outline-none"
                    >
                      {hackathons.map((hackathon) => (
                        <option key={hackathon._id || hackathon.id} value={hackathon._id || hackathon.id}>
                          {hackathon.title || hackathon.name || 'Hackathon'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[#2d2c39]">Team Code</label>
                    <div className="flex items-center justify-between rounded-xl border border-[#d7d0ea] bg-white px-4 py-3 text-[#1d1a2a]">
                      <span className="text-[#7b7887]">Generated when the team is created</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[#2d2c39]">Team Size</label>
                    <div className="rounded-xl border border-[#d7d0ea] bg-white px-4 py-3 text-[#526079]">
                      Up to {hackathons.find((item) => (item._id || item.id) === form.hackathonId)?.maxTeamSize || 4} members
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-[18px] border border-[#dfe7f8] bg-[#edf4ff] p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#5a6578]">Team Name</div>
                      <div className="mt-2 text-base font-semibold text-[#1d1a2a]">{form.teamName || 'Not added'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#5a6578]">Team Size</div>
                      <div className="mt-2 text-base font-semibold text-[#1d1a2a]">{hackathons.find((item) => (item._id || item.id) === form.hackathonId)?.maxTeamSize ? `${hackathons.find((item) => (item._id || item.id) === form.hackathonId).maxTeamSize} members max` : 'Set by hackathon'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#5a6578]">Members</div>
                      <div className="mt-2 text-base font-semibold text-[#1d1a2a]">1 / {hackathons.find((item) => (item._id || item.id) === form.hackathonId)?.maxTeamSize || 4}</div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 rounded-xl border border-[#f3b4b0] bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318]">
                    {error}
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <button onClick={() => navigate('/student/teams')} className="text-sm font-semibold text-[#4b5563]">
                    ← Back
                  </button>
                  <button
                    onClick={handleCreateTeam}
                    className="rounded-xl bg-gradient-to-r from-[#6051d6] to-[#4f46e5] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.28)]"
                  >
                    Create Team →
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[22px] border border-[#d9d0f2] bg-[#efe9ff] p-6 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6657d8] text-sm font-bold text-white">i</div>
                <h3 className="text-[28px] font-bold tracking-[-0.04em] text-[#1d1a2a]">What happens next?</h3>
              </div>

              <ol className="space-y-4">
                {[1, 2, 3].map((step, index) => (
                  <li key={step} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5849d6] text-sm font-bold text-white">
                      {step}
                    </div>
                    <span className="text-base text-[#2d2c39]">
                      {index === 0 ? 'Create your team profile' : index === 1 ? 'Copy the unique team code' : 'Share with peers to join'}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-[22px] border border-[#d9d0f2] bg-white p-6 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
              <h3 className="mb-5 text-[28px] font-bold tracking-[-0.04em] text-[#1d1a2a]">Collaboration Resources</h3>
              <div className="space-y-3">
                {['Idea Generation Guide', 'Technical Stack Recommendations'].map((label) => (
                  <div key={label} className="rounded-xl border border-[#dfe7f8] bg-[#f8f9ff] px-4 py-3 text-base font-medium text-[#1f2430]">
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-[#d9d0f2] bg-white p-4 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
              <h3 className="mb-4 text-[28px] font-bold tracking-[-0.04em] text-[#1d1a2a]">Collaboration is Key</h3>
              <div className="rounded-[16px] border border-[#dfe7f8] bg-[#eaf2ff] p-4 text-sm text-[#546071]">
                Build diverse teams for better solutions.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCreateTeam;
