import React from 'react';
import { Link } from 'react-router-dom';
import { fetchOrganizerProfile } from '../../services/organizer/profileApi';
import { fetchOrganizerDashboardData } from '../../services/organizer/dashboardApi';

const OrganizerProfile = () => {
    // State management
    const [user, setUser] = React.useState({
        name: 'Organizer',
        role: 'ORGANIZER',
        subRole: 'Organizer | Operations & Strategy',
        stats: {
            hackathons: 0,
            participants: '0',
            efficiency: '0 Teams'
        },
        competencies: [
            'Event Logistics & Planning',
            'Sponsorship Acquisition',
            'Community Management',
            'Evaluation Oversight'
        ],
        recentActions: [
            { id: 1, type: 'Launch', title: 'Live Hackathon', detail: 'Event published and active', time: 'Recently' },
            { id: 2, type: 'Review', title: 'Submissions Intake', detail: 'Project submissions in review', time: 'Recently' }
        ],
        initials: 'OR'
    });

    const fetchUserData = async () => {
        try {
            const [profile, dashData] = await Promise.allSettled([
                fetchOrganizerProfile(),
                fetchOrganizerDashboardData()
            ]);

            const profileData = profile.status === 'fulfilled' ? profile.value : {};
            const statsData = dashData.status === 'fulfilled' ? dashData.value : null;

            const storedUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            const displayName = profileData.name || storedUser.name || 'Organizer';
            const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'OR';

            const hackathonsCount = statsData?.raw?.totalHackathons ?? statsData?.stats?.find(s => s.id === 'active_h' || s.id === 'active_hackathons')?.value ?? 0;
            const participantsCount = statsData?.raw?.totalParticipants ?? statsData?.stats?.find(s => s.id === 'total_p' || s.id === 'total_registrations')?.value ?? 0;
            const teamsCount = statsData?.raw?.totalTeams ?? statsData?.stats?.find(s => s.id === 'total_t' || s.id === 'submissions')?.value ?? 0;

            setUser(prev => ({
                ...prev,
                name: displayName,
                email: profileData.email || storedUser.email || '',
                institutionName: profileData.institutionName || profileData.organization || 'ProEduvate Partner',
                designation: profileData.designation || 'Lead Organizer',
                subRole: `Organizer | ${profileData.institutionName || profileData.organization || 'Operations & Strategy'}`,
                initials: initials,
                bio: profileData.bio || 'Platform event organizer and innovation coordinator.',
                stats: {
                    hackathons: hackathonsCount,
                    participants: participantsCount > 1000 ? `${(participantsCount / 1000).toFixed(1)}k+` : participantsCount,
                    efficiency: `${teamsCount} Teams`
                },
                recentActions: statsData?.activity && statsData.activity.length > 0
                    ? statsData.activity.slice(0, 3).map((act, i) => ({
                        id: i + 1,
                        type: act.type || 'Event',
                        title: act.title || act.action || 'Activity Event',
                        detail: act.subtitle || 'System event recorded',
                        time: act.time || 'Recently'
                    }))
                    : prev.recentActions
            }));
        } catch (err) {
            console.error("Organizer profile load failed:", err);
        }
    };

    React.useEffect(() => {
        fetchUserData();
        window.addEventListener('user-update', fetchUserData);
        return () => window.removeEventListener('user-update', fetchUserData);
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="glass-strong border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                {/* Banner Area */}
                <div className="h-48 bg-gradient-to-r from-navy-950 via-emerald-950/40 to-navy-950 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="absolute inset-0 bg-radial-at-t from-emerald-500/5 to-transparent"></div>
                </div>

                {/* Profile Info Overlay */}
                <div className="px-10 pb-10 flex flex-col md:flex-row items-end gap-8 -mt-16 relative z-10">
                    <div className="w-40 h-40 rounded-[2rem] bg-navy-950 p-1 shadow-2xl ring-4 ring-emerald-500/30">
                        <div className="w-full h-full rounded-[1.8rem] bg-gradient-to-br from-navy-900 to-black flex items-center justify-center text-5xl font-black text-white italic border border-white/5">
                            {user.initials}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 mb-2">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h1 className="text-4xl font-black text-white tracking-tight">{user.name}</h1>
                            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                                {user.role || 'SENIOR ORGANIZER'}
                            </span>
                        </div>
                        <p className="text-lg text-gray-400 font-medium italic">
                            {user.subRole}
                        </p>
                    </div>

                    <div className="mb-4">
                        <Link to="/organizer/profile/edit" className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xl">
                            Edit Profile
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats and Competencies Column */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Stats Horizontal Bar */}
                    <div className="glass border border-white/10 rounded-[2rem] p-8 flex justify-around items-center shadow-xl">
                        <div className="text-center">
                            <p className="text-2xl font-black text-white italic">{user.stats.hackathons}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Events</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-white italic">{user.stats.participants}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Impact</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-emerald-400 italic">{user.stats.efficiency}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Stability</p>
                        </div>
                    </div>

                    {/* Competencies Card */}
                    <div className="glass border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-xl min-h-[300px]">
                        <h3 className="text-sm font-black text-emerald-400 uppercase tracking-[0.25em] flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Organizer Competencies
                        </h3>
                        <div className="space-y-5">
                            {user.competencies.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 group">
                                    <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-300 font-medium text-sm italic">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity Column */}
                <div className="lg:col-span-8">
                    <div className="glass border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl h-full bg-emerald-950/5">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-widest">Recent Operational Actions</h2>
                        </div>

                        <div className="space-y-4">
                            {user.recentActions.map((action) => (
                                <div key={action.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">
                                            <span className="text-gray-500 font-medium mr-2">{action.type}:</span> 
                                            {action.title}
                                        </p>
                                        <p className="text-sm text-gray-500 font-medium">{action.detail}</p>
                                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-2">{action.time}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
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

export default OrganizerProfile;
