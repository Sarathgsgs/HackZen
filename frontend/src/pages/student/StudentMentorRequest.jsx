import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAvailableMentors } from '../../api/profileApi';
import { assignMentor, getMyTeams } from '../../api/teamApi';

const idOf = (item) => String(item?._id || item?.id || item?.userId || '');
const errorText = (error) => error?.response?.data?.error?.message || error?.response?.data?.detail || 'The request could not be completed. Please try again.';

const StudentMentorRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mentors, setMentors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [mentorId, setMentorId] = useState(searchParams.get('mentorId') || '');
  const [teamId, setTeamId] = useState(searchParams.get('teamId') || '');
  const [focusArea, setFocusArea] = useState('');
  const [preferredTimeWindow, setPreferredTimeWindow] = useState('');
  const [guidanceRequest, setGuidanceRequest] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchAvailableMentors(), getMyTeams()]).then(([mentorRows, teamRows]) => {
      if (!active) return;
      const available = Array.isArray(mentorRows) ? mentorRows : [];
      const ledTeams = (Array.isArray(teamRows) ? teamRows : []).filter((team) => team.myRole === 'leader');
      setMentors(available);
      setTeams(ledTeams);
      setMentorId((current) => available.some((mentor) => idOf(mentor) === current) ? current : (available.some((mentor) => idOf(mentor) === searchParams.get('mentorId')) ? searchParams.get('mentorId') : ''));
      setTeamId((current) => ledTeams.some((team) => idOf(team) === current) ? current : (ledTeams.some((team) => idOf(team) === searchParams.get('teamId')) ? searchParams.get('teamId') : ''));
    }).catch((loadFailure) => {
      if (active) setLoadError(errorText(loadFailure));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchParams]);

  const selectedMentor = useMemo(() => mentors.find((mentor) => idOf(mentor) === mentorId), [mentors, mentorId]);
  const selectedTeam = useMemo(() => teams.find((team) => idOf(team) === teamId), [teams, teamId]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!selectedMentor || !selectedTeam) {
      setError('Select an available mentor and a team you lead.');
      return;
    }
    if (guidanceRequest.trim().length > 600) {
      setError('Keep your guidance request to 600 characters or fewer.');
      return;
    }
    setSubmitting(true);
    try {
      await assignMentor(idOf(selectedTeam), {
        mentorId: selectedMentor.userId || selectedMentor._id,
        focusArea: focusArea.trim(),
        guidanceRequest: guidanceRequest.trim(),
        preferredTimeWindow,
      });
      navigate('/student/mentor-request-status', { state: { teamId: idOf(selectedTeam) } });
    } catch (submitError) {
      setError(errorText(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 py-8 text-[#182338] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-sm font-semibold text-[#5964a1]">Mentors &amp; Guidance</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Request a Mentor</h1><p className="mt-2 text-[#73798b]">Choose an available mentor and share what your team needs.</p></div>
          <button onClick={() => navigate('/student/mentor-request-status')} className="rounded-xl border border-[#e2e5ef] bg-white px-4 py-3 text-sm font-semibold text-[#39445c]">View mentor status</button>
        </header>

        {loadError && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>}
        {loading ? <div className="rounded-2xl border border-[#e4e7ef] bg-white p-10 text-center text-[#697386]">Loading available mentors and teams...</div> : (
          <>
            {teams.length === 0 && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Only a team lead can request a mentor. Create a team or ask your team lead to submit the request.</div>}
            <section aria-label="Available mentors" className="grid gap-5 lg:grid-cols-3">
              {mentors.map((mentor) => {
                const id = idOf(mentor);
                const selected = mentorId === id;
                const skills = (mentor.expertiseDomains || mentor.expertiseAreas || []).map((item) => typeof item === 'string' ? item : item?.name || item?.label).filter(Boolean);
                return <article key={id} className={`rounded-2xl border bg-white p-5 shadow-sm ${selected ? 'border-[#3975f6] ring-1 ring-[#3975f6]' : 'border-[#e5e8f1]'}`}>
                  <div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#edf1ff] font-bold text-[#455bd4]">{(mentor.name || 'M').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold">{mentor.name || 'Mentor'}</h2><p className="text-sm text-[#70798d]">{mentor.currentPosition || mentor.headline || 'Mentor'}{mentor.companyName || mentor.company ? ` at ${mentor.companyName || mentor.company}` : ''}</p><p className="mt-1 text-xs text-[#7d8495]">{mentor.experienceYears ?? mentor.yearsOfExperience ? `${mentor.experienceYears ?? mentor.yearsOfExperience} years experience` : 'Experience not provided'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{mentor.availability || mentor.availabilityStatus || 'Available'}</span></div>
                  <p className="mt-4 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-[#626b7d]">{mentor.bio || mentor.headline || 'No biography has been provided.'}</p>
                  <div className="mt-3 flex min-h-8 flex-wrap gap-2">{skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-md bg-[#f0f3ff] px-2.5 py-1 text-xs font-medium text-[#3b5fbd]">{skill}</span>)}</div>
                  <div className="mt-5 flex gap-2"><button onClick={() => setMentorId(id)} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold ${selected ? 'bg-[#5b4bdc] text-white' : 'bg-[#f0f2ff] text-[#3f5fd2]'}`}>{selected ? 'Selected' : 'Select mentor'}</button><button onClick={() => navigate(`/student/mentor-profile?mentorId=${encodeURIComponent(id)}`)} className="rounded-lg border border-[#e1e5ee] px-3 py-2.5 text-sm font-semibold text-[#424b60]">View profile</button></div>
                </article>;
              })}
              {!mentors.length && !loadError && <div className="rounded-2xl border border-dashed border-[#dce1eb] bg-white p-10 text-center text-[#697386] lg:col-span-3">No available mentor profiles were returned.</div>}
            </section>

            <form onSubmit={submit} className="mt-6 rounded-2xl border border-[#e5e8f1] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 border-b border-[#e8eaf1] pb-5"><h2 className="text-xl font-bold">Request details</h2><p className="mt-1 text-sm text-[#73798b]">Submitting assigns the selected available mentor to the team, subject to server authorization and availability checks.</p></div>
              <div className="grid gap-5 md:grid-cols-3">
                <label className="text-sm font-semibold text-[#4b5365]">Team you lead<select value={teamId} onChange={(event) => setTeamId(event.target.value)} required className="mt-2 w-full rounded-lg border border-[#dfe4ee] bg-[#f6f7ff] px-3 py-3 text-sm">{teams.map((team) => <option key={idOf(team)} value={idOf(team)}>{team.teamName}</option>)}</select></label>
                <label className="text-sm font-semibold text-[#4b5365]">Focus area<input value={focusArea} onChange={(event) => setFocusArea(event.target.value)} maxLength={100} placeholder="e.g. Product design" className="mt-2 w-full rounded-lg border border-[#dfe4ee] bg-[#f6f7ff] px-3 py-3 text-sm font-normal" /></label>
                <label className="text-sm font-semibold text-[#4b5365]">Preferred time window<select value={preferredTimeWindow} onChange={(event) => setPreferredTimeWindow(event.target.value)} className="mt-2 w-full rounded-lg border border-[#dfe4ee] bg-[#f6f7ff] px-3 py-3 text-sm font-normal"><option value="">No preference</option><option>Weekdays</option><option>Weeknights</option><option>Weekends</option><option>Flexible</option></select></label>
              </div>
              <label className="mt-5 block text-sm font-semibold text-[#4b5365]">Guidance request<textarea value={guidanceRequest} onChange={(event) => setGuidanceRequest(event.target.value)} maxLength={600} rows={4} placeholder="Describe the guidance your team is looking for." className="mt-2 w-full resize-y rounded-lg border border-[#dfe4ee] bg-[#f6f7ff] px-3 py-3 text-sm font-normal" /></label>
              <div className="mt-2 flex justify-between text-xs text-[#81889a]"><span>Request details are saved with the team mentor assignment.</span><span>{guidanceRequest.length}/600</span></div>
              {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => navigate('/student/mentor-request-status')} className="rounded-lg px-4 py-3 text-sm font-semibold text-[#596174]">Cancel</button><button type="submit" disabled={submitting || !teams.length || !selectedMentor} className="rounded-lg bg-[#5b4bdc] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Submitting...' : 'Send request'}</button></div>
            </form>
          </>
        )}
      </div>
    </main>
  );
};

export default StudentMentorRequest;
