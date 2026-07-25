import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FolderKanban, DollarSign, AlertTriangle, Calendar, Bot, ClipboardCheck,
  PenTool, FileImage, PlusCircle, HardHat, Activity, TrendingUp, ArrowRight,
  Bell, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { pmAPI, projectsAPI } from '../../services/api';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/helpers';
import { parseDesignSpecifications } from '../../utils/buildingAssets';
import { calculateMaterialQuantities, summarizeMaterialCosts } from '../../utils/materialCalculations';
import { getLockedProjectFields } from '../../utils/projectMetadata';
import { weeklyProgressFromTasks, materialUsageFromLogs } from '../../utils/pmScheduleCharts';
import StatCard from '../../components/StatCard';
import ChartCard from '../../components/ChartCard';
import { ProgressBar, StatusBadge } from '../../components/PageHeader';

const COLORS = ['#E67E22', '#2C3E50', '#27AE60', '#3498DB', '#7F8C8D', '#E74C3C'];

const WORKSPACE_FEATURES = [
  {
    title: 'Live site monitoring',
    desc: 'Track contractor progress, daily logs, and approve materials.',
    path: '/pm/monitoring',
    icon: Activity,
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'AI Building workspace',
    desc: 'Chat, saved plans, and full-building preview in one place.',
    path: '/pm/ai-building',
    icon: Bot,
    color: 'bg-primary/10 text-primary',
  },
  {
    title: 'Design & exports',
    desc: 'Professional plans, full-house renders, PDF/PPT downloads.',
    path: '/pm/blueprints',
    icon: FileImage,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Team inbox & alerts',
    desc: 'Messages, notifications, and contractor requests.',
    path: '/pm/notifications',
    icon: Bell,
    color: 'bg-amber-50 text-amber-700',
  },
];

