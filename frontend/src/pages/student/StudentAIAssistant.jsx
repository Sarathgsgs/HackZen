import React, { useEffect, useMemo, useState } from 'react';
import { fetchInitialMessages, fetchQuickStarters, sendChatMessage } from '../../services/student/aiAssistantApi';

const starterConversation = [
    {
        id: 'assistant-1',
        sender: 'ai',
        text: "Let's break the problem into user needs, current challenges, existing gaps, and possible opportunities. Start by identifying who is affected and what difficulty they currently experience.",
        timestamp: '10:24 AM'
    },
    {
        id: 'user-1',
        sender: 'user',
        text: 'I want to understand the main pain points related to this problem statement.',
        timestamp: '10:24 AM'
    },
    {
        id: 'assistant-2',
        sender: 'ai',
        text: 'How can I structure my project?',
        timestamp: '10:25 AM'
    },
    {
        id: 'user-2',
        sender: 'user',
        text: 'You can structure your project around Problem → Target Users → Pain Point → Proposed Solution → Key Features → Technology → Impact → Validation.',
        timestamp: '10:25 AM'
    }
];

const suggestionLabels = [
    'Help me understand this problem',
    'What are the real pain points?',
    'Suggest possible approaches',
    'How can I structure my project?'
];

const AI_BUSY_MESSAGE = 'AI service is temporarily busy. Please try again in a moment.';

