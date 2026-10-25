import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions, fetchSubmissionEvaluations } from '../../services/student/submissionsApi';

const StudentFeedback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const teamQuery = searchParams.get('teamId') ? `?teamId=${searchParams.get('teamId')}` : '';

  useEffect(() => {
    const loadFeedback = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const requestedTeamId = searchParams.get('teamId');
        const activeTeam = requestedTeamId
          ? teams.find((team) => String(team.id || team._id) === String(requestedTeamId)) || teams[0] || null
          : teams[0] || null;

        if (!activeTeam) {
          setFeedback(null);
          return;
        }

        const teamId = activeTeam.id || activeTeam._id;
        const submissions = await fetchSubmissions(teamId);
        const latestSubmission = submissions?.[0] || null;

        if (!latestSubmission) {
          setFeedback(null);
          return;
        }

        const evaluations = await fetchSubmissionEvaluations(latestSubmission.id || latestSubmission._id);
        const latestEvaluation = Array.isArray(evaluations) && evaluations.length > 0
          ? [...evaluations].sort((a, b) => new Date(b.evaluatedAt || 0) - new Date(a.evaluatedAt || 0))[0]
          : null;

        if (!latestEvaluation) {
          setFeedback(null);
          return;
        }

        setFeedback({
          project: latestSubmission.project || 'Untitled Project',
          score: latestEvaluation.totalScore ?? latestEvaluation.score ?? 'Pending',
          feedback: latestEvaluation.feedback || 'No feedback text was returned by the backend for this evaluation.',
        });
      } catch (error) {
        console.error('Failed to load feedback:', error);
        setFeedback(null);
      } finally {
        setLoading(false);
      }
    };

    loadFeedback();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl pb-10">
        <div className="rounded-[18px] border border-[#e8e0f5] bg-[#f6f3fb] p-10 text-center text-[#667085] shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
          Loading feedback...
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="rounded-[18px] border border-dashed border-[#d9d1ef] bg-[#f8fafc] p-12 text-center shadow-[0_8px_26px_rgba(83,63,166,0.03)]">
          <h2 className="text-2xl font-bold text-[#1d1a2a]">No feedback available</h2>
          <p className="mt-3 text-[#69707d]">There are no mentor or judge comments tied to your current submission yet.</p>
          <button onClick={() => navigate(`/student/teams${teamQuery}`)} className="mt-6 rounded-xl border border-[#c9bde9] bg-[#eff6ff] px-5 py-3 text-sm font-semibold text-[#5a44c9]">
            Back to teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f0f8] px-4 py-8 text-[#181524] md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1220px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7d7a88]">Feedback</p>
            <h1 className="mt-2 text-[44px] font-bold leading-none tracking-[-0.05em] text-[#1d1a2a]">Feedback</h1>
          </div>
          <button onClick={() => navigate(`/student/teams${teamQuery}`)} className="rounded-[10px] border border-[#c9bde9] bg-[#eff6ff] px-4 py-2.5 text-sm font-semibold text-[#5a44c9]">
            Back to teams
          </button>
        </div>

        <div className="rounded-[18px] border border-[#e0d9ee] bg-[#f8f5fb] p-6 shadow-[0_8px_26px_rgba(83,63,166,0.04)] md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[14px] border border-[#e0d9ee] bg-white p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#7d7a88]">Project</p>
              <p className="mt-2 text-[22px] font-bold tracking-[-0.04em] text-[#1d1a2a]">{feedback.project || 'Untitled Project'}</p>
            </div>
            <div className="rounded-[14px] border border-[#e0d9ee] bg-white p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#7d7a88]">Score</p>
              <p className="mt-2 text-[22px] font-bold tracking-[-0.04em] text-[#1d1a2a]">{feedback.score ?? 'Pending'}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[14px] border border-[#e0d9ee] bg-[#eff6ff] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7d7a88]">Feedback</p>
            <p className="mt-4 text-[16px] leading-7 text-[#49475a]">{feedback.feedback || 'No mentor feedback is available for this submission yet.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentFeedback;
