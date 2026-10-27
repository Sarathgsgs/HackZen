import apiClient from '../../api/api';
import { getUIDataset, saveUIDataset } from '../uiDataApi';

const THEME_VALUE_MAP = {
    ai: 'AIML',
    aiml: 'AIML',
    'ai & machine learning': 'AIML',
    'machine learning': 'AIML',
    llm: 'LLM',
    genai: 'GenAI',
    'generative ai': 'GenAI',
    web: 'Web Dev',
    'web dev': 'Web Dev',
    'web development': 'Web Dev',
    mobile: 'Mobile Dev',
    'mobile dev': 'Mobile Dev',
    'mobile development': 'Mobile Dev',
    data: 'Data Science',
    'data science': 'Data Science',
    cybersecurity: 'Cyber Security',
    'cyber security': 'Cyber Security',
    cloud: 'Cloud Computing',
    'cloud computing': 'Cloud Computing',
    devsecops: 'DevSecOps',
    iot: 'IoT',
    blockchain: 'Blockchain',
    gaming: 'Gaming',
    education: 'Education',
    healthcare: 'Health Care',
    'health care': 'Health Care',
    finance: 'Finance',
    fintech: 'Finance',
};

const normalizeTheme = (track) => {
    const title = typeof track === 'string' ? track : track?.title;
    const normalizedTitle = (title || '').trim().toLowerCase();

    return THEME_VALUE_MAP[normalizedTitle] || THEME_VALUE_MAP[normalizedTitle.split(/[&,-]/)[0]?.trim()] || 'Web Dev';
};

const toIsoString = (value) => {
    if (!value) return new Date().toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

/**
 * Saves the current hackathon draft to local storage instantly and syncs to backend in background.
 */
export const saveHackathonDraft = (draft) => {
    try {
        const { posterFile, ...serializableDraft } = draft || {};
        sessionStorage.setItem('hackathonDraft', JSON.stringify(serializableDraft));

        // Background sync to remote dataset with lightweight payload (omit heavy base64 poster)
        const { posterDataUrl, ...lightweightDraft } = serializableDraft;
        saveUIDataset('organizer-hackathon-draft', lightweightDraft).catch((e) => {
            console.warn('Background draft sync notice:', e);
        });
    } catch (e) {
        console.warn('Draft save notice:', e);
    }
    return draft;
};

/**
 * Converts a dataURL to a File object for multipart form upload.
 */
export const dataURLtoFile = (dataurl, filename = 'poster.png') => {
    if (!dataurl || typeof dataurl !== 'string' || !dataurl.startsWith('data:')) return null;
    try {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    } catch (e) {
        console.warn("Failed to convert dataURL to File:", e);
        return null;
    }
};

/**
 * Publishes the hackathon to the backend.
 * Submits with status: 'Pending' for administrative approval.
 */
export const publishHackathon = async (draft) => {
    // Map the frontend UI draft data to match the backend HackathonCreate schema
    const themes = draft.tracks && draft.tracks.length > 0
        ? [...new Set(draft.tracks.map(normalizeTheme))].slice(0, 5)
        : (draft.themes && draft.themes.length > 0 ? draft.themes.map(normalizeTheme) : ['Web Dev']);

    const regStart = draft.registrationStart || draft.startDate || new Date().toISOString();
    const regEnd = draft.registrationEnd || draft.hackathonStart || draft.startDate || new Date().toISOString();
    const evStart = draft.hackathonStart || draft.startDate || new Date().toISOString();
    const evEnd = draft.hackathonEnd || draft.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const rules = Array.isArray(draft.guidelines)
        ? draft.guidelines
        : (draft.guidelines ? [draft.guidelines] : []);

    const payload = {
        title: draft.title?.trim() || "Untitled Hackathon",
        description: draft.description?.trim() || (draft.tagline?.trim() || "A new hackathon"),
        location: draft.location?.trim() || draft.mode || 'Online',
        problemStatement: draft.problemStatement?.trim() || draft.description?.trim() || "Solve the challenges.",
        themes,
        registrationStart: toIsoString(regStart),
        registrationEnd: toIsoString(regEnd),
        hackathonStart: toIsoString(evStart),
        hackathonEnd: toIsoString(evEnd),
        startDate: toIsoString(evStart),
        endDate: toIsoString(evEnd),
        minTeamSize: Number(draft.minTeamSize) || 1,
        maxTeamSize: Number(draft.maxTeamSize) || 4,
        isPublic: draft.isPublic !== undefined ? draft.isPublic : true,
        rules,
        status: "Pending" // Route to Admin Approvals review
    };

    try {
        let response;
        let posterFile = draft.posterFile;
        if (!posterFile && draft.posterDataUrl) {
            posterFile = dataURLtoFile(draft.posterDataUrl, draft.posterName || 'hackathon_poster.png');
        }

        if (posterFile) {
            const formData = new FormData();
            formData.append('data', JSON.stringify(payload));
            formData.append('poster', posterFile);

            response = await apiClient.post('/hackathon/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } else {
            response = await apiClient.post('/hackathon/', payload);
        }

        const { data } = response;
        
        // Clear local and remote drafts after successful publishing
        sessionStorage.removeItem('hackathonDraft');
        saveUIDataset('organizer-hackathon-draft', null).catch(() => {});

        return {
            id: data._id || data.id,
            status: data.status,
            publishedAt: new Date().toISOString(),
            ...data
        };
    } catch (error) {
        console.error('Error publishing hackathon:', error);
        throw error;
    }
};

/**
 * Retrieves the current hackathon draft.
 */
export const getHackathonDraft = async () => {
    // Check sessionStorage first for fast load and full fidelity (poster preview dataUrl)
    const saved = sessionStorage.getItem('hackathonDraft');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {}
    }
    try {
        const remote = await getUIDataset('organizer-hackathon-draft', null);
        if (remote) return remote;
    } catch {
        // Fallback
    }
    return null;
};
