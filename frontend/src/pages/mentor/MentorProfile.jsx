import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Building,
  Award,
  Calendar,
  Star,
  Edit3,
  ExternalLink,
  CheckCircle2,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { fetchMentorProfile } from '../../services/mentor/profileApi';

const LinkedInIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

const GitHubIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

export default function MentorProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: '', role: '', institution: '', bio: '', email: '', phoneNumber: '',
    stats: {}, competencies: [], social: {}, recentActions: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchMentorProfile()
      .then((data) => {
        if (data) {
          setUser((prev) => ({
            ...prev,
            ...data,
            name: data.name || prev.name,
            institution: data.companyName || data.institution || prev.institution,
            competencies: Array.isArray(data.expertiseDomains) && data.expertiseDomains.length
              ? data.expertiseDomains
              : prev.competencies,
          }));
        }
      })
      .catch((err) => {
        console.warn('Profile fetch failed:', err);
        setLoadError('Unable to load your mentor profile. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Loading profile...</div>;
  if (loadError) return <div role="alert" className="py-12 text-center text-sm text-rose-500">{loadError}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Profile Banner & Header Card */}
      <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        {/* Top Decorative Lavender Banner */}
        <div className="h-28 bg-gradient-to-r from-[#5B45D9]/15 via-[#6C4CE8]/10 to-blue-500/10 dark:from-purple-950/40 dark:to-navy-950" />

        <div className="px-6 sm:px-8 pb-7 -mt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-24 h-24 rounded-2xl bg-[#5B45D9] text-white flex items-center justify-center font-extrabold text-2xl ring-4 ring-white dark:ring-[#111625] shadow-md">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {user.name}
                </h1>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">
                  Verified Mentor
                </span>
              </div>
              <p className="text-xs text-[#5B45D9] dark:text-purple-300 font-semibold mt-0.5">
                {user.role} · <span className="text-slate-500 dark:text-slate-400 font-normal">{user.institution}</span>
              </p>
            </div>
          </div>

          <Link
            to="/mentor/profile/edit"
            className="px-4 py-2 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs shadow-purple-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#111625] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
          <span className="text-xs font-semibold text-slate-400">Teams Mentoring</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {user.stats?.teams ?? '?'}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#111625] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
          <span className="text-xs font-semibold text-slate-400">Mentor Rating</span>
          <p className="text-2xl font-extrabold text-amber-500 mt-1 flex items-center justify-center gap-1">
            <Star className="w-5 h-5 fill-amber-400" />
            {user.stats?.rating ?? '?'}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#111625] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
          <span className="text-xs font-semibold text-slate-400">Sessions Completed</span>
          <p className="text-2xl font-extrabold text-[#5B45D9] mt-1">
            {user.stats?.sessions ?? '?'}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#111625] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
          <span className="text-xs font-semibold text-slate-400">Alumni Cohorts</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {user.stats?.completedMentorships ?? '?'}
          </p>
        </div>
      </div>

      {/* Two Column Grid: Left About & Skills, Right Activity & Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* About / Bio */}
          <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              About & Mentorship Philosophy
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {user.bio}
            </p>
          </div>

          {/* Competencies */}
          <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Areas of Expertise
            </h2>
            <div className="flex flex-wrap gap-2 pt-1">
              {(user.competencies || []).map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contact & Social Links */}
          <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Contact & Social Channels
            </h2>
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300 font-medium">
                <Mail className="w-4 h-4 text-[#5B45D9]" />
                {user.email}
              </div>
              {user.social?.linkedin && (
                <a
                  href={user.social.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5 hover:border-[#5B45D9] text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <LinkedInIcon className="w-4 h-4 text-blue-600" />
                    LinkedIn Profile
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
              {user.social?.github && (
                <a
                  href={user.social.github}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5 hover:border-[#5B45D9] text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <GitHubIcon className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                    GitHub Profile
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
            </div>
          </div>

          {/* Recent Mentorship Log */}
          <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Recent Mentorship Actions
            </h2>
            <div className="space-y-3 pt-1 text-xs">
              {user.recentActions?.length ? user.recentActions.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#5B45D9] mt-1.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">{act.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{act.detail} · {act.time}</p>
                  </div>
                </div>
              )) : <p className="py-5 text-center text-xs text-slate-400">No recent activity.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
