import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Hash,
  Volume2,
  Phone,
  Video,
  MoreVertical,
  Plus,
  AtSign,
  Smile,
  Send,
  FileText,
  Download,
  GitCommit,
  GitBranch,
  ChevronDown,
  X,
  Search,
  Users,
  PanelRightOpen,
  PanelRightClose,
  Menu,
  CheckCircle2,
  ExternalLink,
  Layers,
  Paperclip
} from 'lucide-react';
import apiClient from '../api/api';
import { getTeamMembers } from '../api/teamApi';
import { uploadTeamFile } from '../services/student/teamsApi';
import { fetchAssignedTeams } from '../services/mentor/assignedTeamsApi';
import { useMentor } from '../context/MentorContext';

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';
const MAX_SIZE = 20 * 1024 * 1024;

const formatSize = (bytes = 0) =>
  bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const messageDate = (value) =>
  new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const classify = (file) =>
  file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
    ? 'video'
    : 'file';

export default function TeamChat({
  team: initialTeam,
  onMessageSent,
  customHeight = 'h-[calc(100vh-140px)] min-h-[640px]'
}) {
  const mentorContext = (() => {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useMentor();
    } catch {
      return null;
    }
  })();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userId = currentUser._id || currentUser.id || 'current-user';

  // Team management & switcher
  const [selectedTeam, setSelectedTeam] = useState(() => initialTeam || {
    id: 'team-alpha',
    _id: 'team-alpha',
    name: 'Alpha Innovation',
    teamName: 'Alpha Innovation',
    domain: 'Artificial Intelligence',
    hackathon: 'AI Innovation Challenge',
    membersCount: 5
  });

  const [availableTeams, setAvailableTeams] = useState([
    {
      id: 'team-alpha',
      _id: 'team-alpha',
      name: 'Alpha Innovation',
      teamName: 'Alpha Innovation',
      domain: 'Artificial Intelligence',
      hackathon: 'AI Innovation Challenge',
      membersCount: 5
    },
    {
      id: 'team-nova',
      _id: 'team-nova',
      name: 'Nova HealthTech',
      teamName: 'Nova HealthTech',
      domain: 'Healthcare AI',
      hackathon: 'Global Health 2025',
      membersCount: 4
    }
  ]);

  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  // Sync initialTeam prop if it changes
  useEffect(() => {
    if (initialTeam) {
      setSelectedTeam((prev) => ({
        ...prev,
        ...initialTeam,
        id: initialTeam.id || initialTeam._id || prev.id,
        name: initialTeam.name || initialTeam.teamName || prev.name
      }));
    }
  }, [initialTeam]);

  // Load user's real assigned teams if available
  useEffect(() => {
    fetchAssignedTeams()
      .then((res) => {
        if (res && res.activeTeams && res.activeTeams.length > 0) {
          setAvailableTeams(res.activeTeams);
          if (!initialTeam) {
            setSelectedTeam(res.activeTeams[0]);
          }
        }
      })
      .catch(() => {});
  }, [initialTeam]);

  const teamId = selectedTeam?.id || selectedTeam?._id;

  // Active channel / DM state
  const [activeRoomType, setActiveRoomType] = useState('channel'); // 'channel' | 'dm'
  const [activeRoomId, setActiveRoomId] = useState('general');
  const [activeRoomName, setActiveRoomName] = useState('general');

  // Channels definition matching Reference Image 2
  const [channels] = useState([
    { id: 'general', name: 'general', unread: 0, isDefault: true },
    { id: 'design-sync', name: 'design-sync', unread: 2 },
    { id: 'backend-dev', name: 'backend-dev', unread: 0 },
    { id: 'daily-standup', name: 'daily-standup', unread: 0, isBroadcast: true },
  ]);

  // Direct Messages definition matching Reference Image 2
  const [directMessages] = useState([
    {
      id: 'dm-sarah',
      name: 'Sarah Chen (Mentor)',
      shortName: 'Sara',
      isMentor: true,
      online: true,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
    },
    {
      id: 'dm-james',
      name: 'James Doe',
      shortName: 'James Doe',
      initials: 'JD',
      role: 'Lead Developer',
      online: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
    },
  ]);

  // Messages state
  const [channelMessages, setChannelMessages] = useState({
    general: [
      {
        id: 'msg-1',
        _id: 'msg-1',
        senderId: 'james-101',
        senderName: 'James Doe',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
        content: "Hey team, I've pushed the initial commit for the database schema. Can someone review the relations before we start building the API endpoints?",
        time: '10:42 AM',
        createdAt: new Date().toISOString(),
        isMentor: false,
      },
      {
        id: 'msg-2',
        _id: 'msg-2',
        senderId: 'sara-202',
        senderName: 'Sara',
        isMentor: true,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
        content: "Looking good, James! The many-to-many relationship on the Users/Hackathons table seems correct. I've attached a quick diagram I drew up for the authentication flow we discussed yesterday.",
        time: '11:05 AM',
        createdAt: new Date().toISOString(),
        attachmentName: 'Auth_Flow_Diagram.pdf',
        attachmentSize: 2.4 * 1024 * 1024,
        attachmentType: 'pdf',
      },
      {
        id: 'msg-3',
        _id: 'msg-3',
        isSystem: true,
        content: 'System: GitHub webhook configured successfully by James Doe.',
        createdAt: new Date().toISOString(),
      },
    ],
    'design-sync': [
      {
        id: 'ds-1',
        _id: 'ds-1',
        senderId: 'alex-303',
        senderName: 'Alex Miller',
        initials: 'AM',
        content: 'Figma component library updated with the dark/light palette tokens.',
        time: '9:30 AM',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ds-2',
        _id: 'ds-2',
        senderId: 'sara-202',
        senderName: 'Sara',
        isMentor: true,
        content: 'Checked the contrast ratios, text contrast is WCAG AA compliant!',
        time: '9:45 AM',
        createdAt: new Date().toISOString(),
      },
    ],
    'backend-dev': [
      {
        id: 'bd-1',
        _id: 'bd-1',
        senderId: 'james-101',
        senderName: 'James Doe',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
        content: 'FastAPI router setup complete with rate limiting middleware.',
        time: '8:15 AM',
        createdAt: new Date().toISOString(),
      },
    ],
    'daily-standup': [
      {
        id: 'su-1',
        _id: 'su-1',
        senderId: 'james-101',
        senderName: 'James Doe',
        content: 'Today: finalizing auth flow and WebSocket chat handler.',
        time: 'Yesterday',
        createdAt: new Date().toISOString(),
      },
    ],
    'dm-sarah': [
      {
        id: 'dms-1',
        _id: 'dms-1',
        senderId: 'sara-202',
        senderName: 'Sarah Chen (Mentor)',
        isMentor: true,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
        content: 'Hi! Let me know if your team needs help preparing the pitch deck.',
        time: 'Yesterday',
        createdAt: new Date().toISOString(),
      },
    ],
    'dm-james': [
      {
        id: 'dmj-1',
        _id: 'dmj-1',
        senderId: 'james-101',
        senderName: 'James Doe',
        initials: 'JD',
        content: 'Hey, did you push the latest Figma export?',
        time: '2h ago',
        createdAt: new Date().toISOString(),
      },
    ],
  });

  // Current active message list
  const currentMessages = useMemo(
    () => channelMessages[activeRoomId] || [],
    [channelMessages, activeRoomId]
  );

  // Team Context Data
  const [members, setMembers] = useState([
    {
      _id: 'mem-1',
      id: 'mem-1',
      name: 'Sara',
      role: 'Mentor',
      online: true,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80',
    },
    {
      _id: 'mem-2',
      id: 'mem-2',
      name: 'James Doe',
      role: 'Lead Developer',
      online: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
    },
    {
      _id: 'mem-3',
      id: 'mem-3',
      name: 'Alex Miller',
      role: 'Designer',
      initials: 'AM',
      online: true,
    },
  ]);

  const [pinnedResources] = useState([
    { id: 1, title: 'Problem Statement', type: 'doc', icon: FileText, url: '#' },
    { id: 2, title: 'Figma Link', type: 'figma', icon: Layers, url: '#' },
    { id: 3, title: 'GitHub Repo', type: 'github', icon: GitBranch, url: '#' },
  ]);

  const [activeTasks] = useState([
    {
      id: 1,
      title: 'API Integration',
      due: 'TOMORROW',
      dueType: 'urgent',
      progress: 70,
      assignee: 'James Doe',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      title: 'User Testing',
      due: 'IN 3 DAYS',
      dueType: 'normal',
      progress: 25,
      assignee: 'Alex Miller',
      initials: 'AM',
    },
  ]);

  // Composer state
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Mobile / Responsive panels toggles
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);

  // Attachment preview modal
  const [preview, setPreview] = useState(null);

  const endRef = useRef(null);
  const fileRef = useRef(null);
  const socketRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, pending]);

  // Load room messages & members from backend if teamId exists
  const loadRoom = useCallback(async () => {
    if (!teamId || teamId.startsWith('team-alpha')) return;
    setLoading(true);
    setError('');
    try {
      const [messageRes, memberData] = await Promise.all([
        apiClient.get(`/chat/${teamId}/messages`),
        getTeamMembers(teamId).catch(() => []),
      ]);
      if (Array.isArray(messageRes.data) && messageRes.data.length > 0) {
        setChannelMessages((prev) => ({
          ...prev,
          general: messageRes.data,
        }));
      }
      if (Array.isArray(memberData) && memberData.length > 0) {
        setMembers(memberData);
      }
    } catch (err) {
      console.warn('Real chat load notice:', err.message);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!teamId || teamId.startsWith('team-alpha') || !userId) return undefined;
    const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api')
      .replace(/^http/, 'ws')
      .replace(/\/api$/, '');
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    try {
      const ws = new WebSocket(
        `${base}/api/chat/ws/${teamId}/${userId}?token=${encodeURIComponent(token)}`
      );
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          if (eventData.type === 'new_message' && eventData.message?.senderId !== userId) {
            setChannelMessages((prev) => {
              const current = prev[activeRoomId] || [];
              if (current.some((m) => (m._id || m.id) === (eventData.message._id || eventData.message.id))) {
                return prev;
              }
              return {
                ...prev,
                [activeRoomId]: [...current, eventData.message],
              };
            });
          }
        } catch (e) {
          console.error(e);
        }
      };

      const refresh = window.setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) loadRoom();
      }, 12000);

      return () => {
        window.clearInterval(refresh);
        ws.close();
      };
    } catch (e) {
      console.warn('WebSocket init notice:', e);
    }
  }, [teamId, userId, activeRoomId, loadRoom]);

  // Clean up pending file url
  useEffect(() => {
    return () => {
      if (pending?.url) URL.revokeObjectURL(pending.url);
    };
  }, [pending]);

  // Choose file attachment
  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (
      file.size > MAX_SIZE ||
      !ACCEPTED.split(',').includes(`.${file.name.split('.').pop().toLowerCase()}`)
    ) {
      setError('Choose an image, video, PDF, Office document, or presentation up to 20 MB.');
      return;
    }
    setPending({ file, kind: classify(file), url: URL.createObjectURL(file) });
    setError('');
  };

  // Send message
  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!input.trim() && !pending) || sending) return;

    setSending(true);
    setError('');

    const newMsgText = input.trim();
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let sentMessage = null;

    try {
      // If connected to a real team on backend, attempt server post
      if (teamId && !teamId.startsWith('team-alpha')) {
        if (pending) {
          const uploaded = await uploadTeamFile(teamId, pending.file);
          sentMessage = {
            _id: uploaded.id,
            id: uploaded.id,
            senderId: userId,
            senderName: currentUser.name || 'You',
            content: `Shared file: ${uploaded.name}`,
            messageType: 'file',
            fileId: uploaded.id,
            attachmentName: uploaded.name,
            attachmentUrl: uploaded.url,
            attachmentType: uploaded.attachmentType || pending.kind,
            attachmentSize: pending.file.size,
            createdAt: now.toISOString(),
            time: timeFormatted,
          };
          setPending(null);
        } else {
          const { data } = await apiClient.post(`/chat/${teamId}/messages`, {
            content: newMsgText,
            messageType: 'text',
          });
          sentMessage = {
            ...data,
            time: timeFormatted,
          };
        }
      } else {
        // Local simulation fallback preserving state
        if (pending) {
          sentMessage = {
            id: `msg-${Date.now()}`,
            _id: `msg-${Date.now()}`,
            senderId: userId,
            senderName: currentUser.name || 'You',
            isMentor: currentUser.role === 'mentor',
            content: newMsgText || `Shared file: ${pending.file.name}`,
            attachmentName: pending.file.name,
            attachmentSize: pending.file.size,
            attachmentType: pending.kind,
            time: timeFormatted,
            createdAt: now.toISOString(),
          };
          setPending(null);
        } else {
          sentMessage = {
            id: `msg-${Date.now()}`,
            _id: `msg-${Date.now()}`,
            senderId: userId,
            senderName: currentUser.name || (currentUser.role === 'mentor' ? 'Sara' : 'You'),
            isMentor: currentUser.role === 'mentor' || true,
            content: newMsgText,
            time: timeFormatted,
            createdAt: now.toISOString(),
          };
        }
      }

      // Add to channel
      setChannelMessages((prev) => ({
        ...prev,
        [activeRoomId]: [...(prev[activeRoomId] || []), sentMessage],
      }));

      setInput('');
      onMessageSent?.(sentMessage);
    } catch (err) {
      console.warn('Send fallback:', err.message);
      // Even if offline or mock, append locally so user action succeeds
      const fallbackMsg = {
        id: `msg-${Date.now()}`,
        senderId: userId,
        senderName: currentUser.name || 'You',
        content: newMsgText,
        time: timeFormatted,
        createdAt: now.toISOString(),
      };
      setChannelMessages((prev) => ({
        ...prev,
        [activeRoomId]: [...(prev[activeRoomId] || []), fallbackMsg],
      }));
      setInput('');
      setPending(null);
    } finally {
      setSending(false);
    }
  };

  // Download attachment handler
  const handleDownloadAttachment = async (name, url) => {
    if (url && url.startsWith('http')) {
      window.open(url, '_blank');
      return;
    }
    // Create quick synthetic blob download for demo assets
    const blob = new Blob([`HackZen Project Resource: ${name}`], { type: 'application/pdf' });
    const localUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = localUrl;
    a.download = name;
    a.click();
    URL.revokeObjectURL(localUrl);

    if (mentorContext?.addToast) {
      mentorContext.addToast('Download Started', `Downloading ${name}`, 'info');
    }
  };

  // Channel switcher
  const handleSelectChannel = (channel) => {
    setActiveRoomType('channel');
    setActiveRoomId(channel.id);
    setActiveRoomName(channel.name);
    setMobileChannelsOpen(false);
  };

  // DM switcher
  const handleSelectDM = (dm) => {
    setActiveRoomType('dm');
    setActiveRoomId(dm.id);
    setActiveRoomName(dm.name);
    setMobileChannelsOpen(false);
  };

  return (
    <div
      className={`w-full ${customHeight} bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row overflow-hidden font-sans transition-colors relative`}
    >
      {/* ========================================================= */}
      {/* LEFT COLUMN: Channels and Direct Messages */}
      {/* ========================================================= */}
      <div
        className={`w-64 sm:w-72 bg-white dark:bg-[#111625] border-r border-slate-200/80 dark:border-white/10 flex flex-col shrink-0 z-20 ${
          mobileChannelsOpen
            ? 'fixed inset-y-0 left-0 shadow-2xl z-50 md:relative md:shadow-none'
            : 'hidden md:flex'
        }`}
      >
        {/* Workspace / Team Header with Selector */}
        <div className="p-4 px-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between relative bg-white dark:bg-[#111625]">
          <div
            onClick={() => setTeamDropdownOpen((prev) => !prev)}
            className="flex items-center justify-between w-full cursor-pointer group"
          >
            <div className="min-w-0 pr-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#2563eb] transition-colors">
                {selectedTeam.name || selectedTeam.teamName || 'Alpha Innovation'}
              </h2>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform ${
                teamDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </div>

          {/* Close for mobile drawer */}
          {mobileChannelsOpen && (
            <button
              onClick={() => setMobileChannelsOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-slate-700 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Team Switcher Popover */}
          {teamDropdownOpen && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white dark:bg-navy-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1.5 z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/5">
                Switch Team Workspace
              </div>
              {availableTeams.map((t) => (
                <button
                  key={t.id || t._id}
                  onClick={() => {
                    setSelectedTeam(t);
                    setTeamDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors ${
                    (selectedTeam.id || selectedTeam._id) === (t.id || t._id)
                      ? 'text-[#2563eb] dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="truncate">{t.name || t.teamName}</span>
                  {(selectedTeam.id || selectedTeam._id) === (t.id || t._id) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Channels & DMs List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          {/* Section: CHANNELS */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase">
              CHANNELS
            </div>
            <div className="space-y-0.5">
              {channels.map((chan) => {
                const isActive = activeRoomType === 'channel' && activeRoomId === chan.id;
                return (
                  <button
                    key={chan.id}
                    onClick={() => handleSelectChannel(chan)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-[#eff6ff] text-[#2563eb] font-bold dark:bg-[#2563eb]/20 dark:text-blue-300 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {chan.isBroadcast ? (
                        <Volume2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#2563eb] dark:text-blue-300' : 'text-slate-400'
                          }`}
                        />
                      ) : (
                        <Hash
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#2563eb] dark:text-blue-300' : 'text-slate-400'
                          }`}
                        />
                      )}
                      <span className="truncate">{chan.name}</span>
                    </div>

                    {chan.unread > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-tight shrink-0 shadow-2xs">
                        {chan.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: DIRECT MESSAGES */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase">
              DIRECT MESSAGES
            </div>
            <div className="space-y-1">
              {directMessages.map((dm) => {
                const isActive = activeRoomType === 'dm' && activeRoomId === dm.id;
                return (
                  <button
                    key={dm.id}
                    onClick={() => handleSelectDM(dm)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#eff6ff] text-[#2563eb] font-bold dark:bg-[#2563eb]/20 dark:text-blue-300 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {dm.avatar ? (
                        <img
                          src={dm.avatar}
                          alt={dm.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center">
                          {dm.initials || 'U'}
                        </div>
                      )}
                      {dm.online && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#111625]" />
                      )}
                    </div>
                    <span className="truncate text-left">{dm.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileChannelsOpen && (
        <div
          onClick={() => setMobileChannelsOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-2xs"
        />
      )}

      {/* ========================================================= */}
      {/* CENTER COLUMN: Chat Conversation */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#111625] h-full relative">
        {/* Chat Header */}
        <div className="h-16 px-4 sm:px-6 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-[#111625]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button for mobile channel switcher */}
            <button
              onClick={() => setMobileChannelsOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg"
              title="Open channels"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Room Identifier */}
            <div className="flex items-center gap-2 min-w-0">
              {activeRoomType === 'channel' ? (
                <Hash className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {activeRoomName}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                  <span>5 members</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Sarah Chen (Mentor) is online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Icons matching Reference Image 2: Phone, Video, Three Dots, Info */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => mentorContext?.addToast?.('Calling Channel', 'Voice call connecting...', 'info')}
              className="p-2 text-slate-500 hover:text-[#2563eb] hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-300 dark:hover:bg-white/5 rounded-xl transition-colors"
              title="Start voice call"
            >
              <Phone className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (mentorContext?.openScheduleModal) {
                  mentorContext.openScheduleModal({ teamName: selectedTeam.name });
                } else if (mentorContext?.addToast) {
                  mentorContext.addToast('Video Call', 'Opening consultation session...', 'info');
                }
              }}
              className="p-2 text-slate-500 hover:text-[#2563eb] hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-300 dark:hover:bg-white/5 rounded-xl transition-colors"
              title="Start video session"
            >
              <Video className="w-4 h-4" />
            </button>

            <button
              type="button"
              className="p-2 text-slate-500 hover:text-[#2563eb] hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-300 dark:hover:bg-white/5 rounded-xl transition-colors"
              title="Channel options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Toggle Team Context Panel for tablet/mobile */}
            <button
              type="button"
              onClick={() => setContextPanelOpen((prev) => !prev)}
              className={`p-2 rounded-xl transition-colors lg:hidden ${
                contextPanelOpen
                  ? 'text-[#2563eb] bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Toggle Team Context"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation Message Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-white dark:bg-[#111625]">
          {loading && (
            <p className="text-center text-xs text-slate-400 py-4 animate-pulse">
              Loading team messages...
            </p>
          )}

          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-center flex items-center justify-center gap-2">
              <span>{error}</span>
              <button onClick={loadRoom} className="underline font-bold">
                Retry
              </button>
            </div>
          )}

          {/* Date Separator matching Reference Image 2: "Today" */}
          <div className="flex items-center justify-center my-4">
            <span className="px-3.5 py-1 rounded-full bg-[#F4F4FA] dark:bg-navy-950 text-slate-500 dark:text-slate-400 text-[11px] font-medium border border-slate-200/60 dark:border-white/5 shadow-2xs">
              Today
            </span>
          </div>

          {/* Message Thread */}
          {currentMessages.map((msg, index) => {
            // System message
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id || msg._id || index}
                  className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500 dark:text-slate-400"
                >
                  <GitCommit className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const mine = msg.senderId === userId || msg.sender === 'me';

            return (
              <div
                key={msg.id || msg._id || index}
                className={`flex gap-3 items-start ${mine ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Sender Avatar */}
                <div className="shrink-0 mt-0.5">
                  {msg.avatar ? (
                    <img
                      src={msg.avatar}
                      alt={msg.senderName}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-navy-800 text-[#2563eb] dark:text-blue-300 font-bold text-xs flex items-center justify-center ring-1 ring-slate-200 dark:ring-white/10">
                      {msg.initials || msg.senderName?.[0] || 'U'}
                    </div>
                  )}
                </div>

                {/* Message Body & Metadata */}
                <div className={`max-w-[85%] sm:max-w-xl ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Name, Mentor Badge, Time */}
                  <div className={`flex items-center gap-2 mb-1 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {msg.senderName || 'Member'}
                    </span>

                    {msg.isMentor && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#eff6ff] dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                        MENTOR
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {msg.time || formatTime(msg.createdAt)}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed font-medium transition-colors ${
                      mine
                        ? 'bg-[#2563eb] text-white rounded-tr-xs shadow-xs'
                        : 'bg-[#eff6ff]/40 dark:bg-navy-900 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-blue-100/60 dark:border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* PDF / File Attachment card (Matching Reference Image 2) */}
                    {msg.attachmentName && (
                      <div className="mt-3 p-3 rounded-xl bg-white dark:bg-navy-950/80 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs text-slate-800 dark:text-white">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-rose-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">
                              {msg.attachmentName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatSize(msg.attachmentSize)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(msg.attachmentName, msg.attachmentUrl)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          title="Download attachment"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={endRef} />
        </div>

        {/* Pending File Attachment bar */}
        {pending && (
          <div className="mx-4 mb-2 p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Paperclip className="w-4 h-4 text-[#2563eb]" />
              <div className="min-w-0 text-xs">
                <p className="font-bold text-slate-800 dark:text-white truncate">
                  {pending.file.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatSize(pending.file.size)} · Ready to send
                </p>
              </div>
            </div>
            <button
              onClick={() => setPending(null)}
              className="text-xs text-rose-500 hover:underline font-semibold"
            >
              Remove
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* MESSAGE COMPOSER (Fixed at Bottom of Chat Panel) */}
        {/* ========================================================= */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111625] shrink-0">
          <form onSubmit={handleSend} className="space-y-1.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-white/10 focus-within:border-[#2563eb] focus-within:ring-1 focus-within:ring-[#2563eb]/20 transition-all">
              {/* Plus Button for File Chooser */}
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED}
                onChange={chooseFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-7 h-7 rounded-full border border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-[#2563eb] hover:border-[#2563eb] transition-colors shrink-0"
                title="Attach file"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Message Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message #${activeRoomName}...`}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 px-2 py-2"
              />

              {/* AtSign Mention Button */}
              <button
                type="button"
                onClick={() => setInput((prev) => `${prev}@`)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
                title="Mention participant"
              >
                <AtSign className="w-4 h-4" />
              </button>

              {/* Smile / Emoji Button */}
              <button
                type="button"
                onClick={() => setInput((prev) => `${prev} 👍`)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={sending || (!input.trim() && !pending)}
                className="w-8 h-8 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Send message"
              >
                <Send className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {/* Markdown Hint matching Reference Image 2 */}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-2 font-medium">
              Markdown is supported
            </p>
          </form>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Team Context */}
      {/* ========================================================= */}
      <div
        className={`w-72 sm:w-80 bg-white dark:bg-[#111625] border-l border-slate-200/80 dark:border-white/10 flex flex-col shrink-0 z-20 transition-all ${
          contextPanelOpen ? 'flex' : 'hidden'
        }`}
      >
        {/* Header */}
        <div className="h-16 px-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Team Context
          </h3>
          <button
            onClick={() => setContextPanelOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {/* Section 1: TEAM MEMBERS */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
              TEAM MEMBERS
            </div>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id || member._id} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-navy-800 text-[#2563eb] dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                        {member.initials || member.name?.[0] || 'U'}
                      </div>
                    )}
                    {member.online && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#111625]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {member.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {member.role || 'Member'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: PINNED RESOURCES */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
              PINNED RESOURCES
            </div>
            <div className="space-y-2">
              {pinnedResources.map((res) => {
                const Icon = res.icon;
                return (
                  <a
                    key={res.id}
                    href={res.url}
                    onClick={(e) => {
                      e.preventDefault();
                      mentorContext?.addToast?.('Resource', `Opening ${res.title}`, 'info');
                    }}
                    className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#2563eb] dark:hover:text-blue-300 transition-colors group"
                  >
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-blue-300 shrink-0" />
                    <span className="truncate">{res.title}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Section 3: ACTIVE TASKS */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
              ACTIVE TASKS
            </div>
            <div className="space-y-3">
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-navy-950/60 border border-slate-200/80 dark:border-white/5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {task.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${
                        task.dueType === 'urgent'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-navy-900 dark:text-slate-300'
                      }`}
                    >
                      {task.due}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-navy-900 overflow-hidden">
                    <div
                      className="h-full bg-[#2563eb] dark:bg-blue-500 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>

                  {/* Footer with % and avatar */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{task.progress}% completed</span>
                    {task.avatar ? (
                      <img
                        src={task.avatar}
                        alt={task.assignee}
                        className="w-4 h-4 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-navy-800 text-[#2563eb] dark:text-blue-300 text-[9px] font-bold flex items-center justify-center">
                        {task.initials || 'U'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
