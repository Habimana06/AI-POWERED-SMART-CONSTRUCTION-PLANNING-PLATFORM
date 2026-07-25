import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, User, Shield } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatDateTimeFull } from '../../utils/helpers';
import { auditLogUser } from '../../utils/adminHelpers';
import { auditEventCategory, AUDIT_CATEGORY_LABELS, auditCategoryBadgeStatus } from '../../utils/auditHelpers';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import AdminPage from '../../components/AdminPage';

function parseJsonField(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

export default function AuditLogDetail() {
  const { logId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-log', logId],
    queryFn: () => adminAPI.getAuditLogById(logId),
    enabled: !!logId,
  });

  const row = data?.log || data;
  const createdAt = row?.created_at || row?.createdAt;
  const category = auditEventCategory(row?.action);
  const detailNew = parseJsonField(row?.new_values || row?.newValues);
  const detailOld = parseJsonField(row?.old_values || row?.oldValues);

  if (isLoading) {
    return (
      <AdminPage>
        <div className="h-48 animate-pulse rounded-2xl bg-steel-50" />
      </AdminPage>
    );
  }

  if (isError || !row?.id) {
    return (
      <AdminPage>
        <div className="card text-center py-16">
          <p className="text-steel">Audit event not found</p>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate('/admin/audit-logs')}>
            Back to audit logs
          </button>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title="Audit event detail"
        subtitle={`${AUDIT_CATEGORY_LABELS[category]} · recorded ${formatDateTimeFull(createdAt)}`}
        action={(
          <Link to="/admin/audit-logs" className="btn-outline inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> All logs
          </Link>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Clock className="h-5 w-5" />
            <div>
              <p className="text-xs uppercase text-concrete font-semibold">Date & time</p>
              <p className="text-sm font-bold text-steel">{formatDateTimeFull(createdAt)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase text-concrete font-semibold">User</p>
              <p className="text-sm font-medium text-steel">{auditLogUser(row)}</p>
              {row.email && <p className="text-xs text-concrete">{row.email}</p>}
              {row.user_id && (
                <Link to={`/admin/audit-logs?userId=${row.user_id}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                  View all activity for this user
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase text-concrete font-semibold">Category</p>
              <StatusBadge status={auditCategoryBadgeStatus(category)} />
              <p className="text-xs text-concrete mt-1">{AUDIT_CATEGORY_LABELS[category]}</p>
            </div>
          </div>
        </div>

        <div className="card lg:col-span-2 space-y-4">
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-concrete text-xs uppercase">Action</dt>
              <dd className="font-semibold text-steel text-base mt-0.5">{row.action}</dd>
            </div>
            <div>
              <dt className="text-concrete text-xs uppercase">Entity</dt>
              <dd className="text-steel mt-0.5">{row.entity_type || row.entityType || '—'}</dd>
            </div>
            <div>
              <dt className="text-concrete text-xs uppercase">Entity ID</dt>
              <dd className="text-steel font-mono text-xs mt-0.5 break-all">{row.entity_id || row.entityId || '—'}</dd>
            </div>
            <div>
              <dt className="text-concrete text-xs uppercase">IP address</dt>
              <dd className="text-steel mt-0.5">{row.ip_address || row.ipAddress || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-concrete text-xs uppercase">User agent</dt>
              <dd className="text-steel text-xs mt-0.5 break-all">{row.user_agent || row.userAgent || '—'}</dd>
            </div>
          </dl>

          {category === 'user_activity' && (
            <p className="text-sm text-concrete rounded-lg bg-steel-50 px-3 py-2">
              This is a sign-in or sign-out event — no project payload is stored.
            </p>
          )}

          {category === 'data_change' && (
            <>
              {detailOld && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-concrete mb-2">Previous values</h4>
                  <pre className="text-xs bg-steel-50 rounded-xl p-4 overflow-auto max-h-48 border border-steel-100">{JSON.stringify(detailOld, null, 2)}</pre>
                </div>
              )}
              {detailNew ? (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-concrete mb-2">Change payload</h4>
                  <pre className="text-xs bg-steel-50 rounded-xl p-4 overflow-auto max-h-96 border border-steel-100">{JSON.stringify(detailNew, null, 2)}</pre>
                </div>
              ) : (
                <p className="text-sm text-concrete">No structured payload stored for this change.</p>
              )}
            </>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
