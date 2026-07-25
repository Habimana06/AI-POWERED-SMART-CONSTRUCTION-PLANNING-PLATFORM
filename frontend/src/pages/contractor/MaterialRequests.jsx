import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Package, Plus, Eye, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, contractorAPI, aiAPI } from '../../services/api';
import { parseAiContractorComment } from '../../utils/contractorReportExport';
import { parseDesignSpecifications } from '../../utils/buildingAssets';
import { calculateMaterialQuantities } from '../../utils/materialCalculations';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import DashboardPage from '../../components/DashboardPage';

export default function MaterialRequests() {
  const [selectedProject, setSelectedProject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [materialPick, setMaterialPick] = useState('other');
  const [detailRow, setDetailRow] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['contractor-projects'],
    queryFn: () => contractorAPI.getProjects(),
  });

  const projectList = projects?.projects || (Array.isArray(projects) ? projects : []);
  const project = projectList.find((p) => String(p.id) === String(selectedProject));

  useEffect(() => {
    if (!selectedProject && projectList.length) {
      setSelectedProject(String(projectList[0].id));
    }
  }, [projectList, selectedProject]);

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', selectedProject],
    queryFn: () => projectsAPI.getMaterials(selectedProject),
    enabled: !!selectedProject,
  });

  const { data: designsData } = useQuery({
    queryKey: ['designs', selectedProject],
    queryFn: () => projectsAPI.getDesigns(selectedProject),
    enabled: !!selectedProject,
  });

  const catalog = useMemo(() => {
    const specs = parseDesignSpecifications(designsData?.designs?.[0]?.specifications);
    return calculateMaterialQuantities({
      width: specs?.width || 8,
      depth: specs?.depth || 6,
      floors: specs?.floors || project?.floors || 1,
      buildingType: project?.buildingType || project?.projectType,
      workerSalaryTotal: specs?.workerSalaryTotal || 0,
    });
  }, [designsData, project]);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      category: 'structural',
      quantity: 1,
      unit: 'unit',
      unitCost: 0,
      supplier: '',
      deliveryDate: '',
      notes: '',
      description: '',
    },
  });

  useEffect(() => {
    if (materialPick === 'other') return;
    const row = catalog.find((c) => c.id === materialPick);
    if (!row) return;
    setValue('name', row.material);
    setValue('unit', row.unit);
    setValue('unitCost', row.unitCost);
    setValue('category', row.category?.toLowerCase() || 'structural');
  }, [materialPick, catalog, setValue]);

  const qtyWatch = watch('quantity');
  const nameWatch = watch('name');
  const unitWatch = watch('unit');
  const notesWatch = watch('notes');

  const catalogRow = catalog.find((c) => c.id === materialPick) || catalog.find((c) => c.material === nameWatch);

  const { data: logsData } = useQuery({
    queryKey: ['daily-logs', selectedProject],
    queryFn: () => projectsAPI.getDailyLogs(selectedProject),
    enabled: !!selectedProject,
  });

  const usedQty = useMemo(() => {
    const logs = logsData?.dailyLogs || logsData?.logs || [];
    const target = nameWatch || catalogRow?.material;
    if (!target) return 0;
    let sum = 0;
    logs.forEach((log) => {
      let arr = log.materials_used || log.materialsUsed;
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch { arr = []; }
      }
      (arr || []).forEach((m) => {
        if ((m.name || m.material || '').toLowerCase() === target.toLowerCase()) {
          sum += Number(m.quantity) || 0;
        }
      });
    });
    return sum;
  }, [logsData, nameWatch, catalogRow]);

  useEffect(() => {
    if (!showForm || !nameWatch || !qtyWatch) {
      setAiReview(null);
      return;
    }
    const t = setTimeout(() => {
      aiAPI.reviewMaterialRequest({
        projectName: project?.name,
        materialName: nameWatch,
        quantity: Number(qtyWatch),
        unit: unitWatch,
        plannedQty: catalogRow?.quantity || 0,
        usedQty,
        contractorNotes: notesWatch,
      }).then((data) => setAiReview(data.review || data)).catch(() => setAiReview(null));
    }, 400);
    return () => clearTimeout(t);
  }, [showForm, nameWatch, qtyWatch, unitWatch, notesWatch, catalogRow, usedQty, project?.name]);

  const mutation = useMutation({
    mutationFn: (data) => projectsAPI.requestMaterial(selectedProject, {
      ...data,
      quantity: Number(data.quantity),
      unitCost: Number(data.unitCost),
      totalCost: Number(data.quantity) * Number(data.unitCost),
      plannedQty: catalogRow?.quantity || 0,
      usedQty,
      aiReview,
    }),
    onSuccess: () => {
      toast.success('Material request submitted — PM will review in monitoring');
      reset();
      setShowForm(false);
      setMaterialPick('other');
      queryClient.invalidateQueries({ queryKey: ['materials', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['contractor-dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit request'),
  });

  const materialList = materials?.materials || (Array.isArray(materials) ? materials : []);
  const approvedSum = materialList.filter((m) => m.status === 'approved').reduce((s, m) => s + (Number(m.total_cost ?? m.totalCost) || 0), 0);

  const columns = [
    { header: 'Material', accessor: 'name', sortable: true },
    { header: 'Category', accessor: 'category', render: (r) => r.category || '—' },
    { header: 'Quantity', accessor: 'quantity', render: (row) => `${row.quantity} ${row.unit || ''}` },
    { header: 'Total', accessor: 'totalCost', render: (row) => formatCurrency(row.totalCost ?? row.total_cost ?? (row.quantity * row.unitCost)) },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status || 'requested'} /> },
    {
      header: '',
      accessor: 'id',
      render: (row) => (
        <button type="button" className="text-primary p-1" onClick={() => setDetailRow(row)} title="Details">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <DashboardPage className="space-y-6">
      <PageHeader
        title="Material Requests"
        subtitle="Choose from the project bill of materials or request other items"
        action={selectedProject && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Request
          </button>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <label className="label">Project</label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="input" disabled={loadingProjects}>
            <option value="">Select project...</option>
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="card flex flex-col justify-center">
          <p className="text-xs text-concrete uppercase">Approved total (this project)</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(approvedSum)}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <h3 className="font-semibold text-steel">Request details</h3>
          <div>
            <label className="label">Material from plan</label>
            <select className="input" value={materialPick} onChange={(e) => setMaterialPick(e.target.value)}>
              <option value="other">Other — enter manually</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.material} ({c.quantity} {c.unit} planned)</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Material name *</label><input {...register('name', { required: true })} className="input" /></div>
            <div>
              <label className="label">Category</label>
              <select {...register('category')} className="input">
                <option value="structural">Structural</option>
                <option value="envelope">Envelope</option>
                <option value="finishes">Finishes</option>
                <option value="mep">MEP</option>
                <option value="labor">Labor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label className="label">Quantity *</label><input {...register('quantity', { required: true })} type="number" min={0.01} step="any" className="input" /></div>
            <div><label className="label">Unit *</label><input {...register('unit', { required: true })} className="input" /></div>
            <div><label className="label">Unit cost (FRw)</label><input {...register('unitCost')} type="number" min={0} className="input" /></div>
            <div><label className="label">Supplier</label><input {...register('supplier')} className="input" /></div>
            <div><label className="label">Needed by</label><input {...register('deliveryDate')} type="date" className="input" /></div>
          </div>
          <div><label className="label">Description / site notes</label><textarea {...register('description')} rows={2} className="input resize-none" /></div>
          <div><label className="label">Additional notes</label><textarea {...register('notes')} rows={2} className="input resize-none" /></div>
          <p className="text-xs text-concrete">
            Line total: {formatCurrency((Number(watch('quantity')) || 0) * (Number(watch('unitCost')) || 0))}
          </p>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            <Package className="h-4 w-4" /> Submit for PM approval
          </button>
          </div>

          <div className="card space-y-3">
            <h3 className="font-semibold text-steel flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI material check
            </h3>
            {catalogRow && (
              <dl className="text-sm grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-steel-50 p-2"><dt className="text-concrete text-xs">Planned</dt><dd className="font-medium">{catalogRow.quantity} {catalogRow.unit}</dd></div>
                <div className="rounded-lg bg-steel-50 p-2"><dt className="text-concrete text-xs">Used on site</dt><dd className="font-medium">{usedQty} {catalogRow.unit}</dd></div>
                <div className="rounded-lg bg-steel-50 p-2 col-span-2"><dt className="text-concrete text-xs">Remaining (calc.)</dt><dd className="font-medium">{Math.max(0, catalogRow.quantity - usedQty)} {catalogRow.unit}</dd></div>
              </dl>
            )}
            {aiReview ? (
              <div className={`rounded-xl p-3 text-sm ${aiReview.tooMuch ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`}>
                {aiReview.contractorMessage}
                {aiReview.tooMuch && aiReview.suggestedQty != null && (
                  <button type="button" className="block mt-2 text-primary font-semibold underline" onClick={() => setValue('quantity', aiReview.suggestedQty)}>
                    Use suggested qty: {aiReview.suggestedQty}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-concrete">Enter material and quantity — AI compares to plan and site usage.</p>
            )}
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={materialList}
        loading={isLoading}
        emptyMessage={selectedProject ? 'No material requests yet' : 'Select a project'}
      />

      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-steel-900/40" onClick={() => setDetailRow(null)}>
          <div className="card max-w-lg w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-steel">{detailRow.name}</h3>
            <StatusBadge status={detailRow.status} />
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-concrete">Quantity</dt><dd>{detailRow.quantity} {detailRow.unit}</dd></div>
              <div className="flex justify-between"><dt className="text-concrete">Unit cost</dt><dd>{formatCurrency(detailRow.unitCost ?? detailRow.unit_cost)}</dd></div>
              <div className="flex justify-between"><dt className="text-concrete">Total</dt><dd>{formatCurrency(detailRow.totalCost ?? detailRow.total_cost)}</dd></div>
              <div className="flex justify-between"><dt className="text-concrete">Delivery</dt><dd>{formatDate(detailRow.deliveryDate || detailRow.delivery_date)}</dd></div>
            </dl>
            {(detailRow.notes || detailRow.description) && (
              <p className="text-sm text-concrete border-t pt-2">{parseAiContractorComment(detailRow.notes) || detailRow.description || detailRow.notes}</p>
            )}
            <button type="button" className="btn-outline w-full" onClick={() => setDetailRow(null)}>Close</button>
          </div>
        </div>
      )}
    </DashboardPage>
  );
}
