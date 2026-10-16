import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchHackathonById } from '../../api/hackathonApi';
import { fetchMyApplications } from '../../api/applicationApi';
import { getMyTeams } from '../../api/teamApi';

const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not provided' : new Intl.DateTimeFormat('en-US', options).format(date);
};

const dateRange = (start, end) => {
  if (!start && !end) return 'Dates not provided';
  if (!end) return formatDate(start);
  if (!start) return formatDate(end);
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 'Dates not provided';
  const sameYear = from.getFullYear() === to.getFullYear();
  const first = formatDate(start, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
  return `${first} – ${formatDate(end)}`;
};

const formatPrize = (prize) => {
  if (prize?.amount !== undefined && prize?.amount !== null && prize.amount !== '') return String(prize.amount);
  return prize?.title || prize?.name || '';
};

const registrationWindowOpen = (hackathon) => {
  const now = Date.now();
  const start = hackathon.registrationStart ? new Date(hackathon.registrationStart).getTime() : null;
  const end = hackathon.registrationEnd ? new Date(hackathon.registrationEnd).getTime() : null;
  const status = String(hackathon.status || '').toLowerCase();
  if (['draft', 'completed', 'results announced', 'judging', 'ongoing', 'registration closed', 'cancelled'].includes(status)) return false;
  return (start === null || (!Number.isNaN(start) && now >= start))
    && (end === null || (!Number.isNaN(end) && now <= end));
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-start gap-3">
    <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0edff] text-[#5746d8]">•</span>
    <div><dt className="text-sm text-[#737284]">{label}</dt><dd className="mt-1 font-semibold text-[#242334]">{value || 'Not provided'}</dd></div>
  </div>
);

const StudentHackathonDetails = () => {
  const { hackathonId } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [application, setApplication] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicationError, setApplicationError] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setApplicationError('');
    setHackathon(null);
    setApplication(null);
    setTeam(null);

    fetchHackathonById(hackathonId).then((data) => {
      if (active) setHackathon({ ...data, id: data.id || data._id });
    }).catch((requestError) => {
      if (active) setError(requestError?.response?.status === 404
        ? 'This hackathon could not be found or is no longer available.'
        : 'Hackathon details could not be loaded. Please try again.');
    }).finally(() => { if (active) setLoading(false); });

    Promise.all([fetchMyApplications(), getMyTeams()]).then(([applications, teams]) => {
      if (!active) return;
      const registration = applications.find((item) => String(item.hackathonId) === String(hackathonId));
      setApplication(registration || null);
      const matchingTeam = teams.find((item) => String(item.hackathonId) === String(hackathonId)
        && (!registration?.teamId || String(item.id || item._id) === String(registration.teamId)));
      setTeam(matchingTeam || null);
    }).catch(() => {
      if (active) setApplicationError('Your registration or team status could not be verified.');
    });

    return () => { active = false; };
  }, [hackathonId]);

  const registerOpen = useMemo(() => hackathon ? registrationWindowOpen(hackathon) : false, [hackathon]);
  const prizes = Array.isArray(hackathon?.prizes) ? hackathon.prizes : [];

  const shareHackathon = async () => {
    const url = window.location.href;
    setShareMessage('');
    try {
      if (navigator.share) {
        await navigator.share({ title: hackathon.title, url });
        setShareMessage('Hackathon link shared.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMessage('Hackathon link copied.');
      } else {
        setShareMessage('Sharing is not available in this browser.');
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setShareMessage('Could not share the hackathon link.');
    }
  };

  const primaryAction = () => {
    if (application) {
      if (team) navigate(`/student/teams/${encodeURIComponent(team.id || team._id)}/workspace`);
      else navigate('/student/teams');
      return;
    }
    navigate(`/student/hackathons/${encodeURIComponent(hackathonId)}/register`);
  };

  if (loading) return <main className="-m-6 min-h-full bg-[#fbf9ff] p-6 text-[#242334] lg:-m-10 lg:p-10"><div role="status" className="mx-auto max-w-5xl animate-pulse rounded-2xl border border-[#d8d2e5] bg-white p-10 text-[#777488]">Loading hackathon details...</div></main>;

  if (error || !hackathon) return (
    <main className="-m-6 min-h-full bg-[#fbf9ff] p-6 text-[#242334] lg:-m-10 lg:p-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#d8d2e5] bg-white p-10 text-center">
        <h1 className="text-2xl font-bold">Hackathon unavailable</h1><p role="alert" className="mt-3 text-[#6d6a7c]">{error || 'This hackathon is unavailable.'}</p>
        <button onClick={() => navigate('/student/hackathons')} className="mt-6 rounded-xl bg-[#5b49dc] px-5 py-3 font-semibold text-white">Back to Hackathons</button>
      </div>
    </main>
  );

  const location = hackathon.location || 'Not provided';
  const themes = Array.isArray(hackathon.themes) ? hackathon.themes : [];
  const resources = Array.isArray(hackathon.resources) ? hackathon.resources : [];
  const rules = Array.isArray(hackathon.rules) ? hackathon.rules : [];

  return (
    <main className="-m-6 min-h-full bg-[#fbf9ff] px-4 py-6 text-[#242334] sm:px-6 lg:-m-10 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-[#777488]"><Link to="/student/hackathons" className="hover:text-[#5740d6]">Hackathons</Link><span>›</span><span className="font-semibold text-[#292738]">{hackathon.title}</span></nav>

        <header className="relative overflow-hidden rounded-2xl border border-[#d8d2e5] bg-white shadow-sm">
          {hackathon.posterUrl && <img src={hackathon.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className={`absolute inset-0 ${hackathon.posterUrl ? 'bg-gradient-to-r from-white via-white/95 to-white/55' : 'bg-white'}`} />
          <div className="relative flex min-h-[190px] flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-[#d7d1ff] bg-[#f1eeff] px-3 py-1 text-sm font-semibold text-[#5746d8]">{hackathon.status || 'Status not provided'}</span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#20202b] sm:text-4xl">{hackathon.title}</h1>
              {hackathon.organizerName && <p className="mt-3 flex items-center gap-2 text-lg text-[#636174]"><span aria-hidden="true">▦</span>{hackathon.organizerName}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={Boolean(applicationError) || (!application && !registerOpen)} onClick={primaryAction} className="rounded-xl bg-[#5b49dc] px-7 py-3.5 text-lg font-semibold text-white shadow-sm transition hover:bg-[#4938c4] disabled:cursor-not-allowed disabled:opacity-50">
                {application ? (team ? 'Manage Team' : 'View Registration') : registerOpen ? 'Register Now' : 'Registration Closed'}
              </button>
              {application && <span className="text-center text-sm font-semibold capitalize text-[#5146c9]">{application.status || 'Registered'}</span>}
            </div>
          </div>
        </header>

        {applicationError && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{applicationError} Registration actions are disabled until status can be confirmed.</div>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section id="overview" className="rounded-2xl border border-[#d8d2e5] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold">Challenge Overview</h2>
            <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-[#5f5e70]">{hackathon.description || 'Description not provided.'}</p>
            {hackathon.problemStatement && <div className="mt-6"><h3 className="text-lg font-bold">Problem Statement</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-[#5f5e70]">{hackathon.problemStatement}</p></div>}
            <div className="mt-7"><h3 className="text-lg font-bold">Themes</h3>{themes.length ? <div className="mt-3 flex flex-wrap gap-2">{themes.map((theme) => <span key={theme} className="rounded-full border border-[#d7d1e5] bg-[#f0edfb] px-4 py-2 text-sm font-medium text-[#555366]">{theme}</span>)}</div> : <p className="mt-2 text-sm text-[#777488]">Themes not provided.</p>}</div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#d8d2e5] bg-[#f5f2ff] p-4"><p className="text-sm text-[#706d80]">Registration deadline</p><p className="mt-1 font-semibold">{formatDate(hackathon.registrationEnd)}</p></div>
              <div className="rounded-xl border border-[#d8d2e5] bg-[#f5f2ff] p-4"><p className="text-sm text-[#706d80]">Mode / venue</p><p className="mt-1 font-semibold">{location}</p></div>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-[#d8d2e5] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">Key Details</h2>
            <dl className="mt-5 space-y-5">
              <DetailRow label="Registration Deadline" value={formatDate(hackathon.registrationEnd)} />
              <DetailRow label="Hackathon Dates" value={dateRange(hackathon.hackathonStart, hackathon.hackathonEnd)} />
              <DetailRow label="Team Size" value={hackathon.minTeamSize != null && hackathon.maxTeamSize != null ? `${hackathon.minTeamSize} – ${hackathon.maxTeamSize} members` : 'Not provided'} />
              <DetailRow label="Mode / Venue" value={location} />
              {hackathon.maxTeams != null && <DetailRow label="Team Capacity" value={`${hackathon.maxTeams} teams`} />}
            </dl>
            <div className="my-6 border-t border-[#ddd8e7]" />
            <h3 className="font-semibold">Prizes</h3>
            {prizes.length ? <ul className="mt-3 space-y-2">{prizes.map((prize, index) => <li key={`${prize.title || prize.name || 'prize'}-${index}`} className="flex justify-between gap-3 text-sm"><span className="text-[#656376]">{prize.title || prize.name || `Prize ${index + 1}`}</span><span className="font-semibold text-[#5b49dc]">{formatPrize(prize) || 'Amount not provided'}</span></li>)}</ul> : <p className="mt-2 text-sm text-[#777488]">Prize details not provided.</p>}
            <button type="button" onClick={shareHackathon} className="mt-6 w-full rounded-xl border border-[#9a96a9] bg-white px-4 py-3 font-semibold text-[#292738] transition hover:bg-[#f7f5fb]">Share Hackathon</button>
            {shareMessage && <p role="status" className="mt-2 text-center text-sm text-[#5146c9]">{shareMessage}</p>}
          </aside>
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold">Challenge Tracks</h2>
          {themes.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{themes.map((theme) => <article key={theme} className="rounded-2xl bg-[#eef3ff] p-5"><span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl text-[#176ca9]">◇</span><h3 className="mt-4 text-lg font-bold text-[#1f2d45]">{theme}</h3></article>)}</div> : <div className="rounded-xl border border-dashed border-[#d8d2e5] bg-white p-6 text-[#777488]">No challenge tracks have been provided.</div>}
        </section>

        {(rules.length > 0 || resources.length > 0 || hackathon.templateUrl) && <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {rules.length > 0 && <article id="rules" className="rounded-2xl border border-[#d8d2e5] bg-white p-6"><h2 className="text-xl font-bold">Rules</h2><ol className="mt-4 list-decimal space-y-2 pl-5 text-[#5f5e70]">{rules.map((rule, index) => <li key={`${index}-${rule}`}>{rule}</li>)}</ol></article>}
          {(resources.length > 0 || hackathon.templateUrl) && <article id="resources" className="rounded-2xl border border-[#d8d2e5] bg-white p-6"><h2 className="text-xl font-bold">Resources</h2><div className="mt-4 space-y-3">{hackathon.templateUrl && <a href={hackathon.templateUrl} target="_blank" rel="noreferrer" className="block text-[#5146c9] underline">Download submission template</a>}{resources.map((resource, index) => { const href = resource.url || resource.href; const label = resource.title || resource.name || href || 'Resource'; return href ? <a key={`${href}-${index}`} href={href} target="_blank" rel="noreferrer" className="block text-[#5146c9] underline">{label}</a> : <p key={`resource-${index}`} className="text-[#5f5e70]">{label}</p>; })}</div></article>}
        </section>}

        <div className="mt-8"><button type="button" onClick={() => navigate('/student/hackathons')} className="rounded-xl px-1 py-2 font-semibold text-[#5740d6] hover:text-[#4530bd]">← Back to Hackathons</button></div>
      </div>
    </main>
  );
};

export default StudentHackathonDetails;
