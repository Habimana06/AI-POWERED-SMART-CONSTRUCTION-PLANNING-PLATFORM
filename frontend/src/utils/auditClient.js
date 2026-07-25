import { authAPI } from '../services/api';

/** Fire-and-forget audit log for the current user (downloads, exports, etc.). */
export function logUserActivity(action, details = null, entityType = 'activity') {
  if (!localStorage.getItem('accessToken')) return;
  authAPI.recordAuditEvent({ action, entityType, details }).catch(() => {});
}
