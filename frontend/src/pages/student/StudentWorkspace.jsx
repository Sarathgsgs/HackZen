import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';
import { getMyTeams } from '../../api/teamApi';

const StudentWorkspace = () => {
    const navigate = useNavigate();
    // State management
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [activeTab, setActiveTab] = useState('Chat');
    const [messageInput, setMessageInput] = useState('');
    const [teamMessages, setTeamMessages] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const chatEndRef = useRef(null);
    const socketRef = useRef(null);

    // User data from session/local storage
    const currentUser = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    })();
    const userId = currentUser._id || currentUser.id || '';
    const userName = currentUser.name || '';

    // 1. Fetch Real Teams
    useEffect(() => {
        const fetchTeams = async () => {
            setIsLoading(true);
            try {
                const data = await getMyTeams();
                const mappedTeams = data.map((team, idx) => ({
                    id: team.id || team._id,
                    name: team.teamName || 'Team name unavailable',
                    avatarColor: idx % 2 === 0 ? 'from-blue-500 to-blue-600' : 'from-blue-600 to-cyan-600',
                }));
                setTeams(mappedTeams);
                if (mappedTeams.length > 0) {
                    setSelectedTeam(mappedTeams[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch teams:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeams();
    }, []);

    // 2. WebSocket Connection Logic
    useEffect(() => {
        if (activeTab !== 'Chat' || !selectedTeam || !userId) return;

        const connectWS = () => {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            // Correctly handle the base URL to create the WS URL
            const wsBase = apiBase.replace(/^http/, 'ws').replace(/\/api$/, '');
            const wsUrl = `${wsBase}/api/chat/ws/${selectedTeam}/${userId}`;
            
            console.log(`Connecting to chat: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => console.log("Chat connected");

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    const msg = data.message;
                    const messageId = msg._id || msg.id;
                    if (!messageId) return;
                    const newMessage = {
                        id: messageId,
                        text: msg.content,
                        sender: msg.senderId === userId ? 'me' : 'them',
                        user: msg.senderName || (msg.senderId === userId ? (userName || 'You') : 'Team member'),
                        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: msg.messageType || 'text'
                    };
                    
                    setTeamMessages(prev => ({
                        ...prev,
                        [selectedTeam]: [...(prev[selectedTeam] || []), newMessage]
                    }));
                }
            };

            ws.onclose = () => {
                console.log("Chat disconnected. Retrying in 3s...");
                setTimeout(() => {
                    if (activeTab === 'Chat' && socketRef.current?.readyState !== WebSocket.OPEN) {
                        connectWS();
                    }
                }, 3000);
            };

            ws.onerror = (err) => console.error("WebSocket Error:", err);
        };

        connectWS();

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [selectedTeam, activeTab, userId, userName]);

    // 3. Fetch History on team change
    useEffect(() => {
        if (!selectedTeam || activeTab !== 'Chat' || !userId) return;

        const fetchHistory = async () => {
            try {
                const { data } = await apiClient.get(`/chat/${selectedTeam}/messages`);
                if (data) {
                    const formatted = data.map(m => ({
                        id: m._id,
                        text: m.content,
                        sender: m.senderId === userId ? 'me' : 'them',
                        user: m.senderName || (m.senderId === userId ? (userName || 'You') : 'Team member'),
                        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: m.messageType
                    }));
                    setTeamMessages(prev => ({ ...prev, [selectedTeam]: formatted }));
                }
            } catch (err) {
                console.error("History fetch failed:", err);
            }
        };

        fetchHistory();
    }, [selectedTeam, activeTab, userId, userName]);

    // 4. Tasks Integration
    const [tasks, setTasks] = useState([]);
    useEffect(() => {
        if (!selectedTeam || activeTab !== 'Tasks') return;
        const fetchTasks = async () => {
            try {
                const { data } = await apiClient.get(`/progress/team/${selectedTeam}`);
                const { data: milestones } = await apiClient.get(`/progress/milestones/${data._id}`);
                setTasks(milestones.map(m => ({
                    id: m._id,
                    title: m.title || 'Task title unavailable',
                    status: m.completed ? 'Done' : 'In Progress',
                    assignee: m.assigneeName || 'Assignee unavailable'
                })));
            } catch (err) {
                console.error("Tasks fetch failed:", err);
            }
        };
        fetchTasks();
    }, [selectedTeam, activeTab]);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [teamMessages, selectedTeam, activeTab]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const trimmedMessage = messageInput.trim();
        if (!trimmedMessage || !selectedTeam || !userId) return;

        try {
            const { data } = await apiClient.post(`/chat/${selectedTeam}/send`, {
                content: trimmedMessage,
                type: 'text'
            });

            const messageId = data?._id || data?.id;
            if (!messageId) throw new Error('The server did not return a persisted message record.');

            const newMessage = {
                id: messageId,
                text: data?.content || trimmedMessage,
                sender: data?.senderId === userId ? 'me' : 'them',
                user: data?.senderName || userName || 'You',
                time: data?.createdAt ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time unavailable',
                type: data?.messageType || 'text'
            };

            setTeamMessages(prev => ({
                ...prev,
                [selectedTeam]: [...(prev[selectedTeam] || []), newMessage]
            }));

            setMessageInput('');
        } catch (error) {
            console.error('Failed to send workspace message:', error);
            const backendDetail = error?.response?.data?.detail;
            const message = typeof backendDetail === 'string'
                ? backendDetail
                : backendDetail?.message || 'The message could not be saved. Please try again.';
            alert(message);
        }
    };

    if (isLoading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );

    const currentTeam = teams.find(t => t.id === selectedTeam) || teams[0];
    const messages = selectedTeam ? (teamMessages[selectedTeam] || []) : [];

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6 animate-fade-in">
            {/* Sidebar: Teams List */}
            <div className="w-80 flex-none glass border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5 bg-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Your Teams</h2>
                        <span className="bg-blue-600/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-500/20">
                            {teams.length} teams
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {teams.map(team => (
                        <button
                            key={team.id}
                            onClick={() => setSelectedTeam(team.id)}
                            className={`w-full group relative p-3 rounded-2xl flex items-center gap-4 transition-all duration-300 ${selectedTeam === team.id
                                    ? 'bg-gradient-to-r from-blue-600/20 to-blue-600/10 border border-blue-500/30'
                                    : 'hover:bg-white/5 border border-transparent grayscale hover:grayscale-0'
                                }`}
                        >
                            <div className={`relative shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${team.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-md transform group-hover:scale-105 transition-transform`}>
                                {team.name.charAt(0)}
                            </div>

                            <div className="flex-1 min-w-0 text-left">
                                <h3 className={`text-sm font-bold truncate transition-colors ${selectedTeam === team.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                    {team.name}
                                </h3>
                                <p className="text-xs text-gray-500 truncate w-full group-hover:text-gray-400 transition-colors mt-0.5">
                                    {teamMessages[team.id]?.slice(-1)[0]?.text || 'No messages yet'}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 glass border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-xl relative bg-black/10">
                {!selectedTeam ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                        <div className="text-6xl">🏢</div>
                        <p className="text-xl font-medium">Select a team to start collaborating</p>
                    </div>
                ) : (
                    <>
                        {/* Workspace Header */}
                        <div className="h-20 px-8 flex items-center justify-between flex-none bg-white/5 border-b border-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTeam?.avatarColor} flex items-center justify-center text-white font-bold text-xl shadow-md ring-1 ring-white/10`}>
                                    {currentTeam?.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{currentTeam?.name} Workspace</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                        <span className="text-sm text-gray-400 font-medium">
                                            Team workspace
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:flex p-1 bg-black/20 rounded-xl border border-white/10 shadow-inner">
                                {['Chat', 'Files', 'Tasks'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab
                                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md ring-1 ring-white/10'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content Area */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {activeTab === 'Chat' && (
                                <>
                                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar scroll-smooth">
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex w-full group ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex gap-4 max-w-[75%] ${msg.sender === 'me' ? 'flex-row-reverse' : ''}`}>
                                                    <div className="mt-auto">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-md border border-white/10 ${msg.sender === 'me'
                                                                ? 'bg-gradient-to-br from-blue-700 to-blue-800 text-white'
                                                                : 'bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400'
                                                            }`}>
                                                            {msg.user.charAt(0)}
                                                        </div>
                                                    </div>

                                                    <div className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                                        <div className="flex items-center gap-2 mb-1 px-1">
                                                            <span className="text-xs font-medium text-gray-400">{msg.user}</span>
                                                            <span className="text-xs text-gray-500">{msg.time}</span>
                                                        </div>
                                                        <div className={`
                                                            relative p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words
                                                            ${msg.sender === 'me'
                                                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-none border border-white/10'
                                                                : 'glass bg-white/5 text-gray-200 rounded-tl-none border border-white/5 hover:bg-white/10 transition-colors'}
                                                        `}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Input Bar */}
                                    <div className="p-6 bg-white/5 border-t border-white/5 backdrop-blur-xl">
                                        <div className="max-w-4xl mx-auto">
                                            <form onSubmit={handleSendMessage} className="relative group">
                                                <input
                                                    type="text"
                                                    value={messageInput}
                                                    onChange={(e) => setMessageInput(e.target.value)}
                                                    placeholder="Type your message to the team..."
                                                    className="w-full pl-6 pr-16 py-4 bg-navy-950/80 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-navy-950 transition-all font-medium placeholder-gray-600 shadow-inner"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                    <button
                                                        type="submit"
                                                        disabled={!messageInput.trim()}
                                                        className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-lg transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center"
                                                    >
                                                        <svg className="w-5 h-5 translate-x-0.5 -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'Tasks' && (
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <div className="max-w-4xl mx-auto space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold text-white">Project Milestones</h3>
                                            <button onClick={() => navigate(`/student/teams/${selectedTeam}/workspace`)} className="px-4 py-2 bg-blue-600/20 text-blue-400 text-sm font-semibold rounded-xl border border-blue-500/20 hover:bg-blue-600/30 transition-colors">
                                                Open team tasks
                                            </button>
                                        </div>
                                        
                                        <div className="grid gap-4">
                                            {tasks.length > 0 ? tasks.map(task => (
                                                <div key={task.id} className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-3 h-3 rounded-full ${task.status === 'Done' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                        <div>
                                                            <h4 className="text-white font-bold">{task.title}</h4>
                                                            <p className="text-xs text-gray-500 mt-1">Assigned to: {task.assignee}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                            task.status === 'Done' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                            {task.status}
                                                        </span>
                                                        <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-white transition-all">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-12">
                                                    <div className="text-4xl mb-4">📋</div>
                                                    <p className="text-gray-500">No milestones tracked for this team yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Files' && (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                                    <div className="text-6xl">📁</div>
                                    <p className="text-xl font-medium">Team files will appear here</p>
                                    <button onClick={() => navigate(`/student/files?teamId=${encodeURIComponent(selectedTeam)}`)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors">
                                        Open File Sharing to upload
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentWorkspace;
