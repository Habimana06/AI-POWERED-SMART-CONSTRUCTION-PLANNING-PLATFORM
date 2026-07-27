import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPdfCover, addSectionHeading, applyPdfFooter, BRAND,
} from './reportDesign';

function slug(name) {
  return String(name || 'report').replace(/[^\w-]+/g, '-').slice(0, 40);
}

export function exportContractorReportCsv(projects) {
  const rows = [
    ['Project', 'Progress %', 'Work logs', 'Tasks pending', 'Tasks completed', 'Approved FRw', 'Requested FRw'],
  ];
  projects.forEach((p) => {
    const pending = (p.taskStats || []).find((s) => s.status === 'pending')?.c || 0;
    const completed = (p.taskStats || []).find((s) => s.status === 'completed')?.c || 0;
    const approved = (p.materialTotals || []).find((m) => m.status === 'approved')?.total || 0;
    const requested = (p.materialTotals || []).find((m) => m.status === 'requested')?.total || 0;
    rows.push([
      p.projectName,
      p.progressPercentage,
      p.workLogCount,
      pending,
      completed,
      approved,
      requested,
    ]);
  });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contractor-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportContractorReportPdf(projects) {
  const doc = new jsPDF();

  let y = addPdfCover(doc, {
    role: 'contractor',
    title: 'My assignments — field report',
    subtitle: 'Progress, tasks, materials & work logs',
    lines: [
      `${projects.length} project(s) · Generated ${new Date().toLocaleString()}`,
    ],
  });

  projects.forEach((p, i) => {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    y = addSectionHeading(doc, y, `${i + 1}. ${p.projectName} — ${p.progressPercentage}% complete`);
    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Overall progress', `${p.progressPercentage}%`],
        ['Work logs submitted', String(p.workLogCount)],
        ...(p.taskStats || []).map((s) => [`Tasks (${s.status})`, String(s.c)]),
        ...(p.materialTotals || []).map((m) => [`Materials (${m.status})`, `${Number(m.total).toLocaleString()} FRw`]),
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: BRAND.steel },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 14;
  });

  applyPdfFooter(doc, 'BuildPlan AI · Contractor');
  doc.save(`contractor-reports-${slug(projects[0]?.projectName)}.pdf`);
}

export function parseAiPmComment(notes) {
  if (!notes) return '';
  const match = String(notes).match(/\[AI_PM\]\s*([\s\S]*?)(?=\[AI_|$)/);
  return match ? match[1].trim() : '';
}

export function parseAiContractorComment(notes) {
  if (!notes) return '';
  const match = String(notes).match(/\[AI_CONTRACTOR\]\s*([\s\S]*?)(?=\[AI_PM\]|$)/);
  return match ? match[1].trim() : '';
}
