import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Sparkles } from 'lucide-react';
import {
  BarChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { contractorAPI, projectsAPI } from '../../services/api';
import { parseDesignSpecifications } from '../../utils/buildingAssets';
import { calculateMaterialQuantities } from '../../utils/materialCalculations';
import { formatCurrency, formatDate } from '../../utils/helpers';
import ChartCard from '../../components/ChartCard';
import DataTable from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import DashboardPage from '../../components/DashboardPage';

function parseMaterialsUsed(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export default function WorkMaterials() {
  const [projectId, setProjectId] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['contractor-projects'],
    queryFn: () => contractorAPI.getProjects(),
  });
  const projectList = projects?.projects || [];

  useEffect(() => {
    if (!projectId && projectList.length) setProjectId(String(projectList[0].id));
  }, [projectList, projectId]);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['daily-logs', projectId],
    queryFn: () => projectsAPI.getDailyLogs(projectId),
    enabled: !!projectId,
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials', projectId],
    queryFn: () => projectsAPI.getMaterials(projectId),
    enabled: !!projectId,
  });

  const { data: designsData } = useQuery({
    queryKey: ['designs', projectId],
    queryFn: () => projectsAPI.getDesigns(projectId),
    enabled: !!projectId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['schedule-tasks', projectId],
    queryFn: () => contractorAPI.getProjectTasks(projectId),
    enabled: !!projectId,
  });

  const project = projectList.find((p) => String(p.id) === String(projectId));
  const specs = parseDesignSpecifications(designsData?.designs?.[0]?.specifications);
  const plannedRows = useMemo(() => calculateMaterialQuantities({
    width: specs?.width || 8,
    depth: specs?.depth || 6,
    floors: specs?.floors || project?.floors || 1,
    buildingType: project?.buildingType || project?.projectType,
    workerSalaryTotal: specs?.workerSalaryTotal || 0,
  }), [specs, project]);

  const logs = logsData?.dailyLogs || logsData?.logs || [];
  const materials = materialsData?.materials || [];
  const scheduleTasks = tasksData?.tasks || [];

  const usedByName = useMemo(() => {
    const acc = {};
    logs.forEach((log) => {
      parseMaterialsUsed(log.materials_used || log.materialsUsed).forEach((m) => {
        const key = m.name || m.material || 'Unknown';
        acc[key] = (acc[key] || 0) + (Number(m.quantity) || 0);
      });
    });
    return acc;
  }, [logs]);

  const inventoryRows = useMemo(() => plannedRows.map((row) => {
    const used = usedByName[row.material] || 0;
    const remain = Math.max(0, row.quantity - used);
    const pctUsed = row.quantity > 0 ? Math.min(100, (used / row.quantity) * 100) : 0;
    return {
      id: row.id,
      material: row.material,
      unit: row.unit,
      planned: row.quantity,
      used,
      remaining: remain,
      pctUsed: Math.round(pctUsed),
      category: row.category,
    };
  }), [plannedRows, usedByName]);

  const scheduleChart = useMemo(() => scheduleTasks.slice(0, 10).map((t) => ({
    name: (t.title || '').slice(0, 12),
    planned: 100,
    actual: t.status === 'completed' ? 100 : parseFloat(t.progress_percentage ?? t.progressPercentage) || 0,
  })), [scheduleTasks]);

  const materialChart = inventoryRows.slice(0, 8).map((r) => ({
    name: r.material.slice(0, 10),
    used: r.used,
    remaining: r.remaining,
  }));

  const approvedTotal = materials.filter((m) => m.status === 'approved').reduce((s, m) => s + (Number(m.total_cost ?? m.totalCost) || 0), 0);

  const columns = [
    { header: 'Material', accessor: 'material', sortable: true },
    { header: 'Category', accessor: 'category' },
    { header: 'Planned', accessor: 'planned', render: (r) => `${r.planned} ${r.unit}` },
    { header: 'Used', accessor: 'used', render: (r) => `${r.used} ${r.unit}` },
    { header: 'Remaining', accessor: 'remaining', render: (r) => `${r.remaining} ${r.unit}` },
    { header: '% used', accessor: 'pctUsed', render: (r) => `${r.pctUsed}%` },
  ];

  return (
    <DashboardPage className="space-y-6">
      <PageHeader
        title="Work & Materials"
        subtitle="Materials tracked from your completed tasks"
        action={
          <Link to="/contractor/tasks" className="btn-outline inline-flex items-center gap-2">
            My tasks <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
        <div className="card">
          <label className="label">Project</label>
          <select className="input max-w-md" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="card text-right min-w-[180px]">
          <p className="text-xs text-concrete uppercase">Approved spend</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(approvedTotal)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-2 text-sm text-steel">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>Figures are computed from the saved building plan and your task completion logs. Request extra stock from Material Requests — AI checks remaining quantities.</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Schedule" subtitle="Planned vs actual (read-only)">
          {scheduleChart.length ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scheduleChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="planned" stroke="#7F8C8D" name="Target %" dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="#E67E22" name="Actual %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-concrete py-10 text-center">No schedule tasks</p>
          )}
        </ChartCard>

        <ChartCard title="Material balance" subtitle="Used vs remaining (top items)">
          {materialChart.length ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="used" stackId="a" fill="#E67E22" name="Used" />
                  <Bar dataKey="remaining" stackId="a" fill="#BDC3C7" name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-concrete py-10 text-center">No usage data yet</p>
          )}
        </ChartCard>
      </div>

      <div className="card">
        <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Full material list (calculated)
        </h3>
        <DataTable
          columns={columns}
          data={inventoryRows}
          loading={logsLoading}
          emptyMessage="Save a building plan in PM editor to see quantities"
        />
      </div>

      <div className="card">
        <h3 className="font-semibold text-steel mb-3">Recent work logs</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {logs.slice(0, 6).map((log) => (
            <div key={log.id} className="rounded-xl border border-steel-100 p-3 text-sm">
              <p className="text-xs text-concrete">{formatDate(log.log_date || log.logDate)}</p>
              <p className="text-steel mt-1 line-clamp-3">{log.work_summary || log.workSummary}</p>
            </div>
          ))}
        </div>
        {!logs.length && <p className="text-sm text-concrete">No logs yet.</p>}
      </div>

      <Link to="/contractor/materials" className="card flex items-center justify-between hover:border-primary/40">
        <span className="font-medium text-steel">Material requests (with AI review)</span>
        <ArrowRight className="h-4 w-4 text-primary" />
      </Link>
    </DashboardPage>
  );
}
