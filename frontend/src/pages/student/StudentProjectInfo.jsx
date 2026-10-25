import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const StudentProjectInfo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [team, setTeam] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const teamQuery = searchParams.get('teamId') ? `?teamId=${searchParams.get('teamId')}` : '';

  useEffect(() => {
    const loadProjectInfo = async () => {
      setLoading(true);
      try {
        setLoadError('');
        const teams = await getMyTeams();
        const requestedTeamId = searchParams.get('teamId');
        const activeTeam = requestedTeamId
          ? teams.find((item) => String(item.id || item._id) === String(requestedTeamId)) || null
          : teams[0] || null;
        setTeam(activeTeam);

        if (!activeTeam) {
          setProject(null);
          return;
        }

        const teamId = activeTeam.id || activeTeam._id;
        const submissions = await fetchSubmissions(teamId);
        setProject(submissions?.[0] || null);
      } catch (error) {
        console.error('Failed to load project information:', error);
        setLoadError('Project information could not be loaded. Please try again.');
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    loadProjectInfo();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl pb-10">
        <div className="rounded-[18px] border border-[#e8e0f5] bg-[#f6f3fb] p-10 text-center text-[#667085] shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
          Loading project information...
        </div>
      </div>
    );
  }

  if (!team) {
    if (loadError) return <div role="alert" className="mx-auto max-w-4xl rounded-[18px] border border-red-200 bg-white p-10 text-center text-red-800">{loadError}</div>;
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="rounded-[18px] border border-dashed border-[#d9d1ef] bg-[#f8fafc] p-12 text-center shadow-[0_8px_26px_rgba(83,63,166,0.03)]">
          <h2 className="text-2xl font-bold text-[#1d1a2a]">No team found</h2>
          <p className="mt-3 text-[#69707d]">Create or join a team to view your project information.</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div role="alert" className="mx-auto max-w-4xl rounded-[18px] border border-red-200 bg-white p-10 text-center text-red-800">{loadError}</div>;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="rounded-[18px] border border-dashed border-[#d9d1ef] bg-[#f8fafc] p-12 text-center shadow-[0_8px_26px_rgba(83,63,166,0.03)]">
          <h2 className="text-2xl font-bold text-[#1d1a2a]">No project information yet</h2>
          <p className="mt-3 text-[#69707d]">Your team has not submitted a project yet. Once a submission exists, the project details will appear here.</p>
          <button onClick={() => navigate(`/student/submission${teamQuery}`)} className="mt-6 rounded-xl bg-gradient-to-r from-[#5a44c9] to-[#6e52d9] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(90,68,201,0.24)]">
            Create submission
          </button>
        </div>
      </div>
    );
  }

  const details = [
    ['Team', team.teamName || 'Not available'],
    ['Hackathon', project.hackathon || 'Hackathon name unavailable'],
    ['Project', project.project || 'Project title unavailable'],
    ['Stage', project.status || 'Status unavailable'],
    ['Version', project.version ? `v${project.version}` : 'Not assigned'],
    ['Submitted', project.submittedAt || 'Submission date unavailable'],
  ];

  return (
    <div className="min-h-screen bg-[#f3f0f8] px-4 py-8 text-[#181524] md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1220px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7d7a88]">Project</p>
            <h1 className="mt-2 text-[44px] font-bold leading-none tracking-[-0.05em] text-[#1d1a2a]">Project Information</h1>
          </div>
          <button onClick={() => navigate(`/student/submission${teamQuery}`)} className="rounded-[10px] bg-gradient-to-r from-[#5a44c9] to-[#6e52d9] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(90,68,201,0.24)]">
            Submit project
          </button>
        </div>

        <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[18px] border border-[#e0d9ee] bg-[#f8f5fb] p-5 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
            <div className="flex items-center gap-3 border-b border-[#e8e0f3] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9e0ff] text-lg text-[#5a44c9]">✦</div>
              <div>
                <div className="text-[18px] font-bold text-[#1d1a2a]">{team.teamName || 'Team Workspace'}</div>
                <div className="text-[12px] text-[#7a7984]">{project.hackathon || 'Hackathon name unavailable'}</div>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7d7a88]">Problem Statement</p>
              <p className="mt-3 text-[15px] leading-7 text-[#4a4656]">{project.desc || 'No project description has been submitted yet.'}</p>
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7d7a88]">Solution Summary</p>
              <p className="mt-3 text-[15px] leading-7 text-[#4a4656]">{project.project || 'Project title unavailable'}</p>
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7d7a88]">Tech Stack</p>
              <p className="mt-3 text-sm text-[#69707d]">Technology stack information is not available for this submission.</p>
            </div>
          </aside>

          <main className="space-y-8">
            <div className="rounded-[18px] border border-[#e0d9ee] bg-[#f8f5fb] p-5 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[26px] font-bold tracking-[-0.04em] text-[#1d1a2a]">{project.project || 'Project title unavailable'}</h2>
                <span className="rounded-full border border-[#d9d0ef] bg-[#ece7ff] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#5a44c9]">
                  {project.status || 'Status unavailable'}
                </span>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label} className="rounded-[14px] border border-[#e0d9ee] bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7d7a88]">{label}</p>
                    <p className="mt-2 text-[18px] font-semibold text-[#1d1a2a]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[18px] border border-[#e0d9ee] bg-[#f8f5fb] p-5 shadow-[0_8px_26px_rgba(83,63,166,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[26px] font-bold tracking-[-0.04em] text-[#1d1a2a]">Project Details</h3>
                <button onClick={() => navigate(`/student/submission-status${teamQuery}`)} className="text-sm font-semibold text-[#5a44c9]">View status</button>
              </div>
              <p className="mt-4 text-[15px] leading-7 text-[#4a4656]">{project.desc || 'No project description has been submitted yet.'}</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentProjectInfo;
