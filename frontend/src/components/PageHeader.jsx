import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';

export default function PageHeader({ title, subtitle, action, breadcrumbs }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-5"
    >
      {breadcrumbs && (
        <nav className="mb-2 flex items-center gap-2 text-xs text-concrete-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-steel-300">/</span>}
              {crumb.path ? (
                <Link to={crumb.path} className="hover:text-primary transition-colors font-medium">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-steel-700 font-semibold">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-steel-800 md:text-xl tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-xs text-concrete-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    </motion.div>
  );
}

export function EmptyState({ icon: Icon = Building2, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-steel-50 mb-4 border border-steel-100">
        <Icon className="h-8 w-8 text-concrete-400" />
      </div>
      <h3 className="text-sm font-semibold text-steel-800">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-concrete-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const colors = {
    draft: 'badge-neutral',
    in_progress: 'badge-info',
    completed: 'badge-success',
    archived: 'badge-neutral',
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    low: 'badge-success',
    medium: 'badge-warning',
    high: 'badge-danger',
    critical: 'badge-danger',
    active: 'badge-success',
    inactive: 'badge-neutral',
    suspended: 'badge-danger',
  };

  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

  return <span className={colors[status] || 'badge-neutral'}>{label}</span>;
}

export function ProgressBar({ value, max = 100, showLabel = true, size = 'md', color = 'primary' }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  const colors = {
    primary: 'bg-primary',
    success: 'bg-success-500',
    warning: 'bg-safety-500',
  };

  return (
    <div>
      {showLabel && (
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-concrete-400">Progress</span>
          <span className="font-semibold text-steel-700">{percent.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full rounded-full bg-steel-100 ${heights[size]}`}>
        <div
          className={`rounded-full ${colors[color] || colors.primary} transition-all duration-700 ease-out ${heights[size]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function ActionButton({ to, onClick, children, variant = 'primary', icon: Icon }) {
  const classes = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
  };

  const content = (
    <>
      {children}
      {Icon && <Icon className="h-4 w-4" />}
    </>
  );

  if (to) {
    return <Link to={to} className={classes[variant]}>{content}</Link>;
  }

  return (
    <button onClick={onClick} className={classes[variant]}>
      {content}
    </button>
  );
}
