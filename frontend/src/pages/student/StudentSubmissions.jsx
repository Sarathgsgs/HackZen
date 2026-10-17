import React, { useState, useEffect } from 'react';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const statusClasses = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('evaluat') || normalized.includes('approv') || normalized.includes('accept')) {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (normalized.includes('reject') || normalized.includes('declin')) {
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }
    if (normalized.includes('review') || normalized.includes('pending') || normalized.includes('submit')) {
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }
    return 'border-[#e5dff0] bg-[#f8f6fc] text-[#6e6882]';
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
        <div className="min-h-full space-y-7 bg-[#f3f0f8] px-4 pb-12 pt-6 text-[#181524] sm:px-6 sm:pt-8 lg:px-8">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7a7098]">Your work</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1d1a2a] sm:text-4xl">My Submissions</h1>
                <p className="mt-2 text-sm text-[#6e6882]">Track your submitted projects and available evaluation details.</p>
            </header>

            {isLoading ? (
                <div role="status" aria-label="Loading submissions" className="grid gap-5 md:grid-cols-2">
                    {[0, 1].map((item) => (
                        <div key={item} className="h-56 animate-pulse rounded-[20px] border border-[#e5dff0] bg-white" />
                    ))}
                </div>
            ) : loadError ? (
                <div role="alert" className="rounded-[20px] border border-rose-200 bg-white p-6 text-sm text-rose-700 shadow-[0_8px_20px_rgba(33,22,58,0.03)]">
                    {loadError}
                </div>
            ) : submissions.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#d6d0e9] bg-white p-10 text-center shadow-[0_8px_20px_rgba(33,22,58,0.03)]">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f1edfb] text-[#5c46c7]" aria-hidden="true">
                        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a2 2 0 0 1 1.414.586l4.414 4.414A2 2 0 0 1 19 9.414V19a2 2 0 0 1-2 2Z" />
                        </svg>
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-[#1d1a2a]">No submissions yet</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-[#6e6882]">Submitted projects will appear here when they are available for your teams.</p>
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2">
                    {submissions.map((submission) => {
                        const resources = Array.isArray(submission.resources) ? submission.resources : [];
                        const status = submission.status || 'Status unavailable';
                        const hasScore = submission.score !== null && submission.score !== undefined && submission.score !== '';

                        return (
                            <article key={submission.id} className="flex h-full flex-col rounded-[20px] border border-[#e5dff0] bg-white p-5 shadow-[0_8px_20px_rgba(33,22,58,0.03)] sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="break-words text-lg font-bold text-[#242136] sm:text-xl">
                                            {submission.project || 'Project title unavailable'}
                                        </h2>
                                        <p className="mt-1 text-sm text-[#6e6882]">{submission.hackathon || 'Hackathon name unavailable'}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${statusClasses(submission.status)}`}>
                                        {status}
                                    </span>
                                </div>

                                {submission.desc ? (
                                    <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-[#5f5a6d]">{submission.desc}</p>
                                ) : null}

                                {resources.length > 0 ? (
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {resources.map((resource, index) => (
                                            <span key={`${resource}-${index}`} className="rounded-lg border border-[#e8e2f2] bg-[#f8f6fc] px-3 py-1.5 text-xs font-medium text-[#5f5a6d]">
                                                {resource}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}

                                {submission.feedback ? (
                                    <div className="mt-5 rounded-xl border border-[#e8e2f2] bg-[#f8f6fc] p-4">
                                        <p className="text-xs font-semibold text-[#7a7098]">Mentor feedback</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#373548]">{submission.feedback}</p>
                                    </div>
                                ) : null}

                                <div className="mt-auto flex items-end justify-between gap-4 border-t border-[#f0ecf6] pt-4">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a849a]">Submitted</p>
                                        <p className="mt-1 text-sm text-[#5f5a6d]">{submission.submittedAt || 'Submission date unavailable'}</p>
                                    </div>
                                    {hasScore ? (
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a849a]">Score</p>
                                            <p className="mt-1 text-lg font-bold text-[#4d3bb5]">{submission.score}</p>
                                        </div>
                                    ) : null}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentSubmissions;
