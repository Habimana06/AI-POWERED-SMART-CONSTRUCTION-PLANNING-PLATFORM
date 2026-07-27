import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import { calculateMaterialQuantities, calculateInteriorMaterials, summarizeMaterialCosts } from './materialCalculations';
import { formatCurrency } from './helpers';
import {
  addPdfCover, addSectionHeading, applyPdfFooter, slugify, BRAND, ROLE_LABELS,
} from './reportDesign';

export { slugify };

export function buildCostSummary({
  width, depth, floors, areaSqft, placedItems = [], buildingType, budget = 0,
}) {
  const structural = calculateMaterialQuantities({
    width, depth, floors, areaSqft, placedItems, buildingType,
  });
  const interior = calculateInteriorMaterials(placedItems);
  const rows = [...structural, ...interior];
  const summary = summarizeMaterialCosts(rows, budget);
  return { rows, summary };
}

export async function svgToPngDataUrl(svgEl, scale = 2) {
  if (!svgEl) throw new Error('Floor plan SVG not found');
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const vb = svgEl.viewBox?.baseVal;
  const w = vb?.width || svgEl.width?.baseVal?.value || 800;
  const h = vb?.height || svgEl.height?.baseVal?.value || 600;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function urlToDataUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load house image');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function addCostTableToPdf(doc, startY, rows, summary, budget) {
  autoTable(doc, {
    startY,
    head: [['Material', 'Category', 'Qty', 'Unit', 'Unit Cost', 'Total']],
    body: rows.slice(0, 22).map((r) => [
      r.material,
      r.category,
      r.quantity.toLocaleString(),
      r.unit,
      r.unitCost.toLocaleString(),
      r.totalCost.toLocaleString(),
    ]),
    foot: [[
      { content: 'Grand Total', colSpan: 5, styles: { fontStyle: 'bold' } },
      { content: formatCurrency(summary.total), styles: { fontStyle: 'bold' } },
    ]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND.steel },
    margin: { left: 14, right: 14 },
  });
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.steel);
  doc.text(`Materials total: ${formatCurrency(summary.total)}`, 14, finalY);
  if (budget > 0) {
    doc.text(`Project budget: ${formatCurrency(budget)} (${summary.budgetUsedPct.toFixed(0)}% used)`, 14, finalY + 6);
    doc.text(
      summary.overBudget
        ? `Over budget by ${formatCurrency(Math.abs(summary.variance))}`
        : `Under budget by ${formatCurrency(summary.variance)}`,
      14,
      finalY + 12,
    );
  }
  return finalY;
}

function addProjectOverviewTable(doc, startY, {
  location, budget, status, progress, startDate, endDate, width, depth, floors, roomCount, buildingStyle, lockedFields = {},
}) {
  autoTable(doc, {
    startY,
    head: [['Field', 'Value']],
    body: [
      ['Location', location || '—'],
      ['Status', status || '—'],
      ['Progress', progress != null ? `${progress}%` : '—'],
      ['Budget', budget ? formatCurrency(budget) : '—'],
      ['Schedule', [startDate, endDate].filter(Boolean).join(' → ') || '—'],
      ['Dimensions', `${width}m × ${depth}m · ${floors} floors · ${roomCount} rooms`],
      ['Building type', buildingStyle === 'commercial' ? 'Commercial' : 'Residential'],
      ['Roof / top', lockedFields.topType || lockedFields.roofType || '—'],
      ['Windows (planned)', lockedFields.totalWindows ?? '—'],
      ['Facade', lockedFields.facadeType || '—'],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND.steel },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48 } },
    margin: { left: 14, right: 14 },
  });
  return doc.lastAutoTable.finalY + 10;
}

export async function exportFloorPlanPdf({
  svgEl, projectName, activeFloor, width, depth, floors, roomCount,
}) {
  const png = await svgToPngDataUrl(svgEl);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  addPdfCover(doc, {
    role: 'pm',
    title: projectName || 'Building Project',
    subtitle: `Professional floor plan — Level ${activeFloor}`,
    lines: [
      `${width}m × ${depth}m · ${floors} floors · ${roomCount} rooms`,
      `Generated ${new Date().toLocaleString()}`,
    ],
  });

  const imgW = pageW - 28;
  const imgH = imgW * 0.62;
  doc.addImage(png, 'PNG', 14, 58, imgW, imgH);
  applyPdfFooter(doc);
  doc.save(`${slugify(projectName)}-floor-plan-L${activeFloor}.pdf`);
}

