import { useMemo } from 'react';
import { DOOR_STYLES, WINDOW_STYLES } from '../utils/buildingAssets';
import { calculateMaterialQuantities, calculateInteriorMaterials, summarizeMaterialCosts } from '../utils/materialCalculations';
import { formatCurrency } from '../utils/helpers';

export default function MaterialsBoard({
  materials = {}, doorStyle, windowStyle, floors, width, depth,
  areaSqft, placedItems = [], buildingType, budget = 0,
}) {
  const wall = materials.wallColor || '#F5F5F5';
  const accent = materials.accentColor || '#8B7355';
  const stone = materials.stoneColor || '#7F8C8D';
  const roof = materials.roofColor || '#2C3E50';
  const door = DOOR_STYLES.find((d) => d.id === doorStyle);
  const window = WINDOW_STYLES.find((w) => w.id === windowStyle);

  const materialRows = useMemo(() => {
    const structural = calculateMaterialQuantities({
      width, depth, floors, areaSqft, placedItems, buildingType,
    });
    const interior = calculateInteriorMaterials(placedItems);
    return [...structural, ...interior];
  }, [width, depth, floors, areaSqft, placedItems, buildingType]);

  const summary = useMemo(() => summarizeMaterialCosts(materialRows, budget), [materialRows, budget]);

  const swatches = [
    { label: 'Exterior Wall Paint', value: wall },
    { label: 'Accent / Trim', value: accent },
    { label: 'Stone Cladding', value: stone },
    { label: 'Roof', value: roof },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {swatches.map((s) => (
          <div key={s.label} className="rounded-xl border border-steel-100 overflow-hidden">
            <div className="h-16 w-full" style={{ backgroundColor: s.value }} />
            <div className="p-2">
              <p className="font-semibold text-steel text-xs">{s.label}</p>
              <p className="text-[10px] text-concrete font-mono">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {budget > 0 && (
        <div className={`rounded-xl p-4 ${summary.overBudget ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-steel">Materials Total vs Budget</p>
              <p className="text-xs text-concrete">Based on quantities × Rwanda unit prices (FRw)</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-steel">{formatCurrency(summary.total)}</p>
              <p className={`text-sm font-medium ${summary.overBudget ? 'text-red-600' : 'text-green-700'}`}>
                {summary.overBudget
                  ? `Over budget by ${formatCurrency(Math.abs(summary.variance))}`
                  : `Under budget by ${formatCurrency(summary.variance)}`}
              </p>
              <p className="text-xs text-concrete">Budget: {formatCurrency(budget)} ({summary.budgetUsedPct.toFixed(0)}% used)</p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-steel-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-steel-800 text-white text-left">
              <th className="px-4 py-3 font-semibold">Material</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold text-right">Qty</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold text-right">Unit Cost (FRw)</th>
              <th className="px-4 py-3 font-semibold text-right">Total (FRw)</th>
            </tr>
          </thead>
          <tbody>
            {materialRows.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-steel-50'}>
                <td className="px-4 py-2.5 font-medium text-steel">{row.material}</td>
                <td className="px-4 py-2.5 text-concrete">{row.category}</td>
                <td className="px-4 py-2.5 text-right font-mono">{row.quantity.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-concrete">{row.unit}</td>
                <td className="px-4 py-2.5 text-right font-mono">{row.unitCost.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-steel">{row.totalCost.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary/10 font-bold">
              <td colSpan={5} className="px-4 py-3 text-steel">Grand Total</td>
              <td className="px-4 py-3 text-right text-primary">{formatCurrency(summary.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <div className="card">
          <h4 className="font-semibold text-steel mb-2">Doors — {door?.name || doorStyle}</h4>
          <p className="text-xs text-concrete">Entrance & interior door units included in table above</p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-steel mb-2">Windows — {window?.name || windowStyle}</h4>
          <p className="text-xs text-concrete">Glazing units calculated per floor × facade openings</p>
        </div>
      </div>
    </div>
  );
}
