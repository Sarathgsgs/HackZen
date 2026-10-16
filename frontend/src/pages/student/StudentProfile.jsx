import React from 'react';
import { Link } from 'react-router-dom';
import { fetchStudentProfile } from '../../services/student/profileApi';
import { fetchMyCertificates } from '../../api/profileApi';

const StudentProfile = () => {
    const [user, setUser] = React.useState({
        name: 'Student',
        role: 'Student',
        subRole: 'student',
        stats: {
            engagements: 0,
            collaborations: 0,
            performance: '0%'
        },
        competencies: [],
        recentActions: [],
        links: {
            github: '',
            linkedin: ''
        },
        initials: 'S',
        certificatesList: []
    });

    React.useEffect(() => {
        const fetchUserData = async () => {
            try {
                const [profileData, certsData] = await Promise.all([
                    fetchStudentProfile(),
                    fetchMyCertificates()
                ]);

                if (profileData) {
                    const skills = Array.isArray(profileData.skills) ? profileData.skills : [];
                    const mappedCompetencies = skills.map((skill) => {
                        if (typeof skill === 'object') return skill;
                        return {
                            name: skill,
                            level: 'Intermediate',
                            value: 60
                        };
                    });

                    setUser((prev) => ({
                        ...prev,
                        ...profileData,
                        name: profileData.name || 'Student',
                        role: profileData.role || 'Student',
                        subRole: `student | ${profileData.collegeName || profileData.college || 'Profile not set yet'}`,
                        certificatesList: Array.isArray(certsData) ? certsData : [],
                        competencies: mappedCompetencies,
                        stats: {
                            ...prev.stats,
                            performance: profileData.stats?.performance ?? prev.stats.performance,
                            collaborations: Array.isArray(certsData) ? certsData.length : 0,
                            engagements: Number(profileData.stats?.hackathons || 0) * 5
                        },
                        links: {
                            github: profileData.links?.github || '',
                            linkedin: profileData.links?.portfolio || profileData.links?.linkedin || ''
                        },
                        initials: (profileData.name || 'Student').split(' ').map((n) => n[0]).join('').toUpperCase() || 'S'
                    }));
                }
            } catch (err) {
                console.error('Profile load failed:', err);
            }
        };

        fetchUserData();
        window.addEventListener('user-update', fetchUserData);
        return () => window.removeEventListener('user-update', fetchUserData);
    }, []);

    const linksReady = user.links.github || user.links.linkedin;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-700">
            <div className="glass-strong border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="h-48 bg-gradient-to-r from-navy-950 via-indigo-950 to-navy-950 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="absolute inset-0 bg-radial-at-t from-blue-500/5 to-transparent"></div>
                </div>

                <div className="px-10 pb-10 flex flex-col md:flex-row items-end gap-8 -mt-16 relative z-10">
                    <div className="w-40 h-40 rounded-[2rem] bg-navy-950 p-1 shadow-2xl ring-4 ring-blue-500/30">
                        <div className="w-full h-full rounded-[1.8rem] bg-gradient-to-br from-navy-900 to-black flex items-center justify-center text-5xl font-black text-white italic border border-white/5">
                            {user.initials}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 mb-2">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h1 className="text-4xl font-black text-white tracking-tight">{user.name}</h1>
                            <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">{user.role || 'Student'}</span>
                        </div>
                        <p className="text-lg text-gray-400 font-medium italic">{user.subRole}</p>

                        {linksReady ? (
                            <div className="flex items-center gap-6 mt-4">
                                {user.links.github && (
                                    <a href={`https://${user.links.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest">GitHub</span>
                                    </a>
                                )}
                                {user.links.linkedin && (
                                    <a href={`https://${user.links.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest">LinkedIn</span>
                                    </a>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <div className="mb-4">
                        <Link to="/student/profile/edit" className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xl">Edit Profile</Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-8">
                    <div className="glass border border-white/10 rounded-[2rem] p-8 flex justify-around items-center shadow-xl">
                        <div className="text-center">
                            <p className="text-2xl font-black text-white italic">{user.stats.engagements}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Engagements</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-white italic">{user.stats.collaborations}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Certificates</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-blue-400 italic">{user.stats.performance || '0%'}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Performance</p>
                        </div>
                    </div>

                    <div className="glass border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-xl min-h-[400px]">
                        <div>
                            <h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.25em] flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>Skillset Level</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 ml-4.5">Profile skills</p>
                        </div>

                        <div className="space-y-6">
                            {user.competencies.length ? user.competencies.map((item, idx) => (
                                <div key={idx} className="space-y-2 group">
                                    <div className="flex justify-between items-end px-1">
                                        <span className="text-gray-200 font-bold text-xs uppercase tracking-wider">{item.name}</span>
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{item.level}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]" style={{ width: `${item.value}%` }}></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-gray-400">No skills have been added to your profile yet.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="glass border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl h-full bg-navy-950/20">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-widest">Recent Academic Actions</h2>
                        </div>

                        <div className="space-y-4">
                            {user.recentActions.length ? user.recentActions.map((action) => (
                                <div key={action.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer group flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors"><span className="text-gray-500 font-medium mr-2">{action.type}:</span>{action.title}</p>
                                        <p className="text-sm text-gray-500 font-medium">{action.detail}</p>
                                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-2">{action.time}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-gray-400">No recent actions are available yet.</div>
                            )}

                            {user.certificatesList.slice(0, 2).map((cert, idx) => (
                                <div key={`cert-${idx}`} className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">{cert.title || 'Certificate'}</p>
                                        <p className="text-sm text-gray-500 font-medium">{cert.issuedOn || 'Issued recently'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
