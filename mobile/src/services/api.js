import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import Config from 'react-native-config';

// Rate limit state management
let rateLimitHandler = null;

/**
 * Set a handler to be called when rate limit (429) is hit
 * @param {Function} handler - Function to call with rate limit data
 *   handler({ isDistressed, retryAfter, crisisResources, message })
 */
export const setRateLimitHandler = (handler) => {
  rateLimitHandler = handler;
};

/**
 * Clear the rate limit handler
 */
export const clearRateLimitHandler = () => {
  rateLimitHandler = null;
};

// Base URL for the API
// Uses environment variable, with platform-specific fallback for Android emulator
const getBaseUrl = () => {
  const envUrl = Config.API_BASE_URL;

  // Android emulator uses 10.0.2.2 to reach host machine's localhost
  if (Platform.OS === 'android' && envUrl?.includes('localhost')) {
    return envUrl.replace('localhost', '10.0.2.2');
  }

  return envUrl || 'http://localhost:3000/api';
};

const BASE_URL = getBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Firebase auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error.message);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 429 Rate Limit errors
    if (error.response?.status === 429) {
      const responseData = error.response.data || {};
      const distressContext = responseData.distressContext || {};

      // Call the rate limit handler if set
      if (rateLimitHandler) {
        rateLimitHandler({
          isDistressed: distressContext.hasRecentDistress || false,
          retryAfter: responseData.retryAfter || 60,
          crisisResources: responseData.crisisResources || [],
          message: responseData.message || "You're using the app a lot. Give us a moment to catch up.",
        });
      }

      return Promise.reject({
        status: 429,
        message: responseData.message || 'Rate limit exceeded',
        data: responseData,
        isRateLimited: true,
      });
    }

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          // Force refresh the token
          const token = await currentUser.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message);
      }
    }

    // Format error message
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
    });
  }
);

// API methods
export const authAPI = {
  register: (email, password) =>
    api.post('/auth/register', { email, password }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  loginWithFirebase: () =>
    api.post('/auth/login/firebase'),
  registerWithFirebase: (data) =>
    api.post('/auth/register/firebase', data),
  getMe: () =>
    api.get('/auth/me'),
};

export const profileAPI = {
  get: () =>
    api.get('/profile'),
  update: (data) =>
    api.put('/profile', data),
  updatePreferences: (preferences) =>
    api.put('/profile/preferences', preferences),
  deletePreference: (key) =>
    api.delete(`/profile/preferences/${key}`),
};

export const moodAPI = {
  create: (data) =>
    api.post('/mood', data),
  list: (params) =>
    api.get('/mood', { params }),
  get: (id) =>
    api.get(`/mood/${id}`),
  update: (id, data) =>
    api.put(`/mood/${id}`, data),
  delete: (id) =>
    api.delete(`/mood/${id}`),
  stats: (params) =>
    api.get('/mood/stats', { params }),
};

export const checkinAPI = {
  create: (data) =>
    api.post('/checkins', data),
  list: (params) =>
    api.get('/checkins', { params }),
  get: (id) =>
    api.get(`/checkins/${id}`),
  update: (id, data) =>
    api.put(`/checkins/${id}`, data),
  delete: (id) =>
    api.delete(`/checkins/${id}`),
  analyze: (text, structuredData = {}) =>
    api.post('/checkins/analyze', { text, ...structuredData }),
  analyzeCheckin: (id) =>
    api.post(`/checkins/${id}/analyze`),
  stats: (params) =>
    api.get('/checkins/stats', { params }),
};

export const activityAPI = {
  create: (data) =>
    api.post('/activities', data),
  list: (params) =>
    api.get('/activities', { params }),
  get: (id) =>
    api.get(`/activities/${id}`),
  update: (id, data) =>
    api.put(`/activities/${id}`, data),
  delete: (id) =>
    api.delete(`/activities/${id}`),
};

export const emergencyContactAPI = {
  create: (data) =>
    api.post('/emergency-contacts', data),
  list: () =>
    api.get('/emergency-contacts'),
  get: (id) =>
    api.get(`/emergency-contacts/${id}`),
  update: (id, data) =>
    api.put(`/emergency-contacts/${id}`, data),
  delete: (id) =>
    api.delete(`/emergency-contacts/${id}`),
  resendConfirmation: (id) =>
    api.post(`/emergency-contacts/${id}/resend`),
  getPrimary: () =>
    api.get('/emergency-contacts/primary'),
};

export const notificationAPI = {
  // Device token management
  registerDevice: (token, platform) =>
    api.post('/notifications/register-device', { token, platform }),
  unregisterDevice: (token) =>
    api.post('/notifications/unregister-device', { token }),
  // Legacy endpoints
  registerToken: (token) =>
    api.post('/notifications/token', { token }),
  removeToken: (token) =>
    api.delete('/notifications/token', { data: { token } }),
  getStatus: () =>
    api.get('/notifications/status'),
  sendTest: () =>
    api.post('/notifications/test'),
  sendReminder: (message) =>
    api.post('/notifications/reminder', { message }),
};

export const resourcesAPI = {
  getCrisisResources: () =>
    api.get('/resources/crisis'),
};

export const mindfulnessAPI = {
  getActivities: () =>
    api.get('/activities/mindfulness'),
  getActivity: (activityId) =>
    api.get(`/activities/mindfulness/${activityId}`),
  completeActivity: (activityId) =>
    api.post(`/activities/mindfulness/${activityId}/complete`),
  getStats: () =>
    api.get('/activities/mindfulness/stats/user'),
  getSuggested: (mood) =>
    api.get('/activities/mindfulness/suggested/activity', { params: { mood } }),
};

export const progressAPI = {
  getToday: () =>
    api.get('/progress/today'),
  getStreaks: () =>
    api.get('/progress/streaks'),
  getAchievements: () =>
    api.get('/progress/achievements'),
  checkAchievements: () =>
    api.post('/progress/achievements/check'),
  getChallenges: () =>
    api.get('/progress/challenges'),
};

export const userSettingsAPI = {
  getSettings: () =>
    api.get('/users/settings'),
  updateSettings: (settings) =>
    api.patch('/users/settings', settings),
};

export default api;
