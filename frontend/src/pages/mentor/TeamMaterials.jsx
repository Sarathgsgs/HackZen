import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    fetchMaterials,
    fetchRecentMaterials,
    fetchStorageOverview,
    uploadMaterial,
    downloadMaterial,
    deleteMaterial,
} from '../../services/mentor/materialsApi';
import { fetchTeams } from '../../services/mentor/feedbackApi';

// File type color and icon helper
const getFileTypeBadge = (type = '', ext = '') => {
    const t = (type || ext || '').toLowerCase().replace('.', '');
    if (['ppt', 'pptx', 'presentation', 'key'].includes(t)) {
        return {
            bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            icon: '📊',
            label: 'PPTX',
        };
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'documentation'].includes(t)) {
        return {
            bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            icon: '📄',
            label: 'PDF',
        };
    }
    if (['fig', 'sketch', 'xd', 'psd', 'ai', 'design'].includes(t)) {
        return {
            bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            icon: '🎨',
            label: 'FIG',
        };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'code', 'archive'].includes(t)) {
        return {
            bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            icon: '📦',
            label: 'ZIP',
        };
    }
    if (['mp4', 'mov', 'webm', 'avi', 'video'].includes(t)) {
        return {
            bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            icon: '🎥',
            label: 'MP4',
        };
    }
    return {
        bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        icon: '📁',
        label: t.toUpperCase() || 'FILE',
    };
};

