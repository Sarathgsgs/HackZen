import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Users,
  Award,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import { fetchMentorshipRequests, updateMentorshipRequestStatus } from '../../services/mentor/mentorshipRequestsApi';

export default function MentorshipRequests() {
  const navigate = useNavigate();
  const { openRequestModal, addToast, refreshKey, triggerRefresh, globalSearch } = useMentor();

  const [activeTab, setActiveTab] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('All');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Load requests
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const apiStatus = activeTab === 'All' ? undefined : activeTab.toLowerCase() === 'accepted' ? 'approved' : activeTab.toLowerCase();
      const res = await fetchMentorshipRequests(apiStatus);
      setRequests(Array.isArray(res) ? res : []);
      setLoadError('');
    } catch (e) {
      console.warn('Failed to load mentorship requests:', e);
      setRequests([]);
      setLoadError('Unable to load mentorship requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, refreshKey]);

  const handleDecline = async (id, teamName) => {
    try {
      await updateMentorshipRequestStatus(id, 'reject');
    } catch (e) {
      addToast('Request Failed', 'Unable to decline this request. Please try again.', 'error');
      return;
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    );
    addToast('Request Declined', `You declined the mentorship request from ${teamName}.`, 'info');
    triggerRefresh();
  };

  const handleAccept = (request) => {
    openRequestModal(request);
  };

  // Filter tabs: All, Pending, Accepted, Declined
  const tabs = ['All', 'Pending', 'Accepted', 'Declined'];

  const filteredRequests = useMemo(() => {
    let list = [...requests];

    // Filter by tab
    if (activeTab === 'Pending') {
      list = list.filter((r) => r.status === 'pending');
    } else if (activeTab === 'Accepted') {
      list = list.filter((r) => r.status === 'approved' || r.status === 'accepted');
    } else if (activeTab === 'Declined') {
      list = list.filter((r) => r.status === 'rejected' || r.status === 'declined');
    }

    // Filter by search
    const query = (searchQuery || globalSearch).toLowerCase().trim();
    if (query) {
      list = list.filter(
        (r) =>
          r.teamName?.toLowerCase().includes(query) ||
          r.domain?.toLowerCase().includes(query) ||
          r.track?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
      );
    }

    // Filter by track
    if (selectedTrack !== 'All') {
      list = list.filter((r) => (r.track || r.domain) === selectedTrack);
    }

    return list;
  }, [requests, activeTab, searchQuery, globalSearch, selectedTrack]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Mentorship Requests
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review, evaluate, and accept teams requesting your guidance for active hackathons.
          </p>
        </div>

        {/* Search & Track Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by team or topic..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5B45D9]"
            />
          </div>

          <select
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="px-3.5 py-2 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#5B45D9]"
          >
            <option value="All">All Tracks</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
            <option value="Climate & IoT">Climate & IoT</option>
            <option value="Healthcare Tech">Healthcare Tech</option>
            <option value="DeepTech">DeepTech</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === tab
                ? 'border-[#5B45D9] text-[#5B45D9] dark:text-purple-300 dark:border-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading requests...</div>
      ) : loadError ? (
        <div role="alert" className="p-12 text-center bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 text-rose-500 text-sm">
          {loadError}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 text-slate-400 text-sm">
          No {activeTab.toLowerCase()} mentorship requests found.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved' || req.status === 'accepted';
            const isRejected = req.status === 'rejected' || req.status === 'declined';

            return (
              <div
                key={req.id}
                className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#5B45D9]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Team Info & Topic */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-[#5B45D9] dark:text-purple-300 font-extrabold text-lg flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/40">
                    {req.teamName?.charAt(0) || 'T'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {req.teamName}
                      </h3>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50">
                        {req.domain || req.track}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded-full capitalize ${
                          isPending
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                            : isApproved
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-normal italic">
                      "{req.description || req.message}"
                    </p>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#5B45D9]" />
                        {req.teamSize || 4} Team Members
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Requested: {req.requestedDate || 'Today'}
                      </span>
                      {req.requiredSkills?.length > 0 && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          {req.requiredSkills.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => navigate(`/mentor/teams/${req.id}`)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    View
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => handleDecline(req.id, req.teamName)}
                        className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(req)}
                        className="px-4 py-2 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs shadow-purple-500/20 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Accept
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
