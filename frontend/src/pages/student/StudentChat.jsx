import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Paperclip,
  Download,
  FileText,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  FileArchive,
  File,
  X,
} from 'lucide-react';
import apiClient from '../../api/api';
import { getMyTeams, getTeamMembers } from '../../api/teamApi';

const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.mov,.webm,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,.tar,.gz,.txt,.md,.csv,.py,.js,.jsx,.ts,.tsx,.json,.html,.css,.ipynb,.sql';

const formatFileSize = (bytes = 0) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type = '', name = '') => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || type === 'image') {
    return <ImageIcon className="h-5 w-5 text-purple-500" />;
  }
  if (['mp4', 'mov', 'webm'].includes(ext) || type === 'video') {
    return <VideoIcon className="h-5 w-5 text-emerald-500" />;
  }
  if (ext === 'pdf' || type === 'pdf') {
    return <FileText className="h-5 w-5 text-rose-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || type === 'archive') {
    return <FileArchive className="h-5 w-5 text-amber-500" />;
  }
  if (['py', 'js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'ipynb', 'sql'].includes(ext) || type === 'code') {
    return <FileCode className="h-5 w-5 text-cyan-500" />;
  }
  return <File className="h-5 w-5 text-blue-500" />;
};

const readUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}'); }
  catch { return {}; }
};
const timeOf = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};
const idOf = (item) => String(item?.id || item?._id || '');
const toMessage = (message, userId) => ({
  id: String(message._id || message.id),
  senderId: String(message.senderId || ''),
  sender: message.senderName || 'Team member',
  text: message.content || '',
  messageType: message.messageType || (message.fileId ? 'file' : 'text'),
  fileId: message.fileId || '',
  attachmentName: message.attachmentName || '',
  attachmentUrl: message.attachmentUrl || '',
  attachmentType: message.attachmentType || 'file',
  attachmentSize: message.attachmentSize || 0,
  createdAt: message.createdAt,
  time: timeOf(message.createdAt),
  mine: String(message.senderId || '') === String(userId),
});

