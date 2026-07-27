import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Presentation } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../services/api';
import { formatDateTime } from '../../utils/helpers';
import {
  exportRoleReportPdf,
  exportProjectBundlePdf,
  exportProjectBundlePpt,
} from '../../utils/designDocumentExport';
import { buildProjectExportContext } from '../../utils/projectReportBundle';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import PresentationDownloadBar from '../../components/PresentationDownloadBar';

export default function PMReports() {
  const [selectedProject, setSelectedProject] = useState('');
  const [bundleLoading, setBundleLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => projectsAPI.getAll() });
  const { data: projectDetail } = useQuery({
    queryKey: ['project', selectedProject],
    queryFn: () => projectsAPI.getById(selectedProject),
    enabled: !!selectedProject,
  });
  const { data: designsData } = useQuery({
    queryKey: ['designs', selectedProject],
    queryFn: () => projectsAPI.getDesigns(selectedProject),
    enabled: !!selectedProject,
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ['project-reports', selectedProject],
    queryFn: () => projectsAPI.getReports(selectedProject),
    enabled: !!selectedProject,
  });

  const generateMutation = useMutation({
    mutationFn: () => projectsAPI.generateReport(selectedProject, {
      title: `Project Summary — ${new Date().toLocaleDateString()}`,
      reportType: 'summary',
      summary: 'Auto-generated project summary report from BuildPlan AI.',
      content: { generatedAt: new Date().toISOString(), projectId: selectedProject },
      status: 'published',
    }),
    onSuccess: () => {
      toast.success('Report generated');
      queryClient.invalidateQueries({ queryKey: ['project-reports', selectedProject] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate report'),
  });

  const projectList = projects?.projects || [];
  const reportList = reports?.reports || reports || [];
  const selectedProjectName = projectList.find((p) => String(p.id) === String(selectedProject))?.name;
  const activeProject = projectDetail?.project || projectDetail || projectList.find((p) => String(p.id) === String(selectedProject));
  const latestDesign = designsData?.designs?.[0];

  const handleDownload = (row) => {
    const ctx = activeProject && latestDesign
      ? buildProjectExportContext(activeProject, latestDesign)
      : null;
    exportRoleReportPdf({
      role: 'pm',
      title: row.title,
      projectName: row.project_name || selectedProjectName,
      reportType: row.report_type || row.reportType,
      createdAt: row.created_at || row.createdAt,
      summary: row.summary,
      content: row.content,
      projectMeta: ctx ? {
        location: ctx.location,
        budget: ctx.budget,
        status: ctx.status,
        progress: ctx.progress,
        startDate: ctx.startDate,
        endDate: ctx.endDate,
        width: ctx.width,
        depth: ctx.depth,
        floors: ctx.floors,
        roomCount: ctx.roomCount,
        buildingStyle: ctx.buildingStyle,
        lockedFields: ctx.lockedFields,
      } : {},
    });
    toast.success('Report PDF downloaded');
  };

  const runBundleExport = async (kind) => {
    if (!activeProject) {
      toast.error('Select a project first');
      return;
    }
    setBundleLoading(true);
    try {
      const ctx = buildProjectExportContext(activeProject, latestDesign);
      if (kind === 'pdf') {
        await exportProjectBundlePdf(ctx, 'pm');
      } else {
        await exportProjectBundlePpt(ctx, 'pm');
      }
    } catch (e) {
      toast.error(e?.message || 'Export failed');
    } finally {
      setBundleLoading(false);
    }
  };

  const columns = [
    { header: 'Title', accessor: 'title', sortable: true },
    {
      header: 'Type',
      accessor: 'reportType',
      render: (row) => <StatusBadge status={row.report_type || row.reportType || 'in_progress'} />,
    },
    {
      header: 'Generated',
      accessor: 'createdAt',
      render: (row) => formatDateTime(row.created_at || row.createdAt),
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleDownload(row)}
          className="text-primary hover:text-primary/80 p-1"
          title="Download PDF"
        >
          <Download className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Role-specific PDFs with project design, costs, and presentation decks"
        action={
          <button
            type="button"
            className="btn-primary"
            disabled={!selectedProject || generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            <Plus className="h-4 w-4" />
            {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="input max-w-xs">
          <option value="">Select project...</option>
          {projectList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedProject && (
        <div className="mb-6">
          <PresentationDownloadBar
            pdfLabel={bundleLoading ? 'Preparing PDF…' : 'Full project dossier (PDF)'}
            pptLabel={bundleLoading ? 'Preparing PPT…' : 'Client presentation (PPT)'}
            onExportPdf={() => runBundleExport('pdf')}
            onExportPpt={() => runBundleExport('ppt')}
          />
          {!latestDesign && (
            <p className="text-xs text-concrete mt-2 flex items-center gap-1">
              <Presentation className="h-3.5 w-3.5" />
              Save a design in Building Editor to include full-house imagery in exports. Overview and costs still export from project data.
            </p>
          )}
        </div>
      )}

      <DataTable columns={columns} data={reportList} loading={isLoading} emptyMessage="No reports generated — select a project and click Generate Report" />
    </div>
  );
}
