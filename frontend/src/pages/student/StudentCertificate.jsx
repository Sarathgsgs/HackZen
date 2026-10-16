import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';

const StudentCertificate = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/certificates/me')
      .then(({ data }) => { if (active) setCertificates(Array.isArray(data) ? data : []); })
      .catch((requestError) => {
        console.error('Failed to load certificates:', requestError);
        if (active) setError('Certificates could not be loaded. Please try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const certificate = certificates[0];
  const id = certificate?._id || certificate?.id;
  return (
    <main className="min-h-screen bg-[#fbf8ff] px-5 py-10 text-[#1f2430] md:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-4xl font-bold tracking-tight">Certificates</h1><p className="mt-3 text-lg text-[#686779]">Your certificates issued for completed hackathons.</p></div>
          <button onClick={() => navigate('/student/certificates/verify', { state: id ? { certificateId: id } : undefined })} className="rounded-xl border border-[#d9d4e8] bg-white px-5 py-3 font-semibold text-[#5748dc]">Verify Certificate</button>
        </div>
        <section className="mt-8 rounded-2xl border border-[#eeeaf4] bg-white p-6 shadow-sm md:p-10">
          {loading ? <p role="status" className="py-12 text-center text-[#71758a]">Loading your certificates…</p> : error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error}</div>
          ) : certificate ? (
            <div className="rounded-2xl border border-emerald-200 bg-[#eaf8f1] p-6 md:p-8">
              <h2 className="text-2xl font-bold">Certificate issued</h2>
              <dl className="mt-6 divide-y divide-emerald-200">
                <div className="flex flex-wrap justify-between gap-2 py-4"><dt className="text-[#63716d]">Hackathon</dt><dd className="font-semibold">{certificate.hackathonTitle || certificate.hackathonId}</dd></div>
                <div className="flex flex-wrap justify-between gap-2 py-4"><dt className="text-[#63716d]">Issue date</dt><dd className="font-semibold">{certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : 'Not provided'}</dd></div>
                <div className="flex flex-wrap justify-between gap-2 py-4"><dt className="text-[#63716d]">Certificate ID</dt><dd className="font-mono font-semibold">{id}</dd></div>
              </dl>
              <p className="mt-4 text-sm text-[#697386]">Certificate file download is unavailable from the current backend.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d9d4e8] bg-[#fbfaff] px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eeeaff] text-2xl text-[#5b4ce1]">✓</div>
              <h2 className="mt-5 text-2xl font-bold">No certificate issued yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-[#71758a]">Certificates will appear here after an organizer issues one for your hackathon participation.</p>
              <button onClick={() => navigate('/student/certificates/verify')} className="mt-6 rounded-xl bg-[#5b4ce1] px-6 py-3 font-semibold text-white">Verify a Certificate</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default StudentCertificate;
