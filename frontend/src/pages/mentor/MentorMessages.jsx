import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, Users } from 'lucide-react';
import apiClient from '../../api/api';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';

export default function MentorMessages() {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const user = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);
  const selectedTeam = teams.find((team) => team.id === teamId);

  useEffect(() => {
    let active = true;
    fetchAssignedTeams()
      .then(({ activeTeams }) => {
        if (!active) return;
        setTeams(activeTeams);
        setTeamId(activeTeams[0]?.id || '');
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || 'Could not load assigned teams.');
      })
      .finally(() => { if (active) setLoadingTeams(false); });
    return () => { active = false; };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!teamId) { setMessages([]); return; }
    setLoadingMessages(true);
    setError('');
    try {
      const { data } = await apiClient.get(`/chat/${teamId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setMessages([]);
      setError(requestError.response?.data?.detail || 'Could not load this team conversation.');
    } finally {
      setLoadingMessages(false);
    }
  }, [teamId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!teamId || !text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const { data } = await apiClient.post(`/chat/${teamId}/messages`, { content: text.trim(), messageType: 'text' });
      setMessages((current) => [...current, data]);
      setText('');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Message was not saved. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl pb-12">
      <section className="flex h-[calc(100vh-160px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#111625]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-white/10">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Team Messages</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Messages are shared with your assigned team and saved to the workspace.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Users className="h-4 w-4" />
            <select value={teamId} onChange={(event) => setTeamId(event.target.value)} disabled={loadingTeams || teams.length === 0} className="max-w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-navy-950 dark:text-white">
              {loadingTeams && <option value="">Loading teams...</option>}
              {!loadingTeams && teams.length === 0 && <option value="">No assigned teams</option>}
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
        </header>

        {selectedTeam && <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800 dark:border-white/5 dark:text-slate-200">{selectedTeam.name}</div>}
        {error && <p role="alert" className="mx-5 mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-300">{error}</p>}

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {loadingMessages ? <p className="py-10 text-center text-sm text-slate-400">Loading messages...</p>
            : messages.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No messages yet. Start the conversation with your team.</p>
              : messages.map((message) => {
                const ownMessage = String(message.senderId) === String(user._id || user.id);
                return <article key={message.id || message._id} className={`max-w-[85%] rounded-2xl px-4 py-3 ${ownMessage ? 'ml-auto bg-[#5B45D9] text-white' : 'bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-slate-100'}`}>
                  <div className="flex items-center justify-between gap-5 text-[11px] opacity-75"><span>{ownMessage ? 'You' : message.senderName || 'Team member'}</span><time>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</time></div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>
                </article>;
              })}
        </div>

        <form onSubmit={sendMessage} className="flex items-end gap-3 border-t border-slate-200 p-4 dark:border-white/10">
          <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} maxLength={5000} rows={2} disabled={!teamId || sending} placeholder={teamId ? 'Write a message...' : 'Select an assigned team to message'} className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-[#5B45D9] dark:border-white/10 dark:bg-navy-950 dark:text-white" />
          <button type="submit" disabled={!teamId || !text.trim() || sending} className="inline-flex items-center gap-2 rounded-xl bg-[#5B45D9] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{sending ? 'Sending' : 'Send'}</button>
        </form>
      </section>
    </main>
  );
}
