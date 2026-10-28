import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Paperclip, Download, FileText, X } from 'lucide-react';
import apiClient from '../../api/api';
import { getMyTeams, getTeamById, getTeamMembers } from '../../api/teamApi';
import { downloadTeamFile, getTeamFiles } from '../../api/teamFilesApi';

const workspaceTabs = ['Overview', 'Tasks', 'Files', 'Chat', 'Mentor', 'Activity'];

const formatTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getInitials = (name) => {
  if (!name) return 'T';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'T';
};

const statusBadgeClass = (status) => {
  const normalized = `${status || ''}`.toLowerCase();
  if (normalized.includes('active') || normalized.includes('progress')) return 'bg-emerald-500/10 text-emerald-700';
  if (normalized.includes('review') || normalized.includes('pending')) return 'bg-amber-500/10 text-amber-700';
  if (normalized.includes('done') || normalized.includes('completed')) return 'bg-blue-500/10 text-blue-700';
  return 'bg-blue-500/10 text-blue-700';
};

const readableFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return 'Unknown size';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const fileErrorMessage = (error) => error?.response?.data?.detail || error?.response?.data?.error?.message || 'Team files could not be loaded. Please try again.';
const workspaceErrorMessage = (error, fallback) => error?.response?.data?.detail || error?.response?.data?.error?.message || fallback;
const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const StudentTeamWorkspace = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const chatEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTabParam && workspaceTabs.map((t) => t.toLowerCase()).includes(initialTabParam.toLowerCase())) {
      return initialTabParam.charAt(0).toUpperCase() + initialTabParam.slice(1).toLowerCase();
    }
    return 'Overview';
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && workspaceTabs.map((t) => t.toLowerCase()).includes(tab.toLowerCase())) {
      setActiveTab(tab.charAt(0).toUpperCase() + tab.slice(1).toLowerCase());
    }
  }, [searchParams]);

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState('');
  const [messagesError, setMessagesError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskProgressId, setTaskProgressId] = useState('');
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [taskActionError, setTaskActionError] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState('');
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState('');
  const [fileActionError, setFileActionError] = useState('');
  const [downloadingFileId, setDownloadingFileId] = useState('');
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [progress, setProgress] = useState({ percentage: null, status: null, label: null });
  const [loading, setLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [draftMessage, setDraftMessage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [downloadingChatFileId, setDownloadingChatFileId] = useState('');
  const chatFileInputRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const userId = currentUser._id || currentUser.id || 'guest';
  const userName = currentUser.name || 'You';

  const refreshTasks = useCallback(async (selectedTeamId = teamId) => {
    setTasksLoading(true);
    setTasksError('');
    try {
      const progressResponse = await apiClient.get(`/progress/team/${selectedTeamId}`);
      const progressData = progressResponse?.data || {};
      const progressId = progressData._id || progressData.id;
      setTaskProgressId(progressId || '');
      setProgress((current) => ({
        ...current,
        percentage: Number.isFinite(Number(progressData.percentage ?? progressData.progress))
          ? Number(progressData.percentage ?? progressData.progress)
          : null,
        status: progressData.status || null,
        label: progressData.status === 'completed' ? 'Completed' : (progressData.status === 'not-started' ? 'Ideation' : (progressData.status ? 'In Progress' : null)),
      }));
      if (!progressId) {
        setTasks([]);
        return;
      }
      const milestoneResponse = await apiClient.get(`/progress/milestones/${progressId}`);
      setTasks((Array.isArray(milestoneResponse?.data) ? milestoneResponse.data : []).map((task, index) => ({
        ...task,
        id: task._id || task.id || `${task.milestoneId}-${index}`,
        title: task.title || (task.milestoneId || 'Untitled task').replace(/^m_/, '').replace(/[_-]+/g, ' '),
        status: task.completed ? 'Completed' : 'Open',
        assignee: task.assigneeName || 'Team',
      })));
    } catch (error) {
      setTasksError(workspaceErrorMessage(error, 'Team tasks could not be loaded. Please try again.'));
    } finally {
      setTasksLoading(false);
    }
  }, [teamId]);

  const refreshActivity = useCallback(async (selectedTeamId = teamId) => {
    setActivityLoading(true);
    setActivityError('');
    try {
      const response = await apiClient.get(`/progress/activity/team/${selectedTeamId}`);
      setActivity((Array.isArray(response?.data) ? response.data : []).map((item) => ({
        ...item,
        time: formatTime(item.createdAt),
      })));
    } catch (error) {
      setActivityError(workspaceErrorMessage(error, 'Team activity could not be loaded. Please try again.'));
    } finally {
      setActivityLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    const loadWorkspace = async () => {
      setLoading(true);
      setWorkspaceError('');
        setMembersError('');
        setMessagesError('');
      try {
        const myTeams = await getMyTeams();
        const selectedTeam = myTeams.find((item) => String(item.id || item._id) === String(teamId));

        if (!selectedTeam) {
          if (teamId) {
            setTeam(null);
            setMembers([]);
            setTasks([]);
            setFiles([]);
            setMessages([]);
            setActivity([]);
          }
          setLoading(false);
          return;
        }

        const teamIdValue = selectedTeam.id || selectedTeam._id;
        const [teamData, memberData, chatResult] = await Promise.all([
          getTeamById(teamIdValue).catch(() => selectedTeam),
          getTeamMembers(teamIdValue).catch((error) => { setMembersError(workspaceErrorMessage(error, 'Team members could not be loaded.')); return []; }),
          apiClient.get(`/chat/${teamIdValue}/messages`).catch((error) => { setMessagesError(workspaceErrorMessage(error, 'Team messages could not be loaded.')); return { data: [] }; })
        ]);

        const normalizedTeam = {
          ...selectedTeam,
          ...teamData,
          id: teamIdValue,
          teamName: teamData?.teamName || selectedTeam.teamName || selectedTeam.name || 'Team Workspace',
          problemStatement: teamData?.problemStatement || '',
          hackathonName: teamData?.hackathonName || selectedTeam.hackathon || 'Hackathon'
        };

        setTeam(normalizedTeam);
        setMembers((memberData || []).map((member) => ({
          ...member,
          name: member.name || member.userName || 'Team Member',
          role: member.role || 'Member',
          initials: getInitials(member.name || member.userName || 'Team Member')
        })));

        const messageList = (chatResult?.data || []).map((msg) => ({
          id: msg._id || `${msg.senderId || 'msg'}-${Date.now()}`,
          sender: msg.senderId === userId ? 'You' : (msg.senderName || 'Team Member'),
          text: msg.content || msg.text || 'Message',
          time: formatTime(msg.createdAt),
          mine: msg.senderId === userId
        }));

        setMessages(messageList);
        await Promise.all([refreshTasks(teamIdValue), refreshActivity(teamIdValue)]);
      } catch (error) {
        console.error('Failed to load team workspace:', error);
        setWorkspaceError(workspaceErrorMessage(error, 'The team workspace could not be loaded. Please try again.'));
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [teamId, userId, refreshTasks, refreshActivity, reloadKey]);

  const handleCreateTask = async (event) => {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title || !taskProgressId || creatingTask) return;
    setCreatingTask(true);
    setTaskActionError('');
    try {
      const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? `task_${crypto.randomUUID()}`
        : `task_${Date.now()}`;
      await apiClient.post('/progress/milestone', {
        progressId: taskProgressId,
        milestoneId: generatedId,
        title,
        completed: false,
      });
      setTaskTitle('');
      await Promise.all([refreshTasks(), refreshActivity()]);
    } catch (error) {
      setTaskActionError(workspaceErrorMessage(error, 'The task could not be saved. Please try again.'));
    } finally {
      setCreatingTask(false);
    }
  };

  const handleToggleTask = async (task) => {
    if (!task.id || updatingTaskId) return;
    setUpdatingTaskId(task.id);
    setTaskActionError('');
    try {
      await apiClient.put(`/progress/milestone/${task.id}`, { completed: !task.completed });
      await Promise.all([refreshTasks(), refreshActivity()]);
    } catch (error) {
      setTaskActionError(workspaceErrorMessage(error, 'The task status could not be updated. Please try again.'));
    } finally {
      setUpdatingTaskId('');
    }
  };

  useEffect(() => {
    if (!teamId) {
      setFiles([]);
      setFilesLoading(false);
      setFilesError('');
      return undefined;
    }
    let active = true;
    const refreshFiles = async () => {
      try {
        const sharedFiles = await getTeamFiles(teamId);
        if (!active) return;
        setFiles(sharedFiles);
        setFilesError('');
      } catch (error) {
        if (!active) return;
        setFilesError(fileErrorMessage(error));
      } finally {
        if (active) setFilesLoading(false);
      }
    };
    setFilesLoading(true);
    refreshFiles();
    const refreshOnFocus = () => refreshFiles();
    window.addEventListener('focus', refreshOnFocus);
    const timer = window.setInterval(refreshFiles, 30000);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshOnFocus);
      window.clearInterval(timer);
    };
  }, [teamId]);

  const handleDownloadFile = async (file) => {
    setDownloadingFileId(file.id);
    setFileActionError('');
    try {
      const { blob } = await downloadTeamFile(file.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.fileName || 'team-file';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setFileActionError(fileErrorMessage(error));
    } finally {
      setDownloadingFileId('');
    }
  };

  useEffect(() => {
    if (!teamId) return undefined;
    let active = true;
    const refreshTeamConversation = async () => {
      try {
        const ownTeams = await getMyTeams();
        const currentTeam = ownTeams.find((item) => String(item.id || item._id) === String(teamId));
        if (!active) return;
        if (!currentTeam) {
          setTeam(null);
          setMembers([]);
          setMessages([]);
          return;
        }
        const [roster, chatResult] = await Promise.all([
          getTeamMembers(teamId),
          apiClient.get(`/chat/${teamId}/messages`, { params: { limit: 100 } }),
        ]);
        if (!active) return;
        setMembers(roster || []);
        const persistedMessages = (chatResult.data || []).map((msg) => ({
          id: msg._id || msg.id,
          sender: String(msg.senderId) === String(userId) ? 'You' : (msg.senderName || 'Team Member'),
          text: msg.content || '',
          fileId: msg.fileId || '',
          attachmentName: msg.attachmentName || '',
          attachmentUrl: msg.attachmentUrl || '',
          attachmentType: msg.attachmentType || 'file',
          attachmentSize: msg.attachmentSize || 0,
          createdAt: msg.createdAt,
          time: formatTime(msg.createdAt),
          mine: String(msg.senderId) === String(userId),
        }));
        setMessages((current) => {
          const byId = new Map(current.map((message) => [String(message.id), message]));
          persistedMessages.forEach((message) => byId.set(String(message.id), message));
          return [...byId.values()].sort((first, second) => new Date(first.createdAt || 0) - new Date(second.createdAt || 0));
        });
      } catch {
        // Keep the last confirmed roster and conversation visible during transient refresh failures.
      }
    };
    const refreshOnFocus = () => refreshTeamConversation();
    window.addEventListener('focus', refreshOnFocus);
    const refreshTimer = window.setInterval(refreshTeamConversation, 30000);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshOnFocus);
      window.clearInterval(refreshTimer);
    };
  }, [teamId, userId]);

  useEffect(() => {
    if (!teamId) return undefined;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return undefined;
    const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '');
    const socketUrl = `${backendBase.replace(/^http/, 'ws')}/api/chat/ws/${teamId}/${encodeURIComponent(userId)}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(socketUrl);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const message = payload?.message;
        const messageId = message?._id || message?.id;
        if (!message || !messageId) return;
        setMessages((current) => current.some((item) => String(item.id) === String(messageId)) ? current : [...current, {
          id: messageId,
          sender: String(message.senderId) === String(userId) ? 'You' : (message.senderName || 'Team Member'),
          text: message.content || '',
          fileId: message.fileId || '',
          attachmentName: message.attachmentName || '',
          attachmentUrl: message.attachmentUrl || '',
          attachmentType: message.attachmentType || 'file',
          attachmentSize: message.attachmentSize || 0,
          createdAt: message.createdAt,
          time: formatTime(message.createdAt),
          mine: String(message.senderId) === String(userId),
        }]);
      } catch {
        // Ignore malformed events; persisted history remains available through the API.
      }
    };
    return () => socket.close();
  }, [teamId, userId]);

  const handleDownloadChatAttachment = async (fileId, fileName, attachmentUrl) => {
    const targetFileId = fileId || (attachmentUrl && attachmentUrl.includes('/files/') ? attachmentUrl.split('/files/')[1]?.split('/')[0] : null);
    if (!targetFileId && !attachmentUrl) return;
    setDownloadingChatFileId(targetFileId || fileName);
    try {
      if (targetFileId && teamId) {
        const response = await apiClient.get(`/chat/${teamId}/files/${targetFileId}/download`, {
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
        return;
      }
    } catch {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const backend = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
      const directUrl = `${backend}/api/chat/${teamId}/files/${targetFileId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(directUrl, '_blank');
    } finally {
      setDownloadingChatFileId('');
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (event) => {
    event?.preventDefault();
    const trimmedMessage = draftMessage.trim();
    if ((!trimmedMessage && !pendingFile) || !team) return;

    try {
      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        if (trimmedMessage) formData.append('message', trimmedMessage);
        const { data } = await apiClient.post(`/chat/${team.id}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const serverMessage = data.chatMessage || {};
        const messageEntry = {
          id: serverMessage._id || serverMessage.id || data.id,
          sender: serverMessage.senderName || userName,
          text: serverMessage.content || trimmedMessage || `Shared file: ${data.name}`,
          fileId: data.fileId || data.id,
          attachmentName: data.name,
          attachmentUrl: data.url,
          attachmentType: data.attachmentType || 'file',
          attachmentSize: data.size,
          time: formatTime(serverMessage.createdAt || new Date()),
          mine: true,
        };
        setMessages((current) => [...current, messageEntry]);
        setPendingFile(null);
        if (chatFileInputRef.current) chatFileInputRef.current.value = '';
        setDraftMessage('');
      } else {
        const response = await apiClient.post(`/chat/${team.id}/send`, {
          content: trimmedMessage,
          type: 'text'
        });

        const serverMessage = response?.data;
        const messageEntry = {
          id: serverMessage?._id || Date.now(),
          sender: serverMessage?.senderName || userName,
          text: serverMessage?.content || trimmedMessage,
          time: formatTime(serverMessage?.createdAt),
          mine: String(serverMessage?.senderId || userId) === String(userId)
        };

        setMessages((current) => [...current, messageEntry]);
        setDraftMessage('');
      }
    } catch (error) {
      console.error('Failed to send workspace message:', error);
      const backendDetail = error?.response?.data?.error?.message || error?.response?.data?.detail || error?.message;
      const message = typeof backendDetail === 'string'
        ? backendDetail
        : 'The message could not be saved. Please try again.';
      alert(message);
    }
  };

  const currentTeam = team || { teamName: 'Team Workspace', hackathonName: 'Hackathon', problemStatement: 'No problem statement available yet.' };
  const teamName = currentTeam.teamName || currentTeam.name || 'Team Workspace';
  const hackathonName = currentTeam.hackathonName || currentTeam.hackathon || 'Hackathon not provided';
  const statusText = progress.status ? `${progress.status}${progress.label ? ` - ${progress.label}` : ''}` : 'Progress unavailable';
  const selectedTeamId = team?.id || team?._id || teamId;

  if (loading) {
    return (
      <div className="min-h-[420px] rounded-[24px] border border-[#dbeafe] bg-[#f8fafc] p-8 text-center shadow-[0_12px_30px_rgba(37,99,235,0.06)]">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading workspace…</p>
      </div>
    );
  }

  if (!team && teamId) {
    return (
      <div className="mx-auto max-w-3xl rounded-[24px] border border-[#dbeafe] bg-[#f8fafc] p-10 text-center shadow-[0_12px_30px_rgba(37,99,235,0.06)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eff6ff] text-2xl text-[#2563eb]">!</div>
        <h2 className="text-3xl font-bold text-[#1d1a2a]">{workspaceError ? 'Workspace unavailable' : 'This team is no longer available'}</h2>
        <p role={workspaceError ? 'alert' : undefined} className="mt-3 text-base text-slate-500">{workspaceError || 'The selected workspace may have been removed or you may no longer have access to it.'}</p>
        {workspaceError && <button onClick={() => setReloadKey((key) => key + 1)} className="mt-4 rounded-xl border border-[#bfdbfe] bg-white px-5 py-3 text-sm font-semibold text-[#2563eb]">Try again</button>}
        <button onClick={() => navigate('/student/teams')} className="mt-6 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white">
          Back to My Teams
        </button>
      </div>
    );
  }

  const content = (() => {
    switch (activeTab) {
      case 'Tasks':
        return (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><h2 className="text-xl font-bold text-[#1f1a2d]">Team tasks</h2><p className="mt-1 text-sm text-slate-500">Tasks are shared with everyone on this team.</p></div>
              {currentUser.role === 'student' && <form onSubmit={handleCreateTask} className="flex w-full gap-2 sm:w-auto">
                <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} placeholder="Add a task title" aria-label="New task title" className="min-w-0 flex-1 rounded-xl border border-[#dbeafe] bg-white px-3 py-2.5 text-sm text-[#1f1a2d] placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none sm:w-64" />
                <button type="submit" disabled={!taskTitle.trim() || !taskProgressId || creatingTask} className="shrink-0 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50">{creatingTask ? 'Saving…' : 'Add task'}</button>
              </form>}
            </div>
            {taskActionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{taskActionError}</div>}
            {tasksLoading ? (
              <div role="status" className="rounded-[20px] border border-[#dbeafe] bg-white p-8 text-center text-sm text-slate-500">Loading team tasks…</div>
            ) : tasksError ? (
              <div role="alert" className="rounded-[20px] border border-red-200 bg-white p-8 text-center">
                <p className="text-sm text-red-700">{tasksError}</p>
                <button type="button" onClick={() => refreshTasks()} className="mt-3 rounded-lg border border-[#bfdbfe] px-4 py-2 text-sm font-semibold text-[#2563eb]">Retry</button>
              </div>
            ) : tasks.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {tasks.map((task) => (
                  <article key={task.id} className="rounded-[20px] border border-[#dbeafe] bg-white p-5 shadow-[0_8px_20px_rgba(37,99,235,0.06)]">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusBadgeClass(task.status)}`}>{task.status}</span>
                      {task.priority && <span className="text-[11px] font-semibold text-slate-500">{task.priority} priority</span>}
                    </div>
                    <h3 className="text-lg font-bold text-[#1f1a2d]">{task.title}</h3>
                    {task.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description}</p>}
                    <p className="mt-3 text-xs text-slate-500">Assigned to {task.assignee}</p>
                    {(task.dueDate || task.createdAt) && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                      {task.createdAt && <span>Created {formatDate(task.createdAt)}</span>}
                    </div>}
                    <button type="button" onClick={() => handleToggleTask(task)} disabled={updatingTaskId === task.id || Boolean(updatingTaskId)} className="mt-5 rounded-lg border border-[#bfdbfe] px-3 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-[#eff6ff] disabled:opacity-50">{updatingTaskId === task.id ? 'Saving…' : task.completed ? 'Reopen task' : 'Mark complete'}</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#dbeafe] bg-white p-8 text-center">
                <h3 className="font-semibold text-[#1f1a2d]">No tasks yet</h3>
                <p className="mt-2 text-sm text-slate-500">Add a task to give your team a shared next step.</p>
              </div>
            )}
          </div>
        );
      case 'Files':
        return (
          <section className="rounded-[20px] border border-[#dbeafe] bg-white shadow-[0_8px_20px_rgba(37,99,235,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbeafe] px-5 py-4">
              <div><h2 className="text-lg font-bold text-[#1f1a2d]">Shared files</h2><p className="mt-1 text-sm text-slate-500">{files.length} {files.length === 1 ? 'file' : 'files'} shared with this team</p></div>
              <button onClick={() => navigate(`/student/files?teamId=${encodeURIComponent(selectedTeamId || teamId)}`)} className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white">Open File Sharing</button>
            </div>
            {filesError && <div role="alert" className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{filesError}</div>}
            {fileActionError && <div role="alert" className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{fileActionError}</div>}
            {filesLoading ? (
              <div role="status" className="p-8 text-center text-sm text-slate-500">Loading shared files...</div>
            ) : filesError ? (
              <div className="p-5 text-sm text-slate-500">Your team files could not be confirmed. Use Open File Sharing to retry.</div>
            ) : files.length ? (
              <div className="divide-y divide-[#dbeafe]">
                {files.map((file) => (
                  <article key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0"><h3 className="truncate font-semibold text-[#1f1a2d]">{file.fileName}</h3><p className="mt-1 text-sm text-slate-500">{String(file.extension || 'FILE').toUpperCase()} | {readableFileSize(file.size)} | Shared by {file.uploadedBy || 'Team member'}</p></div>
                    <button type="button" onClick={() => handleDownloadFile(file)} disabled={downloadingFileId === file.id} className="shrink-0 rounded-xl bg-[#eff6ff] px-3 py-2 text-sm font-semibold text-[#2563eb] disabled:opacity-50">{downloadingFileId === file.id ? 'Downloading...' : 'Download'}</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-b-[20px] border-t border-dashed border-[#dbeafe] p-8 text-center text-slate-500">No files have been shared in this workspace yet.</div>
            )}
          </section>
        );
      case 'Chat':
        return (
          <div className="flex h-full min-h-[420px] flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto pr-2">
              {messages.length ? messages.map((entry) => {
                const hasAttachment = Boolean(entry.fileId || entry.attachmentName);
                return (
                  <div key={entry.id} className={`flex ${entry.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-[20px] px-4 py-3 ${entry.mine ? 'bg-[#2563eb] text-white' : 'bg-white text-[#1f1a2d] shadow-[0_8px_18px_rgba(37,99,235,0.06)]'}`}>
                      {entry.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.text}</p>}
                      {hasAttachment && (
                        <div className={`mt-2 flex items-center justify-between gap-3 rounded-xl border p-2.5 ${entry.mine ? 'border-blue-400/50 bg-white/15 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#2563eb]">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold" title={entry.attachmentName}>
                                {entry.attachmentName || 'Shared file'}
                              </p>
                              <p className="text-[10px] opacity-70">
                                {readableFileSize(entry.attachmentSize)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadChatAttachment(entry.fileId, entry.attachmentName, entry.attachmentUrl)}
                            disabled={downloadingChatFileId === (entry.fileId || entry.attachmentName)}
                            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${entry.mine ? 'bg-white text-[#2563eb] hover:bg-blue-50' : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'}`}
                          >
                            <Download className="h-3 w-3" />
                            <span>{downloadingChatFileId === (entry.fileId || entry.attachmentName) ? '...' : 'Download'}</span>
                          </button>
                        </div>
                      )}
                      <div className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${entry.mine ? 'text-blue-100' : 'text-slate-500'}`}>
                        {entry.sender} • {entry.time}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div role={messagesError ? 'alert' : undefined} className="rounded-[20px] border border-dashed border-[#dbeafe] bg-white p-8 text-center text-slate-500">{messagesError || 'No messages yet. Start the conversation with your team.'}</div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="mt-4 flex flex-col gap-2">
              {pendingFile && (
                <div className="flex items-center justify-between gap-2 rounded-[14px] border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-[#2563eb]">
                  <div className="flex min-w-0 items-center gap-2">
                    <Paperclip className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{pendingFile.name}</span>
                    <span className="shrink-0 text-slate-500">({readableFileSize(pendingFile.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFile(null);
                      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
                    }}
                    className="rounded p-1 text-slate-500 hover:bg-blue-100 hover:text-slate-900"
                    title="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.mov,.webm,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,.tar,.gz,.txt,.md,.csv,.py,.js,.jsx,.ts,.tsx,.json,.html,.css,.ipynb,.sql"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPendingFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  title="Attach file"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-[#dbeafe] bg-white text-slate-500 transition hover:bg-[#eff6ff] hover:text-[#2563eb]"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder={pendingFile ? "Add an optional caption..." : "Write a message..."}
                  className="flex-1 rounded-[16px] border border-[#dbeafe] bg-white px-4 py-3 text-sm text-[#1f1a2d] placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draftMessage.trim() && !pendingFile}
                  className="rounded-[16px] bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        );
      case 'Mentor':
        return (
          <div className="rounded-[22px] border border-[#dbeafe] bg-[#f8fafc] p-6">
            <p className="text-sm text-slate-600">Browse available mentors or review your team’s mentor assignment.</p>
            <button onClick={() => navigate('/student/mentor-request')} className="mt-5 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white">
              Find a mentor
            </button>
          </div>
        );
      case 'Activity':
        return (
          <div className="space-y-4">
            {activityLoading ? (
              <div role="status" className="rounded-[18px] border border-[#dbeafe] bg-white p-8 text-center text-sm text-slate-500">Loading team activity…</div>
            ) : activityError ? (
              <div role="alert" className="rounded-[18px] border border-red-200 bg-white p-8 text-center">
                <p className="text-sm text-red-700">{activityError}</p>
                <button type="button" onClick={() => refreshActivity()} className="mt-3 rounded-lg border border-[#bfdbfe] px-4 py-2 text-sm font-semibold text-[#2563eb]">Retry</button>
              </div>
            ) : activity.length ? activity.map((item) => (
              <div key={item.id || `${item.user}-${item.time}`} className="flex items-center justify-between rounded-[18px] border border-[#dbeafe] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(37,99,235,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-sm font-bold text-[#2563eb]">
                    {getInitials(item.user || 'Team')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1f1a2d]">{item.user}</p>
                    <p className="text-sm text-slate-500">{item.action}{item.item ? " - " + item.item : ""}</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.time}</span>
              </div>
            )) : (
              <div className="rounded-[18px] border border-dashed border-[#dbeafe] bg-white p-8 text-center text-slate-500">No activity has been recorded for this workspace yet.</div>
            )}
          </div>
        );
      case 'Overview':
      default:
        return (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              <div className="rounded-[22px] border border-[#dbeafe] bg-white p-6 shadow-[0_10px_30px_rgba(37,99,235,0.06)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-[28px] font-bold leading-none text-[#1d1a2a]">Problem Statement</h2>
                  <button onClick={() => navigate(`/student/project-info?teamId=${teamId || currentTeam.id}`)} className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] p-2 text-[#2563eb] transition hover:bg-[#f1eaff]">
                    ✎
                  </button>
                </div>
                <p className="text-[15px] leading-8 text-[#4b4659]">{currentTeam.problemStatement}</p>
              </div>

              <div className="rounded-[22px] border border-[#dbeafe] bg-white p-6 shadow-[0_10px_30px_rgba(37,99,235,0.06)]">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[28px] font-bold leading-none text-[#1d1a2a]">Team Members</h2>
                    {team?.teamCode && (
                      <p className="mt-1 text-xs text-slate-500">
                        Invite Code: <span className="font-mono font-bold text-[#2563eb]">{team.teamCode}</span>
                      </p>
                    )}
                  </div>
                  <button onClick={() => navigate(`/student/teams/${teamId || currentTeam.id || 'members'}/members`)} className="rounded-xl bg-[#eff6ff] px-4 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-[#ece4ff]">
                    Manage Team
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {members.length ? members.map((member, index) => (
                    <div key={member.id || `${member.name}-${index}`} className="flex items-center gap-4 rounded-[16px] border border-[#dbeafe] bg-[#f8fafc] p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dbeafe] text-sm font-bold text-[#2563eb]">
                        {member.initials || getInitials(member.name || 'Team')}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[18px] font-semibold text-[#1f1a2a]">{member.name}</div>
                        <div className="text-sm text-slate-500">{member.role || 'Member'}</div>
                      </div>
                    </div>
                  )) : (
                    <div role={membersError ? 'alert' : undefined} className="col-span-full rounded-[16px] border border-dashed border-[#dbeafe] bg-[#f8fafc] p-6 text-sm text-slate-500">{membersError || 'No members have been added to this team yet.'}</div>
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#dbeafe] bg-white p-6 shadow-[0_10px_30px_rgba(37,99,235,0.06)]">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-[28px] font-bold leading-none text-[#1d1a2a]">Recent Activity</h2>
                  <button onClick={() => setActiveTab('Activity')} className="text-sm font-semibold text-[#2563eb]">View All</button>
                </div>

                <div className="space-y-4">
                  {activity.length ? activity.map((item) => (
                    <div key={item.id || `${item.user}-${item.time}`} className="flex items-center justify-between gap-4 rounded-[16px] border border-[#dbeafe] bg-[#faf7ff] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eae1ff] text-[#2563eb]">
                          {item.user ? getInitials(item.user) : '•'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#1f1a2a]">{item.user} {item.action} <span className="text-[#2563eb]">{item.item}</span></div>
                          <div className="text-sm text-slate-500">{item.action} {item.item ? 'for review' : 'on the workspace'}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.time}</span>
                    </div>
                  )) : (
                    <div className="rounded-[16px] border border-dashed border-[#dbeafe] bg-[#faf7ff] p-6 text-sm text-slate-500">No activity has been recorded for this workspace yet.</div>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[22px] border border-[#dbeafe] bg-white p-5 shadow-[0_10px_30px_rgba(37,99,235,0.06)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-[28px] font-bold text-[#1d1a2a]">Team Progress</h2>
                  <div className="text-sm font-semibold text-[#2563eb]">{progress.percentage === null ? 'Unavailable' : `${progress.percentage}%`}</div>
                </div>
                <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-[#f0eafb]">
                  {progress.percentage !== null && <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${Math.max(0, Math.min(100, progress.percentage))}%` }} />}
                </div>

                <ul className="space-y-4">
                  {['Ideation', 'Design', 'Development', 'Submission'].map((step, index) => {
                    const current = progress.label === step;
                    const state = current ? 'In Progress' : progress.status === 'completed' ? 'Completed' : 'Not provided';
                    return (
                      <li key={step} className="flex items-start gap-3">
                        <div className={`mt-1 h-3 w-3 rounded-full ${current ? 'bg-[#2563eb]' : 'bg-[#d9d0ee]'}`} />
                        <div className="flex-1 border-l border-[#e8e0f3] pl-3">
                          <div className="text-[18px] font-medium text-[#1f1a2a]">{step}</div>
                          <div className="text-sm text-slate-500">{state}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-[22px] border border-[#dbeafe] bg-[#f4f1fb] p-5 shadow-[0_10px_30px_rgba(37,99,235,0.06)]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9e2ff] text-lg text-[#2563eb]">✦</div>
                  <h3 className="text-[28px] font-bold text-[#1d1a2a]">AI Project Assistant</h3>
                </div>
                <p className="text-[15px] leading-7 text-[#4b4659]">Stuck on ideation? Get structural guidance based on your problem statement.</p>
                <button onClick={() => navigate('/student/ai-assistant')} className="mt-5 w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]">
                  Get Idea Guidance
                </button>
              </div>
            </aside>
          </div>
        );
    }
  })();

  return (
    <div className="min-h-screen bg-[#f3f0f8] px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#e9dff7] bg-[#f6f3fb] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#5f55a7]">{hackathonName}</span>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusBadgeClass(progress.status)}`}>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              {statusText}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-[#544a70]">
            <span>Overall Progress</span>
            <div className="w-40">
              <div className="h-2 overflow-hidden rounded-full bg-[#e8def8]">
                {progress.percentage !== null && <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${Math.max(0, Math.min(100, progress.percentage))}%` }} />}
              </div>
            </div>
            <span>{progress.percentage === null ? 'Unavailable' : `${progress.percentage}%`}</span>
          </div>
        </div>

        <h1 className="mb-6 text-[38px] font-bold leading-none tracking-[-0.05em] text-[#1d1a2a] md:text-[52px]">{teamName} Workspace</h1>

        <div className="mb-6 flex flex-wrap gap-3">
          {[
            { label: 'Project Information', path: '/student/project-info' },
            { label: 'Project Submission', path: '/student/submission' },
            { label: 'Submission Status', path: '/student/submission-status' },
            { label: 'Feedback', path: '/student/feedback' }
          ].map(({ label, path }) => (
            <button
              key={label}
              onClick={() => navigate(`${path}${selectedTeamId ? `?teamId=${selectedTeamId}` : ''}`)}
              className="rounded-xl border border-[#bfdbfe] bg-white px-4 py-2 text-sm font-semibold text-[#2563eb] shadow-[0_8px_20px_rgba(77,59,181,0.04)] transition hover:bg-[#eff6ff]"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#dbeafe] bg-[#f8f5fc] shadow-[0_10px_28px_rgba(37,99,235,0.06)]">
          <div className="flex flex-wrap gap-6 border-b border-[#dbeafe] bg-[#f8f5fc] px-5 pt-4 sm:px-6">
            {workspaceTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-4 text-base font-semibold transition ${activeTab === tab ? 'text-[#2563eb]' : 'text-[#6a647c]'}`}
              >
                {tab}
                {activeTab === tab && <span className="absolute inset-x-0 -bottom-[1px] h-[3px] rounded-full bg-[#2563eb]" />}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6 lg:p-8">{content}</div>
        </div>
      </div>
    </div>
  );
};

export default StudentTeamWorkspace;
