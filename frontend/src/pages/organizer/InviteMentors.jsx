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
    const [activeTab, setActiveTab] = useState('compose'); // compose, history
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const history = await fetchInvitationHistory();
            setInviteHistory(history);
        } catch (error) {
            console.error("Failed to load invitation history:", error);
            setStatusMessage("Failed to load invitation history.");
        }
    };

    const handleInvite = async () => {
        const emailList = emails.split(',').map(e => e.trim()).filter(e => e !== '');
        if (emailList.length === 0) return alert("Please enter at least one valid email address.");

        setIsLoading(true);
        setStatusMessage('');
        try {
            const result = await inviteMentors({
                emails: emailList,
                ...invitationData
            });
            setStatusMessage(result.message || 'Invitations sent successfully.');
            setEmails('');
            loadHistory();
            setActiveTab('history');
        } catch (error) {
            console.error("Invite failed:", error);
            setStatusMessage(error.response?.data?.detail || "Failed to send invitations. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="title-primary">Recruit Mentors</h1>
                    <p className="description-primary">Invite industry experts and technical advisors to your event</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    >
                        Back to Terminal
                    </button>
                    <button 
                        onClick={handleInvite}
                        disabled={isLoading || activeTab === 'history'}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? "Dispatching..." : "Send Invitations"}
                    </button>
                </div>
            </div>

            {statusMessage && (
                <div className="glass rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm text-cyan-100">
                    {statusMessage}
                </div>
            )}

            {/* Main Content Area */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white/5 p-1 rounded-xl">
                            <button 
                                onClick={() => setActiveTab('compose')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'compose' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                COMPOSE
                            </button>
                            <button 
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                LOGS
                            </button>
                        </div>
                    </div>
                </div>

                {activeTab === 'compose' ? (
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="label-protocol ml-1">Mentor Email Targets</label>
                                    <textarea 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all min-h-[150px] resize-none"
                                        placeholder="Enter emails separated by commas..."
                                        value={emails}
                                        onChange={(e) => setEmails(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="label-protocol ml-1">Strategic Role</label>
                                        <select 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                                            value={invitationData.role}
                                            onChange={(e) => setInvitationData(prev => ({ ...prev, role: e.target.value }))}
                                        >
                                            <option value="Mentor">Expert Mentor</option>
                                            <option value="Lead Mentor">Lead Mentor</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="label-protocol ml-1">Focus Domain</label>
                                        <select 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                                            value={invitationData.domain}
                                            onChange={(e) => setInvitationData(prev => ({ ...prev, domain: e.target.value }))}
                                        >
                                            <option value="AI & Machine Learning">AI & ML</option>
                                            <option value="Cybersecurity">Security</option>
                                            <option value="FinTech">FinTech</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="label-protocol ml-1">Invitation Transmission</label>
                                <textarea 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all h-full min-h-[150px] resize-none"
                                    placeholder="Message to mentors..."
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
                                <tr className="bg-white/5 label-protocol uppercase font-medium">
                                    <th className="px-6 py-4">Destination</th>
                                    <th className="px-6 py-4">Protocol Role</th>
                                    <th className="px-6 py-4">Expertise</th>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {inviteHistory.length > 0 ? inviteHistory.map(invite => (
                                    <tr key={invite.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-white">{invite.email}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-gray-400">{invite.role}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-cyan-400 font-bold">{invite.domain}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {new Date(invite.sentAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                                                invite.emailSent ? 'text-green-400' : 'text-amber-500'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    invite.emailSent ? 'bg-green-400' : 'bg-amber-500 animate-pulse'
                                                }`}></span>
                                                {invite.status}
                                            </span>
                                            {invite.notificationSent && (
                                                <p className="text-[10px] text-cyan-400 mt-1">In-app notification sent</p>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm italic">
                                            No mentor invitation history found yet.
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
