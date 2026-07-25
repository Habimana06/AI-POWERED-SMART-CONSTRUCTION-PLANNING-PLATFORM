import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { ProjectProvider } from '../contexts/ProjectContext';

import { useDashboardTheme, ThemeProvider } from '../contexts/ThemeContext';
import { classNames } from '../utils/helpers';

function DashboardShell({ user, collapsed, setCollapsed, mobileOpen, setMobileOpen, location }) {
  const { theme } = useDashboardTheme();
  const isDark = theme === 'dark';
  return (
    <div className={classNames('min-h-screen overflow-x-hidden transition-colors duration-500', isDark ? 'bg-black' : 'bg-concrete-50')}>
      <Sidebar role={user?.role} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} darkMode={isDark} />
      <div
        className={`min-h-screen flex flex-col min-w-0 overflow-x-hidden transition-[margin,background-color] duration-500 dashboard-content-root ${
          theme === 'dark' ? 'dashboard-dark' : ''
        } ${collapsed ? 'ml-[5.5rem]' : 'ml-72'}`}
      >
        <Navbar onMenuToggle={() => setMobileOpen(!mobileOpen)} showMenu />
        <main className="flex-1 p-4 lg:p-6 xl:p-8 min-w-0 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="min-w-0"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-steel-900/20 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-40 w-72 lg:hidden"
            >
              <Sidebar role={user?.role} collapsed={false} onToggle={() => setMobileOpen(false)} darkMode={isDark} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const shell = (
    <DashboardShell
      user={user}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      mobileOpen={mobileOpen}
      setMobileOpen={setMobileOpen}
      location={location}
    />
  );

  if (user?.role === 'project_manager') {
    return (
      <ThemeProvider>
        <ProjectProvider>{shell}</ProjectProvider>
      </ThemeProvider>
    );
  }

  return <ThemeProvider>{shell}</ThemeProvider>;
}
