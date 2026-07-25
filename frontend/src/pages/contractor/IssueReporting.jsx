import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlertCircle, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, contractorAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import DashboardPage from '../../components/DashboardPage';

function needsPhoto(issueType, description) {
  const t = String(issueType || '').toLowerCase();
  if (['damage', 'safety', 'weather'].includes(t)) return true;
  return /disaster|collapse|injury|hazard|photo required/i.test(description || '');
}

export default function IssueReporting() {
  const [selectedProject, setSelectedProject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const queryClient = useQueryClient();

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['contractor-projects'],
    queryFn: () => contractorAPI.getProjects(),
  });

  const projectList = projects?.projects || (Array.isArray(projects) ? projects : []);

  useEffect(() => {
    if (!selectedProject && projectList.length) {
      setSelectedProject(String(projectList[0].id));
    }
  }, [projectList, selectedProject]);

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', selectedProject],
    queryFn: () => projectsAPI.getIssues(selectedProject),
    enabled: !!selectedProject,
  });

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: { title: '', description: '', issueType: 'damage', severity: 'medium', location: '' },
  });

  const issueType = watch('issueType');
  const description = watch('description');
  const photoRequired = needsPhoto(issueType, description);

  const mutation = useMutation({
    mutationFn: (data) => projectsAPI.reportIssue(selectedProject, data),
    onSuccess: () => {
      toast.success('Issue reported — visible in PM monitoring');
      reset();
      setPhotoPreview('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['issues', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['contractor-dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to report issue'),
  });

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const onSubmit = (d) => {
    if (needsPhoto(d.issueType, d.description) && !photoPreview) {
      toast.error('Upload a site photo for this issue type');
      return;
    }
    mutation.mutate({
      projectId: selectedProject,
      ...d,
      photoDataUri: photoPreview || undefined,
    });
  };

  const issueList = issues?.issues || (Array.isArray(issues) ? issues : []);

  const columns = [
    { header: 'Title', accessor: 'title', sortable: true },
    { header: 'Type', accessor: 'issueType', render: (r) => (r.issueType || r.issue_type || '—').replace(/_/g, ' ') },
    { header: 'Severity', accessor: 'severity', render: (row) => <StatusBadge status={row.severity} /> },
    { header: 'Location', accessor: 'location', render: (r) => r.location || '—' },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status || 'open'} /> },
    { header: 'Reported', accessor: 'createdAt', render: (row) => formatDate(row.createdAt || row.created_at) },
  ];

  return (
    <DashboardPage className="space-y-6">
      <PageHeader
        title="Issue Reporting"
        subtitle="Structured reports with validation — damage and safety issues require photos"
        action={selectedProject && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus className="h-4 w-4" /> Report Issue
          </button>
        )}
      />

      <div className="card max-w-md">
        <label className="label">Project</label>
        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="input" disabled={loadingProjects}>
          <option value="">Select project...</option>
          {projectList.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <h3 className="font-semibold text-steel flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Site issue form
          </h3>
          <div><label className="label">Title *</label><input {...register('title', { required: true })} className="input" /></div>
          <div><label className="label">Description *</label><textarea {...register('description', { required: true })} rows={3} className="input resize-none" placeholder="What happened, impact on work, immediate actions..." /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Issue type</label>
              <select {...register('issueType')} className="input">
                <option value="damage">Damage / disaster</option>
                <option value="safety">Safety hazard</option>
                <option value="weather">Weather delay</option>
                <option value="supply_chain">Supply chain</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            <div>
              <label className="label">Severity</label>
              <select {...register('severity')} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div><label className="label">Location on site</label><input {...register('location')} className="input" placeholder="Floor 2, east wing" /></div>
          <div>
            <label className="label">{photoRequired ? 'Site photo * (required for this type)' : 'Site photo (recommended)'}</label>
            <input type="file" accept="image/*" className="input text-sm" onChange={onPhoto} />
            {photoPreview && <img src={photoPreview} alt="" className="mt-2 max-h-40 rounded-lg border border-steel-100" />}
          </div>
          {photoRequired && !photoPreview && (
            <p className="text-xs text-amber-700">AI validation: upload an image showing the damage or hazard before submitting.</p>
          )}
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            <AlertCircle className="h-4 w-4" /> Submit to PM monitoring
          </button>
        </form>
      )}

      <DataTable
        columns={columns}
        data={issueList}
        loading={isLoading}
        emptyMessage={selectedProject ? 'No issues reported' : 'Select a project'}
      />
    </DashboardPage>
  );
}
