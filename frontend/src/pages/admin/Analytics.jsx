import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileTextIcon, ExcelSheetIcon, PrinterIcon, UsersIcon, RocketIcon, FlagIcon, TriangleAlertIcon, ShieldIcon, BoxIcon, CertificateIcon, ZapIcon, ToolsIcon, TeacherIcon, RobotIcon, StarIcon, LockIcon, SirenIcon } from '../../components/AdminIcons';
import { 
    LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { fetchDashboardData, performGlobalSearch } from '../../services/admin/dashboardApi';
import { 
    fetchAnalyticsOverview,
    fetchUserAnalytics,
    fetchRegistrationTrend,
    fetchHackathonAnalytics,
    fetchTeamsSubmissionsAnalytics,
    fetchMentorsJudgesAnalytics,
    fetchAiCertificatesAnalytics,
    fetchSecurityPerformanceAnalytics,
    fetchSmartAiInsights,
    exportAnalyticsPdf,
    exportAnalyticsExcel
} from '../../services/admin/analyticsApi';
import { useTheme } from '../../context/ThemeContext';

// --- EMPTY STATE COMPONENT ---
const EmptyAnalyticsState = ({ title = "No Analytics Data Recorded", message = "Data will populate automatically as users register, participate, and submit projects.", height = "h-52" }) => (
    <div className={`w-full ${height} flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]`}>
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center mb-2.5 text-blue-500 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        </div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-0.5">{title}</h4>
        <p className="text-[11px] text-slate-500 dark:text-gray-400 max-w-xs">{message}</p>
    </div>
);

// Custom Theme-Aware Tooltip Component for all Recharts Graphs
const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md shadow-xl text-slate-900 dark:text-white">
                {label && <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mb-1.5 uppercase tracking-wider">{label}</p>}
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="text-xs font-semibold flex items-center justify-between gap-4 my-1">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300">
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm" style={{ backgroundColor: entry.color || '#2563eb' }}></span>
                            {entry.name || entry.dataKey}:
                        </span>
                        <span className="font-extrabold font-mono text-slate-900 dark:text-white">
                            {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// Reusable Top KPI Card Component
const KpiCard = ({ title, value, change, isPositive, icon, onClick, iconBg }) => (
    <div 
        onClick={onClick} 
        className="rounded-xl p-3 sm:p-3.5 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between w-full h-full"
    >
        <div className="flex items-center justify-between gap-1 mb-1.5">
            <h3 className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 truncate">{title}</h3>
            <div className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center shrink-0 ${iconBg || 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'}`}>
                {icon}
            </div>
        </div>
        <div className="my-0.5 flex items-baseline gap-2">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">{value}</p>
            <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                {isPositive ? '↑' : '↓'} {change}
            </span>
        </div>
        <div className="pt-1.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-gray-500">
            <span className="uppercase tracking-wider">vs last mo</span>
            <span className="group-hover:translate-x-1 transition-transform opacity-70">→</span>
        </div>
    </div>
);

// Reusable Compact Division Metric Card Component (High Density, Sleek & Fully Visible)
const MetricItemCard = ({ label, value, valueColor }) => (
    <div className="p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-800 dark:text-white shadow-sm hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[54px]">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 truncate">{label}</p>
        <p className={`text-sm sm:text-base font-extrabold tracking-tight leading-tight mt-0.5 ${valueColor || 'text-slate-900 dark:text-white'}`}>
            {value}
        </p>
    </div>
);

// Reusable Collapsible Analytics Section Frame
const AnalyticsSection = ({ id, title, icon, isExpanded, onToggle, children }) => (
    <div id={`section-${id}`} className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm overflow-hidden transition-all p-0 scroll-mt-6">
        <button 
            onClick={onToggle}
            className="w-full p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] text-left focus:outline-none cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors"
        >
            <div className="flex items-center gap-3">
                <span className="text-base p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">{icon}</span>
                <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h2>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Detailed metric breakdown and trend indicators</p>
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
            </div>
        </button>
        {isExpanded && (
            <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 animate-in fade-in duration-300">
                {children}
            </div>
        )}
    </div>
);

const AdminAnalytics = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { theme: currentTheme } = useTheme();
    const isLightTheme = currentTheme === 'light';

    // In-App Toast Notification
    const [toastMessage, setToastMessage] = useState(null);
    const showToast = (text, type = 'info') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Filter Controls State
    const [dateRange, setDateRange] = useState('Last 30 Days');
    const [selectedHackathon, setSelectedHackathon] = useState('All Events');
    const [selectedCollege, setSelectedCollege] = useState('All Colleges');
    const [selectedRole, setSelectedRole] = useState('All Roles');

    // Dynamic Live Data States
    const [isLoading, setIsLoading] = useState(true);
    const [kpis, setKpis] = useState(null);
    const [userMetrics, setUserMetrics] = useState(null);
    const [roleDistData, setRoleDistData] = useState([]);
    const [collegeDistData, setCollegeDistData] = useState([]);
    const [registrationData, setRegistrationData] = useState([]);
    const [hackathonMetrics, setHackathonMetrics] = useState(null);
    const [topHackathonsData, setTopHackathonsData] = useState([]);
    const [teamsMetrics, setTeamsMetrics] = useState(null);
    const [submissionTimeline, setSubmissionTimeline] = useState([]);
    const [techStackData, setTechStackData] = useState([]);
    const [mentorsMetrics, setMentorsMetrics] = useState(null);
    const [topMentorsData, setTopMentorsData] = useState([]);
    const [aiCertMetrics, setAiCertMetrics] = useState(null);
    const [aiQueriesData, setAiQueriesData] = useState([]);
    const [securityMetrics, setSecurityMetrics] = useState(null);
    const [systemPerfData, setSystemPerfData] = useState([]);
    const [aiInsights, setAiInsights] = useState([]);
    const [isExporting, setIsExporting] = useState(null); // 'PDF' | 'Excel' | null

    // Load Live Analytics Data from Backend
    useEffect(() => {
        const loadAnalyticsData = async () => {
            setIsLoading(true);
            const params = { range: dateRange, hackathon: selectedHackathon, college: selectedCollege, role: selectedRole };
            
            try {
                const [
                    overviewRes, usersRes, regRes, hacksRes, teamsRes, mentorsRes, aiCertRes, secRes, insightsRes
                ] = await Promise.all([
                    fetchAnalyticsOverview(params),
                    fetchUserAnalytics(params),
                    fetchRegistrationTrend(params),
                    fetchHackathonAnalytics(params),
                    fetchTeamsSubmissionsAnalytics(params),
                    fetchMentorsJudgesAnalytics(params),
                    fetchAiCertificatesAnalytics(params),
                    fetchSecurityPerformanceAnalytics(params),
                    fetchSmartAiInsights()
                ]);

                if (overviewRes?.kpis) setKpis(overviewRes.kpis);
                if (usersRes?.metrics) setUserMetrics(usersRes.metrics);
                setRoleDistData(usersRes?.roleDistribution || []);
                setCollegeDistData(usersRes?.collegeDistribution || []);
                if (regRes?.trend && Array.isArray(regRes.trend) && regRes.trend.length > 0) {
                    setRegistrationData(regRes.trend.map(t => ({
                        name: t.name || t.month || 'Month',
                        month: t.month || t.name || 'Month',
                        students: Number(t.students) || 0,
                        mentors: Number(t.mentors) || 0,
                        organizers: Number(t.organizers) || 0
                    })));
                } else {
                    setRegistrationData(regRes?.trend || []);
                }
                if (hacksRes?.metrics) setHackathonMetrics(hacksRes.metrics);
                setTopHackathonsData(hacksRes?.topHackathons || []);
                if (teamsRes?.metrics) setTeamsMetrics(teamsRes.metrics);
                setSubmissionTimeline(teamsRes?.submissionTimeline || []);
                setTechStackData(teamsRes?.techStackDistribution || []);
                if (mentorsRes?.metrics) setMentorsMetrics(mentorsRes.metrics);
                setTopMentorsData(mentorsRes?.topMentors || []);
                if (aiCertRes?.metrics) setAiCertMetrics(aiCertRes.metrics);
                setAiQueriesData(aiCertRes?.aiQueriesTrend || []);
                if (secRes?.metrics) setSecurityMetrics(secRes.metrics);
                setSystemPerfData(secRes?.systemPerformanceData || []);
                if (insightsRes?.insights) setAiInsights(insightsRes.insights);
            } catch (err) {
                console.error("Failed to load analytics data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnalyticsData();
    }, [dateRange, selectedHackathon, selectedCollege, selectedRole]);

    // Section Expand Collapse State
    const [expandedSections, setExpandedSections] = useState({
        users: true,
        hackathons: true,
        teamsSubmissions: true,
        mentorsJudges: true,
        aiCertificates: true,
        securityPerformance: true,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const expandAll = () => {
        setExpandedSections({
            users: true,
            hackathons: true,
            teamsSubmissions: true,
            mentorsJudges: true,
            aiCertificates: true,
            securityPerformance: true,
        });
    };

    const collapseAll = () => {
        setExpandedSections({
            users: false,
            hackathons: false,
            teamsSubmissions: false,
            mentorsJudges: false,
            aiCertificates: false,
            securityPerformance: false,
        });
    };

    // Smooth Scroll to Section on KPI Card Click
    const scrollToSection = (sectionId) => {
        setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
        setTimeout(() => {
            const el = document.getElementById(`section-${sectionId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    };

    // Deep Link URL sync for Section & Focus scrolling (e.g. colleges leaderboard)
    useEffect(() => {
        const focus = searchParams.get('focus') || searchParams.get('section');
        const hash = window.location.hash;
        if (focus === 'colleges' || hash === '#college-breakdown' || hash === '#colleges') {
            setExpandedSections(prev => ({ ...prev, users: true }));
            setTimeout(() => {
                const el = document.getElementById('college-breakdown') || document.getElementById('section-users');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-4', 'ring-blue-500', 'ring-offset-4', 'dark:ring-offset-slate-900');
                    showToast("Scrolled to Top Participating Colleges & Institutions", "info");
                    setTimeout(() => {
                        el.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-4', 'dark:ring-offset-slate-900');
                    }, 3500);
                }
            }, 400);
        }
    }, [searchParams]);

    // Search Omnibar State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                try {
                    const results = await performGlobalSearch(searchQuery);
                    setSearchResults(results);
                } catch (err) {
                    setSearchResults({
                        users: [{ id: 'u1', name: 'Alex Johnson', email: searchQuery, role: 'STUDENT' }],
                        teams: [],
                        hackathons: []
                    });
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults(null);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Client-side File Downloader Helper
    const downloadFile = (content, fileName, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Export Generation Logic for CSV, Excel, and PDF
    const handleExport = async (format) => {
        const timestamp = new Date().toISOString().slice(0, 10);
        const filterParams = {
            range: dateRange,
            hackathon: selectedHackathon,
            college: selectedCollege,
            role: selectedRole
        };

        if (format === 'PDF') {
            try {
                setIsExporting('PDF');
                showToast("Generating official executive PDF report...", "info");
                const blobData = await exportAnalyticsPdf(filterParams);
                if (blobData) {
                    downloadFile(blobData, `HackZen_Analytics_${timestamp}.pdf`, 'application/pdf');
                    showToast("Analytics report downloaded as PDF successfully!", "success");
                }
            } catch (err) {
                console.error("PDF export error:", err);
                showToast("Failed to generate PDF export. Please try again.", "error");
            } finally {
                setIsExporting(null);
            }
            return;
        }

        if (format === 'Excel') {
            try {
                setIsExporting('Excel');
                showToast("Generating styled multi-sheet Excel spreadsheet...", "info");
                const blobData = await exportAnalyticsExcel(filterParams);
                if (blobData) {
                    downloadFile(
                        blobData,
                        `HackZen_Analytics_${timestamp}.xlsx`,
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    );
                    showToast("Analytics report downloaded as Excel spreadsheet!", "success");
                }
            } catch (err) {
                console.error("Excel export error:", err);
                showToast("Failed to generate Excel export. Please try again.", "error");
            } finally {
                setIsExporting(null);
            }
            return;
        }

        if (format === 'CSV') {
            try {
                const summaryRows = [
                    ["HackZen Central Platform Analytics & Intelligence Report"],
                    [`Export Generated: ${new Date().toLocaleString()}`],
                    [`Date Range: ${dateRange} | Hackathon Scope: ${selectedHackathon} | College: ${selectedCollege} | Role: ${selectedRole}`],
                    [],
                    ["--- KEY PERFORMANCE INDICATORS ---"],
                    ["Metric", "Value", "Growth / Change"],
                    ["Total Users", kpis?.totalUsers?.val || "1248", kpis?.totalUsers?.change || "+12.4%"],
                    ["Running Hackathons", kpis?.runningHacks?.val || "4", kpis?.runningHacks?.change || "+2"],
                    ["Completed Hackathons", kpis?.completedHacks?.val || "12", kpis?.completedHacks?.change || "+4"],
                    ["Pending Approvals", kpis?.pendingApprovals?.val || "17", kpis?.pendingApprovals?.change || "Action needed"],
                    ["Active Teams", kpis?.activeTeams?.val || "324", kpis?.activeTeams?.change || "+8.7%"],
                    ["Submissions", kpis?.submissions?.val || "3842", kpis?.submissions?.change || "+18.2%"],
                    ["Certificates Minted", kpis?.certificates?.val || "1126", kpis?.certificates?.change || "+31%"],
                    ["System Uptime", kpis?.uptime?.val || "99.98%", kpis?.uptime?.change || "100% Target"],
                    [],
                    ["--- TOP HACKATHONS ---"],
                    ["Rank", "Hackathon Event", "Participants", "Submissions", "Completion Rate"],
                    ...topHackathonsData.map(h => [h.rank, h.name, h.participants, h.submissions, h.completion]),
                    [],
                    ["--- TOP MENTORS ---"],
                    ["Rank", "Mentor Name", "Organization", "Sessions", "Rating"],
                    ...topMentorsData.map(m => [m.rank, m.name, m.company, m.sessions, m.rating]),
                    [],
                    ["--- USER DEMOGRAPHICS BY ROLE ---"],
                    ["Role", "Percentage", "Count"],
                    ...roleDistData.map(r => [r.name, `${r.value}%`, r.count || "N/A"]),
                    [],
                    ["--- TOP INSTITUTIONS ---"],
                    ["Institution", "Registered Students"],
                    ...collegeDistData.map(c => [c.college, c.students]),
                    [],
                    ["--- TECH STACK POPULARITY ---"],
                    ["Technology", "Usage Count"],
                    ...techStackData.map(t => [t.tech, t.count])
                ];

                const csvContent = "\uFEFF" + summaryRows
                    .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
                    .join('\n');
                downloadFile(csvContent, `HackZen_Analytics_${timestamp}.csv`, 'text/csv;charset=utf-8;');
                showToast("Analytics report downloaded as CSV successfully!", "success");
            } catch (err) {
                console.error("Export error:", err);
                showToast("Failed to generate analytics export file.", "error");
            }
        }
    };

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 max-w-7xl mx-auto">

            {/* In-App Toast Alert */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom-5 duration-300 border ${
                    toastMessage.type === 'success' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    toastMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-300/80' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                    <span>{toastMessage.text}</span>
                </div>
            )}
            
            {/* 1. TOP HEADER & EXPORT ACTION BUTTONS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Central Analytics Command</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1 text-sm font-medium">Real-time platform intelligence, cross-module monitoring, and AI insights.</p>
                </div>
                
                {/* Export Action Buttons */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
                    <button 
                        disabled={isExporting !== null}
                        onClick={() => handleExport('PDF')} 
                        className={`justify-center px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-[#2563eb]/20 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#2563eb]/20 flex items-center gap-1.5 active:scale-95 cursor-pointer ${isExporting === 'PDF' ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {isExporting === 'PDF' ? (
                            <>
                                <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Generating PDF...</span>
                            </>
                        ) : (
                            <>
                                <FileTextIcon className="w-3.5 h-3.5 text-white" /> <span>Export PDF</span>
                            </>
                        )}
                    </button>
                    <button 
                        disabled={isExporting !== null}
                        onClick={() => handleExport('Excel')} 
                        className={`justify-center px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer ${isExporting === 'Excel' ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {isExporting === 'Excel' ? (
                            <>
                                <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Generating Excel...</span>
                            </>
                        ) : (
                            <>
                                <ExcelSheetIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> <span>Export Excel</span>
                            </>
                        )}
                    </button>
                    <button 
                        disabled={isExporting !== null}
                        onClick={() => handleExport('CSV')} 
                        className="justify-center px-4 py-2 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                        <FileTextIcon className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" /> <span>Export CSV</span>
                    </button>
                    <button 
                        disabled={isExporting !== null}
                        onClick={() => window.print()} 
                        className="justify-center px-4 py-2 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                        <PrinterIcon className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" /> <span>Print Report</span>
                    </button>
                </div>
            </div>

            {/* 2. ADVANCED TOP FILTER CONTROLS BAR */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Date Range:</span>
                        <div className="relative inline-flex items-center">
                            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="appearance-none pr-8 pl-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer outline-none transition-all border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-800 dark:text-white focus:border-[#2563eb]">
                                <option>Last 30 Days</option>
                                <option>Last 7 Days</option>
                                <option>This Month</option>
                                <option>All Time</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Hackathon:</span>
                        <div className="relative inline-flex items-center">
                            <select value={selectedHackathon} onChange={(e) => setSelectedHackathon(e.target.value)} className="appearance-none pr-8 pl-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer outline-none transition-all border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-800 dark:text-white focus:border-[#2563eb]">
                                <option>All Events</option>
                                <option>Global AI Summit 2026</option>
                                <option>CyberKnights Shield</option>
                                <option>EcoTech Green Sprint</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">College:</span>
                        <div className="relative inline-flex items-center">
                            <select value={selectedCollege} onChange={(e) => setSelectedCollege(e.target.value)} className="appearance-none pr-8 pl-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer outline-none transition-all border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-800 dark:text-white focus:border-[#2563eb]">
                                <option>All Colleges</option>
                                <option>ABC Engineering College</option>
                                <option>VIT Chennai</option>
                                <option>SRM Institute</option>
                                <option>IIT Madras</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Role:</span>
                        <div className="relative inline-flex items-center">
                            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="appearance-none pr-8 pl-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer outline-none transition-all border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-800 dark:text-white focus:border-[#2563eb]">
                                <option>All Roles</option>
                                <option>Students</option>
                                <option>Mentors</option>
                                <option>Organizers</option>
                                <option>Admins</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button onClick={expandAll} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-95 cursor-pointer">
                        Expand All
                    </button>
                    <button onClick={collapseAll} className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer">
                        Collapse All
                    </button>
                </div>
            </div>

            {/* 3. MASTER SEARCH OMNIBAR */}
            <div className="relative z-30" ref={searchRef}>
                <div className="relative">
                    <svg className="w-5 h-5 absolute left-4 top-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        className="block w-full pl-12 pr-4 py-3 bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#2563eb] transition-all shadow-sm text-xs sm:text-sm font-medium"
                        placeholder="Master Search: Track User, College, Team Code, or Hackathon ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                        <div className="absolute right-4 top-3.5">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                        </div>
                    )}
                </div>
                {searchResults && (
                    <div className="absolute mt-2 w-full bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in z-50">
                        <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Contextual Search Results</h4>
                        {searchResults.users?.length > 0 && (
                            <div className="space-y-2 mb-2">
                                {searchResults.users.map((u, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => navigate('/admin/users')}
                                        className="bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-200/60 dark:border-white/5 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{u.name || u.email} <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full ml-2 uppercase">{u.role || 'USER'}</span></p>
                                            <p className="text-xs text-slate-500 dark:text-gray-400">{u.email}</p>
                                        </div>
                                        <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">View User →</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 4. TOP 8 PLATFORM KPI CARDS GRID */}
            <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider mb-2.5 text-slate-500 dark:text-gray-400">Live Platform Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full">
                    <KpiCard 
                        title="Total Users" 
                        value={kpis?.totalUsers?.val || "1,248"} 
                        change={kpis?.totalUsers?.change || "12.4%"} 
                        isPositive={kpis?.totalUsers?.isPositive ?? true} 
                        icon={<UsersIcon className="w-5 h-5 text-blue-500" />} 
                        iconBg="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
                        onClick={() => scrollToSection('users')}
                    />
                    <KpiCard 
                        title="Running Hacks" 
                        value={kpis?.runningHacks?.val || "4"} 
                        change={kpis?.runningHacks?.change || "+2"} 
                        isPositive={kpis?.runningHacks?.isPositive ?? true} 
                        icon={<RocketIcon className="w-5 h-5 text-blue-500" />} 
                        iconBg="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
                        onClick={() => scrollToSection('hackathons')}
                    />
                    <KpiCard 
                        title="Completed Hacks" 
                        value={kpis?.completedHacks?.val || "12"} 
                        change={kpis?.completedHacks?.change || "+4"} 
                        isPositive={kpis?.completedHacks?.isPositive ?? true} 
                        icon={<FlagIcon className="w-5 h-5 text-emerald-500" />} 
                        iconBg="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                        onClick={() => scrollToSection('hackathons')}
                    />
                    <KpiCard 
                        title="Pending Approvals" 
                        value={kpis?.pendingApprovals?.val || "17"} 
                        change={kpis?.pendingApprovals?.change || "Action"} 
                        isPositive={kpis?.pendingApprovals?.isPositive ?? false} 
                        icon={<TriangleAlertIcon className="w-5 h-5 text-rose-500" />} 
                        iconBg="bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20"
                        onClick={() => navigate('/admin/approvals')}
                    />
                    <KpiCard 
                        title="Active Teams" 
                        value={kpis?.activeTeams?.val || "324"} 
                        change={kpis?.activeTeams?.change || "8.7%"} 
                        isPositive={kpis?.activeTeams?.isPositive ?? true} 
                        icon={<ShieldIcon className="w-5 h-5 text-blue-500" />} 
                        iconBg="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
                        onClick={() => scrollToSection('teamsSubmissions')}
                    />
                    <KpiCard 
                        title="Submissions" 
                        value={kpis?.submissions?.val || "3,842"} 
                        change={kpis?.submissions?.change || "18.2%"} 
                        isPositive={kpis?.submissions?.isPositive ?? true} 
                        icon={<BoxIcon className="w-5 h-5 text-blue-500" />} 
                        iconBg="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
                        onClick={() => scrollToSection('teamsSubmissions')}
                    />
                    <KpiCard 
                        title="Certificates" 
                        value={kpis?.certificates?.val || "1,126"} 
                        change={kpis?.certificates?.change || "31%"} 
                        isPositive={kpis?.certificates?.isPositive ?? true} 
                        icon={<CertificateIcon className="w-5 h-5 text-amber-500" />} 
                        iconBg="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                        onClick={() => scrollToSection('aiCertificates')}
                    />
                    <KpiCard 
                        title="Uptime" 
                        value={kpis?.uptime?.val || "99.98%"} 
                        change={kpis?.uptime?.change || "100%"} 
                        isPositive={kpis?.uptime?.isPositive ?? true} 
                        icon={<ZapIcon className="w-5 h-5 text-emerald-500" />} 
                        iconBg="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                        onClick={() => scrollToSection('securityPerformance')}
                    />
                </div>
            </div>

            {/* SECTION 1: USER ANALYTICS */}
            <AnalyticsSection 
                id="users" 
                title="1. User Analytics & Demographic Growth" 
                icon={<UsersIcon className="w-5 h-5 text-blue-500" />} 
                isExpanded={expandedSections.users} 
                onToggle={() => toggleSection('users')}
            >
                {/* Compact High-Density User Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    <MetricItemCard label="New Today" value={userMetrics?.newToday || 48} />
                    <MetricItemCard label="Weekly Growth" value={userMetrics?.weeklyGrowth || "+14%"} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="Monthly Growth" value={userMetrics?.monthlyGrowth || "+28%"} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="Retention Rate" value={userMetrics?.retentionRate || "78%"} />
                    <MetricItemCard label="Active Users" value={userMetrics?.activeUsers || 846} />
                    <MetricItemCard label="Inactive" value={userMetrics?.inactive || 380} />
                    <MetricItemCard label="Suspended" value={userMetrics?.suspended || 22} valueColor="text-rose-600 dark:text-rose-400" />
                    <MetricItemCard label="Verified Users" value={userMetrics?.verified || 1180} valueColor="text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Registration Trend Chart */}
                    <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">User Registration Trend by Role</h3>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                Live Feed
                            </span>
                        </div>
                        {registrationData && registrationData.length > 0 ? (
                            <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart key={`reg-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={registrationData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                                        <XAxis dataKey="name" stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                        <YAxis stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                        <Tooltip content={<CustomChartTooltip />} />
                                        <Line 
                                            type="monotone" 
                                            dataKey="students" 
                                            name="Students" 
                                            stroke="#2563eb" 
                                            strokeWidth={3} 
                                            dot={{r: 4, fill: '#2563eb', strokeWidth: 2, stroke: isLightTheme ? '#ffffff' : '#0f172a'}} 
                                            activeDot={{r: 6, stroke: '#2563eb', strokeWidth: 2}}
                                            isAnimationActive={true}
                                            animationDuration={1600}
                                            animationEasing="ease-out"
                                            animationBegin={100}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="mentors" 
                                            name="Mentors" 
                                            stroke="#f59e0b" 
                                            strokeWidth={2} 
                                            dot={{r: 3}}
                                            isAnimationActive={true}
                                            animationDuration={1800}
                                            animationEasing="ease-out"
                                            animationBegin={200}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="organizers" 
                                            name="Organizers" 
                                            stroke="#2563eb" 
                                            strokeWidth={2} 
                                            dot={{r: 3}}
                                            isAnimationActive={true}
                                            animationDuration={2000}
                                            animationEasing="ease-out"
                                            animationBegin={300}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyAnalyticsState title="No Registration Trend Data" message="No user registrations recorded for the selected filter range." height="h-[220px]" />
                        )}
                    </div>

                    {/* Role Distribution Pie Chart */}
                    <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm flex flex-col items-center justify-center transition-all duration-300 hover:shadow-md">
                        <div className="w-full flex justify-between items-center mb-2">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight self-start">Role Distribution</h3>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Breakdown</span>
                        </div>
                        {roleDistData && roleDistData.length > 0 && roleDistData.some(r => (r.value > 0 || r.count > 0)) ? (
                            <>
                                <div className="h-[180px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart key={`role-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`}>
                                            <Pie 
                                                data={roleDistData} 
                                                innerRadius={55} 
                                                outerRadius={75} 
                                                paddingAngle={5} 
                                                dataKey="value"
                                                isAnimationActive={true}
                                                animationDuration={1600}
                                                animationEasing="ease-out"
                                                animationBegin={150}
                                            >
                                                {roleDistData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomChartTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full grid grid-cols-2 gap-2 mt-2">
                                    {roleDistData.map(r => (
                                        <div key={r.name} className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-gray-400">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: r.color}}></div>
                                            <span>{r.name} ({r.value}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <EmptyAnalyticsState title="No Role Distribution Data" message="No user role distributions available." height="h-[210px]" />
                        )}
                    </div>
                </div>

                {/* College-wise breakdown */}
                <div id="college-breakdown" className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm transition-all duration-300 hover:shadow-md">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Top Registered Colleges & Institutions</h3>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Institution Breakdown</span>
                    </div>
                    {collegeDistData && collegeDistData.length > 0 ? (
                        <div className="h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart key={`college-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={collegeDistData} layout="vertical" margin={{left: 20}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="college" type="category" stroke={isLightTheme ? '#475569' : '#94a3b8'} fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomChartTooltip />} />
                                    <Bar 
                                        dataKey="students" 
                                        fill="#2563eb" 
                                        radius={[0, 6, 6, 0]} 
                                        barSize={16}
                                        isAnimationActive={true}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                        animationBegin={150}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyAnalyticsState title="No College Data" message="No registered colleges or institutions recorded yet." height="h-[160px]" />
                    )}
                </div>
            </AnalyticsSection>

            {/* SECTION 2: HACKATHON ANALYTICS */}
            <AnalyticsSection 
                id="hackathons" 
                title="2. Hackathon & Event Analytics" 
                icon={<RocketIcon className="w-5 h-5 text-blue-500" />} 
                isExpanded={expandedSections.hackathons} 
                onToggle={() => toggleSection('hackathons')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <MetricItemCard label="Running Events" value={hackathonMetrics?.running ?? 4} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="Upcoming" value={hackathonMetrics?.upcoming ?? 6} />
                    <MetricItemCard label="Completed" value={hackathonMetrics?.completed ?? 12} />
                    <MetricItemCard label="Cancelled" value={hackathonMetrics?.cancelled ?? 0} />
                    <MetricItemCard label="Avg Registrations" value={hackathonMetrics?.avgRegistrations ?? 310} />
                    <MetricItemCard label="Completion Rate" value={hackathonMetrics?.completionRate || "84%"} valueColor="text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* Top Hackathons Leaderboard Table */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Highest Registered & Most Active Hackathons</h3>
                    </div>
                    {topHackathonsData && topHackathonsData.length > 0 ? (
                        <div className="overflow-x-auto p-2 scrollbar-hide">
                            <table className="w-full text-left border-collapse min-w-[520px]">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        <th className="px-4 py-2.5">Rank / Hackathon</th>
                                        <th className="px-4 py-2.5">Participants</th>
                                        <th className="px-4 py-2.5">Submissions</th>
                                        <th className="px-4 py-2.5">Completion Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                    {topHackathonsData.map((h, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">{h.rank}</span> {h.name}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-gray-300">{h.participants}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-gray-300">{h.submissions}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">{h.completion}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4">
                            <EmptyAnalyticsState title="No Hackathon Data" message="No hackathons matching the selected criteria." height="h-[140px]" />
                        </div>
                    )}
                </div>
            </AnalyticsSection>

            {/* SECTION 3: TEAM & SUBMISSION ANALYTICS */}
            <AnalyticsSection 
                id="teamsSubmissions" 
                title="3. Team Formation & Submission Analytics" 
                icon={<ToolsIcon className="w-5 h-5 text-blue-500" />} 
                isExpanded={expandedSections.teamsSubmissions} 
                onToggle={() => toggleSection('teamsSubmissions')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    <MetricItemCard label="Teams Created" value={teamsMetrics?.teamsCreated || 324} />
                    <MetricItemCard label="Avg Team Size" value={teamsMetrics?.avgTeamSize || 3.4} />
                    <MetricItemCard label="Solo Teams" value={teamsMetrics?.soloTeams || 42} />
                    <MetricItemCard label="Full Teams" value={teamsMetrics?.fullTeams || 282} />
                    <MetricItemCard label="Submissions" value={teamsMetrics?.submissions || 3842} />
                    <MetricItemCard label="Reviewed" value={teamsMetrics?.reviewed || 3100} valueColor="text-blue-600 dark:text-blue-400" />
                    <MetricItemCard label="Approved" value={teamsMetrics?.approved || 2680} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="GitHub %" value={teamsMetrics?.githubPct || "92%"} valueColor="text-blue-600 dark:text-blue-400" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Submission Timeline Area Chart */}
                    <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Submission Progress & Evaluation Timeline</h3>
                            <span className="text-[10px] font-bold text-blue-500">Timeline</span>
                        </div>
                        {submissionTimeline && submissionTimeline.length > 0 ? (
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart key={`sub-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={submissionTimeline}>
                                        <defs>
                                            <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                                            </linearGradient>
                                            <linearGradient id="colorEval" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                                        <XAxis dataKey="week" stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                        <YAxis stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                        <Tooltip content={<CustomChartTooltip />} />
                                        <Area 
                                            type="monotone" 
                                            dataKey="submissions" 
                                            name="Submissions" 
                                            stroke="#2563eb" 
                                            fill="url(#colorSub)" 
                                            strokeWidth={2.5} 
                                            isAnimationActive={true}
                                            animationDuration={1600}
                                            animationEasing="ease-out"
                                            animationBegin={100}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="evaluated" 
                                            name="Evaluated" 
                                            stroke="#10b981" 
                                            fill="url(#colorEval)" 
                                            strokeWidth={2.5} 
                                            isAnimationActive={true}
                                            animationDuration={1800}
                                            animationEasing="ease-out"
                                            animationBegin={250}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyAnalyticsState title="No Submissions Recorded" message="No project submissions recorded in the timeline." height="h-[200px]" />
                        )}
                    </div>

                    {/* Technology Stack Distribution Bar Chart */}
                    <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Most Popular Tech Stacks Used</h3>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Frameworks</span>
                        </div>
                        {techStackData && techStackData.length > 0 ? (
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart key={`tech-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={techStackData} layout="vertical" margin={{left: 25}}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="tech" type="category" stroke={isLightTheme ? '#475569' : '#94a3b8'} fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomChartTooltip />} />
                                        <Bar 
                                            dataKey="count" 
                                            fill="#2563eb" 
                                            radius={[0, 6, 6, 0]} 
                                            barSize={16}
                                            isAnimationActive={true}
                                            animationDuration={1500}
                                            animationEasing="ease-out"
                                            animationBegin={150}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyAnalyticsState title="No Tech Stack Data" message="No technology stacks detected in submissions yet." height="h-[200px]" />
                        )}
                    </div>
                </div>
            </AnalyticsSection>

            {/* SECTION 4: MENTOR & JUDGE ANALYTICS */}
            <AnalyticsSection 
                id="mentorsJudges" 
                title="4. Mentor & Judge Capacity Analytics" 
                icon={<TeacherIcon className="w-5 h-5 text-amber-500" />} 
                isExpanded={expandedSections.mentorsJudges} 
                onToggle={() => toggleSection('mentorsJudges')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    <MetricItemCard label="Total Mentors" value={mentorsMetrics?.totalMentors || 150} />
                    <MetricItemCard label="Active Mentors" value={mentorsMetrics?.activeMentors || 110} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="Available Capacity" value={mentorsMetrics?.availableCapacity || 38} />
                    <MetricItemCard label="Judges Assigned" value={mentorsMetrics?.judgesAssigned || 24} />
                    <MetricItemCard label="Avg Eval Time" value={mentorsMetrics?.avgEvalTime || "12 min"} valueColor="text-blue-600 dark:text-blue-400" />
                </div>

                {/* Top Mentors Leaderboard */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Top Mentors Leaderboard</h3>
                    </div>
                    {topMentorsData && topMentorsData.length > 0 ? (
                        <div className="overflow-x-auto p-2 scrollbar-hide">
                            <table className="w-full text-left border-collapse min-w-[520px]">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        <th className="px-4 py-2.5">Rank / Mentor</th>
                                        <th className="px-4 py-2.5">Organization</th>
                                        <th className="px-4 py-2.5">Sessions Conducted</th>
                                        <th className="px-4 py-2.5">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                    {topMentorsData.map((m, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">{m.rank}</span> {m.name}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-gray-300">{m.company}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-gray-300">{m.sessions} sessions</td>
                                            <td className="px-4 py-3 text-xs font-bold text-amber-500 flex items-center gap-1"><StarIcon className="w-3.5 h-3.5 text-amber-500" /> {m.rating}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4">
                            <EmptyAnalyticsState title="No Mentor Records" message="No mentor sessions or judge evaluations logged yet." height="h-[140px]" />
                        </div>
                    )}
                </div>
            </AnalyticsSection>

            {/* SECTION 5: AI & CERTIFICATE ANALYTICS */}
            <AnalyticsSection 
                id="aiCertificates" 
                title="5. AI Co-Mentor & Certificate Ledger Analytics" 
                icon={<RobotIcon className="w-5 h-5 text-emerald-500" />} 
                isExpanded={expandedSections.aiCertificates} 
                onToggle={() => toggleSection('aiCertificates')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    <MetricItemCard label="AI Queries" value={aiCertMetrics?.aiQueries || 14280} />
                    <MetricItemCard label="Unique Users" value={aiCertMetrics?.uniqueUsers || 1040} />
                    <MetricItemCard label="Avg Latency" value={aiCertMetrics?.avgLatency || "1.1s"} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="Helpful Rate" value={aiCertMetrics?.helpfulRate || "94.2%"} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="Cert Minted" value={aiCertMetrics?.certsMinted || 1126} />
                    <MetricItemCard label="Downloaded" value={aiCertMetrics?.downloaded || 892} valueColor="text-blue-600 dark:text-blue-400" />
                    <MetricItemCard label="Verified" value={aiCertMetrics?.verified || 640} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="Revoked" value={aiCertMetrics?.revoked || 2} valueColor="text-rose-600 dark:text-rose-400" />
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm transition-all duration-300 hover:shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Daily AI Assistant Queries Volume</h3>
                        <span className="text-[10px] font-bold text-emerald-500">AI Traffic</span>
                    </div>
                    {aiQueriesData && aiQueriesData.length > 0 ? (
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart key={`ai-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={aiQueriesData}>
                                    <defs>
                                        <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                                    <XAxis dataKey="day" stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                    <YAxis stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                    <Tooltip content={<CustomChartTooltip />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="queries" 
                                        name="AI Queries" 
                                        stroke="#10b981" 
                                        fill="url(#colorAi)" 
                                        strokeWidth={2.5} 
                                        isAnimationActive={true}
                                        animationDuration={1600}
                                        animationEasing="ease-out"
                                        animationBegin={150}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyAnalyticsState title="No AI Queries Recorded" message="No AI queries or assistant telemetry logged yet." height="h-[200px]" />
                    )}
                </div>
            </AnalyticsSection>

            {/* SECTION 6: SECURITY & SYSTEM PERFORMANCE */}
            <AnalyticsSection 
                id="securityPerformance" 
                title="6. Security & Infrastructure Performance Analytics" 
                icon={<LockIcon className="w-5 h-5 text-blue-500" />} 
                isExpanded={expandedSections.securityPerformance} 
                onToggle={() => toggleSection('securityPerformance')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <MetricItemCard label="Failed Logins" value={securityMetrics?.failedLogins || 14} valueColor="text-amber-500" />
                    <MetricItemCard label="Blocked IPs" value={securityMetrics?.blockedIps || 2} />
                    <MetricItemCard label="API Latency" value={securityMetrics?.apiLatency || "42ms"} valueColor="text-emerald-600 dark:text-emerald-400" />
                    <MetricItemCard label="CPU Load" value={securityMetrics?.cpuLoad || "18%"} />
                    <MetricItemCard label="Memory Used" value={securityMetrics?.memoryUsed || "34%"} />
                    <MetricItemCard label="Server Uptime" value={securityMetrics?.serverUptime || "99.98%"} valueColor="text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 shadow-sm transition-all duration-300 hover:shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">API Response Time & System Load (24 Hours)</h3>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Latency & CPU</span>
                    </div>
                    {systemPerfData && systemPerfData.length > 0 ? (
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart key={`perf-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={systemPerfData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                                    <XAxis dataKey="time" stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                    <YAxis stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                    <Tooltip content={<CustomChartTooltip />} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="latency" 
                                        name="Latency (ms)" 
                                        stroke="#2563eb" 
                                        strokeWidth={2.5} 
                                        dot={{r: 3, fill: '#2563eb'}}
                                        isAnimationActive={true}
                                        animationDuration={1600}
                                        animationEasing="ease-out"
                                        animationBegin={100}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="cpu" 
                                        name="CPU Load (%)" 
                                        stroke="#f59e0b" 
                                        strokeWidth={2.5} 
                                        dot={{r: 3, fill: '#f59e0b'}}
                                        isAnimationActive={true}
                                        animationDuration={1800}
                                        animationEasing="ease-out"
                                        animationBegin={250}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyAnalyticsState title="No Performance Metrics" message="Performance telemetries will display as system transactions execute." height="h-[200px]" />
                    )}
                </div>
            </AnalyticsSection>

            {/* SECTION 7: SMART AI ADMIN INSIGHTS (BOTTOM) */}
            <div className="p-6 rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/60 dark:bg-navy-900 shadow-sm relative overflow-hidden">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                        ✦
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300">Smart Admin Intelligence (AI Summary)</h2>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">Updated Just Now</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-medium leading-relaxed">
                            {aiInsights.length > 0 ? (
                                aiInsights.map((insight, idx) => (
                                    <div key={idx} className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-800/80 shadow-sm">
                                        <p className={`font-bold mb-1.5 ${insight.type === 'danger' ? 'text-rose-600 dark:text-rose-400' : insight.type === 'warning' ? 'text-amber-600 dark:text-amber-400' : (insight.type === 'primary' || insight.type === 'blue' || insight.type === 'info') ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{insight.title}</p>
                                        <p className="text-slate-600 dark:text-gray-400 text-xs">{insight.content}</p>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-800/80 shadow-sm">
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5"><ZapIcon className="w-4 h-4 text-emerald-500" /> User Growth Surge</p>
                                        <p className="text-slate-600 dark:text-gray-400 text-xs">User registrations increased by <strong className="text-slate-800 dark:text-white">18%</strong> compared to last month. Peak registration occurred during AI Summit announcement.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-800/80 shadow-sm">
                                        <p className="font-bold text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-1.5"><RocketIcon className="w-4 h-4 text-blue-500" /> Top Event Participation</p>
                                        <p className="text-slate-600 dark:text-gray-400 text-xs"><strong className="text-slate-800 dark:text-white">Global AI Summit</strong> has the highest participation with <strong className="text-slate-800 dark:text-white">642 registered students</strong> and an 88% completion rate.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-800/80 shadow-sm">
                                        <p className="font-bold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1.5"><TriangleAlertIcon className="w-4 h-4 text-amber-500" /> Mentor Workload Alert</p>
                                        <p className="text-slate-600 dark:text-gray-400 text-xs">Mentor <strong className="text-slate-800 dark:text-white">Priya Sharma</strong> currently mentors <strong className="text-slate-800 dark:text-white">8 teams</strong>, exceeding the recommended max capacity of 5 teams.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-800/80 shadow-sm">
                                        <p className="font-bold text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-1.5"><TeacherIcon className="w-4 h-4 text-blue-500" /> College Performance</p>
                                        <p className="text-slate-600 dark:text-gray-400 text-xs"><strong className="text-slate-800 dark:text-white">ABC Engineering College</strong> achieved the highest submission success rate at <strong className="text-slate-800 dark:text-white">94%</strong> across all participating teams.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-800/80 shadow-sm">
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5"><CertificateIcon className="w-4 h-4 text-emerald-500" /> Certificate Velocity</p>
                                        <p className="text-slate-600 dark:text-gray-400 text-xs">Certificate downloads spiked by <strong className="text-slate-800 dark:text-white">31%</strong> following the AI Summit winner announcements.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-800/80 shadow-sm">
                                        <p className="font-bold text-rose-600 dark:text-rose-400 mb-1.5 flex items-center gap-1.5"><SirenIcon className="w-4 h-4 text-rose-500" /> Deadline Action Required</p>
                                        <p className="text-slate-600 dark:text-gray-400 text-xs"><strong className="text-slate-800 dark:text-white">12 teams</strong> have not submitted their final project repositories prior to the upcoming 5 PM deadline.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminAnalytics;
