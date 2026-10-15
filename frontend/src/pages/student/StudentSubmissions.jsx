import React, { useState, useEffect } from 'react';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const StudentSubmissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const loadSubmissions = async () => {
            setIsLoading(true);
            try {
                const data = await fetchSubmissions();
                setSubmissions(data);
                setLoadError('');
            } catch (error) {
                console.error("Failed to fetch submissions:", error);
                setLoadError('Your submissions could not be loaded. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        loadSubmissions();
    }, []);

    const StatusBadge = ({ status }) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border
            ${status === 'Evaluated'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-white/5 text-gray-400 border-white/10'}`}>
            {status}
        </span>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-20">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    My <span className="gradient-text">Submissions</span>
                </h1>
                <p className="text-gray-400">Track and manage your hackathon projects and evaluations.</p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="glass p-6 rounded-2xl border border-white/5 animate-pulse h-64"></div>
                    ))}
                </div>
            ) : loadError ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-red-800">{loadError}</div>
            ) : submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-dashed border-white/10">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Submissions Yet</h3>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto">You haven't submitted any projects yet. Start participating in hackathons to build your portfolio.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {submissions.map((sub) => (
                        <div key={sub.id} className="glass p-6 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all duration-300 flex flex-col justify-between h-full group">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors w-11/12 leading-tight">{sub.project || 'Project title unavailable'}</h3>
                                        <p className="text-sm text-gray-400 mt-2">{sub.hackathon || 'Hackathon name unavailable'}</p>
                                    </div>
                                    <StatusBadge status={sub.status || 'Status unavailable'} />
                                </div>

                                <div className="space-y-6 mb-8">
                                    <div className="flex flex-wrap gap-2">
                                        {sub.resources.map((res, i) => (
                                            <span key={i} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-gray-400 transition-colors">
                                                {res}
                                            </span>
                                        ))}
                                    </div>

                                    {sub.feedback && (
                                        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                                            <p className="text-xs font-semibold text-gray-500 mb-1">Mentor Feedback</p>
                                            <p className="text-sm text-white leading-relaxed">"{sub.feedback}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-xs text-gray-400">{sub.submittedAt || 'Submission date unavailable'}</span>
                                </div>
                                {sub.score && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Score</p>
                                        <p className="text-lg font-bold text-purple-400">{sub.score}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentSubmissions;
