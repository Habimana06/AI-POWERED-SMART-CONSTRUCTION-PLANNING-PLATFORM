import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import { formatDate } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import ProjectSelector from '../../components/ProjectSelector';
import Modal from '../../components/Modal';

export default function ContractorAssignment() {
  const { activeProjectId } = useProject();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ contractorId: '', roleOnProject: 'General Contractor', startDate: '', endDate: '', notes: '' });
  const queryClient = useQueryClient();

  const { data: contractorsData } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => projectsAPI.getContractors(),
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', activeProjectId],
    queryFn: () => projectsAPI.getAssignments(activeProjectId),
    enabled: !!activeProjectId,
  });

  const assignMutation = useMutation({
    mutationFn: (data) => projectsAPI.assignContractor(activeProjectId, data),
    onSuccess: () => {
      toast.success('Contractor assigned');
      setModalOpen(false);
      setForm({ contractorId: '', roleOnProject: 'General Contractor', startDate: '', endDate: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['assignments', activeProjectId] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Assignment failed'),
  });

  const contractorList = contractorsData?.contractors || [];
  const assignmentList = assignments?.assignments || [];

  const columns = [
    { header: 'Contractor', accessor: 'contractorName' },
    { header: 'Specialty', accessor: 'specialty' },
    { header: 'Role', accessor: 'roleOnProject' },
    { header: 'Start', accessor: 'startDate', render: (row) => formatDate(row.startDate) },
    { header: 'End', accessor: 'endDate', render: (row) => formatDate(row.endDate) },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status || 'active'} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Contractor Assignment"
        subtitle="Assign contractors to your project"
        action={activeProjectId && (
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
            <UserPlus className="h-4 w-4" /> Assign Contractor
          </button>
        )}
      />
      <ProjectSelector className="mb-6" required />

      {!activeProjectId ? (
        <div className="card text-center py-12 text-concrete">Select a project to manage contractors</div>
      ) : (
        <DataTable columns={columns} data={assignmentList} loading={isLoading} emptyMessage="No contractors assigned yet — click Assign Contractor" />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Assign Contractor">
        <div className="space-y-3">
          <div>
            <label className="label">Contractor *</label>
            <select className="input" value={form.contractorId} onChange={(e) => setForm({ ...form, contractorId: e.target.value })}>
              <option value="">Select contractor...</option>
              {contractorList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} — {c.specialty} (★ {c.rating})
                </option>
              ))}
            </select>
            {!contractorList.length && <p className="text-xs text-concrete mt-1">No contractors in database. Run seed script.</p>}
          </div>
          <div>
            <label className="label">Role on Project</label>
            <input className="input" value={form.roleOnProject} onChange={(e) => setForm({ ...form, roleOnProject: e.target.value })} placeholder="Lead Contractor, MEP Specialist..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <button
            type="button"
            disabled={!form.contractorId || assignMutation.isPending}
            onClick={() => assignMutation.mutate(form)}
            className="btn-primary w-full"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
