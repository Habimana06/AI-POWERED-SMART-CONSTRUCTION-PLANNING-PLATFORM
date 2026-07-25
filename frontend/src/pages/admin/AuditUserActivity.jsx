import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Download, Loader2 } from 'lucide-react';
import { adminAPI, usersAPI } from '../../services/api';
import { formatDateTimeFull, getFullName } from '../../utils/helpers';
import { auditEventCategory, AUDIT_CATEGORY_LABELS } from '../../utils/auditHelpers';
import { describeAuditActivity, auditActivityDetail } from '../../utils/auditActivityCopy';
import { exportAuditLogsCsv } from '../../utils/adminSystemReportExport';
import { logUserActivity } from '../../utils/auditClient';
import {
  loadStoredAuditFilters,
  persistAuditFilters,
  readAuditFiltersFromSearchParams,
  syncSearchParams,
} from '../../utils/auditLogFilters';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import AdminPage from '../../components/AdminPage';
import UserAvatar from '../../components/UserAvatar';
import { useSearchParams } from 'react-router-dom';

function categoryStatus(cat) {
  if (cat === 'user_activity') return 'in_progress';
  if (cat === 'data_change') return 'approved';
  return 'pending';
}

export default function AuditUserActivity() {
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fromDate, setFromDate] = useState(searchParams.get('from') || '');
  const [toDate, setToDate] = useState(searchParams.get('to') || '');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const stored = loadStoredAuditFilters();
    if (!searchParams.get('from') && stored.from) setFromDate(stored.from);
    if (!searchParams.get('to') && stored.to) setToDate(stored.to);
  }, [searchParams]);

  const { data: usersData } = useQuery({
    queryKey: ['users-audit-filter'],
    queryFn: () => usersAPI.getAll({ page: 1, limit: 100 }),
  });

  const user = (usersData?.users || []).find((u) => u.id === userId);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-user-logs', userId, page, fromDate, toDate],
    queryFn: () => adminAPI.getAuditLogs({
      page,
      limit: 40,
      userId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    enabled: !!userId,
  });

  const logs = (data?.auditLogs || []).map((row) => ({
    ...row,
    createdAt: row.created_at || row.createdAt,
  }));

  const pagination = data?.pagination;

  const applyDates = (from, to) => {
    setFromDate(from);
    setToDate(to);
    setPage(1);
    persistAuditFilters({ userId, from, to });
    syncSearchParams(setSearchParams, { userId, from, to });
  };

  const downloadCsv = async () => {
    const res = await adminAPI.getAuditLogs({
      page: 1,
      limit: 500,
      userId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    exportAuditLogsCsv(res?.auditLogs || [], `audit-${userId}`);
    logUserActivity('DOWNLOAD_EXPORT_CSV', { scope: 'audit-user', userId, fromDate, toDate });
  };

  return (
    <AdminPage>
      <PageHeader
        title={user ? `${getFullName(user)} — activity` : 'User activity'}
        subtitle="Chronological audit trail · date and time for every action"
        action={(
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/audit-logs" className="btn-outline inline-flex items-center gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" /> All users
            </Link>
            <button type="button" className="btn-outline inline-flex items-center gap-2 text-sm" onClick={downloadCsv}>
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        )}
      />

      {user && (
        <div className="card mb-6 flex flex-wrap items-center gap-4">
          <UserAvatar user={user} size="md" />
          <div>
            <p className="font-semibold text-steel">{getFullName(user)}</p>
            <p className="text-sm text-concrete">{user.email}</p>
          </div>
        </div>
      )}

      <div className="card mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">From date</label>
          <input type="date" className="input" value={fromDate} onChange={(e) => applyDates(e.target.value, toDate)} />
        </div>
        <div>
          <label className="label">To date</label>
          <input type="date" className="input" value={toDate} min={fromDate || undefined} onChange={(e) => applyDates(fromDate, e.target.value)} />
        </div>
        {(fromDate || toDate) && (
          <button type="button" className="btn-outline text-sm" onClick={() => applyDates('', '')}>Clear dates</button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-16 text-concrete">No activity in this range</div>
      ) : (
        <ol className="relative border-l-2 border-primary/30 ml-3 space-y-0">
          {logs.map((row) => {
            const cat = auditEventCategory(row.action);
            const detail = auditActivityDetail(row);
            return (
              <li key={row.id} className="mb-8 ml-6">
                <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-white dashboard-dark:ring-black" />
                <time className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTimeFull(row.createdAt)}
                </time>
                <div className="card mt-2 !p-4 border-l-4 border-l-primary/50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-bold text-steel">{describeAuditActivity(row)}</p>
                    <StatusBadge status={categoryStatus(cat)} />
                  </div>
                  <p className="text-[11px] text-concrete mt-1">{AUDIT_CATEGORY_LABELS[cat]}</p>
                  {detail && (
                    <p className="text-xs text-steel mt-2 leading-relaxed">{detail}</p>
                  )}
                  {cat === 'user_activity' && row.action !== 'LOGIN' && row.action !== 'LOGOUT' && (
                    <p className="text-xs text-concrete mt-2 italic">Account or security activity.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {pagination && pagination.total > pagination.limit && (
        <div className="flex justify-center gap-3 mt-8">
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-concrete self-center">
            Page {page} · {pagination.total} events
            {isFetching && ' …'}
          </span>
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page * pagination.limit >= pagination.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </AdminPage>
  );
}
