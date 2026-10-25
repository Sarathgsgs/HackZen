import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchSubmissions,
    updateSubmissionStatus,
    exportSubmissionsToCsv,
    SUBMISSION_STATUSES
} from '../../services/organizer/submissionsApi';
import { usePlatformSettings } from '../../context/PlatformSettingsContext';

const Submissions = () => {
    const navigate = useNavigate();
    const { maxUploadFileSize, allowedFileTypes, gitHubRepo, demoUrl } = usePlatformSettings();

    // Icon component
    const Icon = ({ name, className }) => {
        const icons = {
            Eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
            Download: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
            Sort: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />,
            File: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />,
        };
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icons[name]}
            </svg>
        );
    };

    // --- State Management ---
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('sub_searchTerm') || '');
    const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem('sub_statusFilter') || 'all');
    const [trackFilter, setTrackFilter] = useState(() => sessionStorage.getItem('sub_trackFilter') || 'all');
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // --- Backend Data Initialization ---
    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            try {
                const data = await fetchSubmissions();
                setSubmissions(data);
                setErrorMessage('');
            } catch (error) {
                console.error("Failed to load submissions:", error);
                setErrorMessage(error.response?.data?.detail || 'Failed to load submissions.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    }, []);

    // --- Persistence ---
    useEffect(() => {
        sessionStorage.setItem('sub_searchTerm', searchTerm);
        sessionStorage.setItem('sub_statusFilter', statusFilter);
        sessionStorage.setItem('sub_trackFilter', trackFilter);
    }, [searchTerm, statusFilter, trackFilter]);

    // --- Filtering Logic ---
    const filteredData = useMemo(() => {
        return submissions.filter(s => {
            const matchesSearch = (s.team || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.hackathon || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' ||
                (s.status || '').toLowerCase() === statusFilter.toLowerCase();
            const matchesTrack = trackFilter === 'all' || s.track === trackFilter;
            return matchesSearch && matchesStatus && matchesTrack;
        });
    }, [submissions, searchTerm, statusFilter, trackFilter]);

    const tracks = useMemo(() => (
        [...new Set(submissions.map(item => item.track).filter(Boolean))]
    ), [submissions]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, trackFilter]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // --- Action Handlers ---
    const handleEvaluate = (submissionId) => {
        sessionStorage.setItem('eval_selectedTeamId', submissionId);
        navigate('/organizer/evaluation');
    };

    const handleStatusChange = async (submissionId, nextStatus) => {
        setActionLoading(prev => ({ ...prev, [submissionId]: true }));
        setErrorMessage('');

        try {
            await updateSubmissionStatus(submissionId, nextStatus);
            setSubmissions(prev => prev.map(item => (
                item.id === submissionId ? { ...item, status: nextStatus } : item
            )));
            setSelectedSubmission(prev => (
                prev?.id === submissionId ? { ...prev, status: nextStatus } : prev
            ));
        } catch (error) {
            console.error('Failed to update submission status:', error);
            setErrorMessage(error.response?.data?.detail || 'Failed to update submission status.');
        } finally {
            setActionLoading(prev => ({ ...prev, [submissionId]: false }));
        }
    };

    const handleFlag = async (submissionId) => {
        setActionLoading(prev => ({ ...prev, [submissionId]: true }));
        setErrorMessage('');

        try {
            const item = submissions.find(s => s.id === submissionId);
            const nextStatus = item?.status === 'Flagged for Investigation' ? 'Pending Review' : 'Flagged for Investigation';
            await updateSubmissionStatus(submissionId, nextStatus, 'Similarity analysis review flag');
            setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status: nextStatus } : s));
            setSelectedSubmission(prev => prev?.id === submissionId ? { ...prev, status: nextStatus } : prev);
        } catch (error) {
            console.error('Failed to update flag status:', error);
            setErrorMessage(error.response?.data?.detail || 'Failed to update flag status.');
        } finally {
            setActionLoading(prev => ({ ...prev, [submissionId]: false }));
        }
    };

    const handleOpenFile = (fileUrl) => {
        if (!fileUrl) return;
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Pending Review': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'Reviewed': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
            case 'Shortlisted': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'Rejected': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            case 'Evaluated': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'Approved': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
            case 'Flagged for Investigation': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse';
            case 'Disqualified': return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40';
            default: return 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-white/10';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Submissions</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Review and evaluate team project submissions</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportSubmissionsToCsv(filteredData)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-xs"
                    >
                        <Icon name="Download" className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Active Platform Deliverables Policy Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-navy-950/40 rounded-xl border border-slate-200/80 dark:border-white/5 text-xs text-slate-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2563eb] animate-pulse"></span>
                    <span className="font-semibold text-slate-800 dark:text-white">Platform Deliverable Baseline:</span>
                    <span>Max Size: <strong className="text-slate-800 dark:text-blue-300">{maxUploadFileSize}</strong></span>
                    <span>•</span>
                    <span>Allowed Formats: <strong className="text-slate-800 dark:text-blue-300">{(allowedFileTypes || []).join(', ')}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gitHubRepo ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400'}`}>
                        GitHub: {gitHubRepo ? 'Mandatory' : 'Optional'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${demoUrl ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400'}`}>
                        Demo: {demoUrl ? 'Mandatory' : 'Optional'}
                    </span>
                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-600 dark:text-red-200">
                    {errorMessage}
                </div>
            )}

            {/* Submissions Table Card */}
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 border-b border-slate-200/80 dark:border-white/5 gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">All Submissions</h2>
                        {isLoading && <span className="text-xs text-[#2563eb] animate-pulse bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Loading...</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search team or project..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-navy-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#2563eb] transition-all"
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <select
                            className="px-3.5 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-gray-300 cursor-pointer outline-none hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            value={trackFilter}
                            onChange={(e) => setTrackFilter(e.target.value)}
                        >
                            <option value="all">All Tracks</option>
                            {tracks.map(track => (
                                <option key={track} value={track}>{track}</option>
                            ))}
                        </select>
                        <select
                            className="px-3.5 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-gray-300 cursor-pointer outline-none hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            {SUBMISSION_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-400 animate-pulse">Loading submissions...</p>
                    </div>
                ) : paginatedItems.length === 0 ? (
                    <div className="p-20 text-center space-y-3">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">No submissions found</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400">No submissions match your current filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5">
                                <tr className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Team</th>
                                    <th className="px-6 py-4">Project</th>
                                    <th className="px-6 py-4">Hackathon</th>
                                    <th className="px-6 py-4">Track</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Similarity</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
                                {paginatedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-[#2563eb] font-semibold text-sm">
                                                    {item.logo}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#2563eb] transition-colors">{item.team}</p>
                                                    <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">Code: {item.teamCode}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">{item.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">Submitted {item.time}</p>
                                        </td>

                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-600 dark:text-gray-300">{item.hackathon}</p>
                                        </td>

                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-500 dark:text-gray-400">{item.track}</p>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full ${
                                                            (item.plagiarismScore || 0) > 40 ? 'bg-rose-500' :
                                                            (item.plagiarismScore || 0) > 20 ? 'bg-amber-500' : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, item.plagiarismScore || 8)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-semibold ${
                                                    (item.plagiarismScore || 0) > 40 ? 'text-rose-500 dark:text-rose-400' :
                                                    (item.plagiarismScore || 0) > 20 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'
                                                }`}>
                                                    {item.plagiarismScore !== null ? `${item.plagiarismScore}%` : '8%'}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <button
                                                    onClick={() => handleFlag(item.id)}
                                                    disabled={actionLoading[item.id]}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        item.status === 'Flagged for Investigation'
                                                            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/20'
                                                            : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'
                                                    }`}
                                                    title={item.status === 'Flagged for Investigation' ? 'Flagged for Investigation' : 'Flag for Investigation'}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => setSelectedSubmission(item)}
                                                    className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                    title="View details"
                                                >
                                                    <Icon name="Eye" className="w-4 h-4" />
                                                </button>
                                                {item.fileUrl && (
                                                    <button
                                                        onClick={() => handleOpenFile(item.fileUrl)}
                                                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                        title="Open submission file"
                                                    >
                                                        <Icon name="File" className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEvaluate(item.id)}
                                                    disabled={actionLoading[item.id]}
                                                    className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {actionLoading[item.id] ? 'Evaluating...' : 'Evaluate'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium transition-colors"
                    >
                        Previous
                    </button>
                    <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                    currentPage === page
                                        ? 'bg-[#2563eb] text-white shadow-sm'
                                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium transition-colors"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Details Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedSubmission.title}</h2>
                                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{selectedSubmission.team} • {selectedSubmission.hackathon}</p>
                            </div>
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                    <p className="text-xs text-slate-500 dark:text-gray-400 uppercase font-bold">Track</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{selectedSubmission.track}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                    <p className="text-xs text-slate-500 dark:text-gray-400 uppercase font-bold">Version</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">v{selectedSubmission.version}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                    <p className="text-xs text-slate-500 dark:text-gray-400 uppercase font-bold">Evaluations</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{selectedSubmission.evaluationCount}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5">
                                <p className="text-xs text-slate-500 dark:text-gray-400 uppercase font-bold mb-2">Description</p>
                                <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
                                    {selectedSubmission.description || 'No project description provided.'}
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                                <select
                                    value={selectedSubmission.status}
                                    onChange={(e) => handleStatusChange(selectedSubmission.id, e.target.value)}
                                    disabled={actionLoading[selectedSubmission.id]}
                                    className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-gray-300 cursor-pointer outline-none hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    {SUBMISSION_STATUSES.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>

                                <div className="flex gap-3">
                                    {selectedSubmission.fileUrl && (
                                        <button
                                            onClick={() => handleOpenFile(selectedSubmission.fileUrl)}
                                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold transition-all"
                                        >
                                            Open File
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEvaluate(selectedSubmission.id)}
                                        className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                                    >
                                        Evaluate Submission
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Submissions;
