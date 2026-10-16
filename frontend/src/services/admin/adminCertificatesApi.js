import apiClient from '../../api/api';

/**
 * Admin Certificates & Verification Engine API Service
 */

export const fetchCertificates = async () => {
    try {
        const { data } = await apiClient.get('/admin/certificates/all');
        return data || [];
    } catch (error) {
        console.error('Failed to fetch certificates:', error);
        throw error;
    }
};

export const fetchEligibilityQueue = async () => {
    try {
        const { data } = await apiClient.get('/admin/certificates/eligibility-queue');
        return data || { queue: [], counts: {} };
    } catch (error) {
        console.error('Failed to fetch eligibility queue:', error);
        throw error;
    }
};

export const issueCertificate = async (payload) => {
    try {
        const { data } = await apiClient.post('/admin/certificates/issue', payload);
        return data;
    } catch (error) {
        console.error('Failed to issue certificate:', error);
        throw error;
    }
};

export const resendCertificate = async (certId) => {
    try {
        const { data } = await apiClient.post('/admin/certificates/resend', { certId });
        return data;
    } catch (error) {
        console.error('Failed to resend certificate:', error);
        throw error;
    }
};

export const sendCertificateEmail = async (payload) => {
    try {
        const { data } = await apiClient.post('/admin/certificates/send-email', payload);
        return data;
    } catch (error) {
        console.error('Failed to send certificate email:', error);
        throw error;
    }
};

export const bulkSendCertificateEmails = async ({ certIds, template, certType, customMessage }) => {
    try {
        const { data } = await apiClient.post('/admin/certificates/bulk-send-email', {
            certIds,
            template,
            certType,
            customMessage,
        });
        return data;
    } catch (error) {
        console.error('Failed to bulk send certificate emails:', error);
        throw error;
    }
};

export const issueReplacementCertificate = async (payload) => {
    try {
        const { data } = await apiClient.post('/admin/certificates/issue-replacement', payload);
        return data;
    } catch (error) {
        console.error('Failed to issue replacement certificate:', error);
        throw error;
    }
};

export const revokeCertificateWithReason = async (certId, reason, notes = "") => {
    try {
        const { data } = await apiClient.put(`/admin/certificates/${certId}/revoke`, { reason, notes });
        return data;
    } catch (error) {
        console.error('Failed to revoke certificate:', error);
        throw error;
    }
};

export const verifyCertificatePublic = async (validationId) => {
    try {
        const { data } = await apiClient.get(`/admin/certificates/public-verify/${validationId}`);
        return data;
    } catch (error) {
        console.error('Failed to verify certificate:', error);
        throw error;
    }
};

export const previewBulkIssuance = async (recipients, template = "Default") => {
    try {
        const { data } = await apiClient.post('/admin/certificates/bulk-issue-preview', { recipients, template });
        return data;
    } catch (error) {
        console.error('Failed to preview bulk issuance:', error);
        throw error;
    }
};

export const bulkIssueConfirm = async (recipients, template = "Default") => {
    try {
        const { data } = await apiClient.post('/admin/certificates/bulk-issue-confirm', { recipients, template });
        return data;
    } catch (error) {
        console.error('Failed to confirm bulk issuance:', error);
        throw error;
    }
};

export const restoreCertificate = async (certificateId) => {
    try {
        const { data } = await apiClient.post(`/admin/certificates/${certificateId}/restore`);
        return data;
    } catch (error) {
        console.error('Failed to restore certificate:', error);
        throw error;
    }
};

export const fetchCertificateTemplates = async () => {
    try {
        const { data } = await apiClient.get('/admin/certificates/templates');
        return data || { templates: [], categories: [] };
    } catch (error) {
        console.error('Failed to fetch certificate templates:', error);
        throw error;
    }
};

export const uploadCertificateTemplate = async (formData) => {
    try {
        const { data } = await apiClient.post('/admin/certificates/templates/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    } catch (error) {
        console.error('Failed to upload certificate template:', error);
        throw error;
    }
};

export const deleteCertificateTemplate = async (templateId) => {
    try {
        const { data } = await apiClient.delete(`/admin/certificates/templates/${templateId}`);
        return data;
    } catch (error) {
        console.error('Failed to delete certificate template:', error);
        throw error;
    }
};