export async function exportFloorPlanPpt({
  svgEl, projectName, activeFloor, width, depth, floors, roomCount,
}) {
  const png = await svgToPngDataUrl(svgEl);
  const pptx = new PptxGenJS();
  pptx.author = 'BuildPlan AI';
  pptx.title = `${projectName} — Floor Plan`;

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '1E293B' };
  titleSlide.addText(projectName || 'Building Project', {
    x: 0.5, y: 2, w: 9, h: 0.8, fontSize: 32, bold: true, color: 'FFFFFF', align: 'center',
  });
  titleSlide.addText(`Floor Plan — Level ${activeFloor}`, {
    x: 0.5, y: 2.9, w: 9, fontSize: 18, color: 'FB923C', align: 'center',
  });
  titleSlide.addText(
    `${width}m × ${depth}m · ${floors} floors · ${roomCount} rooms`,
    { x: 0.5, y: 3.6, w: 9, fontSize: 13, color: '94A3B8', align: 'center' },
  );

  const slide = pptx.addSlide();
  slide.background = { color: 'F8FAFC' };
  slide.addImage({ data: png, x: 0.35, y: 0.5, w: 9.3, h: 6.2 });
  slide.addText('BuildPlan AI — Construction Planning Platform', {
    x: 0.5, y: 6.9, w: 9, fontSize: 10, color: '94A3B8',
  });

  await pptx.writeFile({ fileName: `${slugify(projectName)}-floor-plan-L${activeFloor}.pptx` });
}

