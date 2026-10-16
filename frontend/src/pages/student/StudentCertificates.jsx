import React, { useEffect, useMemo, useState } from 'react';
import { fetchCertificates, verifyCertificate } from '../../services/student/certificatesApi';

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Issue date unavailable';

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
        <main className="min-h-screen space-y-8 bg-[#f3f0f8] px-4 py-8 text-[#1d1a2a] md:px-6 lg:px-8">
            <header>
                <h1 className="text-3xl font-bold md:text-4xl">My Certificates</h1>
                <p className="mt-2 text-[#686779]">Certificate records issued to your account.</p>
            </header>

            <section className="rounded-2xl border border-[#e0d9ee] bg-white p-5 shadow-sm md:p-7">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div><p className="text-sm text-[#777287]">Certificate records</p><p className="mt-1 text-3xl font-bold">{certificates.length}</p></div>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by certificate or hackathon ID"
                        aria-label="Search certificates"
                        className="w-full rounded-xl border border-[#ddd6eb] bg-[#fbfaff] px-4 py-3 text-sm sm:max-w-sm"
                    />
                </div>

                {isLoading ? <p role="status" className="py-12 text-center text-[#697386]">Loading certificates…</p>
                    : loadError ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</p>
                        : filteredCertificates.length ? (
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {filteredCertificates.map((certificate) => (
                                    <article key={certificate.id || `${certificate.hackathonId}-${certificate.issuedAt}`} className="rounded-xl border border-[#e7e1f0] bg-[#fbfaff] p-5">
                                        <h2 className="text-lg font-bold">Certificate</h2>
                                        <dl className="mt-4 space-y-3 text-sm">
                                            <div className="flex flex-wrap justify-between gap-2"><dt className="text-[#777287]">Certificate ID</dt><dd className="break-all font-mono">{certificate.id || 'Unavailable'}</dd></div>
                                            <div className="flex flex-wrap justify-between gap-2"><dt className="text-[#777287]">Hackathon ID</dt><dd className="break-all">{certificate.hackathonId || 'Unavailable'}</dd></div>
                                            <div className="flex flex-wrap justify-between gap-2"><dt className="text-[#777287]">Issued</dt><dd>{formatDate(certificate.issuedAt)}</dd></div>
                                        </dl>
                                        <p className="mt-4 border-t border-[#e7e1f0] pt-4 text-sm text-[#697386]">Certificate file download is unavailable from the current backend.</p>
                                        <button type="button" onClick={() => setCertId(certificate.id || '')} disabled={!certificate.id} className="mt-3 rounded-lg border border-[#d9d3e8] bg-white px-4 py-2 text-sm font-semibold text-[#5140c8] disabled:opacity-50">Use ID to verify</button>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-6 rounded-xl border border-dashed border-[#d9d3e8] p-10 text-center">
                                <h2 className="font-semibold">{certificates.length ? 'No matching certificates' : 'No certificate records'}</h2>
                                <p className="mt-2 text-sm text-[#697386]">{certificates.length ? 'Try a different search term.' : 'An issued certificate will appear here when one is available.'}</p>
                            </div>
                        )}
            </section>

            <section className="rounded-2xl border border-[#e0d9ee] bg-white p-5 shadow-sm md:p-7">
                <h2 className="text-xl font-bold">Verify a certificate record</h2>
                <p className="mt-2 text-sm text-[#697386]">Verification checks whether the backend has a record for the entered ID.</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input value={certId} onChange={(event) => setCertId(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleVerify()} placeholder="Certificate ID" className="min-w-0 flex-1 rounded-xl border border-[#ddd6eb] bg-[#fbfaff] px-4 py-3 text-sm" />
                    <button type="button" onClick={handleVerify} disabled={isVerifying || !certId.trim()} className="rounded-xl bg-[#5b4ce1] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{isVerifying ? 'Checking…' : 'Verify'}</button>
                </div>
                {verifiedResult && <div role={verifiedResult.status === 'success' ? 'status' : 'alert'} className={`mt-4 rounded-xl p-4 text-sm ${verifiedResult.status === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-900' : 'border border-red-200 bg-red-50 text-red-800'}`}>
                    <p className="font-semibold">{verifiedResult.message}</p>
                    {verifiedResult.details && <p className="mt-2">ID: {verifiedResult.details.id} · Hackathon ID: {verifiedResult.details.hackathonId || 'Unavailable'} · Issued: {formatDate(verifiedResult.details.issuedAt)}</p>}
                </div>}
            </section>
        </main>
    );
};

export default StudentCertificates;
