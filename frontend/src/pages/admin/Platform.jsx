import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FolderKanban, HardHat, MessageSquare, ScrollText, Shield, ArrowRight,
} from 'lucide-react';
import { adminAPI, analyticsAPI } from '../../services/api';
import { formatNumber, formatCurrency } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';
import AdminPage from '../../components/AdminPage';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

export default function AdminPlatform() {
  const { data: dash } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminAPI.getDashboard,
  });
  const { data: projectData } = useQuery({
    queryKey: ['analytics-projects'],
    queryFn: analyticsAPI.getProjects,
  });
  const { data: userData } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: analyticsAPI.getUsers,
  });

  const stats = dash?.stats || {};
  const recent = dash?.recentActivity || [];
  const roles = (userData?.roleDistribution || userData?.usersByRole || []).map((r) => ({
    role: r.name || r.role,
    count: Number(r.count || 0),
  }));
  const projectStats = projectData?.projectStats || [];

  return (
    <AdminPage>
      <PageHeader
        title="Platform Hub"
        subtitle="Operations center — users, assignments, and cross-role visibility (replaces legacy company admin)"
      />

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Users" value={formatNumber(stats.totalUsers ?? 0)} icon={Users} />
        <StatCard title="Projects" value={formatNumber(stats.totalProjects ?? 0)} icon={FolderKanban} />
        <StatCard title="Platform budget" value={formatCurrency(stats.totalBudget ?? 0)} icon={Shield} />
        <StatCard title="Audit (24h)" value={formatNumber(stats.auditLogsToday ?? 0)} icon={ScrollText} />
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Users by role
          </h3>
          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.role} className="flex items-center justify-between rounded-lg border border-steel-100 px-3 py-2">
                <span className="text-sm text-steel">{ROLE_LABELS[r.role] || r.role}</span>
                <span className="font-bold text-primary">{r.count}</span>
              </div>
            ))}
            {!roles.length && <p className="text-sm text-concrete">No user data</p>}
          </div>
          <Link to="/admin/users" className="text-sm text-primary mt-4 inline-flex items-center gap-1 hover:underline">
            Manage users <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="card">
          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" /> Projects by status
          </h3>
          <div className="flex flex-wrap gap-2">
            {projectStats.map((r) => (
              <div key={r.status} className="rounded-xl border border-steel-100 px-4 py-3 min-w-[120px]">
                <StatusBadge status={r.status} />
                <p className="text-lg font-bold text-steel mt-1">{r.count}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-concrete mt-3">New projects are active immediately — PM can assign contractors without admin approval.</p>
          <Link to="/admin/projects" className="text-sm text-primary mt-2 inline-flex items-center gap-1 hover:underline">
            All projects <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold text-steel mb-3">Quick links</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/admin/analytics" className="rounded-lg border border-steel-100 p-3 text-sm font-medium text-steel hover:border-primary/40">Analytics & per-project drill-down</Link>
            <Link to="/admin/reports" className="rounded-lg border border-steel-100 p-3 text-sm font-medium text-steel hover:border-primary/40">System reports & exports</Link>
            <Link to="/admin/messages" className="rounded-lg border border-steel-100 p-3 text-sm font-medium text-steel hover:border-primary/40 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Message any role</Link>
            <Link to="/admin/audit-logs" className="rounded-lg border border-steel-100 p-3 text-sm font-medium text-steel hover:border-primary/40">Audit & compliance</Link>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-steel mb-3 flex items-center gap-2">
            <HardHat className="h-4 w-4 text-primary" /> Recent platform activity
          </h3>
          {recent.length ? (
            <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
              {recent.slice(0, 6).map((row) => (
                <li key={row.id} className="flex justify-between gap-2 border-b border-steel-50 pb-2">
                  <span className="text-steel truncate">{row.action} · {row.entity_type}</span>
                  <span className="text-xs text-concrete shrink-0">{row.email || 'system'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-concrete">No recent events</p>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
