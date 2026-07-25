import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BRAND_ASSETS, RESOURCE_HERO } from '../components/BrandLogo';

const LOGIN_IMAGE = RESOURCE_HERO.login1 || '/resources/login/login1.jpg';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen max-h-screen overflow-hidden bg-concrete-50">
      <div className="hidden lg:flex lg:w-[44%] xl:w-[46%] relative overflow-hidden bg-steel-900 max-h-screen">
        <img
          src={LOGIN_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          onError={(e) => {
            e.currentTarget.src = BRAND_ASSETS.hero;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-steel-900/88 via-steel-900/50 to-primary/35" />
        <div className="relative z-10 flex flex-col justify-end p-10 xl:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 border border-white/15 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-semibold text-white/90 uppercase tracking-widest">Secure sign-in</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight max-w-md">
              Plan, design, and deliver with BuildPlan AI
            </h1>
            <p className="mt-3 text-sm text-steel-200 max-w-sm leading-relaxed">
              3D design, scheduling, costs, and site monitoring in one free workspace.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex w-full lg:w-[56%] xl:w-[54%] items-center justify-center bg-gradient-to-b from-white to-concrete-50 p-6 sm:p-8 overflow-y-auto max-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-[400px] py-4"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
