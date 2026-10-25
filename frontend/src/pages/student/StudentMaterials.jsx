import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const StudentMaterials = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const teamQuery = searchParams.get('teamId') ? `?teamId=${searchParams.get('teamId')}` : '';

  useEffect(() => {
    const loadMaterials = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const requestedTeamId = searchParams.get('teamId');
        const activeTeam = requestedTeamId
          ? teams.find((team) => String(team.id || team._id) === String(requestedTeamId)) || teams[0] || null
          : teams[0] || null;

        if (!activeTeam) {
          setMaterials([]);
          return;
        }

        const submissions = await fetchSubmissions(activeTeam.id || activeTeam._id);
        const sharedFiles = submissions
          .filter((submission) => submission.fileUrl && submission.fileUrl !== 'pending_upload' && submission.fileUrl !== '#')
          .map((submission) => ({
            name: submission.project || 'Submission file',
            type: 'FILE',
            updated: submission.submittedAt || 'Not available',
            url: submission.fileUrl,
          }));

        setMaterials(sharedFiles);
      } catch (error) {
        console.error('Failed to load team materials:', error);
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };

    loadMaterials();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-center text-gray-300">Loading team materials…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-300">Resources</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Team Materials</h1>
        </div>
        <button onClick={() => navigate(`/student/files${teamQuery}`)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
          File sharing
        </button>
      </div>

      {materials.length === 0 ? (
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h3 className="text-2xl font-bold text-white">No team materials available</h3>
          <p className="mt-3 text-gray-400">There are no shared files or materials for the current team yet.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {materials.map((item) => (
            <div key={`${item.name}-${item.updated}`} className="glass rounded-[1.6rem] border border-white/10 p-5">
              <div className="mb-5 text-3xl">📄</div>
              <h3 className="text-lg font-bold text-white">{item.name}</h3>
              <p className="mt-2 text-sm text-gray-400">{item.type}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs uppercase tracking-[0.2em] text-gray-400">
                <span>Updated</span>
                <span>{item.updated}</span>
              </div>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white">
                  Open
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentMaterials;
