import React, { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../api/api';
import { getTeamMembers } from '../api/teamApi';
import { uploadTeamFile } from '../services/student/teamsApi';

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';
const MAX_SIZE = 20 * 1024 * 1024;
const formatSize = (bytes = 0) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const messageDate = (value) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const time = (value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const classify = (file) => file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';

export default function TeamChat({ team, onMessageSent }) {
    const teamId = team?.id || team?._id;
    const currentUser = useMemo(() => JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}'), []);
    const userId = currentUser._id || currentUser.id;
    const [messages, setMessages] = useState([]);
    const [members, setMembers] = useState([]);
    const [media, setMedia] = useState([]);
    const [teamFiles, setTeamFiles] = useState([]);
    const [input, setInput] = useState('');
    const [pending, setPending] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [infoOpen, setInfoOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [preview, setPreview] = useState(null);
    const endRef = useRef(null);
    const fileRef = useRef(null);
    const socketRef = useRef(null);

    const loadRoom = async () => {
        if (!teamId) return;
        setLoading(true); setError('');
        try {
            const [messageRes, memberData] = await Promise.all([
                apiClient.get(`/chat/${teamId}/messages`),
                getTeamMembers(teamId),
            ]);
            setMessages(messageRes.data || []);
            setMembers(memberData || []);
        } catch (err) { setError(err.response?.data?.error?.message || 'Failed to load messages'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadRoom(); }, [teamId]);
    useEffect(() => {
        if (!infoOpen || !teamId) return;
        Promise.all([
            apiClient.get(`/chat/${teamId}/media`),
            apiClient.get(`/chat/${teamId}/files`),
        ]).then(([mediaResponse, filesResponse]) => {
            setMedia(mediaResponse.data || []);
            setTeamFiles(filesResponse.data || []);
        }).catch(() => setError('Failed to load team attachments.'));
    }, [infoOpen, teamId]);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, pending]);
    useEffect(() => () => pending?.url && URL.revokeObjectURL(pending.url), [pending]);

    useEffect(() => {
        if (!teamId || !userId) return undefined;
        const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/^http/, 'ws').replace(/\/api$/, '');
        const token = localStorage.getItem('token');
        if (!token) return undefined;
        const ws = new WebSocket(`${base}/api/chat/ws/${teamId}/${userId}?token=${encodeURIComponent(token)}`);
        socketRef.current = ws;
        ws.onmessage = (event) => {
            const eventData = JSON.parse(event.data);
            if (eventData.type === 'new_message' && eventData.message?.senderId !== userId) {
                setMessages(old => old.some(m => (m._id || m.id) === (eventData.message._id || eventData.message.id)) ? old : [...old, eventData.message]);
            }
        };
        // Polling is a resilient fallback where WebSockets are blocked by a proxy.
        const refresh = window.setInterval(() => { if (ws.readyState !== WebSocket.OPEN) loadRoom(); }, 10000);
        return () => { window.clearInterval(refresh); ws.close(); };
    }, [teamId, userId]);

    const chooseFile = (event) => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        if (file.size > MAX_SIZE || !ACCEPTED.split(',').includes(`.${file.name.split('.').pop().toLowerCase()}`)) {
            setError('Choose an image, video, PDF, Office document, or presentation up to 20 MB.'); return;
        }
        setPending({ file, kind: classify(file), url: URL.createObjectURL(file) }); setError('');
    };

    const send = async (event) => {
        event?.preventDefault();
        if ((!input.trim() && !pending) || sending) return;
        setSending(true); setError('');
        try {
            let sent;
            if (pending) {
                const uploaded = await uploadTeamFile(teamId, pending.file);
                sent = { _id: uploaded.id, senderId: userId, senderName: currentUser.name || 'You', content: `Shared file: ${uploaded.name}`, messageType: 'file', fileId: uploaded.id, attachmentName: uploaded.name, attachmentUrl: uploaded.url, attachmentType: uploaded.attachmentType || pending.kind, attachmentSize: pending.file.size, createdAt: new Date().toISOString() };
                setPending(null);
            } else {
                const { data } = await apiClient.post(`/chat/${teamId}/messages`, { content: input.trim(), messageType: 'text' }); sent = data;
            }
            setMessages(old => old.some(m => (m._id || m.id) === (sent._id || sent.id)) ? old : [...old, sent]);
            setInput(''); onMessageSent?.(sent);
        } catch (err) { setError(err.response?.data?.error?.message || 'Failed to send message'); }
        finally { setSending(false); }
    };

    const download = async (url, name, previewFile = false, previewType = 'image') => {
        try {
            const { data } = await apiClient.get(url.replace(/^\/api/, ''), { responseType: 'blob' });
            const localUrl = URL.createObjectURL(data);
            if (previewFile) setPreview({ url: localUrl, type: previewType, name });
            else { const a = document.createElement('a'); a.href = localUrl; a.download = name; a.click(); URL.revokeObjectURL(localUrl); }
        } catch (_) { setError('Unable to access this protected attachment.'); }
    };

    const visible = query ? messages.filter(m => `${m.content} ${m.senderName}`.toLowerCase().includes(query.toLowerCase())) : messages;
    let lastDate = '';
    return <div className="h-full min-h-[560px] flex overflow-hidden">
        <section className="min-w-0 flex-1 flex flex-col">
            <header className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0"><div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${team?.gradient || 'from-blue-600 to-indigo-600'} flex items-center justify-center font-bold text-white`}>{team?.name?.[0] || 'T'}</div><div className="min-w-0"><h2 className="font-bold text-white truncate">{team?.name} Team Chat</h2><p className="text-xs text-gray-400 truncate"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />{members.length || team?.members || 0} Members • {team?.domain || 'Technology'} • {team?.hackathon || 'Development'}</p></div></div>
                <div className="flex gap-1"><button onClick={() => setSearchOpen(v => !v)} aria-label="Search messages" className="p-2 text-gray-400 hover:text-white">⌕</button><button onClick={() => setInfoOpen(v => !v)} aria-label="Team information" className="p-2 text-gray-400 hover:text-white">ⓘ</button></div>
            </header>
            {searchOpen && <div className="p-3 border-b border-white/10"><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages" className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none" /></div>}
            <main className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {loading && <p className="text-center text-sm text-gray-400">Loading messages...</p>}
                {error && <div className="text-sm text-red-300 text-center"><span>{error}</span> <button className="underline" onClick={loadRoom}>Retry</button></div>}
                {!loading && !visible.length && <p className="text-center text-sm text-gray-500 py-12">No messages yet. Start the team conversation.</p>}
                {visible.map((message) => { const date = messageDate(message.createdAt); const divider = date !== lastDate ? (lastDate = date, <div key={`${message._id}-date`} className="text-center text-xs text-gray-500 my-4"><span className="bg-white/5 px-3 py-1 rounded-full">{date}</span></div>) : null; const mine = message.senderId === userId; return <React.Fragment key={message._id || message.id}>{divider}<article className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 text-gray-100 rounded-tl-none border border-white/10'}`}>{!mine && <p className="text-xs font-semibold text-indigo-300 mb-1">{message.senderName || 'Team member'}</p>}<Attachment message={message} onPreview={download} /><p className="whitespace-pre-wrap break-words text-sm">{message.attachmentName ? '' : message.content}</p><p className={`text-[10px] mt-1 ${mine ? 'text-indigo-100' : 'text-gray-500'}`}>{time(message.createdAt)}</p></div></article></React.Fragment>; })}<div ref={endRef} />
            </main>
            {pending && <div className="mx-4 mb-2 p-3 border border-white/10 rounded-xl bg-white/5 flex gap-3 items-center"><Preview pending={pending} /><div className="flex-1 text-sm text-white truncate">{pending.file.name}<p className="text-xs text-gray-400">{formatSize(pending.file.size)} · Ready to send</p></div><button onClick={() => setPending(null)} className="text-sm text-gray-300">Cancel</button><button onClick={send} className="text-sm px-3 py-1 rounded bg-indigo-600 text-white">Send</button></div>}
            <form onSubmit={send} className="p-4 border-t border-white/10 flex gap-2"><input ref={fileRef} type="file" accept={ACCEPTED} onChange={chooseFile} className="hidden" /><button type="button" onClick={() => fileRef.current?.click()} className="w-10 rounded-xl bg-white/5 text-lg text-gray-300 hover:text-white" aria-label="Attach a file">+</button><input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 min-w-0 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" /><button disabled={sending || (!input.trim() && !pending)} className="px-4 rounded-xl bg-indigo-600 disabled:opacity-50 text-sm font-semibold text-white">{sending ? 'Sending...' : 'Send'}</button></form>
        </section>
        {infoOpen && <aside className="w-72 max-w-[80vw] border-l border-white/10 p-5 overflow-y-auto bg-black/10"><div className="flex justify-between"><h3 className="font-bold text-white">Team info</h3><button onClick={() => setInfoOpen(false)} className="text-gray-400">×</button></div><p className="text-sm text-gray-400 mt-2">{members.length} Members</p><div className="mt-4 space-y-3">{members.map(member => <div key={member._id || member.id} className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-white/10 grid place-items-center text-xs text-white">{member.name?.[0] || '?'}</span><div className="min-w-0"><p className="text-sm text-white truncate">{member.name || 'Team member'}</p><p className="text-xs text-gray-500 capitalize">{(member.role || 'member').replaceAll('_', ' ')}</p></div></div>)}</div><div className="mt-7 space-y-3"><h4 className="text-sm font-semibold text-white">Media</h4>{media.length ? <div className="grid grid-cols-3 gap-2">{media.slice(0, 6).map(file => <InfoMediaItem key={file._id || file.id} file={file} onPreview={download} />)}</div> : <p className="text-xs text-gray-500">No shared media yet.</p>}<h4 className="text-sm font-semibold text-white pt-2">Files</h4>{teamFiles.filter(file => file.attachmentType === 'file').length ? <div className="space-y-2">{teamFiles.filter(file => file.attachmentType === 'file').slice(0, 5).map(file => <button key={file._id || file.id} onClick={() => download(file.url, file.name)} className="block w-full text-left text-xs text-indigo-300 truncate">📄 {file.name}</button>)}</div> : <p className="text-xs text-gray-500">No shared files yet.</p>}<h4 className="text-sm font-semibold text-white pt-2">Links</h4><p className="text-xs text-gray-500">Links shared in messages remain in chat history.</p></div></aside>}
        {preview && <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-6" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}>{preview.type === 'video' ? <video controls autoPlay src={preview.url} className="max-h-full max-w-full rounded-lg" onClick={event => event.stopPropagation()} /> : <img src={preview.url} alt={preview.name} className="max-h-full max-w-full rounded-lg" />}</div>}
    </div>;
}

function Preview({ pending }) { return pending.kind === 'image' ? <img src={pending.url} className="w-12 h-12 object-cover rounded" /> : pending.kind === 'video' ? <video src={pending.url} className="w-12 h-12 object-cover rounded" /> : <span className="text-2xl">📄</span>; }
function Attachment({ message, onPreview }) { if (!message.attachmentName) return null; const url = message.attachmentUrl; if (message.attachmentType === 'image' || message.attachmentType === 'video') return <ProtectedMedia url={url} name={message.attachmentName} type={message.attachmentType} onPreview={onPreview} />; return <div className="mb-2 text-sm"><span>📄 {message.attachmentName} · {formatSize(message.attachmentSize)}</span><button onClick={() => onPreview(url, message.attachmentName)} className="ml-3 underline">Download</button></div>; }
function ProtectedMedia({ url, name, type, onPreview }) {
    const [localUrl, setLocalUrl] = useState('');
    useEffect(() => { let active = true; let objectUrl = ''; apiClient.get(url.replace(/^\/api/, ''), { responseType: 'blob' }).then(({ data }) => { objectUrl = URL.createObjectURL(data); if (active) setLocalUrl(objectUrl); }).catch(() => {}); return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [url]);
    if (!localUrl) return <div className="mb-2 text-xs text-gray-300">Loading {type}…</div>;
    if (type === 'image') return <button onClick={() => onPreview(url, name, true, 'image')} className="block mb-2"><img src={localUrl} alt={name} className="max-h-56 rounded-lg" /></button>;
    return <div className="mb-2"><video controls src={localUrl} className="max-h-56 rounded-lg" /><div className="text-xs mt-1">🎬 {name} <button onClick={() => onPreview(url, name)} className="underline ml-2">Download</button></div></div>;
}
function InfoMediaItem({ file, onPreview }) {
    const [localUrl, setLocalUrl] = useState('');
    useEffect(() => { let active = true; let objectUrl = ''; apiClient.get(file.url.replace(/^\/api/, ''), { responseType: 'blob' }).then(({ data }) => { objectUrl = URL.createObjectURL(data); if (active) setLocalUrl(objectUrl); }).catch(() => {}); return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [file.url]);
    if (!localUrl) return <div className="aspect-square rounded bg-white/5 animate-pulse" />;
    if (file.attachmentType === 'image') return <button onClick={() => onPreview(file.url, file.name, true, 'image')} title={file.name}><img src={localUrl} alt={file.name} className="aspect-square w-full object-cover rounded" /></button>;
    return <button onClick={() => onPreview(file.url, file.name, true, 'video')} title={file.name} className="aspect-square rounded bg-white/5 text-xl">🎬</button>;
}
