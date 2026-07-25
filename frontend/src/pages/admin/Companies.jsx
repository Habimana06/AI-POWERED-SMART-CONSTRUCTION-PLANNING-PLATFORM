import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Check, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { companiesAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import Modal from '../../components/Modal';

export default function AdminCompanies() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: '', email: '', city: '', registrationNumber: '', phone: '' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page],
    queryFn: () => companiesAPI.getAll({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: companiesAPI.create,
    onSuccess: () => {
      toast.success('Company created');
      setModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create company'),
  });

  const approveMutation = useMutation({
    mutationFn: companiesAPI.approve,
    onSuccess: () => { toast.success('Company approved'); queryClient.invalidateQueries({ queryKey: ['companies'] }); },
  });

  const suspendMutation = useMutation({
    mutationFn: companiesAPI.suspend,
    onSuccess: () => { toast.success('Company suspended'); queryClient.invalidateQueries({ queryKey: ['companies'] }); },
  });

  const companies = data?.companies || [];
  const pagination = data?.pagination;

  const columns = [
    { header: 'Company', accessor: 'name', sortable: true },
    { header: 'Registration', accessor: 'registrationNumber', render: (r) => r.registrationNumber || '—' },
    { header: 'City', accessor: 'city', render: (r) => r.city || '—' },
    { header: 'Email', accessor: 'email', render: (r) => r.email || '—' },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status || 'pending'} /> },
    { header: 'Created', accessor: 'createdAt', render: (row) => formatDate(row.createdAt) },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.status !== 'active' && (
            <button type="button" onClick={() => approveMutation.mutate(row.id)} className="text-success p-1" title="Approve">
              <Check className="h-4 w-4" />
            </button>
          )}
          {row.status !== 'suspended' && (
            <button type="button" onClick={() => suspendMutation.mutate(row.id)} className="text-danger p-1" title="Suspend">
              <Ban className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Registered construction companies — live from database"
        action={(
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Company
          </button>
        )}
      />
      <DataTable columns={columns} data={companies} loading={isLoading} pagination={pagination} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Company" size="md">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div><label className="label">Company Name</label><input {...register('name', { required: true })} className="input" /></div>
          <div><label className="label">Registration Number</label><input {...register('registrationNumber')} className="input" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Email</label><input {...register('email')} type="email" className="input" /></div>
            <div><label className="label">Phone</label><input {...register('phone')} className="input" /></div>
          </div>
          <div><label className="label">City</label><input {...register('city')} className="input" /></div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full">
            {createMutation.isPending ? 'Saving...' : 'Create Company'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
