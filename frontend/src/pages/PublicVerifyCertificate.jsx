import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/api';
import { usePlatformSettings } from '../context/PlatformSettingsContext';
import { useTheme } from '../context/ThemeContext';

const PublicVerifyCertificate = () => {
    const { certId } = useParams();
    const navigate = useNavigate();
    const { theme: currentTheme } = useTheme();
    const isLightTheme = currentTheme === 'light';

    const { 
        platformName, 
        supportEmail, 
        publicVerification, 
        prefix 
    } = usePlatformSettings();

    const [searchId, setSearchId] = useState(certId || '');
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleVerify = async (idToVerify) => {
        const queryId = (idToVerify || searchId || '').trim();
        if (!queryId) return;

        setIsVerifying(true);
        setHasSearched(true);
        setResult(null);

        try {
            const { data } = await apiClient.get(`/certificates/verify/${encodeURIComponent(queryId)}`);
            setResult(data);
        } catch (err) {
            console.error('Verification error:', err);
            setResult({
                verified: false,
                valid: false,
                status: 'Error',
                message: err.response?.data?.detail || 'Unable to connect to verification authority. Please try again later.'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    // Auto-verify if certId provided in URL
    useEffect(() => {
        if (certId && certId.trim()) {
            setSearchId(certId.trim());
            if (publicVerification) {
                handleVerify(certId.trim());
            }
        }
    }, [certId, publicVerification]);

    const handleSubmit = (e) => {
        e.preventDefault();
        handleVerify(searchId);
    };

    return (
        <div className={`min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center transition-colors duration-300 ${
            isLightTheme ? 'bg-slate-50 text-slate-800' : 'bg-navy-950 text-white'
        }`}>
            {/* Top Navigation / Breadcrumb */}
            <div className="w-full max-w-3xl mb-8 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400 hover:underline">
                    <span>← Back to {platformName}</span>
                </Link>
                <span className="text-xs font-mono text-slate-400 dark:text-gray-400">
                    Authority: {platformName} Credential Engine
                </span>
            </div>

            {/* Main Container */}
            <div className={`w-full max-w-3xl rounded-3xl p-6 sm:p-10 shadow-2xl border transition-all ${
                isLightTheme 
                    ? 'bg-white border-slate-200/80 shadow-slate-200/50' 
                    : 'bg-navy-900/90 border-white/10 shadow-black/40 backdrop-blur-xl'
            }`}>
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 mb-4 border border-sky-500/20 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2"/>
                            <path d="M7 7h.01"/>
                            <path d="M17 7h.01"/>
                            <path d="M7 17h.01"/>
                            <path d="M17 17h.01"/>
                            <circle cx="12" cy="12" r="2"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider">
                        Public Credential Verification Portal
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-2 max-w-lg mx-auto">
                        Official cryptographic authenticity verification for hackathon awards, distinctions, and participation credentials issued on {platformName}.
                    </p>
                </div>

                {/* CONDITION 1: Public Verification Portal is DISABLED by Platform Policy */}
                {!publicVerification ? (
                    <div className="p-8 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 mx-auto flex items-center justify-center mb-4 border border-amber-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                            Public Verification Portal Temporarily Closed
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 mt-2 max-w-md mx-auto leading-relaxed">
                            Platform administration has temporarily suspended online public QR credential verification under active security policy.
                        </p>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                            <a 
                                href={`mailto:${supportEmail || 'support@proeduvate.com'}?subject=Credential%20Verification%20Inquiry`}
                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
                            >
                                Contact Institutional Authority
                            </a>
                            <Link 
                                to="/"
                                className="px-5 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white font-bold text-xs rounded-xl transition-all"
                            >
                                Return to Home
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* CONDITION 2: Public Verification Portal is ENABLED */
                    <div className="space-y-6">
                        {/* Search / Input Box */}
                        <form onSubmit={handleSubmit} className="relative">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"/>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                        </svg>
                                    </span>
                                    <input 
                                        type="text" 
                                        value={searchId}
                                        onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                                        placeholder={`e.g. ${prefix || 'PROEDU'}-2026-A1B2C3D4`}
                                        className={`w-full pl-10 pr-4 py-3.5 text-xs sm:text-sm font-mono font-bold tracking-wider rounded-xl outline-none transition-all border ${
                                            isLightTheme 
                                                ? 'bg-slate-50 border-slate-300 focus:border-sky-500 focus:bg-white text-slate-900' 
                                                : 'bg-black/30 border-white/10 focus:border-sky-500 text-white'
                                        }`}
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isVerifying || !searchId.trim()}
                                    className="px-6 py-3.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-sky-600/20 active:scale-95 flex items-center justify-center gap-2 shrink-0"
                                >
                                    {isVerifying ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            <span>Verifying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Verify Credential</span>
                                            <span>→</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-gray-400 mt-2 font-mono">
                                Enter the Validation ID stamped at the bottom of the certificate or scanned from the QR code.
                            </p>
                        </form>

                        {/* Result Display */}
                        {hasSearched && result && (
                            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {result.verified || result.valid ? (
                                    /* Verified Card */
                                    <div className={`p-6 sm:p-8 rounded-2xl border-2 transition-all ${
                                        isLightTheme 
                                            ? 'bg-emerald-50/80 border-emerald-500/40 text-slate-800 shadow-lg' 
                                            : 'bg-gradient-to-br from-emerald-950/40 via-navy-900 to-black/40 border-emerald-500/40 text-white shadow-2xl'
                                    }`}>
                                        {/* Status Tag */}
                                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-emerald-500/20 pb-4 mb-6">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                                <span>Authentic Credential Verified</span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-slate-500 dark:text-gray-400">
                                                ID: {result.validationId}
                                            </span>
                                        </div>

                                        {/* Credential Data */}
                                        <div className="space-y-4">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-400 block mb-0.5">
                                                    Distinguished Recipient
                                                </span>
                                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {result.recipientName || 'Verified Participant'}
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-400 block mb-0.5">
                                                        Event / Hackathon
                                                    </span>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-gray-200">
                                                        {result.eventTitle || 'ProEduvate Global Hackathon'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-400 block mb-0.5">
                                                        Award / Recognition Tier
                                                    </span>
                                                    <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wide bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20">
                                                        {result.type || 'Winner Certificate'}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-400 block mb-0.5">
                                                        Issuance Date
                                                    </span>
                                                    <p className="text-xs font-mono font-semibold text-slate-600 dark:text-gray-300">
                                                        {result.dateIssued || 'Recently'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-400 block mb-0.5">
                                                        Verified Issuing Authority
                                                    </span>
                                                    <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
                                                        <span className="text-emerald-500 font-bold">✓</span>
                                                        <span>{result.issuedBy || `${platformName} Platform Official`}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seal Footer */}
                                        <div className="mt-6 pt-4 border-t border-emerald-500/20 flex justify-between items-center text-[10px] text-slate-500 dark:text-gray-400">
                                            <span>Secure SHA-256 Ledger Record</span>
                                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                                Cryptographically Authenticated
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    /* Invalid / Unrecognized Card */
                                    <div className="p-6 sm:p-8 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-center">
                                        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 mx-auto flex items-center justify-center mb-3 border border-rose-500/30">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"/>
                                                <line x1="15" y1="9" x2="9" y2="15"/>
                                                <line x1="9" y1="9" x2="15" y2="15"/>
                                            </svg>
                                        </div>
                                        <h3 className="text-base font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                                            {result.status === 'REVOKED' ? 'Certificate Revoked' : 'Unrecognized Credential'}
                                        </h3>
                                        <p className="text-xs text-slate-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                                            {result.message || 'No active authentic certificate corresponds to this validation identifier in the ledger.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicVerifyCertificate;
