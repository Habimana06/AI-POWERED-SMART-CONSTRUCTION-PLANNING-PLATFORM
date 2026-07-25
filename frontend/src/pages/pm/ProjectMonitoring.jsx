import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, materialsAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import { formatDate, formatPercent } from '../../utils/helpers';
import { parseAiPmComment } from '../../utils/contractorReportExport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import ChartCard from '../../components/ChartCard';
import { weeklyProgressFromTasks, materialUsageFromLogs } from '../../utils/pmScheduleCharts';
import { parseDesignSpecifications } from '../../utils/buildingAssets';
import { calculateMaterialQuantities } from '../../utils/materialCalculations';
import DataTable from '../../components/DataTable';
import { StatusBadge } from '../../components/PageHeader';
import ProjectSelector from '../../components/ProjectSelector';
import toast from 'react-hot-toast';
import { Bot, AlertTriangle } from 'lucide-react';

export default function ProjectMonitoring() {
  const { activeProjectId, activeProject } = useProject();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState({});
  const [showReject, setShowReject] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState('all');

  const { data: progress, isLoading } = useQuery({
    queryKey: ['progress', activeProjectId],
    queryFn: () => projectsAPI.getProgress(activeProjectId),
    enabled: !!activeProjectId,
  });

  const { data: logsData } = useQuery({
    queryKey: ['daily-logs', activeProjectId],
    queryFn: () => projectsAPI.getDailyLogs(activeProjectId),
    enabled: !!activeProjectId,
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials', activeProjectId],
    queryFn: () => projectsAPI.getMaterials(activeProjectId),
    enabled: !!activeProjectId,
  });

  const { data: issuesData } = useQuery({
    queryKey: ['issues', activeProjectId],
    queryFn: () => projectsAPI.getIssues(activeProjectId),
    enabled: !!activeProjectId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['pm-project-tasks', activeProjectId],
    queryFn: () => projectsAPI.getTasks(activeProjectId),
    enabled: !!activeProjectId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => materialsAPI.updateStatus(id, status, notes),
    onSuccess: () => {
      toast.success('Material request updated');
      queryClient.invalidateQueries({ queryKey: ['materials', activeProjectId] });
      setShowReject(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const progressList = progress?.progressUpdates || progress?.updates || [];
  const dailyLogs = logsData?.dailyLogs || logsData?.logs || [];
  const materials = materialsData?.materials || [];
  const issues = issuesData?.issues || [];
  const scheduleTasks = tasksData?.tasks || [];
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setSelectedTaskId('all');
  }, [activeProjectId]);
  const overdueTasks = scheduleTasks.filter((t) => {
    const end = t.end_date || t.endDate;
    return end && String(end).slice(0, 10) < today && t.status !== 'completed';
  });

  const selectedTask = selectedTaskId === 'all'
    ? null
    : scheduleTasks.find((t) => String(t.id) === String(selectedTaskId));

  const weeklyChart = weeklyProgressFromTasks(scheduleTasks, activeProject?.startDate);
  const materialChart = materialUsageFromLogs(dailyLogs, calculateMaterialQuantities({
    width: 8, depth: 6, floors: activeProject?.floors || 1,
    buildingType: activeProject?.buildingType,
  }));

  const progressColumns = [
    { header: 'Date', accessor: 'createdAt', render: (row) => formatDate(row.createdAt || row.created_at) },
    { header: 'Description', accessor: 'description', render: (row) => row.description || row.work_completed || row.workCompleted || '—' },
    { header: 'Progress', accessor: 'progressPercentage', render: (row) => formatPercent(row.progressPercentage || row.progress_percentage || 0) },
    { header: 'Workers', accessor: 'workersCount', render: (row) => row.workersCount ?? row.workers_count ?? '—' },
    { header: 'By', accessor: 'reported_by_name', render: (row) => row.reported_by_name || 'Contractor' },
  ];

  return (
    <div className="w-full space-y-4">
      <ProjectSelector className="mb-2" required />

      {activeProject && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Progress by week (Sun–Sat)" subtitle={`${activeProject.name} — from schedule tasks`}>
            {weeklyChart.length ? (
              <AreaChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="avgProgress" stroke="#E67E22" fill="#E67E22" fillOpacity={0.2} name="Avg %" />
              </AreaChart>
            ) : (
              <p className="text-sm text-concrete py-12 text-center">Add schedule tasks to see weekly progress</p>
            )}
          </ChartCard>
          <ChartCard title="Material use on site" subtitle="From contractor daily logs">
            {materialChart.length ? (
              <BarChart data={materialChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="used" fill="#2C3E50" name="Used" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <p className="text-sm text-concrete py-12 text-center">No material usage logged yet</p>
            )}
          </ChartCard>
        </div>
      )}

      {activeProject && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-steel">{activeProject.name}</h3>
            <StatusBadge status={activeProject.status} />
          </div>
          <p className="text-2xl font-bold text-primary">{formatPercent(activeProject.progressPercentage || 0)}</p>
        </div>
      )}

      {!activeProjectId ? (
        <div className="card text-center py-12 text-concrete">Select a project to monitor</div>
      ) : (
        <>
          {overdueTasks.length > 0 && (
            <div className="card mb-8 border-danger/30 bg-red-50/40">
              <h3 className="font-semibold text-danger flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4" /> AI-flagged overdue tasks (not completed)
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {overdueTasks.map((t) => (
                  <div key={t.id} className="rounded-lg border border-danger/20 bg-white p-3 text-sm">
                    <p className="font-medium text-steel">{t.title}</p>
                    <p className="text-xs text-concrete">Due {formatDate(t.end_date || t.endDate)} · {t.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-steel">Contractor schedule tasks</h3>
              <select
                className="input !py-1.5 !text-sm min-w-[220px]"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="all">All tasks ({scheduleTasks.length})</option>
                {scheduleTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title || `Task #${t.id}`}</option>
                ))}
              </select>
            </div>
            {selectedTask ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold text-steel">{selectedTask.title}</p>
                  <StatusBadge status={selectedTask.status} />
                </div>
                <p className="text-sm text-concrete">{selectedTask.description || 'No description'}</p>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><dt className="text-concrete">Start</dt><dd className="font-medium text-steel">{formatDate(selectedTask.start_date || selectedTask.startDate)}</dd></div>
                  <div><dt className="text-concrete">End</dt><dd className="font-medium text-steel">{formatDate(selectedTask.end_date || selectedTask.endDate)}</dd></div>
                  <div><dt className="text-concrete">Priority</dt><dd className="font-medium text-steel capitalize">{selectedTask.priority || '—'}</dd></div>
                  <div><dt className="text-concrete">Assignee</dt><dd className="font-medium text-steel">{selectedTask.assigned_to_name || selectedTask.contractor_name || 'Contractor'}</dd></div>
                </dl>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scheduleTasks.length ? scheduleTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTaskId(String(t.id))}
                    className="w-full text-left rounded-lg border border-steel-100 px-3 py-2 hover:border-primary/30 flex flex-wrap justify-between gap-2"
                  >
                    <span className="text-sm font-medium text-steel">{t.title}</span>
                    <span className="text-xs text-concrete">{formatDate(t.end_date || t.endDate)} · {t.status}</span>
                  </button>
                )) : (
                  <p className="text-sm text-concrete">No schedule tasks — add them in Scheduling</p>
                )}
              </div>
            )}
          </div>

          <div className="card mb-8">
            <h3 className="font-semibold text-steel mb-4">Contractor task completions</h3>
            <DataTable columns={progressColumns} data={progressList} loading={isLoading} emptyMessage="No task completions yet — contractors complete items from My Tasks" />
          </div>

          <div className="card mb-8">
            <h3 className="font-semibold text-steel mb-4">Work logs & material use</h3>
            {dailyLogs.length ? (
              <div className="space-y-3">
                {dailyLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="rounded-xl border border-steel-100 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-steel">{formatDate(log.log_date || log.logDate)}</span>
                      <span className="text-concrete">{log.weather || '—'}</span>
                    </div>
                    <p className="text-sm text-concrete mt-2">{log.work_summary || log.workSummary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-concrete">No daily logs yet</p>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-steel mb-4">Material requests</h3>
            {materials.length ? (
              <div className="space-y-4">
                {materials.map((m) => {
                  const aiPm = parseAiPmComment(m.notes);
                  return (
                  <div key={m.id} className="rounded-xl border border-steel-100 p-4 flex flex-wrap gap-4 items-start justify-between">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-medium text-steel">{m.name}</p>
                      <p className="text-xs text-concrete">{m.quantity} {m.unit} · {m.total_cost ? `${Number(m.total_cost).toLocaleString()} FRw` : '—'}</p>
                      {m.description && <p className="text-xs text-steel mt-1">{m.description}</p>}
                      {aiPm && (
                        <p className="text-xs mt-2 rounded-lg bg-primary/5 border border-primary/10 p-2 flex gap-2">
                          <Bot className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{aiPm}</span>
                        </p>
                      )}
                      <StatusBadge status={m.status} />
                    </div>
                    {m.status === 'requested' && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <button type="button" className="btn-primary !py-1.5 !px-3 text-sm" onClick={() => statusMutation.mutate({ id: m.id, status: 'approved' })}>
                          Approve
                        </button>
                        <button type="button" className="btn-outline !py-1.5 !px-3 text-sm" onClick={() => setShowReject(m.id)}>
                          Reject
                        </button>
                        {showReject === m.id && (
                          <>
                            <input
                              className="input !py-1 text-sm max-w-xs"
                              placeholder="Reason for rejection"
                              value={rejectReason[m.id] || ''}
                              onChange={(e) => setRejectReason((r) => ({ ...r, [m.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="text-sm text-danger font-semibold"
                              onClick={() => statusMutation.mutate({ id: m.id, status: 'rejected', notes: rejectReason[m.id] })}
                            >
                              Confirm reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-concrete">No material requests</p>
            )}
            <p className="text-xs text-concrete mt-4">Approved materials increase contractor approved totals and cost estimates.</p>
          </div>

          <div className="card">
            <h3 className="font-semibold text-steel mb-4">Site issues</h3>
            {issues.length ? (
              <div className="space-y-3">
                {issues.slice(0, 8).map((ir) => (
                  <div key={ir.id} className="rounded-xl border border-steel-100 p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-medium text-steel">{ir.title}</p>
                      <StatusBadge status={ir.severity} />
                    </div>
                    <p className="text-sm text-concrete mt-1">{ir.description}</p>
                    <p className="text-xs text-concrete mt-2">{ir.location || '—'} · {formatDate(ir.created_at || ir.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-concrete">No open issues reported</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
