import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';

const StudentCertificate = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCertificates = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get('/certificates/me');
        setCertificates(data || []);
      } catch (error) {
        console.error('Failed to load certificates:', error);
        setCertificates([]);
      } finally {
        setLoading(false);
      }
    };

    loadCertificates();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-center text-gray-300">Loading certificates…</div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="mx-auto max-w-5xl pb-10">
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">No certificates available</h2>
          <p className="mt-3 text-gray-400">Your authenticated account does not currently have any certificate records to display.</p>
          <button
            onClick={() => navigate('/student/certificates/verify')}
            className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200"
          >
            Verify certificate
          </button>
        </div>
      </div>
    );
  }

  const primaryCertificate = certificates[0];
  const issuedDate = primaryCertificate?.issuedAt ? new Date(primaryCertificate.issuedAt).toLocaleDateString() : 'Not available';
  const primaryCertificateId = primaryCertificate?._id || primaryCertificate?.id || '';

  const handleVerifyNavigation = () => {
    if (primaryCertificateId) {
      navigate('/student/certificates/verify', { state: { certificateId: primaryCertificateId } });
      return;
    }

    navigate('/student/certificates/verify');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Award</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Certificate</h1>
        </div>
        <button onClick={handleVerifyNavigation} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Verify certificate
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-8">
        <div className="rounded-[1.75rem] border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-200">ProEduvate</p>
          <h2 className="mt-6 text-4xl font-bold text-white">Certificate of Participation</h2>
          <p className="mt-5 text-xl text-gray-200">Awarded to the authenticated student</p>
          <p className="mt-2 text-sm text-gray-300">Issued from the platform certificate record for this account</p>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-200 flex-wrap">
            <span>Issued on: {issuedDate}</span>
            <span>ID: {primaryCertificate?._id || 'Not available'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCertificate;
