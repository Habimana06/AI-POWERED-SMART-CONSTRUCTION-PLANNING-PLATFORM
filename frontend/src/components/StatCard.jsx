import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { classNames } from '../utils/helpers';

const accentColors = {
  primary: 'bg-primary/10 text-primary-600 border-primary/20',
  safety: 'bg-safety-50 text-safety-700 border-safety-100',
  success: 'bg-success-50 text-success-600 border-success-100',
  danger: 'bg-danger-50 text-danger-600 border-danger-100',
  steel: 'bg-steel-50 text-steel-600 border-steel-100',
};

export default function StatCard({ title, value, icon: Icon, change, changeType, subtitle, accent = 'primary', className }) {
  const isPositive = changeType === 'positive';
  const accentStyle = accentColors[accent] || accentColors.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={classNames('group relative overflow-hidden rounded-xl bg-white border border-steel-100 p-4 transition-all duration-200 hover:shadow-card-hover hover:border-steel-200', className)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-concrete-400 tracking-wide uppercase">{title}</p>
          <p className="mt-1 text-xl font-bold text-steel-800 tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-concrete-400 font-medium">{subtitle}</p>}
          {change != null && (
            <div className={classNames(
              'mt-3 inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg',
              isPositive ? 'text-success-700 bg-success-50' : 'text-danger-700 bg-danger-50'
            )}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {change}
            </div>
          )}
        </div>
        {Icon && (
          <div className={classNames('flex h-9 w-9 items-center justify-center rounded-lg border', accentStyle)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-steel-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}
