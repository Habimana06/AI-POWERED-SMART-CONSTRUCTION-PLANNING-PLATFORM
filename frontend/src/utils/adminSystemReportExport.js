import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportSystemReportCsv(payload) {
  const { range, summary, activityChart, projectsChart } = payload;
  const rows = [
    ['System performance report'],
    ['From', range?.startDate || ''],
    ['To', range?.endDate || ''],
    [],
    ['Metric', 'Value'],
    ['Audit events', summary?.auditEvents ?? 0],
    ['New projects', summary?.newProjects ?? 0],
    ['Messages sent', summary?.messagesSent ?? 0],
    ['Work logs', summary?.workLogs ?? 0],
    ['Active users', summary?.activeUsers ?? 0],
    ['Active projects', summary?.activeProjects ?? 0],
    [],
    ['Day', 'Audit events'],
    ...(activityChart || []).map((r) => [r.day, r.events]),
    [],
    ['Day', 'New projects'],
    ...(projectsChart || []).map((r) => [r.day, r.projects]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `system-report-${range?.endDate || 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSystemReportPdf(payload) {
  const { range, summary, activityChart } = payload;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('BuildPlan AI — System Performance', 14, 18);
  doc.setFontSize(10);
  doc.text(`Range: ${range?.startDate || '—'} to ${range?.endDate || '—'}`, 14, 26);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 32);

  autoTable(doc, {
    startY: 40,
    head: [['Metric', 'Count']],
    body: [
      ['Audit events', String(summary?.auditEvents ?? 0)],
      ['New projects', String(summary?.newProjects ?? 0)],
      ['Messages sent', String(summary?.messagesSent ?? 0)],
      ['Work logs', String(summary?.workLogs ?? 0)],
      ['Active users', String(summary?.activeUsers ?? 0)],
      ['Active projects', String(summary?.activeProjects ?? 0)],
    ],
  });

  if (activityChart?.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Day', 'Audit events']],
      body: activityChart.slice(0, 20).map((r) => [r.day, String(r.events)]),
    });
  }

  doc.save(`system-report-${range?.endDate || 'export'}.pdf`);
}

export function exportAuditLogsCsv(logs, filename = 'audit-logs') {
  const rows = [
    ['Timestamp', 'User', 'Email', 'Action', 'Entity', 'Details', 'IP'],
    ...logs.map((row) => [
      row.created_at || row.createdAt,
      [row.first_name, row.last_name].filter(Boolean).join(' ') || row.userName || '',
      row.email || '',
      row.action,
      row.entity_type || row.entityType,
      row.details || row.description || '',
      row.ip_address || row.ipAddress || '',
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
