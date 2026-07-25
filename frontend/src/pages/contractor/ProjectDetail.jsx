import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Calendar, DollarSign, ClipboardList, Package, AlertCircle, Download, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../services/api';
import { parseDesignSpecifications } from '../../utils/buildingAssets';
import { getLockedProjectFields } from '../../utils/projectMetadata';
import { buildCostSummary, exportCostEstimationPdf, exportReportPdf } from '../../utils/designDocumentExport';
import { formatCurrency, formatDate, formatPercent } from '../../utils/helpers';
import PageHeader, { StatusBadge, ProgressBar } from '../../components/PageHeader';
import DashboardPage from '../../components/DashboardPage';
import ProjectDesignOutputs from '../../components/ProjectDesignOutputs';

export default function ContractorProjectDetail() {
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['contractor-project', id],
    queryFn: () => projectsAPI.getById(id),
    enabled: !!id,
  });

  const { data: designsData } = useQuery({
    queryKey: ['designs', id],
    queryFn: () => projectsAPI.getDesigns(id),
    enabled: !!id,
  });

  const { data: issuesData } = useQuery({
    queryKey: ['issues', id],
    queryFn: () => projectsAPI.getIssues(id),
    enabled: !!id,
  });

  const project = data?.project || data;
  const tasks = data?.tasks || [];
  const materials = data?.materials || [];
  const issues = issuesData?.issues || issuesData || [];
  const specs = parseDesignSpecifications(designsData?.designs?.[0]?.specifications);
  const locked = getLockedProjectFields(project);
  const design = designsData?.designs?.[0];

  const downloadMaterialsPdf = () => {
    const { rows, summary } = buildCostSummary({
      width: specs?.width || 8,
      depth: specs?.depth || 6,
      floors: specs?.floors || project?.floors || 1,
      areaSqft: project?.totalAreaSqft,
      placedItems: specs?.placedItems || [],
      buildingType: project?.buildingType || project?.projectType,
      budget: project?.budget,
    });
    exportCostEstimationPdf({
      projectName: project.name,
      lockedFields: locked,
      costRows: rows,
      costSummary: summary,
      budget: project?.budget,
    });
    toast.success('Materials & cost PDF downloaded');
  };

  const downloadProjectReport = () => {
    const { rows, summary } = buildCostSummary({
      width: specs?.width || 8,
      depth: specs?.depth || 6,
      floors: specs?.floors || project?.floors || 1,
      areaSqft: project?.totalAreaSqft,
      placedItems: specs?.placedItems || [],
      buildingType: project?.buildingType || project?.projectType,
      budget: project?.budget,
    });
    exportReportPdf({
      title: `${project.name} — Contractor report`,
      projectName: project.name,
      reportType: 'assignment',
      createdAt: new Date().toISOString(),
      summary: `Progress ${project.progressPercentage || 0}% · Tasks ${tasks.length} · Materials ${materials.length}`,
      content: `Schedule tasks:\n${tasks.map((t) => `- ${t.title} (${t.status})`).join('\n') || 'None'}\n\nMaterial lines:\n${rows.slice(0, 12).map((r) => `- ${r.material}: ${r.quantity} ${r.unit}`).join('\n')}`,
    });
    toast.success('Project report PDF downloaded');
  };

  if (isLoading) {
    return <PageHeader title="Project Details" subtitle="Loading..." />;
  }

  if (isError) {
    return (
      <div className="card text-center py-16 w-full">
        <p className="text-steel font-medium">Could not load project</p>
        <p className="text-sm text-concrete mt-2">{error?.response?.data?.message || 'Not found or not assigned to you'}</p>
        <Link to="/contractor/projects" className="btn-primary mt-4 inline-flex">Back to projects</Link>
      </div>
    );
  }

  if (!project?.id && !project?.name) {
    return (
      <div className="card text-center py-16 max-w-lg mx-auto">
        <p className="text-steel">Project not found</p>
        <Link to="/contractor/projects" className="btn-primary mt-4 inline-flex">Back to projects</Link>
      </div>
    );
  }

  return (
    <DashboardPage className="space-y-6">
      <Link to="/contractor/projects" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      <PageHeader title={project.name} subtitle={project.projectCode || project.location} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card"><p className="text-xs uppercase text-concrete mb-1">Status</p><StatusBadge status={project.status} /></div>
          <div className="card flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div><p className="text-xs text-concrete">Location</p><p className="text-sm font-medium text-steel">{project.location || '—'}</p></div>
          </div>
          <div className="card flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0" />
            <div><p className="text-xs text-concrete">Budget</p><p className="text-sm font-medium text-steel">{formatCurrency(project.budget)}</p></div>
          </div>
          <div className="card flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div><p className="text-xs text-concrete">Timeline</p><p className="text-sm font-medium text-steel">{formatDate(project.startDate || project.start_date)} – {formatDate(project.endDate || project.end_date)}</p></div>
          </div>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-steel">Overall Progress</span>
            <span className="text-sm text-primary font-bold">{formatPercent(project.progressPercentage || project.progress_percentage || 0)}</span>
          </div>
          <ProgressBar value={project.progressPercentage || project.progress_percentage || 0} />
          <h3 className="font-semibold text-steel flex items-center gap-2 pt-2">
            <FileImage className="h-4 w-4 text-primary" /> Documents
          </h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline !py-1.5 text-sm inline-flex items-center gap-2" onClick={downloadMaterialsPdf}>
              <Download className="h-4 w-4" /> Materials PDF
            </button>
            <button type="button" className="btn-outline !py-1.5 text-sm inline-flex items-center gap-2" onClick={downloadProjectReport}>
              <Download className="h-4 w-4" /> Project report
            </button>
          </div>
          {design ? (
            <p className="text-xs text-concrete">{design.name} · {specs?.floors || '—'} floors</p>
          ) : (
            <p className="text-xs text-amber-700">No saved plan yet</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-steel mb-4">Floor plan & full house</h3>
        <ProjectDesignOutputs project={project} design={design} readOnly showDownloads />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Schedule tasks ({tasks.length})
          </h3>
          {tasks.length ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-steel-100 px-3 py-2">
                  <div>
                    <span className="text-sm text-steel">{t.title}</span>
                    <p className="text-xs text-concrete">{formatDate(t.start_date || t.startDate)} – {formatDate(t.end_date || t.endDate)}</p>
                  </div>
                  <StatusBadge status={t.status || 'pending'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-concrete">No tasks yet</p>
          )}
          <Link to="/contractor/tasks" className="text-sm text-primary mt-4 inline-block hover:underline">My Tasks →</Link>
        </div>

        <div className="space-y-4">
          <Link to="/contractor/work-materials" className="card block hover:border-primary/40 transition-colors">
            <p className="text-sm font-medium text-steel">Work & materials →</p>
          </Link>
          <Link to="/contractor/materials" className="card block hover:border-primary/40 transition-colors">
            <p className="text-sm font-medium text-steel flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Requests ({materials.length})
            </p>
          </Link>
          <Link to="/contractor/issues" className="card block hover:border-primary/40 transition-colors">
            <p className="text-sm font-medium text-steel flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" /> Issues ({issues.length})
            </p>
          </Link>
        </div>
      </div>

      {project.description && (
        <div className="card lg:max-w-2xl">
          <h3 className="font-semibold text-steel mb-2">Description</h3>
          <p className="text-sm text-concrete">{project.description}</p>
        </div>
      )}
    </DashboardPage>
  );
}
