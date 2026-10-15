import apiClient from '../../api/api';

const STORAGE_KEY = 'student_hackathon_registration_drafts';

const readDrafts = () => {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
        return {};
    }
};

const writeDrafts = (drafts) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
};

export const createInitialRegistrationDraft = (hackathon, user) => ({
    hackathonId: hackathon.id || hackathon._id,
    teamName: '',
    teamSize: Math.max(1, Number(hackathon.minTeamSize ?? 1)),
    leaderName: user?.name || '',
    leaderEmail: user?.email || '',
    memberEmails: [''],
    notes: '',
    acceptedTerms: false,
});

export const getRegistrationDraft = async (hackathon, user) => {
    const drafts = readDrafts();
    const hId = hackathon.id || hackathon._id;
    const existing = drafts[hId];

    if (existing) {
        return existing;
    }

    const draft = createInitialRegistrationDraft(hackathon, user);
    drafts[hId] = draft;
    writeDrafts(drafts);
    return draft;
};

export const saveRegistrationDraft = async (hackathonId, nextDraft) => {
    const drafts = readDrafts();
    drafts[hackathonId] = nextDraft;
    writeDrafts(drafts);
    return nextDraft;
};

export const submitHackathonRegistration = async (hackathonId, draft) => {
    try {
        const storedUser = JSON.parse(
            sessionStorage.getItem('user') || localStorage.getItem('user') || '{}'
        );
        const userId = storedUser?._id || storedUser?.id || storedUser?.userId;

        if (!userId) {
            throw new Error('Authenticated student user information is missing.');
        }

        const payload = {
            hackathonId,
            userId,
            teamName: draft?.teamName || '',
            notes: draft?.notes || '',
            leaderName: draft?.leaderName || storedUser?.name || '',
            leaderEmail: draft?.leaderEmail || storedUser?.email || '',
            teamSize: draft?.teamSize,
        };

        const { data } = await apiClient.post('/applications/', payload);

        const drafts = readDrafts();
        delete drafts[hackathonId];
        writeDrafts(drafts);

        return {
            success: true,
            registrationId: data.id || data._id,
            timestamp: data.appliedAt,
            status: data.status,
            draft,
        };
    } catch (error) {
        console.error('Registration submission failed:', error);
        throw error;
    }
};
