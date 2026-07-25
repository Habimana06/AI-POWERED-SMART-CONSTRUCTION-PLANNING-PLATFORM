import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Server, Database, Cpu, CheckCircle, AlertCircle, Mail, HardDrive, ScrollText, ArrowRight } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatDateTime, formatDateTimeFull } from '../../utils/helpers';
import { auditLogUser } from '../../utils/adminHelpers';
import { buildAuditLogsPath, todayISO } from '../../utils/auditLogFilters';
import AuditLogLink from '../../components/AuditLogLink';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import AdminPage from '../../components/AdminPage';

function ServiceRow({ label, status, detail }) {
  const ok = status === 'healthy' || status === 'configured' || status === 'operational';
  return (
    <div className="flex items-center justify-between py-3 border-b border-steel-100 last:border-0">
      <div className="flex items-center gap-3">
        {ok ? <CheckCircle className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-safety" />}
        <span className="text-sm font-medium text-steel">{label}</span>
      </div>
      <div className="text-right">
        <StatusBadge status={ok ? 'approved' : 'pending'} />
        {detail && <p className="text-xs text-concrete mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

function formatBytes(n) {
  if (!n) return '—';
  const mb = n / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function AdminSystemStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: adminAPI.getSystemStatus,
  });

  const today = todayISO();
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['system-audit-preview', today],
    queryFn: () => adminAPI.getAuditLogs({ page: 1, limit: 8, fromDate: today, toDate: today }),
  });

  const recentAudit = (auditData?.auditLogs || []).map((row) => ({
    ...row,
    createdAt: row.created_at || row.createdAt,
    userName: auditLogUser(row),
  }));

  const status = data?.status || 'unknown';
  const services = data?.services || {};
  const system = data?.system || {};
  const mem = system.memoryUsage || {};

  return (
    <AdminPage>
      <PageHeader
        title="System Status"
        subtitle="Services, environment, and today’s audit trail"
        action={(
          <AuditLogLink useToday title="Open today’s system audit log" className="btn-outline !p-2" iconClassName="h-5 w-5" />
        )}
      />

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card text-center">
          <Server className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-xs uppercase text-concrete">Overall</p>
          <p className="text-xl font-bold text-steel capitalize mt-1">{isLoading ? '...' : status}</p>
        </div>
        <div className="card text-center">
          <Database className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-xs uppercase text-concrete">Database</p>
          <p className="text-xl font-bold text-steel mt-1">{services.database?.latencyMs ?? '—'} ms</p>
        </div>
        <div className="card text-center">
          <Cpu className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-xs uppercase text-concrete">Uptime</p>
          <p className="text-xl font-bold text-steel mt-1">{data?.uptime ? `${Math.floor(data.uptime / 3600)}h ${Math.floor((data.uptime % 3600) / 60)}m` : '—'}</p>
        </div>
        <div className="card text-center">
          <HardDrive className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-xs uppercase text-concrete">Heap used</p>
          <p className="text-xl font-bold text-steel mt-1">{formatBytes(mem.heapUsed)}</p>
        </div>
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold text-steel mb-2">Services</h3>
          {isLoading ? (
            <div className="h-32 animate-pulse bg-steel-50 rounded-xl" />
          ) : (
            <>
              <ServiceRow label="Database" status={services.database?.status} detail={`${services.database?.latencyMs || 0}ms round-trip`} />
              <ServiceRow label="AI (Groq)" status={services.ai?.status} detail={services.ai?.model} />
              <ServiceRow label="Email (SMTP)" status={services.email?.status} detail={services.email?.status === 'configured' ? 'Ready to send' : 'Not configured'} />
            </>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-steel mb-2">Environment</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-concrete">App</dt><dd className="text-steel font-medium">{data?.appName || 'BuildPlan AI'}</dd></div>
            <div className="flex justify-between"><dt className="text-concrete">Version</dt><dd className="text-steel">{data?.version || '1.0.0'}</dd></div>
            <div className="flex justify-between"><dt className="text-concrete">Environment</dt><dd className="text-steel capitalize">{data?.environment || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-concrete">Last check</dt><dd className="text-steel">{formatDateTime(data?.timestamp)}</dd></div>
            <div className="flex justify-between"><dt className="text-concrete">Node</dt><dd className="text-steel">{system.nodeVersion || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-concrete">Platform</dt><dd className="text-steel">{system.platform || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-concrete">CPU cores</dt><dd className="text-steel">{system.cpuCount || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-concrete">RSS memory</dt><dd className="text-steel">{formatBytes(mem.rss)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-steel">System audit (today)</h3>
          </div>
          <Link
            to={buildAuditLogsPath({ from: today, to: today })}
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            Full log with date & time <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {auditLoading ? (
          <div className="h-24 animate-pulse bg-steel-50 rounded-xl" />
        ) : recentAudit.length ? (
          <ul className="divide-y divide-steel-50">
            {recentAudit.map((row) => (
              <li key={row.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-steel">{row.action} · {row.entity_type || row.entityType || 'system'}</p>
                  <p className="text-xs text-concrete truncate">{row.userName}</p>
                </div>
                <span className="text-xs text-concrete whitespace-nowrap" title={formatDateTimeFull(row.createdAt)}>
                  {formatDateTimeFull(row.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-concrete py-4 text-center">No audit events recorded today yet.</p>
        )}
      </div>

      <div className="card text-sm text-concrete">
        <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> When email or AI is not configured, related features degrade gracefully — check your <code className="text-xs bg-steel-50 px-1 rounded">.env</code> and restart the API.</p>
      </div>
    </AdminPage>
  );
}
