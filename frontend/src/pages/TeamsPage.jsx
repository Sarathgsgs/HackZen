import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    fetchMyTeams,
    fetchTeamWorkspace,
    fetchTeamsMeta,
    createTeam,
    joinTeamByCode,
    sendMessage,
    updateTaskStatus,
    uploadTeamFile,
    downloadTeamFile,
} from '../services/student/teamsApi';
import { fetchAssignedTeams } from '../services/mentor/assignedTeamsApi';
import TeamChat from '../components/TeamChat';

/**
 * My Teams Component
 * A role-aware, real-time workspace for project collaboration.
 * Supports: Students, Mentors, Organizers, and Admins.
 */
const MyTeams = () => {
    // --- AUTH & ROLE ---
    const [user, setUser] = useState(() => {
        try {
            const stored = sessionStorage.getItem('user');
            if (!stored) return { name: 'Guest', role: 'student' };
            const parsed = JSON.parse(stored);
            return parsed && typeof parsed === 'object' ? { name: 'Guest', ...parsed } : { name: 'Guest', role: 'student' };
        } catch (e) {
            return { name: 'Guest', role: 'student' };
        }
    });
    const role = (user?.role || 'student').toLowerCase();

    // --- STATE MANAGEMENT ---
    const { teamId: urlTeamId } = useParams();
    const [viewMode, setViewMode] = useState(urlTeamId ? 'workspace' : 'overview'); // 'overview' | 'workspace'
    const [selectedTeamId, setSelectedTeamId] = useState(urlTeamId || null);
    const [activeTab, setActiveTab] = useState('Chat');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [messageType, setMessageType] = useState('text');
    const [isTyping, setIsTyping] = useState(false);
    const [modal, setModal] = useState({ type: null, data: null }); // { type: 'create' | 'join' | 'task' | 'delete', data: any }
    const [newTeamData, setNewTeamData] = useState({ name: '', hackathonId: '', domain: '' });
    const [inviteCode, setInviteCode] = useState('');
    const [newTaskData, setNewTaskData] = useState({ title: '', priority: 'Medium', assignedTo: '' });

    // --- REFS ---
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- MOCK DATA ---
    const [teams, setTeams] = useState([]);
    const [messages, setMessages] = useState({});
    const [tasks, setTasks] = useState({});
    const [files, setFiles] = useState({});
    const [alerts, setAlerts] = useState([]);
    const [registeredHackathons, setRegisteredHackathons] = useState([]);

    // --- EFFECTS ---
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                let teamsData;
                let metaData;
                
                if (role === 'mentor') {
                    const mentorData = await fetchAssignedTeams();
                    // Map mentor team fields to match TeamsPage expectations
                    teamsData = [...mentorData.activeTeams, ...mentorData.pastTeams].map(t => ({
                        ...t,
                        gradient: t.logoColor || 'from-blue-600 to-blue-500',
                        roleInTeam: mentorData.activeTeams.find(at => at.id === t.id) ? 'Mentor' : 'Alumni Mentor',
                        lastMessage: 'Viewing as Mentor', // Default for workspace
                        time: 'Active'
                    }));
                    metaData = { alerts: [], registrations: [] }; // Mentors might not have these student-specific metas
                } else {
                    [teamsData, metaData] = await Promise.all([
                        fetchMyTeams(),
                        fetchTeamsMeta()
                    ]);
                }
                
                setTeams(teamsData);
                setAlerts(metaData.alerts);
                setRegisteredHackathons(metaData.registrations);
            } catch (error) {
                console.error("Failed to load teams data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedTeamId && !messages[selectedTeamId]) {
            const loadWorkspace = async () => {
                try {
                    const data = await fetchTeamWorkspace(selectedTeamId);
                    setMessages(prev => ({ ...prev, [selectedTeamId]: data.messages }));
                    setTasks(prev => ({ ...prev, [selectedTeamId]: data.tasks }));
                    setFiles(prev => ({ ...prev, [selectedTeamId]: data.files }));
                } catch (error) {
                    console.error("Failed to load workspace:", error);
                }
            };
            loadWorkspace();
        }
    }, [selectedTeamId]);

    // Keep the central team room current for every member and the assigned mentor.
    // The API remains the source of truth, so there is no browser-only chat state.
    useEffect(() => {
        if (!selectedTeamId || viewMode !== 'workspace') return undefined;
        const refreshRoom = async () => {
            try {
                const data = await fetchTeamWorkspace(selectedTeamId);
                setMessages(prev => ({ ...prev, [selectedTeamId]: data.messages }));
                setFiles(prev => ({ ...prev, [selectedTeamId]: data.files }));
            } catch (error) { console.error('Failed to refresh team room:', error); }
        };
        const timer = window.setInterval(refreshRoom, 10000);
        return () => window.clearInterval(timer);
    }, [selectedTeamId, viewMode]);

    // --- RBAC PERMISSIONS ---
    const canManageTeam = ['admin', 'organizer', 'mentor'].includes(role);
    const canEditWorkspace = ['admin', 'student', 'mentor'].includes(role);
    const canDeleteFiles = ['admin', 'organizer'].includes(role);

    // --- EFFECTS ---
    useEffect(() => {
        if (viewMode === 'workspace') {
            scrollToBottom();
        }
    }, [messages, selectedTeamId, activeTab, viewMode]);

    useEffect(() => {
        if (viewMode === 'workspace') {
            scrollToBottom();
        }
    }, [messages, selectedTeamId, activeTab, viewMode]);

    // --- HANDLERS ---
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        const messageData = {
            text: messageInput,
            sender: 'me',
            user: user.name,
            type: messageType,
        };

        try {
            const response = await sendMessage(selectedTeamId, messageData);
            if (response.success) {
                setMessages(prev => ({
                    ...prev,
                    [selectedTeamId]: [...(prev[selectedTeamId] || []), response.message]
                }));
                setMessageInput('');
                setMessageType('text');
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const toggleTask = (teamId, taskId) => {
        if (!canEditWorkspace) return;
        setTasks(prev => {
            const teamTasks = prev[teamId] || [];
            return {
                ...prev,
                [teamId]: teamTasks.map(t =>
                    t.id === taskId ? { ...t, status: t.status === 'Done' ? 'Todo' : 'Done' } : t
                )
            };
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !canEditWorkspace) return;
        try {
            const uploaded = await uploadTeamFile(selectedTeamId, file);
            setFiles(prev => ({ ...prev, [selectedTeamId]: [uploaded, ...(prev[selectedTeamId] || [])] }));
        } catch (error) { console.error('Failed to upload file:', error); }
        finally { e.target.value = ''; }
    };

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            const response = await createTeam({
                teamName: newTeamData.name.trim(),
                hackathonId: newTeamData.hackathonId,
                domain: newTeamData.domain.trim(),
            });
            if (response.success) {
                setTeams([response.team, ...teams]);
                setMessages(prev => ({ ...prev, [response.team.id]: [] }));
                setTasks(prev => ({ ...prev, [response.team.id]: [] }));
                setFiles(prev => ({ ...prev, [response.team.id]: [] }));
                setModal({ type: null });
                setNewTeamData({ name: '', hackathonId: '', domain: '' });
                setAlerts([{ id: Date.now(), type: 'success', message: `Team "${response.team.name}" created successfully!` }, ...alerts]);
            }
        } catch (error) {
            console.error("Failed to create team:", error);
            setAlerts([{ id: Date.now(), type: 'error', message: error.message || 'Failed to create team.' }, ...alerts]);
        }
    };

    const handleJoinTeam = async (e) => {
        e.preventDefault();
        try {
            const response = await joinTeamByCode(inviteCode);
            if (response.success) {
                setAlerts([{ id: Date.now(), type: 'success', message: response.message }, ...alerts]);
                setModal({ type: null });
                setInviteCode('');
                // Note: In a real app, we would re-fetch teams here
                const updatedTeams = await fetchMyTeams();
                setTeams(updatedTeams);
            }
        } catch (error) {
            setAlerts([{ id: Date.now(), type: 'error', message: error.message }, ...alerts]);
        }
    };

    const handleAddTask = (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now(),
            ...newTaskData,
            status: 'Todo'
        };
        setTasks(prev => ({
            ...prev,
            [selectedTeamId]: [...(prev[selectedTeamId] || []), newTask]
        }));

        setTeams(prev => prev.map(t =>
            t.id === selectedTeamId
                ? { ...t, activity: [{ id: Date.now(), user: user.name, action: 'added task', item: newTaskData.title, time: 'Just now' }, ...t.activity] }
                : t
        ));

        setModal({ type: null });
        setNewTaskData({ title: '', priority: 'Medium', assignedTo: '' });
    };

    const handleDeleteTeam = (teamId) => {
        if (!canManageTeam) return;
        setTeams(prev => prev.filter(t => t.id !== teamId));
        setModal({ type: null });
    };

    const handleDeleteFile = (teamId, fileId) => {
        if (!canDeleteFiles) return;
        setFiles(prev => ({
            ...prev,
            [teamId]: prev[teamId].filter(f => f.id !== fileId)
        }));
    };

    // --- DERIVED DATA ---
    const [sortBy, setSortBy] = useState('Recent Activity');

    // --- DERIVED DATA ---
    const filteredTeams = useMemo(() => {
        let result = teams.filter(team => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                team.name.toLowerCase().includes(searchLower) ||
                team.hackathon.toLowerCase().includes(searchLower) ||
                team.lastMessage.toLowerCase().includes(searchLower) ||
                team.activity.some(act => act.item.toLowerCase().includes(searchLower));
            const matchesStatus = statusFilter === 'All' || team.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        if (sortBy === 'Progress') {
            result.sort((a, b) => b.progress - a.progress);
        } else if (sortBy === 'Name') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }
        // Default (Recently Active) is already mock-ordered or could be based on 'time'
        return result;
    }, [teams, searchQuery, statusFilter, sortBy]);

    // Ensure numeric vs string ID comparison works
    const currentTeam = teams.find(t => String(t.id) === String(selectedTeamId));

    // --- UI COMPONENTS (MINI) ---
    const SkeletonCard = () => (
        <div className="glass rounded-2xl p-6 h-[280px] animate-pulse">
            <div className="flex justify-between mb-6">
                <div className="space-y-2">
                    <div className="h-6 w-32 bg-white/10 rounded-lg"></div>
                    <div className="h-3 w-24 bg-white/5 rounded-lg"></div>
                </div>
                <div className="h-6 w-16 bg-white/10 rounded-full"></div>
            </div>
            <div className="space-y-4">
                <div className="h-2 w-full bg-white/5 rounded-full"></div>
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-white/10 border-2 border-navy-900"></div>)}
                </div>
                <div className="h-10 w-full bg-white/5 rounded-xl"></div>
            </div>
        </div>
    );

    // --- RENDER VIEWS ---
    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {alerts.length > 0 && (
                <div className="space-y-4">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="glass rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300 mb-1">Team Alert</p>
                                <p className="text-sm text-orange-100">{alert.message}</p>
                            </div>
                            <button
                                onClick={() => setAlerts((prev) => prev.filter((item) => item.id !== alert.id))}
                                className="text-orange-300 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    My <span className="gradient-text">Teams</span>
                </h1>
                <p className="text-gray-400">Manage active teams and registered hackathon squads in the same card-first layout as your upcoming hackathons page.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass rounded-2xl border border-white/5 p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Teams</p>
                    <p className="text-3xl font-bold text-white">{teams.length.toString().padStart(2, '0')}</p>
                </div>
                <div className="glass rounded-2xl border border-white/5 p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Average Progress</p>
                    <p className="text-3xl font-bold text-blue-400">{teams.length ? Math.round(teams.reduce((sum, team) => sum + team.progress, 0) / teams.length) : 0}%</p>
                </div>
                <div className="glass rounded-2xl border border-white/5 p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Registered Events</p>
                    <p className="text-3xl font-bold text-cyan-400">{registeredHackathons.length.toString().padStart(2, '0')}</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center xl:justify-between">
                <div className="flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Search team, hackathon, or domain"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#2563eb]/50 transition-colors placeholder:text-gray-500"
                    />
                </div>

                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-navy-900/50 border border-white/10 text-gray-300 px-4 py-3 rounded-xl focus:outline-none"
                    >
                        {['All', 'In Progress', 'Building', 'Ideating', 'Done'].map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-navy-900/50 border border-white/10 text-gray-300 px-4 py-3 rounded-xl focus:outline-none"
                    >
                        <option value="Recent Activity">Recent Activity</option>
                        <option value="Progress">Progress</option>
                        <option value="Name">Name</option>
                    </select>
                    {role === 'student' && (
                        <>
                            <button
                                onClick={() => setModal({ type: 'join' })}
                                className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors"
                            >
                                Join Team
                            </button>
                            <button
                                onClick={() => setModal({ type: 'create' })}
                                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl transition-colors"
                            >
                                Create Team
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="glass rounded-2xl border border-white/5 h-[360px] animate-pulse bg-navy-900/40" />
                    ))}
                </div>
            ) : filteredTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTeams.map((team) => (
                        <div
                            key={team.id}
                            onClick={() => { setSelectedTeamId(team.id); setViewMode('workspace'); }}
                            className="glass rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 group cursor-pointer flex flex-col overflow-hidden"
                        >
                            <div className={`h-40 bg-gradient-to-br ${team.gradient || 'from-blue-600 to-cyan-600'} p-6 relative`}>
                                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-white uppercase">
                                    {team.status}
                                </div>
                                <div className="absolute bottom-4 left-6 right-6">
                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest truncate">{team.hackathon}</p>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2 gap-3">
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{team.name}</h3>
                                    <span className="text-[10px] text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 whitespace-nowrap">{team.roleInTeam}</span>
                                </div>
                                <p className="text-gray-400 text-sm line-clamp-2 mb-6">{team.domain} • {team.lastMessage}</p>

                                <div className="space-y-4 mt-auto">
                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-2">
                                            <span className="text-gray-400">Progress</span>
                                            <span className="text-white font-semibold">{team.progress}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full" style={{ width: `${team.progress}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex items-center gap-2 shrink-0">
                                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                <span className="text-xs text-gray-300">{team.members} members</span>
                                            </div>
                                            {team.teamCode && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (navigator.clipboard) navigator.clipboard.writeText(team.teamCode);
                                                    }}
                                                    title="Click to copy invite code"
                                                    className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-2 py-1 rounded-lg hover:bg-cyan-500/20 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 8V6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-2M6 12h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z" /></svg>
                                                    {team.teamCode}
                                                </button>
                                            )}
                                        </div>
                                        <button className="flex items-center gap-1.5 text-xs text-blue-400 font-bold hover:text-blue-300 transition-colors shrink-0">
                                            Open Workspace
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass rounded-2xl border border-white/5 p-10 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">No teams found</h3>
                    <p className="text-gray-400">Try a different filter or create a new team to get started.</p>
                </div>
            )}

            {role === 'student' && registeredHackathons.length > 0 && (
                <div className="space-y-8 pt-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Registered Hackathons</h2>
                        <p className="text-gray-400">These events are ready for team formation and workspace coordination.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {registeredHackathons.map((hack) => (
                            <div key={hack.id} className="glass rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 flex flex-col overflow-hidden">
                                <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-600 p-6 relative">
                                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-white uppercase">
                                        {hack.status}
                                    </div>
                                    <div className="absolute bottom-4 left-6 right-6">
                                        <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{hack.date}</p>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-white mb-3">{hack.name}</h3>
                                    <p className="text-gray-400 text-sm mb-6">Set up or join a team before the event begins.</p>
                                    <div className="mt-auto flex gap-3">
                                        <button
                                            onClick={() => navigate('/student/hackathons')}
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/5 transition-colors"
                                        >
                                            View Event
                                        </button>
                                        <button
                                            onClick={() => setModal({ type: 'join' })}
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/5 transition-colors"
                                        >
                                            Join Team
                                        </button>
                                        <button
                                            onClick={() => {
                                                setNewTeamData({
                                                    name: '',
                                                    hackathon: hack.id,
                                                    hackathonId: hack.id,
                                                    domain: hack.domain || 'Technology'
                                                });
                                                setModal({ type: 'create' });
                                            }}
                                            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                                        >
                                            Form Team
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
    const renderWorkspace = () => {
        if (!currentTeam) {
            setTimeout(() => setViewMode('overview'), 0);
            return null;
        }

        return (
            <div className="h-[calc(100vh-140px)] flex gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
                {/* Tactical Sidebar */}
                <div className="hidden xl:flex w-80 flex-none flex-col gap-6 h-full pb-4">
                    <button
                        onClick={() => setViewMode('overview')}
                        className="flex items-center gap-4 text-gray-600 hover:text-white transition-all group px-4 py-2 hover:bg-white/5 rounded-2xl w-fit "
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        <span className="text-xs font-bold uppercase tracking-[0.3em]">Exit Sector</span>
                    </button>
                    
                    <div className="glass h-full rounded-2xl border border-white/5 overflow-hidden flex flex-col p-6 shadow-2xl bg-black/10">
                        <div className="flex items-center gap-3 mb-8 px-2">
                             <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(147,51,234,1)]"></div>
                             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Sessions</h4>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                            {teams.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTeamId(t.id)}
                                    className={`w-full flex items-center gap-5 p-4 rounded-3xl transition-all duration-500 relative group overflow-hidden ${String(selectedTeamId) === String(t.id) ? 'bg-black/20 border border-blue-500/30 shadow-xl' : 'hover:bg-white/5 opacity-40 hover:opacity-100 grayscale hover:grayscale-0'}`}
                                >
                                    {String(selectedTeamId) === String(t.id) && <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-600 shadow-[0_0_15px_rgba(147,51,234,1)]"></div>}
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.gradient || 'from-navy-800 to-navy-950'} flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-black/40 group-hover:scale-110 transition-transform duration-500 border border-white/10 shrink-0`}>
                                        {t.name.charAt(0)}
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <p className="text-xs font-bold text-white truncate tracking-tight uppercase group-hover:text-blue-400 transition-colors">{t.name}</p>
                                        <p className="text-xs text-gray-600 font-bold tracking-widest uppercase mt-1  truncate opacity-70">{t.domain || 'Field Ops'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Secure Tactical Environment */}
                <div className="flex-1 glass border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative bg-black/10 group/env">
                    {/* Header Protocol */}
                    <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 bg-navy-950/40 relative z-20">
                        <div className="flex items-center gap-4 sm:gap-8">
                            <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${currentTeam.gradient || 'from-blue-600 to-blue-700'} flex items-center justify-center text-white text-xl sm:text-3xl font-bold shadow-2xl relative overflow-hidden group-hover/env:scale-105 transition-transform duration-700 shrink-0`}>
                                <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                                <span className="relative z-10 ">{currentTeam.name.charAt(0)}</span>
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                                <h2 className="text-xl sm:text-3xl font-bold text-white leading-none">{currentTeam.name}</h2>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full ${currentTeam.isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]' : 'bg-gray-700'}`}></span>
                                        <span className="text-xs text-gray-400 font-semibold">{currentTeam.isOnline ? 'Real-time Link established' : 'Node Dormant'}</span>
                                    </div>
                                    <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/10"></div>
                                    <span className="text-xs text-blue-400 font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase">Sector: {currentTeam.domain || 'Tactical'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Matrix */}
                        <div className="flex p-1.5 sm:p-2 bg-black/20 rounded-2xl border border-white/5 shadow-inner backdrop-blur-3xl overflow-x-auto max-w-full custom-scrollbar">
                            {['Chat', 'Tasks', 'Files', 'Activity'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 sm:px-8 py-2 sm:py-3 rounded-full text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-all whitespace-nowrap ${activeTab === tab ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-500/30 translate-y-[-1px]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Matrix */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-6 lg:p-12 bg-navy-900/10">
                        {activeTab === 'Chat' && (
                            <TeamChat team={currentTeam} />
                        )}

                        {activeTab === 'Files' && (
                            <div className="space-y-10">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-bold text-white leading-none">Intelligence Dossier</h3>
                                        <p className="text-xs text-gray-600 font-medium text-gray-500 opacity-70">Shared Sector Assets // READ/WRITE</p>
                                    </div>
                                    {canEditWorkspace && (
                                        <>
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                            <button
                                                onClick={() => fileInputRef.current.click()}
                                                className="px-10 h-16 bg-navy-950/60 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/5 hover:border-blue-500/20 transition-all flex items-center gap-4 text-sm font-semibold text-gray-400 active:scale-95 shadow-xl"
                                            >
                                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                Inject Asset
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {(files[currentTeam.id] || []).map(file => (
                                        <div key={file.id} className="glass p-8 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-700 group relative flex flex-col bg-navy-950/20 hover:shadow-2xl">
                                            <div className="flex items-start justify-between mb-8">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-2xl relative overflow-hidden ${file.type === 'PDF' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    <div className="absolute inset-0 bg-white/5 opacity-20"></div>
                                                    <span className="relative z-10">{file.type === 'PDF' ? '📄' : '📦'}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteFile(currentTeam.id, file.id)}
                                                    className="p-2 text-gray-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:hidden"
                                                    disabled={!canDeleteFiles}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                            <div className="flex-1 space-y-2 mb-8">
                                                <p className="font-bold text-white text-xs truncate uppercase tracking-tight " title={file.name}>{file.name}</p>
                                                <p className="text-xs text-gray-500 font-medium">{file.size} // {file.type}</p>
                                            </div>
                                            <div className="flex flex-col gap-2 pt-6 border-t border-white/5">
                                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 ">
                                                    <span>Origin: {file.uploader}</span>
                                                    <span>{file.time}</span>
                                                </div>
                                                <button onClick={() => downloadTeamFile(file)} className="w-full py-3 mt-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-400 text-gray-400 hover:text-white transition-all border border-white/5">Download</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Tasks' && (
                            <div className="space-y-10">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-bold text-white leading-none">Operational Directives</h3>
                                        <p className="text-xs text-gray-600 font-medium text-gray-500 opacity-70">Sector Milestone Tracking</p>
                                    </div>
                                    {canEditWorkspace && (
                                        <button
                                            onClick={() => setModal({ type: 'task' })}
                                            className="px-10 h-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold text-gray-400 shadow-xl shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/40 active:scale-95 flex items-center justify-center gap-4"
                                        >
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
                                            Push Objective
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {(tasks[currentTeam.id] || []).map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleTask(currentTeam.id, task.id)}
                                            className={`group relative p-8 rounded-2xl glass border transition-all duration-700 flex items-center justify-between cursor-pointer overflow-hidden ${task.status === 'Done' ? 'border-emerald-500/20 bg-emerald-500/5 opacity-50' : 'border-white/5 hover:bg-navy-950/60 hover:border-blue-500/30'}`}
                                        >
                                            <div className="flex items-center gap-8 relative z-10">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-[3px] transition-all duration-500 ${task.status === 'Done' ? 'bg-emerald-500 border-emerald-400/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-navy-950 border-white/10 group-hover:border-blue-500/40'}`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <div className="space-y-3">
                                                    <p className={`text-xl font-bold transition-all leading-none ${task.status === 'Done' ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</p>
                                                    <div className="flex flex-wrap gap-3">
                                                        <span className={`text-xs font-medium px-3 py-1.5 rounded-full  border ${task.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : task.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>{task.priority} INTENSITY</span>
                                                        <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 text-gray-600 border border-white/5 ">ASGN: {task.assignedTo.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 relative z-10">
                                                <span className={`text-xs font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full border backdrop-blur-md  ${task.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                            <div className={`absolute inset-0 bg-gradient-to-r ${task.status === 'Done' ? 'from-emerald-500/5 to-transparent' : 'from-blue-500/5 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Activity' && (
                            <div className="space-y-10">
                                <div className="space-y-2 px-2">
                                    <h3 className="text-3xl font-bold text-white leading-none">Sector Audit Log</h3>
                                    <p className="text-xs text-gray-600 font-medium text-gray-500 opacity-70">Historical Transaction Stream</p>
                                </div>
                                <div className="space-y-6 max-w-4xl">
                                    {(currentTeam.activity || []).map(act => (
                                        <div key={act.id} className="flex gap-8 p-6 rounded-2xl bg-navy-950/40 border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                                            <div className="w-14 h-14 rounded-2xl bg-navy-950 flex items-center justify-center text-sm font-bold text-gray-700 shrink-0 group-hover:text-blue-400 group-hover:bg-navy-900 border border-white/5 transition-all duration-500 ">
                                                {act.user.charAt(0)}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <p className="text-sm font-medium text-gray-400 leading-relaxed">
                                                    <span className="font-bold text-white uppercase tracking-widest  drop-shadow-sm">{act.user}</span> 
                                                    <span className="mx-2 opacity-50 uppercase text-xs tracking-tight">{act.action}</span> 
                                                    <span className="font-bold text-blue-400 ">"{act.item.toUpperCase()}"</span>
                                                </p>
                                                <div className="flex items-center gap-4">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-navy-800"></div>
                                                     <span className="text-xs text-gray-700 font-bold uppercase tracking-[0.3em] font-mono">{act.time}</span>
                                                </div>
                                            </div>
                                            <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none"></div>
                                        </div>
                                    ))}
                                    {(!currentTeam.activity || currentTeam.activity.length === 0) && (
                                        <div className="py-24 text-center glass rounded-2xl border border-dashed border-white/10">
                                             <p className="text-xs font-bold text-gray-800 uppercase tracking-[0.5em] ">No recent sequence transactions recorded in this sector.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-full font-sans text-white">
            {viewMode === 'overview' ? renderOverview() : renderWorkspace()}

            {/* Tactical Modals */}
            {modal.type && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy-950/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="absolute inset-0 cursor-crosshair" onClick={() => setModal({ type: null })}></div>
                    <div className="glass border border-white/10 rounded-3xl w-full max-w-xl p-12 relative animate-in zoom-in-95 duration-500 shadow-[0_0_100px_rgba(147,51,234,0.1)] bg-navy-900 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-3xl -mr-32 -mt-32"></div>
                        
                        <div className="relative z-10 space-y-10">
                            <div className="space-y-4">
                                <h3 className="text-4xl font-bold text-white leading-none">
                                    {modal.type === 'create' && 'Unit Initialization'}
                                    {modal.type === 'join' && 'Sector Entry'}
                                    {modal.type === 'task' && 'Push Directive'}
                                    {modal.type === 'delete' && 'Neutralize Unit'}
                                </h3>
                                <p className="text-xs text-gray-600 font-medium text-gray-500 opacity-80">
                                    {modal.type === 'create' && 'Command Interface // NEW-UNIT-ALPHA'}
                                    {modal.type === 'join' && 'Authorize Signature // ENCRYPTION-REQ'}
                                    {modal.type === 'task' && 'Assign Objective // SECTOR-GOAL'}
                                    {modal.type === 'delete' && `Warning: Destructive Action // TARGET: ${modal.data?.name.toUpperCase()}`}
                                </p>
                            </div>

                            <form onSubmit={
                                modal.type === 'create' ? handleCreateTeam :
                                    modal.type === 'join' ? handleJoinTeam :
                                        modal.type === 'task' ? handleAddTask :
                                            (e) => { e.preventDefault(); handleDeleteTeam(modal.data.id); }
                            } className="space-y-8">
                                {modal.type === 'create' && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest  ml-1">Team Designation</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="ENTER UNIT NAME..."
                                                value={newTeamData.name}
                                                onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                                                className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:outline-none focus:border-[#2563eb]/40 transition-all uppercase  tracking-widest placeholder:text-gray-800 shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest  ml-1">Assigned Hackathon</label>
                                            <select
                                                required
                                                value={newTeamData.hackathonId || newTeamData.hackathon || ''}
                                                onChange={(e) => setNewTeamData({ ...newTeamData, hackathon: e.target.value, hackathonId: e.target.value })}
                                                className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:outline-none focus:border-[#2563eb]/40 transition-all uppercase  tracking-widest shadow-inner appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-navy-900">SELECT DEPLOYMENT SECTOR...</option>
                                                {registeredHackathons.map(h => (
                                                    <option key={h.id} value={h.id} className="bg-navy-900">{h.name.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest  ml-1">Mission Domain</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="E.G., CYBERSECURITY, AI, WEB3..."
                                                value={newTeamData.domain}
                                                onChange={(e) => setNewTeamData({ ...newTeamData, domain: e.target.value })}
                                                className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:outline-none focus:border-[#2563eb]/40 transition-all uppercase  tracking-widest placeholder:text-gray-800 shadow-inner"
                                            />
                                        </div>
                                    </div>
                                )}

                                {modal.type === 'join' && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-[0.5em]  text-center block w-full">Authentication Signature Needed</label>
                                            <input
                                                type="text"
                                                required
                                                id="inviteCode"
                                                placeholder="X X X X X X"
                                                value={inviteCode}
                                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                                maxLength={6}
                                                className="w-full bg-black/20 border border-white/10 rounded-3xl py-10 text-5xl font-bold text-center text-blue-400 focus:outline-none focus:border-[#2563eb] shadow-2xl tracking-[0.5em] transition-all placeholder:text-gray-900"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-700 font-bold uppercase tracking-[0.2em] text-center ">Verify invite key from unit lead before transmission.</p>
                                    </div>
                                )}

                                {modal.type === 'task' && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest  ml-1">Objective Title</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="DECODE MISSION PARAMETERS..."
                                                value={newTaskData.title}
                                                onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                                                className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:outline-none focus:border-[#2563eb]/40 transition-all uppercase  tracking-widest placeholder:text-gray-800"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest  ml-1">Intensity</label>
                                                <select
                                                    value={newTaskData.priority}
                                                    onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                                                    className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-5 text-xs font-bold text-white focus:outline-none focus:border-[#2563eb]/40 appearance-none  uppercase tracking-widest"
                                                >
                                                    <option value="Low" className="bg-navy-900">LOW SIGNAL</option>
                                                    <option value="Medium" className="bg-navy-900">STEADY STATUS</option>
                                                    <option value="High" className="bg-navy-900">CRITICAL NODE</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest  ml-1">Personnel Tag</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="ALPHA-01..."
                                                    value={newTaskData.assignedTo}
                                                    onChange={(e) => setNewTaskData({ ...newTaskData, assignedTo: e.target.value })}
                                                    className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:outline-none focus:border-[#2563eb]/40 transition-all uppercase  tracking-widest placeholder:text-gray-800"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {modal.type === 'delete' && (
                                    <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20 text-center space-y-4">
                                        <p className="text-sm font-bold text-red-200 uppercase tracking-widest  ">This will permanently dissociate all personnel and archive sector data.</p>
                                        <p className="text-xs text-red-500/50 font-bold uppercase tracking-[0.4em]">ADMIN-AUTH-7 REQUIRED</p>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setModal({ type: null })}
                                        className="flex-1 py-5 rounded-xl bg-white/5 text-gray-500 hover:text-white font-bold uppercase tracking-[0.2em] text-xs transition-all border border-white/5 hover:bg-white/10 "
                                    >
                                        Abort
                                    </button>
                                    <button
                                        type="submit"
                                        className={`flex-1 py-5 rounded-xl font-bold uppercase tracking-[0.3em] text-xs transition-all shadow-xl  transform hover:scale-105 active:scale-95 ${modal.type === 'delete' ? 'bg-red-600/20 border border-red-500/40 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-500/20 hover:shadow-blue-500/40'}`}
                                    >
                                        {modal.type === 'delete' ? 'Confirm Neutralization' : 'Execute Protocol'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTeams;