export async function exportFullHousePdf({
  projectName, houseImageUrl, width, depth, floors, roomCount, buildingStyle,
  costRows, costSummary, budget, location, role = 'pm', lockedFields = {}, status, progress,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const houseImg = houseImageUrl ? await urlToDataUrl(houseImageUrl).catch(() => null) : null;

  let y = addPdfCover(doc, {
    role,
    title: projectName || 'Building Project',
    subtitle: 'Design presentation & cost estimate',
    lines: [
      `${floors}-floor ${buildingStyle === 'commercial' ? 'commercial' : 'residential'} · ${width}m × ${depth}m · ${roomCount} rooms`,
      location ? `Location: ${location}` : '',
      `Generated ${new Date().toLocaleDateString()}`,
    ].filter(Boolean),
  });

  y = addSectionHeading(doc, y, 'Project overview');
  y = addProjectOverviewTable(doc, y, {
    location, budget, status, progress, width, depth, floors, roomCount, buildingStyle, lockedFields,
  });

  if (houseImg) {
    if (y > 200) { doc.addPage(); y = 20; }
    y = addSectionHeading(doc, y, 'Full house — AI realistic render');
    doc.addImage(houseImg, 'JPEG', 14, y, 180, 100);
    y += 108;
  }

  if (y > 200) { doc.addPage(); y = 20; }
  y = addSectionHeading(doc, y, 'Materials & cost estimate');
  addCostTableToPdf(doc, y, costRows, costSummary, budget);
  applyPdfFooter(doc);
  doc.save(`${slugify(projectName)}-full-house-presentation.pdf`);
}

export async function exportFullHousePpt({
  projectName, houseImageUrl, width, depth, floors, roomCount, buildingStyle,
  costRows, costSummary, budget, location, role = 'pm', lockedFields = {},
  floorPlanPng, status, progress, description, startDate, endDate,
}) {
  const houseImg = houseImageUrl ? await urlToDataUrl(houseImageUrl).catch(() => null) : null;
  const planPng = floorPlanPng || null;
  const pptx = new PptxGenJS();
  pptx.author = 'BuildPlan AI';
  pptx.title = `${projectName} — Presentation`;

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '1E293B' };
  titleSlide.addText(ROLE_LABELS[role]?.split('—')[0]?.trim() || 'BuildPlan AI', {
    x: 0.5, y: 1.2, w: 9, fontSize: 14, color: 'FB923C', align: 'center',
  });
  titleSlide.addText(projectName || 'Building Project', {
    x: 0.5, y: 1.8, w: 9, h: 1, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center',
  });
  titleSlide.addText('Construction design presentation', {
    x: 0.5, y: 2.9, w: 9, fontSize: 18, color: '94A3B8', align: 'center',
  });
  titleSlide.addText(
    `${floors} floors · ${width}m × ${depth}m · ${roomCount} rooms${location ? ` · ${location}` : ''}`,
    { x: 0.5, y: 3.7, w: 9, fontSize: 13, color: '64748B', align: 'center' },
  );

  const overviewSlide = pptx.addSlide();
  overviewSlide.addText('Project overview', {
    x: 0.5, y: 0.35, w: 9, fontSize: 24, bold: true, color: '1E293B',
  });
  const overviewRows = [
    ['Status', status || '—', 'Budget', budget ? formatCurrency(budget) : '—'],
    ['Progress', progress != null ? `${progress}%` : '—', 'Schedule', [startDate, endDate].filter(Boolean).join(' → ') || '—'],
    ['Building', buildingStyle === 'commercial' ? 'Commercial' : 'Residential', 'Roof', lockedFields.topType || lockedFields.roofType || '—'],
    ['Windows', String(lockedFields.totalWindows ?? '—'), 'Facade', lockedFields.facadeType || '—'],
  ];
  overviewSlide.addTable(overviewRows, {
    x: 0.5, y: 1.1, w: 9, colW: [1.4, 3.1, 1.4, 3.1], fontSize: 11, border: { pt: 0.5, color: 'CBD5E1' },
  });
  if (description) {
    overviewSlide.addText('Scope & requirements', {
      x: 0.5, y: 3.2, w: 9, fontSize: 14, bold: true, color: '1E293B',
    });
    overviewSlide.addText(description.slice(0, 600), {
      x: 0.5, y: 3.7, w: 9, h: 2.5, fontSize: 11, color: '475569', valign: 'top',
    });
  }

  if (planPng) {
    const planSlide = pptx.addSlide();
    planSlide.addText('Professional floor plan', {
      x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: '1E293B',
    });
    planSlide.addText(`${width}m × ${depth}m · Level view`, {
      x: 0.5, y: 0.85, w: 9, fontSize: 12, color: '64748B',
    });
    planSlide.addImage({ data: planPng, x: 0.4, y: 1.2, w: 9.2, h: 5.5 });
  }

  if (houseImg) {
    const imgSlide = pptx.addSlide();
    imgSlide.addText('Full house — AI realistic render', {
      x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: '1E293B',
    });
    imgSlide.addText(
      `${buildingStyle === 'commercial' ? 'Commercial' : 'Residential'} · ${floors * 3}m total height`,
      { x: 0.5, y: 0.85, w: 9, fontSize: 12, color: '64748B' },
    );
    imgSlide.addImage({ data: houseImg, x: 0.5, y: 1.3, w: 9, h: 5.5 });
  }

  const costSlide = pptx.addSlide();
  costSlide.addText('Materials & cost estimate', {
    x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: '1E293B',
  });
  const tableRows = [
    [
      { text: 'Material', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'Qty', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'Total (FRw)', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
    ],
    ...costRows.slice(0, 14).map((r) => [r.material, `${r.quantity} ${r.unit}`, r.totalCost.toLocaleString()]),
    [
      { text: 'Grand Total', options: { bold: true } },
      '',
      { text: formatCurrency(costSummary.total), options: { bold: true, color: 'EA580C' } },
    ],
  ];
  if (budget > 0) {
    tableRows.push([
      { text: `Budget: ${formatCurrency(budget)}`, options: { bold: true } },
      '',
      {
        text: costSummary.overBudget
          ? `Over by ${formatCurrency(Math.abs(costSummary.variance))}`
          : `Under by ${formatCurrency(costSummary.variance)}`,
        options: { color: costSummary.overBudget ? 'DC2626' : '16A34A' },
      },
    ]);
  }
  costSlide.addTable(tableRows, {
    x: 0.4, y: 1.1, w: 9.2,
    colW: [4.5, 2, 2.7],
    fontSize: 10,
    border: { pt: 0.5, color: 'CBD5E1' },
  });

  const closeSlide = pptx.addSlide();
  closeSlide.background = { color: '1E293B' };
  closeSlide.addText('Thank you', {
    x: 0.5, y: 2.5, w: 9, fontSize: 32, bold: true, color: 'FFFFFF', align: 'center',
  });
  closeSlide.addText('BuildPlan AI — Smart Construction Planning', {
    x: 0.5, y: 3.5, w: 9, fontSize: 14, color: 'FB923C', align: 'center',
  });

  await pptx.writeFile({ fileName: `${slugify(projectName)}-presentation-${role}.pptx` });
}

export function exportCostEstimationPdf({ projectName, lockedFields, costRows, costSummary, budget }) {
  const doc = new jsPDF();
  let y = addPdfCover(doc, {
    role: 'pm',
    title: `${projectName} — Cost estimation`,
    subtitle: 'Locked project specifications',
    lines: [`Generated ${new Date().toLocaleDateString()}`],
  });
  doc.setFontSize(10);
  doc.text(
    `Floors: ${lockedFields.floors} · Area: ${lockedFields.totalAreaSqft} sq ft · Windows: ${lockedFields.totalWindows ?? '—'}`,
    14,
    y,
  );
  addCostTableToPdf(doc, y + 8, costRows, costSummary, budget);
  applyPdfFooter(doc);
  doc.save(`${slugify(projectName)}-cost-estimation.pdf`);
}

export async function exportFullProjectReportPdf({
  projectName, houseImageUrl, width, depth, floors, roomCount, buildingStyle,
  costRows, costSummary, budget, location, svgEl, activeFloor, lockedFields = {},
  role = 'pm', status, progress, description,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addPdfCover(doc, {
    role,
    title: projectName || 'Project Report',
    subtitle: 'Complete project dossier — design, visuals & costs',
    lines: [
      `BuildPlan AI · ${new Date().toLocaleString()}`,
      location ? `Location: ${location}` : null,
      budget ? `Budget: ${formatCurrency(budget)}` : null,
    ].filter(Boolean),
  });

  y = addSectionHeading(doc, y, 'Project overview');
  y = addProjectOverviewTable(doc, y, {
    location, budget, status, progress, startDate: lockedFields.startDate, endDate: lockedFields.endDate,
    width, depth, floors, roomCount, buildingStyle, lockedFields,
  });

  if (description || lockedFields.requirements) {
    y = addSectionHeading(doc, y, 'Scope & requirements');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.slate);
    const text = doc.splitTextToSize(String(description || lockedFields.requirements).slice(0, 1200), 180);
    doc.text(text, 14, y);
    y += text.length * 5 + 8;
  }

  if (svgEl) {
    if (y > 220) { doc.addPage(); y = 20; }
    y = addSectionHeading(doc, y, `Professional floor plan — Level ${activeFloor}`);
    try {
      const png = await svgToPngDataUrl(svgEl, 1.5);
      doc.addImage(png, 'PNG', 14, y, 180, 90);
      y += 96;
    } catch { y += 4; }
  }

  const houseImg = houseImageUrl ? await urlToDataUrl(houseImageUrl).catch(() => null) : null;
  if (houseImg) {
    if (y > 200) { doc.addPage(); y = 20; }
    y = addSectionHeading(doc, y, 'Full house — AI render');
    doc.addImage(houseImg, 'JPEG', 14, y, 180, 85);
    y += 92;
  }

  if (y > 200) { doc.addPage(); y = 20; }
  y = addSectionHeading(doc, y, 'Materials & cost summary');
  addCostTableToPdf(doc, y, costRows, costSummary, budget);
  applyPdfFooter(doc);
  doc.save(`${slugify(projectName)}-full-project-report-${role}.pdf`);
}

function parseReportContent(content) {
  if (content == null) return {};
  if (typeof content === 'object') return content;
  try { return JSON.parse(content); } catch { return { body: String(content) }; }
}

export function exportRoleReportPdf({
  role = 'pm',
  title,
  projectName,
  reportType,
  createdAt,
  summary,
  content,
  projectMeta = {},
  generatedBy,
}) {
  const doc = new jsPDF();
  const parsed = parseReportContent(content);
  const meta = projectMeta || {};

  let y = addPdfCover(doc, {
    role,
    title: title || 'Project Report',
    subtitle: `${reportType || 'general'} report`,
    lines: [
      `Project: ${projectName || 'N/A'}`,
      `Generated: ${new Date(createdAt).toLocaleString()}`,
      generatedBy ? `Author: ${generatedBy}` : null,
    ].filter(Boolean),
  });

  if (role === 'admin') {
    y = addSectionHeading(doc, y, 'Platform oversight summary');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.slate);
    const adminIntro = summary || 'Cross-project report archived on BuildPlan AI. Includes PM/contractor submissions for audit and compliance.';
    doc.text(doc.splitTextToSize(adminIntro, 180), 14, y);
    y += 24;
  }

  if (role === 'pm') {
    y = addSectionHeading(doc, y, 'Executive summary');
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(summary || 'Project status and design summary.', 180), 14, y);
    y += 20;
    if (Object.keys(meta).length) {
      y = addSectionHeading(doc, y, 'Project snapshot');
      y = addProjectOverviewTable(doc, y, {
        location: meta.location,
        budget: meta.budget,
        status: meta.status,
        progress: meta.progress,
        startDate: meta.startDate,
        endDate: meta.endDate,
        width: meta.width || '—',
        depth: meta.depth || '—',
        floors: meta.floors || '—',
        roomCount: meta.roomCount || '—',
        buildingStyle: meta.buildingStyle,
        lockedFields: meta.lockedFields || {},
      });
    }
  }

  if (role === 'contractor') {
    y = addSectionHeading(doc, y, 'Field assignment summary');
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(summary || 'Work progress, tasks, and materials for your assigned scope.', 180), 14, y);
    y += 18;
    if (meta.progress != null || meta.workLogCount != null) {
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Progress', meta.progress != null ? `${meta.progress}%` : '—'],
          ['Work logs', String(meta.workLogCount ?? '—')],
          ...(meta.taskStats || []).map((s) => [`Tasks (${s.status})`, String(s.c)]),
          ...(meta.materialTotals || []).map((m) => [`Materials (${m.status})`, `${Number(m.total).toLocaleString()} FRw`]),
        ],
        headStyles: { fillColor: BRAND.steel },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }
  }

  y = addSectionHeading(doc, y, 'Report details');
  const detailRows = Object.entries(parsed)
    .filter(([k]) => !['generatedAt'].includes(k))
    .slice(0, 24)
    .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')]);

  if (detailRows.length) {
    autoTable(doc, {
      startY: y,
      head: [['Key', 'Value']],
      body: detailRows,
      styles: { fontSize: 9, overflow: 'linebreak' },
      headStyles: { fillColor: BRAND.steel },
      columnStyles: { 0: { cellWidth: 45 } },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(String(summary || 'No additional structured content.'), 180), 14, y);
  }

  applyPdfFooter(doc);
  doc.save(`${slugify(title)}-${role}-report.pdf`);
}

