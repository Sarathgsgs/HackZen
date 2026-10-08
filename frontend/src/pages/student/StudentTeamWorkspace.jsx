import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/api';
import { getMyTeams, getTeamById, getTeamMembers } from '../../api/teamApi';

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
  if (normalized.includes('done') || normalized.includes('completed')) return 'bg-violet-500/10 text-violet-700';
  return 'bg-violet-500/10 text-violet-700';
};

const StudentTeamWorkspace = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const chatEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [progress, setProgress] = useState({ percentage: 45, status: 'Active', label: 'Ideation' });
  const [loading, setLoading] = useState(true);
  const [draftMessage, setDraftMessage] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const userId = currentUser._id || currentUser.id || 'guest';
  const userName = currentUser.name || 'You';

  useEffect(() => {
    const loadWorkspace = async () => {
      setLoading(true);
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

        const [teamData, memberData, progressResult, chatResult, milestoneResult] = await Promise.all([
          getTeamById(teamIdValue).catch(() => selectedTeam),
          getTeamMembers(teamIdValue).catch(() => []),
          apiClient.get(`/progress/team/${teamIdValue}`).catch(() => ({ data: null })),
          apiClient.get(`/chat/${teamIdValue}/messages`).catch(() => ({ data: [] })),
          apiClient.get(`/progress/team/${teamIdValue}`).catch(() => ({ data: null }))
        ]);

        const progressData = progressResult?.data || {};
        const milestoneData = progressData?._id ? await apiClient.get(`/progress/milestones/${progressData._id}`).catch(() => ({ data: [] })) : { data: [] };

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

        const percentage = Number(progressData?.percentage ?? progressData?.progress ?? selectedTeam.progress ?? 0) || 0;
        const phase = progressData?.status || selectedTeam.status || 'Active';
        setProgress({
          percentage,
          status: phase,
          label: phase === 'completed' ? 'Completed' : (phase === 'pending' ? 'Pending' : 'Ideation')
        });

        setTasks((milestoneData?.data || []).map((step, index) => ({
          id: step._id || `${step.milestoneId || 'task'}-${index}`,
          title: step.milestoneId || step.title || `Milestone ${index + 1}`,
          status: step.completed ? 'Done' : (index === 0 ? 'In Progress' : 'Upcoming'),
          assignee: step.assignee || 'Team'
        })));

        const messageList = (chatResult?.data || []).map((msg) => ({
          id: msg._id || `${msg.senderId || 'msg'}-${Date.now()}`,
          sender: msg.senderId === userId ? 'You' : (msg.senderName || 'Team Member'),
          text: msg.content || msg.text || 'Message',
          time: formatTime(msg.createdAt),
          mine: msg.senderId === userId
        }));

        setMessages(messageList);
        setFiles(Array.isArray(selectedTeam.files) ? selectedTeam.files.map((file, index) => ({
          id: file.id || `${file.name || 'file'}-${index}`,
          name: file.name || 'workspace_file',
          type: file.type || 'DOC',
          size: file.size || 'Unknown size'
        })) : []);
        setActivity(Array.isArray(selectedTeam.activity) ? selectedTeam.activity : []);
      } catch (error) {
        console.error('Failed to load team workspace:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [teamId, userId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const trimmedMessage = draftMessage.trim();
    if (!trimmedMessage || !team) return;

    try {
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
  const hackathonName = currentTeam.hackathonName || currentTeam.hackathon || 'Hackathon';
  const statusText = `${progress.status || 'Active'} - ${progress.label || 'Ideation'}`;
  const selectedTeamId = team?.id || team?._id || teamId;

  if (loading) {
    return (
      <div className="min-h-[420px] rounded-[24px] border border-[#e4dff1] bg-[#f7f4fb] p-8 text-center shadow-[0_12px_30px_rgba(76,59,183,0.04)]">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading workspace…</p>
      </div>
    );
  }

  if (!team && teamId) {
    return (
      <div className="mx-auto max-w-3xl rounded-[24px] border border-[#e4dff1] bg-[#f7f4fb] p-10 text-center shadow-[0_12px_30px_rgba(76,59,183,0.04)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#efe7ff] text-2xl text-[#4d3bb5]">!</div>
        <h2 className="text-3xl font-bold text-[#1d1a2a]">This team is no longer available</h2>
        <p className="mt-3 text-base text-slate-500">The selected workspace may have been removed or you may no longer have access to it.</p>
        <button onClick={() => navigate('/student/teams')} className="mt-6 rounded-xl bg-[#4d3bb5] px-5 py-3 text-sm font-semibold text-white">
          Back to My Teams
        </button>
      </div>
    );
  }

  const content = (() => {
    switch (activeTab) {
      case 'Tasks':
        return (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tasks.length ? tasks.map((task) => (
              <div key={task.id} className="rounded-[20px] border border-[#e6dff4] bg-white p-5 shadow-[0_8px_20px_rgba(79,52,181,0.04)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusBadgeClass(task.status)}`}>
                    {task.status}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">{task.assignee}</span>
                </div>
                <h3 className="text-lg font-bold text-[#1f1a2d]">{task.title}</h3>
              </div>
            )) : (
              <div className="col-span-full rounded-[20px] border border-dashed border-[#e6dff4] bg-white p-8 text-center text-slate-500">No milestones have been added for this team yet.</div>
            )}
          </div>
        );
      case 'Files':
        return (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {files.length ? files.map((file) => (
              <div key={file.id || file.name} className="rounded-[20px] border border-[#e6dff4] bg-white p-5 shadow-[0_8px_20px_rgba(79,52,181,0.04)]">
                <div className="mb-4 text-3xl">📄</div>
                <h3 className="text-base font-bold text-[#1f1a2d]">{file.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{file.type || 'FILE'} • {file.size || 'Unknown size'}</p>
                <button onClick={() => navigate(`/student/files?teamId=${selectedTeamId || teamId}`)} className="mt-4 rounded-xl bg-[#f3eefc] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4d3bb5]">
                  Open
                </button>
              </div>
            )) : (
              <div className="col-span-full rounded-[20px] border border-dashed border-[#e6dff4] bg-white p-8 text-center text-slate-500">No files have been shared in this workspace yet.</div>
            )}
          </div>
        );
      case 'Chat':
        return (
          <div className="flex h-full min-h-[420px] flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto pr-2">
              {messages.length ? messages.map((entry) => (
                <div key={entry.id} className={`flex ${entry.mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-[20px] px-4 py-3 ${entry.mine ? 'bg-[#4d3bb5] text-white' : 'bg-white text-[#1f1a2d] shadow-[0_8px_18px_rgba(76,59,183,0.04)]'}`}>
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                    <div className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${entry.mine ? 'text-violet-100' : 'text-slate-500'}`}>
                      {entry.sender} • {entry.time}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-[20px] border border-dashed border-[#e6dff4] bg-white p-8 text-center text-slate-500">No messages yet. Start the conversation with your team.</div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="mt-6 flex gap-3">
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Write a message..."
                className="flex-1 rounded-[16px] border border-[#e4dff1] bg-white px-4 py-3 text-sm text-[#1f1a2d] placeholder:text-slate-400 focus:border-[#5f4bc8] focus:outline-none"
              />
              <button type="submit" className="rounded-[16px] bg-[#4d3bb5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4133a1]">
                Send
              </button>
            </form>
          </div>
        );
      case 'Mentor':
        return (
          <div className="rounded-[22px] border border-[#e6dff4] bg-[#f9f6fc] p-6">
            <p className="text-sm text-slate-600">Mentor support remains available through the existing workspace flow.</p>
            <button onClick={() => navigate('/student/mentor-profile')} className="mt-5 rounded-xl bg-[#4d3bb5] px-5 py-3 text-sm font-semibold text-white">
              View mentor profile
            </button>
          </div>
        );
      case 'Activity':
        return (
          <div className="space-y-4">
            {activity.length ? activity.map((item) => (
              <div key={item.id || `${item.user}-${item.time}`} className="flex items-center justify-between rounded-[18px] border border-[#e6dff4] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(79,52,181,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2ecff] text-sm font-bold text-[#4d3bb5]">
                    {getInitials(item.user || 'Team')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1f1a2d]">{item.user}</p>
                    <p className="text-sm text-slate-500">{item.action} “{item.item || 'workspace artifact'}”</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.time}</span>
              </div>
            )) : (
              <div className="rounded-[18px] border border-dashed border-[#e6dff4] bg-white p-8 text-center text-slate-500">No activity has been recorded for this workspace yet.</div>
            )}
          </div>
        );
      case 'Overview':
      default:
        return (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              <div className="rounded-[22px] border border-[#e6dff4] bg-white p-6 shadow-[0_10px_30px_rgba(76,59,183,0.04)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-[28px] font-bold leading-none text-[#1d1a2a]">Problem Statement</h2>
                  <button onClick={() => navigate(`/student/project-info?teamId=${teamId || currentTeam.id}`)} className="rounded-lg border border-[#e7def7] bg-[#f8f3ff] p-2 text-[#5b44c9] transition hover:bg-[#f1eaff]">
                    ✎
                  </button>
                </div>
                <p className="text-[15px] leading-8 text-[#4b4659]">{currentTeam.problemStatement}</p>
              </div>

              <div className="rounded-[22px] border border-[#e6dff4] bg-white p-6 shadow-[0_10px_30px_rgba(76,59,183,0.04)]">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-[28px] font-bold leading-none text-[#1d1a2a]">Team Members</h2>
                  <button onClick={() => navigate(`/student/teams/${teamId || currentTeam.id || 'members'}/members`)} className="rounded-xl bg-[#f3eefc] px-4 py-2 text-sm font-semibold text-[#4d3bb5] transition hover:bg-[#ece4ff]">
                    Manage Team
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {members.length ? members.map((member, index) => (
                    <div key={member.id || `${member.name}-${index}`} className="flex items-center gap-4 rounded-[16px] border border-[#e6dff4] bg-[#f9f7fb] p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7deff] text-sm font-bold text-[#4d3bb5]">
                        {member.initials || getInitials(member.name || 'Team')}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[18px] font-semibold text-[#1f1a2a]">{member.name}</div>
                        <div className="text-sm text-slate-500">{member.role || 'Member'}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full rounded-[16px] border border-dashed border-[#e6dff4] bg-[#f9f7fb] p-6 text-sm text-slate-500">No members have been added to this team yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#e6dff4] bg-white p-6 shadow-[0_10px_30px_rgba(76,59,183,0.04)]">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-[28px] font-bold leading-none text-[#1d1a2a]">Recent Activity</h2>
                  <button onClick={() => setActiveTab('Activity')} className="text-sm font-semibold text-[#4d3bb5]">View All</button>
                </div>

                <div className="space-y-4">
                  {activity.length ? activity.map((item) => (
                    <div key={item.id || `${item.user}-${item.time}`} className="flex items-center justify-between gap-4 rounded-[16px] border border-[#e6dff4] bg-[#faf7ff] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eae1ff] text-[#4d3bb5]">
                          {item.user ? getInitials(item.user) : '•'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#1f1a2a]">{item.user} {item.action} <span className="text-[#4d3bb5]">{item.item}</span></div>
                          <div className="text-sm text-slate-500">{item.action} {item.item ? 'for review' : 'on the workspace'}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.time}</span>
                    </div>
                  )) : (
                    <div className="rounded-[16px] border border-dashed border-[#e6dff4] bg-[#faf7ff] p-6 text-sm text-slate-500">No activity has been recorded for this workspace yet.</div>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[22px] border border-[#e6dff4] bg-white p-5 shadow-[0_10px_30px_rgba(76,59,183,0.04)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-[28px] font-bold text-[#1d1a2a]">Team Progress</h2>
                  <div className="text-sm font-semibold text-[#4d3bb5]">{progress.percentage}%</div>
                </div>
                <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-[#f0eafb]">
                  <div className="h-full rounded-full bg-[#4d3bb5]" style={{ width: `${Math.max(0, Math.min(100, progress.percentage))}%` }} />
                </div>

                <ul className="space-y-4">
                  {['Ideation', 'Design', 'Development', 'Submission'].map((step, index) => {
                    const current = progress.label === step || (progress.label === 'Ideation' && step === 'Ideation');
                    const state = current ? 'In Progress' : (index < 1 ? 'Pending' : 'Pending');
                    return (
                      <li key={step} className="flex items-start gap-3">
                        <div className={`mt-1 h-3 w-3 rounded-full ${current ? 'bg-[#4d3bb5]' : 'bg-[#d9d0ee]'}`} />
                        <div className="flex-1 border-l border-[#e8e0f3] pl-3">
                          <div className="text-[18px] font-medium text-[#1f1a2a]">{step}</div>
                          <div className="text-sm text-slate-500">{state}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-[22px] border border-[#e6dff4] bg-[#f4f1fb] p-5 shadow-[0_10px_30px_rgba(76,59,183,0.04)]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9e2ff] text-lg text-[#4d3bb5]">✦</div>
                  <h3 className="text-[28px] font-bold text-[#1d1a2a]">AI Project Assistant</h3>
                </div>
                <p className="text-[15px] leading-7 text-[#4b4659]">Stuck on ideation? Get structural guidance based on your problem statement.</p>
                <button onClick={() => navigate('/student/ai-assistant')} className="mt-5 w-full rounded-xl bg-[#4d3bb5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4133a1]">
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
                <div className="h-full rounded-full bg-[#4d3bb5]" style={{ width: `${Math.max(0, Math.min(100, progress.percentage))}%` }} />
              </div>
            </div>
            <span>{progress.percentage}%</span>
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
              className="rounded-xl border border-[#d8d0ed] bg-white px-4 py-2 text-sm font-semibold text-[#4d3bb5] shadow-[0_8px_20px_rgba(77,59,181,0.04)] transition hover:bg-[#f4f0ff]"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#e6dff4] bg-[#f8f5fc] shadow-[0_10px_28px_rgba(76,59,183,0.04)]">
          <div className="flex flex-wrap gap-6 border-b border-[#e6dff4] bg-[#f8f5fc] px-5 pt-4 sm:px-6">
            {workspaceTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-4 text-base font-semibold transition ${activeTab === tab ? 'text-[#4d3bb5]' : 'text-[#6a647c]'}`}
              >
                {tab}
                {activeTab === tab && <span className="absolute inset-x-0 -bottom-[1px] h-[3px] rounded-full bg-[#4d3bb5]" />}
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
