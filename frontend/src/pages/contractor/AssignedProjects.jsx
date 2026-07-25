import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { contractorAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge, ProgressBar } from '../../components/PageHeader';
import DashboardPage from '../../components/DashboardPage';

export default function AssignedProjects() {
  const { data, isLoading } = useQuery({
    queryKey: ['contractor-projects'],
    queryFn: () => contractorAPI.getProjects(),
  });

  const projects = data?.projects || (Array.isArray(data) ? data : []);

  const columns = [
    {
      header: 'Project',
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <Link to={`/contractor/projects/${row.id}`} className="font-medium text-primary hover:underline">
          {row.name}
        </Link>
      ),
    },
    { header: 'Code', accessor: 'projectCode', render: (r) => r.projectCode || '—' },
    { header: 'Location', accessor: 'location', render: (r) => r.location || '—' },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Progress', accessor: 'progressPercentage', render: (row) => <ProgressBar value={row.progressPercentage || 0} showLabel={false} size="sm" /> },
    { header: 'Budget', accessor: 'budget', render: (row) => formatCurrency(row.budget) },
    { header: 'End Date', accessor: 'endDate', render: (row) => formatDate(row.endDate) },
    {
      header: '',
      render: (row) => (
        <Link to={`/contractor/projects/${row.id}`} className="text-primary p-1" title="View details">
          <Eye className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <DashboardPage>
      <PageHeader title="Assigned Projects" subtitle={`${projects.length} projects — open any row for documents and tasks`} />
      <DataTable columns={columns} data={projects} loading={isLoading} emptyMessage="No projects assigned yet" />
    </DashboardPage>
  );
}
