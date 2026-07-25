import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        const newToken = data.data?.accessToken || data.accessToken;
        const newRefresh = data.data?.refreshToken || data.refreshToken;
        localStorage.setItem('accessToken', newToken);
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

const unwrap = (response) => response.data?.data ?? response.data;

// Auth
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials).then(unwrap),
  verify2FALogin: (data) => api.post('/auth/2fa/verify-login', data).then(unwrap),
  setup2FA: () => api.post('/auth/2fa/setup').then(unwrap),
  enable2FA: (code) => api.post('/auth/2fa/enable', { code }).then(unwrap),
  disable2FA: (data) => api.post('/auth/2fa/disable', data).then(unwrap),
  register: (data) => api.post('/auth/register', data).then(unwrap),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }).then(unwrap),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }).then(unwrap),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(unwrap),
  verifyForgotPasswordCode: (data) => api.post('/auth/forgot-password/verify-code', data).then(unwrap),
  resetPassword: (data) => api.post('/auth/reset-password', data).then(unwrap),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }).then(unwrap),
  getProfile: () => api.get('/auth/profile').then(unwrap),
  recordAuditEvent: (data) => api.post('/auth/audit-event', data).then(unwrap),
};

// Users (Admin)
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }).then(unwrap),
  getById: (id) => api.get(`/users/${id}`).then(unwrap),
  create: (data) => api.post('/users', data).then(unwrap),
  update: (id, data) => api.put(`/users/${id}`, data).then(unwrap),
  delete: (id) => api.delete(`/users/${id}`).then(unwrap),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard').then(unwrap),
  getProjects: (params) => api.get('/projects', { params }).then(unwrap),
  approveProject: (id) => api.patch(`/projects/${id}/approve`).then(unwrap),
  archiveProject: (id) => api.patch(`/projects/${id}/archive`).then(unwrap),
  deleteProject: (id) => api.delete(`/projects/${id}`).then(unwrap),
  getReports: (params) => api.get('/reports', { params }).then(unwrap),
  getSettings: () => api.get('/admin/settings').then(unwrap),
  updateSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }).then(unwrap),
  updateSettings: async (flat) => {
    await Promise.all(Object.entries(flat).map(([key, value]) =>
      api.put(`/admin/settings/${key}`, { value }).then(unwrap)));
    return { success: true };
  },
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }).then(unwrap),
  getAuditUserSummaries: () => api.get('/admin/audit-logs/users').then(unwrap),
  getSystemStatus: () => api.get('/admin/system-status').then(unwrap),
  getMessageRecipients: () => api.get('/admin/message-recipients').then(unwrap),
  getProjectInsights: (projectId) => api.get(`/admin/projects/${projectId}/insights`).then(unwrap),
  getSystemReports: (params) => api.get('/admin/system-reports', { params }).then(unwrap),
  getTestimonials: (params) => api.get('/admin/testimonials', { params }).then(unwrap),
  approveTestimonial: (id) => api.patch(`/admin/testimonials/${id}/approve`).then(unwrap),
  rejectTestimonial: (id) => api.patch(`/admin/testimonials/${id}/reject`).then(unwrap),
  deleteTestimonial: (id) => api.delete(`/admin/testimonials/${id}`).then(unwrap),
  getContactMessages: (params) => api.get('/admin/contact-messages', { params }).then(unwrap),
  replyContactMessage: (id, replyMessage) =>
    api.patch(`/admin/contact-messages/${id}/reply`, { replyMessage }).then(unwrap),
  deleteContactMessage: (id) => api.delete(`/admin/contact-messages/${id}`).then(unwrap),
};

// Public landing (no auth)
export const publicAPI = {
  getLandingStats: () => api.get('/public/landing-stats').then(unwrap),
  getShowcaseProjects: () => api.get('/public/showcase-projects').then(unwrap),
  getTestimonials: () => api.get('/public/testimonials').then(unwrap),
  submitTestimonial: (data) => api.post('/public/testimonials', data).then(unwrap),
  getContactInfo: () => api.get('/public/contact-info').then(unwrap),
  submitContact: (data) => api.post('/public/contact', data).then(unwrap),
};

// Companies (Admin)
export const companiesAPI = {
  getAll: (params) => api.get('/companies', { params }).then(unwrap),
  getById: (id) => api.get(`/companies/${id}`).then(unwrap),
  create: (data) => api.post('/companies', data).then(unwrap),
  update: (id, data) => api.put(`/companies/${id}`, data).then(unwrap),
  delete: (id) => api.delete(`/companies/${id}`).then(unwrap),
  approve: (id) => api.put(`/companies/${id}`, { status: 'active' }).then(unwrap),
  suspend: (id) => api.put(`/companies/${id}`, { status: 'suspended' }).then(unwrap),
};

// Analytics (Admin)
export const analyticsAPI = {
  getProjects: () => api.get('/analytics/projects').then(unwrap),
  getUsers: () => api.get('/analytics/users').then(unwrap),
};

