import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { analyticsAPI, adminAPI } from '../../services/api';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent } from '../../utils/helpers';
import ChartCard from '../../components/ChartCard';
import AdminPage from '../../components/AdminPage';
import PageHeader, { StatusBadge, ProgressBar } from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { TrendingUp, Users, AlertTriangle, FolderKanban } from 'lucide-react';

const COLORS = ['#E67E22', '#2C3E50', '#27AE60', '#E74C3C', '#3498DB'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AdminAnalytics() {
  const { data: projectData, isLoading: loadingP } = useQuery({
    queryKey: ['analytics-projects'],
    queryFn: analyticsAPI.getProjects,
  });
  const { data: userData, isLoading: loadingU } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: analyticsAPI.getUsers,
  });
  const { data: projectsList } = useQuery({
    queryKey: ['admin-projects-analytics'],
    queryFn: () => adminAPI.getProjects({ page: 1, limit: 50 }),
  });

  const projectStats = projectData?.projectStats || [];
  const totalProjects = projectStats.reduce((s, r) => s + Number(r.count || 0), 0);
  const monthly = (projectData?.monthlyProgress || []).map((r) => ({
    month: r.month ? MONTH_LABELS[new Date(r.month).getMonth()] || r.month.slice(0, 7) : '—',
    count: Number(r.projects_created || r.count || 0),
  }));
  const costVsBudget = (projectData?.costAnalysis || []).map((r) => ({
    name: (r.name || '').slice(0, 12),
    budget: Number(r.budget || 0),
    estimated: Number(r.estimated_cost || r.estimatedCost || r.actual_cost || 0),
  }));
  const riskSummary = projectData?.riskSummary || [];
  const usersByRole = (userData?.roleDistribution || userData?.usersByRole || []).map((r) => ({
    name: r.name || r.role,
    count: Number(r.count || 0),
  }));
  const activeUsers = usersByRole.reduce((s, r) => s + r.count, 0);
  const allProjects = projectsList?.projects || [];

  if (loadingP && loadingU) {
    return <PageHeader title="Analytics" subtitle="Loading..." />;
  }

  return (
    <AdminPage>
      <PageHeader title="Platform Analytics" subtitle="System performance and per-project drill-down (view only)" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Projects" value={formatNumber(totalProjects)} icon={TrendingUp} />
        <StatCard title="Registered Users" value={formatNumber(activeUsers)} icon={Users} />
        <StatCard title="Open Risks" value={formatNumber(riskSummary.reduce((s, r) => s + Number(r.count || 0), 0))} icon={AlertTriangle} />
        <StatCard title="In directory" value={formatNumber(allProjects.length)} icon={FolderKanban} />
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <ChartCard title="Users by role">
          {usersByRole.length ? (
            <PieChart>
                <Pie data={usersByRole} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius="42%" label>
                {usersByRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <p className="text-sm text-concrete py-12 text-center">No user analytics data</p>
          )}
        </ChartCard>
        <ChartCard title="Projects started (12 mo)">
          {monthly.length ? (
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2C3E50" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <p className="text-sm text-concrete py-12 text-center">No monthly data</p>
          )}
        </ChartCard>
      </div>

      {costVsBudget.length > 0 && (
        <div className="grid w-full gap-6 lg:grid-cols-2">
          <ChartCard title="Cost vs budget" subtitle="Top projects (FRw)">
            <BarChart data={costVsBudget.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatCurrencyCompact} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="budget" fill="#BDC3C7" name="Budget" radius={[4, 4, 0, 0]} />
              <Bar dataKey="estimated" fill="#E67E22" name="Estimated" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
          {projectStats.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-steel mb-4">Projects by status</h3>
              <div className="flex flex-wrap gap-3">
                {projectStats.map((r) => (
                  <div key={r.status} className="rounded-xl border border-steel-100 px-4 py-3">
                    <StatusBadge status={r.status} />
                    <p className="text-lg font-bold text-steel mt-1">{r.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-steel mb-4">Per-project performance</h3>
        <p className="text-sm text-concrete mb-4">Open a project for plans, house image, progress, materials, and budget charts.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {allProjects.map((p) => (
            <Link
              key={p.id}
              to={`/admin/projects/${p.id}`}
              className="rounded-xl border border-steel-100 p-4 hover:border-primary/40 transition-colors block"
            >
              <div className="flex justify-between gap-2">
                <p className="font-medium text-steel">{p.name}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-concrete mt-1">{p.createdByName || 'PM'} · {formatCurrency(p.budget)}</p>
              <ProgressBar value={p.progressPercentage || 0} className="mt-2" size="sm" />
              <p className="text-xs text-primary mt-2">{formatPercent(p.progressPercentage || 0)} progress →</p>
            </Link>
          ))}
          {!allProjects.length && <p className="text-sm text-concrete">No projects yet</p>}
        </div>
      </div>
    </AdminPage>
  );
}
