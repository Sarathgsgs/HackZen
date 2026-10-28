import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAvailableMentors } from '../../api/profileApi';
import { assignMentor, getMyTeams } from '../../api/teamApi';

const idOf = (item) => String(item?._id || item?.id || item?.userId || '');
const errorText = (error) => error?.response?.data?.error?.message || error?.response?.data?.detail || 'The request could not be completed. Please try again.';

const StudentMentorRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formSectionRef = useRef(null);
  const mentorsSectionRef = useRef(null);

  const [mentors, setMentors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [mentorId, setMentorId] = useState(searchParams.get('mentorId') || '');
  const [teamId, setTeamId] = useState(searchParams.get('teamId') || '');
  const [focusArea, setFocusArea] = useState('');
  const [preferredTimeWindow, setPreferredTimeWindow] = useState('Weekdays');
  const [guidanceRequest, setGuidanceRequest] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  let currentUser = {};
  try {
    currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
  } catch {
    currentUser = {};
  }
  const currentUserId = currentUser?._id || currentUser?.id || '';

  useEffect(() => {
    let active = true;
    Promise.all([fetchAvailableMentors(), getMyTeams()]).then(([mentorRows, teamRows]) => {
      if (!active) return;
      const available = Array.isArray(mentorRows) ? mentorRows : [];
      const ledTeams = (Array.isArray(teamRows) ? teamRows : []).filter((team) => {
        const role = String(team.myRole || team.roleInTeam || team.role || '').toLowerCase();
        return role === 'leader' || role === 'team lead' || team.leaderId === currentUserId || team.createdBy === currentUserId;
      });

      setMentors(available);
      setTeams(ledTeams);

      // Auto-select mentor if specified in URL or already in state
      const targetMentorId = searchParams.get('mentorId');
      if (targetMentorId && available.some((m) => idOf(m) === targetMentorId)) {
        setMentorId(targetMentorId);
      } else if (!mentorId && available.length > 0) {
        // Keep mentorId empty until user actively chooses one
      }

      // Auto-select first led team so state matches dropdown
      const targetTeamId = searchParams.get('teamId');
      if (targetTeamId && ledTeams.some((t) => idOf(t) === targetTeamId)) {
        setTeamId(targetTeamId);
      } else if (ledTeams.length > 0) {
        setTeamId((prev) => (prev && ledTeams.some((t) => idOf(t) === prev) ? prev : idOf(ledTeams[0])));
      }
    }).catch((loadFailure) => {
      if (active) setLoadError(errorText(loadFailure));
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [searchParams, currentUserId]);

  const selectedMentor = useMemo(() => mentors.find((mentor) => idOf(mentor) === mentorId), [mentors, mentorId]);
  const selectedTeam = useMemo(() => teams.find((team) => idOf(team) === teamId), [teams, teamId]);

  const handleSelectMentor = (id) => {
    setMentorId(id);
    setError('');
    // Smoothly scroll down to the request details form
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleScrollToMentors = () => {
    mentorsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!selectedMentor) {
      setError('Please select an available mentor from the cards above before submitting.');
      handleScrollToMentors();
      return;
    }

    if (!selectedTeam) {
      setError('Please choose a team you lead to request mentorship.');
      return;
    }

    if (guidanceRequest.trim().length > 600) {
      setError('Please keep your guidance request to 600 characters or fewer.');
      return;
    }

    setSubmitting(true);
    try {
      const targetMentorUserId = selectedMentor.userId || selectedMentor._id || mentorId;
      await assignMentor(idOf(selectedTeam), {
        mentorId: String(targetMentorUserId),
        focusArea: focusArea.trim(),
        guidanceRequest: guidanceRequest.trim(),
        preferredTimeWindow: preferredTimeWindow || 'Flexible',
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
          <div>
            <p className="text-sm font-semibold text-[#5964a1]">Mentors &amp; Guidance</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Request a Mentor</h1>
            <p className="mt-2 text-[#73798b]">Select an industry mentor from the list below and describe what guidance your team needs.</p>
          </div>
          <button
            onClick={() => navigate('/student/mentor-request-status')}
            className="rounded-xl border border-[#e2e5ef] bg-white px-4 py-3 text-sm font-semibold text-[#39445c] transition hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            View mentor status →
          </button>
        </header>

        {loadError && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#e4e7ef] bg-white p-12 text-center text-[#697386]">
            Loading available mentors and your teams...
          </div>
        ) : (
          <>
            {teams.length === 0 && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-xs">
                <p className="font-semibold text-base mb-1">Team Lead Access Required</p>
                Only team leaders can submit mentor requests. You do not currently lead an active team. Create a team first or have your team lead submit this request.
              </div>
            )}

            {/* Mentors Grid */}
            <div ref={mentorsSectionRef} className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1f2638]">Available Mentors ({mentors.length})</h2>
              {selectedMentor && (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                  Selected: {selectedMentor.name}
                </span>
              )}
            </div>

            <section aria-label="Available mentors" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {mentors.map((mentor) => {
                const id = idOf(mentor);
                const selected = mentorId === id;
                const skills = (mentor.expertiseDomains || mentor.expertiseAreas || []).map((item) => typeof item === 'string' ? item : item?.name || item?.label).filter(Boolean);

                return (
                  <article
                    key={id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition-all ${
                      selected
                        ? 'border-[#5b4bdc] ring-2 ring-[#5b4bdc] bg-[#faf8ff] shadow-md'
                        : 'border-[#e5e8f1] hover:border-[#ccd3e5] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#edf1ff] font-bold text-[#455bd4]">
                        {(mentor.name || 'M').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-lg font-bold text-[#182338]">{mentor.name || 'Mentor'}</h2>
                          {selected && (
                            <span className="shrink-0 rounded-full bg-[#5b4bdc] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                              Chosen
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#70798d] truncate">
                          {mentor.currentPosition || mentor.headline || 'Mentor'}
                          {mentor.companyName || mentor.company ? ` at ${mentor.companyName || mentor.company}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-[#7d8495]">
                          {mentor.experienceYears ?? mentor.yearsOfExperience ? `${mentor.experienceYears ?? mentor.yearsOfExperience} yrs experience` : 'Experience not specified'}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shrink-0">
                        {mentor.availability || mentor.availabilityStatus || 'Available'}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-[#626b7d]">
                      {mentor.bio || mentor.headline || 'No biography has been provided.'}
                    </p>

                    <div className="mt-3 flex min-h-8 flex-wrap gap-1.5">
                      {skills.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded-md bg-[#f0f3ff] px-2.5 py-1 text-xs font-medium text-[#3b5fbd]">
                          {skill}
                        </span>
                      ))}
                      {skills.length > 4 && (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
                          +{skills.length - 4}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectMentor(id)}
                        className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition cursor-pointer ${
                          selected
                            ? 'bg-[#5b4bdc] text-white shadow-sm hover:bg-[#4d3cc8]'
                            : 'bg-[#f0f2ff] text-[#3f5fd2] hover:bg-[#e4e8ff]'
                        }`}
                      >
                        {selected ? '✓ Selected' : 'Select mentor ↓'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/student/mentor-profile?mentorId=${encodeURIComponent(id)}`)}
                        className="rounded-xl border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#424b60] transition hover:bg-slate-50 cursor-pointer"
                      >
                        Profile
                      </button>
                    </div>
                  </article>
                );
              })}

              {!mentors.length && !loadError && (
                <div className="rounded-2xl border border-dashed border-[#dce1eb] bg-white p-12 text-center text-[#697386] lg:col-span-3">
                  No available mentor profiles found right now.
                </div>
              )}
            </section>

            {/* Request Details Form */}
            <form
              ref={formSectionRef}
              onSubmit={submit}
              className="mt-8 rounded-2xl border border-[#e5e8f1] bg-white p-6 shadow-sm sm:p-8 scroll-mt-6"
            >
              <div className="mb-6 border-b border-[#e8eaf1] pb-5">
                <h2 className="text-2xl font-bold text-[#1a233a]">Request details</h2>
                <p className="mt-1 text-sm text-[#73798b]">
                  Submitting assigns the selected mentor to your squad and notifies them in their mentor dashboard.
                </p>
              </div>

              {/* Selected Mentor Banner */}
              <div className="mb-6">
                {selectedMentor ? (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#5b4bdc]/30 bg-[#f8f6ff] p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5b4bdc] text-white font-bold text-lg">
                        {(selectedMentor.name || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#5b4bdc]">Target Mentor</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Available</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#1a233a]">{selectedMentor.name}</h3>
                        <p className="text-xs sm:text-sm text-[#6c748a]">
                          {selectedMentor.currentPosition || selectedMentor.headline || 'Industry Mentor'}
                          {selectedMentor.companyName || selectedMentor.company ? ` at ${selectedMentor.companyName || selectedMentor.company}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleScrollToMentors}
                      className="rounded-lg border border-[#5b4bdc]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#5b4bdc] hover:bg-purple-50 transition cursor-pointer"
                    >
                      Change mentor
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={handleScrollToMentors}
                    className="flex items-center justify-between rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 p-4 text-indigo-900 cursor-pointer hover:bg-indigo-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👆</span>
                      <div>
                        <p className="font-bold text-sm sm:text-base">No mentor selected yet</p>
                        <p className="text-xs text-indigo-700">Click &ldquo;Select mentor&rdquo; on any mentor card above to proceed.</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#5b4bdc] underline">Choose a mentor</span>
                  </div>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="text-sm font-semibold text-[#4b5365]">
                  Team you lead *
                  <select
                    value={teamId}
                    onChange={(event) => {
                      setTeamId(event.target.value);
                      setError('');
                    }}
                    required
                    className="mt-2 w-full rounded-xl border border-[#dfe4ee] bg-[#f6f7ff] px-3.5 py-3 text-sm font-medium text-[#1e2738] outline-none focus:border-[#5b4bdc]"
                  >
                    {teams.map((team) => (
                      <option key={idOf(team)} value={idOf(team)}>
                        {team.teamName || team.name || 'Your Team'}
                      </option>
                    ))}
                    {!teams.length && (
                      <option value="">No teams available (Team lead role required)</option>
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-[#4b5365]">
                  Focus area
                  <input
                    value={focusArea}
                    onChange={(event) => setFocusArea(event.target.value)}
                    maxLength={100}
                    placeholder="e.g. Architecture, Pitch, ML model"
                    className="mt-2 w-full rounded-xl border border-[#dfe4ee] bg-[#f6f7ff] px-3.5 py-3 text-sm font-normal text-[#1e2738] outline-none focus:border-[#5b4bdc]"
                  />
                </label>

                <label className="text-sm font-semibold text-[#4b5365]">
                  Preferred time window
                  <select
                    value={preferredTimeWindow}
                    onChange={(event) => setPreferredTimeWindow(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#dfe4ee] bg-[#f6f7ff] px-3.5 py-3 text-sm font-normal text-[#1e2738] outline-none focus:border-[#5b4bdc]"
                  >
                    <option value="Weekdays">Weekdays</option>
                    <option value="Weeknights">Weeknights</option>
                    <option value="Weekends">Weekends</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </label>
              </div>

              <label className="mt-5 block text-sm font-semibold text-[#4b5365]">
                Guidance request
                <textarea
                  value={guidanceRequest}
                  onChange={(event) => {
                    setGuidanceRequest(event.target.value);
                    if (error) setError('');
                  }}
                  maxLength={600}
                  rows={4}
                  placeholder="Describe your current project challenge or what specific advice you need from this mentor."
                  className="mt-2 w-full resize-y rounded-xl border border-[#dfe4ee] bg-[#f6f7ff] px-4 py-3 text-sm font-normal text-[#1e2738] outline-none focus:border-[#5b4bdc]"
                />
              </label>

              <div className="mt-2 flex justify-between text-xs text-[#81889a]">
                <span>Request details will be delivered to the mentor and saved in your team workspace.</span>
                <span className={guidanceRequest.length > 550 ? 'font-bold text-amber-600' : ''}>
                  {guidanceRequest.length}/600
                </span>
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                  {error}
                </p>
              )}

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#e8eaf1] pt-5">
                <button
                  type="button"
                  onClick={() => navigate('/student/mentor-request-status')}
                  className="rounded-xl px-5 py-3 text-sm font-semibold text-[#596174] hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !teams.length || !selectedMentor}
                  className="rounded-xl bg-[#5b4bdc] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d3cc8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Sending Request...' : 'Send request'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
};

export default StudentMentorRequest;
