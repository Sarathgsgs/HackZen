import { saveRegistrationDraft } from './hackathonRegistrationApi';

export const getStepTwoConfig = async (draft) => {
    return {
        memberCount: Math.max(draft.teamSize - 1, 1),
        members: Array.from({ length: Math.max(draft.teamSize - 1, 1) }, (_, index) => draft.memberEmails[index] || ''),
    };
};

export const saveStepTwoData = async (hackathonId, draft, stepData) => {
    const nextDraft = {
        ...draft,
        memberEmails: stepData.memberEmails,
        notes: stepData.notes,
    };

    await saveRegistrationDraft(hackathonId, nextDraft);
    return nextDraft;
};
