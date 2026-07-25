import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { notificationsAPI } from '../services/api';
import { formatDateTime } from '../utils/helpers';

export default function NotificationBell() {
  const { user } = useAuth();
  const notifPath = user?.role === 'contractor' ? '/contractor/notifications' : user?.role === 'admin' ? '/admin/notifications' : '/pm/notifications';
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll({ limit: 20 }),
    refetchInterval: 60000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications || data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const typeColors = {
    info: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-safety/20 text-steel-700',
    error: 'bg-danger/10 text-danger',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative btn-ghost !p-2.5 rounded-xl transition-colors"
      >
        <Bell className="h-5 w-5 text-steel-500" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-96 rounded-2xl bg-white shadow-dropdown border border-steel-100 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-steel-100 px-4 py-3">
              <h3 className="font-semibold text-steel-800 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary-600 font-medium transition-colors"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-concrete-400">No notifications</p>
              ) : (
                notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex gap-3 border-b border-steel-50 px-4 py-3 transition-colors hover:bg-steel-50/60 ${
                      !notif.isRead ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${typeColors[notif.type] || typeColors.info}`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-steel-700">{notif.title}</p>
                      <p className="text-xs text-concrete-400 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-concrete-300 mt-1">{formatDateTime(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(notif.id)}
                        className="shrink-0 btn-ghost !p-1.5 rounded-lg"
                      >
                        <Check className="h-4 w-4 text-primary" />
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
            <div className="border-t border-steel-100 p-2 text-center">
              <Link to={notifPath} onClick={() => setOpen(false)} className="text-xs font-semibold text-primary hover:underline">
                View all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
