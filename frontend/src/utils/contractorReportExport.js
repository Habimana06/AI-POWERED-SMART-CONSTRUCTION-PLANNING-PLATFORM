import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  doc.setFontSize(16);
  doc.text('Contractor — My Reports', 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 26);

  let y = 34;
  projects.forEach((p, i) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.text(`${i + 1}. ${p.projectName} — ${p.progressPercentage}%`, 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Work logs', String(p.workLogCount)],
        ...(p.taskStats || []).map((s) => [`Tasks (${s.status})`, String(s.c)]),
        ...(p.materialTotals || []).map((m) => [`Materials (${m.status})`, `${Number(m.total).toLocaleString()} FRw`]),
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 12;
  });

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
