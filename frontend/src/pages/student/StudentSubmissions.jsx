import React, { useState, useEffect } from 'react';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const statusClasses = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('evaluat') || normalized.includes('approv') || normalized.includes('accept')) {
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    }
    if (normalized.includes('reject') || normalized.includes('declin')) {
        return 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400';
    }
    if (normalized.includes('review') || normalized.includes('pending') || normalized.includes('submit')) {
        return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400';
    }
    return 'border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-400';
};

const StudentSubmissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const loadSubmissions = async () => {
            setIsLoading(true);
            try {
                const data = await fetchSubmissions();
                if (!Array.isArray(data)) {
                    throw new Error('Unexpected submissions response');
                }
                setSubmissions(data);
                setLoadError('');
            } catch (error) {
                console.error('Failed to fetch submissions:', error);
                setLoadError('Your submissions could not be loaded. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        loadSubmissions();
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-navy-950 px-4 py-6 md:px-8 text-slate-900 dark:text-white transition-colors duration-200">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* 1. Header (Admin Standard) */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            My Submissions
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Track submitted repositories, mentor reviews, and score evaluation results.
                        </p>
                    </div>
                </header>

                {/* 2. Submissions Body */}
                {isLoading ? (
                    <div role="status" aria-label="Loading submissions" className="grid gap-6 md:grid-cols-2">
                        {[0, 1].map((item) => (
                            <div key={item} className="h-56 animate-pulse rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900" />
                        ))}
                    </div>
                ) : loadError ? (
                    <div role="alert" className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-navy-900 p-8 text-center text-sm text-rose-600 dark:text-rose-400 shadow-xs">
                        {loadError}
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 p-12 text-center shadow-xs">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#7C65F6] dark:text-purple-400" aria-hidden="true">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2Z" />
                            </svg>
                        </div>
                        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No submissions yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Submitted projects will appear here once your team submits deliverables for active hackathons.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {submissions.map((submission) => {
                            const resources = Array.isArray(submission.resources) ? submission.resources : [];
                            const status = submission.status || 'Submitted';
                            const hasScore = submission.score !== null && submission.score !== undefined && submission.score !== '';

                            return (
                                <article
                                    key={submission.id}
                                    className="flex h-full flex-col rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs transition-all hover:shadow-md"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="break-words text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                                {submission.project || 'Project Title'}
                                            </h2>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{submission.hackathon || 'Hackathon'}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClasses(submission.status)}`}>
                                            {status}
                                        </span>
                                    </div>

                                    {submission.desc ? (
                                        <p className="mt-4 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                            {submission.desc}
                                        </p>
                                    ) : null}

                                    {resources.length > 0 ? (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {resources.map((resource, index) => (
                                                <span
                                                    key={`${resource}-${index}`}
                                                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                                                >
                                                    {resource}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}

                                    {submission.feedback ? (
                                        <div className="mt-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-navy-950/60 p-4">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mentor feedback</p>
                                            <p className="mt-1 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                                {submission.feedback}
                                            </p>
                                        </div>
                                    ) : null}

                                    <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted</p>
                                            <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{submission.submittedAt || 'Recently'}</p>
                                        </div>
                                        {hasScore ? (
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</p>
                                                <p className="mt-0.5 text-base font-bold text-[#7C65F6] dark:text-purple-400">{submission.score}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentSubmissions;
