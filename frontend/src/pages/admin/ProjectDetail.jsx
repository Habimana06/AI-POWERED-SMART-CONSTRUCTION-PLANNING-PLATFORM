import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Calendar, DollarSign, Archive, Trash2,
  ClipboardList, Package, AlertCircle, HardHat, ScrollText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, projectsAPI } from '../../services/api';
import { formatCurrency, formatDate, formatPercent } from '../../utils/helpers';
import AdminPage from '../../components/AdminPage';
import PageHeader, { StatusBadge, ProgressBar } from '../../components/PageHeader';
import ProjectDesignOutputs from '../../components/ProjectDesignOutputs';
import DataTable from '../../components/DataTable';
import ChartCard from '../../components/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#E67E22', '#2C3E50', '#27AE60', '#3498DB'];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'design', label: 'Floor plan & house' },
  { id: 'charts', label: 'Charts' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'team', label: 'Team' },
  { id: 'materials', label: 'Materials' },
  { id: 'issues', label: 'Issues' },
  { id: 'logs', label: 'Daily Logs' },
];

export default function AdminProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-project', id],
    queryFn: () => projectsAPI.getById(id),
    enabled: !!id,
  });

  const { data: issuesData } = useQuery({
    queryKey: ['admin-issues', id],
    queryFn: () => projectsAPI.getIssues(id),
    enabled: !!id,
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin-daily-logs', id],
    queryFn: () => projectsAPI.getDailyLogs(id),
    enabled: !!id && tab === 'logs',
  });

  const { data: designsData } = useQuery({
    queryKey: ['admin-designs', id],
    queryFn: () => projectsAPI.getDesigns(id),
    enabled: !!id,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['admin-project-insights', id],
    queryFn: () => adminAPI.getProjectInsights(id),
    enabled: !!id,
  });

  const archiveMutation = useMutation({
    mutationFn: () => adminAPI.archiveProject(id),
    onSuccess: () => {
      toast.success('Project archived');
      queryClient.invalidateQueries({ queryKey: ['admin-project', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminAPI.deleteProject(id),
    onSuccess: () => {
      toast.success('Project deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      navigate('/admin/projects');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete project'),
  });

  const project = data?.project || data;
  const tasks = data?.tasks || [];
  const assignments = data?.assignments || [];
  const materials = data?.materials || [];
  const issues = issuesData?.issues || [];
  const dailyLogs = logsData?.dailyLogs || [];
  const design = designsData?.designs?.[0];
  const scheduleChart = insightsData?.scheduleChart || [];
  const materialChart = insightsData?.materialChart || [];
  const incomeChart = insightsData?.incomeChart || [];

  if (isLoading) {
    return <PageHeader title="Project Details" subtitle="Loading..." />;
  }

  if (!id) {
    return (
      <AdminPage>
        <div className="card text-center py-16">
          <p className="text-steel">Invalid project link</p>
          <Link to="/admin/projects" className="btn-primary mt-4 inline-flex">Back to projects</Link>
        </div>
      </AdminPage>
    );
  }

  if (isError) {
    return (
      <AdminPage>
        <div className="card text-center py-16">
          <p className="text-steel">{error?.response?.data?.message || 'Could not load project'}</p>
          <Link to="/admin/projects" className="btn-primary mt-4 inline-flex">Back to projects</Link>
        </div>
      </AdminPage>
    );
  }

  if (!project?.id && !project?.name) {
    return (
      <div className="card text-center py-16">
        <p className="text-steel">Project not found</p>
        <Link to="/admin/projects" className="btn-primary mt-4 inline-flex">Back to projects</Link>
      </div>
    );
  }

  const issueColumns = [
    { header: 'Title', accessor: 'title' },
    { header: 'Type', accessor: 'issue_type', render: (r) => (r.issue_type || r.issueType || '—').replace(/_/g, ' ') },
    { header: 'Severity', accessor: 'severity', render: (r) => <StatusBadge status={r.severity} /> },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'Reported', accessor: 'created_at', render: (r) => formatDate(r.created_at || r.createdAt) },
  ];

  const materialColumns = [
    { header: 'Material', accessor: 'name' },
    { header: 'Qty', accessor: 'quantity', render: (r) => `${r.quantity} ${r.unit || ''}` },
    { header: 'Cost', accessor: 'unit_cost', render: (r) => formatCurrency(r.unit_cost ?? r.unitCost) },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <AdminPage>
      <Link to="/admin/projects" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to all projects
      </Link>

      <PageHeader
        title={project.name}
        subtitle={project.projectCode || project.location}
        action={
          <div className="flex flex-wrap gap-2">
            {project.status !== 'archived' && (
              <button onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending} className="btn-secondary">
                <Archive className="h-4 w-4" /> Archive
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${project.name}" permanently? This cannot be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        }
      />

      <p className="text-sm text-concrete -mt-4">Read-only view — same depth as PM monitoring, without editing.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2">
          <h3 className="font-semibold text-steel text-sm">Project manager</h3>
          <p className="text-steel font-medium">{project.pmFullName || '—'}</p>
          <p className="text-sm text-concrete">{project.pmEmail || '—'}</p>
          <p className="text-sm text-concrete">{project.pmPhone || '—'}</p>
        </div>
        <div className="card space-y-2">
          <h3 className="font-semibold text-steel text-sm">Assigned contractors</h3>
          {assignments.length ? assignments.map((a) => (
            <div key={a.id} className="text-sm border-b border-steel-50 pb-2 last:border-0">
              <p className="font-medium text-steel">{a.first_name} {a.last_name}</p>
              <p className="text-concrete">{a.email} · {a.phone || 'no phone'}</p>
              <p className="text-xs text-concrete">{a.specialty || 'General'}</p>
            </div>
          )) : <p className="text-sm text-concrete">None assigned yet</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div><p className="text-xs text-concrete">Timeline</p><p className="text-sm font-medium text-steel">{formatDate(project.startDate)} – {formatDate(project.endDate)}</p></div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-steel">Progress</span>
          <span className="text-sm font-bold text-primary">{formatPercent(project.progressPercentage || 0)}</span>
        </div>
        <ProgressBar value={project.progressPercentage || 0} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-steel-100 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
              tab === t.id ? 'bg-primary text-white' : 'text-concrete hover:text-steel hover:bg-steel-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold text-steel mb-3">Description</h3>
              <p className="text-sm text-concrete">{project.description || 'No description provided.'}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-steel mb-3">Quick stats</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-concrete">Tasks</dt><dd className="font-bold text-steel">{tasks.length}</dd></div>
                <div><dt className="text-concrete">Contractors</dt><dd className="font-bold text-steel">{assignments.length}</dd></div>
                <div><dt className="text-concrete">Materials</dt><dd className="font-bold text-steel">{materials.length}</dd></div>
                <div><dt className="text-concrete">Open issues</dt><dd className="font-bold text-steel">{issues.filter((i) => i.status === 'open').length}</dd></div>
              </dl>
            </div>
            {design && (
              <div className="card">
                <h3 className="font-semibold text-steel mb-2">Saved plan</h3>
                <p className="text-sm text-steel">{design.name}</p>
                <p className="text-xs text-concrete mt-1">Open the &quot;Floor plan &amp; house&quot; tab for the full viewer.</p>
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="font-semibold text-steel mb-3">Progress snapshot</h3>
            <ProgressBar value={project.progressPercentage || 0} />
          </div>
        </div>
      )}

      {tab === 'design' && (
        <ProjectDesignOutputs project={project} design={design} readOnly showDownloads />
      )}

      {tab === 'charts' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Schedule progress" subtitle="Tasks vs completion">
            {scheduleChart.length ? (
              <BarChart data={scheduleChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="actual" fill="#E67E22" name="Progress %" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <p className="text-sm text-concrete py-12 text-center">No schedule tasks</p>
            )}
          </ChartCard>
          <ChartCard title="Material use on site" subtitle="From daily logs">
            {materialChart.length ? (
              <BarChart data={materialChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="used" fill="#2C3E50" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <p className="text-sm text-concrete py-12 text-center">No material usage logged</p>
            )}
          </ChartCard>
          <ChartCard title="Budget & materials" subtitle="Income / spend view (FRw)" className="lg:col-span-2">
            {incomeChart.length ? (
              <PieChart>
                <Pie data={incomeChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {incomeChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            ) : (
              <p className="text-sm text-concrete py-12 text-center">No financial breakdown</p>
            )}
          </ChartCard>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="card">
          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Tasks ({tasks.length})
          </h3>
          {tasks.length ? (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-steel-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-steel">{t.title}</p>
                    <p className="text-xs text-concrete">{formatDate(t.start_date || t.startDate)} – {formatDate(t.end_date || t.endDate)}</p>
                  </div>
                  <StatusBadge status={t.status || 'pending'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-concrete">No tasks on this project</p>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="card">
          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">
            <HardHat className="h-4 w-4 text-primary" /> Assigned Contractors ({assignments.length})
          </h3>
          {assignments.length ? (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-steel-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-steel">{a.first_name} {a.last_name}</p>
                    <p className="text-xs text-concrete">{a.specialty || 'General contractor'}</p>
                  </div>
                  <StatusBadge status={a.status || 'active'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-concrete">No contractors assigned yet</p>
          )}
        </div>
      )}

      {tab === 'materials' && (
        <DataTable columns={materialColumns} data={materials} emptyMessage="No materials for this project" />
      )}

      {tab === 'issues' && (
        <DataTable columns={issueColumns} data={issues} emptyMessage="No issues reported" />
      )}

      {tab === 'logs' && (
        <div className="card">
          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" /> Daily Logs ({dailyLogs.length})
          </h3>
          {dailyLogs.length ? (
            <div className="space-y-3">
              {dailyLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-steel-100 p-4">
                  <div className="flex justify-between">
                    <p className="font-medium text-steel">{formatDate(log.log_date || log.logDate)}</p>
                    <span className="text-xs text-concrete">{log.weather || '—'}</span>
                  </div>
                  <p className="text-sm text-concrete mt-2">{log.work_summary || log.workSummary}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-concrete">No daily logs submitted</p>
          )}
        </div>
      )}
    </AdminPage>
  );
}
