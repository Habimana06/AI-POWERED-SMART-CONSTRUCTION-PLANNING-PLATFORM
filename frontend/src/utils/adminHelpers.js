/** Flatten nested admin settings { category: { key: { value } } } → { key: value } */
export function flattenSettings(data) {
  const nested = data?.settings || data || {};
  const flat = {};
  Object.values(nested).forEach((category) => {
    if (category && typeof category === 'object' && !Array.isArray(category)) {
      Object.entries(category).forEach(([key, val]) => {
        flat[key] = val?.value ?? val;
      });
    }
  });
  return flat;
}

export function auditLogUser(row) {
  if (row.userName) return row.userName;
  if (row.first_name || row.last_name) return `${row.first_name || ''} ${row.last_name || ''}`.trim();
  return row.email || 'System';
}