const StudentChat = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTeamId = searchParams.get('teamId') || '';
  const user = useMemo(readUser, []);
  const currentTeamIdRef = useRef('');
  const userId = String(user._id || user.id || user.userId || '');
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('connecting');

  const mergeMessages = useCallback((incoming) => {
    const parsed = incoming
      .map((row) => toMessage(row, userId))
      .filter((row) => row.id && (row.text || row.attachmentName || row.fileId));
    setMessages((current) => {
      const byId = new Map(current.map((row) => [row.id, row]));
      parsed.forEach((row) => byId.set(row.id, row));
      return [...byId.values()].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    });
  }, [userId]);

  const loadConversation = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const rows = await getMyTeams();
      const ownTeams = Array.isArray(rows) ? rows : [];
      setTeams(ownTeams);
      const selected = requestedTeamId ? ownTeams.find((item) => idOf(item) === requestedTeamId) : ownTeams[0];
      if (!selected) {
        currentTeamIdRef.current = '';
        setTeam(null); setMembers([]); setMessages([]);
        if (requestedTeamId) setError('You no longer have access to the selected team conversation.');
        return;
      }
      const selectedId = idOf(selected);
      if (currentTeamIdRef.current !== selectedId) {
        currentTeamIdRef.current = selectedId;
        setMembers([]);
        setMessages([]);
      }
      setTeam((current) => idOf(current) === selectedId ? current : selected);
      if (selectedId !== requestedTeamId) setSearchParams({ teamId: selectedId }, { replace: true });
      const [{ data: history }, roster] = await Promise.all([
        apiClient.get(`/chat/${selectedId}/messages`, { params: { limit: 100 } }),
        getTeamMembers(selectedId),
      ]);
      setMembers(Array.isArray(roster) ? roster : []);
      mergeMessages(Array.isArray(history) ? history : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.detail || 'The team conversation could not be loaded. Please try again.');
    } finally { setLoading(false); }
  }, [requestedTeamId, setSearchParams, mergeMessages]);

  useEffect(() => {
    loadConversation(true);
    const refresh = () => loadConversation(false);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [loadConversation]);

  const activeTeamId = idOf(team);
  useEffect(() => {
    if (!activeTeamId) return undefined;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) { setConnection('disconnected'); return undefined; }
    const backend = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
    let stopped = false;
    let socket;
    let retryTimer;
    let retryDelay = 1000;
    const connect = () => {
      if (stopped) return;
      setConnection('connecting');
      socket = new WebSocket(`${backend.replace(/^http/, 'ws')}/api/chat/ws/${activeTeamId}/${encodeURIComponent(userId)}?token=${encodeURIComponent(token)}`);
      socket.onopen = () => { retryDelay = 1000; setConnection('connected'); };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.message) mergeMessages([payload.message]);
        } catch { /* Ignore malformed socket data; persisted history remains available. */ }
      };
      socket.onerror = () => setConnection('reconnecting');
      socket.onclose = (event) => {
        if (event.code === 1008) {
          setConnection('disconnected');
          setError('The server rejected this chat connection. Reload your session or verify team membership.');
          return;
        }
        if (!stopped) {
          setConnection('reconnecting');
          retryTimer = window.setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 15000);
        }
      };
    };
    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    };
  }, [activeTeamId, userId, mergeMessages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const handleDownload = async (fileId, fileName) => {
    if (!fileId || !activeTeamId) return;
    setDownloadingId(fileId);
    try {
      const response = await apiClient.get(`/chat/${activeTeamId}/files/${fileId}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName || 'attachment');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const backend = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
      const directUrl = `${backend}/api/chat/${activeTeamId}/files/${fileId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(directUrl, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const content = draft.trim();
    if ((!content && !pendingFile) || !activeTeamId || sending) return;
    setSending(true);
    setError('');
    try {
      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        if (content) {
          formData.append('message', content);
        }
        const { data } = await apiClient.post(`/chat/${activeTeamId}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (data?.chatMessage) {
          mergeMessages([data.chatMessage]);
        }
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setDraft('');
      } else {
        const { data } = await apiClient.post(`/chat/${activeTeamId}/send`, { content, type: 'text' });
        mergeMessages([data]);
        setDraft('');
      }
    } catch (sendError) {
      setError(sendError?.response?.data?.error?.message || sendError?.response?.data?.detail || 'The message or file could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const leader = members.find((member) => member.role === 'leader');
  const messageDate = (value) => {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading && !team) return <main className="p-5"><div className="rounded-2xl border border-[#e0ddec] bg-white p-10 text-center text-[#697386]">Loading your team chat...</div></main>;
  if (!team) return <main className="p-5"><div className="mx-auto max-w-2xl rounded-2xl border border-[#e0ddec] bg-white p-10 text-center"><h1 className="text-2xl font-bold">No team conversation available</h1><p className="mt-3 text-[#697386]">Join or create a team to access its conversation.</p><button onClick={() => navigate('/student/teams')} className="mt-5 rounded-lg bg-[#4d35c8] px-5 py-3 font-semibold text-white">Open My Teams</button></div></main>;

  return <main className="min-h-[calc(100vh-7rem)] p-3 text-[#202234] sm:p-5">
    <section className="mx-auto grid min-h-[min(820px,calc(100vh-9rem))] max-w-[1600px] overflow-hidden rounded-2xl border border-[#d9d4e5] bg-white shadow-sm lg:grid-cols-[250px_minmax(0,1fr)_300px]">
      <aside className="border-b border-[#d9d4e5] bg-[#fcfaff] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-[#ded9e8] px-5 py-4"><div className="min-w-0"><p className="truncate text-lg font-bold">{team.teamName}</p><p className="text-xs text-[#747386]">Team conversation</p></div><span aria-hidden="true" className="text-[#777489]">⌄</span></div>
        <div className="p-4"><label className="text-xs font-bold uppercase tracking-wide text-[#666477]">Your teams</label><select aria-label="Select team conversation" value={activeTeamId} onChange={(event) => setSearchParams({ teamId: event.target.value })} className="mt-2 w-full rounded-lg border border-[#dfdbe8] bg-white px-3 py-2.5 text-sm">{teams.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.teamName}</option>)}</select>
          <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-[#666477]">Conversation</p><button className="w-full rounded-lg border-l-[3px] border-[#6349e8] bg-[#eee9ff] px-3 py-2.5 text-left text-sm font-semibold text-[#5841d1]">Team conversation</button>
          <button onClick={() => navigate(`/student/teams/${activeTeamId}/members`)} className="mt-7 w-full rounded-lg border border-[#e4e0eb] bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#4b4a5c]">View team members</button>
        </div>
      </aside>

      <section className="flex min-h-[600px] min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded9e8] bg-[#fcfaff] px-5 py-4"><div><h1 className="text-lg font-bold">Team chat</h1><p className="text-xs text-[#747386]">{members.length} {members.length === 1 ? 'member' : 'members'} <span className="px-1">·</span><span className={connection === 'connected' ? 'text-emerald-700' : 'text-gray-500'}>{connection === 'connected' ? 'Connected' : connection === 'reconnecting' ? 'Reconnecting' : 'Connecting'}</span></p></div><button onClick={() => navigate(`/student/teams/${activeTeamId}/workspace`)} className="rounded-lg border border-[#ded9e8] bg-white px-3 py-2 text-sm font-semibold text-[#5042c2]">Team workspace</button></header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
          {loading && messages.length === 0 && <p className="text-center text-sm text-[#747386]">Loading messages...</p>}
          {!loading && messages.length === 0 && <div className="rounded-xl border border-dashed border-[#ded9e8] bg-[#fcfaff] p-8 text-center text-sm text-[#747386]">No messages in this team conversation yet.</div>}
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showDate = !previous || messageDate(previous.createdAt) !== messageDate(message.createdAt);
            const hasAttachment = Boolean(message.fileId || message.attachmentName);
            return (
              <React.Fragment key={message.id}>
                {showDate && (
                  <div className="flex justify-center">
                    <span className="rounded-full border border-[#ddd8ea] bg-[#eff6ff] px-3 py-1 text-xs text-[#5d5b6d]">
                      {messageDate(message.createdAt) || 'Date unavailable'}
                    </span>
                  </div>
                )}
                <article className={`flex gap-3 ${message.mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[min(82%,620px)] ${message.mine ? 'order-2' : ''}`}>
                    <div className={`mb-1 flex flex-wrap items-center gap-x-2 text-sm ${message.mine ? 'justify-end' : ''}`}>
                      <strong>{message.mine ? 'You' : message.sender}</strong>
                      <time className="text-xs text-[#777489]">{message.time}</time>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${message.mine ? 'border-[#d9cffc] bg-[#f3efff]' : 'border-[#e2deeb] bg-[#fcfaff]'}`}>
                      {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                      {hasAttachment && (
                        <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${message.text ? 'mt-2.5' : ''} ${message.mine ? 'border-[#c8bdf5] bg-white/90' : 'border-[#ded9e8] bg-white'}`}>
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#efeafc]">
                              {getFileIcon(message.attachmentType, message.attachmentName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#202234]" title={message.attachmentName}>
                                {message.attachmentName || 'Shared file'}
                              </p>
                              <p className="text-xs text-[#747386]">
                                {formatFileSize(message.attachmentSize) || 'Attachment'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownload(message.fileId, message.attachmentName)}
                            disabled={downloadingId === message.fileId}
                            title="Download file"
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#ded9e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#4d35c8] shadow-sm transition hover:bg-[#f6f4fe] disabled:opacity-50"
                          >
                            <Download className="h-4 w-4" />
                            <span>{downloadingId === message.fileId ? 'Downloading...' : 'Download'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </React.Fragment>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-[#ded9e8] bg-[#fcfaff] p-3 sm:p-4">
          {pendingFile && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-[#c8bdf5] bg-[#f4f0ff] px-3 py-2 text-xs text-[#4d35c8]">
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-4 w-4 shrink-0 text-[#6349e8]" />
                <span className="truncate font-medium">{pendingFile.name}</span>
                <span className="shrink-0 text-[#777489]">({formatFileSize(pendingFile.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="rounded p-1 text-[#666477] hover:bg-[#e4ddfb] hover:text-[#202234]"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-[#d9d4e5] bg-white p-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setPendingFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file (Images, PDFs, Docs, Code, Zips)"
              className="rounded-lg p-2 text-[#666477] transition hover:bg-[#ede9f9] hover:text-[#4d35c8]"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              aria-label="Message team"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={pendingFile ? "Add an optional caption..." : "Message your team..."}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={sending || (!draft.trim() && !pendingFile)}
              className="rounded-lg bg-[#4d35c8] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          <p className="mt-2 px-1 text-xs text-[#777489]">Messages and files are saved and transparent to all team members and mentors.</p>
        </form>
      </section>

      <aside className="border-t border-[#d9d4e5] bg-[#fcfaff] p-5 lg:border-l lg:border-t-0"><h2 className="border-b border-[#ded9e8] pb-4 text-lg font-bold">Team Context</h2><section className="mt-5"><h3 className="text-xs font-bold uppercase tracking-wide text-[#666477]">Team members</h3><ul className="mt-4 space-y-4">{members.map((member) => <li key={member.id || member._id || member.userId} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8e7f5] text-xs font-bold text-[#5551a1]">{(member.name || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-sm">{member.name || 'Team member'}</strong><span className="text-xs text-[#777489]">{member.role === 'leader' ? 'Team lead' : 'Team member'}</span></span></li>)}</ul></section>
        <section className="mt-7 border-t border-[#ded9e8] pt-5"><h3 className="text-xs font-bold uppercase tracking-wide text-[#666477]">Team details</h3><p className="mt-3 text-sm font-semibold">{team.teamName}</p><p className="mt-1 text-xs text-[#777489]">{team.hackathonName || 'Hackathon'}</p><p className="mt-3 text-sm text-[#68677a]">{members.length}{team.maxTeamSize ? ` / ${team.maxTeamSize}` : ''} members</p></section>
        <section className="mt-7 border-t border-[#ded9e8] pt-5"><h3 className="text-xs font-bold uppercase tracking-wide text-[#666477]">Team lead</h3><p className="mt-3 text-sm font-semibold">{leader?.name || 'Not available'}</p><button onClick={() => navigate(`/student/teams/${activeTeamId}/members`)} className="mt-3 text-sm font-semibold text-[#5143c5]">Open team roster</button></section>
      </aside>
    </section>
  </main>;
};

export default StudentChat;
