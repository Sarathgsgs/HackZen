import apiClient from '../../api/api';

/** Return certificate records exactly as confirmed by the authenticated API. */
export const fetchCertificates = async () => {
    const { data } = await apiClient.get('/certificates/me');
    return Array.isArray(data) ? data.map((certificate) => ({
        id: certificate.id || certificate._id || null,
        userId: certificate.userId || null,
        teamId: certificate.teamId || null,
        hackathonId: certificate.hackathonId || null,
        issuedAt: certificate.issuedAt || null,
        certificateUrl: certificate.certificateUrl || null,
    })) : [];
};

/** Verify only whether a certificate record with this ID exists. */
export const verifyCertificate = async (certId) => {
    try {
        const { data } = await apiClient.get(`/certificates/${encodeURIComponent(certId)}`);
        return {
            status: 'success',
            message: 'Certificate record found.',
            details: {
                id: data.id || data._id || certId,
                hackathonId: data.hackathonId || null,
                issuedAt: data.issuedAt || null,
            },
        };
    } catch (error) {
        return {
            status: 'error',
            message: error?.response?.status === 404 ? 'No certificate record was found with this ID.' : 'Certificate verification is unavailable right now.',
            details: null,
        };
    }
};

export const downloadCertificate = async () => {
    throw new Error('Certificate file downloads are not available from the backend yet.');
};

export const downloadAllCertificates = async () => {
    throw new Error('Bulk certificate downloads are not available from the backend yet.');
};

export const shareTranscript = async () => {
    throw new Error('Transcript sharing is not available from the backend yet.');
};
