import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';

const EditAdminProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        institution: '',
        bio: '',
        contactEmail: '',
        role: 'admin'
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data } = await apiClient.get('/profile/me');
                setProfileData({
                    ...data,
                    name: data.name || '',
                    institution: data.institution || 'System Operations',
                    bio: data.bio || '',
                    contactEmail: data.email || ''
                });
            } catch (err) {
                console.error("Failed to load admin profile:", err);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.put('/profile/me', profileData);

            // Sync all storage layers with fresh data
            const userUpdate = {
                name: profileData.name,
                role: 'admin'
            };
            
            // Merge with existing to preserve email
            const existingUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            const mergedUser = { ...existingUser, ...userUpdate };
            
            localStorage.setItem('user', JSON.stringify(mergedUser));
            sessionStorage.setItem('user', JSON.stringify(mergedUser));

            window.dispatchEvent(new Event('user-update'));
            navigate('/admin/profile');

        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to synchronize administrative profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Edit Admin Authority Profile
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Define your administrative presence and operational credentials.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex-1 sm:flex-initial justify-center px-5 py-2.5 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 rounded-xl font-bold text-xs transition-all border border-slate-200 dark:border-white/10 shadow-sm active:scale-95 cursor-pointer text-center"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex-1 sm:flex-initial justify-center px-6 py-2.5 bg-[#7C65F6] hover:bg-[#6851ec] !text-white shadow-sm shadow-[#7C65F6]/20 rounded-xl text-xs font-bold shadow-md shadow-[#7C65F6]/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? (
                            <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                                <span>Syncing...</span>
                            </>
                        ) : (
                            <span>Save Changes</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Form Section: Identity */}
            <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4.5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <span className="w-1.5 h-4 bg-indigo-300 dark:bg-indigo-500/40 rounded-full"></span>
                        Admin Identity
                    </h2>
                </div>

                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Full Name</label>
                        <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Assigned Department</label>
                        <input
                            type="text"
                            value={profileData.institution}
                            onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Form Section: Operational Summary */}
            <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-4 sm:p-5 shadow-sm space-y-2.5">
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
                    Operational Summary & Bio
                </h2>
                <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows="4"
                    placeholder="Describe administrative responsibilities and domain authority..."
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white p-3.5 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all resize-none shadow-sm leading-relaxed"
                />
            </div>
        </div>
    );
};

export default EditAdminProfile;
