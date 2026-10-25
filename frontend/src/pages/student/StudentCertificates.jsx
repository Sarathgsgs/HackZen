import React, { useEffect, useMemo, useState } from 'react';
import { fetchCertificates, verifyCertificate } from '../../services/student/certificatesApi';

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Date unavailable';

const StudentCertificates = () => {
    const [certId, setCertId] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifiedResult, setVerifiedResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [certificates, setCertificates] = useState([]);

    useEffect(() => {
        let active = true;
        fetchCertificates()
            .then((data) => { if (active) { setCertificates(data); setLoadError(''); } })
            .catch(() => { if (active) setLoadError('Your certificates could not be loaded. Please try again.'); })
            .finally(() => { if (active) setIsLoading(false); });
        return () => { active = false; };
    }, []);

    const filteredCertificates = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return certificates.filter((certificate) => [certificate.id, certificate.hackathonId]
            .some((value) => String(value || '').toLowerCase().includes(query)));
    }, [certificates, searchQuery]);

    const handleVerify = async () => {
        if (!certId.trim()) return;
        setIsVerifying(true);
        setVerifiedResult(null);
        setVerifiedResult(await verifyCertificate(certId.trim()));
        setIsVerifying(false);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-navy-950 px-4 py-6 md:px-8 text-slate-900 dark:text-white transition-colors duration-200">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* 1. Header (Admin Standard) */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            My Certificates
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Verified participation credentials, completion badges, and authenticity verification.
                        </p>
                    </div>
                </header>

                {/* 2. Certificate Records Listing */}
                <section className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Issued Credentials</span>
                            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{certificates.length}</p>
                        </div>
                        <div className="w-full sm:max-w-xs relative">
                            <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m21 21-4.35-4.35m1.1-5.4a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                            </svg>
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search by certificate ID..."
                                aria-label="Search certificates"
                                className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 pl-10 pr-4 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <p role="status" className="py-12 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">Loading certificate records…</p>
                    ) : loadError ? (
                        <p role="alert" className="mt-6 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4 text-xs sm:text-sm text-rose-700 dark:text-rose-400">{loadError}</p>
                    ) : filteredCertificates.length ? (
                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            {filteredCertificates.map((certificate) => (
                                <article
                                    key={certificate.id || `${certificate.hackathonId}-${certificate.issuedAt}`}
                                    className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-navy-950/60 p-5 transition-all hover:border-blue-300 dark:hover:border-blue-700/50"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Completion Credential</h2>
                                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                            Verified
                                        </span>
                                    </div>
                                    <dl className="mt-3.5 space-y-2 text-xs">
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <dt className="text-slate-400 dark:text-slate-500">Certificate ID</dt>
                                            <dd className="break-all font-mono font-semibold text-slate-800 dark:text-slate-200">{certificate.id || 'Unavailable'}</dd>
                                        </div>
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <dt className="text-slate-400 dark:text-slate-500">Hackathon</dt>
                                            <dd className="break-all font-semibold text-slate-800 dark:text-slate-200">{certificate.hackathonId || 'Event'}</dd>
                                        </div>
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <dt className="text-slate-400 dark:text-slate-500">Issued Date</dt>
                                            <dd className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(certificate.issuedAt)}</dd>
                                        </div>
                                    </dl>
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setCertId(certificate.id || '')}
                                            disabled={!certificate.id}
                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                            Verify Authenticity
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-10 text-center">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                {certificates.length ? 'No matching certificates' : 'No certificate records'}
                            </h2>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {certificates.length ? 'Try a different search ID.' : 'Official certificates will be issued upon completing hackathon stages.'}
                            </p>
                        </div>
                    )}
                </section>

                {/* 3. Certificate Authenticity Verifier */}
                <section className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 p-5 sm:p-6 shadow-xs">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Verify Certificate Authenticity</h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Check cryptographic validity against our decentralized record registry.</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                            value={certId}
                            onChange={(event) => setCertId(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && handleVerify()}
                            placeholder="Enter Certificate ID..."
                            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 px-4 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                            type="button"
                            onClick={handleVerify}
                            disabled={isVerifying || !certId.trim()}
                            className="h-11 rounded-xl bg-[#2563eb] px-5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#1d4ed8] active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isVerifying ? 'Checking…' : 'Verify'}
                        </button>
                    </div>
                    {verifiedResult && (
                        <div
                            role={verifiedResult.status === 'success' ? 'status' : 'alert'}
                            className={`mt-4 rounded-xl p-4 text-xs sm:text-sm ${
                                verifiedResult.status === 'success'
                                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : 'border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            }`}
                        >
                            <p className="font-bold">{verifiedResult.message}</p>
                            {verifiedResult.details && (
                                <p className="mt-1 font-mono text-xs">
                                    ID: {verifiedResult.details.id} · Hackathon: {verifiedResult.details.hackathonId || 'General'} · Issued: {formatDate(verifiedResult.details.issuedAt)}
                                </p>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default StudentCertificates;
