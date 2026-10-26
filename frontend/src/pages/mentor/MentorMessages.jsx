import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  Users,
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
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';

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

export default function MentorMessages() {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

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

  const handleDownload = async (fileId, fileName, attachmentUrl) => {
    if (!fileId && !attachmentUrl) return;
    const targetId = fileId || (attachmentUrl && attachmentUrl.includes('/files/') ? attachmentUrl.split('/files/')[1]?.split('/')[0] : null);
    if (!targetId || !teamId) {
      if (attachmentUrl?.startsWith('http')) window.open(attachmentUrl, '_blank');
      return;
    }
    setDownloadingId(targetId);
    try {
      const response = await apiClient.get(`/chat/${teamId}/files/${targetId}/download`, {
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
      const directUrl = `${backend}/api/chat/${teamId}/files/${targetId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(directUrl, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!teamId || (!trimmed && !pendingFile) || sending) return;
    setSending(true);
    setError('');
    try {
      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        if (trimmed) formData.append('message', trimmed);
        const { data } = await apiClient.post(`/chat/${teamId}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (data?.chatMessage) {
          setMessages((current) => [...current, data.chatMessage]);
        }
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setText('');
      } else {
        const { data } = await apiClient.post(`/chat/${teamId}/messages`, { content: trimmed, messageType: 'text' });
        setMessages((current) => [...current, data]);
        setText('');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Message or file was not saved. Please try again.');
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
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Messages and attachments are shared transparently with your assigned team.</p>
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
                const hasAttachment = Boolean(message.fileId || message.attachmentName);
                const targetFileId = message.fileId || '';
                return (
                  <article key={message.id || message._id} className={`max-w-[85%] rounded-2xl px-4 py-3 ${ownMessage ? 'ml-auto bg-[#2563eb] text-white' : 'bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-slate-100'}`}>
                    <div className="flex items-center justify-between gap-5 text-[11px] opacity-75">
                      <span className="font-semibold">{ownMessage ? 'You' : message.senderName || 'Team member'}</span>
                      <time>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</time>
                    </div>
                    {message.content && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>}
                    {hasAttachment && (
                      <div className={`mt-2 flex items-center justify-between gap-3 rounded-xl border p-2.5 ${ownMessage ? 'border-blue-400/50 bg-white/15 text-white' : 'border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-navy-950/80 dark:text-white'}`}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ownMessage ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-950/50'}`}>
                            {getFileIcon(message.attachmentType, message.attachmentName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold" title={message.attachmentName}>
                              {message.attachmentName || 'Shared file'}
                            </p>
                            <p className="text-[10px] opacity-70">
                              {formatFileSize(message.attachmentSize) || 'Attachment'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownload(targetFileId, message.attachmentName, message.attachmentUrl)}
                          disabled={downloadingId === targetFileId && Boolean(targetFileId)}
                          className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${ownMessage ? 'bg-white text-[#2563eb] hover:bg-blue-50' : 'border border-slate-200 bg-slate-50 text-[#2563eb] hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-blue-300'}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{downloadingId === targetFileId ? 'Downloading...' : 'Download'}</span>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
        </div>

        <form onSubmit={sendMessage} className="border-t border-slate-200 p-4 dark:border-white/10">
          {pendingFile && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-[#2563eb] dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">{pendingFile.name}</span>
                <span className="shrink-0 text-slate-500 dark:text-slate-400">({formatFileSize(pendingFile.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="rounded p-1 text-slate-500 hover:bg-blue-100 hover:text-slate-900 dark:hover:bg-blue-900/50 dark:hover:text-white"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
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
              disabled={!teamId || sending}
              title="Attach file (Images, PDFs, Docs, Code, Zips)"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-[#2563eb] disabled:opacity-50 dark:border-white/10 dark:bg-navy-950 dark:text-slate-300"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              maxLength={5000}
              rows={2}
              disabled={!teamId || sending}
              placeholder={pendingFile ? 'Add an optional caption for this file...' : (teamId ? 'Write a message to your team...' : 'Select an assigned team to message')}
              className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-navy-950 dark:text-white"
            />
            <button
              type="submit"
              disabled={!teamId || (!text.trim() && !pendingFile) || sending}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{sending ? 'Sending' : 'Send'}</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