export default function PMDashboard() {
  const [chartProjectId, setChartProjectId] = useState('');
  const [chartMetric, setChartMetric] = useState('progress');

  const { data, isLoading } = useQuery({
    queryKey: ['pm-dashboard'],
    queryFn: pmAPI.getDashboard,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['pm-projects-chart'],
    queryFn: () => projectsAPI.getAll({ limit: 50 }),
  });

  const { data: tasksForChart } = useQuery({
    queryKey: ['pm-dash-tasks', chartProjectId],
    queryFn: () => projectsAPI.getTasks(chartProjectId),
    enabled: !!chartProjectId && chartMetric === 'progress',
  });

  const { data: logsForChart } = useQuery({
    queryKey: ['pm-dash-logs', chartProjectId],
    queryFn: () => projectsAPI.getDailyLogs(chartProjectId),
    enabled: !!chartProjectId,
  });

  const { data: materialsForChart } = useQuery({
    queryKey: ['pm-dash-materials', chartProjectId],
    queryFn: () => projectsAPI.getMaterials(chartProjectId),
    enabled: !!chartProjectId,
  });

  const { data: designsData } = useQuery({
    queryKey: ['designs', chartProjectId],
    queryFn: () => projectsAPI.getDesigns(chartProjectId),
    enabled: !!chartProjectId && chartMetric !== 'progress',
  });

  const stats = data?.stats || {};
  const projects = data?.recentProjects || data?.projects || [];
  const progressChart = data?.progressChart || [];
  const recommendations = data?.recommendations || [];
  const upcomingTasks = data?.upcomingTasks || [];
  const allProjects = projectsData?.projects || projectsData || [];

  const selectedProject = useMemo(() => {
    const list = Array.isArray(allProjects) ? allProjects : [];
    return list.find((p) => p.id === chartProjectId) || list[0];
  }, [allProjects, chartProjectId]);

  useEffect(() => {
    if (!chartProjectId && allProjects?.length) {
      setChartProjectId(allProjects[0].id);
    }
  }, [allProjects, chartProjectId]);

  const metricChart = useMemo(() => {
    if (!selectedProject) return { type: 'empty', data: [] };
    if (chartMetric === 'progress') {
      const tasks = tasksForChart?.tasks || [];
      const weekly = weeklyProgressFromTasks(tasks, selectedProject.startDate || selectedProject.start_date);
      if (weekly.length) {
        return {
          type: 'area',
          data: weekly.map((w) => ({
            label: w.week,
            planned: w.planned ?? w.avgProgress,
            actual: w.avgProgress,
          })),
        };
      }
      const pct = Number(selectedProject.progressPercentage ?? 0);
      return { type: 'area', data: [{ label: 'Current', planned: pct, actual: pct }] };
    }
    const specs = parseDesignSpecifications(designsData?.designs?.[0]?.specifications);
    const locked = getLockedProjectFields(selectedProject);
    const rows = calculateMaterialQuantities({
      width: specs?.width || 8,
      depth: specs?.depth || 6,
      floors: specs?.floors || selectedProject.floors || 1,
      areaSqft: selectedProject.totalAreaSqft || locked.totalAreaSqft,
      buildingType: selectedProject.buildingType || selectedProject.projectType,
      workerSalaryTotal: specs?.workerSalaryTotal ?? locked.workerSalaryTotal ?? 0,
    });
    const summary = summarizeMaterialCosts(rows, selectedProject.budget || 0);
    if (chartMetric === 'cost') {
      return {
        type: 'pie',
        data: Object.entries(summary.byCategory).map(([name, value]) => ({ name, value })),
      };
    }
    return {
      type: 'bar',
      data: rows.slice(0, 8).map((r) => ({ name: r.material.split(' ')[0], total: r.totalCost })),
    };
  }, [selectedProject, chartMetric, designsData, tasksForChart]);

  const materialScheduleChart = useMemo(() => {
    const logs = logsForChart?.dailyLogs || logsForChart?.logs || [];
    const specs = parseDesignSpecifications(designsData?.designs?.[0]?.specifications);
    const locked = getLockedProjectFields(selectedProject);
    const catalog = calculateMaterialQuantities({
      width: specs?.width || 8,
      depth: specs?.depth || 6,
      floors: specs?.floors || selectedProject?.floors || 1,
      buildingType: selectedProject?.buildingType,
      workerSalaryTotal: specs?.workerSalaryTotal ?? locked.workerSalaryTotal ?? 0,
    });
    return materialUsageFromLogs(logs, catalog);
  }, [logsForChart, designsData, selectedProject]);

  if (isLoading) {
    return <div className="text-sm text-concrete py-8">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-steel">Project Manager Dashboard</h2>
        <Link to="/pm/create-project" className="btn-primary inline-flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> New Project
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Projects" value={formatNumber(stats.activeProjects ?? stats.inProgress ?? 0)} icon={FolderKanban} />
        <StatCard title="Pending Approval" value={formatNumber(stats.pendingApproval ?? 0)} icon={ClipboardCheck} />
        <StatCard title="Total Budget" value={formatCurrency(stats.totalBudget ?? 0)} icon={DollarSign} />
        <StatCard title="Avg Progress" value={formatPercent(stats.avgProgress ?? 0)} icon={TrendingUp} />
        <StatCard title="Open Risks" value={formatNumber(stats.openRisks ?? 0)} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WORKSPACE_FEATURES.map(({ title, desc, path, icon: Icon, color }) => (
          <Link
            key={path}
            to={path}
            className="card hover:border-primary/35 hover:shadow-md transition-all flex flex-col gap-3 min-h-[140px]"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-steel">{title}</p>
              <p className="text-xs text-concrete mt-1 leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-steel flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Project chart
            </label>
            <select
              className="input !py-1.5 !text-sm max-w-[220px]"
              value={chartProjectId || selectedProject?.id || ''}
              onChange={(e) => setChartProjectId(e.target.value)}
            >
              {(Array.isArray(allProjects) ? allProjects : []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              className="input !py-1.5 !text-sm max-w-[180px]"
              value={chartMetric}
              onChange={(e) => setChartMetric(e.target.value)}
            >
              <option value="progress">Progress</option>
              <option value="cost">Cost by category</option>
              <option value="materials">Top materials</option>
            </select>
          </div>
          <ChartCard
            title={chartMetric === 'progress' ? 'Progress timeline' : chartMetric === 'cost' ? 'Cost breakdown' : 'Material spend'}
            subtitle={selectedProject?.name || 'Select a project'}
          >
            {metricChart.type === 'area' && metricChart.data.length ? (
              <AreaChart data={metricChart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="planned" stroke="#7F8C8D" fill="#7F8C8D" fillOpacity={0.1} name="Planned %" />
                <Area type="monotone" dataKey="actual" stroke="#E67E22" fill="#E67E22" fillOpacity={0.2} name="Actual %" />
              </AreaChart>
            ) : metricChart.type === 'pie' && metricChart.data.length ? (
              <PieChart>
                <Pie data={metricChart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name}>
                  {metricChart.data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            ) : metricChart.type === 'bar' && metricChart.data.length ? (
              <BarChart data={metricChart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="total" fill="#E67E22" name="FRw" />
              </BarChart>
            ) : (
              <p className="text-sm text-concrete py-12 text-center">Save a building plan in the editor to see cost & material charts</p>
            )}
          </ChartCard>
          <ChartCard title="Material use (from site logs)" subtitle="Linked to schedule / daily progress">
            {materialScheduleChart.length ? (
              <BarChart data={materialScheduleChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="used" fill="#2C3E50" name="Used qty" radius={[4, 4, 0, 0]} />
                {materialScheduleChart[0]?.planned != null && (
                  <Bar dataKey="planned" fill="#BDC3C7" name="Planned" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            ) : (
              <p className="text-sm text-concrete py-12 text-center">No material usage logged yet for this project</p>
            )}
          </ChartCard>
        </div>

        <div className="card">
          <h3 className="font-semibold text-steel flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-primary" /> AI Recommendations
          </h3>
          <div className="space-y-2 max-h-40 overflow-hidden">
            {recommendations.length ? recommendations.slice(0, 2).map((rec, i) => (
              <div key={i} className="rounded-lg border border-steel-100 p-2">
                <p className="text-xs text-steel line-clamp-2">{rec.title}</p>
                <StatusBadge status={rec.priority} />
              </div>
            )) : (
              <p className="text-xs text-concrete">No risks identified</p>
            )}
          </div>
          <Link to="/pm/risk-prediction" className="btn-outline w-full text-center text-sm mt-3 inline-block">
            Show more — full risk analysis
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-steel">Upcoming Tasks</h3>
            <Link to="/pm/scheduling" className="text-xs font-semibold text-primary hover:underline">View schedule</Link>
          </div>
          {upcomingTasks.length ? (
            <div className="space-y-3">
              {upcomingTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-3 rounded-xl border border-steel-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-steel">{task.title || task.name}</p>
                    <p className="text-xs text-concrete mt-0.5">{task.project_name}</p>
                  </div>
                  <span className="text-xs text-concrete shrink-0">
                    {task.end_date ? new Date(task.end_date).toLocaleDateString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-concrete">No upcoming tasks — generate a schedule for your projects</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-steel">Recent Projects</h3>
            <Link to="/pm/monitoring" className="text-xs font-semibold text-primary hover:underline">All monitoring</Link>
          </div>
          {projects.length ? (
            <div className="space-y-3">
              {projects.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  to="/pm/monitoring"
                  className="flex items-center justify-between rounded-xl border border-steel-100 p-4 hover:border-primary/30 hover:bg-steel-50/50 transition-colors group"
                >
                  <div>
                    <p className="font-medium text-steel group-hover:text-primary">{p.name}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32"><ProgressBar value={p.progressPercentage || 0} /></div>
                    <ArrowRight className="h-4 w-4 text-concrete group-hover:text-primary" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-concrete">No projects yet — create one from Create Project</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/pm/cost-estimation" className="card hover:border-primary/30 transition-colors flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold text-steel">Cost Estimation</p>
            <p className="text-xs text-concrete">Materials + labor vs budget</p>
          </div>
        </Link>
        <Link to="/pm/contractors" className="card hover:border-primary/30 transition-colors flex items-center gap-3">
          <HardHat className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold text-steel">Contractors</p>
            <p className="text-xs text-concrete">Assign and message teams</p>
          </div>
        </Link>
        <Link to="/pm/scheduling" className="card hover:border-primary/30 transition-colors flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold text-steel">Scheduling</p>
            <p className="text-xs text-concrete">Tasks and timeline charts</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
