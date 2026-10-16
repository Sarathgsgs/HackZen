import apiClient from '../../api/api';

/**
 * Team Materials API Service
 * Connects the frontend to real backend Team Materials endpoints.
 */

/**
 * Fetch paginated, searchable, and filterable team materials.
 * @param {Object} params - { search, teamId, category, fileType, page, limit }
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const fetchMaterials = async (params = {}) => {
    try {
        const response = await apiClient.get('/mentor/materials', { params });
        return {
            data: response.data.data || [],
            pagination: response.data.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            },
        };
    } catch (error) {
        console.error('Failed to fetch materials:', error);
        throw error;
    }
};

/**
 * Fetch the 5 most recently uploaded materials.
 * @returns {Promise<Array>}
 */
export const fetchRecentMaterials = async () => {
    try {
        const response = await apiClient.get('/mentor/materials/recent');
        return response.data.data || [];
    } catch (error) {
        console.error('Failed to fetch recent materials:', error);
        throw error;
    }
};

/**
 * Fetch calculated storage overview.
 * @returns {Promise<{ usedBytes: number, usedFormatted: string, totalBytes: number, totalFormatted: string, usagePercentage: number, fileCount: number }>}
 */
export const fetchStorageOverview = async () => {
    try {
        const response = await apiClient.get('/mentor/materials/storage');
        return response.data.data || {
            usedBytes: 0,
            usedFormatted: '0 MB',
            totalBytes: 10737418240,
            totalFormatted: '10 GB',
            usagePercentage: 0,
            fileCount: 0,
        };
    } catch (error) {
        console.error('Failed to fetch storage overview:', error);
        throw error;
    }
};

/**
 * Upload a real file for a specific team.
 * @param {FormData} formData - Contains file, teamId, optional category, optional description
 * @param {Function} onProgress - Optional upload progress callback
 * @returns {Promise<Object>}
 */
export const uploadMaterial = async (formData, onProgress) => {
    try {
        const response = await apiClient.post('/mentor/materials', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    onProgress(percentCompleted);
                }
            },
        });
        return response.data.data;
    } catch (error) {
        const message = error.response?.data?.error?.message || error.response?.data?.detail || 'Failed to upload material';
        console.error('Upload failed:', message);
        throw new Error(message);
    }
};

/**
 * Download a material file securely with authorization.
 * @param {string} materialId
 * @param {string} fileName
 */
export const downloadMaterial = async (materialId, fileName) => {
    try {
        const response = await apiClient.get(`/mentor/materials/${materialId}/download`, {
            responseType: 'blob',
        });

        const blob = new Blob([response.data], {
            type: response.headers['content-type'] || 'application/octet-stream',
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', fileName || 'download');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Failed to download material:', error);
        throw error;
    }
};

/**
 * Delete a material file.
 * @param {string} materialId
 * @returns {Promise<boolean>}
 */
export const deleteMaterial = async (materialId) => {
    try {
        await apiClient.delete(`/mentor/materials/${materialId}`);
        return true;
    } catch (error) {
        const message = error.response?.data?.error?.message || error.response?.data?.detail || 'Failed to delete material';
        console.error('Failed to delete material:', message);
        throw new Error(message);
    }
};