/** @deprecated use exportRoleReportPdf */
export function exportReportPdf(opts) {
  exportRoleReportPdf({ ...opts, role: opts.role || 'pm' });
}

export async function exportProjectBundlePdf(ctx, role = 'pm') {
  return exportFullProjectReportPdf({
    role,
    projectName: ctx.projectName,
    houseImageUrl: ctx.houseImageUrl,
    width: ctx.width,
    depth: ctx.depth,
    floors: ctx.floors,
    roomCount: ctx.roomCount,
    buildingStyle: ctx.buildingStyle,
    costRows: ctx.costRows,
    costSummary: ctx.costSummary,
    budget: ctx.budget,
    location: ctx.location,
    lockedFields: ctx.lockedFields,
    status: ctx.status,
    progress: ctx.progress,
    description: ctx.description,
  });
}

export async function exportProjectBundlePpt(ctx, role = 'pm') {
  return exportFullHousePpt({
    role,
    projectName: ctx.projectName,
    houseImageUrl: ctx.houseImageUrl,
    width: ctx.width,
    depth: ctx.depth,
    floors: ctx.floors,
    roomCount: ctx.roomCount,
    buildingStyle: ctx.buildingStyle,
    costRows: ctx.costRows,
    costSummary: ctx.costSummary,
    budget: ctx.budget,
    location: ctx.location,
    lockedFields: ctx.lockedFields,
    status: ctx.status,
    progress: ctx.progress,
    description: ctx.description,
    startDate: ctx.startDate,
    endDate: ctx.endDate,
  });
}
