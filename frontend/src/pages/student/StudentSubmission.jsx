import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions, submitProject } from '../../services/student/submissionsApi';

const StudentSubmission = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [existingSubmission, setExistingSubmission] = useState(null);
  const teamQuery = searchParams.get('teamId') ? `?teamId=${searchParams.get('teamId')}` : '';
  const [form, setForm] = useState({
    projectTitle: '',
    summary: '',
  });

  useEffect(() => {
    const loadTeamAndSubmission = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const requestedTeamId = searchParams.get('teamId');
        const activeTeam = requestedTeamId
          ? teams.find((item) => String(item.id || item._id) === String(requestedTeamId)) || teams[0] || null
          : teams[0] || null;
        setTeam(activeTeam);

        if (!activeTeam) {
          return;
        }

        const teamId = activeTeam.id || activeTeam._id;
        const submissions = await fetchSubmissions(teamId);
        const latest = submissions?.[0] || null;
        setExistingSubmission(latest);

        if (latest) {
          setForm({
            projectTitle: latest.project || '',
            summary: latest.desc || '',
          });
        }
      } catch (error) {
        console.error('Failed to load submission form data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamAndSubmission();
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!team) {
      setErrorMessage('You must join a team before submitting a project.');
      return;
    }

    const projectTitle = form.projectTitle.trim();
    const summary = form.summary.trim();

    if (!projectTitle) {
      setErrorMessage('Please enter a project title.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    if (existingSubmission) {
      setErrorMessage(`Project already submitted for this team and stage. Version ${existingSubmission.version || 1} is already on record.`);
      setSubmitting(false);
      return;
    }

    try {
      await submitProject({
        teamId: team.id || team._id,
        stageId: team.hackathonId || 'initial_stage',
        fileUrl: 'pending_upload',
        project: projectTitle,
        desc: summary,
        category: 'General',
        status: 'Pending',
      });

      const submissions = await fetchSubmissions(team.id || team._id);
      const latest = submissions?.[0];
      setExistingSubmission(latest);

      if (latest) {
        setForm({
          projectTitle: latest.project || '',
          summary: latest.desc || '',
        });
      }

      setSuccessMessage('Project submitted successfully.');
    } catch (error) {
      console.error('Project submission failed:', error);
      const detail = error?.response?.data?.detail || 'Unable to submit the project right now.';
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl pb-10">
        <div className="rounded-[18px] border border-[#e8e0f5] bg-[#f6f3fb] p-10 text-center text-[#667085] shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
          Loading team submission form...
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="rounded-[18px] border border-dashed border-[#d9d1ef] bg-[#f7f4fb] p-12 text-center shadow-[0_8px_26px_rgba(83,63,166,0.03)]">
          <h2 className="text-2xl font-bold text-[#1d1a2a]">No active team</h2>
          <p className="mt-3 text-[#69707d]">Join or create a team before submitting your project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f0f8] px-4 py-8 text-[#181524] md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1220px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7d7a88]">Deliverable</p>
            <h1 className="mt-2 text-[44px] font-bold leading-none tracking-[-0.05em] text-[#1d1a2a]">Project Submission</h1>
          </div>
          <button onClick={() => navigate(`/student/submission-status${teamQuery}`)} className="rounded-[10px] border border-[#c9bde9] bg-[#f4f0ff] px-4 py-2.5 text-sm font-semibold text-[#5a44c9]">
            Submission status
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[18px] border border-[#dfe0ea] bg-[#f8f6fb] p-5 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#5b5867]">Project title</label>
                <input
                  value={form.projectTitle}
                  onChange={(event) => setForm((current) => ({ ...current, projectTitle: event.target.value }))}
                  placeholder="Project title"
                  className="w-full rounded-[12px] border border-[#d8d0e9] bg-white px-4 py-3 text-[15px] text-[#1d1a2a] placeholder:text-[#9aa0af] focus:border-[#7c66d8] focus:outline-none"
                />
              </div>

              <div className="mt-5 space-y-2">
                <label className="text-[13px] font-semibold text-[#5b5867]">Team</label>
                <input
                  value={team.teamName || 'Team'}
                  readOnly
                  className="w-full rounded-[12px] border border-[#d8d0e9] bg-white px-4 py-3 text-[15px] text-[#1d1a2a] placeholder:text-[#9aa0af]"
                />
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dfe0ea] bg-[#f8f6fb] p-5 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-[24px] font-bold tracking-[-0.04em] text-[#1d1a2a]">Submission Details</h3>
                <span className="rounded-full border border-[#d9d0ef] bg-[#f1ebff] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#5a44c9]">Ready</span>
              </div>
              <p className="text-[15px] leading-7 text-[#4a4656]">Please complete the project title and summary, then submit your final delivery for review.</p>
            </div>
          </div>

          <div className="rounded-[18px] border border-[#dfe0ea] bg-[#f8f6fb] p-5 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#5b5867]">Summary</label>
              <textarea
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                rows={6}
                placeholder="Describe your project summary, highlights, and outcomes."
                className="w-full rounded-[12px] border border-[#d8d0e9] bg-white px-4 py-3 text-[15px] text-[#1d1a2a] placeholder:text-[#9aa0af] focus:border-[#7c66d8] focus:outline-none"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
          )}

          {successMessage && (
            <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>
          )}

          {existingSubmission && (
            <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Project already submitted for this team and stage. Status: {existingSubmission.status || 'Submitted'} • Version {existingSubmission.version || 1}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[#dfe0ea] bg-[#f8f6fb] p-4 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
            <button type="button" onClick={() => navigate(`/student/files${teamQuery}`)} className="rounded-[10px] border border-[#c9bde9] bg-[#f4f0ff] px-5 py-3 text-sm font-semibold text-[#5a44c9]">
              File sharing
            </button>
            <button
              type="submit"
              disabled={submitting || !!existingSubmission || !form.projectTitle.trim()}
              className="rounded-[12px] bg-gradient-to-r from-[#5a44c9] to-[#6e52d9] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(90,68,201,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : existingSubmission ? 'Project already submitted' : 'Submit project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentSubmission;
