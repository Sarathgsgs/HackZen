import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';

const StudentCertificateVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [certificateCount, setCertificateCount] = useState(null);
  const [certificateLoadError, setCertificateLoadError] = useState('');

  useEffect(() => {
    const routeCertificateId = location.state?.certificateId;

    if (routeCertificateId) {
      setCode(routeCertificateId);
      setCertificateCount(1);
      setResult(null);
      return;
    }

    const loadMyCertificateId = async () => {
      try {
        const { data } = await apiClient.get('/certificates/me');
        const certs = Array.isArray(data) ? data : [];
        setCertificateCount(certs.length);
        setCertificateLoadError('');

        if (certs.length > 0) {
          const realCertificateId = certs[0]._id || certs[0].id || '';
          setCode((previousCode) => previousCode || realCertificateId);
        }
      } catch (error) {
        console.error('Failed to load student certificates:', error);
        setCertificateLoadError('Your certificate list could not be loaded. You can still verify an ID you already have.');
      }
    };

    loadMyCertificateId();
  }, [location.state]);

  const verify = async () => {
    const normalized = code.trim();
    if (!normalized) {
      setResult({ success: false, message: 'Enter a certificate ID to verify.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data } = await apiClient.get(`/certificates/${normalized}`);
      setResult({
        success: true,
        message: 'Certificate record found and recognized by the backend.',
        details: {
          id: data?._id || normalized,
          issuedAt: data?.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : 'Not available',
        },
      });
    } catch (error) {
      console.error('Certificate verification failed:', error);
      const detail = error?.response?.data?.detail || error?.response?.data?.message || 'This certificate ID could not be verified against the backend.';
      setResult({
        success: false,
        message: detail.includes('not found') || detail.includes('invalid')
          ? 'No certificate found for this ID.'
          : 'This certificate ID could not be verified against the backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      verify();
    }
  };

  return (
    <div className="min-h-screen bg-[#f3eef7] px-4 py-8 text-[#1f2430] md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <h1 className="mb-8 text-[42px] font-bold tracking-[-0.05em] text-[#1d1a2a]">Verify Certificate</h1>
        <p className="mb-8 text-[#6c6878]">Validate the authenticity of your hackathon certificate issued by ProEduvate.</p>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(350px,0.95fr)]">
          <div className="rounded-[22px] border border-[#dfe7f8] bg-[#f8f6fb] p-6 shadow-[0_8px_26px_rgba(83,63,166,0.04)] md:p-8">
            <h2 className="mb-4 text-[28px] font-bold tracking-[-0.04em] text-[#1d1a2a]">Enter Details</h2>
            <label className="mb-2 block text-sm font-semibold text-[#2d2c39]">Certificate Validation ID</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter certificate ID"
              className="w-full rounded-xl border border-[#d7d0ea] bg-white px-4 py-3 text-[#1d1a2a] placeholder:text-[#8e8b98] focus:border-[#6d5ef7] focus:outline-none"
            />

            {certificateLoadError && (
              <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{certificateLoadError}</div>
            )}

            {certificateCount === 0 && !certificateLoadError && (
              <div className="mt-4 rounded-xl border border-[#f3b4b0] bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318]">
                No certificates are currently available for this account.
              </div>
            )}

            <button
              onClick={verify}
              disabled={loading}
              className="mt-6 rounded-xl bg-gradient-to-r from-[#6051d6] to-[#4f46e5] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Verifying...' : 'Verify Certificate'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="rounded-[22px] border border-[#dfe7f8] bg-[#f8f6fb] p-6 shadow-[0_8px_26px_rgba(83,63,166,0.04)] md:p-8">
              <h2 className="mb-4 text-[28px] font-bold tracking-[-0.04em] text-[#1d1a2a]">Recently Verified</h2>
              {certificateCount === 0 && !certificateLoadError ? (
                <div className="rounded-[16px] border border-dashed border-[#d9d1ef] bg-[#f4f1fa] p-5 text-[#5f5a74]">
                  No recent verification results for this account.
                </div>
              ) : (
                <div className="space-y-3">
                  {result && result.success ? (
                    <div className="rounded-[16px] border border-[#dfe7f8] bg-[#ecfdf5] p-4 text-[#1d1a2a]">
                      <div className="font-semibold">Certificate record found</div>
                      <div className="mt-2 text-sm text-[#3d4a5c]">ID: {result.details?.id || code}</div>
                      <div className="text-sm text-[#3d4a5c]">Issued: {result.details?.issuedAt || 'Not available'}</div>
                    </div>
                  ) : (
                    <div className="rounded-[16px] border border-[#e5d5d3] bg-[#fff1f0] p-4 text-[#b42318]">
                      {result ? result.message : 'No verification yet.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-[22px] border border-[#dfe7f8] bg-[#f8f6fb] p-6 shadow-[0_8px_26px_rgba(83,63,166,0.04)] md:p-8">
              <h3 className="text-[28px] font-bold tracking-[-0.04em] text-[#1d1a2a]">How it works</h3>
              <div className="mt-4 space-y-3 text-[#5f5a74]">
                <p>Where to find your ID? The validation ID is located at the bottom right corner of your certificate.</p>
                <p>What is a validation ID? It identifies the certificate record stored by the platform.</p>
                <p>What does verification confirm? The platform has a record matching the entered ID.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCertificateVerification;
