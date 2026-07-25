import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Sparkles, Shield } from 'lucide-react';
import { aiAPI, projectsAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import { getLockedProjectFields } from '../../utils/projectMetadata';
import { parseDesignSpecifications } from '../../utils/buildingAssets';
import { calculateMaterialQuantities, calculateInteriorMaterials, summarizeMaterialCosts } from '../../utils/materialCalculations';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import ProjectSelector from '../../components/ProjectSelector';
import toast from 'react-hot-toast';

export default function RiskPrediction() {
  const { activeProjectId, activeProject } = useProject();
  const [risks, setRisks] = useState([]);
  const { register, handleSubmit, reset } = useForm();

  const { data: designsData } = useQuery({
    queryKey: ['designs', activeProjectId],
    queryFn: () => projectsAPI.getDesigns(activeProjectId),
    enabled: !!activeProjectId,
  });

  const designSpecs = parseDesignSpecifications(designsData?.designs?.[0]?.specifications);

  const materialSummary = useMemo(() => {
    const specs = designSpecs || {};
    const structural = calculateMaterialQuantities({
      width: specs.width || 8,
      depth: specs.depth || 6,
      floors: specs.floors || activeProject?.floors || 1,
      areaSqft: activeProject?.totalAreaSqft,
      placedItems: specs.placedItems || [],
      buildingType: activeProject?.buildingType || activeProject?.projectType,
    });
    const interior = calculateInteriorMaterials(specs.placedItems || []);
    const rows = [...structural, ...interior];
    return {
      rows,
      ...summarizeMaterialCosts(rows, activeProject?.budget || 0),
      topMaterials: rows.slice(0, 12).map((r) => `${r.material}: ${r.quantity} ${r.unit}`),
    };
  }, [designSpecs, activeProject]);

  useEffect(() => {
    if (!activeProject) return;
    const locked = getLockedProjectFields(activeProject);
    reset({
      projectName: locked.name,
      projectType: locked.projectType || 'commercial',
      timeline: locked.startDate && locked.endDate ? `${locked.startDate} to ${locked.endDate}` : '',
      budget: locked.budget || 0,
      location: locked.location || '',
      currentProgress: activeProject.progressPercentage || 0,
    });
    const saved = localStorage.getItem(`risk-analysis-${activeProjectId}`);
    if (saved) {
      try { setRisks(JSON.parse(saved)); } catch { setRisks([]); }
    } else {
      setRisks([]);
    }
  }, [activeProject, activeProjectId, reset]);

  const mutation = useMutation({
    mutationFn: aiAPI.riskPrediction,
    onSuccess: (data) => {
      const list = data.risks?.length ? data.risks : [];
      setRisks(list);
      if (activeProjectId && list.length) {
        localStorage.setItem(`risk-analysis-${activeProjectId}`, JSON.stringify(list));
      }
      toast.success('Risk analysis saved for this project');
    },
    onError: () => toast.error('Risk prediction failed'),
  });

  const severityColors = { low: 'border-success', medium: 'border-safety', high: 'border-danger', critical: 'border-danger' };

  return (
    <div>
      <PageHeader title="Risk Prediction" subtitle="AI risk analysis for your selected project" />
      <ProjectSelector className="mb-6" required />

      {!activeProjectId ? (
        <div className="card text-center py-12 text-concrete">Select a project to analyze risks</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <form onSubmit={handleSubmit((d) => mutation.mutate({
            ...d,
            projectId: activeProjectId,
            budget: Number(d.budget),
            currentProgress: Number(d.currentProgress),
            materialsSummary: {
              totalMaterialCost: materialSummary.total,
              overBudget: materialSummary.overBudget,
              topMaterials: materialSummary.topMaterials,
              placedItemCount: designSpecs?.placedItems?.length || 0,
              exteriorItems: (designSpecs?.placedItems || []).filter((i) => i.zone === 'exterior').map((i) => i.name),
              materials: designSpecs?.materials,
            },
          }))} className="card space-y-4">
            <p className="text-xs text-concrete">From project: <strong>{activeProject?.name}</strong></p>
            {materialSummary.rows.length > 0 && (
              <div className="rounded-lg bg-steel-50 p-2 text-xs text-steel">
                <strong>Materials in saved design:</strong> {materialSummary.rows.length} line items · est. {materialSummary.total.toLocaleString()} FRw
                {materialSummary.overBudget && <span className="text-danger ml-1">(over budget)</span>}
              </div>
            )}
            <div>
              <label className="label">Project Name</label>
              <input {...register('projectName')} className="input" readOnly />
            </div>
            <div>
              <label className="label">Project Type</label>
              <input {...register('projectType')} className="input bg-steel-50" readOnly />
            </div>
            <div>
              <label className="label">Timeline</label>
              <input {...register('timeline')} className="input bg-steel-50" readOnly />
            </div>
            <div>
              <label className="label">Budget (FRw)</label>
              <input {...register('budget')} type="number" className="input bg-steel-50" readOnly />
            </div>
            <div>
              <label className="label">Location</label>
              <input {...register('location')} className="input bg-steel-50" readOnly />
            </div>
            <div>
              <label className="label">Current Progress (%)</label>
              <input {...register('currentProgress')} type="number" className="input bg-steel-50" readOnly />
            </div>
            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
              <Sparkles className="h-4 w-4" /> {mutation.isPending ? 'Analyzing...' : 'Run Risk Analysis'}
            </button>
          </form>
          <div className="lg:col-span-2 space-y-4">
            {!risks.length && !mutation.isPending && (
              <div className="card text-center py-12 text-concrete">Run analysis to see AI-identified risks for this project</div>
            )}
            {risks.map((risk, idx) => (
              <div key={risk.id || idx} className={`card border-l-4 ${severityColors[risk.severity || risk.risk_level] || 'border-steel-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 mt-0.5 text-safety" />
                  <div>
                    <h4 className="font-semibold text-steel">{risk.title || risk.risk_type || risk.description}</h4>
                    <p className="text-sm text-concrete mt-1">{risk.impact || risk.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={risk.severity || risk.risk_level || 'medium'} />
                      {risk.probability != null && <span className="text-xs text-concrete">Probability: {risk.probability}%</span>}
                    </div>
                  </div>
                </div>
                {(risk.mitigation || risk.mitigation_plan) && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-success/5 p-3">
                    <Shield className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <p className="text-sm text-steel"><span className="font-medium">Mitigation:</span> {risk.mitigation || risk.mitigation_plan}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
