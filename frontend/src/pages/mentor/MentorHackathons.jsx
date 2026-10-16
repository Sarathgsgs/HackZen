import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Users,
  Award,
  ChevronRight,
  ExternalLink,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  Search
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';

const TABS = ['Upcoming Hackathons', 'Ongoing Hackathons', 'Past Hackathons', 'My Hackathons'];

export default function MentorHackathons() {
  const navigate = useNavigate();
  const { globalSearch } = useMentor();
  const [activeTab, setActiveTab] = useState('Upcoming Hackathons');
  const [localSearch, setLocalSearch] = useState('');

  const hackathons = [
    {
      id: 'hack-1',
      title: 'AI Innovation Hackathon 2025',
      organizer: 'Stanford AI Student Alliance & Google Cloud',
      category: 'Artificial Intelligence',
      status: 'Ongoing',
      phase: 'Development Sprint (Day 4/7)',
      dates: 'Oct 22 - Oct 29, 2025',
      assignedTeamsCount: 4,
      role: 'Lead AI & Architecture Mentor',
      description: 'Global hackathon focusing on multimodal LLMs, agentic workflows, and real-time inference applications.',
      prizePool: '$45,000 USD',
      isMyHackathon: true,
    },
    {
      id: 'hack-2',
      title: 'HealthTech Global Hackathon',
      organizer: 'BioHealth Ventures & Johns Hopkins',
      category: 'Healthcare Tech',
      status: 'Ongoing',
      phase: 'Prototype Verification',
      dates: 'Oct 15 - Nov 2, 2025',
      assignedTeamsCount: 2,
      role: 'Clinical AI Advisor',
      description: 'Building patient-centric diagnostic systems, medical robotics algorithms, and remote care pipelines.',
      prizePool: '$60,000 USD',
      isMyHackathon: true,
    },
    {
      id: 'hack-3',
      title: 'NextGen FinTech Challenge',
      organizer: 'Open Finance Collective',
      category: 'FinTech',
      status: 'Upcoming',
      phase: 'Orientation & Team Formation',
      dates: 'Nov 10 - Nov 17, 2025',
      assignedTeamsCount: 0,
      role: 'Invited Expert Mentor',
      description: 'Decentralized identity, zero-knowledge fraud detection, and algorithmic settlement networks.',
      prizePool: '$35,000 USD',
      isMyHackathon: false,
    },
    {
      id: 'hack-4',
      title: 'EcoTrack Climate Summit Hack',
      organizer: 'ClimateWorks & CleanTech Labs',
      category: 'Climate & IoT',
      status: 'Past',
      phase: 'Judging Completed',
      dates: 'Sep 12 - Sep 19, 2025',
      assignedTeamsCount: 3,
      role: 'Hardware & IoT Mentor',
      description: 'Distributed sensor telemetry, solar grid load balancing, and carbon footprint tracking models.',
      prizePool: '$25,000 USD',
      isMyHackathon: true,
    },
    {
      id: 'hack-5',
      title: 'CyberShield Defense Arena 2025',
      organizer: 'MIT Cyber Security Club & DEF CON',
      category: 'Cybersecurity',
      status: 'Upcoming',
      phase: 'Registration Open',
      dates: 'Dec 05 - Dec 12, 2025',
      assignedTeamsCount: 0,
      role: 'Security Architecture Mentor',
      description: 'Live red/blue team simulations, memory safety audits, and automated vulnerability triage.',
      prizePool: '$50,000 USD',
      isMyHackathon: false,
    },
    {
      id: 'hack-6',
      title: 'NeuroVibe Assistive Tech Sprint',
      organizer: 'Inclusive Tech Initiative',
      category: 'EdTech & Accessibility',
      status: 'Past',
      phase: 'Awards Concluded',
      dates: 'Aug 01 - Aug 08, 2025',
      assignedTeamsCount: 2,
      role: 'UX & Accessibility Advisor',
      description: 'Assistive hardware and software adaptations for neurodivergent and differently-abled learners.',
      prizePool: '$20,000 USD',
      isMyHackathon: true,
    },
  ];

  const filteredHackathons = useMemo(() => {
    let list = hackathons;
    if (activeTab === 'Upcoming Hackathons') {
      list = list.filter((h) => h.status === 'Upcoming');
    } else if (activeTab === 'Ongoing Hackathons') {
      list = list.filter((h) => h.status === 'Ongoing' || h.status === 'Active');
    } else if (activeTab === 'Past Hackathons') {
      list = list.filter((h) => h.status === 'Past' || h.status === 'Concluded');
    } else if (activeTab === 'My Hackathons') {
      list = list.filter((h) => h.isMyHackathon || h.assignedTeamsCount > 0);
    }

    const query = (localSearch || globalSearch).toLowerCase().trim();
    if (query) {
      list = list.filter(
        (h) =>
          h.title.toLowerCase().includes(query) ||
          h.category.toLowerCase().includes(query) ||
          h.organizer.toLowerCase().includes(query) ||
          h.description.toLowerCase().includes(query)
      );
    }
    return list;
  }, [hackathons, activeTab, localSearch, globalSearch]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-[#5B45D9] dark:text-purple-300" />
            Hackathons & Events
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse upcoming, ongoing, and past hackathon cohorts you are guiding as a mentor.
          </p>
        </div>

        {/* Local Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by event, track, or domain..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5B45D9]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const count = hackathons.filter((h) => {
            if (tab === 'Upcoming Hackathons') return h.status === 'Upcoming';
            if (tab === 'Ongoing Hackathons') return h.status === 'Ongoing' || h.status === 'Active';
            if (tab === 'Past Hackathons') return h.status === 'Past' || h.status === 'Concluded';
            if (tab === 'My Hackathons') return h.isMyHackathon || h.assignedTeamsCount > 0;
            return true;
          }).length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab
                  ? 'border-[#5B45D9] text-[#5B45D9] dark:text-purple-300 dark:border-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                  activeTab === tab
                    ? 'bg-[#5B45D9] text-white dark:bg-purple-600'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hackathons Grid */}
      {filteredHackathons.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-sm">
          No hackathons found matching your search in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHackathons.map((hack) => {
            const isOngoing = hack.status === 'Ongoing' || hack.status === 'Active';
            const isUpcoming = hack.status === 'Upcoming';
            const isPast = hack.status === 'Past' || hack.status === 'Concluded';

            return (
              <div
                key={hack.id}
                className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#5B45D9]/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                      {hack.category}
                    </span>
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        isOngoing
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                          : isUpcoming
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200'
                          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {hack.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors">
                    {hack.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Organized by <span className="font-semibold text-slate-700 dark:text-slate-300">{hack.organizer}</span>
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                    {hack.description}
                  </p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5">
                      <span className="text-slate-400 text-[11px] block">Dates</span>
                      <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#5B45D9]" />
                        {hack.dates}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5">
                      <span className="text-slate-400 text-[11px] block">Assigned Teams</span>
                      <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-[#5B45D9]" />
                        {hack.assignedTeamsCount} Teams Mentoring
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Your Role: <span className="font-semibold text-slate-800 dark:text-white">{hack.role}</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5B45D9] dark:text-purple-300">
                    {hack.prizePool}
                  </span>
                  <button
                    onClick={() => navigate('/mentor/teams')}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-[#5B45D9] hover:text-white text-slate-800 dark:text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                  >
                    View Cohorts <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
