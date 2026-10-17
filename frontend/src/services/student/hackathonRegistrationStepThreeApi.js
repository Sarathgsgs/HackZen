import { submitHackathonRegistration } from './hackathonRegistrationApi';

export const getStepThreeReview = async (hackathon, draft) => {
    return {
        hackathonTitle: hackathon.title,
        organizer: hackathon.organizerName || null,
        teamName: draft.teamName,
        teamSize: draft.teamSize,
        leaderName: draft.leaderName,
        leaderEmail: draft.leaderEmail,
        memberEmails: draft.memberEmails,
        notes: draft.notes,
    };
};

export const submitStepThreeRegistration = async (hackathonId, draft) => (
    submitHackathonRegistration(hackathonId, draft)
);
