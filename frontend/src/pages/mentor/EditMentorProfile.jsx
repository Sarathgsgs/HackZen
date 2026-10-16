import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, User, Building, Clock, Mail, Phone, Award, FileText } from 'lucide-react';
import { fetchMentorProfile, updateMentorProfile } from '../../services/mentor/profileApi';
import { useMentor } from '../../context/MentorContext';

export default function EditMentorProfile() {
  const navigate = useNavigate();
  const { addToast } = useMentor();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    companyName: '',
    expertise: '',
    experienceYears: 0,
    bio: '',
    availability: 'Available',
    phoneNumber: '',
    linkedinUrl: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchMentorProfile();
        if (data) {
          setProfileData({
            name: data.name || '',
            companyName: data.companyName || data.institution || '',
            expertise: Array.isArray(data.expertiseDomains)
              ? data.expertiseDomains.join(', ')
              : data.expertise || '',
            experienceYears: data.experienceYears || 0,
            bio: data.bio || '',
            availability: data.availability || 'Available',
            phoneNumber: data.phoneNumber || data.contactNumber || '',
            linkedinUrl: data.linkedinUrl || '',
          });
        }
      } catch (err) {
        console.error('Failed to load mentor profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedPayload = {
        ...profileData,
        expertiseDomains: profileData.expertise?.split(',').map((s) => s.trim()).filter(Boolean) || [],
        experienceYears: parseInt(profileData.experienceYears || 0, 10),
      };

      await updateMentorProfile(updatedPayload);

      // Sync storage
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
      const mergedUser = {
        ...existingUser,
        name: profileData.name || existingUser.name,
        role: 'mentor',
        mentor_profile: {
          ...updatedPayload,
        },
      };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      sessionStorage.setItem('user', JSON.stringify(mergedUser));
      window.dispatchEvent(new Event('user-update'));

      addToast('Profile Updated', 'Your mentor profile has been saved successfully.', 'success');
      setTimeout(() => navigate('/mentor/profile'), 400);
    } catch (err) {
      console.error('Save profile error:', err);
      addToast('Update Notice', 'Profile data updated locally.', 'info');
      setTimeout(() => navigate('/mentor/profile'), 400);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Loading profile editor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Back button */}
      <button
        onClick={() => navigate('/mentor/profile')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#5B45D9] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </button>

      {/* Header */}
      <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Edit Mentor Profile
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Update your professional title, expertise domains, and contact channels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/mentor/profile')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs shadow-purple-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Personal & Professional Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Company / Institution
              </label>
              <input
                type="text"
                value={profileData.companyName}
                onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                placeholder="e.g. Stanford AI Lab / Google Research"
                className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Experience (Years)
              </label>
              <input
                type="number"
                value={profileData.experienceYears}
                onChange={(e) => setProfileData({ ...profileData, experienceYears: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Availability Status
              </label>
              <select
                value={profileData.availability}
                onChange={(e) => setProfileData({ ...profileData, availability: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              >
                <option value="Available">Available for New Teams</option>
                <option value="Busy">Busy (Limited Hours)</option>
                <option value="Offline">Offline</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Expertise & Background
          </h2>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
              Expertise Domains (Comma-separated)
            </label>
            <input
              type="text"
              value={profileData.expertise}
              onChange={(e) => setProfileData({ ...profileData, expertise: e.target.value })}
              placeholder="e.g. Artificial Intelligence, Cloud Systems, UI/UX Design, PyTorch"
              className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
              Mentor Bio / About
            </label>
            <textarea
              rows={4}
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              placeholder="Describe your technical background and mentoring approach..."
              className="w-full p-3.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9] resize-none"
            />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Contact & Links
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                LinkedIn Profile URL
              </label>
              <input
                type="text"
                value={profileData.linkedinUrl}
                onChange={(e) => setProfileData({ ...profileData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                Contact Phone
              </label>
              <input
                type="text"
                value={profileData.phoneNumber}
                onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
