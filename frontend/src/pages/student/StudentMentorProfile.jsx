import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAvailableMentors } from '../../api/profileApi';

const mentorId = (mentor) => String(mentor?._id || mentor?.id || mentor?.userId || '');

const StudentMentorProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get('mentorId') || '';
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchAvailableMentors().then((mentors) => {
      if (!active) return;
      const list = Array.isArray(mentors) ? mentors : [];
      setMentor(list.find((item) => mentorId(item) === selectedId) || null);
      if (!selectedId) setError('Choose a mentor from the mentor directory to view their profile.');
    }).catch((failure) => {
      if (active) setError(failure?.response?.data?.error?.message || failure?.response?.data?.detail || 'Mentor profile could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const skills = (mentor?.expertiseDomains || mentor?.expertiseAreas || []).map((item) => typeof item === 'string' ? item : item?.name || item?.label).filter(Boolean);
  const name = mentor?.name || 'Mentor';
  const position = mentor?.currentPosition || mentor?.headline || '';
  const company = mentor?.companyName || mentor?.company || '';
  const safeLinks = [[mentor?.linkedinUrl, 'LinkedIn'], [mentor?.githubUrl, 'GitHub'], [mentor?.portfolioUrl, 'Portfolio']]
    .filter(([url]) => typeof url === 'string' && /^https?:\/\//i.test(url));

  return <main className="min-h-screen bg-[#fbf9ff] px-4 py-8 text-[#182338] sm:px-6 lg:px-10">
    <div className="mx-auto max-w-[1440px]">
      <nav className="mb-5 text-sm text-[#687286]">Hackathons <span className="px-2">›</span> Mentor Discovery <span className="px-2">›</span> {name}</nav>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold sm:text-4xl">Mentor Profile</h1><p className="mt-2 text-[#73798b]">Review the mentor information currently available in HackZen.</p></div><button onClick={() => navigate('/student/mentor-request')} className="rounded-xl bg-[#5b4bdc] px-5 py-3 text-sm font-semibold text-white">Request Mentor</button></div>
      {loading ? <div className="rounded-2xl border border-[#e3e7ef] bg-white p-10 text-center text-[#697386]">Loading mentor profile...</div> : error || !mentor ? <div className="rounded-2xl border border-dashed border-[#dfe4ee] bg-white p-10 text-center"><h2 className="text-xl font-bold">{error ? 'Mentor profile unavailable' : 'Mentor not found'}</h2><p role={error ? 'alert' : undefined} className="mt-2 text-sm text-[#73798b]">{error || 'This mentor is no longer in the available mentor directory.'}</p><button onClick={() => navigate('/student/mentor-request')} className="mt-5 rounded-lg border border-[#dfe3ed] px-4 py-2.5 text-sm font-semibold">Back to mentor directory</button></div> : <div className="grid gap-5 lg:grid-cols-[minmax(300px,.78fr)_minmax(0,1.6fr)]">
        <div className="space-y-5"><section className="rounded-2xl border border-[#e0e4ed] bg-white p-7 text-center shadow-sm"><div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#f0edff] bg-[#e9edff] text-3xl font-bold text-[#4b55c7]">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><h2 className="mt-5 text-2xl font-bold">{name}</h2>{position && <p className="mt-1 text-[#626b7e]">{position}</p>}{company && <p className="text-sm text-[#747d90]">{company}</p>}<p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">{mentor.availability || mentor.availabilityStatus || 'Availability not provided'}</p><button onClick={() => navigate(`/student/mentor-request?mentorId=${encodeURIComponent(mentorId(mentor))}`)} className="mt-6 w-full rounded-lg border border-[#6254e8] px-4 py-3 font-semibold text-[#5749d6]">Request this mentor</button></section>
          <section className="rounded-2xl border border-[#e0e4ed] bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Experience</h2><p className="mt-3 text-[#5f687a]">{mentor.experienceYears ?? mentor.yearsOfExperience ?? 'Not provided'}{mentor.experienceYears != null || mentor.yearsOfExperience != null ? ' years' : ''}</p>{mentor.totalHackathonsMentored != null && <p className="mt-3 text-sm text-[#73798b]">Hackathons mentored: {mentor.totalHackathonsMentored}</p>}{mentor.averageRating > 0 && <p className="mt-2 text-sm text-[#73798b]">Average rating: {mentor.averageRating}{mentor.totalReviews ? ` (${mentor.totalReviews} reviews)` : ''}</p>}</section></div>
        <div className="space-y-5"><section className="rounded-2xl border border-[#e0e4ed] bg-white p-7 shadow-sm"><h2 className="text-xl font-bold">About</h2><p className="mt-4 whitespace-pre-line leading-7 text-[#5e6779]">{mentor.bio || 'This mentor has not added a biography.'}</p></section><section className="rounded-2xl border border-[#e0e4ed] bg-white p-7 shadow-sm"><h2 className="text-xl font-bold">Expertise &amp; Skills</h2><div className="mt-4 flex flex-wrap gap-2">{skills.length ? skills.map((skill) => <span key={skill} className="rounded-full bg-[#eeefff] px-3 py-2 text-sm font-medium text-[#414eaf]">{skill}</span>) : <p className="text-sm text-[#73798b]">No expertise details are available.</p>}</div></section>
          {safeLinks.length > 0 && <section className="rounded-2xl border border-[#e0e4ed] bg-white p-7 shadow-sm"><h2 className="text-xl font-bold">Links</h2><div className="mt-4 flex flex-wrap gap-3">{safeLinks.map(([url, label]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-[#f0f3ff] px-4 py-2 text-sm font-semibold text-[#315bbb]">{label}</a>)}</div></section>}
        </div>
      </div>}
    </div>
  </main>;
};

export default StudentMentorProfile;