// Projects
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }).then(unwrap),
  getById: (id) => api.get(`/projects/${id}`).then(unwrap),
  create: (data) => api.post('/projects', data).then(unwrap),
  update: (id, data) => api.put(`/projects/${id}`, data).then(unwrap),
  delete: (id) => api.delete(`/projects/${id}`).then(unwrap),
  uploadFile: (id, formData) =>
    api.post(`/projects/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap),
  uploadImage: (id, formData) =>
    api.post(`/projects/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap),
  getTasks: (id) => api.get(`/schedule/projects/${id}/tasks`).then(unwrap),
  createTask: (id, data) => api.post(`/schedule/projects/${id}/tasks`, data).then(unwrap),
  updateTask: (taskId, data) => api.put(`/schedule/tasks/${taskId}`, data).then(unwrap),
  getAssignments: (id) => api.get(`/projects/${id}/assignments`).then(unwrap),
  assignContractor: (id, data) => api.post(`/projects/${id}/assign-contractor`, data).then(unwrap),
  getDesigns: (id) => api.get(`/projects/${id}/designs`).then(unwrap),
  saveDesign: (id, data) => api.post(`/projects/${id}/designs`, data).then(unwrap),
  generateDesignExterior: (projectId, designId) =>
    api.post(`/projects/${projectId}/designs/${designId}/generate-exterior`, {}).then(unwrap),
  saveDesignAiRender: (projectId, designId, data) =>
    api.patch(`/projects/${projectId}/designs/${designId}/ai-render`, data).then(unwrap),
  getBlueprints: (id) => api.get(`/schedule/projects/${id}/blueprints`).then(unwrap),
  uploadBlueprint: (id, formData) =>
    api.post(`/schedule/projects/${id}/blueprints`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap),
  getFloorPlans: (id) => api.get(`/projects/${id}/floor-plans`).then(unwrap),
  getMaterials: (id) => api.get('/materials', { params: { projectId: id } }).then(unwrap),
  requestMaterial: (id, data) => api.post('/materials/request', { ...data, projectId: id }).then(unwrap),
  getProgress: (id) => api.get('/progress/updates', { params: { projectId: id } }).then(unwrap),
  submitProgress: (id, data) => api.post('/progress/updates', { ...data, projectId: id }).then(unwrap),
  getDailyLogs: (id) => api.get('/progress/daily-logs', { params: { projectId: id } }).then(unwrap),
  submitDailyLog: (id, data) => api.post('/progress/daily-logs', { ...data, projectId: id }).then(unwrap),
  getIssues: (id) => api.get('/issues', { params: { projectId: id } }).then(unwrap),
  reportIssue: (id, data) => api.post('/issues', { ...data, projectId: id }).then(unwrap),
  getReports: (id) => api.get('/reports', { params: { projectId: id } }).then(unwrap),
  generateReport: (id, data) => api.post('/reports', { ...data, projectId: id }).then(unwrap),
  getContractors: () => api.get('/projects/contractors/list').then(unwrap),
};

// AI
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data).then(unwrap),
  getConversations: (params) => api.get('/ai/conversations', { params }).then(unwrap),
  getConversation: (id) => api.get(`/ai/conversations/${id}`).then(unwrap),
  buildingDesign: (data) => api.post('/ai/building-design', data).then(unwrap),
  renderPrompt: (data) => api.post('/ai/render-prompt', data).then(unwrap),
  generateRender: (data) => api.post('/ai/generate-render', data).then(unwrap),
  fluxImage: (data) => api.post('/ai/flux-image', data).then(unwrap),
  listImageProviders: () => api.get('/ai/image-providers').then(unwrap),
  costEstimation: (data) => api.post('/ai/cost-estimation', data).then(unwrap),
  riskPrediction: (data) => api.post('/ai/risk-prediction', data).then(unwrap),
  schedule: (data) => api.post('/schedule/generate', data).then(unwrap),
  progressAnalysis: (data) => api.post('/ai/progress-analysis', data).then(unwrap),
  reviewMaterialRequest: (data) => api.post('/ai/material-request-review', data).then(unwrap),
};

// PM Dashboard
export const pmAPI = {
  getDashboard: () => api.get('/projects/dashboard/pm').then(unwrap),
};

// Contractor
export const contractorAPI = {
  getDashboard: () => api.get('/projects/dashboard/contractor').then(unwrap),
  getProjects: (params) => api.get('/projects', { params }).then(unwrap),
  getTasks: () => api.get('/contractor/tasks').then(unwrap),
  completeTask: (taskId, data) => api.post(`/contractor/tasks/${taskId}/complete`, data).then(unwrap),
  submitDailyTask: (taskId, data) => api.post(`/contractor/tasks/${taskId}/daily`, data).then(unwrap),
  getMessageRecipients: () => api.get('/contractor/message-recipients').then(unwrap),
  updateContractorProfile: (data) => api.put('/contractor/profile', data).then(unwrap),
  getReports: () => api.get('/contractor/reports').then(unwrap),
  getProjectTasks: (projectId) => api.get(`/contractor/projects/${projectId}/tasks`).then(unwrap),
};

// Materials
export const materialsAPI = {
  updateStatus: (id, status, notes) => api.patch(`/materials/${id}/status`, { status, notes }).then(unwrap),
};

// Issues
export const issuesAPI = {
  update: (id, data) => api.patch(`/issues/${id}`, data).then(unwrap),
};

// Messages
export const messagesAPI = {
  getAll: (params) => api.get('/messages', { params }).then(unwrap),
  send: (data) => api.post('/messages', data).then(unwrap),
  markRead: (id) => api.patch(`/messages/${id}/read`).then(unwrap),
};

// Notifications
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }).then(unwrap),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.patch('/notifications/read-all').then(unwrap),
};

// Reports
export const reportsAPI = {
  getById: (id) => api.get(`/reports/${id}`).then(unwrap),
  export: (id, format) => api.get(`/reports/${id}/export`, { params: { format } }).then(unwrap),
};

// Profile
export const profileAPI = {
  update: (data) => api.put('/auth/profile', data).then(unwrap),
  updatePassword: (data) => api.put('/auth/profile/password', data).then(unwrap),
  updateNotifications: (data) => api.put('/auth/profile/notifications', data).then(unwrap),
};

// Health
export const healthAPI = {
  check: () => api.get('/health').then(unwrap),
};

export default api;
