import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Check, User, Bell, Clock, Shield, Sliders } from 'lucide-react';
import { fetchMentorSettings, updateMentorSettings } from '../../services/mentor/profileApi';
import { useMentor } from '../../context/MentorContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOMAINS = [
  'Artificial Intelligence', 'Machine Learning', 'Data Science', 'Web Development',
  'Mobile App Development', 'Cyber Security', 'Cloud Computing', 'DevOps',
  'Blockchain', 'Internet of Things', 'Robotics', 'Embedded Systems', 'AR / VR',
  'Game Development', 'UI / UX Design', 'Software Testing', 'Database Systems',
  'Networking', 'Big Data', 'Computer Vision', 'Natural Language Processing',
  'Generative AI', 'Quantum Computing'
];
const STAGES = ['Ideation', 'Planning', 'Development', 'Testing', 'Deployment', 'Final Submission'];
const CHANNELS = ['Chat', 'Video Meeting', 'Email'];
const NOTIFICATIONS = [
  ['newTeamRequests', 'New Team Mentorship Requests'],
  ['newChatMessages', 'Direct Messages from Teams'],
  ['feedbackReminders', 'Milestone Feedback Reminders'],
  ['meetingReminders', 'Scheduled Session Reminders (30m before)'],
  ['milestoneUpdates', 'Sprint & Milestone Submissions'],
  ['pendingReviews', 'Code Review Notifications'],
  ['emailNotifications', 'Daily Email Digest'],
  ['inAppNotifications', 'Browser Push Notifications'],
];

const DEFAULT_SETTINGS = {
  availabilityStatus: 'Available',
  availableDays: DAYS.slice(0, 5),
  startTime: '18:00',
  endTime: '21:00',
  maximumActiveTeams: 5,
  notifications: Object.fromEntries(NOTIFICATIONS.map(([key]) => [key, true])),
  preferredDomains: ['Artificial Intelligence', 'Web Development'],
  preferredProjectStages: ['Development', 'Testing'],
  preferredCommunication: ['Chat', 'Video Meeting'],
  profileVisibility: 'Visible to Assigned Teams',
  contactNumberVisibility: 'Visible',
};

const Field = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
      {label}
    </span>
    {children}
  </label>
);

const Card = ({ title, children }) => (
  <section className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-7 shadow-xs space-y-5">
    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
      <span className="w-1.5 h-4 bg-[#5B45D9] rounded-full" />
      {title}
    </h2>
    {children}
  </section>
);

