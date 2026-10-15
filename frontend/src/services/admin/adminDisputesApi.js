import apiClient from '../../api/api';
import { getUIDataset, saveUIDataset } from '../uiDataApi';

/**
 * Admin Disputes & Moderation Governance API Service
 */

export const fetchDisputes = async () => {
    try {
        const { data } = await apiClient.get('/admin/disputes/all');
        return data.disputes || data;
    } catch (error) {
        console.error("Error fetching admin disputes:", error);
        throw error;
    }
};

export const assignInvestigator = async (disputeId, investigatorName, investigatorEmail) => {
    try {
        const { data } = await apiClient.post(`/admin/disputes/${disputeId}/assign`, {
            investigatorName,
            investigatorEmail
        });
        return data;
    } catch (error) {
        console.error("Error assigning investigator:", error);
        throw error;
    }
};

export const requestInfoFromParty = async (disputeId, target, requestedItems, message, deadlineHours = 48) => {
    try {
        const { data } = await apiClient.post(`/admin/disputes/${disputeId}/request-info`, {
            target,
            requestedItems,
            message,
            deadlineHours
        });
        return data;
    } catch (error) {
        console.error("Error requesting info:", error);
        throw error;
    }
};

export const resolveDispute = async (disputeId, decision, reason, actions = [], notifyReporter = true, notifyTeam = true) => {
    try {
        const { data } = await apiClient.put(`/admin/disputes/${disputeId}/resolve`, {
            decision,
            reason,
            actions,
            notifyReporter,
            notifyTeam
        });
        return data;
    } catch (error) {
        console.error("Error resolving dispute:", error);
        throw error;
    }
};

export const addDisputeNote = async (disputeId, text, isInternal = true) => {
    try {
        const { data } = await apiClient.post(`/admin/disputes/${disputeId}/notes`, { text, isInternal });
        return data;
    } catch (error) {
        console.error("Error adding dispute note:", error);
        throw error;
    }
};

export const fetchDisputeAiAssessment = async (disputeId) => {
    try {
        const { data } = await apiClient.post(`/admin/disputes/${disputeId}/ai-assessment`);
        return data?.assessment || null;
    } catch (error) {
        console.error("Error fetching AI dispute assessment:", error);
        return null;
    }
};

// --- Dataset / Fallback Helpers ---
const DATASET = 'admin-disputes';