const formatDate = (isoString) => {
    if (!isoString) return 'Date unavailable';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return 'Date unavailable';
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatAgo = (isoString) => {
    if (!isoString) return 'Recently';
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

export default function TeamMaterials() {
    // --- STATE ---
    const [materials, setMaterials] = useState([]);
    const [recentMaterials, setRecentMaterials] = useState([]);
    const [storage, setStorage] = useState({
        usedBytes: 0,
        usedFormatted: '0 MB',
        totalBytes: 10737418240,
        totalFormatted: '10 GB',
        usagePercentage: 0,
        fileCount: 0,
    });
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Loading & Action States
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [bannerMessage, setBannerMessage] = useState(null);

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadTeamId, setUploadTeamId] = useState('');
    const [uploadCategory, setUploadCategory] = useState('General');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Delete confirmation
    const [deletingMaterial, setDeletingMaterial] = useState(null);

    // --- INITIAL DATA FETCH ---
    const loadAssignedTeams = useCallback(async () => {
        try {
            const teams = await fetchTeams();
            setAssignedTeams(teams);
            if (teams.length > 0 && !uploadTeamId) {
                setUploadTeamId(teams[0].id);
            }
        } catch (err) {
            console.error('Failed to load assigned teams:', err);
        }
    }, [uploadTeamId]);

    const loadStorage = useCallback(async () => {
        try {
            const data = await fetchStorageOverview();
            setStorage(data);
        } catch (err) {
            console.error('Failed to load storage:', err);
        }
    }, []);

    const loadRecentMaterials = useCallback(async () => {
        try {
            const data = await fetchRecentMaterials();
            setRecentMaterials(data);
        } catch (err) {
            console.error('Failed to load recent materials:', err);
        }
    }, []);

    const loadMaterialsList = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pagination.limit,
                search: searchQuery.trim() || undefined,
                teamId: selectedTeamId || undefined,
                category: selectedCategory !== 'All' ? selectedCategory : undefined,
            };
            const res = await fetchMaterials(params);
            setMaterials(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to load materials:', err);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, searchQuery, selectedTeamId, selectedCategory]);

    // Load initial data
    useEffect(() => {
        loadAssignedTeams();
        loadStorage();
        loadRecentMaterials();
    }, [loadAssignedTeams, loadStorage, loadRecentMaterials]);

    // Debounced or direct search & filter updates
    useEffect(() => {
        const timer = setTimeout(() => {
            loadMaterialsList(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedTeamId, selectedCategory]);

    // Refresh all data
    const refreshAll = useCallback(() => {
        loadMaterialsList(pagination.page);
        loadRecentMaterials();
        loadStorage();
    }, [loadMaterialsList, loadRecentMaterials, loadStorage, pagination.page]);

    // --- FILE UPLOAD HANDLER ---
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            setUploadError('Selected file exceeds maximum allowed limit of 25 MB.');
            setUploadFile(null);
            return;
        }

        setUploadFile(file);
        setUploadError('');

        // Auto-detect category from file extension
        const ext = file.name.split('.').pop().toLowerCase();
        if (['ppt', 'pptx', 'key'].includes(ext)) setUploadCategory('Presentation');
        else if (['pdf', 'doc', 'docx', 'md', 'txt'].includes(ext)) setUploadCategory('Documentation');
        else if (['fig', 'sketch', 'xd', 'psd', 'ai'].includes(ext)) setUploadCategory('Design');
        else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) setUploadCategory('Code & Archives');
        else if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) setUploadCategory('Demo Video');
        else setUploadCategory('General');
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadFile) {
            setUploadError('Please choose a file to upload.');
            return;
        }
        if (!uploadTeamId) {
            setUploadError('Please select a team for this material.');
            return;
        }

        setIsUploading(true);
        setUploadProgress(10);
        setUploadError('');

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('teamId', uploadTeamId);
        formData.append('category', uploadCategory);
        if (uploadDescription.trim()) {
            formData.append('description', uploadDescription.trim());
        }

        try {
            await uploadMaterial(formData, (progress) => {
                setUploadProgress(progress);
            });

            setIsUploadModalOpen(false);
            setUploadFile(null);
            setUploadDescription('');
            setUploadProgress(0);
            setBannerMessage({ type: 'success', text: 'Material uploaded successfully!' });
            setTimeout(() => setBannerMessage(null), 4000);

            // Invalidate and refresh cache
            refreshAll();
        } catch (err) {
            setUploadError(err.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    // --- DOWNLOAD HANDLER ---
    const handleDownload = async (material) => {
        setActionLoading((prev) => ({ ...prev, [material.id]: 'downloading' }));
        try {
            await downloadMaterial(material.id, material.originalName || material.name);
        } catch (err) {
            setBannerMessage({ type: 'error', text: 'Failed to download file. Please check your permissions.' });
            setTimeout(() => setBannerMessage(null), 4000);
        } finally {
            setActionLoading((prev) => ({ ...prev, [material.id]: null }));
        }
    };

    // --- DELETE HANDLER ---
    const handleDelete = async () => {
        if (!deletingMaterial) return;
        const id = deletingMaterial.id;
        setActionLoading((prev) => ({ ...prev, [id]: 'deleting' }));
        try {
            await deleteMaterial(id);
            setDeletingMaterial(null);
            setBannerMessage({ type: 'success', text: `"${deletingMaterial.name}" deleted successfully.` });
            setTimeout(() => setBannerMessage(null), 4000);

            // Invalidate and refresh cache
            refreshAll();
        } catch (err) {
            setBannerMessage({ type: 'error', text: err.message || 'Failed to delete file.' });
            setTimeout(() => setBannerMessage(null), 4000);
        } finally {
            setActionLoading((prev) => ({ ...prev, [id]: null }));
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500 text-slate-800 dark:text-white">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 flex-none px-1">
                <div className="space-y-1.5">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Team Materials
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                        Manage and share files securely across hackathon teams.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative group flex-1 md:min-w-[280px]">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search files by name or type…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-900/70 border border-slate-300 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 shadow-sm transition-all"
                        />
                    </div>

                    {/* Upload File Button */}
                    <button
                        onClick={() => {
                            setUploadError('');
                            setIsUploadModalOpen(true);
                        }}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Upload File</span>
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {bannerMessage && (
                <div
                    className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center justify-between transition-all ${
                        bannerMessage.type === 'success'
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                >
                    <span>{bannerMessage.text}</span>
                    <button onClick={() => setBannerMessage(null)} className="text-xs uppercase hover:underline">Dismiss</button>
                </div>
            )}

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10">
                {/* Top Cards: Storage Overview & Recent Uploads */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Storage Overview Card */}
                    <div className="glass border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-navy-900/50 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                    Storage Overview
                                </h3>
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/15 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-500/20">
                                    {storage.fileCount} {storage.fileCount === 1 ? 'file' : 'files'}
                                </span>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-gray-400 mb-6">
                                Calculated across your assigned team workspace files.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-400">Used Storage</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                        {storage.usedFormatted}
                                        <span className="text-xs font-medium text-slate-500 dark:text-gray-400 ml-1.5">/ {storage.totalFormatted}</span>
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-3 w-full bg-slate-100 dark:bg-navy-950 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
                                        style={{ width: `${Math.min(100, Math.max(storage.usagePercentage > 0 ? 3 : 0, storage.usagePercentage))}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                            <span>Usage rate: <strong className="text-purple-600 dark:text-purple-400 font-bold">{storage.usagePercentage}% Used</strong></span>
                            <span>Limit: 10 GB</span>
                        </div>
                    </div>

                    {/* Recent Uploads Card */}
                    <div className="lg:col-span-2 glass border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-navy-900/50 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Recent Uploads
                            </h3>
                            <span className="text-xs font-medium text-slate-500 dark:text-gray-400">Latest 5 files</span>
                        </div>

                        <div className="space-y-2.5 flex-1 min-h-[140px]">
                            {recentMaterials.length > 0 ? (
                                recentMaterials.map((file) => {
                                    const badge = getFileTypeBadge(file.type, file.mimeType);
                                    return (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-white/5 hover:border-purple-500/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold border ${badge.bg}`}>
                                                    {badge.icon}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[240px] sm:max-w-[340px]">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                                                        {file.teamName} · {formatAgo(file.uploadedAt)} · {file.sizeFormatted}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDownload(file)}
                                                disabled={actionLoading[file.id] === 'downloading'}
                                                className="px-3 py-1.5 bg-slate-200/70 dark:bg-white/10 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold text-slate-700 dark:text-gray-300 transition-all flex items-center gap-1.5 shrink-0"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                <span>Download</span>
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex items-center justify-center p-6 text-center text-sm text-slate-400 dark:text-gray-500 italic">
                                    No recent uploads yet. Click "Upload File" to share materials with teams.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* All Files Table Section */}
                <div className="glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-navy-900/50 shadow-sm overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-6 bg-purple-600 rounded-full"></span>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Files</h2>
                            <span className="text-xs font-bold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                {pagination.total} total
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Team Filter */}
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 dark:text-gray-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                            >
                                <option value="">All Assigned Teams</option>
                                {assignedTeams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>

                            {/* Category Filter */}
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 dark:text-gray-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                            >
                                <option value="All">All Categories</option>
                                <option value="Presentation">Presentation</option>
                                <option value="Documentation">Documentation</option>
                                <option value="Design">Design</option>
                                <option value="Code & Archives">Code & Archives</option>
                                <option value="Demo Video">Demo Video</option>
                                <option value="General">General</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 dark:text-gray-300">
                            <thead className="bg-slate-50/80 dark:bg-navy-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400 border-b border-slate-200 dark:border-white/10">
                                <tr>
                                    <th scope="col" className="py-3.5 px-6">File Name</th>
                                    <th scope="col" className="py-3.5 px-6">Team</th>
                                    <th scope="col" className="py-3.5 px-6">Uploaded By</th>
                                    <th scope="col" className="py-3.5 px-6">Category / Type</th>
                                    <th scope="col" className="py-3.5 px-6">File Size</th>
                                    <th scope="col" className="py-3.5 px-6">Uploaded Date</th>
                                    <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-48"></div></td>
                                            <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-24"></div></td>
                                            <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-24"></div></td>
                                            <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-20"></div></td>
                                            <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-16"></div></td>
                                            <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-24"></div></td>
                                            <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-16 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : materials.length > 0 ? (
                                    materials.map((file) => {
                                        const badge = getFileTypeBadge(file.type, file.mimeType);
                                        return (
                                            <tr
                                                key={file.id}
                                                className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                                            >
                                                {/* File Name */}
                                                <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold border ${badge.bg}`}>
                                                            {badge.icon}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="font-bold truncate max-w-[220px] lg:max-w-[300px]" title={file.name}>
                                                                {file.name}
                                                            </p>
                                                            {file.description && (
                                                                <p className="text-xs text-slate-500 dark:text-gray-400 truncate max-w-[220px]">
                                                                    {file.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Team */}
                                                <td className="py-4 px-6">
                                                    <span className="font-semibold text-purple-700 dark:text-purple-300">
                                                        {file.teamName}
                                                    </span>
                                                </td>

                                                {/* Uploaded By */}
                                                <td className="py-4 px-6 text-slate-600 dark:text-gray-400">
                                                    {file.uploadedByName || file.uploadedBy?.name || 'Mentor'}
                                                </td>

                                                {/* Category */}
                                                <td className="py-4 px-6">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${badge.bg}`}>
                                                        {file.category || badge.label}
                                                    </span>
                                                </td>

                                                {/* Size */}
                                                <td className="py-4 px-6 font-mono text-xs text-slate-600 dark:text-gray-400">
                                                    {file.sizeFormatted}
                                                </td>

                                                {/* Date */}
                                                <td className="py-4 px-6 text-xs text-slate-500 dark:text-gray-400">
                                                    {formatDate(file.uploadedAt || file.createdAt)}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleDownload(file)}
                                                            disabled={actionLoading[file.id] === 'downloading'}
                                                            title="Download File"
                                                            className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-purple-600 hover:text-white text-slate-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                        </button>

                                                        <button
                                                            onClick={() => setDeletingMaterial(file)}
                                                            title="Delete File"
                                                            className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-gray-300 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-16 text-center text-slate-400 dark:text-gray-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <svg className="w-10 h-10 text-slate-300 dark:text-white/20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                </svg>
                                                <p className="font-semibold text-slate-600 dark:text-gray-400">No materials found.</p>
                                                <p className="text-xs text-slate-400 dark:text-gray-500">
                                                    {searchQuery ? 'Try clearing your search filters.' : 'Upload presentation decks, templates, or documentation to get started.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                            <span>
                                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total items)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => loadMaterialsList(pagination.page - 1)}
                                    disabled={pagination.page <= 1 || loading}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-navy-900 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-gray-300 disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => loadMaterialsList(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages || loading}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-navy-900 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-gray-300 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- UPLOAD FILE MODAL --- */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-strong border border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-8 bg-white dark:bg-navy-900 w-full max-w-lg shadow-2xl relative">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Upload Team Material</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Upload documents, code archives, or design assets.</p>
                            </div>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {uploadError && (
                            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                                {uploadError}
                            </div>
                        )}

                        <form onSubmit={handleUploadSubmit} className="space-y-4">
                            {/* Team Selection */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                                    Target Assigned Team <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    value={uploadTeamId}
                                    onChange={(e) => setUploadTeamId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                                >
                                    {assignedTeams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name} ({team.domain || 'General'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                                    Category
                                </label>
                                <select
                                    value={uploadCategory}
                                    onChange={(e) => setUploadCategory(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                                >
                                    <option value="Presentation">Presentation (.pptx, .ppt, .key)</option>
                                    <option value="Documentation">Documentation (.pdf, .doc, .docx, .md)</option>
                                    <option value="Design">Design (.fig, .sketch, .xd, .psd)</option>
                                    <option value="Code & Archives">Code & Archives (.zip, .rar, .tar)</option>
                                    <option value="Demo Video">Demo Video (.mp4, .mov, .webm)</option>
                                    <option value="General">General Material</option>
                                </select>
                            </div>

                            {/* File Drag and Drop Zone */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                                    Choose File <span className="text-rose-500">*</span>
                                </label>
                                <div className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-purple-500 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-navy-950/50 cursor-pointer relative transition-colors">
                                    <input
                                        type="file"
                                        required
                                        onChange={handleFileSelect}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {uploadFile ? (
                                        <div className="flex flex-col items-center">
                                            <span className="text-3xl mb-2">📄</span>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">{uploadFile.name}</p>
                                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-mono font-bold">
                                                {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                            <span className="mt-2 text-xs text-slate-400">Click or drag another file to replace</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <svg className="w-10 h-10 text-slate-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="text-sm font-bold text-slate-700 dark:text-gray-300">Click to browse or drop file here</p>
                                            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">PDF, PPTX, FIG, ZIP, MP4 up to 25 MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Optional Description */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                                    Description / Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={uploadDescription}
                                    onChange={(e) => setUploadDescription(e.target.value)}
                                    placeholder="e.g., Sprint 2 architectural blueprint"
                                    className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>

                            {/* Progress bar if uploading */}
                            {isUploading && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                                        <span>Uploading file to secure storage…</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-navy-950 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-600 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(false)}
                                    disabled={isUploading}
                                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-navy-900 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-sm text-slate-700 dark:text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading || !uploadFile}
                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Uploading…</span>
                                        </>
                                    ) : (
                                        <span>Confirm Upload</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- DELETE CONFIRMATION MODAL --- */}
            {deletingMaterial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-strong border border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-8 bg-white dark:bg-navy-900 w-full max-w-md shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-xl mb-4 font-bold border border-rose-500/20">
                            ⚠️
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Material?</h3>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">
                            Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">"{deletingMaterial.name}"</strong>? This will remove the file from storage.
                        </p>

                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
                            <button
                                onClick={() => setDeletingMaterial(null)}
                                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-navy-900 font-bold text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading[deletingMaterial.id] === 'deleting'}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
                            >
                                {actionLoading[deletingMaterial.id] === 'deleting' ? 'Deleting…' : 'Delete File'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
