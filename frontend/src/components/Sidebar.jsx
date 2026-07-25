import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, FolderKanban, Building2, BarChart3, ScrollText, Settings,
  PlusCircle, Bot, Box, PenTool, FileImage, Calendar, DollarSign, AlertTriangle,
  Activity, HardHat, FileText, MessageSquare, ClipboardCheck, Package, AlertCircle,
  TrendingUp, ClipboardList, ChevronLeft, ChevronRight, User, Bell, Quote,
} from 'lucide-react';
import { NAV_ITEMS } from '../utils/constants';
import { classNames } from '../utils/helpers';
import BrandLogo from './BrandLogo';

const iconMap = {
  LayoutDashboard, Users, FolderKanban, Building2, BarChart3, ScrollText, Settings,
  PlusCircle, Bot, Box, PenTool, FileImage, Calendar, DollarSign, AlertTriangle,
  Activity, HardHat, FileText, MessageSquare, ClipboardCheck, Package, AlertCircle,
  TrendingUp, ClipboardList, User, Bell, Quote,
};

export default function Sidebar({ role, collapsed, onToggle, darkMode = false }) {
  const location = useLocation();
  const items = NAV_ITEMS[role] || [];

  return (
    <aside
      className={classNames(
        'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-500 shrink-0 sidebar-shell',
        darkMode
          ? 'bg-gradient-to-b from-black via-[#0a0804] to-black border-r-2 border-primary/35 shadow-[inset_4px_0_24px_rgba(230,126,34,0.12)]'
          : 'border-r border-black/20 bg-black',
        collapsed ? 'w-[5.5rem]' : 'w-72',
      )}
    >
      {darkMode && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent animate-pulse opacity-40" aria-hidden />
      )}
      <div className="relative flex h-[4.25rem] items-center gap-3 border-b border-white/10 px-4">
        <BrandLogo
          to="/"
          showText={!collapsed}
          variant="dark"
          subtitle="Construction"
          imageClassName="h-11 w-11"
          className={classNames('min-w-0', collapsed && 'justify-center w-full')}
          textClassName={collapsed ? 'hidden' : ''}
        />
      </div>

      <nav className="relative flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={classNames(
                'group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold transition-all duration-200 relative',
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : darkMode
                    ? 'text-white/80 hover:bg-primary/15 hover:text-primary border border-transparent hover:border-primary/25'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={classNames(
                'h-5 w-5 shrink-0 transition-colors',
                isActive ? 'text-white' : 'text-white/50 group-hover:text-primary'
              )} />
              {!collapsed && <span className="leading-snug">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-white/55 hover:bg-white/10 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
