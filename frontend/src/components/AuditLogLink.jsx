import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { classNames } from '../utils/helpers';
import { buildAuditLogsPath, todayISO } from '../utils/auditLogFilters';

/**
 * Audit log icon — opens filtered audit trail (per user and/or date range).
 */
export default function AuditLogLink({
  userId,
  from,
  to,
  className = '',
  iconClassName = 'h-4 w-4',
  title = 'Open audit log',
  useToday = false,
}) {
  const path = userId
    ? `/admin/audit-logs/user/${userId}`
    : '/admin/audit-logs';

  return (
    <Link
      to={path}
      className={classNames(
        'inline-flex items-center justify-center rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors',
        className,
      )}
      title={title}
      aria-label={title}
    >
      <ScrollText className={iconClassName} />
    </Link>
  );
}
