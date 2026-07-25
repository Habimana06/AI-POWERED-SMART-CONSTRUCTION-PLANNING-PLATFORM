import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, LogOut, User, ChevronDown, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardTheme } from '../contexts/ThemeContext';
import NotificationBell from './NotificationBell';
import BrandLogo from './BrandLogo';
import UserAvatar from './UserAvatar';
import { getFullName } from '../utils/helpers';
import { ROLE_LABELS } from '../utils/constants';

export default function Navbar({ onMenuToggle, showMenu = false }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useDashboardTheme();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const profilePath = user?.role === 'admin'
    ? '/admin/profile'
    : user?.role === 'project_manager'
    ? '/pm/profile'
    : '/contractor/profile';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-steel-100 bg-white/80 backdrop-blur-xl px-6 supports-[backdrop-filter]:bg-white/70 dashboard-navbar">
      <div className="flex items-center gap-4">
        {showMenu && (
          <button onClick={onMenuToggle} className="btn-ghost !p-2 lg:hidden hover:bg-steel-50">
            <Menu className="h-5 w-5 text-steel-500" />
          </button>
        )}
        <BrandLogo
          to="/"
          showText={false}
          imageClassName="h-9 w-9 lg:hidden"
          className="lg:hidden"
        />
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block"
        >
          <h1 className="text-sm font-semibold text-steel-800">
            Welcome back, <span className="text-primary">{user?.firstName || 'User'}</span>
          </h1>
          <p className="text-[10px] text-concrete-400 font-medium tracking-wide">{ROLE_LABELS[user?.role] || 'User'}</p>
        </motion.div>
        {showMenu && (
          <div className="sm:hidden">
            <h1 className="text-sm font-semibold text-steel-800">{user?.firstName || 'User'}</h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="btn-ghost !p-2 rounded-xl"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-steel-600" />}
        </button>
        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-steel-50 transition-colors border border-transparent hover:border-steel-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shrink-0">
              <UserAvatar user={user} size="sm" className="!h-9 !w-9" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-steel-800">{getFullName(user)}</p>
              <p className="text-[10px] text-concrete-400">{user?.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-concrete-400 hidden md:block" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-white shadow-dropdown border border-steel-100 py-1.5"
              >
                <Link
                  to={profilePath}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-steel-600 hover:bg-steel-50 transition-colors"
                >
                  <User className="h-4 w-4 text-concrete-400" /> Profile
                </Link>
                <div className="my-1.5 mx-3 h-px bg-steel-100" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
