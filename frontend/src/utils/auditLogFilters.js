const STORAGE_KEY = 'buildplan-audit-filters';

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function readAuditFiltersFromSearchParams(searchParams) {
  return {
    userId: searchParams.get('userId') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  };
}

export function loadStoredAuditFilters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistAuditFilters(filters) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      userId: filters.userId || '',
      from: filters.from || '',
      to: filters.to || '',
    }),
  );
}

export function buildAuditLogsPath({ userId, from, to } = {}) {
  const p = new URLSearchParams();
  if (userId) p.set('userId', userId);
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  const q = p.toString();
  return `/admin/audit-logs${q ? `?${q}` : ''}`;
}

export function syncSearchParams(setSearchParams, filters) {
  const p = {};
  if (filters.userId) p.userId = filters.userId;
  if (filters.from) p.from = filters.from;
  if (filters.to) p.to = filters.to;
  setSearchParams(p);
}