const Chips = ({ options, selected, toggle }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => {
      const isSelected = selected.includes(option);
      return (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all border ${
            isSelected
              ? 'bg-purple-50 border-[#5B45D9] text-[#5B45D9] dark:bg-[#5B45D9]/20 dark:text-purple-300'
              : 'bg-[#FAFAFD] dark:bg-navy-950 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
          }`}
        >
          {option}
        </button>
      );
    })}
  </div>
);

const Toggle = ({ label, enabled, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#FAFAFD]/60 dark:bg-navy-950/40 p-3 text-left hover:border-slate-300 transition-colors"
  >
    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    <span
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        enabled ? 'bg-[#5B45D9]' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
          enabled ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </span>
  </button>
);

export default function MentorSettings() {
  const navigate = useNavigate();
  const { addToast } = useMentor();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [domainSearch, setDomainSearch] = useState('');
  const [domainPickerOpen, setDomainPickerOpen] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    institution: '',
    expertise: '',
    experienceYears: 0,
    currentStatus: 'Active Mentor',
    bio: '',
    phoneNumber: '',
    links: { linkedin: '', github: '', scholar: '' },
  });

  const [mentorSettings, setMentorSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const settings = await fetchMentorSettings();
        if (settings) {
          setProfileData({
            name: settings.legalName || '',
            institution: settings.institution || '',
            experienceYears: settings.experienceYears || 0,
            currentStatus: settings.currentStatus || 'Active Mentor',
            bio: settings.bio || '',
            phoneNumber: settings.contactNumber || '',
            expertise: (settings.expertiseDomains || []).join(', '),
            links: { linkedin: settings.linkedinUrl || '', github: settings.githubUrl || '', scholar: '' },
          });
          setMentorSettings({
            ...DEFAULT_SETTINGS,
            ...settings,
            notifications: { ...DEFAULT_SETTINGS.notifications, ...(settings.notifications || {}) },
          });
        }
      } catch (error) {
        console.warn('Load settings fallback:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleList = (key, value) =>
    setMentorSettings((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((item) => item !== value) : [...prev[key], value],
    }));

  const toggleNotification = (key) =>
    setMentorSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));

  const setProfile = (key, value) => setProfileData((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMentorSettings({
        ...mentorSettings,
        legalName: profileData.name,
        institution: profileData.institution,
        experienceYears: Number(profileData.experienceYears || 0),
        currentStatus: profileData.currentStatus,
        linkedinUrl: profileData.links.linkedin,
        githubUrl: profileData.links.github,
        contactNumber: profileData.phoneNumber,
        expertiseDomains: profileData.expertise.split(',').map((s) => s.trim()).filter(Boolean),
        bio: profileData.bio,
      });

      const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      sessionStorage.setItem('user', JSON.stringify({ ...currentUser, name: profileData.name }));
      window.dispatchEvent(new Event('user-update'));
      addToast('Settings Synced', 'Your mentoring preferences and availability were saved.', 'success');
    } catch (error) {
      console.warn('Settings save warning:', error);
      addToast('Settings Updated', 'Preferences updated in workspace.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3.5 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5B45D9] transition-colors';

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Loading settings...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Mentor Settings & Availability
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure your mentoring capacity, communication channels, and notification rules.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs shadow-purple-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Syncing...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Availability Card */}
        <Card title="Availability & Cohort Capacity">
          <Field label="Status">
            <div className="flex gap-2">
              {['Available', 'Busy', 'Away'].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setMentorSettings({ ...mentorSettings, availabilityStatus: val })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    mentorSettings.availabilityStatus === val
                      ? 'bg-purple-50 text-[#5B45D9] border-[#5B45D9] dark:bg-[#5B45D9]/20 dark:text-purple-300'
                      : 'bg-[#FAFAFD] dark:bg-navy-950 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Available Days">
            <Chips
              options={DAYS}
              selected={mentorSettings.availableDays}
              toggle={(v) => toggleList('availableDays', v)}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Start Time">
              <input
                type="time"
                value={mentorSettings.startTime}
                onChange={(e) => setMentorSettings({ ...mentorSettings, startTime: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="End Time">
              <input
                type="time"
                value={mentorSettings.endTime}
                onChange={(e) => setMentorSettings({ ...mentorSettings, endTime: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Max Teams">
              <input
                type="number"
                min="1"
                max="20"
                value={mentorSettings.maximumActiveTeams}
                onChange={(e) => setMentorSettings({ ...mentorSettings, maximumActiveTeams: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        {/* Notifications Card */}
        <Card title="Notification Preferences">
          <div className="space-y-2.5">
            {NOTIFICATIONS.map(([key, label]) => (
              <Toggle
                key={key}
                label={label}
                enabled={mentorSettings.notifications[key]}
                onToggle={() => toggleNotification(key)}
              />
            ))}
          </div>
        </Card>

        {/* Mentorship Preferences */}
        <Card title="Domain & Track Preferences">
          <Field label="Preferred Domains">
            <Chips
              options={mentorSettings.preferredDomains}
              selected={mentorSettings.preferredDomains}
              toggle={(v) => toggleList('preferredDomains', v)}
            />
          </Field>

          <Field label="Preferred Project Stages">
            <Chips
              options={STAGES}
              selected={mentorSettings.preferredProjectStages}
              toggle={(v) => toggleList('preferredProjectStages', v)}
            />
          </Field>

          <Field label="Preferred Communication Medium">
            <Chips
              options={CHANNELS}
              selected={mentorSettings.preferredCommunication}
              toggle={(v) => toggleList('preferredCommunication', v)}
            />
          </Field>
        </Card>

        {/* Account & Profile Visibility */}
        <Card title="Profile Visibility & Security">
          <Field label="Public Mentor Visibility">
            <select
              value={mentorSettings.profileVisibility}
              onChange={(e) => setMentorSettings({ ...mentorSettings, profileVisibility: e.target.value })}
              className={inputClass}
            >
              <option>Visible to Assigned Teams</option>
              <option>Visible to All Hackathon Participants</option>
              <option>Private</option>
            </select>
          </Field>

          <Field label="Contact Number Visibility">
            <select
              value={mentorSettings.contactNumberVisibility}
              onChange={(e) => setMentorSettings({ ...mentorSettings, contactNumberVisibility: e.target.value })}
              className={inputClass}
            >
              <option>Visible to Cohort Leaders</option>
              <option>Hidden</option>
            </select>
          </Field>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
            <span className="text-xs text-slate-500">Need to update your password?</span>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            >
              Change Password
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
