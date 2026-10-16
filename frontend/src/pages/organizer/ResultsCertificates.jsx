import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchResultsAndCertificates, publishResults, issueCertificates } from '../../services/organizer/resultsCertificatesApi';
import { fetchMyHackathons } from '../../services/organizer/myHackathonsApi';
import { usePlatformSettings } from '../../context/PlatformSettingsContext';
import apiClient from '../../api/api';

const ResultsCertificates = () => {
    const { publicLeaderboard, autoGenWinner, autoGenParticipant, prefix } = usePlatformSettings();
    // --- State Management ---
    const [allHackathons, setAllHackathons] = useState([]);
    const [selectedHackathonId, setSelectedHackathonId] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isEditingRankings, setIsEditingRankings] = useState(false);
    const [issuingState, setIssuingState] = useState({}); // { [templateId]: boolean }
    const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
    const [publishStatus, setPublishStatus] = useState('idle'); // idle, publishing, published
    const [statusMessage, setStatusMessage] = useState('');

    // --- Load Hackathons ---
    useEffect(() => {
        const loadList = async () => {
            try {
                const list = await fetchMyHackathons();
                setAllHackathons(list || []);
                if (list && list.length > 0) {
                    setSelectedHackathonId(list[0].id);
                }
            } catch (err) {
                console.warn("Failed to load hackathons", err);
            }
        };
        loadList();
    }, []);

    // --- Fetch Data for Selected Hackathon ---
    const fetchInitialData = useCallback(async (hackId) => {
        setIsLoading(true);
        try {
            const data = await fetchResultsAndCertificates(hackId);
            setLeaderboard(data.leaderboard || []);
            setTemplates(data.templates || []);
        } catch (error) {
            console.error("Failed to load results and certificates:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedHackathonId) {
            fetchInitialData(selectedHackathonId);
        }
    }, [selectedHackathonId, fetchInitialData]);

    // --- Action Handlers ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedLeaderboard = useMemo(() => {
        let sortableItems = [...leaderboard];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [leaderboard, sortConfig]);

    const handlePublishResults = async () => {
        if (publishStatus === 'published' || !selectedHackathonId) return;

        setIsPublishing(true);
        setPublishStatus('publishing');
        setStatusMessage('');

        try {
            await publishResults(selectedHackathonId);
            
            // Trigger auto-issue pipeline if enabled by platform settings
            if (autoGenWinner || autoGenParticipant) {
                try {
                    await apiClient.post(`/certificates/auto-issue/${selectedHackathonId}`);
                } catch (autoErr) {
                    console.warn("Auto-issue pipeline notification:", autoErr);
                }
            }

            setPublishStatus('published');
            setStatusMessage('Results published and finalized successfully!');
            setTimeout(() => setStatusMessage(''), 5000);
        } catch (error) {
            console.error("Publishing failed:", error);
            setPublishStatus('idle');
            setStatusMessage('Publishing failed. Please try again.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleIssueCertificate = async (template) => {
        if (template.status !== 'Ready') return;

        setIssuingState(prev => ({ ...prev, [template.id]: true }));

        try {
            const result = await issueCertificates(template, leaderboard, selectedHackathonId);
            setLeaderboard(result.updatedLeaderboard);
            setStatusMessage(`Certificates for "${template.title}" issued successfully!`);
            setTimeout(() => setStatusMessage(''), 5000);
        } catch (error) {
            console.error("Failed to issue certificates:", error);
            setStatusMessage('Certificate issuance encountered an error.');
        } finally {
            setIssuingState(prev => ({ ...prev, [template.id]: false }));
        }
    };

    const handleExportCSV = () => {
        const headers = ['Rank,Team,Project,Score,Tier,Status'];
        const rows = leaderboard.map(row =>
            `${row.rank},"${row.team}","${row.project}",${row.score},${row.tier},${row.certStatus}`
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `hackathon_results_${selectedHackathonId || 'export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleScoreChange = (teamId, newScore) => {
        setLeaderboard(prev => prev.map(item => item.teamId === teamId ? { ...item, score: Number(newScore) } : item));
    };

    const handleSaveRankings = () => {
        const sorted = [...leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));
        const recalculated = sorted.map((item, idx) => ({
            ...item,
            rank: idx + 1,
            tier: idx === 0 ? 'Grand Winner' : idx === 1 ? '1st Runner Up' : idx === 2 ? '2nd Runner Up' : 'Participant'
        }));
        setLeaderboard(recalculated);
        setIsEditingRankings(false);
        setStatusMessage("Rankings recalculated and saved locally!");
        setTimeout(() => setStatusMessage(''), 4000);
    };

    const handleEditRankings = () => {
        if (isEditingRankings) {
            handleSaveRankings();
        } else {
            setIsEditingRankings(true);
        }
    };

    // --- Icons ---
    const Icon = ({ name, className }) => {
        const icons = {
            Eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
            Upload: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
            Download: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
            Edit: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
            Award: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />,
            Send: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
            MoreVertical: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />,
            Check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
            Sort: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        };
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icons[name]}
            </svg>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="title-primary">Results & Certificates</h1>
                    <p className="description-primary">Publish final rankings and issue digital credentials to participants</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {allHackathons.length > 0 && (
                        <select
                            value={selectedHackathonId}
                            onChange={(e) => setSelectedHackathonId(e.target.value)}
                            className="bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500"
                        >
                            {allHackathons.map(h => (
                                <option key={h.id} value={h.id} className="bg-gray-900 text-white">
                                    {h.title}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => window.open(`/hackathon/${selectedHackathonId || ''}`, '_blank')}
                    >
                        <Icon name="Eye" className="w-4 h-4" />
                        Preview Event Page
                    </button>
                    <button
                        onClick={handlePublishResults}
                        disabled={isPublishing || publishStatus === 'published'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                            ${publishStatus === 'published'
                                ? 'bg-green-600/20 text-green-400 border border-green-600/50 shadow-green-900/20'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
                            }`}
                    >
                        {isPublishing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Publishing...
                            </>
                        ) : publishStatus === 'published' ? (
                            <>
                                <Icon name="Check" className="w-4 h-4" />
                                Published
                            </>
                        ) : (
                            <>
                                <Icon name="Upload" className="w-4 h-4" />
                                Publish Results
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {statusMessage && (
                <div className="p-4 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-between animate-in fade-in">
                    <span>{statusMessage}</span>
                    <button onClick={() => setStatusMessage('')} className="text-cyan-400 hover:text-cyan-200 text-sm">✕</button>
                </div>
            )}

            {/* Final Leaderboard Section */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Icon name="Award" className="w-6 h-6 text-yellow-500" />
                            Final Leaderboard
                        </h2>
                        {!publicLeaderboard && (
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                                🔒 Hidden from public by platform policy
                            </span>
                        )}
                        {isLoading && <span className="text-xs text-cyan-400 animate-pulse bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/20">Syncing...</span>}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5 active:scale-95"
                        >
                            <Icon name="Download" className="w-3.5 h-3.5" />
                            Export CSV
                        </button>
                        <button
                            onClick={handleEditRankings}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border active:scale-95 ${
                                isEditingRankings
                                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 shadow-sm'
                                    : 'text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/5'
                            }`}
                        >
                            <Icon name={isEditingRankings ? "Check" : "Edit"} className="w-3.5 h-3.5" />
                            {isEditingRankings ? "Save Rankings" : "Edit Rankings"}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 label-protocol uppercase">
                                <th
                                    className="px-6 py-4 cursor-pointer hover:text-white group transition-colors"
                                    onClick={() => handleSort('rank')}
                                >
                                    <div className="flex items-center gap-1">
                                        Rank
                                        <Icon name="Sort" className={`w-3 h-3 transition-opacity ${sortConfig.key === 'rank' ? 'opacity-100 text-cyan-400' : 'opacity-0 group-hover:opacity-50'}`} />
                                    </div>
                                </th>
                                <th className="px-6 py-4">Team Name</th>
                                <th className="px-6 py-4">Project</th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:text-white group transition-colors"
                                    onClick={() => handleSort('score')}
                                >
                                    <div className="flex items-center gap-1">
                                        Total Score
                                        <Icon name="Sort" className={`w-3 h-3 transition-opacity ${sortConfig.key === 'score' ? 'opacity-100 text-cyan-400' : 'opacity-0 group-hover:opacity-50'}`} />
                                    </div>
                                </th>
                                <th className="px-6 py-4">Prize Tier</th>
                                <th className="px-6 py-4">Certificates</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}><td colSpan="7" className="py-8 bg-white/2 animate-pulse"></td></tr>
                                ))
                            ) : (
                                sortedLeaderboard.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                        {/* Rank */}
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110
                                                ${item.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                    item.rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                                                        item.rank === 3 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' :
                                                            'bg-white/5 text-gray-400'}
                                            `}>
                                                {item.rank}
                                            </div>
                                        </td>
                                        {/* Team Name */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
                                                    {item.logo}
                                                </div>
                                                <span className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{item.team}</span>
                                            </div>
                                        </td>
                                        {/* Project */}
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            {item.project}
                                        </td>
                                        {/* Score */}
                                        <td className="px-6 py-4">
                                            {isEditingRankings ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={item.score}
                                                    onChange={(e) => handleScoreChange(item.teamId, e.target.value)}
                                                    className="w-20 bg-black/60 border border-cyan-500/40 rounded px-2 py-1 text-cyan-300 font-bold text-sm outline-none focus:border-cyan-400"
                                                />
                                            ) : (
                                                <span className="text-cyan-400 font-bold">{item.score}/{item.maxScore || 100}</span>
                                            )}
                                        </td>
                                        {/* Tier */}
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium border whitespace-nowrap
                                                ${item.tier === 'Grand Winner' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    item.tier.includes('Runner Up') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-purple-500/10 text-purple-400 border-purple-500/20'}
                                            `}>
                                                {item.tier}
                                            </span>
                                        </td>
                                        {/* Cert Status */}
                                        <td className="px-6 py-4">
                                            <span className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-300
                                                ${item.certStatus === 'Issued' ? 'text-emerald-400' : 'text-gray-400'}
                                            `}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${item.certStatus === 'Issued' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-gray-400'}`}></span>
                                                {item.certStatus}
                                            </span>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                                                <Icon name="MoreVertical" className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Certificate Templates Section */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h2 className="text-xl font-bold text-white">Certificate Templates</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        {autoGenWinner && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <span>⚡ Winner Auto-Issuance Active ({prefix})</span>
                            </span>
                        )}
                        {autoGenParticipant && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                <span>⚡ Participant Auto-Issuance Active</span>
                            </span>
                        )}
                    </div>
                </div>
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass h-64 rounded-2xl border border-white/5 animate-pulse"></div>
                        <div className="glass h-64 rounded-2xl border border-white/5 animate-pulse"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {templates.map((template) => (
                            <div key={template.id} className="glass p-6 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-white/10
                                        ${template.iconColor === 'yellow'
                                            ? 'bg-gradient-to-br from-yellow-600/20 to-orange-600/20 text-yellow-400'
                                            : 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 text-blue-400'
                                        }`}>
                                        <Icon name="Award" className="w-6 h-6" />
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border
                                        ${template.status === 'Ready'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {template.status}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{template.name}</h3>
                                <p className="text-sm text-gray-400 mb-6">{template.description}</p>

                                <div className="flex gap-4 mb-6 text-xs text-gray-300">
                                    <div>
                                        <span className="block text-gray-500 mb-0.5 uppercase tracking-wider text-[10px] font-bold">Type</span>
                                        <span className="font-medium">{template.type}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 mb-0.5 uppercase tracking-wider text-[10px] font-bold">Recipients</span>
                                        <span className="font-medium">{template.recipients}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95">
                                        <Icon name="Edit" className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleIssueCertificate(template)}
                                        disabled={template.status !== 'Ready' || issuingState[template.id]}
                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg active:scale-95
                                            ${template.status === 'Ready'
                                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20'
                                                : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10 shadow-none hover:bg-white/5 opacity-50'
                                            }
                                        `}
                                    >
                                        {issuingState[template.id] ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Issuing...
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="Send" className="w-4 h-4" />
                                                Issue
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultsCertificates;
