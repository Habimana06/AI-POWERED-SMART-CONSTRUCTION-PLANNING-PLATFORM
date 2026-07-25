const VISITOR_ID_KEY = 'buildplan_landing_chat_visitor_id';
const DEFAULT_GREETING = {
  role: 'assistant',
  content: 'Hi! I\'m BuildPlan AI. Ask about design, costs, scheduling, or how to get started.',
};

function getOrCreateVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

/** Storage key isolated per signed-in user or anonymous visitor */
export function getLandingChatStorageKey(userId) {
  if (userId) return `buildplan_landing_chat_user_${userId}`;
  return `buildplan_landing_chat_visitor_${getOrCreateVisitorId()}`;
}

export function loadLandingChatHistory(userId) {
  const key = getLandingChatStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [DEFAULT_GREETING];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_GREETING];
    return parsed.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
  } catch {
    return [DEFAULT_GREETING];
  }
}

export function saveLandingChatHistory(userId, messages) {
  const key = getLandingChatStorageKey(userId);
  try {
    const trimmed = messages.slice(-80);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    /* quota or private mode */
  }
}

export function clearLandingChatHistory(userId) {
  const key = getLandingChatStorageKey(userId);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  return [DEFAULT_GREETING];
}

export { DEFAULT_GREETING };
