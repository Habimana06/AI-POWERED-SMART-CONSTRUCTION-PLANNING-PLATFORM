import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import { calculateMaterialQuantities, calculateInteriorMaterials, summarizeMaterialCosts } from './materialCalculations';
import { formatCurrency } from './helpers';

function slugify(name = 'project') {
  return String(name).replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'project';
}

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
    body: rows.slice(0, 18).map((r) => [
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
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: 14, right: 14 },
  });
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10);
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

export async function exportFloorPlanPdf({
  svgEl, projectName, activeFloor, width, depth, floors, roomCount,
}) {
  const png = await svgToPngDataUrl(svgEl);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(projectName || 'Building Project', 14, 16);
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Floor Plan — Level ${activeFloor} · ${width}m × ${depth}m · ${floors} floors · ${roomCount} rooms`,
    14,
    24,
  );
  doc.text(`Generated ${new Date().toLocaleString()} · BuildPlan AI`, 14, 30);

  const imgW = pageW - 28;
  const imgH = imgW * 0.62;
  doc.addImage(png, 'PNG', 14, 36, imgW, imgH);

  doc.save(`${slugify(projectName)}-floor-plan-L${activeFloor}.pdf`);
}

export async function exportFloorPlanPpt({
  svgEl, projectName, activeFloor, width, depth, floors, roomCount,
}) {
  const png = await svgToPngDataUrl(svgEl);
  const pptx = new PptxGenJS();
  pptx.author = 'BuildPlan AI';
  pptx.title = `${projectName} — Floor Plan`;

  const slide = pptx.addSlide();
  slide.background = { color: 'F8FAFC' };
  slide.addText(projectName || 'Building Project', {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, bold: true, color: '1E293B',
  });
  slide.addText(
    `Floor Plan — Level ${activeFloor} · ${width}m × ${depth}m · ${floors} floors · ${roomCount} rooms`,
    { x: 0.5, y: 0.95, w: 9, h: 0.4, fontSize: 14, color: '64748B' },
  );
  slide.addImage({ data: png, x: 0.4, y: 1.5, w: 9.2, h: 5.2 });
  slide.addText('BuildPlan AI — Construction Planning Platform', {
    x: 0.5, y: 6.9, w: 9, fontSize: 10, color: '94A3B8',
  });

  await pptx.writeFile({ fileName: `${slugify(projectName)}-floor-plan-L${activeFloor}.pptx` });
}

export async function exportFullHousePdf({
  projectName, houseImageUrl, width, depth, floors, roomCount, buildingStyle,
  costRows, costSummary, budget, location,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const houseImg = houseImageUrl ? await urlToDataUrl(houseImageUrl).catch(() => null) : null;

  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(projectName || 'Building Project', 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${floors}-floor ${buildingStyle === 'commercial' ? 'commercial' : 'residential'} building · ${width}m × ${depth}m · ${floors * 3}m height · ${roomCount} rooms`,
    14,
    26,
  );
  if (location) doc.text(`Location: ${location}`, 14, 32);
  doc.text(`Presentation document · ${new Date().toLocaleDateString()}`, 14, location ? 38 : 32);

  let y = location ? 44 : 38;
  if (houseImg) {
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Full House — AI Realistic Render', 14, y);
    y += 6;
    doc.addImage(houseImg, 'JPEG', 14, y, 180, 100);
    y += 108;
  }

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Materials & Cost Estimate', 14, y);
  addCostTableToPdf(doc, y + 4, costRows, costSummary, budget);

  doc.save(`${slugify(projectName)}-full-house-presentation.pdf`);
}

