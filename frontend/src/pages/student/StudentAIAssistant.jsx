import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Bot,
    User,
    Sparkles,
    Send,
    Copy,
    Check,
    Trash2,
    Layers,
    Cpu,
    AlertCircle,
    ArrowRight,
    MessageSquare,
    FolderGit2,
    Users,
    CheckCircle2,
    Lightbulb
} from 'lucide-react';
import { fetchInitialMessages, fetchQuickStarters, sendChatMessage } from '../../services/student/aiAssistantApi';
import { getMyTeams } from '../../api/teamApi';
import { fetchMyApplications } from '../../api/applicationApi';
import { fetchHackathonById, fetchAllHackathons } from '../../api/hackathonApi';

const suggestionLabels = [
    'Help me understand this problem statement',
    'Review our project architecture & best practices',
    'How should we design our database schema & indexes?',
    'What are the key points for our final demo pitch?'
];

// Fenced code block with clean syntax presentation and copy button
const CodeBlock = ({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        try {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for clipboard
        }
    };

    return (
        <div className="my-3 overflow-hidden rounded-xl border border-[#2d284e] bg-[#161329] shadow-md">
            <div className="flex items-center justify-between border-b border-[#2d284e] bg-[#100d20] px-4 py-2 text-xs text-[#a49fc4]">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#8c7df7]"></span>
                    <span className="font-mono uppercase font-semibold text-[#8c7df7]">{language || 'code'}</span>
                </div>
                <button
                    onClick={handleCopy}
                    type="button"
                    className="flex items-center gap-1.5 rounded-md bg-[#252042] px-2.5 py-1 text-xs text-[#d3cefa] transition hover:bg-[#342e5a] hover:text-white"
                    title="Copy code"
                >
                    {copied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="font-medium text-emerald-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-[#f3efff]">
                <code>{code}</code>
            </pre>
        </div>
    );
};

// Formatted markdown renderer for AI messages
const MarkdownMessage = ({ content }) => {
    if (!content) return null;

    // Split text by code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\s*([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                text: content.slice(lastIndex, match.index)
            });
        }
        parts.push({
            type: 'code',
            language: match[1] || 'code',
            code: match[2].trim()
        });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
        parts.push({
            type: 'text',
            text: content.slice(lastIndex)
        });
    }

    // Helper to format inline markdown (bold, inline code)
    const formatInline = (text) => {
        const codeParts = text.split(/(`[^`]+`)/g);
        return codeParts.map((sub, i) => {
            if (sub.startsWith('`') && sub.endsWith('`') && sub.length > 2) {
                return (
                    <code key={i} className="rounded bg-[#ebe6f7] px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#543b94]">
                        {sub.slice(1, -1)}
                    </code>
                );
            }
            const boldParts = sub.split(/(\*\*[^*]+\*\*)/g);
            return boldParts.map((bSub, j) => {
                if (bSub.startsWith('**') && bSub.endsWith('**') && bSub.length > 4) {
                    return <strong key={`${i}-${j}`} className="font-semibold text-[#1c1833]">{bSub.slice(2, -2)}</strong>;
                }
                return bSub;
            });
        });
    };

    const renderTextSection = (textBlock, idx) => {
        const lines = textBlock.split('\n');
        return (
            <div key={idx} className="space-y-1.5">
                {lines.map((line, lIdx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={lIdx} className="h-1.5" />;

                    if (trimmed.startsWith('### ')) {
                        return (
                            <h4 key={lIdx} className="mt-3.5 mb-1.5 text-sm sm:text-[15px] font-bold text-[#352569] tracking-tight">
                                {formatInline(trimmed.slice(4))}
                            </h4>
                        );
                    }
                    if (trimmed.startsWith('## ')) {
                        return (
                            <h3 key={lIdx} className="mt-4 mb-2 text-[15px] sm:text-base font-bold text-[#2a1b56] tracking-tight">
                                {formatInline(trimmed.slice(3))}
                            </h3>
                        );
                    }
                    if (trimmed.startsWith('# ')) {
                        return (
                            <h2 key={lIdx} className="mt-4 mb-2 text-base sm:text-lg font-bold text-[#1f1345]">
                                {formatInline(trimmed.slice(2))}
                            </h2>
                        );
                    }
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                        return (
                            <div key={lIdx} className="flex items-start gap-2.5 pl-2 text-[13.5px] sm:text-[14px] leading-relaxed text-[#2a273b]">
                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#6a53b5]" />
                                <span className="flex-1">{formatInline(trimmed.replace(/^[-*•]\s+/, ''))}</span>
                            </div>
                        );
                    }
                    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
                    if (numberedMatch) {
                        return (
                            <div key={lIdx} className="flex items-start gap-2.5 pl-2 text-[13.5px] sm:text-[14px] leading-relaxed text-[#2a273b]">
                                <span className="font-semibold text-[#6a53b5] flex-shrink-0 min-w-[18px]">{numberedMatch[1]}.</span>
                                <span className="flex-1">{formatInline(numberedMatch[2])}</span>
                            </div>
                        );
                    }
                    return (
                        <p key={lIdx} className="text-[13.5px] sm:text-[14px] leading-relaxed text-[#2a273b]">
                            {formatInline(trimmed)}
                        </p>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-2">
            {parts.map((part, index) => {
                if (part.type === 'code') {
                    return <CodeBlock key={index} language={part.language} code={part.code} />;
                }
                return renderTextSection(part.text, index);
            })}
        </div>
    );
};

const StudentAIAssistant = () => {
    const [hackathons, setHackathons] = useState([]);
    const [selectedHackathonId, setSelectedHackathonId] = useState('');
    const [teams, setTeams] = useState([]);
    const [messages, setMessages] = useState([]);
    const [quickStarters, setQuickStarters] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isContextLoading, setIsContextLoading] = useState(true);
    const [isAITyping, setIsAITyping] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [historyError, setHistoryError] = useState('');
    const sendingRef = useRef(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const selectedHackathon = hackathons.find((item) => String(item.id || item._id) === String(selectedHackathonId));
    const selectedTeam = teams.find((item) => String(item.hackathonId) === String(selectedHackathonId)) || teams[0];

    // Smooth auto-scroll to bottom of chat
    const scrollToBottom = (behavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
        }
    };

    useEffect(() => {
        scrollToBottom('smooth');
    }, [messages, isAITyping]);

    useEffect(() => {
        let active = true;
        const loadHackathonContext = async () => {
            try {
                const [myTeams, applications] = await Promise.all([getMyTeams(), fetchMyApplications()]);
                if (!active) return;
                const teamsList = Array.isArray(myTeams) ? myTeams : [];
                const applicationList = Array.isArray(applications) ? applications : [];
                setTeams(teamsList);
                const ids = [...new Set([
                    ...teamsList.map((team) => team.hackathonId),
                    ...applicationList.map((application) => application.hackathonId),
                ].filter(Boolean).map(String))];
                const results = await Promise.allSettled(ids.map((id) => fetchHackathonById(id)));
                if (!active) return;
                let loaded = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
                if (loaded.length === 0) {
                    try {
                        const allHacks = await fetchAllHackathons();
                        if (Array.isArray(allHacks) && allHacks.length > 0) {
                            loaded = allHacks;
                        }
                    } catch (err) {
                        // Keep graceful empty list if network is down
                    }
                }
                setHackathons(loaded);
                let cachedUser = {};
                try {
                    cachedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}') || {};
                } catch {
                    // Profile parse fallback
                }
                const preferredId = cachedUser.currentHackathonId || cachedUser.hackathonId || cachedUser.team?.hackathonId;
                const preferred = loaded.find((item) => String(item.id || item._id) === String(preferredId));
                const selected = preferred || loaded[0];
                setSelectedHackathonId(selected ? String(selected.id || selected._id) : '');
            } catch (error) {
                console.error('Failed to load AI hackathon context:', error);
            } finally {
                if (active) setIsContextLoading(false);
            }
        };
        loadHackathonContext();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setErrorMessage('');
            try {
                const [initialMsgs, triggers] = await Promise.all([
                    fetchInitialMessages(),
                    fetchQuickStarters()
                ]);
                if (Array.isArray(initialMsgs) && initialMsgs.length > 0) {
                    setMessages(initialMsgs);
                } else {
                    setMessages([]);
                }
                setQuickStarters(triggers || []);
            } catch (error) {
                console.error('Failed to load AI data:', error);
                setMessages([]);
                setQuickStarters([]);
                setHistoryError('Conversation history could not be loaded. You can still send a new question.');
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    const handleSendMessage = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || sendingRef.current) return;
        sendingRef.current = true;

        const userMsg = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: trimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Optimistically add user message and clear input
        const updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
        setInputValue('');
        setIsAITyping(true);
        setErrorMessage('');

        try {
            // Forward multi-turn conversation history
            const aiResponse = await sendChatMessage(trimmed, selectedHackathonId, updatedHistory);
            setMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            console.error('AI Assistant error:', error);
            setErrorMessage(error?.message || 'The AI service could not complete this request. Please try again.');
        } finally {
            sendingRef.current = false;
            setIsAITyping(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 50);
        }
    };

    const handleClearChat = () => {
        if (window.confirm('Clear the current chat view? (Saved logs remain in history)')) {
            setMessages([]);
            setErrorMessage('');
        }
    };

    const handleSelectStarter = (starterText) => {
        setInputValue(starterText);
        textareaRef.current?.focus();
    };

    const displayStarters = useMemo(() => {
        if (quickStarters.length) return quickStarters;
        return suggestionLabels.map((text, index) => ({ id: index + 1, text }));
    }, [quickStarters]);

    return (
        <div className="min-h-screen bg-[#f3f0f5] px-4 py-8 text-[#1e1f2a] md:px-6">
            <div className="mx-auto max-w-[1280px]">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-[2.2rem] font-bold tracking-[-0.04em] text-[#1d1f2a]">AI Project Assistant</h1>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                <Sparkles className="h-3.5 w-3.5" />
                                NVIDIA Llama 3.2 NIM
                            </span>
                        </div>
                        <p className="mt-1 text-[0.98rem] text-[#5c5a66]">
                            Real-time AI Co-Mentor for project architecture, code debugging, database design, and hackathon pitches.
                        </p>
                    </div>

                    {selectedTeam && (
                        <div className="flex items-center gap-3 rounded-2xl border border-[#d8d2e6] bg-white px-4 py-2.5 shadow-sm">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                <FolderGit2 className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Active Project</div>
                                <div className="text-sm font-bold text-gray-900 truncate max-w-[200px]">
                                    {selectedTeam.project || selectedTeam.teamName}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Grid */}
                <div className="mt-7 grid gap-6 lg:grid-cols-[1.75fr_0.85fr]">
                    {/* Chat Panel */}
                    <div className="flex flex-col overflow-hidden rounded-[24px] border border-[#d8d4de] bg-[#faf8fc] shadow-[0_10px_35px_rgba(30,31,42,0.05)]">
                        {/* Chat Sub-header */}
                        <div className="flex items-center justify-between border-b border-[#e6e1ec] bg-[#f4f2f8] px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c8c3d5] bg-[#eef1ff] text-[#4b4bff]">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-[0.98rem] font-bold text-[#1d1f2a]">ProEduvate AI Co-Mentor</div>
                                    <div className="flex items-center gap-1.5 text-[0.72rem] text-emerald-600 font-medium">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Real-time Project Mentorship Active
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleClearChat}
                                    type="button"
                                    className="flex items-center gap-1.5 rounded-xl border border-[#d8d4de] bg-white px-3 py-1.5 text-xs font-medium text-[#5b5b63] transition hover:bg-[#f8f5ff] hover:text-[#2d2e39]"
                                    title="Clear current chat view"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Clear View</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex h-[560px] flex-col justify-between bg-[#f9f8fb] p-4 sm:p-5">
                            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                                {isLoading ? (
                                    <div className="flex h-full flex-col items-center justify-center py-12 text-[#777487]">
                                        <Cpu className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                                        <p className="text-sm font-medium">Connecting to AI Co-Mentor...</p>
                                    </div>
                                ) : null}

                                {historyError && (
                                    <div role="status" className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs sm:text-sm text-amber-800 border border-amber-200">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        <span>{historyError}</span>
                                    </div>
                                )}

                                {!isLoading && messages.length === 0 && (
                                    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 mb-3">
                                            <MessageSquare className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-gray-800">Welcome to your Project AI Assistant</h3>
                                        <p className="mt-1 max-w-md text-xs sm:text-sm text-gray-500">
                                            Ask any question about your hackathon project, problem statement, architecture, code, or pitch deck.
                                        </p>
                                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                                            {displayStarters.slice(0, 2).map((starter) => (
                                                <button
                                                    key={starter.id}
                                                    type="button"
                                                    onClick={() => handleSelectStarter(starter.text)}
                                                    className="rounded-full border border-blue-200 bg-white px-3.5 py-1.5 text-xs font-medium text-blue-800 shadow-sm transition hover:bg-blue-50"
                                                >
                                                    {starter.text}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex gap-3 max-w-[92%] sm:max-w-[88%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div
                                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                                    msg.sender === 'user'
                                                        ? 'bg-[#2563eb] text-white shadow-sm'
                                                        : 'border border-[#d6d0e6] bg-white text-[#2563eb] shadow-sm'
                                                }`}
                                            >
                                                {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                            </div>

                                            <div>
                                                <div
                                                    className={`rounded-[22px] px-4 py-3 shadow-[0_2px_10px_rgba(40,35,65,0.03)] ${
                                                        msg.sender === 'user'
                                                            ? 'bg-[#2563eb] text-white leading-relaxed'
                                                            : 'border border-[#e7e1f0] bg-white text-[#1f2330]'
                                                    }`}
                                                >
                                                    {msg.sender === 'user' ? (
                                                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                                    ) : (
                                                        <MarkdownMessage content={msg.text} />
                                                    )}
                                                </div>
                                                <div
                                                    className={`mt-1.5 px-2 text-[0.68rem] font-medium tracking-wide text-[#7d798e] ${
                                                        msg.sender === 'user' ? 'text-right' : 'text-left'
                                                    }`}
                                                >
                                                    {msg.timestamp}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isAITyping && (
                                    <div className="flex justify-start">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#d6d0e6] bg-white text-[#2563eb] shadow-sm">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                            <div className="flex items-center gap-2 rounded-2xl border border-[#e7e1f0] bg-white px-4 py-3 shadow-sm">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">AI Thinking</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Starter Chips */}
                            <div className="mt-3 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                                {displayStarters.map((starter) => (
                                    <button
                                        key={starter.id}
                                        type="button"
                                        onClick={() => handleSelectStarter(starter.text)}
                                        disabled={isAITyping}
                                        className="rounded-full border border-[#dfe2ea] bg-white px-3 py-1.5 text-[0.76rem] font-medium text-[#2d2e39] shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                                    >
                                        {starter.text}
                                    </button>
                                ))}
                            </div>

                            {/* Error Alert with Retry */}
                            {errorMessage && (
                                <div role="alert" className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSendMessage}
                                        disabled={isAITyping || isContextLoading}
                                        className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {/* Input Form */}
                            <div className="mt-3 flex items-end gap-2.5 rounded-[20px] border border-[#d6d2dd] bg-white p-2 shadow-[0_6px_25px_rgba(41,32,72,0.04)] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                                <div className="flex-1">
                                    <textarea
                                        ref={textareaRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        disabled={isAITyping}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        rows={1}
                                        placeholder="Ask ProEduvate AI anything about your hackathon project, code, or pitch..."
                                        className="max-h-28 min-h-[48px] w-full resize-none border-0 bg-transparent px-3 py-2.5 text-[0.95rem] text-[#1e1f2a] placeholder:text-[#7a7485] focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isAITyping || isContextLoading}
                                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)] transition hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Send message"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Context Sidebar */}
                    <aside className="space-y-5">
                        {/* Current Hackathon & Team Card */}
                        <div className="rounded-[22px] border border-[#d9d2e4] bg-[#f8f5fb] p-5 shadow-sm">
                            <div className="flex items-center justify-between border-b border-[#e5e0ec] pb-3">
                                <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#6c6778]">
                                    Hackathon Context
                                </span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4cde7] bg-white text-[#2563eb]">
                                    <Layers className="h-4 w-4" />
                                </div>
                            </div>

                            {selectedHackathon ? (
                                <>
                                    <div className="mt-4">
                                        <label htmlFor="hackathon-selector" className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Select Hackathon</label>
                                        <select
                                            id="hackathon-selector"
                                            aria-label="Current hackathon"
                                            value={selectedHackathonId}
                                            onChange={(event) => setSelectedHackathonId(event.target.value)}
                                            className="w-full rounded-xl border border-[#d8d4de] bg-white px-3 py-2 text-[0.95rem] font-semibold text-[#1d1e2a] focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            {hackathons.map((hackathon) => (
                                                <option key={hackathon.id || hackathon._id} value={hackathon.id || hackathon._id}>
                                                    {hackathon.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedTeam && (
                                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                                                <Users className="h-4 w-4 text-blue-700" />
                                                <span>Your Team: {selectedTeam.teamName}</span>
                                            </div>
                                            {selectedTeam.project && (
                                                <div className="mt-1 text-sm font-semibold text-gray-800">
                                                    Project: {selectedTeam.project}
                                                </div>
                                            )}
                                            {selectedTeam.track && (
                                                <div className="mt-0.5 text-xs text-blue-700 font-medium">
                                                    Track: {selectedTeam.track}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-4 rounded-[14px] border border-[#e8e3f1] bg-[#f5f1fa] p-3.5 text-sm text-[#4c4b57]">
                                        <div className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[#756f86]">Themes & Tracks</div>
                                        <div className="text-[0.92rem] font-medium text-[#232534]">
                                            {(selectedHackathon.themes || [])
                                                .map((theme) => (typeof theme === 'string' ? theme : theme?.value || theme?.name))
                                                .filter(Boolean)
                                                .join(', ') || 'General Innovation Track'}
                                        </div>
                                    </div>

                                    <div className="mt-3.5 rounded-[14px] border border-[#e8e3f1] bg-[#f5f1fa] p-3.5 text-sm text-[#4c4b57]">
                                        <div className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[#756f86]">Problem Statement</div>
                                        <div className="text-[0.9rem] leading-relaxed text-[#232534] line-clamp-4">
                                            {selectedHackathon.problemStatement || selectedHackathon.description || 'Build an innovative solution addressing track requirements.'}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="mt-4 text-sm text-[#625e70]">
                                    No registered hackathon linked to your account yet. You can still ask for general project and architecture guidance.
                                </p>
                            )}
                        </div>

                        {/* Capabilities Card */}
                        <div className="rounded-[22px] border border-[#d9d2e4] bg-[#f8f5fb] p-5 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-[#e6e1ec] pb-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4cde7] bg-[#eef1ff] text-[#4b4bff]">
                                    <Lightbulb className="h-4 w-4" />
                                </div>
                                <h3 className="text-[1.05rem] font-bold text-[#1d1e2a]">What I Can Help With</h3>
                            </div>

                            <ul className="mt-4 space-y-3 text-[0.92rem] text-[#2f3039]">
                                {[
                                    'Architecting scalable frontend & backend components.',
                                    'Writing, reviewing, and debugging API code and database schemas.',
                                    'Benchmarking tech stacks and choosing right algorithms.',
                                    'Structuring your pitch deck, demo flow, and presentation points.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                            <CheckCircle2 className="h-3 w-3" />
                                        </span>
                                        <span className="leading-snug">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-5 rounded-xl border border-blue-100 bg-white p-3 text-xs text-gray-600">
                                <span className="font-semibold text-blue-900 block mb-1">💡 Quick Tip:</span>
                                If you ask general questions, I will always guide you back to your hackathon project so you stay focused on winning!
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

class AIAssistantErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('AIAssistantErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#f3f0f5] px-4 py-12 flex flex-col items-center justify-center text-center">
                    <div className="max-w-md w-full rounded-2xl bg-white p-8 border border-blue-200 shadow-xl">
                        <div className="h-14 w-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4">
                            <Bot className="h-7 w-7" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">AI Assistant Ready</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            The assistant encountered an unexpected rendering event. Click below to refresh your session.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="w-full py-3 px-4 bg-[#2563eb] text-white rounded-xl font-semibold hover:bg-[#1d4ed8] transition shadow-md"
                        >
                            Reload Assistant
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function SafeStudentAIAssistant() {
    return (
        <AIAssistantErrorBoundary>
            <StudentAIAssistant />
        </AIAssistantErrorBoundary>
    );
}
