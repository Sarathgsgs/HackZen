import { saveHackathonDraft, publishHackathon } from './createHackathonApi';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStepThreeReview = async (draft) => {
    await delay(500);
    return {
        title: draft.title,
        tagline: draft.tagline,
        startDate: draft.startDate,
        endDate: draft.endDate,
        description: draft.description,
        location: draft.location,
        posterPreview: draft.posterPreview || draft.posterDataUrl || '',
        posterName: draft.posterFile?.name || draft.posterName || 'Poster Uploaded',
        tracks: draft.tracks || [],
        minTeamSize: draft.minTeamSize,
        maxTeamSize: draft.maxTeamSize,
        isPublic: draft.isPublic,
        autoApprove: draft.autoApprove,
        isComplete: !!(
            draft.title &&
            draft.description &&
            draft.location &&
            draft.startDate &&
            draft.endDate &&
            (draft.posterFile || draft.posterDataUrl || draft.posterPreview) &&
            draft.tracks?.length > 0 &&
            draft.minTeamSize <= draft.maxTeamSize
        ),
    };
};

export const submitStepThreeHackathon = async (draft) => {
    // First save final draft
    await saveHackathonDraft(draft);

    // Then publish using the integrated backend fetch
    const publishedData = await publishHackathon(draft);

    return {
        success: true,
        hackathonId: publishedData.id || publishedData._id,
        publishedAt: publishedData.publishedAt || new Date().toISOString(),
        ...publishedData
    };
};
