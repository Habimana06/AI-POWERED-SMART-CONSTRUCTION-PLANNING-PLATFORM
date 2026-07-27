/** Shared BuildPlan AI report branding (PDF via jsPDF) */

export const BRAND = {
  primary: [230, 126, 34],
  steel: [30, 41, 59],
  slate: [100, 116, 139],
  light: [248, 250, 252],
  white: [255, 255, 255],
};

export const ROLE_LABELS = {
  admin: 'Administrator — Platform Report',
  pm: 'Project Manager — Project Report',
  contractor: 'Contractor — Field & Assignment Report',
};

export function slugify(name = 'report') {
  return String(name).replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'report';
}

export function applyPdfFooter(doc, label = 'BuildPlan AI') {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFillColor(...BRAND.steel);
    doc.rect(0, h - 10, w, 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.white);
    doc.text(`${label} · Page ${i} of ${pageCount}`, 14, h - 4);
    doc.text(new Date().toLocaleDateString(), w - 14, h - 4, { align: 'right' });
  }
}

export function addPdfCover(doc, { role = 'pm', title, subtitle, lines = [] }) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.steel);
  doc.rect(0, 0, w, 52, 'F');
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 52, w, 4, 'F');

  doc.setTextColor(...BRAND.white);
  doc.setFontSize(10);
  doc.text(ROLE_LABELS[role] || ROLE_LABELS.pm, 14, 16);
  doc.setFontSize(22);
  doc.text(title || 'Project Report', 14, 28);
  doc.setFontSize(11);
  doc.setTextColor(220, 220, 220);
  if (subtitle) doc.text(subtitle, 14, 38);

  let y = 64;
  doc.setTextColor(...BRAND.steel);
  doc.setFontSize(10);
  lines.forEach((line) => {
    doc.text(line, 14, y);
    y += 6;
  });
  return y + 4;
}

export function addSectionHeading(doc, y, text) {
  doc.setFontSize(13);
  doc.setTextColor(...BRAND.steel);
  doc.text(text, 14, y);
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.6);
  doc.line(14, y + 2, 80, y + 2);
  return y + 10;
}
