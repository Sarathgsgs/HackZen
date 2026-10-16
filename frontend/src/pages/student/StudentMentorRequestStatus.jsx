import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMyMentorRequests } from '../../api/teamApi';

const prettyDate = (value) => {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const StudentMentorRequestStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getMyMentorRequests();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.detail || 'Mentor status could not be loaded. Try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    const timer = window.setInterval(load, 30000);
    return () => { window.removeEventListener('focus', load); window.clearInterval(timer); };
  }, [load, location.key]);

  const activeTeamId = location.state?.teamId;
  const rows = activeTeamId ? assignments.filter((row) => String(row.teamId) === String(activeTeamId)) : assignments;

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 py-8 text-[#182338] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <nav className="mb-5 text-sm font-medium text-[#667085]">Mentors &amp; Guidance <span className="px-2">›</span> Request a Mentor <span className="px-2">›</span> <span className="text-[#26344a]">Request Status</span></nav>
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mentor Request Status</h1><p className="mt-2 text-[#73798b]">Review mentor assignments associated with your teams.</p></div><div className="flex gap-2"><button onClick={load} className="rounded-xl border border-[#e0e5ef] bg-white px-4 py-3 text-sm font-semibold">Refresh</button><button onClick={() => navigate('/student/mentor-request')} className="rounded-xl bg-[#5b4bdc] px-4 py-3 text-sm font-semibold text-white">Request a mentor</button></div></header>
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {loading ? <div className="rounded-2xl border border-[#e5e8f1] bg-white p-10 text-center text-[#697386]">Loading mentor assignments...</div> : rows.length ? <div className="space-y-5">
          {rows.map((row) => {
            const assigned = String(row.status || '').toLowerCase() === 'assigned';
            return <article key={row.teamId} className="rounded-2xl border border-[#e7eaf2] bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e9ebf2] pb-5"><div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8efff] text-2xl font-bold text-[#245bc8]">{assigned ? '✓' : '…'}</span><div><p className="text-xs font-semibold uppercase tracking-wide text-[#737b90]">Team mentor</p><h2 className="mt-1 text-xl font-bold">{row.mentorName || 'Mentor profile unavailable'}</h2><p className="mt-1 text-sm text-[#73798b]">{row.teamName || 'Team'}</p></div></div><span className={`rounded-full px-3 py-2 text-sm font-semibold ${assigned ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{assigned ? 'Assigned' : row.status || 'Status unavailable'}</span></div>
              <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-xl bg-[#f0f4ff] p-4"><p className="text-xs font-semibold uppercase text-[#758097]">Team</p><p className="mt-2 font-bold">{row.teamName || 'Unavailable'}</p></div><div className="rounded-xl bg-[#f0f4ff] p-4"><p className="text-xs font-semibold uppercase text-[#758097]">Mentor</p><p className="mt-2 font-bold">{row.mentorName || 'Profile unavailable'}</p></div><div className="rounded-xl bg-[#f0f4ff] p-4"><p className="text-xs font-semibold uppercase text-[#758097]">Assigned</p><p className="mt-2 font-bold">{prettyDate(row.requestedAt)}</p></div></div>
              {row.focusArea && <p className="mt-5 text-sm"><strong>Focus area:</strong> {row.focusArea}</p>}
              {row.preferredTimeWindow && <p className="mt-2 text-sm"><strong>Preferred time:</strong> {row.preferredTimeWindow}</p>}
              {row.guidanceRequest && <blockquote className="mt-4 rounded-xl bg-[#f1f4ff] p-4 text-sm leading-6 text-[#47546b]">{row.guidanceRequest}</blockquote>}
              <div className="mt-5 border-t border-[#e9ebf2] pt-4 text-sm text-[#626c80]">{assigned ? 'The mentor is assigned to this team. Coordinate through the team workspace.' : 'The latest status is returned by the server.'}</div>
            </article>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-[#dfe4ee] bg-white p-10 text-center"><h2 className="text-xl font-bold">No mentor assignment found</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#73798b]">This account’s teams do not currently have a mentor assigned. A status will appear here after a team lead submits a request and the server confirms the assignment.</p><button onClick={() => navigate('/student/mentor-request')} className="mt-5 rounded-lg bg-[#5b4bdc] px-5 py-3 text-sm font-semibold text-white">Find a mentor</button></div>}
      </div>
    </main>
  );
};

export default StudentMentorRequestStatus;
