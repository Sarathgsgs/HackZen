import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const StudentFileSharing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const teamQuery = searchParams.get('teamId') ? `?teamId=${searchParams.get('teamId')}` : '';

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const requestedTeamId = searchParams.get('teamId');
        const activeTeam = requestedTeamId
          ? teams.find((team) => String(team.id || team._id) === String(requestedTeamId)) || teams[0] || null
          : teams[0] || null;

        if (!activeTeam) {
          setFiles([]);
          return;
        }

        const submissions = await fetchSubmissions(activeTeam.id || activeTeam._id);
        const sharedFiles = submissions
          .filter((submission) => submission.fileUrl && submission.fileUrl !== 'pending_upload' && submission.fileUrl !== '#')
          .map((submission, index) => ({
            id: submission.id || `${index}-${submission.project}`,
            name: submission.project || `Submission file ${index + 1}`,
            type: 'FILE',
            url: submission.fileUrl,
            size: 'Available on backend',
          }));

        setFiles(sharedFiles);
      } catch (error) {
        console.error('Failed to load shared files:', error);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-center text-gray-300">Loading shared files…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Share</p>
          <h1 className="mt-2 text-3xl font-bold text-white">File Sharing</h1>
        </div>
        <button type="button" disabled className="cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-400">
          Upload unavailable
        </button>
      </div>

      {files.length === 0 ? (
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h3 className="text-2xl font-bold text-white">No shared files available</h3>
          <p className="mt-3 text-gray-400">No backend file records are available for your current team yet.</p>
          <button onClick={() => navigate(`/student/materials${teamQuery}`)} className="mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200">
            View team materials
          </button>
        </div>
      ) : (
        <div className="glass rounded-[2rem] border border-white/10 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {files.map((file) => (
              <div key={file.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 text-3xl">📁</div>
                <h3 className="text-lg font-bold text-white">{file.name}</h3>
                <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-gray-400">
                  <span>{file.type}</span>
                  <span>{file.size}</span>
                </div>
                {file.url ? (
                  <a href={file.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white">
                    Open
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFileSharing;
