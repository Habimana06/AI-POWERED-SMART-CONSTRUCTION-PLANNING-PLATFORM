export function auditEventCategory(action = '') {
  const a = String(action).toUpperCase();
  if (
    a === 'LOGIN' || a === 'LOGOUT' || a.startsWith('LOGIN_')
    || a === 'REGISTER' || a === 'PASSWORD_RESET_REQUEST' || a === 'PASSWORD_RESET_COMPLETE'
    || a === 'CHANGE_PASSWORD' || a === 'EMAIL_VERIFIED' || a === 'ENABLE_2FA' || a === 'DISABLE_2FA'
    || a === 'UPDATE_PROFILE' || a === 'UPDATE_NOTIFICATION_PREFS'
  ) return 'user_activity';
  if (a.includes('CREATE') || a.includes('UPDATE') || a.includes('DELETE') || a.includes('APPROVE') || a.includes('ARCHIVE')
    || a.includes('SAVE_') || a.includes('GENERATE_')) {
    return 'data_change';
  }
  return 'system';
}

export const AUDIT_CATEGORY_LABELS = {
  user_activity: 'User activity',
  data_change: 'Project & data change',
  system: 'System',
};

export function auditCategoryBadgeStatus(category) {
  if (category === 'user_activity') return 'in_progress';
  if (category === 'data_change') return 'approved';
  return 'pending';
}
