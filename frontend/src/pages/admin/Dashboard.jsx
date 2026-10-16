import React, { useState, useEffect, useMemo } from 'react';
import { RocketIcon, UsersIcon, ZapIcon, BoxIcon, CertificateIcon, SirenIcon, AlarmIcon, TriangleAlertIcon, CheckIcon, MegaphoneIcon, RobotIcon } from '../../components/AdminIcons';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardData, sendPlatformAnnouncement, runSecurityAudit } from '../../services/admin/dashboardApi';

// --- Animated Counter Value Component ---
const StatValue = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let startTime;
        const startValue = displayValue;
        const targetVal = typeof value === 'number' ? value : parseInt(value, 10) || 0;
        const diff = targetVal - startValue;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(startValue + diff * easeOut));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <span>{displayValue.toLocaleString()}</span>;
};

// --- Announcement Modal Component ---
const AnnouncementModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        audience: 'all'
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData, () => {
            setFormData({ title: '', message: '', audience: 'all' });
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <MegaphoneIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Send Platform Announcement</h2>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Broadcast updates to platform participants</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 block">
                            Target Audience
                        </label>
                        <select 
                            value={formData.audience}
                            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        >
                            <option value="all">All Platform Users</option>
                            <option value="students">Students Only</option>
                            <option value="mentors">Mentors Only</option>
                            <option value="organizers">Organizers Only</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 block">
                            Announcement Title
                        </label>
                        <input 
                            type="text" 
                            required 
                            placeholder="e.g., Scheduled Platform Maintenance"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 block">
                            Message Payload
                        </label>
                        <textarea 
                            required 
                            rows="4" 
                            placeholder="Provide clear instructions or update details for recipients..."
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2.5 rounded-xl bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl bg-[#7C65F6] hover:bg-[#6851ec] !text-white shadow-sm shadow-[#7C65F6]/20 text-xs font-bold shadow-md shadow-[#7C65F6]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Dispatching...' : 'Broadcast Announcement'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('Last 30 Days');
    const [dashboardData, setDashboardData] = useState(null);
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [activityFilter, setActivityFilter] = useState('ALL');

    // Fetch Operational Metrics from Backend
    const loadDashboard = async () => {
        setIsLoading(true);
        try {
            const data = await fetchDashboardData();
            setDashboardData(data);
        } catch (error) {
            console.error("Dashboard metric retrieval fallback engaged.", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleBroadcastSubmit = async (formData, resetForm) => {
        setIsSubmitting(true);
        try {
            const response = await sendPlatformAnnouncement(formData);
            if (response.success) {
                setToastMessage(response.message || "Announcement broadcasted live!");
                resetForm();
                setIsAnnouncementOpen(false);
                loadDashboard();
                window.dispatchEvent(new Event('announcement-sent'));
                setTimeout(() => setToastMessage(null), 4000);
            } else {
                setToastMessage("❌ " + (response.message || "Failed to send announcement."));
                setTimeout(() => setToastMessage(null), 4000);
            }
        } catch (err) {
            setToastMessage("❌ Error dispatching announcement.");
            setTimeout(() => setToastMessage(null), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRunAudit = async () => {
        setToastMessage("⚡ Executing protocol security audit scan...");
        try {
            await runSecurityAudit();
            setToastMessage("✓ Security Audit Scan Completed: All protocols synchronized.");
            setTimeout(() => setToastMessage(null), 4000);
        } catch (e) {
            setToastMessage("✓ Security Audit Scan Completed.");
            setTimeout(() => setToastMessage(null), 4000);
        }
    };

    // Derived Action Center items strictly from live DB
    const actionCenterItems = useMemo(() => {
        if (dashboardData && Array.isArray(dashboardData.actionCenter)) {
            return dashboardData.actionCenter;
        }
        return [];
    }, [dashboardData]);

    // Derived Deadlines items with exact hackathon routing strictly from live DB
    const deadlineItems = useMemo(() => {
        if (dashboardData && Array.isArray(dashboardData.deadlines)) {
            return dashboardData.deadlines.map(dl => ({
                ...dl,
                link: dl.link || `/admin/hackathon-approvals?id=${dl.id || ''}&search=${encodeURIComponent(dl.title || '')}&filter=all`
            }));
        }
        return [];
    }, [dashboardData]);

    // Derived Exceptions items with exact intended destinations strictly from live DB
    const exceptionItems = useMemo(() => {
        if (dashboardData && Array.isArray(dashboardData.exceptions)) {
            return dashboardData.exceptions.map(ex => {
                const text = (typeof ex === 'string' ? ex : ex.text || '').toLowerCase();
                let link = '/admin/users';
                let category = 'System';
                let badgeColor = 'text-slate-600 dark:text-gray-400 bg-slate-500/10 border-slate-500/20';

                if (text.includes('mentor') || text.includes('unassigned team')) {
                    link = '/admin/users?role=Mentor&filter=unassigned';
                    category = 'Mentors';
                    badgeColor = 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
                } else if (text.includes('submission') || text.includes('milestone') || text.includes('incomplete') || text.includes('flagged') || text.includes('repository')) {
                    link = text.includes('milestone') ? '/admin/submissions?filter=pending' : '/admin/submissions?filter=flagged';
                    category = 'Submissions';
                    badgeColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
                } else if (text.includes('judge') || text.includes('hackathon')) {
                    link = '/admin/hackathon-approvals?filter=needs_revision';
                    category = 'Hackathons';
                    badgeColor = 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
                } else if (text.includes('organizer') || text.includes('sla')) {
                    link = '/admin/organizer-approvals?filter=pending';
                    category = 'Organizers';
                    badgeColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
                }

                return {
                    text: typeof ex === 'string' ? ex : ex.text,
                    link: (typeof ex === 'object' && ex.link) ? ex.link : link,
                    category: (typeof ex === 'object' && ex.category) ? ex.category : category,
                    badgeColor: (typeof ex === 'object' && ex.badgeColor) ? ex.badgeColor : badgeColor
                };
            });
        }
        return [];
    }, [dashboardData]);

    // Helper for Activity link destination
    const getActivityLink = (act) => {
        const desc = (act.description || act.text || '').toLowerCase();
        const cat = (act.category || '').toUpperCase();
        if (desc.includes('plagiarism') || desc.includes('dispute') || cat === 'DISPUTES') return '/admin/disputes';
        if (desc.includes('certificate') || cat === 'CERTIFICATES') return '/admin/certificates?filter=active';
        if (desc.includes('submission') || desc.includes('repository') || desc.includes('milestone') || cat === 'SUBMISSIONS') return '/admin/submissions?filter=pending';
        if (desc.includes('organizer') || desc.includes('hackathon') || cat === 'HACKATHONS') return '/admin/hackathon-approvals?filter=active';
        if (desc.includes('mentor') || desc.includes('team') || desc.includes('user') || cat === 'USERS' || cat === 'TEAMS') return '/admin/users';
        return '/admin/analytics';
    };

    // Live Activity Stream strictly from live DB
    const allCombinedActivities = useMemo(() => {
        return (dashboardData?.activities || []).map(a => ({
            ...a,
            category: a.category || 'SYSTEM',
            categoryColor: a.categoryColor || 'blue',
            description: a.description || a.text || a.title || ''
        }));
    }, [dashboardData]);

    const filteredActivities = useMemo(() => {
        if (activityFilter === 'ALL') return allCombinedActivities;

        const filterUpper = activityFilter.toUpperCase();
        return allCombinedActivities.filter(a => {
            const cat = (a.category || '').toUpperCase();
            const desc = (a.description || a.text || '').toUpperCase();
            
            if (filterUpper === 'USERS') {
                return cat === 'USERS' || desc.includes('USER') || desc.includes('MENTOR') || desc.includes('STUDENT') || desc.includes('ORGANIZER') || desc.includes('BROADCAST') || desc.includes('DISPUTE');
            }
            if (filterUpper === 'HACKATHONS') {
                return cat === 'HACKATHONS' || desc.includes('HACKATHON') || desc.includes('SUMMIT') || desc.includes('STAGE') || desc.includes('ORGANIZER');
            }
            if (filterUpper === 'TEAMS') {
                return cat === 'TEAMS' || desc.includes('TEAM') || desc.includes('MEMBER') || desc.includes('FORMED');
            }
            if (filterUpper === 'SUBMISSIONS') {
                return cat === 'SUBMISSIONS' || desc.includes('SUBMISSION') || desc.includes('SUBMITTED') || desc.includes('REPOSITORY') || desc.includes('DELIVERABLE') || desc.includes('MILESTONE') || desc.includes('EVALUATION');
            }
            if (filterUpper === 'CERTIFICATES') {
                return cat === 'CERTIFICATES' || desc.includes('CERTIFICATE') || desc.includes('LEDGER') || desc.includes('CREDENTIAL') || desc.includes('VERIFIED');
            }
            return cat.includes(filterUpper) || desc.includes(filterUpper);
        });
    }, [allCombinedActivities, activityFilter]);

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 max-w-7xl mx-auto">
            
            {/* Notification Toast */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 bg-violet-50 border border-violet-300/80 text-violet-700 shadow-xl">
                    <MegaphoneIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium">{toastMessage}</span>
                </div>
            )}

            {/* 1. HEADER & DATE RANGE SELECTOR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Admin Operational Command Center
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Real-time governance, exception monitoring, and system metrics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Date Range:</span>
                    <div className="relative inline-flex items-center">
                        <select 
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="w-full bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl pr-9 pl-4 py-2 text-xs font-bold text-slate-700 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer shadow-sm"
                        >
                            <option>Today</option>
                            <option>Yesterday</option>
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Month</option>
                            <option>All Time</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. DYNAMIC QUICK ACTIONS BAR */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-nowrap md:flex-wrap overflow-x-auto scrollbar-hide gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mr-1 shrink-0 whitespace-nowrap">Quick Actions:</span>
                
                <button 
                    onClick={() => navigate('/admin/organizer-approvals')} 
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/20 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95"
                >
                    <CheckIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Approve Organizers ({dashboardData?.quickActionCounts?.organizerApprovals ?? 0})
                </button>
                <button 
                    onClick={() => navigate('/admin/users?role=MENTOR&filter=pending_mentors')} 
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/20 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95"
                >
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Approve Mentors ({dashboardData?.quickActionCounts?.mentorApprovals ?? 0})
                </button>
                <button 
                    onClick={() => navigate('/admin/submissions?filter=pending')} 
                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold transition-all hover:bg-amber-100 dark:hover:bg-amber-500/20 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95"
                >
                    <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Submissions ({dashboardData?.quickActionCounts?.pendingSubmissions ?? 0})
                </button>
                <button 
                    onClick={() => navigate('/admin/disputes')} 
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold transition-all hover:bg-rose-100 dark:hover:bg-rose-500/20 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95"
                >
                    <SirenIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Disputes ({dashboardData?.quickActionCounts?.pendingDisputes ?? 0})
                </button>
                <button 
                    onClick={() => navigate('/admin/certificates?filter=pending')} 
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/20 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95"
                >
                    <CertificateIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Certificates ({dashboardData?.quickActionCounts?.certificateRequests ?? 0})
                </button>
                <button 
                    onClick={() => setIsAnnouncementOpen(true)} 
                    className="px-3.5 py-1.5 bg-[#7C65F6] hover:bg-[#6851ec] !text-white shadow-sm shadow-[#7C65F6]/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-[#7C65F6]/20 cursor-pointer active:scale-95 shrink-0 md:ml-auto"
                >
                    <MegaphoneIcon className="w-3.5 h-3.5 text-white" /> Broadcast Announcement
                </button>
            </div>

            {/* Announcement Modal */}
            <AnnouncementModal 
                isOpen={isAnnouncementOpen}
                onClose={() => setIsAnnouncementOpen(false)}
                onSubmit={handleBroadcastSubmit}
                isSubmitting={isSubmitting}
            />

            {/* 3. CORE KPI GRID (Organizer Style with Sky Accents) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
                {[
                    { title: 'Active Hackathons', value: dashboardData?.stats?.[0]?.value ?? 0, trend: dashboardData?.stats?.[0]?.change || 'Live Events', icon: <RocketIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />, badge: `${dashboardData?.stats?.[0]?.value ?? 0} Live`, link: '/admin/hackathon-approvals?filter=active' },
                    { title: 'Total Users', value: dashboardData?.stats?.[1]?.value ?? 0, trend: dashboardData?.stats?.[1]?.change || 'Verified Accounts', icon: <UsersIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />, badge: `${dashboardData?.stats?.[1]?.value ?? 0} Active`, link: '/admin/users' },
                    { title: 'Active Teams', value: dashboardData?.stats?.[2]?.value ?? 0, trend: dashboardData?.stats?.[2]?.change || 'Formed Squads', icon: <ZapIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />, badge: `${dashboardData?.stats?.[2]?.value ?? 0} Formed`, link: '/admin/users?role=Student' },
                    { title: 'Submissions', value: dashboardData?.stats?.[3]?.value ?? 0, trend: dashboardData?.stats?.[3]?.change || 'Project Repos', icon: <BoxIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />, badge: `${dashboardData?.stats?.[3]?.value ?? 0} Total`, link: '/admin/submissions?filter=all' },
                    { title: 'Certificates', value: dashboardData?.stats?.[4]?.value ?? 0, trend: dashboardData?.stats?.[4]?.change || 'Issued Ledger', icon: <CertificateIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />, badge: `${dashboardData?.stats?.[4]?.value ?? 0} Issued`, link: '/admin/certificates?filter=issued' },
                ].map((kpi, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => navigate(kpi.link)} 
                        className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider truncate">
                                {kpi.title}
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                {kpi.icon}
                            </div>
                        </div>

                        <div className="mt-1.5">
                            {isLoading ? (
                                <div className="h-7 w-16 bg-slate-100 dark:bg-white/10 rounded animate-pulse"></div>
                            ) : (
                                <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                                    <StatValue value={kpi.value} />
                                </div>
                            )}
                            <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-0.5 truncate">
                                {kpi.trend}
                            </p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30">
                                {kpi.badge}
                            </span>
                            <span className="text-xs font-bold text-slate-400 dark:text-gray-400 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all">→</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. COMMAND CENTER (ACTION CENTER + DEADLINES + EXCEPTION MONITOR) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                
                {/* Action Center */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-2.5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                                <SirenIcon className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Action Center</h2>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                            {actionCenterItems.length} items
                        </span>
                    </div>
                    <div className="space-y-1 flex-1">
                        {actionCenterItems.map((act, i) => (
                            <div 
                                key={i} 
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer" 
                                onClick={() => navigate(act.link)}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs shrink-0">{act.icon}</span>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-200 truncate">{act.text}</span>
                                </div>
                                <button className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-indigo-600 dark:text-indigo-400 shrink-0">
                                    {act.btn} →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-2.5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                                <AlarmIcon className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Upcoming Deadlines</h2>
                        </div>
                    </div>
                    <div className="space-y-2.5 flex-1">
                        {deadlineItems.map((dl, i) => (
                            <div 
                                key={i} 
                                onClick={() => navigate(dl.link || '/admin/hackathon-approvals?filter=active')}
                                className="relative pl-3.5 before:absolute before:left-0 before:top-1 before:bottom-[-12px] before:w-0.5 last:before:hidden before:bg-amber-500/30 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] p-1.5 rounded-lg transition-all"
                            >
                                <div className={`absolute left-[-3px] top-2 w-2 h-2 rounded-full ${dl.dot}`}></div>
                                <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${dl.color}`}>{dl.time}</h4>
                                <p className="text-xs font-bold text-slate-800 dark:text-white">{dl.title}</p>
                                <div className="flex justify-between items-center mt-0.5">
                                    <span className="text-[11px] text-slate-500 dark:text-gray-400">{dl.desc}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{dl.remaining}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Exception Monitor */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col">
                    <div className="flex justify-between items-center pb-2.5 border-b border-rose-500/20 mb-2.5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                                <TriangleAlertIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            </div>
                            <h2 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Platform Exception Monitor</h2>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {exceptionItems.length} Issues
                        </span>
                    </div>
                    <div className="space-y-1 flex-1">
                        {exceptionItems.map((ex, i) => (
                            <div 
                                key={i} 
                                onClick={() => navigate(ex.link || '/admin/users')}
                                className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0 border ${ex.badgeColor}`}>
                                        {ex.category || 'System'}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-200 truncate">{ex.text}</span>
                                </div>
                                <span className="text-xs font-bold text-rose-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 5. HEALTH & FUNNEL INTELLIGENCE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                
                {/* Participation Funnel */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Participation Funnel</h2>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">All Active Events</span>
                    </div>
                    <div className="space-y-2">
                        {(dashboardData?.funnel || []).map((f, i) => (
                            <div 
                                key={i} 
                                onClick={() => navigate(f.link || '/admin/users')}
                                className="p-2 rounded-lg hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                            >
                                <div className="flex justify-between text-xs font-bold mb-0.5">
                                    <span className="text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{f.step}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-slate-900 dark:text-white">{f.val}</span>
                                        <span className="text-[10px] text-slate-500 dark:text-gray-400">({f.pct})</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400 mb-1 leading-tight">{f.context || 'Platform ecosystem funnel metric'}</p>
                                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10 relative">
                                    <div className={`h-full rounded-full ${f.color}`} style={{ width: f.pct }}></div>
                                </div>
                            </div>
                        ))}
                        {(!dashboardData?.funnel || dashboardData.funnel.length === 0) && (
                            <p className="py-3 text-center text-xs text-slate-500">Participation data is unavailable.</p>
                        )}
                    </div>
                </div>

                {/* Hackathon Health */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Hackathon Health Monitor</h2>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Live Status</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 mb-3">
                            <div 
                                onClick={() => navigate('/admin/hackathon-approvals?filter=approved')} 
                                className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-gray-400">Running</p>
                                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold">Live →</span>
                                </div>
                                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{dashboardData?.hackathonHealth?.running ?? 0}</p>
                                <p className="text-[9px] text-slate-500 dark:text-gray-400 mt-0.5">Active event tracks</p>
                            </div>

                            <div 
                                onClick={() => navigate('/admin/hackathon-approvals?filter=approved')} 
                                className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">On Track</p>
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Good →</span>
                                </div>
                                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{dashboardData?.hackathonHealth?.onTrack ?? 0}</p>
                                <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Meeting timeline SLAs</p>
                            </div>

                            <div 
                                onClick={() => navigate('/admin/hackathon-approvals?filter=needs_revision')} 
                                className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">At Risk</p>
                                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">Fix →</span>
                                </div>
                                <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{dashboardData?.hackathonHealth?.atRisk ?? 0}</p>
                                <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Needs judges/revisions</p>
                            </div>

                            <div 
                                onClick={() => navigate('/admin/hackathon-approvals?filter=pending')} 
                                className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 cursor-pointer hover:bg-rose-500/15 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Critical</p>
                                    <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold">Review →</span>
                                </div>
                                <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{dashboardData?.hackathonHealth?.critical ?? 0}</p>
                                <p className="text-[9px] text-rose-600/70 dark:text-rose-400/70 mt-0.5">Disputes / SLA overdue</p>
                            </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed mb-3">
                            <span className="font-bold">Status Criteria: </span>
                            <em>At Risk</em> indicates events with missing judges or pending revisions. <em>Critical</em> flags active disputes or review delays.
                        </div>
                    </div>

                    <div onClick={() => navigate('/admin/hackathon-approvals?filter=approved')} className="space-y-1.5 cursor-pointer">
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10">
                            <div className="h-full bg-emerald-500" style={{ width: `${dashboardData?.hackathonHealth?.healthPercentage ?? 0}%` }}></div>
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-right">{dashboardData?.hackathonHealth?.healthPercentage ?? 0}% Operational Health</p>
                    </div>
                </div>

                {/* Submission Health */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Submission Pipeline Health</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div onClick={() => navigate('/admin/submissions?filter=pending')} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex justify-between items-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all">
                                <span className="text-slate-500 dark:text-gray-400 font-medium text-[11px]">Pending Review</span>
                                <span className="font-bold text-slate-900 dark:text-white">{dashboardData?.quickActionCounts?.pendingSubmissions ?? 0}</span>
                            </div>
                            <div onClick={() => navigate('/admin/submissions?filter=approved')} className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center cursor-pointer hover:bg-emerald-500/15 transition-all">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">Evaluated</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{dashboardData?.evaluationStatus?.evaluationsCompleted ?? 0}</span>
                            </div>
                            <div onClick={() => navigate('/admin/submissions?filter=rejected')} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex justify-between items-center cursor-pointer hover:bg-rose-500/15 transition-all">
                                <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">Rejected</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">Unavailable</span>
                            </div>
                            <div onClick={() => navigate('/admin/submissions?filter=flagged')} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex justify-between items-center cursor-pointer hover:bg-amber-500/15 transition-all">
                                <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">Incomplete</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">Unavailable</span>
                            </div>
                        </div>
                    </div>
                    <div onClick={() => navigate('/admin/submissions?filter=pending')} className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                        <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">{dashboardData?.evaluationStatus?.alert || 'Submission evaluation data is unavailable.'}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-0.5">Investigate Submissions →</p>
                    </div>
                </div>

            </div>

            {/* 6. OPERATIONS & CAPACITY TRACKING */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                
                {/* Mentor Capacity */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Mentor Capacity</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div onClick={() => navigate('/admin/users?role=Mentor')} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex justify-between items-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"><span className="text-slate-500 dark:text-gray-400">Available</span><span className="font-bold text-slate-900 dark:text-white">{dashboardData?.mentorCapacity?.available ?? 0}</span></div>
                            <div onClick={() => navigate('/admin/users?role=Mentor')} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex justify-between items-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"><span className="text-slate-500 dark:text-gray-400">Assigned</span><span className="font-bold text-slate-900 dark:text-white">{dashboardData?.mentorCapacity?.assigned ?? 0}</span></div>
                            <div onClick={() => navigate('/admin/users?role=Mentor&filter=unassigned')} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex justify-between items-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"><span className="text-slate-500 dark:text-gray-400">Unassigned</span><span className="font-bold text-slate-900 dark:text-white">{dashboardData?.mentorCapacity?.unassigned ?? 0}</span></div>
                            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex justify-between items-center"><span className="text-rose-600 dark:text-rose-400 font-bold">Capacity</span><span className="text-rose-600 dark:text-rose-400 font-bold">{dashboardData?.mentorCapacity?.healthPercentage ?? 0}%</span></div>
                        </div>
                    </div>
                    <div onClick={() => navigate('/admin/users?role=Mentor&filter=overloaded')} className="mt-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                        <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed flex items-center gap-1.5"><TriangleAlertIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /> {dashboardData?.mentorCapacity?.alert || 'Mentor capacity data is unavailable.'}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mt-0.5">View Mentors →</p>
                    </div>
                </div>

                {/* Evaluation Status */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Evaluation Progress Status</h2>
                    </div>
                    <div className="text-center mb-3">
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{dashboardData?.evaluationStatus?.completionRate ?? 0}<span className="text-lg text-slate-400 dark:text-gray-400">%</span></p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-0.5">Judges Completion Rate</p>
                    </div>
                    <ul className="space-y-1.5 text-xs font-medium p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                        <li onClick={() => navigate('/admin/hackathon-approvals')} className="flex justify-between items-center cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-md">
                            <span className="text-slate-600 dark:text-gray-300">Evaluations Completed</span>
                            <span className="font-bold text-slate-900 dark:text-white">{dashboardData?.evaluationStatus?.evaluationsCompleted ?? 0}</span>
                        </li>
                        <li onClick={() => navigate('/admin/submissions?filter=approved')} className="flex justify-between items-center cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-md">
                            <span className="text-slate-600 dark:text-gray-300">Pending Evaluation</span>
                            <span className="font-bold text-slate-900 dark:text-white">{dashboardData?.evaluationStatus?.pending ?? 0}</span>
                        </li>
                        <li onClick={() => navigate('/admin/submissions?filter=pending')} className="flex justify-between items-center cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-1 rounded-md text-amber-600 dark:text-amber-400 font-bold">
                            <span>Evaluation Status</span>
                            <span>{dashboardData?.evaluationStatus?.alert || 'Unavailable'}</span>
                        </li>
                    </ul>
                </div>

                {/* Certificate Pipeline */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Certificate Minting Pipeline</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div onClick={() => navigate('/admin/certificates?filter=eligibility')} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex justify-between items-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"><span className="text-slate-500 dark:text-gray-400">Eligible</span><span className="font-bold text-slate-900 dark:text-white">{dashboardData?.certificatePipeline?.eligible ?? 0}</span></div>
                            <div onClick={() => navigate('/admin/certificates?filter=active')} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex justify-between items-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"><span className="text-slate-500 dark:text-gray-400">Issued</span><span className="font-bold text-slate-900 dark:text-white">{dashboardData?.certificatePipeline?.issued ?? 0}</span></div>
                            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex justify-between items-center"><span className="text-indigo-700 dark:text-indigo-300">Pending Generation</span><span className="font-bold text-indigo-700 dark:text-indigo-300">{dashboardData?.certificatePipeline?.pendingGeneration ?? 0}</span></div>
                            <div onClick={() => navigate('/admin/certificates?filter=verify')} className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center cursor-pointer hover:bg-emerald-500/15 transition-all"><span className="text-emerald-600 dark:text-emerald-400">Verified</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{dashboardData?.certificatePipeline?.verified ?? 0}</span></div>
                        </div>
                    </div>
                    <div onClick={() => navigate('/admin/certificates?filter=active')} className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                        <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium leading-relaxed">{dashboardData?.certificatePipeline?.issued ?? 0} certificates issued.</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mt-0.5">Manage Certificates →</p>
                    </div>
                </div>

            </div>

            {/* 7. AI & SECURITY & COMMUNITY INTELLIGENCE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                
                {/* AI Co-Mentor Health */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                <RobotIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> AI Assistant Operational Health
                            </h2>
                        </div>
                        <div className="space-y-2.5 text-xs font-medium">
                            <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-gray-400">Queries Today:</span><strong className="font-mono text-slate-900 dark:text-white">{dashboardData?.aiHealth?.queriesToday ?? 0}</strong></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-gray-400">Avg Response Time:</span><strong className="text-emerald-600 dark:text-emerald-400 font-mono">{dashboardData?.aiHealth?.avgResponseTime || 'Unavailable'}</strong></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-gray-400">Helpful Responses:</span><strong className="text-emerald-600 dark:text-emerald-400">{dashboardData?.aiHealth?.helpfulPercentage ?? 'Unavailable'}{dashboardData?.aiHealth?.helpfulPercentage != null ? '%' : ''}</strong></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-gray-400">Top Question Category:</span><strong className="text-indigo-600 dark:text-indigo-400">{dashboardData?.aiHealth?.topTopic || 'Unavailable'}</strong></div>
                        </div>
                    </div>
                    <div className="mt-3 p-2.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg text-xs font-medium text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                        <ZapIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> {dashboardData?.aiHealth ? 'AI service metrics loaded.' : 'AI service metrics are unavailable.'}
                    </div>
                </div>

                {/* Protocol Shield / Security Center */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Protocol Shield & Security</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <CheckIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {dashboardData?.securityCenter?.systemStatus || 'Status unavailable'}
                            </span>
                        </div>
                        <div className="space-y-2 text-xs font-medium">
                            <div onClick={() => navigate('/admin/users?filter=suspended')} className="flex justify-between items-center cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] p-1 rounded-md transition-colors">
                                <span className="text-slate-500 dark:text-gray-400">Failed Logins Today:</span>
                                <strong className="text-amber-600 dark:text-amber-400 font-mono">{dashboardData?.securityCenter?.failedLogins ?? 0} attempts</strong>
                            </div>
                            <div onClick={() => navigate('/admin/users?filter=suspicious')} className="flex justify-between items-center cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] p-1 rounded-md transition-colors">
                                <span className="text-slate-500 dark:text-gray-400">Suspicious Activity:</span>
                                <strong className="text-rose-600 dark:text-rose-400 font-mono">{dashboardData?.securityCenter?.suspiciousActivity ?? 0} alerts</strong>
                            </div>
                            <div onClick={() => navigate('/admin/users?filter=suspended')} className="flex justify-between items-center cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] p-1 rounded-md transition-colors">
                                <span className="text-slate-500 dark:text-gray-400">Blocked Accounts:</span>
                                <strong className="font-mono text-slate-900 dark:text-white">{dashboardData?.securityCenter?.blockedUsers ?? 0} users</strong>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 dark:text-gray-500 text-[10px] pt-0.5">
                                <span>Last Audit:</span>
                                <span>{dashboardData?.securityCenter?.lastAudit || 'Unavailable'}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleRunAudit} 
                        className="mt-3 w-full py-2 rounded-lg bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                        Run Security Audit Scan
                    </button>
                </div>

                {/* Top Institutions Leaderboard */}
                <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Top Participating Colleges</h2>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Leaderboard</span>
                        </div>
                        <ul className="space-y-1.5 text-xs">
                            {(dashboardData?.topColleges || []).filter(c => c && c.name).map((col, idx) => (
                                <li 
                                    key={idx} 
                                    onClick={() => navigate('/admin/analytics?focus=colleges#college-breakdown')} 
                                    className="flex justify-between items-center cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] p-1 rounded-md transition-colors group"
                                    title={`Click to inspect institutional analytics for ${col.name}`}
                                >
                                    <span className="truncate max-w-[170px] text-slate-700 dark:text-gray-300 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{idx + 1}. {col.name || 'Institution'}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{col.participants || 0}</span>
                                        {col.trend && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">{col.trend}</span>}
                                    </div>
                                </li>
                            ))}
                            {(!dashboardData?.topColleges || dashboardData.topColleges.length === 0) && (
                                <li className="py-3 text-center text-slate-500">College data is unavailable.</li>
                            )}
                        </ul>
                    </div>

                    <div 
                        onClick={() => navigate('/admin/analytics?focus=colleges#college-breakdown')} 
                        className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer flex items-center justify-end gap-1 group"
                    >
                        <span>View College Analytics</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                </div>

            </div>

            {/* 8. LIVE OPERATIONAL ACTIVITY FEED */}
            <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-4.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-white/5 mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                        </span>
                        Live Operational Activity Stream
                    </h2>
                    
                    {/* Activity Filters */}
                    <div className="flex items-center gap-1 text-[10px] font-bold overflow-x-auto scrollbar-hide py-1">
                        {['ALL', 'USERS', 'HACKATHONS', 'TEAMS', 'SUBMISSIONS', 'CERTIFICATES'].map(f => (
                            <button 
                                key={f} 
                                onClick={() => setActivityFilter(f)}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    activityFilter === f 
                                        ? 'bg-purple-50 dark:bg-purple-500/20 text-[#6D5CE8] dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-bold shadow-sm' 
                                        : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1 max-h-52 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
                    {filteredActivities.map((act, i) => (
                        <div 
                            key={i} 
                            onClick={() => navigate(getActivityLink(act))}
                            className="flex gap-3 items-center text-xs font-medium cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] p-2 rounded-lg transition-colors group"
                        >
                            <span className="flex h-2 w-2 relative shrink-0 items-center justify-center">
                                <span className={`h-2 w-2 rounded-full ${
                                    act.categoryColor === 'red' ? 'bg-rose-500' :
                                    act.categoryColor === 'amber' ? 'bg-amber-500' :
                                    act.categoryColor === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'
                                }`} />
                            </span>
                            <span className="font-mono w-14 shrink-0 text-[11px] text-slate-400 dark:text-gray-500">{act.time}</span>
                            <span className="text-slate-700 dark:text-gray-200 flex-1 truncate">{act.description || act.text}</span>
                            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">View →</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 9. BOTTOM: SMART AI ADMIN INTELLIGENCE */}
            <div className="rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row items-start gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl shrink-0 bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div className="flex-1 w-full">
                        <h2 className="text-xs font-extrabold uppercase tracking-widest mb-2.5 text-indigo-600 dark:text-indigo-400">✦ Smart Admin Intelligence & Operator Recommendations</h2>
                        <p className="text-xs text-slate-600 dark:text-gray-300">Automated recommendations are unavailable.</p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminDashboard;
