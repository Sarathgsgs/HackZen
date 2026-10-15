import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { downloadTeamFile, getTeamFiles, uploadTeamFile } from '../../api/teamFilesApi';

const MAX_SIZE = 200 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pptx', 'pdf', 'zip', 'mp4']);
const extensionOf = (name = '') => name.split('.').pop()?.toLowerCase() || '';
const readableSize = (bytes = 0) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const readableDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
};
const errorMessage = (error) => error?.response?.data?.error?.message || error?.response?.data?.detail || 'The file action could not be completed. Please try again.';

const StudentFileSharing = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTeamId = searchParams.get('teamId') || '';
  const inputRef = useRef(null);
  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(null);
  const [downloadId, setDownloadId] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyTeams().then((response) => {
      if (!active) return;
      const ownTeams = Array.isArray(response) ? response : [];
      setTeams(ownTeams);
      const selected = requestedTeamId ? ownTeams.find((item) => String(item.id || item._id) === requestedTeamId) : ownTeams[0];
      setTeam(selected || null);
      if (selected && String(selected.id || selected._id) !== requestedTeamId) {
        setSearchParams({ teamId: String(selected.id || selected._id) }, { replace: true });
      } else if (requestedTeamId && !selected) {
        setError('You do not have access to the requested team files.');
      }
    }).catch((requestError) => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestedTeamId, setSearchParams]);

  const teamId = String(team?.id || team?._id || '');
  const reloadFiles = useCallback(async (showRefresh = false) => {
    if (!teamId) return;
    setError('');
    if (showRefresh) setRefreshing(true);
    try { setFiles(await getTeamFiles(teamId)); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setRefreshing(false); }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) { setFiles([]); return; }
    reloadFiles();
  }, [teamId, reloadFiles]);

  const visibleFiles = useMemo(() => files.filter((file) => {
    const text = `${file.fileName || ''} ${file.uploadedBy || ''}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (typeFilter === 'all' || String(file.extension).toLowerCase() === typeFilter);
  }), [files, query, typeFilter]);

  const validateFile = (file) => {
    if (!file) return false;
    const ext = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) { setSelectedFile(null); setError('Choose a PPTX, PDF, ZIP, or MP4 file.'); return false; }
    if (file.size <= 0) { setSelectedFile(null); setError('The selected file is empty.'); return false; }
    if (file.size > MAX_SIZE) { setSelectedFile(null); setError('Files must be 200 MB or smaller.'); return false; }
    setError(''); setNotice(''); setSelectedFile(file); setUploadPercent(null);
    return true;
  };

  const upload = async () => {
    if (!teamId || !selectedFile || uploading) return;
    if (!validateFile(selectedFile)) return;
    setUploading(true); setNotice(''); setError(''); setUploadPercent(null);
    try {
      await uploadTeamFile(teamId, selectedFile, (event) => {
        if (event.total > 0) setUploadPercent(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      });
      await reloadFiles();
      setSelectedFile(null);
      setNotice('File uploaded and shared with your team.');
      if (inputRef.current) inputRef.current.value = '';
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally { setUploading(false); setUploadPercent(null); }
  };

  const download = async (file) => {
    setDownloadId(file.id); setError('');
    try {
      const { blob } = await downloadTeamFile(file.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.fileName || 'team-file';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) { setError(errorMessage(downloadError)); }
    finally { setDownloadId(''); }
  };

  const onDrop = (event) => {
    event.preventDefault(); setDragging(false);
    if (uploading) return;
    validateFile(event.dataTransfer.files?.[0]);
  };

  if (loading) return <main className="min-h-[420px] rounded-2xl border border-[#e3e4ef] bg-white p-10 text-center text-[#666779]">Loading your team files...</main>;
  if (!team) return <main className="min-h-screen bg-[#fcf9ff] px-5 py-10 text-[#1e2030]"><div className="mx-auto max-w-2xl rounded-2xl border border-[#e3e4ef] bg-white p-10 text-center"><h1 className="text-3xl font-bold">{requestedTeamId ? 'Team files unavailable' : 'Shared files'}</h1><p role={error ? 'alert' : undefined} className="mt-3 text-[#6e7082]">{error || 'Join or create a team to upload and view shared files.'}</p><div className="mt-6 flex justify-center gap-3"><button onClick={() => navigate('/student/teams')} className="rounded-lg border border-[#dedee9] px-4 py-3 font-semibold">My Teams</button><button onClick={() => navigate('/student/teams/join')} className="rounded-lg bg-[#5c4ade] px-4 py-3 font-semibold text-white">Join Team</button></div></div></main>;

  return <main className="min-h-screen bg-[#fcf9ff] px-4 py-8 text-[#202131] sm:px-6 lg:px-9">
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><nav className="mb-3 text-sm text-[#626476]"><button onClick={() => navigate('/student/teams')} className="hover:text-[#5745d7]">Teams</button><span className="px-2">›</span><span>{team.teamName}</span><span className="px-2">›</span><span className="font-semibold text-[#282a39]">Shared Files</span></nav><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shared Files</h1><p className="mt-1 text-sm text-[#6d6e80]">Files shared with {team.teamName}</p></div><div className="flex gap-3"><label className="sr-only" htmlFor="team-picker">Team</label><select id="team-picker" value={teamId} disabled={uploading} onChange={(event) => setSearchParams({ teamId: event.target.value })} className="max-w-44 rounded-xl border border-[#d9d7e5] bg-white px-3 py-2.5 text-sm disabled:opacity-60">{teams.map((item) => <option key={item.id || item._id} value={item.id || item._id}>{item.teamName}</option>)}</select><div className="relative"><button type="button" onClick={() => setFilterOpen((open) => !open)} className="rounded-xl border border-[#d5d1e1] bg-white px-4 py-2.5 text-sm font-semibold">Filter</button>{filterOpen && <div className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-[#dedbe8] bg-white p-2 shadow-lg"><label className="sr-only" htmlFor="file-type-filter">Filter by type</label><select id="file-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full rounded-lg px-2 py-2 text-sm"><option value="all">All types</option>{['pptx', 'pdf', 'zip', 'mp4'].map((type) => <option key={type} value={type}>{type.toUpperCase()}</option>)}</select></div>}</div><button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="rounded-xl bg-[#5c4ade] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Upload File</button></div></div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <input ref={inputRef} type="file" accept=".pptx,.pdf,.zip,.mp4" disabled={uploading} className="sr-only" onChange={(event) => validateFile(event.target.files?.[0])} />
      <section onDragEnter={(event) => { event.preventDefault(); if (!uploading) setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={onDrop} className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white px-5 py-9 text-center transition sm:min-h-[270px] ${dragging ? 'border-[#5c4ade] bg-[#f5f2ff]' : 'border-[#d7d2e3]'}`}>
        <button type="button" onClick={() => inputRef.current?.click()} className="group flex flex-col items-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0edff] text-2xl font-bold text-[#5b49db]">↑</span><span className="mt-4 text-lg font-bold">Click or drag files to upload</span><span className="mt-1 text-sm text-[#6f7080]">PPTX, PDF, ZIP, or MP4 up to 200 MB</span></button>
        {selectedFile && <div className="mt-5 flex w-full max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e0eb] bg-[#fcfbff] p-3 text-left"><div className="min-w-0"><p className="truncate text-sm font-semibold">{selectedFile.name}</p><p className="text-xs text-[#747586]">{extensionOf(selectedFile.name).toUpperCase()} · {readableSize(selectedFile.size)}</p></div><div className="flex gap-2"><button type="button" disabled={uploading} onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = ''; }} className="rounded-lg px-3 py-2 text-sm text-[#5c5d70] disabled:opacity-50">Remove</button><button type="button" disabled={uploading} onClick={upload} className="rounded-lg bg-[#5c4ade] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</button></div></div>}
        {uploading && <div className="mt-4 w-full max-w-xl" role="status" aria-live="polite"><p className="mb-1 text-xs text-[#646579]">Uploading file{uploadPercent === null ? '...' : `: ${uploadPercent}%`}</p>{uploadPercent !== null && <div className="h-2 overflow-hidden rounded-full bg-[#ebe8f5]"><div className="h-full rounded-full bg-[#5c4ade] transition-all" style={{ width: `${uploadPercent}%` }} /></div>}</div>}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#d9d5e4] bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e2ed] bg-[#f5f2ff] p-4 sm:px-6"><h2 className="font-bold">Team files <span className="ml-2 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#68687a]">{files.length}</span></h2><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files..." aria-label="Search team files" className="w-40 rounded-lg border border-[#dedbe8] bg-white px-3 py-2 text-sm sm:w-56"/><button type="button" onClick={() => reloadFiles(true)} disabled={refreshing} className="rounded-lg border border-[#dedbe8] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">{refreshing ? 'Refreshing...' : 'Refresh'}</button></div></div>
        <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_80px_100px_140px_100px] gap-4 border-b border-[#d9d5e4] px-5 py-4 text-xs font-bold uppercase tracking-wide text-[#646579] md:grid"><span>File name</span><span>Uploaded by</span><span>Type</span><span>Size</span><span>Date</span><span className="text-right">Actions</span></div>
        {visibleFiles.length ? <div className="divide-y divide-[#e4e1eb]">{visibleFiles.map((file) => <article key={file.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_80px_100px_140px_100px] md:items-center md:gap-4 md:px-5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1efff] text-xs font-bold text-[#5b49db]">{String(file.extension || '').toUpperCase().slice(0, 4)}</span><div className="min-w-0"><p title={file.fileName} className="truncate text-sm font-semibold">{file.fileName}</p><p className="text-xs text-[#77788a] md:hidden">{file.uploadedBy || 'Team member'} · {readableSize(file.size)}</p></div></div><p className="hidden truncate text-sm text-[#626477] md:block">{file.uploadedBy || 'Team member'}</p><p className="hidden text-sm uppercase text-[#626477] md:block">{file.extension}</p><p className="hidden text-sm text-[#626477] md:block">{readableSize(file.size)}</p><time className="text-xs text-[#77788a] md:text-sm">{readableDate(file.uploadedAt)}</time><button type="button" onClick={() => download(file)} disabled={downloadId === file.id} className="justify-self-start rounded-lg border border-[#e1deea] px-3 py-2 text-sm font-semibold text-[#5143c4] disabled:opacity-50 md:justify-self-end">{downloadId === file.id ? 'Downloading...' : 'Download'}</button></article>)}</div> : <div className="p-10 text-center"><h3 className="font-semibold">{files.length ? 'No files match this filter' : 'No shared files yet'}</h3><p className="mt-2 text-sm text-[#747586]">{files.length ? 'Change the search or file type filter.' : 'Upload a file to share it with the members of this team.'}</p></div>}
      </section>
      <p className="mt-3 text-xs text-[#77788a]">Only members of this team can view or download its shared files.</p>
    </div>
  </main>;
};

export default StudentFileSharing;
