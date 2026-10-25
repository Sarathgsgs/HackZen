import apiClient from "../../api/api";

/**
 * Student Settings API
 *
 * Manages user preferences by communicating with backend API.
 * Provides CRUD operations for settings, password changes, and account management.
 */

const API_BASE = "/settings";

const DEFAULT_SETTINGS = {
  profileMode: "Public",
  emailNotifications: true,
  pushNotifications: false,
  theme: "Blue Dark",
  accessibilityMode: false,
  contentLanguage: "English (US)",
  twoFactorEnabled: false,
  dataSharing: true,
  allowTeamInvitations: true,
  notificationFrequency: "Instant",
};

/**
 * Fetches the current student settings from backend.
 * If settings don't exist on backend, they are auto-created with defaults.
 *
 * @returns {Promise<Object>} User settings object
 * @throws {Error} If fetch fails
 */
export const fetchStudentSettings = async () => {
  try {
    const { data } = await apiClient.get(`${API_BASE}/me`);
    return data || { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error("Failed to fetch student settings:", error);

    // Handle specific error cases
    if (error.response?.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    if (error.response?.status === 404) {
      throw new Error("Settings not found. Please try again.");
    }

    throw error;
  }
};

/**
 * Updates specific settings for the student via backend.
 * Only provided fields are updated; others remain unchanged.
 *
 * @param {Object} updatedSettings - Settings to update (partial update)
 * @returns {Promise<Object>} Updated settings object
 * @throws {Error} If update fails
 */
export const updateStudentSettings = async (updatedSettings) => {
  try {
    const { data } = await apiClient.put(`${API_BASE}/me`, updatedSettings);
    return data;
  } catch (error) {
    console.error("Failed to update student settings:", error);

    // Handle specific error cases
    if (error.response?.status === 401) {
      throw new Error("Unauthorized. Please log in again.");
    }
    if (error.response?.status === 422) {
      throw new Error(
        error.response.data?.detail || "Invalid settings provided.",
      );
    }
    if (error.response?.status === 400) {
      throw new Error(
        error.response.data?.detail || "Bad request. Check your input.",
      );
    }

    throw error;
  }
};

/**
 * Resets all settings to defaults via backend.
 *
 * @returns {Promise<Object>} Reset settings response
 * @throws {Error} If reset fails
 */
export const resetStudentSettings = async () => {
  try {
    const { data } = await apiClient.post(`${API_BASE}/reset`);
    return data;
  } catch (error) {
    console.error("Failed to reset student settings:", error);

    if (error.response?.status === 401) {
      throw new Error("Unauthorized. Please log in again.");
    }

    throw error;
  }
};

/**
 * Changes user password via backend.
 * Requires verification of current password.
 *
 * @param {Object} passwordData - { currentPassword, newPassword, confirmPassword }
 * @returns {Promise<Object>} Change password response
 * @throws {Error} If password change fails
 */
export const changePassword = async (passwordData) => {
  try {
    const { data } = await apiClient.post(`${API_BASE}/password`, passwordData);
    return data;
  } catch (error) {
    console.error("Failed to change password:", error);

    // Handle specific error cases
    if (error.response?.status === 401) {
      throw new Error("Current password is incorrect.");
    }
    if (error.response?.status === 422) {
      const detail = error.response.data?.detail;
      if (Array.isArray(detail)) {
        throw new Error(detail[0]?.msg || "Password validation failed.");
      }
      throw new Error(detail || "Password does not meet requirements.");
    }

    throw error;
  }
};

/**
 * Deactivates the student account via backend (soft delete).
 * Account data is retained for 30 days.
 *
 * @returns {Promise<Object>} Deactivation response
 * @throws {Error} If deactivation fails
 */
export const deactivateStudentAccount = async () => {
  try {
    const { data } = await apiClient.delete(`${API_BASE}/me`);

    // Clear local storage after successful deactivation
    localStorage.clear();
    sessionStorage.clear();

    return data;
  } catch (error) {
    console.error("Account deactivation failed:", error);

    if (error.response?.status === 401) {
      throw new Error("Unauthorized. Please log in again.");
    }

    throw error;
  }
};

/**
 * Toggles a specific boolean setting for the student.
 * Helper function that fetches current value and toggles it.
 *
 * @param {string} key - Setting key to toggle
 * @returns {Promise<Object>} Updated settings
 * @throws {Error} If toggle fails
 */
export const toggleStudentSetting = async (key) => {
  try {
    const current = await fetchStudentSettings();
    const newValue = !current[key];

    return await updateStudentSettings({ [key]: newValue });
  } catch (error) {
    console.error(`Failed to toggle setting "${key}":`, error);
    throw error;
  }
};

/**
 * Fetches default settings template from backend.
 * Useful for form initialization and validation.
 *
 * @returns {Promise<Object>} Default settings template
 * @throws {Error} If fetch fails
 */
export const getDefaultSettings = async () => {
  try {
    const { data } = await apiClient.get(`${API_BASE}/defaults`);
    return data?.data || { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error("Failed to fetch default settings:", error);
    // Return local defaults as fallback
    return { ...DEFAULT_SETTINGS };
  }
};
