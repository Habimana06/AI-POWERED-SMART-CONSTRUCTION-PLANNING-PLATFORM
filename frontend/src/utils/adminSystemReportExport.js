import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPdfCover, addSectionHeading, applyPdfFooter, BRAND,
} from './reportDesign';

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
  const {
    range, summary, activityChart, projectsChart, usersByRole, messagesChart, workLogsChart,
  } = payload;
  const doc = new jsPDF();

  let y = addPdfCover(doc, {
    role: 'admin',
    title: 'System performance report',
    subtitle: 'Platform analytics & operational metrics',
    lines: [
      `Range: ${range?.startDate || '—'} to ${range?.endDate || '—'}`,
      `Generated ${new Date().toLocaleString()}`,
    ],
  });

  y = addSectionHeading(doc, y, 'Key metrics');
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Count']],
    body: [
      ['Audit events', String(summary?.auditEvents ?? 0)],
      ['New projects', String(summary?.newProjects ?? 0)],
      ['Messages sent', String(summary?.messagesSent ?? 0)],
      ['Work logs', String(summary?.workLogs ?? 0)],
      ['Active users', String(summary?.activeUsers ?? 0)],
      ['Active projects', String(summary?.activeProjects ?? 0)],
    ],
    headStyles: { fillColor: BRAND.steel },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 12;

  if (usersByRole?.length) {
    y = addSectionHeading(doc, y, 'Users by role');
    autoTable(doc, {
      startY: y,
      head: [['Role', 'Users']],
      body: usersByRole.map((r) => [r.name || r.role, String(r.count)]),
      headStyles: { fillColor: BRAND.steel },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  if (activityChart?.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionHeading(doc, y, 'Audit activity (daily)');
    autoTable(doc, {
      startY: y,
      head: [['Day', 'Events']],
      body: activityChart.slice(0, 25).map((r) => [r.day, String(r.events)]),
      headStyles: { fillColor: BRAND.steel },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  if (projectsChart?.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionHeading(doc, y, 'New projects (daily)');
    autoTable(doc, {
      startY: y,
      head: [['Day', 'Projects created']],
      body: projectsChart.slice(0, 25).map((r) => [r.day, String(r.projects)]),
      headStyles: { fillColor: BRAND.steel },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  if (messagesChart?.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionHeading(doc, y, 'Messages sent (daily)');
    autoTable(doc, {
      startY: y,
      head: [['Day', 'Messages']],
      body: messagesChart.slice(0, 20).map((r) => [r.day, String(r.messages)]),
      headStyles: { fillColor: BRAND.steel },
      margin: { left: 14, right: 14 },
    });
  }

  if (workLogsChart?.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionHeading(doc, y, 'Work logs (daily)');
    autoTable(doc, {
      startY: y,
      head: [['Day', 'Logs']],
      body: workLogsChart.slice(0, 20).map((r) => [r.day, String(r.logs)]),
      headStyles: { fillColor: BRAND.steel },
      margin: { left: 14, right: 14 },
    });
  }

  applyPdfFooter(doc, 'BuildPlan AI · Admin');
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
