const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Week starts Sunday (local). */
export function startOfWeekSunday(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date;
}

export function formatWeekLabel(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/** Build weekly buckets from project tasks (Sun–Sat). */
export function weeklyProgressFromTasks(tasks, projectStart) {
  if (!tasks?.length) return [];
  const anchor = projectStart ? new Date(projectStart) : new Date(tasks[0].start_date || tasks[0].startDate || Date.now());
  const week0 = startOfWeekSunday(anchor);

  const buckets = {};
  tasks.forEach((t) => {
    const start = new Date(t.start_date || t.startDate || anchor);
    const wk = startOfWeekSunday(start);
    const key = wk.toISOString().slice(0, 10);
    if (!buckets[key]) {
      buckets[key] = { weekStart: wk, tasks: 0, completed: 0, inProgress: 0, progressSum: 0 };
    }
    buckets[key].tasks += 1;
    const st = t.status || 'pending';
    if (st === 'completed') buckets[key].completed += 1;
    else if (st === 'in_progress') buckets[key].inProgress += 1;
    buckets[key].progressSum += st === 'completed' ? 100 : Number(t.progress_percentage ?? t.progressPercentage ?? 0);
  });

  return Object.values(buckets)
    .sort((a, b) => a.weekStart - b.weekStart)
    .map((b) => ({
      week: formatWeekLabel(b.weekStart),
      weekKey: b.weekStart.toISOString().slice(0, 10),
      tasks: b.tasks,
      completed: b.completed,
      avgProgress: b.tasks ? Math.round(b.progressSum / b.tasks) : 0,
      planned: b.tasks ? Math.min(100, Math.round(((b.completed + b.inProgress * 0.5) / b.tasks) * 100)) : 0,
    }));
}

export function materialUsageFromLogs(logs, materialsCatalog = []) {
  const usedMap = {};
  (logs || []).forEach((log) => {
    let arr = log.materials_used || log.materialsUsed;
    if (typeof arr === 'string') {
      try { arr = JSON.parse(arr); } catch { arr = []; }
    }
    (arr || []).forEach((m) => {
      const k = m.name || m.material || 'Other';
      usedMap[k] = (usedMap[k] || 0) + (Number(m.quantity) || 0);
    });
  });
  const entries = Object.entries(usedMap);
  if (entries.length) {
    return entries.slice(0, 10).map(([name, qty]) => ({ name: name.slice(0, 14), used: qty }));
  }
  return (materialsCatalog || []).slice(0, 8).map((m) => ({
    name: (m.material || m.name || 'Item').slice(0, 14),
    planned: m.quantity || 0,
    used: 0,
  }));
}

export { DAY_LABELS };
