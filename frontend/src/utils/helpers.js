export const LOCALE = 'en-RW';
export const CURRENCY = 'RWF';

export function formatCurrency(value, currency = CURRENCY) {
  if (value == null || isNaN(value)) {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 }).format(0);
  }
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatDate(date, options = {}) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Audit logs — includes seconds for precise event time */
export function formatDateTimeFull(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatCurrencyCompact(value) {
  if (value == null || isNaN(value)) return '0';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} K`;
  return formatNumber(value);
}

/** Prefix backend upload paths when the app is served separately from the API */
export function resolveUploadUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

export function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
}

export function getFullName(user) {
  if (!user) return 'Unknown';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
}

export function truncate(str, length = 50) {
  if (!str) return '';
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getDashboardPath(role) {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'project_manager':
      return '/pm/dashboard';
    case 'contractor':
      return '/contractor/dashboard';
    default:
      return '/';
  }
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function generateProjectCode() {
  const prefix = 'BP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
