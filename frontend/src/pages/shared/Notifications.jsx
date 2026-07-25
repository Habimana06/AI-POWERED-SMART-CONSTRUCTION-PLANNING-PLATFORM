import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../../services/api';
import { formatDateTime } from '../../utils/helpers';
import PageHeader from '../../components/PageHeader';

export default function Notifications({ basePath = '/pm' }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll({ limit: 50 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const list = data?.notifications || data || [];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Updates from contractors, materials, progress, and system events"
        action={
          <button type="button" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending} className="btn-outline inline-flex items-center gap-2">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        }
      />

      <div className="card divide-y divide-steel-100">
        {isLoading ? (
          <div className="p-8 animate-pulse bg-steel-50 rounded-xl m-4 h-32" />
        ) : list.length ? list.map((n) => (
          <div key={n.id} className={`flex gap-4 p-4 ${n.is_read || n.isRead ? 'bg-white' : 'bg-primary/5'}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-steel-100">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-steel">{n.title}</p>
              <p className="text-sm text-concrete mt-1">{n.message}</p>
              <p className="text-xs text-concrete mt-2">{formatDateTime(n.created_at || n.createdAt)}</p>
            </div>
            {!(n.is_read || n.isRead) && (
              <button type="button" onClick={() => markReadMutation.mutate(n.id)} className="text-xs font-semibold text-primary shrink-0">
                Mark read
              </button>
            )}
          </div>
        )) : (
          <p className="p-8 text-center text-concrete">No notifications yet</p>
        )}
      </div>

      <p className="text-xs text-concrete mt-4 flex items-center gap-1">
        <ExternalLink className="h-3 w-3" /> Also check the bell icon in the top bar · <Link to={`${basePath}/monitoring`} className="text-primary hover:underline">Project monitoring</Link>
      </p>
    </div>
  );
}
