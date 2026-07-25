import { motion } from 'framer-motion';
import BrandLogo from './BrandLogo';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-concrete-50 to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex flex-col items-center gap-8 px-6"
      >
        <div className="relative">
          <div className="absolute -inset-8 rounded-3xl bg-primary/15 blur-2xl animate-pulse" />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <BrandLogo asLink={false} showText={false} imageClassName="h-20 w-20 shadow-glow-primary" />
          </motion.div>
        </div>
        <div className="text-center max-w-xs">
          <p className="text-base font-bold text-steel-800">BuildPlan AI</p>
          <p className="text-sm font-medium text-concrete mt-1">{message}</p>
          <motion.div
            animate={{ width: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-4 h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-primary to-orange-400"
          />
        </div>
      </motion.div>
    </div>
  );
}