export async function exportFullHousePpt({
  projectName, houseImageUrl, width, depth, floors, roomCount, buildingStyle,
  costRows, costSummary, budget, location,
}) {
  const houseImg = houseImageUrl ? await urlToDataUrl(houseImageUrl).catch(() => null) : null;
  const pptx = new PptxGenJS();
  pptx.author = 'BuildPlan AI';
  pptx.title = `${projectName} — Full House Presentation`;

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '1E293B' };
  titleSlide.addText(projectName || 'Building Project', {
    x: 0.5, y: 1.8, w: 9, h: 1, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center',
  });
  titleSlide.addText('Construction Design Presentation', {
    x: 0.5, y: 2.9, w: 9, fontSize: 18, color: 'FB923C', align: 'center',
  });
  titleSlide.addText(
    `${floors} floors · ${width}m × ${depth}m · ${roomCount} rooms${location ? ` · ${location}` : ''}`,
    { x: 0.5, y: 3.8, w: 9, fontSize: 14, color: '94A3B8', align: 'center' },
  );

  if (houseImg) {
    const imgSlide = pptx.addSlide();
    imgSlide.addText('Full House — AI Realistic Render', {
      x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: '1E293B',
    });
    imgSlide.addText(
      `${buildingStyle === 'commercial' ? 'Commercial' : 'Residential'} · ${floors * 3}m total height`,
      { x: 0.5, y: 0.85, w: 9, fontSize: 12, color: '64748B' },
    );
    imgSlide.addImage({ data: houseImg, x: 0.5, y: 1.3, w: 9, h: 5.5 });
  }

  const costSlide = pptx.addSlide();
  costSlide.addText('Materials & Cost Estimate', {
    x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: '1E293B',
  });
  const tableRows = [
    [
      { text: 'Material', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'Qty', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'Total (FRw)', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
    ],
    ...costRows.slice(0, 12).map((r) => [r.material, `${r.quantity} ${r.unit}`, r.totalCost.toLocaleString()]),
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

  await pptx.writeFile({ fileName: `${slugify(projectName)}-full-house-presentation.pptx` });
}

export function exportCostEstimationPdf({ projectName, lockedFields, costRows, costSummary, budget }) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`${projectName} — Cost Estimation`, 14, 20);
  doc.setFontSize(10);
  doc.text(`Locked project specs · ${new Date().toLocaleDateString()}`, 14, 28);
  doc.text(`Floors: ${lockedFields.floors} · Area: ${lockedFields.totalAreaSqft} sq ft · Windows: ${lockedFields.totalWindows ?? '—'}`, 14, 34);
  addCostTableToPdf(doc, 40, costRows, costSummary, budget);
  doc.save(`${slugify(projectName)}-cost-estimation.pdf`);
}

export async function exportFullProjectReportPdf({
  projectName, houseImageUrl, width, depth, floors, roomCount, buildingStyle,
  costRows, costSummary, budget, location, svgEl, activeFloor, lockedFields = {},
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 16;
  doc.setFontSize(20);
  doc.text(projectName || 'Project Report', 14, y);
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`BuildPlan AI · Full project report · ${new Date().toLocaleString()}`, 14, y);
  y += 8;
  doc.text(`Location: ${location || '—'} · Budget: ${formatCurrency(budget || 0)}`, 14, y);
  y += 6;
  doc.text(
    `${floors} floors · ${width}m × ${depth}m · ${roomCount} rooms · Top: ${lockedFields.topType || '—'} · Windows: ${lockedFields.totalWindows ?? '—'}`,
    14,
    y,
  );
  y += 10;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.text(`Professional Floor Plan — Level ${activeFloor}`, 14, y);
  y += 4;
  if (svgEl) {
    try {
      const png = await svgToPngDataUrl(svgEl, 1.5);
      doc.addImage(png, 'PNG', 14, y, 180, 90);
      y += 96;
    } catch { y += 4; }
  }
  if (y > 240) { doc.addPage(); y = 16; }
  const houseImg = houseImageUrl ? await urlToDataUrl(houseImageUrl).catch(() => null) : null;
  if (houseImg) {
    doc.setFontSize(13);
    doc.text('Full House Image', 14, y);
    y += 6;
    doc.addImage(houseImg, 'JPEG', 14, y, 180, 85);
    y += 92;
  }
  if (y > 200) { doc.addPage(); y = 16; }
  doc.setFontSize(13);
  doc.text('Materials & Cost Summary', 14, y);
  addCostTableToPdf(doc, y + 4, costRows, costSummary, budget);
  doc.save(`${slugify(projectName)}-full-project-report.pdf`);
}

export function exportReportPdf({ title, projectName, reportType, createdAt, summary, content }) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title || 'Project Report', 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Project: ${projectName || 'N/A'}`, 14, 30);
  doc.text(`Type: ${reportType || 'general'} · ${new Date(createdAt).toLocaleString()}`, 14, 36);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  let parsed = content;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { /* keep string */ }
  }
  const body = summary || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed || {}, null, 2));
  doc.text(doc.splitTextToSize(body, 180), 14, 48);
  doc.save(`${slugify(title)}-report.pdf`);
}
