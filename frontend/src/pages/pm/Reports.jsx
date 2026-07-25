import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../services/api';
import { formatDateTime } from '../../utils/helpers';
import { exportReportPdf } from '../../utils/designDocumentExport';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge } from '../../components/PageHeader';

export default function PMReports() {
  const [selectedProject, setSelectedProject] = useState('');
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => projectsAPI.getAll() });
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

  const handleDownload = (row) => {
    exportReportPdf({
      title: row.title,
      projectName: row.project_name || selectedProjectName,
      reportType: row.report_type || row.reportType,
      createdAt: row.created_at || row.createdAt,
      summary: row.summary,
      content: row.content,
    });
    toast.success('Report PDF downloaded');
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
        subtitle="Generate and view project reports"
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

      <div className="mb-6">
        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="input max-w-xs">
          <option value="">Select project...</option>
          {projectList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={reportList} loading={isLoading} emptyMessage="No reports generated — select a project and click Generate Report" />
    </div>
  );
}
