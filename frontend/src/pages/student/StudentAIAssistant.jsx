import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchInitialMessages, fetchQuickStarters, sendChatMessage } from '../../services/student/aiAssistantApi';
import { getMyTeams } from '../../api/teamApi';
import { fetchMyApplications } from '../../api/applicationApi';
import { fetchHackathonById } from '../../api/hackathonApi';

const suggestionLabels = [
    'Help me understand this problem',
    'What are the real pain points?',
    'Suggest possible approaches',
    'How can I structure my project?'
];

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

    const selectedHackathon = hackathons.find((item) => String(item.id || item._id) === String(selectedHackathonId));
    const selectedTeam = teams.find((item) => String(item.hackathonId) === String(selectedHackathonId));

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
                const loaded = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
                setHackathons(loaded);
                let cachedUser = {};
                try {
                    cachedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}') || {};
                } catch {
                    // The authenticated API results remain authoritative if the local profile is malformed.
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

        setIsAITyping(true);
        setErrorMessage('');

        try {
            const aiResponse = await sendChatMessage(trimmed, selectedHackathonId);
            setMessages(prev => [...prev, userMsg, aiResponse]);
            setInputValue('');
        } catch (error) {
            console.error('AI Assistant error:', error);
            setErrorMessage(error?.message || 'The AI service could not complete this request. Please try again.');
        } finally {
            sendingRef.current = false;
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
                                    {isLoading ? <p className="py-6 text-center text-sm text-[#777487]">Loading conversation…</p> : null}
                                    {historyError && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{historyError}</p>}
                                    {!isLoading && messages.length === 0 && <p className="py-10 text-center text-sm text-[#777487]">No saved conversation yet. Ask a question to get started.</p>}
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
                                            disabled={isAITyping}
                                            className="rounded-full border border-[#dfe2ea] bg-[#f8f8fb] px-3 py-2 text-[0.77rem] font-medium text-[#2d2e39] transition hover:border-[#b9b3d0] hover:bg-white"
                                        >
                                            {starter.text}
                                        </button>
                                    ))}
                                </div>

                                {errorMessage && (
                                    <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                        <span>{errorMessage}</span>
                                        <button type="button" onClick={handleSendMessage} disabled={!inputValue.trim() || isAITyping || isContextLoading} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 disabled:opacity-50">Retry</button>
                                    </div>
                                )}

                                <div className="mt-4 flex items-end gap-3 rounded-[18px] border border-[#d6d2dd] bg-white p-2 shadow-[0_6px_25px_rgba(41,32,72,0.04)]">
                                    <div className="flex-1">
                                        <textarea
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
                                            placeholder="Ask Proeduvate AI anything about your hackathon idea..."
                                            className="max-h-28 min-h-[52px] w-full resize-none border-0 bg-transparent px-3 py-3 text-[0.95rem] text-[#1e1f2a] placeholder:text-[#7a7485] focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSendMessage}
                                        disabled={!inputValue.trim() || isAITyping || isContextLoading}
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

                            {selectedHackathon ? <>
                            <select aria-label="Current hackathon" value={selectedHackathonId} onChange={(event) => setSelectedHackathonId(event.target.value)} className="mt-4 w-full rounded-lg border border-[#d8d4de] bg-white px-3 py-2 text-[1.05rem] font-semibold text-[#1d1e2a]">
                                {hackathons.map((hackathon) => <option key={hackathon.id || hackathon._id} value={hackathon.id || hackathon._id}>{hackathon.title}</option>)}
                            </select>

                            <div className="mt-5 rounded-[12px] border border-[#e8e3f1] bg-[#f5f1fa] p-3 text-sm text-[#4c4b57]">
                                <div className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#756f86]">Theme</div>
                                <div className="text-[0.95rem] text-[#232534]">{(selectedHackathon.themes || []).map((theme) => typeof theme === 'string' ? theme : theme?.value || theme?.name).filter(Boolean).join(', ') || 'No theme specified'}</div>
                            </div>

                            <div className="mt-4 rounded-[12px] border border-[#e8e3f1] bg-[#f5f1fa] p-3 text-sm text-[#4c4b57]">
                                <div className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#756f86]">Problem Statement</div>
                                <div className="text-[0.95rem] text-[#232534]">{selectedHackathon.problemStatement || selectedHackathon.description || 'No problem statement provided.'}</div>
                            </div>

                            {selectedTeam && <div className="mt-5 flex items-center gap-2 text-[0.86rem] text-[#3a3942]">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d5d0e2] bg-white text-[#413847]">👥</span>
                                <span>Team: {selectedTeam.teamName}</span>
                            </div>}
                            </> : <p className="mt-4 text-sm text-[#625e70]">No registered hackathon or team is linked to your account yet. You can still ask for general hackathon guidance.</p>}
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
