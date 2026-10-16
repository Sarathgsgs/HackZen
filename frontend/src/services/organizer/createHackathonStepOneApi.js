import { saveHackathonDraft } from './createHackathonApi';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStepOneConfig = async (user) => {
    await delay(250);
    return {
        organizerName: user?.name || 'Organizer',
        organizerEmail: user?.email || '',
        defaultDuration: 48, // hours
        maxDescriptionLength: 1000,
    };
};

export const saveStepOneData = async (draft, stepData) => {
    const nextDraft = {
        ...draft,
        title: stepData.title,
        tagline: stepData.tagline,
        startDate: stepData.startDate,
        endDate: stepData.endDate,
        description: stepData.description,
        location: stepData.location,
        posterFile: stepData.posterFile,
        posterPreview: stepData.posterPreview,
    };

    await saveHackathonDraft(nextDraft);
    return nextDraft;
};
