import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Upload,
  Download,
  Trash2,
  FileText,
  FileCode,
  FileSpreadsheet,
  Link as LinkIcon,
  Search,
  Filter,
  Plus,
  ExternalLink,
  CheckCircle2,
  Users
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';
import {
  fetchMaterials,
  createResource,
  downloadMaterial,
  deleteMaterial
} from '../../services/mentor/materialsApi';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';

export default function MentorResources() {
  const { addToast, globalSearch } = useMentor();

  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [teams, setTeams] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Architecture & Boilerplates');
  const [newTeam, setNewTeam] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const [materialResult, teamResult] = await Promise.all([
        fetchMaterials({ limit: 100 }),
        fetchAssignedTeams(),
      ]);
      setResources((materialResult.data || []).map((item) => ({
        id: item.id,
        title: item.name,
        team: item.teamName,
        category: item.category,
        size: item.sizeFormatted,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '',
        url: item.url,
        type: item.type,
      })));
      setTeams(teamResult.activeTeams || []);
    } catch (e) {
      console.error('Could not load resources:', e);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const categories = [
    'All',
    'Architecture & Boilerplates',
    'Pitch Decks',
    'Datasets & APIs',
    'Guidelines',
  ];

  const filteredResources = useMemo(() => {
    let list = resources;
    if (activeCategory !== 'All') {
      list = list.filter((r) => r.category === activeCategory);
    }
    const q = globalSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.team.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [resources, activeCategory, globalSearch]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createResource({
        title: newTitle.trim(),
        category: newCategory,
        teamId: newTeam || undefined,
        url: newUrl.trim(),
      });
      await loadResources();
      setUploadModalOpen(false);
      setNewTitle('');
      setNewUrl('');
      setNewTeam('');
      addToast('Resource Shared', `"${newTitle.trim()}" saved for ${newTeam ? 'the selected team' : 'all assigned teams'}.`, 'success');
    } catch (error) {
      addToast('Resource not saved', error.response?.data?.detail || 'The database could not save this resource.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    try {
      await deleteMaterial(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      addToast('Resource Removed', `Deleted "${title}".`, 'info');
    } catch (error) {
      addToast('Resource not deleted', error.response?.data?.detail || 'The database could not delete this resource.', 'error');
    }
  };

  const handleDownload = async (resource) => {
    try {
      await downloadMaterial(resource.id, resource.title);
    } catch (error) {
      addToast('Resource unavailable', error.response?.data?.detail || 'Could not access this resource.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Resources & Materials
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Share code boilerplates, evaluation rubrics, datasets, and guides with cohorts.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs shadow-purple-500/20 transition-all flex items-center gap-1.5 self-start md:self-center"
        >
          <Upload className="w-4 h-4" />
          Share Resource
        </button>
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeCategory === cat
                ? 'border-[#5B45D9] text-[#5B45D9] dark:text-purple-300 dark:border-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resources Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <p className="col-span-full py-10 text-center text-sm text-slate-400">Loading resources...</p>
        ) : filteredResources.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-slate-400">No shared resources are available.</p>
        ) : (
          filteredResources.map((res) => (
          <div
            key={res.id}
            className="p-5 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#5B45D9]/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                  {res.category}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">{res.size}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors leading-snug">
                {res.title}
              </h3>

              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Users className="w-3.5 h-3.5 text-[#5B45D9]" />
                Shared with: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{res.team}</strong>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">{res.updatedAt}</span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDelete(res.id, res.title)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                  title="Delete Resource"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {res.url ? <a href={res.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-2xs">
                  <Download className="w-3 h-3" />
                  Open Resource
                </a> : <button onClick={() => handleDownload(res)} className="px-3 py-1.5 rounded-lg bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-2xs">
                  <Download className="w-3 h-3" /> Download
                </button>}
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Share Resource Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-navy-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Share a Resource with Teams
            </h2>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Resource Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. System Design Architecture Template"
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
                >
                  <option value="Architecture & Boilerplates">Architecture & Boilerplates</option>
                  <option value="Pitch Decks">Pitch Decks</option>
                  <option value="Datasets & APIs">Datasets & APIs</option>
                  <option value="Guidelines">Guidelines</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Share With
                </label>
                <select
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
                >
                  <option value="">All Mentored Teams</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Resource Link or Storage URL
                </label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or GitHub link"
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFD] dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#5B45D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#5B45D9] hover:bg-[#4E3AC2] text-white text-xs font-bold shadow-xs transition-all"
                >
                  {saving ? 'Saving...' : 'Share Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
