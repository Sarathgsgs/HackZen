import { saveRegistrationDraft } from './hackathonRegistrationApi';

export const getStepOneConfig = async (hackathon, user) => {
    return {
        leaderName: user?.name || '',
        leaderEmail: user?.email || '',
        minTeamSize: Number(hackathon.minTeamSize ?? 1),
        maxTeamSize: Number(hackathon.maxTeamSize ?? hackathon.teamSizeLimit ?? 4),
    };
};

export const saveStepOneData = async (hackathonId, draft, stepData) => {
    const teamSize = Number(stepData.teamSize);
    const memberCount = Math.max(teamSize - 1, 1);
    const nextDraft = {
        ...draft,
        teamName: stepData.teamName,
        teamSize,
        leaderName: stepData.leaderName,
        leaderEmail: stepData.leaderEmail,
        memberEmails: Array.from({ length: memberCount }, (_, index) => draft.memberEmails[index] || ''),
    };

    await saveRegistrationDraft(hackathonId, nextDraft);
    return nextDraft;
};
