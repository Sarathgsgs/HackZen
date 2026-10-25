import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentProfile, updateStudentProfile } from '../../services/student/profileApi';

const EditStudentProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        collegeName: '',
        department: '',
        yearOfStudy: 1,
        skills: [],
        bio: '',
        links: { github: '', portfolio: '' }
    });

    const [skillsInput, setSkillsInput] = useState('');
    const [bioCount, setBioCount] = useState(0);
    const BIO_LIMIT = 500;

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await fetchStudentProfile();
                setProfileData({
                    ...data,
                    collegeName: data.collegeName || data.college || '',
                    yearOfStudy: data.yearOfStudy || 1
                });
                setSkillsInput(Array.isArray(data.skills) ? data.skills.join(', ') : '');
                setBioCount(data.bio?.length || 0);
            } catch (err) {
                console.error("Failed to load profile:", err);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleBioChange = (e) => {
        if (e.target.value.length <= BIO_LIMIT) {
            setProfileData({ ...profileData, bio: e.target.value });
            setBioCount(e.target.value.length);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Synchronize with StudentInDB schema
            const updatedProfile = {
                ...profileData,
                collegeName: profileData.collegeName,
                department: profileData.department,
                yearOfStudy: parseInt(profileData.yearOfStudy),
                skills: skillsInput.split(',').map(s => s.trim()).filter(s => s)
            };

            // 1. Prepare the updated user object immediately
            const userUpdate = {
                name: updatedProfile.name,
                role: 'student',
                student_profile: updatedProfile
            };
            
            // 2. Merge and Save to local storage IMMEDIATELY for instant UI feedback
            const existingUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            const mergedUser = { ...existingUser, ...userUpdate };
            
            localStorage.setItem('user', JSON.stringify(mergedUser));
            sessionStorage.setItem('user', JSON.stringify(mergedUser));
            
            // 3. Broadcast update and navigate
            window.dispatchEvent(new Event('user-update'));
            
            // 4. Try to sync with backend in background, but navigate now for speed
            updateStudentProfile(updatedProfile).catch(err => {
                console.error("Background sync failed, but local data is preserved:", err);
            });
            
            navigate('/student/profile');
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to synchronize student intelligence.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Edit Profile
                    </h1>
                    <p className="text-gray-400 font-medium italic">Shape your professional identity and project dossier.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 bg-navy-950/50 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl font-bold text-sm transition-all border border-white/5 hover:border-white/20"
                    >
                        Abort
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? 'Syncing...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Form Sections */}
            <div className="glass-strong border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                        <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                        Core Identity
                    </h2>
                </div>
                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Legal Name</label>
                        <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">College Name</label>
                        <input
                            type="text"
                            value={profileData.collegeName}
                            onChange={(e) => setProfileData({ ...profileData, collegeName: e.target.value })}
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Department</label>
                        <input
                            type="text"
                            value={profileData.department}
                            onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Academic Year (1-5)</label>
                        <input
                            type="number"
                            min="1"
                            max="5"
                            value={profileData.yearOfStudy}
                            onChange={(e) => setProfileData({ ...profileData, yearOfStudy: parseInt(e.target.value) })}
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">GitHub Profile URL</label>
                        <input
                            type="text"
                            value={profileData.links?.github || ''}
                            onChange={(e) => setProfileData({ ...profileData, links: { ...profileData.links, github: e.target.value } })}
                            placeholder="github.com/username"
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">LinkedIn Profile URL</label>
                        <input
                            type="text"
                            value={profileData.links?.portfolio || ''}
                            onChange={(e) => setProfileData({ ...profileData, links: { ...profileData.links, portfolio: e.target.value } })}
                            placeholder="linkedin.com/in/username"
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                </div>
            </div>

            <div className="glass-strong border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                <h2 className="text-lg font-bold text-white tracking-tight mb-6">Executive Summary & Weaponry Stack</h2>
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Skills (Comma Separated)</label>
                        <input
                            type="text"
                            value={skillsInput}
                            onChange={(e) => setSkillsInput(e.target.value)}
                            placeholder="React, Python, Node.js, AI/ML"
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Professional Bio ({bioCount}/{BIO_LIMIT})</label>
                        <textarea
                            value={profileData.bio}
                            onChange={handleBioChange}
                            rows="5"
                            className="w-full bg-black/20 border border-white/5 text-white p-6 rounded-[2rem] focus:ring-2 focus:ring-blue-500/30 outline-none transition-all resize-none font-medium italic"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditStudentProfile;
