import apiClient from '../../api/api';
import { getUIDataset, saveUIDataset } from '../uiDataApi';

const STORAGE_KEY = 'student-registration-drafts';

export const createInitialRegistrationDraft = (hackathon, user) => ({
    hackathonId: hackathon.id || hackathon._id,
    teamName: '',
    teamSize: Math.max(2, Number(hackathon.minTeamSize || hackathon.teamSizeLimit || 2)),
    leaderName: user?.name || 'Student',
    leaderEmail: user?.email || '',
    memberEmails: [''],
    notes: '',
    acceptedTerms: false,
});

export const getRegistrationDraft = async (hackathon, user) => {
    const drafts = await getUIDataset(STORAGE_KEY, {});
    const hId = hackathon.id || hackathon._id;
    const existing = drafts[hId];

    if (existing) {
        return existing;
    }

    const draft = createInitialRegistrationDraft(hackathon, user);
    drafts[hId] = draft;
    await saveUIDataset(STORAGE_KEY, drafts);
    return draft;
};

export const saveRegistrationDraft = async (hackathonId, nextDraft) => {
    const drafts = await getUIDataset(STORAGE_KEY, {});
    drafts[hackathonId] = nextDraft;
    await saveUIDataset(STORAGE_KEY, drafts);
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
            teamSize: draft?.teamSize || 2,
            memberEmails: (draft?.memberEmails || []).filter(e => e && e.trim()),
        };

        const { data } = await apiClient.post('/applications/', payload);
        // Clean up local draft on success
        const drafts = await getUIDataset(STORAGE_KEY, {});
        delete drafts[hackathonId];
        await saveUIDataset(STORAGE_KEY, drafts);

        return {
            success: true,
            registrationId: data.id || data._id,
            timestamp: data.appliedAt,
            draft,
        };
    } catch (error) {
        console.error('Registration submission failed:', error);
        throw error;
    }
};