const INITIAL_DISPUTES = [
    {
        id: 1,
        type: 'Plagiarism Allegation',
        team: 'CyberKnights',
        time: '2 hours ago',
        status: 'investigating',
        priority: 'High',
        hackathonId: 'h1',
        reporter: { name: 'John Doe', initials: 'JD', role: 'Mentor', org: 'Tech University' },
        reportedTeam: { name: 'CyberKnights', initials: 'CK', type: 'Student Team', members: 4 },
        description:
            'The team "CyberKnights" has been reported for using pre-written code in their project "AI Health Assistant". The reporter claims the core algorithm was taken from a GitHub repository without proper attribution, violating Rule 4.2 of the competition.',
        evidence: [
            { type: 'link', label: 'GitHub Repository', url: 'https://github.com/example/ai-health' },
            { type: 'text', label: 'Match Confidence', value: '87% code similarity detected' },
        ],
        workflow: [
            { label: 'Report Received', detail: 'Oct 24, 2024 • 10:30 AM', active: true },
            { label: 'Under Investigation', detail: 'Assigned to Lead Judge', sub: 'Oct 24, 2024 • 11:15 AM', active: true },
            { label: 'Final Decision', detail: 'Pending final review', sub: 'Estimated: 4 hours', active: false },
        ],
    },
    {
        id: 2,
        type: 'Harassment & Conduct',
        team: 'QuantumCoders',
        time: '5 hours ago',
        status: 'open',
        priority: 'Critical',
        hackathonId: 'h2',
        reporter: { name: 'Sarah Connor', initials: 'SC', role: 'Participant', org: 'MIT' },
        reportedTeam: { name: 'QuantumCoders', initials: 'QC', type: 'Student Team', members: 3 },
        description:
            'A member of QuantumCoders repeatedly used inappropriate language in the public Discord channel during mentoring hours. Multiple participants witnessed the incident.',
        evidence: [
            { type: 'screenshot', label: 'Discord Screenshot', url: '#' },
            { type: 'text', label: 'Channel', value: '#general-chat' },
        ],
        workflow: [
            { label: 'Report Received', detail: 'Oct 24, 2024 • 07:45 AM', active: true },
            { label: 'Under Investigation', detail: 'Pending team interview', active: false },
            { label: 'Final Decision', detail: 'Pending', active: false },
        ],
    },
    {
        id: 3,
        type: 'Eligibility Breach',
        team: 'Tech Wizards',
        time: '1 day ago',
        status: 'resolved',
        priority: 'Medium',
        hackathonId: 'h3',
        reporter: { name: 'Raj Kumar', initials: 'RK', role: 'Organizer', org: 'Stanford' },
        reportedTeam: { name: 'Tech Wizards', initials: 'TW', type: 'Student Team', members: 5 },
        description:
            'Tech Wizards submitted a project that did not meet the minimum code originality threshold as defined in Section 3.1 of the rulebook.',
        evidence: [],
        workflow: [
            { label: 'Report Received', detail: 'Oct 20, 2024 • 09:00 AM', active: true },
            { label: 'Under Investigation', detail: 'Review completed.', sub: 'Oct 21, 2024 • 11:00 AM', active: true },
            { label: 'Final Decision', detail: 'Warning issued. Team retained.', sub: 'Oct 22, 2024 • 03:00 PM', active: true },
        ],
    },
];

export const getDisputes = async (statusFilter) => {
    const data = await getUIDataset(DATASET, INITIAL_DISPUTES);
    if (statusFilter) {
        if (statusFilter.toLowerCase() === 'open') {
            return data.filter(d => d.status !== 'resolved');
        } else if (statusFilter.toLowerCase() === 'resolved') {
            return data.filter(d => d.status === 'resolved');
        }
    }
    return data;
};

export const getDisputeById = async (id) => {
    const data = await getUIDataset(DATASET, INITIAL_DISPUTES);
    return data.find(d => d.id === id);
};

export const suspendUser = async (id) => {
    const data = await getUIDataset(DATASET, INITIAL_DISPUTES);
    const index = data.findIndex(d => d.id === id);
    if (index === -1) throw new Error("Dispute not found");

    data[index] = {
        ...data[index],
        workflow: [
            ...data[index].workflow,
            { label: 'User Suspended', detail: 'System Action', active: true }
        ]
    };
    await saveUIDataset(DATASET, data);
    return { success: true };
};

export const requestMoreInfo = async (id, message) => {
    const data = await getUIDataset(DATASET, INITIAL_DISPUTES);
    const index = data.findIndex(d => d.id === id);
    if (index === -1) throw new Error("Dispute not found");

    data[index] = {
        ...data[index],
        workflow: [
            ...data[index].workflow,
            { label: 'Additional Info Requested', detail: message, active: true }
        ]
    };
    await saveUIDataset(DATASET, data);
    return { success: true };
};

export const submitResolution = async (id, resolution) => {
    const data = await getUIDataset(DATASET, INITIAL_DISPUTES);
    const index = data.findIndex(d => d.id === id);
    if (index === -1) throw new Error("Dispute not found");

    const activeWorkflow = data[index].workflow;
    if (activeWorkflow.length >= 3) {
        activeWorkflow[2] = { ...activeWorkflow[2], active: true, detail: resolution };
    } else {
        activeWorkflow.push({ label: 'Final Decision', detail: resolution, active: true });
    }

    data[index] = {
        ...data[index],
        status: 'resolved',
        workflow: activeWorkflow
    };

    await saveUIDataset(DATASET, data);
    return data[index];
};
