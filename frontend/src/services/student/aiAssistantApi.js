/**
 * Student AI Assistant API
 * Uses the backend AI Co-Mentor when available, and fails gracefully when the
 * service is not configured or the route is unavailable.
 */

import apiClient from '../../api/api';

const QUICK_STARTERS = [
    { id: 1, text: 'Analyze the hackathon theme and suggest key focus areas' },
    { id: 2, text: 'Critique my project idea for feasibility and impact' },
    { id: 3, text: 'Suggest a folder structure and tech stack' },
    { id: 4, text: 'What are urgent problems fitting this track?' }
];

const FRIENDLY_AI_BUSY_MESSAGE = 'AI service is temporarily busy. Please try again in a moment.';

const normalizeAiErrorText = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(normalizeAiErrorText).filter(Boolean).join(' ');
    if (typeof value === 'object') {
        return [
            value.detail,
            value.message,
            value.error,
            value.response,
            value.title,
            value.description,
            value.errorMessage
        ].map(normalizeAiErrorText).filter(Boolean).join(' ');
    }
    return String(value);
};

const isTemporaryAiUnavailable = (error) => {
    const haystack = [
        normalizeAiErrorText(error?.response?.data),
        normalizeAiErrorText(error?.response?.data?.detail),
        normalizeAiErrorText(error?.response?.data?.message),
        normalizeAiErrorText(error?.response?.data?.error),
        normalizeAiErrorText(error?.message),
        normalizeAiErrorText(error)
    ].join(' ').toLowerCase();

    return (
        haystack.includes('503') ||
        haystack.includes('unavailable') ||
        haystack.includes('high demand') ||
        haystack.includes('temporarily busy')
    );
};

const resolveAiError = (error) => {
    if (isTemporaryAiUnavailable(error)) {
        return new Error(FRIENDLY_AI_BUSY_MESSAGE);
    }

    const detail = [
        normalizeAiErrorText(error?.response?.data),
        normalizeAiErrorText(error?.response?.data?.detail),
        normalizeAiErrorText(error?.response?.data?.message),
        normalizeAiErrorText(error?.message),
        normalizeAiErrorText(error)
    ].find(Boolean) || FRIENDLY_AI_BUSY_MESSAGE;

    return new Error(detail);
};

const toUiMessage = (entry) => ({
    id: entry._id || entry.id || Date.now(),
    sender: entry.sender === 'user' ? 'user' : 'ai',
    text: entry.response || entry.text || '',
    timestamp: entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

export const fetchInitialMessages = async () => {
    try {
        const { data } = await apiClient.get('/ai/logs');
        return Array.isArray(data) ? data.map(toUiMessage) : [];
    } catch (error) {
        throw resolveAiError(error);
    }
};

export const fetchQuickStarters = async () => {
    return QUICK_STARTERS;
};

export const sendChatMessage = async (text, context, objective) => {
    try {
        const cachedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        const currentHackathon = cachedUser.currentHackathonId || cachedUser.hackathonId || cachedUser.team?.hackathonId;

        const payload = {
            query: text,
            hackathon_id: currentHackathon || null,
            context,
            objective
        };

        const url = `${apiClient.defaults.baseURL || 'http://localhost:8000/api'}/ai/chat`;
        console.log('AI request', 'POST', url, payload);

        const { data } = await apiClient.post('/ai/chat', payload);
        console.log('AI response', data);

        return {
            id: Date.now(),
            sender: 'ai',
            text: data?.response || 'AI Co-Mentor is currently unavailable.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    } catch (error) {
        console.error('AI request failed', error);
        throw resolveAiError(error);
    }
};
