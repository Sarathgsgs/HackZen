import apiClient from '../../api/api';

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
 * Saves the current hackathon draft to the backend or local storage.
 */
export const saveHackathonDraft = async (draft) => {
    // For now, we'll continue to use sessionStorage for drafts to avoid partial database entries,
    // but we'll simulate a backend save for consistency.
    const { posterFile, ...serializableDraft } = draft;
    sessionStorage.setItem('hackathonDraft', JSON.stringify(serializableDraft));
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
        : ['Web Dev'];

    const payload = {
        title: draft.title?.trim() || "Untitled Hackathon",
        description: draft.description?.trim() || (draft.tagline?.trim() || "A new hackathon"),
        location: draft.location?.trim() || 'Online',
        problemStatement: draft.description?.trim() || "Solve the challenges.",
        themes,
        registrationStart: toIsoString(draft.startDate),
        registrationEnd: toIsoString(draft.startDate),
        hackathonStart: toIsoString(draft.startDate),
        hackathonEnd: toIsoString(draft.endDate),
        minTeamSize: draft.minTeamSize || 1,
        maxTeamSize: draft.maxTeamSize || 4,
        isPublic: draft.isPublic !== undefined ? draft.isPublic : true,
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
        
        // Clear draft after successful publishing
        sessionStorage.removeItem('hackathonDraft');

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
export const getHackathonDraft = () => {
    const saved = sessionStorage.getItem('hackathonDraft');
    return saved ? JSON.parse(saved) : null;
};
