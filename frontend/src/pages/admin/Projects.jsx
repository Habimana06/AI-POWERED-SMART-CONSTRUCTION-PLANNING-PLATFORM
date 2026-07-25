import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge, ProgressBar } from '../../components/PageHeader';
import AdminPage from '../../components/AdminPage';

export default function AdminProjects() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-projects', page],
    queryFn: () => adminAPI.getProjects({ page, limit: 20 }),
  });

  const archiveMutation = useMutation({
    mutationFn: adminAPI.archiveProject,
    onSuccess: () => {
      toast.success('Project archived');
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
    },
  });

  const projects = data?.projects || [];
  const pagination = data?.pagination;

  const columns = [
    {
      header: 'Project',
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <Link to={`/admin/projects/${row.id}`} className="font-medium text-primary hover:underline">
          {row.name}
        </Link>
      ),
    },
    { header: 'Code', accessor: 'projectCode' },
    { header: 'PM', accessor: 'createdByName', render: (r) => r.createdByName || r.created_by_name || '—' },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Budget', accessor: 'budget', render: (row) => formatCurrency(row.budget) },
    {
      header: 'Progress',
      accessor: 'progressPercentage',
      render: (row) => <ProgressBar value={row.progressPercentage || 0} showLabel={false} size="sm" />,
    },
    { header: 'Dates', render: (row) => `${formatDate(row.startDate)} - ${formatDate(row.endDate)}` },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Link to={`/admin/projects/${row.id}`} className="text-primary" title="View details">
            <Eye className="h-4 w-4" />
          </Link>
          {row.status !== 'archived' && (
            <button type="button" onClick={() => archiveMutation.mutate(row.id)} className="text-concrete" title="Archive">
              <Archive className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminPage>
      <PageHeader
        title="All Projects"
        subtitle="Manage and oversee platform projects"
      />
      <DataTable columns={columns} data={projects} loading={isLoading} pagination={pagination} onPageChange={setPage} />
    </AdminPage>
  );
}
