import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import {
  fetchSubmissions,
  fetchSubmissionEvaluations,
} from '../../services/student/submissionsApi';

const StudentSubmissionStatus = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submission, setSubmission] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const teamQuery = searchParams.get('teamId') ? `?teamId=${searchParams.get('teamId')}` : '';

  useEffect(() => {
    const loadSubmissionStatus = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const requestedTeamId = searchParams.get('teamId');
        const activeTeam = requestedTeamId
          ? teams.find((item) => String(item.id || item._id) === String(requestedTeamId)) || null
          : teams[0] || null;
        if (!activeTeam) {
          setSubmission(null);
          setEvaluation(null);
          return;
        }

        const submissions = await fetchSubmissions(activeTeam.id || activeTeam._id);
        const latestSubmission = submissions?.[0] || null;
        setSubmission(latestSubmission);

        const submissionId = latestSubmission?._id || latestSubmission?.id || null;
        if (!submissionId) {
          setEvaluation(null);
          return;
        }

        const evals = await fetchSubmissionEvaluations(submissionId);
        setEvaluation(Array.isArray(evals) && evals.length > 0 ? evals[0] : null);
      } catch (error) {
        console.error('Unable to load submission status:', error);
        setLoadError('Submission status could not be loaded. Please try again.');
        setSubmission(null);
        setEvaluation(null);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissionStatus();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl pb-10">
        <div className="rounded-[18px] border border-[#e8e0f5] bg-[#f6f3fb] p-10 text-center text-[#667085] shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
          Loading submission status...
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div role="alert" className="mx-auto max-w-4xl rounded-[18px] border border-red-200 bg-white p-10 text-center text-red-800">{loadError}</div>;
  }

  if (!submission) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="rounded-[18px] border border-dashed border-[#d9d1ef] bg-[#f7f4fb] p-12 text-center shadow-[0_8px_26px_rgba(83,63,166,0.03)]">
          <h2 className="text-2xl font-bold text-[#1d1a2a]">No submission found</h2>
          <p className="mt-3 text-[#69707d]">There is no submission record for your current team yet.</p>
        </div>
      </div>
    );
  }

  const statusText = evaluation
    ? (submission?.status || 'Evaluated')
    : (submission?.status || 'Status unavailable');

  const statusTone =
    statusText?.toLowerCase().includes('approved') || statusText?.toLowerCase().includes('accepted')
      ? 'border-[#cfe9dc] bg-[#ebfff5] text-[#1a8a52]'
      : statusText?.toLowerCase().includes('rejected')
        ? 'border-[#f7d9d5] bg-[#fff1f0] text-[#ca4d36]'
        : 'border-[#e1d5c1] bg-[#fff7eb] text-[#a66a1d]';

  const details = [
    ['Project', submission.project || 'Project title unavailable'],
    ['Version', submission.version ? `v${submission.version}` : 'Not assigned'],
    ['Submitted at', submission.submittedAt || 'Submission date unavailable'],
    ['Review state', submission.status || 'Status unavailable'],
    ['Score', evaluation?.totalScore ?? evaluation?.score ?? 'Score unavailable'],
    ['Feedback', evaluation?.feedback || 'No feedback available yet'],
    ['Evaluated at', evaluation?.evaluatedAt ? new Date(evaluation.evaluatedAt).toLocaleString() : 'Not evaluated yet'],
  ];

  return (
    <div className="min-h-screen bg-[#f3f0f8] px-4 py-8 text-[#181524] md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1220px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7d7a88]">Status</p>
            <h1 className="mt-2 text-[44px] font-bold leading-none tracking-[-0.05em] text-[#1d1a2a]">Submission Status</h1>
          </div>
          <button onClick={() => navigate(`/student/project${teamQuery}`)} className="rounded-[10px] border border-[#c9bde9] bg-[#f4f0ff] px-4 py-2.5 text-sm font-semibold text-[#5a44c9]">
            Project info
          </button>
        </div>

        <div className="rounded-[18px] border border-[#e0d9ee] bg-[#f8f5fb] p-6 shadow-[0_8px_26px_rgba(83,63,166,0.04)] md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#5a44c9]">Review stage</p>
              <h2 className="mt-2 text-[28px] font-bold tracking-[-0.04em] text-[#1d1a2a]">{statusText}</h2>
            </div>
            <span className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] ${statusTone}`}>
              {statusText}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-[14px] border border-[#e0d9ee] bg-white p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#7d7a88]">{label}</p>
                <p className="mt-2 text-[18px] font-semibold text-[#1d1a2a]">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSubmissionStatus;
