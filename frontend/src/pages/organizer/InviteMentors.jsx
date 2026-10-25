import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inviteMentors, fetchInvitationHistory } from '../../services/organizer/teamsMentorsApi';

const InviteMentors = () => {
    const navigate = useNavigate();
    const [emails, setEmails] = useState('');
    const [invitationData, setInvitationData] = useState({
        role: 'Mentor',
        domain: 'AI & Machine Learning',
        message: 'You have been invited to join our hackathon as a mentor. Help shape the future of tech!'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [inviteHistory, setInviteHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('compose');
    const [toastMessage, setToastMessage] = useState(null);

    // Toast auto-dismiss
    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(null), 3500);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const history = await fetchInvitationHistory();
            setInviteHistory(history);
        } catch (error) {
            console.error("Failed to load invitation history:", error);
        }
    };

    const handleInvite = async () => {
        const emailList = emails.split(',').map(e => e.trim()).filter(e => e !== '');
        if (emailList.length === 0) {
            setToastMessage({ type: 'error', text: 'Please enter at least one valid email address.' });
            return;
        }

        setIsLoading(true);
        try {
            const result = await inviteMentors({
                emails: emailList,
                ...invitationData
            });
            setToastMessage({ type: 'success', text: result.message || 'Invitations dispatched successfully!' });
            setEmails('');
            loadHistory();
            setActiveTab('history');
        } catch (error) {
            console.error("Invite failed:", error);
            setToastMessage({ 
                type: 'error', 
                text: error.response?.data?.detail || "Failed to dispatch invitations. Please try again." 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative">

            {/* Floating Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition-all animate-bounce ${
                    toastMessage.type === 'success' 
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                }`}>
                    <span>{toastMessage.type === 'success' ? '✓' : '⚠️'}</span>
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Recruit Mentors</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Invite industry experts and technical advisors to your hackathon</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="px-4 py-2.5 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-xs"
                    >
                        ← Back
                    </button>
                    <button 
                        onClick={handleInvite}
                        disabled={isLoading || activeTab === 'history'}
                        className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? "Dispatching..." : "Send Invitations"}
                    </button>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-slate-200/80 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                            <button 
                                onClick={() => setActiveTab('compose')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'compose' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                COMPOSE
                            </button>
                            <button 
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                INVITATION LOGS ({inviteHistory.length})
                            </button>
                        </div>
                    </div>
                </div>

                {activeTab === 'compose' ? (
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Mentor Email Addresses</label>
                                    <textarea 
                                        className="w-full bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all min-h-[140px] resize-none"
                                        placeholder="Enter recipient emails separated by commas (e.g. mentor1@tech.com, advisor@ai.org)..."
                                        value={emails}
                                        onChange={(e) => setEmails(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Role</label>
                                        <select 
                                            className="w-full bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] cursor-pointer"
                                            value={invitationData.role}
                                            onChange={(e) => setInvitationData(prev => ({ ...prev, role: e.target.value }))}
                                        >
                                            <option value="Mentor">Expert Mentor</option>
                                            <option value="Lead Mentor">Lead Mentor</option>
                                            <option value="Technical Advisor">Technical Advisor</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Focus Track / Domain</label>
                                        <select 
                                            className="w-full bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] cursor-pointer"
                                            value={invitationData.domain}
                                            onChange={(e) => setInvitationData(prev => ({ ...prev, domain: e.target.value }))}
                                        >
                                            <option value="AI & Machine Learning">AI & Machine Learning</option>
                                            <option value="Cybersecurity">Cybersecurity</option>
                                            <option value="FinTech">FinTech</option>
                                            <option value="Web3 & Blockchain">Web3 & Blockchain</option>
                                            <option value="Cloud & DevOps">Cloud & DevOps</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 flex flex-col">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Custom Invitation Message</label>
                                <textarea 
                                    className="w-full flex-1 bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all min-h-[140px] resize-none"
                                    placeholder="Write a custom welcome note..."
                                    value={invitationData.message}
                                    onChange={(e) => setInvitationData(prev => ({ ...prev, message: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/5 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Recipient</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Specialization</th>
                                    <th className="px-6 py-4">Sent At</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
                                {inviteHistory.length > 0 ? inviteHistory.map(invite => (
                                    <tr key={invite.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{invite.email}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-500 dark:text-gray-400">{invite.role}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-[#2563eb] dark:text-blue-400 font-semibold">{invite.domain}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-500 dark:text-gray-400">
                                                {new Date(invite.sentAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                                invite.emailSent ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    invite.emailSent ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                                                }`}></span>
                                                {invite.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 dark:text-gray-500 text-sm">
                                            No mentor invitations have been sent yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InviteMentors;
