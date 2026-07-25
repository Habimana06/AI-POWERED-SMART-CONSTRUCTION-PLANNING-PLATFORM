import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Pencil, Ban, CheckCircle, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersAPI } from '../../services/api';
import { ROLE_LABELS } from '../../utils/constants';
import { formatDateTime, getFullName } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import Modal from '../../components/Modal';
import AdminPage from '../../components/AdminPage';
import AuditLogLink from '../../components/AuditLogLink';

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      firstName: '', lastName: '', email: '', password: '', phone: '', role: 'project_manager',
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersAPI.getAll({ page, limit: 20 }),
  });

  const openCreate = () => {
    setEditUser(null);
    reset({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'project_manager' });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditUser(row);
    reset({
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      email: row.email || '',
      password: '',
      phone: row.phone || '',
      role: row.role || 'project_manager',
    });
    setModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => {
      toast.success('User created');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      toast.success('User updated');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const toggleBlockMutation = useMutation({
    mutationFn: ({ id, isActive }) => usersAPI.update(id, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'User unblocked' : 'User blocked');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const toggleVerifyMutation = useMutation({
    mutationFn: ({ id, isVerified }) => usersAPI.update(id, { isVerified }),
    onSuccess: (_, vars) => {
      toast.success(vars.isVerified ? 'User verified — blue badge enabled' : 'Verification removed');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const onSubmit = (d) => {
    if (editUser) {
      const payload = {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone,
        role: d.role,
      };
      if (d.password?.length >= 8) payload.password = d.password;
      updateMutation.mutate({ id: editUser.id, data: payload });
    } else {
      createMutation.mutate(d);
    }
  };

  const users = data?.users || [];
  const pagination = data?.pagination;

  const columns = [
    { header: 'Name', accessor: 'firstName', sortable: true, render: (row) => getFullName(row) },
    { header: 'Email', accessor: 'email', sortable: true },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <span className="text-xs font-medium text-steel">{ROLE_LABELS[row.role] || row.role}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.isActive ? 'approved' : 'rejected'} />
          {row.isVerified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 font-semibold">
              <BadgeCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
      ),
    },
    { header: 'Last Login', accessor: 'lastLogin', render: (row) => formatDateTime(row.lastLogin) || '—' },
    {
      header: 'Actions',
      render: (row) => (
        row.role !== 'admin' && (
          <div className="flex flex-wrap gap-1 items-center">
            <button type="button" onClick={() => openEdit(row)} className="text-primary p-1" title="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toggleVerifyMutation.mutate({ id: row.id, isVerified: !row.isVerified })}
              className="text-blue-600 p-1"
              title={row.isVerified ? 'Remove verification' : 'Verify user'}
            >
              <BadgeCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toggleBlockMutation.mutate({ id: row.id, isActive: !row.isActive })}
              className={row.isActive ? 'text-safety p-1' : 'text-success p-1'}
              title={row.isActive ? 'Block user' : 'Unblock user'}
            >
              {row.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            </button>
            <AuditLogLink userId={row.id} title={`Audit log — ${getFullName(row)}`} />
            <button
              type="button"
              onClick={() => deleteMutation.mutate(row.id)}
              className="text-danger hover:text-red-600 p-1"
              title="Delete user"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      ),
    },
  ];

  return (
    <AdminPage>
      <PageHeader
        title="User Management"
        subtitle="Edit, block/unblock, delete, and open per-user audit trail"
        action={(
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> Add User
          </button>
        )}
      />
      <DataTable columns={columns} data={users} loading={isLoading} pagination={pagination} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Add User'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">First Name</label><input {...register('firstName', { required: true })} className="input" /></div>
            <div><label className="label">Last Name</label><input {...register('lastName', { required: true })} className="input" /></div>
          </div>
          <div><label className="label">Email</label><input {...register('email', { required: true })} type="email" className="input" /></div>
          <div>
            <label className="label">{editUser ? 'New password (optional)' : 'Password'}</label>
            <input {...register('password', { required: !editUser, minLength: editUser ? 0 : 8 })} type="password" className="input" />
          </div>
          <div><label className="label">Phone</label><input {...register('phone')} className="input" /></div>
          <div>
            <label className="label">Role</label>
            <select {...register('role')} className="input">
              <option value="project_manager">Project Manager</option>
              <option value="contractor">Contractor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary w-full">
            {editUser ? 'Save changes' : 'Create User'}
          </button>
        </form>
      </Modal>
    </AdminPage>
  );
}