const StudentAIAssistant = () => {
    const [selectedContext, setSelectedContext] = useState('AI for Social Impact');
    const [selectedObjective, setSelectedObjective] = useState('Problem Statement');
    const [messages, setMessages] = useState(starterConversation);
    const [quickStarters, setQuickStarters] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAITyping, setIsAITyping] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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
                    setMessages(starterConversation);
                }
                setQuickStarters(triggers || []);
            } catch (error) {
                console.error('Failed to load AI data:', error);
                setMessages(starterConversation);
                setQuickStarters([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    const handleSendMessage = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        const userMsg = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: trimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsAITyping(true);
        setErrorMessage('');

        try {
            const aiResponse = await sendChatMessage(trimmed, selectedContext, selectedObjective);
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('AI Assistant error:', error);
            const friendlyMessage = error?.message?.includes('503') || error?.message?.toLowerCase().includes('unavailable') || error?.message?.toLowerCase().includes('high demand')
                ? AI_BUSY_MESSAGE
                : (error?.message || AI_BUSY_MESSAGE);

            setErrorMessage(friendlyMessage);
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                sender: 'ai',
                text: friendlyMessage,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsAITyping(false);
        }
    };

    const displayStarters = useMemo(() => {
        if (quickStarters.length) return quickStarters;
        return suggestionLabels.map((text, index) => ({ id: index + 1, text }));
    }, [quickStarters]);

    return (
        <div className="min-h-screen bg-[#f3f0f5] px-4 py-8 text-[#1e1f2a] md:px-6">
            <div className="mx-auto max-w-[1260px]">
                <h1 className="text-[2.2rem] font-bold tracking-[-0.04em] text-[#1d1f2a]">AI Assistant</h1>
                <p className="mt-2 text-[0.98rem] text-[#5c5a66]">Explore ideas, understand problems and structure your hackathon project.</p>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_0.82fr]">
                    <div className="overflow-hidden rounded-[20px] border border-[#d8d4de] bg-[#faf8fc] shadow-[0_10px_30px_rgba(30,31,42,0.04)]">
                        <div className="flex items-center justify-between border-b border-[#e6e1ec] bg-[#f3f1f7] px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#c8c3d5] bg-[#eef1ff] text-[#4b4bff]">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M8 7.75A4.75 4.75 0 0 1 12.75 3h.5A4.75 4.75 0 0 1 18 7.75v2.5A4.75 4.75 0 0 1 13.25 15h-.5A4.75 4.75 0 0 1 8 10.25v-2.5Zm6.7 10.5h-2.4a.6.6 0 0 0-.6.6V19a2 2 0 0 0 2 2h.6a2 2 0 0 0 2-2v-1.15a.6.6 0 0 0-.6-.6Zm-2.45-7.13a2.38 2.38 0 0 0 2.5 2.5 2.38 2.38 0 0 0 2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-[1.05rem] font-semibold text-[#1d1f2a]">Proeduvate AI Assistant</div>
                                </div>
                            </div>
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8d4de] bg-white text-[#5b5b63] hover:bg-[#f8f5ff]" aria-label="More options">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
                            </button>
                        </div>

                        <div className="h-[560px] bg-[#f9f8fb] p-4 sm:p-5">
                            <div className="flex h-full flex-col">
                                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.sender === 'user' ? (
                                                <div className="max-w-[88%] rounded-[18px] bg-[#f2eef8] px-4 py-3 text-[0.96rem] leading-7 text-[#1c1d2a] shadow-[0_2px_8px_rgba(40,35,65,0.03)]">
                                                    {msg.text}
                                                    <div className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[#737082]">{msg.timestamp}</div>
                                                </div>
                                            ) : (
                                                <div className="max-w-[88%] rounded-[20px] border border-[#e8e2f0] bg-[#f1f0f5] px-4 py-3 text-[0.96rem] leading-7 text-[#1f2330] shadow-[0_2px_8px_rgba(40,35,65,0.02)]">
                                                    {msg.text}
                                                    <div className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[#7a738a]">{msg.timestamp}</div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {isAITyping && (
                                        <div className="flex justify-start">
                                            <div className="rounded-[20px] border border-[#e8e2f0] bg-[#f1f0f5] px-4 py-3 text-[0.8rem] font-medium uppercase tracking-[0.12em] text-[#7e7d8f]">
                                                Thinking...
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {displayStarters.map((starter) => (
                                        <button
                                            key={starter.id}
                                            type="button"
                                            onClick={() => setInputValue(starter.text)}
                                            className="rounded-full border border-[#dfe2ea] bg-[#f8f8fb] px-3 py-2 text-[0.77rem] font-medium text-[#2d2e39] transition hover:border-[#b9b3d0] hover:bg-white"
                                        >
                                            {starter.text}
                                        </button>
                                    ))}
                                </div>

                                {errorMessage && (
                                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                                        {errorMessage}
                                    </div>
                                )}

                                <div className="mt-4 flex items-end gap-3 rounded-[18px] border border-[#d6d2dd] bg-white p-2 shadow-[0_6px_25px_rgba(41,32,72,0.04)]">
                                    <div className="flex-1">
                                        <textarea
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            rows={1}
                                            placeholder="Ask Proeduvate AI anything about your hackathon idea..."
                                            className="max-h-28 min-h-[52px] w-full resize-none border-0 bg-transparent px-3 py-3 text-[0.95rem] text-[#1e1f2a] placeholder:text-[#7a7485] focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSendMessage}
                                        disabled={!inputValue.trim() || isAITyping}
                                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4d3bb5] text-white shadow-[0_10px_20px_rgba(77,59,181,0.25)] transition hover:bg-[#4233a6] disabled:cursor-not-allowed disabled:opacity-60"
                                        aria-label="Send message"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path d="M5 12h10.5M12.5 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="space-y-5">
                        <div className="rounded-[18px] border border-[#d9d2e4] bg-[#f8f5fb] p-5">
                            <div className="flex items-center justify-between border-b border-[#e5e0ec] pb-3">
                                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#6c6778]">Current hackathon</span>
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4cde7] bg-white text-[#5d4ad6]">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M8 6V5a4 4 0 0 1 8 0v1m-9 0h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9.5 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="mt-4 text-[1.05rem] font-semibold text-[#1d1e2a]">AI Innovation Challenge</h2>

                            <div className="mt-5 rounded-[12px] border border-[#e8e3f1] bg-[#f5f1fa] p-3 text-sm text-[#4c4b57]">
                                <div className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#756f86]">Theme</div>
                                <div className="text-[0.95rem] text-[#232534]">AI for Social Impact</div>
                            </div>

                            <div className="mt-4 rounded-[12px] border border-[#e8e3f1] bg-[#f5f1fa] p-3 text-sm text-[#4c4b57]">
                                <div className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#756f86]">Problem Statement</div>
                                <div className="text-[0.95rem] text-[#232534]">Improving access to essential services in underserved communities using localized AI solutions.</div>
                            </div>

                            <div className="mt-5 flex items-center gap-2 text-[0.86rem] text-[#3a3942]">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d5d0e2] bg-white text-[#413847]">👥</span>
                                <span>Team: Team Innovators</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedContext('AI for Social Impact')}
                                className="mt-5 w-full rounded-xl border border-[#d5d0e2] bg-white px-4 py-3 text-sm font-semibold text-[#2c2c35] transition hover:bg-[#f5f0ff]"
                            >
                                Change Context
                            </button>
                        </div>

                        <div className="rounded-[18px] border border-[#d9d2e4] bg-[#f8f5fb] p-5">
                            <div className="flex items-center gap-3 border-b border-[#e6e1ec] pb-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4cde7] bg-[#eef1ff] text-[#4b4bff]">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="text-[1.08rem] font-semibold text-[#1d1e2a]">AI Assistant Can Help</h3>
                            </div>

                            <ul className="mt-4 space-y-3 text-[0.95rem] text-[#2f3039]">
                                {[
                                    'Understand complex themes and break them down.',
                                    'Identify core user pain points and target audiences.',
                                    'Explore technological approaches and potential solutions.',
                                    'Structure your hackathon project narrative and pitch.'
                                ].map((item) => (
                                    <li key={item} className="flex gap-3">
                                        <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#e9e3ff] text-[#4d3bb5]">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                <path d="M5 12.5 9 16.5 19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default StudentAIAssistant;
