import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FolderKanban, DollarSign, AlertTriangle, ScrollText, ArrowRight, Activity,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { adminAPI } from '../../services/api';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatDateTime } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';
import { auditLogUser } from '../../utils/adminHelpers';
import StatCard from '../../components/StatCard';
import ChartCard from '../../components/ChartCard';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import AdminPage from '../../components/AdminPage';

const COLORS = ['#E67E22', '#2C3E50', '#27AE60', '#F1C40F', '#7F8C8D'];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminAPI.getDashboard,
  });

  const stats = data?.stats || {};
  const projectChart = data?.projectChart || [];
  const revenueChart = data?.revenueChart || [];
  const recentActivity = data?.recentActivity || [];
  const activityTrend = data?.activityTrend || [];
  const usersByRole = (stats.users?.byRole || []).map((r) => ({
    name: ROLE_LABELS[r.name] || r.name,
    count: +r.count,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Dashboard" subtitle="Loading platform overview..." />
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-steel-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform overview and key metrics"
      />

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={formatNumber(stats.totalUsers ?? 0)}
          icon={Users}
          trend={stats.newUsersThisMonth ? `+${stats.newUsersThisMonth} this month` : undefined}
        />
        <StatCard
          title="Active Projects"
          value={formatNumber(stats.activeProjects ?? stats.totalProjects ?? 0)}
          icon={FolderKanban}
          trend={`${stats.totalProjects ?? 0} total`}
        />
        <StatCard
          title="Total Budget"
          value={formatCurrency(stats.totalBudget ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Open Issues"
          value={formatNumber(stats.openIssues ?? 0)}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/users" className="card hover:border-primary/40 transition-colors group">
          <p className="text-xs font-semibold uppercase text-concrete">Active users</p>
          <p className="text-2xl font-bold text-steel mt-1">{stats.activeUsers ?? stats.totalUsers ?? 0}</p>
        </Link>
        <Link to="/admin/audit-logs" className="card hover:border-primary/40 transition-colors group">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase text-concrete">Audit (24h)</p>
              <p className="text-2xl font-bold text-steel mt-1">{stats.auditLogsToday ?? 0}</p>
            </div>
            <ScrollText className="h-8 w-8 text-primary opacity-60 group-hover:opacity-100 shrink-0" title="Open audit logs" />
          </div>
        </Link>
        <Link to="/admin/system-status" className="card hover:border-primary/40 transition-colors group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-concrete">System</p>
              <p className="text-sm font-bold text-steel mt-1">Status & health</p>
            </div>
            <Activity className="h-8 w-8 text-primary opacity-60 group-hover:opacity-100" />
          </div>
        </Link>
        <Link to="/admin/platform" className="card hover:border-primary/40 transition-colors group">
          <p className="text-xs font-semibold uppercase text-concrete">Platform hub</p>
          <p className="text-sm font-bold text-steel mt-1">Operations center →</p>
        </Link>
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <ChartCard title="Project status" subtitle="Live distribution">
          {projectChart.length ? (
            <PieChart>
              <Pie data={projectChart} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius="42%" label>
                {projectChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <p className="text-sm text-concrete py-12 text-center">No projects yet</p>
          )}
        </ChartCard>

        <ChartCard title="Users by role" subtitle="Registered accounts">
          {usersByRole.length ? (
            <PieChart>
              <Pie data={usersByRole} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius="42%" label>
                {usersByRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <p className="text-sm text-concrete py-12 text-center">No users yet</p>
          )}
        </ChartCard>
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <ChartCard title="Monthly budget" subtitle="New project budgets (FRw)">
          {revenueChart.length ? (
            <BarChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrencyCompact} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#E67E22" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : (
            <p className="text-sm text-concrete py-12 text-center">No budget history yet</p>
          )}
        </ChartCard>

        <ChartCard title="Activity trend" subtitle="Audit events per day (last 14 days)">
          {activityTrend.length ? (
            <LineChart data={activityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="events" stroke="#E67E22" strokeWidth={2} dot />
            </LineChart>
          ) : (
            <p className="text-sm text-concrete py-12 text-center">No audit activity yet</p>
          )}
        </ChartCard>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-steel">Recent activity</h3>
          <Link to="/admin/audit-logs" className="text-sm text-primary flex items-center gap-1 hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentActivity.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {recentActivity.slice(0, 8).map((row) => (
              <Link
                key={row.id}
                to={row.user_id ? `/admin/audit-logs/user/${row.user_id}` : '/admin/audit-logs'}
                className="flex items-center justify-between py-2 px-3 rounded-lg border border-steel-50 gap-4 hover:border-primary/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-steel truncate">
                    {row.action} · {row.entity_type}
                  </p>
                  <p className="text-xs text-concrete">{auditLogUser(row)}</p>
                </div>
                <span className="text-xs text-concrete shrink-0">{formatDateTime(row.created_at)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-concrete py-6 text-center">No audit activity recorded yet</p>
        )}
      </div>
    </AdminPage>
  );
}
