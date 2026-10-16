import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Calendar,
  Users,
  Paperclip,
  Check,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';

export default function MentorMessages() {
  const { openScheduleModal, addToast, globalSearch } = useMentor();

  const [activeChatId, setActiveChatId] = useState(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Conversations list
  const [conversations, setConversations] = useState([]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeChatId) || conversations[0],
    [conversations, activeChatId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  if (!activeConversation) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Team Messages</h1>
          <p role="status" className="mt-4 text-sm text-slate-500 dark:text-slate-400">No conversations are available from the messaging service.</p>
        </div>
      </div>
    );
  }

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: 'You',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMentor: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              lastMessage: inputText.trim(),
              time: 'Just now',
              messages: [...c.messages, newMessage],
            }
          : c
      )
    );

    setInputText('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Team Messages
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Direct real-time communication channels with your mentored cohorts.
          </p>
        </div>
      </div>

      {/* Messages Layout: Left Channels + Right Chat Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden h-[620px]">
        {/* Left: Conversations List (span 4) */}
        <div className="md:col-span-4 border-r border-slate-200/80 dark:border-white/10 flex flex-col h-full bg-[#FAFAFD]/50 dark:bg-navy-950/20">
          <div className="p-4 border-b border-slate-200/80 dark:border-white/10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5B45D9]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {conversations.map((conv) => {
              const isSelected = conv.id === activeChatId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveChatId(conv.id);
                    setConversations((prev) =>
                      prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
                    );
                  }}
                  className={`p-4 cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-purple-50/70 dark:bg-purple-950/30 border-l-4 border-[#5B45D9]'
                      : 'hover:bg-slate-100/60 dark:hover:bg-white/5'
                  }`}
                >
                  <img
                    src={conv.avatar}
                    alt={conv.teamName}
                    className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {conv.teamName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{conv.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#5B45D9] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat Area (span 8) */}
        <div className="md:col-span-8 flex flex-col h-full bg-white dark:bg-[#111625]">
          {/* Chat Header */}
          <div className="p-4 px-6 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-[#FAFAFD] dark:bg-navy-950/30">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={activeConversation.avatar}
                alt={activeConversation.teamName}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {activeConversation.teamName}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {activeConversation.hackathon} · <span className="font-semibold text-[#5B45D9]">{activeConversation.domain}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => openScheduleModal({ teamName: activeConversation.teamName })}
              className="px-3 py-1.5 rounded-xl bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 hover:bg-[#5B45D9] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule Session
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeConversation.messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.isMentor ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-slate-400 mb-1 px-1">
                  {m.sender} · {m.time}
                </span>
                <div
                  className={`max-w-md p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                    m.isMentor
                      ? 'bg-[#5B45D9] text-white rounded-br-xs shadow-xs'
                      : 'bg-slate-100 dark:bg-navy-950 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/60 dark:border-white/5'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 bg-[#FAFAFD] dark:bg-navy-950/30"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${activeConversation.teamName}...`}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5B45D9]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white disabled:opacity-50 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
