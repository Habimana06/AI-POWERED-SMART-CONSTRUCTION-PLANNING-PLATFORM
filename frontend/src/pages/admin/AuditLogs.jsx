import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ScrollText, User } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatDateTimeFull, getFullName } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';
import PageHeader from '../../components/PageHeader';
import AdminPage from '../../components/AdminPage';
import UserAvatar from '../../components/UserAvatar';
import { ORGANIZATION_NAME } from '../../utils/constants';

export default function AdminAuditLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-users'],
    queryFn: adminAPI.getAuditUserSummaries,
  });

  const users = data?.users || [];

  return (
    <AdminPage>
      <PageHeader
        title="Audit Logs"
        subtitle="Select a user to view their full activity timeline (date & time)"
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-steel-50" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center py-16 text-concrete">No users found</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                to={`/admin/audit-logs/user/${u.id}`}
                className="card flex items-center gap-4 hover:border-primary/40 transition-all group"
              >
                <UserAvatar user={u} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-steel truncate group-hover:text-primary transition-colors">
                    {getFullName(u)}
                  </p>
                  <p className="text-xs text-concrete truncate">{u.email}</p>
                  <p className="text-[10px] text-concrete mt-1">{ROLE_LABELS[u.role] || u.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-steel">{u.eventCount ?? 0}</p>
                  <p className="text-[10px] uppercase text-concrete">events</p>
                  {u.lastActivity && (
                    <p className="text-[10px] text-concrete mt-1 max-w-[120px] truncate" title={formatDateTimeFull(u.lastActivity)}>
                      Last: {formatDateTimeFull(u.lastActivity)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-concrete group-hover:text-primary shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-concrete flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-primary" />
        All projects belong to your organization ({ORGANIZATION_NAME}) — one company for every project.
      </p>
    </AdminPage>
  );
}
