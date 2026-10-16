import apiClient from '../../api/api';

const FALLBACK_BANNER = 'https://images.unsplash.com/photo-1504384308090-c54be3852f33?auto=format&fit=crop&q=80&w=1000';

const formatDate = (dateValue) => {
    if (!dateValue) return 'TBD';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'TBD';
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const getTimeRemaining = (endValue) => {
    const end = new Date(endValue);
    const now = new Date();

    if (Number.isNaN(end.getTime()) || end <= now) {
        return { days: 0, hours: 0, minutes: 0 };
    }

    const diff = end.getTime() - now.getTime();
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
    };
};

const getProgress = (startValue, endValue) => {
    const start = new Date(startValue);
    const end = new Date(endValue);
    const now = new Date();

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        return 0;
    }

    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
};

const isRegistrationOpen = (hackathon) => {
    if (hackathon.status === 'Registration Open') return true;

    const now = new Date();
    const starts = new Date(hackathon.registrationStart);
    const ends = new Date(hackathon.registrationEnd);

    return !Number.isNaN(starts.getTime())
        && !Number.isNaN(ends.getTime())
        && starts <= now
        && now <= ends;
};

const mapHackathon = (hackathon) => ({
    id: hackathon._id || hackathon.id,
    title: hackathon.title,
    description: hackathon.description,
    banner: hackathon.posterUrl || FALLBACK_BANNER,
    status: hackathon.status || 'Draft',
    category: hackathon.themes?.[0] || 'General',
    mode: hackathon.location === 'Online' ? 'Online' : 'Hybrid',
    location: hackathon.location || 'Online',
    visibility: Boolean(hackathon.isPublic),
    registrationOpen: isRegistrationOpen(hackathon),
    registrationStart: formatDate(hackathon.registrationStart),
    registrationEnd: formatDate(hackathon.registrationEnd),
    startDate: formatDate(hackathon.hackathonStart),
    endDate: formatDate(hackathon.hackathonEnd),
    maxTeamSize: hackathon.maxTeamSize || 4,
    minTeamSize: hackathon.minTeamSize || 1,
    progress: getProgress(hackathon.hackathonStart, hackathon.hackathonEnd),
    timeRemaining: getTimeRemaining(hackathon.hackathonEnd),
    daysLeft: Math.max(0, Math.ceil((new Date(hackathon.hackathonEnd) - new Date()) / (1000 * 60 * 60 * 24))),
});

const mapApplication = (app) => ({
    id: app._id || app.id,
    userId: app.userId,
    teamId: app.teamId,
    status: app.status || 'pending',
    appliedAt: formatDate(app.appliedAt),
});

const mapTeam = (team) => ({
    id: team._id || team.id,
    name: team.name || team.teamName || 'Untitled Team',
    leader: team.leader || team.createdBy || 'Unknown',
    members: team.members || 0,
    mentorId: team.mentorId || null,
    registrationDate: team.registrationDate || formatDate(team.createdAt),
    submissionStatus: team.submissionStatus || 'Pending',
    submissions: team.submissions || 0,
    status: team.status || 'Pending',
});

export const fetchManageHackathonData = async (hackathonId) => {
    const [hackathonResult, applicationsResult, teamsResult] = await Promise.allSettled([
        apiClient.get(`/hackathon/${hackathonId}`),
        apiClient.get(`/applications/hackathon/${hackathonId}`),
        apiClient.get(`/teams/hackathon/${hackathonId}`),
    ]);

    if (hackathonResult.status === 'rejected') {
        throw hackathonResult.reason;
    }

    const hackathon = mapHackathon(hackathonResult.value.data);
    const applications = applicationsResult.status === 'fulfilled' ? applicationsResult.value.data.map(mapApplication) : [];
    const teams = teamsResult.status === 'fulfilled' ? teamsResult.value.data.map(mapTeam) : [];

    return { hackathon, applications, teams };
};

export const fetchHackathonTeamsCount = async (hackathonId) => {
    try {
        const { data } = await apiClient.get(`/teams/hackathon/${hackathonId}`);
        return Array.isArray(data) ? data.length : 0;
    } catch (error) {
        console.error('Failed to fetch hackathon teams count:', error);
        return 0;
    }
};

export const updateManageHackathonVisibility = async (hackathonId, isPublic) => {
    const { data } = await apiClient.put(`/hackathon/${hackathonId}`, { isPublic });
    return mapHackathon(data);
};

export const updateManageHackathonRegistration = async (hackathonId, shouldOpen) => {
    const { data } = await apiClient.put(`/hackathon/${hackathonId}`, {
        status: shouldOpen ? 'Registration Open' : 'Draft',
    });
    return mapHackathon(data);
};

export const contactHackathonAdmin = async (hackathonId, payload) => {
    const { data } = await apiClient.post(`/hackathon/${hackathonId}/contact-admin`, {
        subject: payload.subject,
        message: payload.message,
    });
    return data;
};

export const broadcastHackathonUpdate = async (hackathonId, applications, payload) => {
    const recipients = applications
        .map(application => application.userId)
        .filter(Boolean);

    if (recipients.length === 0) {
        return { success: false, message: 'No registered participants are available for broadcast.' };
    }

    const message = `${payload.subject}: ${payload.message}`;
    await Promise.all(recipients.map(userId => apiClient.post('/inbox/send', {
        user_id: userId,
        type: 'hackathon_update',
        message,
        hackathon_id: hackathonId,
    })));

    return { success: true, message: `Broadcast sent to ${recipients.length} participant(s).` };
};
