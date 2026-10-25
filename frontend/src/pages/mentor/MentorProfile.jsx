import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Edit3,
  ChevronRight,
  User,
  Sparkles,
  Mail
} from 'lucide-react';
import { fetchMentorProfile } from '../../services/mentor/profileApi';
import { useMentor } from '../../context/MentorContext';

export default function MentorProfile() {
  const navigate = useNavigate();
  const { openScheduleModal, addToast } = useMentor();

  const [user, setUser] = useState({
    name: '', fullName: '', role: 'Mentor', institution: '', location: '', avatar: '',
    bio: '', email: '', phoneNumber: '', availabilityStatus: '', availableSlots: [], mentorshipActiveSince: '',
    skills: [], technicalStrengths: [], mentorshipStyle: [], experiences: [],
    stats: {}, competencies: [], recentActions: [],
    social: { linkedin: '', github: '' }
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchMentorProfile()
      .then((data) => {
        if (data) {
          setUser((prev) => ({
            ...prev,
            ...data,
            name: data.name ? (data.name.includes(' ') ? data.name.split(' ')[0] : data.name) : '',
            fullName: data.name || '',
            role: data.role || 'Mentor',
            institution: data.companyName || data.institution || '',
            bio: data.bio || '',
            skills: Array.isArray(data.expertiseDomains) && data.expertiseDomains.length
              ? data.expertiseDomains
              : Array.isArray(data.expertise) && data.expertise.length
                ? data.expertise
                : [],
            availabilityStatus: data.availability || '',
            social: {
              ...prev.social,
              linkedin: data.links?.linkedin || data.linkedinUrl || prev.social.linkedin,
              github: data.links?.github || data.githubUrl || prev.social.github,
            }
          }));
        }
      })
      .catch((err) => {
        console.warn('Profile fetch failed:', err);
        setLoadError('Unable to load your mentor profile. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const initials = (user.fullName || user.name || 'M')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleRequestMentor = () => {
    if (typeof openScheduleModal === 'function') {
      openScheduleModal({ mentorName: user.fullName || user.name, role: user.role });
    }
    if (typeof addToast === 'function') {
      addToast(
        'Mentorship Requested',
        `Your request has been routed to ${user.fullName || user.name}.`,
        'success'
      );
    }
  };

  const handleViewLinkedIn = () => {
    const url = user.social?.linkedin || user.linkedinUrl;
    if (url && url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      if (typeof addToast === 'function') {
        addToast(
          'LinkedIn Profile',
          'Opening verified LinkedIn directory...',
          'info'
        );
      }
      window.open(`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(user.fullName || user.name)}`, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Loading profile...</div>;
  if (loadError) return <div role="alert" className="py-12 text-center text-sm text-rose-500">{loadError}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300 font-sans">
      {/* Top Header & Breadcrumb */}
      <div>
        {/* Breadcrumb matching Reference Image 1 */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
          <Link to="/mentor/hackathons" className="hover:text-[#2563eb] transition-colors">
            Hackathons
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/mentor/teams" className="hover:text-[#2563eb] transition-colors">
            Mentor Discovery
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {user.fullName || user.name}
          </span>
        </div>

        {/* Page Title & Edit Shortcut */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mentor Profile
          </h1>
          <Link
            to="/mentor/profile/edit"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111625] text-slate-700 dark:text-slate-200 hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:text-blue-300 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
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
            {user.stats?.teams ?? 0}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#111625] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
          <span className="text-xs font-semibold text-slate-400">Mentor Rating</span>
          <p className="text-2xl font-extrabold text-amber-500 mt-1 flex items-center justify-center gap-1">
            <Star className="w-5 h-5 fill-amber-400" />
            {user.stats?.rating ?? '4.9'}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#111625] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
          <span className="text-xs font-semibold text-slate-400">Sessions Completed</span>
          <p className="text-2xl font-extrabold text-[#2563eb] mt-1">
            {user.stats?.sessions ?? 0}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#111625] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
          <span className="text-xs font-semibold text-slate-400">Alumni Cohorts</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {user.stats?.completedMentorships ?? 0}
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout (Matching Reference Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Mentor Profile Card & Availability Card (span 4) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* A. Mentor Profile Card */}
          <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs text-center transition-colors">
            {/* Avatar Photo / Fallback */}
            <div className="relative mx-auto w-28 h-28 mb-4">
              {!imageError && user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  onError={() => setImageError(true)}
                  className="w-28 h-28 rounded-full object-cover ring-4 ring-blue-100 dark:ring-blue-900/30 mx-auto shadow-sm"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#2563eb] to-blue-600 text-white flex items-center justify-center font-bold text-2xl ring-4 ring-blue-100 dark:ring-blue-900/30 mx-auto shadow-sm">
                  {initials}
                </div>
              )}
            </div>

            {/* Mentor Name */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {user.name}
            </h2>

            {/* Professional Designation and Organization */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
              {user.role} at {user.institution}
            </p>

            {/* Location Pill */}
            <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-navy-950 text-slate-600 dark:text-slate-300 text-xs font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{user.location}</span>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={handleRequestMentor}
                className="w-full py-2.5 px-4 rounded-xl border border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb] hover:text-white dark:text-blue-300 dark:border-blue-500/50 dark:hover:bg-[#2563eb] dark:hover:text-white font-bold text-xs transition-all shadow-xs active:scale-[0.99] cursor-pointer"
              >
                Request Mentor
              </button>

              <button
                type="button"
                onClick={handleViewLinkedIn}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 font-bold text-xs transition-all shadow-2xs active:scale-[0.99] cursor-pointer"
              >
                View LinkedIn
              </button>
            </div>
          </div>

          {/* B. Availability Card */}
          <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-4 transition-colors">
            {/* Availability Header */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Availability
              </h3>
            </div>

            {/* Current Mentor Status Indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{user.availabilityStatus}</span>
            </div>

            {/* Upcoming Available Slots */}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2.5">
                Next available slots:
              </p>
              <div className="space-y-2">
                {user.availableSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="bg-[#F8F8FD] dark:bg-navy-950/70 border border-slate-100 dark:border-white/5 px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {slot.date}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {slot.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mentorship Active Since Subtext */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{user.mentorshipActiveSince}</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: About, Expertise & Skills, Experience (span 8) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* C. About Section */}
          <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              About
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {user.bio}
            </p>
          </div>

          {/* D. Expertise & Skills Section */}
          <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs space-y-5 transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Expertise & Skills
            </h3>

            {/* Skill Badges / Chips */}
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-[#2563eb] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/30 transition-colors"
                >
                  {skill}
                </span>
              ))}
            </div>

            {/* Subsections: Technical Strengths & Mentorship Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              {/* Technical Strengths */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
                  TECHNICAL STRENGTHS
                </h4>
                <div className="space-y-2.5">
                  {user.technicalStrengths.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#2563eb] dark:text-blue-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mentorship Style */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
                  MENTORSHIP STYLE
                </h4>
                <div className="space-y-2.5">
                  {user.mentorshipStyle.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#2563eb] dark:text-blue-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Since Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{user.mentorshipActiveSince}</span>
            </div>
          </div>

          {/* E. Mentoring Experience Section */}
          <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">
              Mentoring Experience
            </h3>

            {/* Vertical Timeline */}
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
              {Array.isArray(user.experiences) && user.experiences.length > 0 ? (
                user.experiences.map((exp) => (
                  <div key={exp.id || exp.title} className="relative group">
                    <span
                      className={`absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full ${exp.dotColor || 'bg-[#2563eb]'} ring-4 ring-white dark:ring-[#111625]`}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {exp.title}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                        {exp.meta}
                      </p>
                      {exp.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-normal">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-xs text-slate-400">No mentoring experience listed.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
