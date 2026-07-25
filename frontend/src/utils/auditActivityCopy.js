function parseJson(val) {

  if (val == null || val === '') return null;

  if (typeof val === 'object') return val;

  try {

    return JSON.parse(val);

  } catch {

    return null;

  }

}



const FAIL_REASONS = {

  unknown_email: 'wrong email (no account)',

  invalid_password: 'wrong password',

  account_deactivated: 'account deactivated',

  invalid_code: 'wrong 2FA code',

  expired_token: '2FA session expired',

  totp_challenge: '2FA required',

};



export function describeAuditActivity(row) {

  const action = row?.action || '';

  const entity = row?.entity_type || row?.entityType || '';

  const data = parseJson(row?.new_values || row?.newValues);



  switch (action) {

    case 'LOGIN':

      return data?.email ? `Signed in (${data.email})` : 'Signed in successfully';

    case 'LOGOUT':

      return 'Signed out';

    case 'LOGIN_FAILED':

      return `Failed sign-in — ${FAIL_REASONS[data?.reason] || data?.reason || 'invalid credentials'}`;

    case 'LOGIN_2FA_REQUIRED':

      return 'Password OK — waiting for authenticator code';

    case 'LOGIN_2FA_FAILED':

      return `Failed 2FA — ${FAIL_REASONS[data?.reason] || data?.reason || 'invalid code'}`;

    case 'REGISTER':

      return data?.email ? `Registered account ${data.email}` : 'New account registered';

    case 'PASSWORD_RESET_REQUEST':

      return 'Requested password reset email';

    case 'PASSWORD_RESET_COMPLETE':

      return 'Completed password reset';

    case 'CHANGE_PASSWORD':

      return 'Changed account password';

    case 'EMAIL_VERIFIED':

      return 'Verified email address';

    case 'UPDATE_PROFILE':

      return 'Updated profile (name, contact, or avatar)';

    case 'UPDATE_NOTIFICATION_PREFS':

      return 'Updated notification preferences';

    case 'ENABLE_2FA':

      return 'Turned on two-factor authentication';

    case 'DISABLE_2FA':

      return 'Turned off two-factor authentication';

    case 'SAVE_DESIGN':

      return data?.name ? `Saved building design “${data.name}”` : 'Saved 3D / floor plan design';

    case 'GENERATE_HOUSE_IMAGE':

      return data?.skipped ? 'House image already saved for design' : 'Generated full house image (server)';

    case 'SAVE_HOUSE_RENDER':

      return 'Saved house render image to project';

    case 'DOWNLOAD_EXPORT_CSV':

      return data?.scope ? `Downloaded CSV export (${data.scope})` : 'Downloaded CSV export';

    case 'DOWNLOAD_EXPORT_PDF':

      return data?.scope ? `Downloaded PDF report (${data.scope})` : 'Downloaded PDF report';

    case 'CREATE_PROJECT':

      return data?.project?.name ? `Created project “${data.project.name}”` : data?.name ? `Created project “${data.name}”` : 'Created a new project';

    case 'UPDATE_PROJECT':

      return data?.project?.name ? `Updated project “${data.project.name}”` : 'Updated project details';

    case 'DELETE_PROJECT':

      return 'Deleted a project';

    case 'APPROVE_PROJECT':

      return 'Approved a project';

    case 'ARCHIVE_PROJECT':

      return 'Archived a project';

    case 'CREATE_USER':

      return data?.user?.email ? `Created user ${data.user.email}` : 'Created a user account';

    case 'UPDATE_USER':

      return 'Updated a user account';

    case 'DELETE_USER':

      return 'Removed a user account';

    default:

      if (entity && action) return `${action.replace(/_/g, ' ').toLowerCase()} · ${entity}`;

      return action.replace(/_/g, ' ').toLowerCase() || 'Activity recorded';

  }

}



export function auditActivityDetail(row) {

  const action = row?.action;

  if (['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'LOGIN_2FA_FAILED', 'LOGIN_2FA_REQUIRED'].includes(action)) {

    const data = parseJson(row?.new_values || row?.newValues);

    if (data?.email) return `Account: ${data.email}`;

    return null;

  }

  const data = parseJson(row?.new_values || row?.newValues);

  if (!data || typeof data !== 'object') return null;

  const bits = [];

  if (data.name) bits.push(`Name: ${data.name}`);

  if (data.projectCode) bits.push(`Code: ${data.projectCode}`);

  if (data.projectId) bits.push(`Project ID: ${data.projectId}`);

  if (data.status) bits.push(`Status: ${data.status}`);

  if (data.scope) bits.push(`Scope: ${data.scope}`);

  if (data.description && String(data.description).length < 120) bits.push(data.description);

  return bits.length ? bits.join(' · ') : null;

}

