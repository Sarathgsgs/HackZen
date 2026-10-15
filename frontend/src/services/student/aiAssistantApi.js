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
const FRIENDLY_AI_CONFIG_MESSAGE = 'The AI service is not configured correctly. Please contact support.';
const FRIENDLY_AI_QUOTA_MESSAGE = 'The AI service has reached its request limit. Please try again later.';
const FRIENDLY_AUTH_MESSAGE = 'Your session has expired. Please sign in again.';
const FRIENDLY_AI_RETRY_MESSAGE = 'The AI request could not be completed. Please try again.';

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

const resolveAiError = (error) => {
    const status = error?.response?.status;
    const details = normalizeAiErrorText(error?.response?.data).toLowerCase();
    if (status === 401) return new Error(FRIENDLY_AUTH_MESSAGE);
    if (status === 403) return new Error('Your account is not permitted to use the AI Assistant.');
    if (details.includes('do not have permission to use this model')) {
        return new Error('The configured AI credentials do not have permission to use this model. Please contact support.');
    }
    if (details.includes('configured ai model is unavailable')) {
        return new Error('The configured AI model is unavailable. Please contact support.');
    }
    if (details.includes('credential') || details.includes('api key') || details.includes('model configuration') || details.includes('not configured') || details.includes('configured request')) {
        return new Error(FRIENDLY_AI_CONFIG_MESSAGE);
    }
    if (status === 429 || details.includes('quota') || details.includes('rate limit') || details.includes('resource_exhausted')) {
        return new Error(FRIENDLY_AI_QUOTA_MESSAGE);
    }
    if (status === 504 || status === 408 || details.includes('timed out') || details.includes('timeout')) {
        return new Error('The AI service took too long to respond. Please retry your question.');
    }
    if (status === 503 || details.includes('503') || details.includes('unavailable') || details.includes('high demand') || details.includes('temporarily busy')) {
        return new Error(FRIENDLY_AI_BUSY_MESSAGE);
    }
    if (typeof status === 'number' && status >= 500) return new Error(FRIENDLY_AI_RETRY_MESSAGE);
    return new Error(FRIENDLY_AI_RETRY_MESSAGE);
};

const toUiMessages = (entry) => {
    const id = entry._id || entry.id || `history-${entry.timestamp}`;
    const timestamp = entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
    return [
        ...(typeof entry.query === 'string' && entry.query.trim() ? [{
            id: `${id}-user`,
            sender: 'user',
            text: entry.query,
            timestamp,
        }] : []),
        ...(typeof entry.response === 'string' && entry.response.trim() ? [{
            id: `${id}-ai`,
            sender: 'ai',
            text: entry.response,
            timestamp,
        }] : []),
    ];
};

export const fetchInitialMessages = async () => {
    try {
        const { data } = await apiClient.get('/ai/logs');
        if (!Array.isArray(data)) return [];
        return data
            .slice()
            .sort((first, second) => new Date(first.timestamp) - new Date(second.timestamp))
            .flatMap(toUiMessages);
    } catch (error) {
        throw resolveAiError(error);
    }
};

export const fetchQuickStarters = async () => {
    return QUICK_STARTERS;
};

export const sendChatMessage = async (text, hackathonId) => {
    try {
        const payload = {
            query: text,
            hackathon_id: hackathonId || null,
        };

        const { data } = await apiClient.post('/ai/chat', payload);
        const responseText = typeof data?.response === 'string' ? data.response.trim() : '';
        if (!responseText) {
            throw new Error('The AI service returned no answer. Please try again.');
        }

        return {
            id: Date.now(),
            sender: 'ai',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    } catch (error) {
        console.error('AI request failed');
        throw resolveAiError(error);
    }
};
