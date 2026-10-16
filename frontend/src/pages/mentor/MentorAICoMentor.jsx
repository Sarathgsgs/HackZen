import React, { useEffect, useState } from 'react';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';
import { sendChatMessage } from '../../services/student/aiAssistantApi';

export default function MentorAICoMentor() {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [projectUpdate, setProjectUpdate] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignedTeams().then(({ activeTeams }) => {
      setTeams(activeTeams);
      if (activeTeams[0]) setTeamId(activeTeams[0].id);
    }).catch(() => setError('Unable to load your assigned teams.'));
  }, []);

  const selectedTeam = teams.find((team) => team.id === teamId);
  const getGuidance = async (event) => {
    event.preventDefault();
    if (!selectedTeam || !projectUpdate.trim()) return setError('Choose a team and enter its project update.');
    if (!selectedTeam.hackathon || selectedTeam.hackathon === 'Active Hackathon') return setError('This team does not have a saved hackathon ID yet.');
    setLoading(true); setError(''); setResponse('');
    try {
      const result = await sendChatMessage(`You are advising ${selectedTeam.name}.\nProject update:\n${projectUpdate.trim()}`, selectedTeam.hackathon, 'Mentor project assessment');
      setResponse(result.text);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'AI Co-Mentor could not respond. Check the Gemini API configuration and try again.');
    } finally { setLoading(false); }
  };

  return <main className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
    <header><h1 className="text-3xl font-bold text-white">AI Co-Mentor</h1><p className="mt-2 text-gray-400">Send a saved team update for AI-assisted project guidance.</p></header>
    <form onSubmit={getGuidance} className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <label className="block text-sm font-medium text-gray-300">Assigned team<select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-navy-900/70 px-3 py-2.5 text-white outline-none focus:border-purple-400"><option value="">Select a team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.domain}</option>)}</select></label>
      <label className="mt-5 block text-sm font-medium text-gray-300">Project update<textarea value={projectUpdate} onChange={(event) => setProjectUpdate(event.target.value)} rows="9" placeholder="Describe progress, blockers, technical decisions, and the guidance you need…" className="mt-2 w-full rounded-xl border border-white/10 bg-navy-900/70 p-3 text-white outline-none focus:border-purple-400" /></label>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <button disabled={loading} className="mt-5 rounded-xl bg-purple-600 px-5 py-2.5 font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Getting guidance…' : 'Get AI guidance'}</button>
    </form>
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="font-semibold text-white">AI guidance</h2>{response ? <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-200">{response}</div> : <p className="mt-3 text-sm text-gray-400">Enter an update and select “Get AI guidance”. This sends a real API request and stores the exchange in the AI log.</p>}</section>
  </main>;
}
