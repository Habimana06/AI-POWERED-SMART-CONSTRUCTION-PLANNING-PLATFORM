import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Sparkles, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { aiAPI, projectsAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import { parseDesignSpecifications } from '../../utils/buildingAssets';
import { calculateMaterialQuantities, calculateInteriorMaterials, summarizeMaterialCosts } from '../../utils/materialCalculations';
import { getLockedProjectFields } from '../../utils/projectMetadata';
import { exportCostEstimationPdf } from '../../utils/designDocumentExport';
import { formatCurrency, formatCurrencyCompact } from '../../utils/helpers';
import ChartCard from '../../components/ChartCard';
import PageHeader from '../../components/PageHeader';
import ProjectSelector from '../../components/ProjectSelector';
import StatCard from '../../components/StatCard';
import toast from 'react-hot-toast';

const COLORS = ['#E67E22', '#2C3E50', '#27AE60', '#F1C40F', '#7F8C8D', '#E74C3C'];

function normalizeBreakdown(estimation) {
  if (!estimation) return [];
  const raw = estimation.breakdown;
  const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(list)) return [];
  return list.map((b) => ({ category: b.category, amount: b.amount ?? b.cost ?? 0 }));
}

export default function CostEstimation() {
  const { activeProjectId, activeProject } = useProject();
  const [estimation, setEstimation] = useState(null);
  const { register, handleSubmit, watch, reset } = useForm();

  const { data: designsData } = useQuery({
    queryKey: ['designs', activeProjectId],
    queryFn: () => projectsAPI.getDesigns(activeProjectId),
    enabled: !!activeProjectId,
  });

  const designSpecs = parseDesignSpecifications(designsData?.designs?.[0]?.specifications);

  useEffect(() => {
    if (!activeProject) return;
    const locked = getLockedProjectFields(activeProject);
    reset({
      projectType: locked.projectType || 'commercial',
      areaSqft: locked.totalAreaSqft || 80000,
      floors: locked.floors || 8,
      location: locked.location || 'Kigali, Rwanda',
      budget: locked.budget || 250000000,
    });
    setEstimation(null);
  }, [activeProject, reset]);

  const locked = getLockedProjectFields(activeProject);

  const areaSqft = watch('areaSqft') || activeProject?.totalAreaSqft || 80000;
  const budget = Number(watch('budget') || activeProject?.budget || 0);

  const materialRows = useMemo(() => {
    const specs = designSpecs || {};
    const structural = calculateMaterialQuantities({
      width: specs.width || 8,
      depth: specs.depth || 6,
      floors: specs.floors || activeProject?.floors || 1,
      areaSqft,
      placedItems: specs.placedItems || [],
      buildingType: activeProject?.buildingType || activeProject?.projectType,
      workerSalaryTotal: specs.workerSalaryTotal ?? locked.workerSalaryTotal ?? 0,
    });
    const interior = calculateInteriorMaterials(specs.placedItems || []);
    return [...structural, ...interior];
  }, [designSpecs, areaSqft, activeProject]);

  const materialSummary = useMemo(() => summarizeMaterialCosts(materialRows, budget), [materialRows, budget]);

  const mutation = useMutation({
    mutationFn: aiAPI.costEstimation,
    onSuccess: (data) => {
      const est = data.estimation || data.aiAnalysis || data;
      setEstimation({
        ...est,
        totalCost: est.total_estimated_cost ?? est.totalEstimatedCost ?? est.totalCost,
        breakdown: normalizeBreakdown(est),
      });
      toast.success('Cost estimation saved to project');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Estimation failed'),
  });

  const breakdown = estimation?.breakdown || [];
  const aiTotal = estimation?.totalCost || breakdown.reduce((s, b) => s + (b.amount || 0), 0);
  const displayTotal = aiTotal || materialSummary.total;

  return (
    <div>
      <PageHeader title="Cost Estimation" subtitle="Per-material quantities × unit prices (FRw) compared to your budget" />
      <ProjectSelector className="mb-6" required />

      {!activeProjectId ? (
        <div className="card text-center py-12 text-concrete">Select a project to run cost estimation</div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, projectId: activeProjectId, areaSqft: Number(d.areaSqft), floors: Number(d.floors), budget: Number(d.budget) }))} className="card space-y-4">
              <p className="text-xs text-concrete">Locked from Create Project — <strong>{activeProject?.name}</strong></p>
              <div>
                <label className="label">Project Type</label>
                <select {...register('projectType')} className="input bg-steel-50" disabled><option value="commercial">Commercial</option><option value="residential">Residential</option></select>
              </div>
              <div>
                <label className="label">Area (sq ft)</label>
                <input {...register('areaSqft')} type="number" className="input bg-steel-50" readOnly />
              </div>
              <div>
                <label className="label">Floors</label>
                <input {...register('floors')} type="number" className="input bg-steel-50" readOnly />
              </div>
              <div>
                <label className="label">Location</label>
                <input {...register('location')} className="input bg-steel-50" readOnly />
              </div>
              <div>
                <label className="label">Budget (FRw)</label>
                <input {...register('budget')} type="number" className="input bg-steel-50" readOnly />
              </div>
              <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
                <Sparkles className="h-4 w-4" /> {mutation.isPending ? 'Estimating...' : 'Run AI Estimation (from materials total)'}
              </button>
              <button
                type="button"
                className="btn-outline w-full"
                onClick={() => exportCostEstimationPdf({
                  projectName: activeProject?.name,
                  lockedFields: locked,
                  costRows: materialRows,
                  costSummary: materialSummary,
                  budget,
                })}
              >
                Download Cost PDF
              </button>
            </form>
            <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
              <StatCard title="Total Estimated Cost" value={displayTotal ? formatCurrency(displayTotal) : '—'} icon={DollarSign} />
              <StatCard title="Cost per Sq Ft" value={displayTotal && areaSqft ? formatCurrency(displayTotal / areaSqft) : '—'} subtitle="Based on project area" />
              <StatCard title="Project Budget" value={budget ? formatCurrency(budget) : '—'} subtitle="Your allocated budget" />
              <StatCard
                title="Budget Status"
                value={budget ? (materialSummary.overBudget ? 'Over Budget' : 'Within Budget') : '—'}
                subtitle={budget ? `${materialSummary.budgetUsedPct.toFixed(0)}% of budget used` : ''}
                icon={materialSummary.overBudget ? AlertTriangle : CheckCircle}
              />
            </div>
          </div>

          {budget > 0 && (
            <div className={`card mb-6 ${materialSummary.overBudget ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <p className="font-semibold text-steel">
                Materials total: {formatCurrency(materialSummary.total)}
                {' · '}
                Budget: {formatCurrency(budget)}
                {' · '}
                <span className={materialSummary.overBudget ? 'text-red-600' : 'text-green-700'}>
                  {materialSummary.overBudget
                    ? `Over by ${formatCurrency(Math.abs(materialSummary.variance))}`
                    : `Remaining ${formatCurrency(materialSummary.variance)}`}
                </span>
              </p>
            </div>
          )}

          <div className="card mb-8 overflow-x-auto">
            <h3 className="font-semibold text-steel mb-4">Material Cost Table — Unit Price × Quantity (FRw)</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-800 text-white text-left">
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {materialRows.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-steel-50'}>
                    <td className="px-4 py-2 font-medium text-steel">{row.material}</td>
                    <td className="px-4 py-2 text-concrete">{row.category}</td>
                    <td className="px-4 py-2 text-right font-mono">{row.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2 text-concrete">{row.unit}</td>
                    <td className="px-4 py-2 text-right font-mono">{row.unitCost.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatCurrency(row.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/10 font-bold">
                  <td colSpan={5} className="px-4 py-3">Materials Subtotal</td>
                  <td className="px-4 py-3 text-right text-primary">{formatCurrency(materialSummary.total)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-xs text-concrete mt-3">Example: Cement 50kg bag = 10,000 FRw/unit · Quantities derived from building dimensions & floors</p>
          </div>

          {breakdown.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="AI Cost Breakdown" subtitle="By category (FRw)">
                <PieChart>
                  <Pie data={breakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                    {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ChartCard>
              <ChartCard title="Category Comparison" subtitle="Amount by category">
                <BarChart data={breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrencyCompact} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="#E67E22" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
