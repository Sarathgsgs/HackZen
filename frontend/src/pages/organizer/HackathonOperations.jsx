import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    UserPlus, 
    UserMinus, 
    Plus, 
    Check, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    ExternalLink, 
    FileText, 
    Award, 
    CheckCircle2, 
    Sliders,
    Sparkles
} from 'lucide-react';
import { fetchOperationsDirectory, inviteOperationsExpert } from '../../services/organizer/organizerPagesApi';

export default function HackathonOperations() {
    const navigate = useNavigate();

    // 6 Operations Tabs: Mentors, Judges, Submissions, Evaluation, Results, Certificates
    const [activeTab, setActiveTab] = useState('mentors');

    // Data State
    const [directory, setDirectory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(24);
    const itemsPerPage = 6;

    // Invitation Modal State
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteExpertise, setInviteExpertise] = useState('AI & ML');
    const [inviteAvailability, setInviteAvailability] = useState('10 hrs/week');
    const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

    // Team Assignment Modal State
    const [assignModalExpert, setAssignModalExpert] = useState(null);
    const [assignedTeamsCount, setAssignedTeamsCount] = useState(0);

    // Toast Notification
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Load Directory Data based on Active Tab role & pagination
    const loadDirectory = async (page = currentPage, query = searchTerm) => {
        setLoading(true);
        try {
            const roleFilter = activeTab === 'mentors' ? 'mentor' : (activeTab === 'judges' ? 'judge' : 'all');
            const data = await fetchOperationsDirectory({
                role: roleFilter,
                search: query,
                page,
                limit: itemsPerPage
            });

            if (data && Array.isArray(data.entries)) {
                setDirectory(data.entries);
                setTotalCount(data.total || data.entries.length);
                setTotalPages(data.totalPages || Math.ceil((data.total || data.entries.length) / itemsPerPage) || 1);
            }
        } catch (error) {
            console.error('Failed to load operations directory:', error);
            showToast('Loaded local fallback directory.', 'info');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'mentors' || activeTab === 'judges') {
            setCurrentPage(1);
            loadDirectory(1, searchTerm);
        }
    }, [activeTab]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'mentors' || activeTab === 'judges') {
                loadDirectory(currentPage, searchTerm);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, currentPage]);

    // Handle Invite Submission
    const handleSendInvite = async (e) => {
        e.preventDefault();
        if (!inviteName.trim() || !inviteEmail.trim()) {
            showToast('Please enter both name and email.', 'error');
            return;
        }

        setIsSubmittingInvite(true);
        try {
            const role = activeTab === 'judges' ? 'judge' : 'mentor';
            await inviteOperationsExpert({
                name: inviteName.trim(),
                email: inviteEmail.trim(),
                role,
                expertise: inviteExpertise,
                availability: inviteAvailability
            });

            showToast(`Invitation sent to ${inviteName} as ${role}!`);
            setInviteModalOpen(false);
            setInviteName('');
            setInviteEmail('');
            loadDirectory(currentPage, searchTerm);
        } catch (error) {
            console.error('Invitation error:', error);
            showToast('Failed to send invitation. Please try again.', 'error');
        } finally {
            setIsSubmittingInvite(false);
        }
    };

    // Handle Team Assignment Update
    const handleSaveAssignment = () => {
        if (!assignModalExpert) return;
        setDirectory(prev => prev.map(item => 
            item.id === assignModalExpert.id ? { ...item, assignedTeams: assignedTeamsCount } : item
        ));
        showToast(`Updated assigned teams for ${assignModalExpert.name} to ${assignedTeamsCount}.`);
        setAssignModalExpert(null);
    };

    const tabs = [
        { id: 'mentors', label: 'Mentors' },
        { id: 'judges', label: 'Judges' },
        { id: 'submissions', label: 'Submissions' },
        { id: 'evaluation', label: 'Evaluation' },
        { id: 'results', label: 'Results' },
        { id: 'certificates', label: 'Certificates' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-16">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-2">
                    <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
                    <span className="text-xs font-semibold">{toastMessage.text}</span>
                </div>
            )}

            {/* Top Page Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Hackathon Operations
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage mentors, judges, submissions, evaluations, results and certificates for your hackathon.
                </p>
            </div>

            {/* Operations Hub Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3.5 text-sm font-bold transition-all relative shrink-0 cursor-pointer ${
                                activeTab === tab.id
                                    ? 'text-[#2563eb]'
                                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#2563eb] rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENT: MENTORS or JUDGES */}
            {(activeTab === 'mentors' || activeTab === 'judges') && (
                <div className="space-y-4">
                    {/* Action Bar: Search Input & Invite Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder={activeTab === 'mentors' ? "Search mentors..." : "Search judges..."}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all shadow-xs"
                            />
                        </div>

                        {/* Invite Button */}
                        <button
                            onClick={() => setInviteModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-sm font-bold shadow-sm transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>{activeTab === 'mentors' ? 'Invite Mentor' : 'Invite Judge'}</span>
                        </button>
                    </div>

                    {/* Table Card */}
                    <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        <th className="py-3.5 px-6">Name</th>
                                        <th className="py-3.5 px-6">Expertise</th>
                                        <th className="py-3.5 px-6">Assigned Teams</th>
                                        <th className="py-3.5 px-6">Availability</th>
                                        <th className="py-3.5 px-6">Status</th>
                                        <th className="py-3.5 px-6 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500">
                                                <div className="inline-block w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <p className="text-xs">Loading directory records...</p>
                                            </td>
                                        </tr>
                                    ) : directory.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500">
                                                <p className="text-sm font-medium">No {activeTab} matching your search.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        directory.map((item) => {
                                            const isActive = (item.status || 'Active').toLowerCase() === 'active';
                                            const initials = item.name
                                                ? item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                                : 'EX';

                                            return (
                                                <tr 
                                                    key={item.id}
                                                    className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors group"
                                                >
                                                    {/* Name & Email */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            {item.avatar ? (
                                                                <img
                                                                    src={item.avatar}
                                                                    alt={item.name}
                                                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-white/10 shrink-0"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-300 font-bold text-xs flex items-center justify-center ring-2 ring-slate-100 dark:ring-white/10 shrink-0">
                                                                    {initials}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                                                                    {item.name}
                                                                </h4>
                                                                <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 block">
                                                                    {item.email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Expertise */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                            {item.expertise || 'General Tech'}
                                                        </span>
                                                    </td>

                                                    {/* Assigned Teams */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                                            {item.assignedTeams === 1 ? '1 Team' : `${item.assignedTeams ?? 0} Teams`}
                                                        </span>
                                                    </td>

                                                    {/* Availability */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="text-xs text-slate-600 dark:text-slate-400">
                                                            {item.availability || '10 hrs/week'}
                                                        </span>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        {isActive ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#2563eb] border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] dark:bg-white/10 dark:text-gray-300 dark:border-white/10">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Action Button */}
                                                    <td className="py-4 px-6 whitespace-nowrap text-center">
                                                        <button
                                                            onClick={() => {
                                                                setAssignModalExpert(item);
                                                                setAssignedTeamsCount(item.assignedTeams || 0);
                                                            }}
                                                            className="w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-500 hover:text-[#2563eb] hover:bg-blue-50/70 dark:text-slate-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/40 transition-all cursor-pointer active:scale-95"
                                                            title="Adjust assigned teams"
                                                        >
                                                            <UserPlus className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Showing {directory.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} entries
                            </span>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                                >
                                    Previous
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => setCurrentPage(num)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            currentPage === num
                                                ? 'bg-[#2563eb] text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
                                        }`}
                                    >
                                        {num}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SUBMISSIONS */}
            {activeTab === 'submissions' && (
                <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-8 shadow-xs text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-[#2563eb] flex items-center justify-center">
                        <FileText className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submissions Management</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                            Inspect code deliverables, originality scores, and preview repository demos submitted by participants.
                        </p>
                    </div>
                    <div className="pt-2">
                        <button
                            onClick={() => navigate('/organizer/submissions')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                            <span>Open Dedicated Submissions Panel</span>
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: EVALUATION */}
            {activeTab === 'evaluation' && (
                <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-8 shadow-xs text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-[#2563eb] flex items-center justify-center">
                        <Sliders className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Live Evaluation & Scoring</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                            Configure rubrics, monitor judge scoring consensus, and track submission shortlist recommendations.
                        </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                            onClick={() => navigate('/organizer/evaluation/criteria')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            <span>Edit Evaluation Rubric</span>
                        </button>
                        <button
                            onClick={() => navigate('/organizer/evaluation-panel')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                            <span>Launch Scoring Hub</span>
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: RESULTS */}
            {activeTab === 'results' && (
                <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-8 shadow-xs text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center">
                        <Award className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Results & Winners Publication</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                            Publish final leaderboard standings, prize distributions, and award announcements.
                        </p>
                    </div>
                    <div className="pt-2">
                        <button
                            onClick={() => navigate('/organizer/results')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                            <span>Manage Published Results</span>
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CERTIFICATES */}
            {activeTab === 'certificates' && (
                <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-8 shadow-xs text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Certificates & Credentials</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                            Generate and batch dispatch cryptographically signed completion and excellence certificates.
                        </p>
                    </div>
                    <div className="pt-2">
                        <button
                            onClick={() => navigate('/organizer/results')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                            <span>Certificate Issuance Hub</span>
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* INVITE MODAL */}
            {inviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-navy-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Invite {activeTab === 'judges' ? 'Judge' : 'Mentor'}
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                    Send an onboarding email and grant operations privileges.
                                </p>
                            </div>
                            <button
                                onClick={() => setInviteModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSendInvite} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    placeholder="e.g. Dr. Jane Smith"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="jane.smith@example.com"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Expertise Track
                                    </label>
                                    <select
                                        value={inviteExpertise}
                                        onChange={(e) => setInviteExpertise(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb]"
                                    >
                                        <option value="AI & ML">AI & ML</option>
                                        <option value="Web3">Web3</option>
                                        <option value="FinTech">FinTech</option>
                                        <option value="UI/UX Design">UI/UX Design</option>
                                        <option value="Cloud Architecture">Cloud Architecture</option>
                                        <option value="Cybersecurity">Cybersecurity</option>
                                        <option value="Product Management">Product Management</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Availability
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteAvailability}
                                        onChange={(e) => setInviteAvailability(e.target.value)}
                                        placeholder="10 hrs/week"
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setInviteModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingInvite}
                                    className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmittingInvite ? 'Sending...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TEAM ASSIGNMENT MODAL */}
            {assignModalExpert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-navy-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Assign Teams: {assignModalExpert.name}
                            </h3>
                            <button
                                onClick={() => setAssignModalExpert(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Allocate or adjust the number of active project teams assigned to this expert.
                        </p>

                        <div className="flex items-center justify-center gap-4 py-3">
                            <button
                                type="button"
                                onClick={() => setAssignedTeamsCount(c => Math.max(0, c - 1))}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white font-bold text-lg flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            >
                                -
                            </button>
                            <span className="text-3xl font-extrabold text-[#2563eb]">
                                {assignedTeamsCount}
                            </span>
                            <button
                                type="button"
                                onClick={() => setAssignedTeamsCount(c => c + 1)}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white font-bold text-lg flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            >
                                +
                            </button>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setAssignModalExpert(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAssignment}
                                className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
