import { motion } from 'framer-motion';
import { ResponsiveContainer } from 'recharts';

export default function ChartCard({ title, subtitle, children, action, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`w-full min-w-0 rounded-2xl bg-white border border-steel-100 p-6 shadow-card transition-all duration-200 hover:shadow-card-hover ${className}`}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-steel-800">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-concrete-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
