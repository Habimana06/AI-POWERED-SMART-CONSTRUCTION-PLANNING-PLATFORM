import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { messagesAPI, projectsAPI, contractorAPI, adminAPI, usersAPI } from '../../services/api';
import { formatDateTime, getFullName } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';
import PageHeader from '../../components/PageHeader';

export default function Messages({ basePath = '/pm' }) {
  const [selected, setSelected] = useState(null);
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', recipientId: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => messagesAPI.getAll(),
  });

  const sendMutation = useMutation({
    mutationFn: messagesAPI.send,
    onSuccess: () => {
      toast.success('Message sent');
      setCompose(false);
      setForm({ subject: '', body: '', recipientId: '' });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => toast.error('Failed to send message'),
  });

  const { data: usersData } = useQuery({
    queryKey: ['message-recipients', basePath],
    queryFn: async () => {
      if (basePath.startsWith('/admin')) {
        try {
          const adminRec = await adminAPI.getMessageRecipients();
          if (adminRec?.recipients?.length) return adminRec;
        } catch { /* fall through */ }
        const all = await usersAPI.getAll({ page: 1, limit: 200 });
        return {
          recipients: (all?.users || []).map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role,
          })),
        };
      }
      if (basePath.startsWith('/contractor')) return contractorAPI.getMessageRecipients();
      return projectsAPI.getContractors();
    },
    enabled: true,
  });

  const recipientOptions = basePath.startsWith('/admin')
    ? (usersData?.recipients || []).map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      label: `${getFullName(u)} (${ROLE_LABELS[u.role] || u.role})`,
    }))
    : basePath.startsWith('/contractor')
    ? (usersData?.recipients || []).map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      label: u.projectName ? `${u.firstName} ${u.lastName} (${u.projectName})` : undefined,
    }))
    : (usersData?.contractors || []).map((c) => ({
      id: c.user_id || c.userId,
      firstName: c.first_name || c.firstName,
      lastName: c.last_name || c.lastName,
      email: c.email,
    })).filter((u) => u.id);
  const messages = data?.messages || data || [];

  return (
    <div>
      <PageHeader title="Messages" subtitle={basePath.startsWith('/admin') ? 'Message any role on the platform' : 'Project communication hub'} action={<button onClick={() => setCompose(true)} className="btn-primary"><Send className="h-4 w-4" /> Compose</button>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card !p-0 overflow-hidden">
          <div className="border-b border-steel-100 px-4 py-3 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <span className="font-semibold text-steel">Inbox</span>
            <span className="badge-info ml-auto">{messages.length}</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {isLoading ? <div className="p-4"><div className="h-16 animate-pulse rounded-xl bg-steel-100" /></div> : messages.length ? messages.map((msg) => (
              <button key={msg.id} onClick={() => setSelected(msg)} className={`w-full text-left px-4 py-3 border-b border-steel-50 hover:bg-steel-50 transition-colors ${selected?.id === msg.id ? 'bg-primary/5' : ''} ${!msg.isRead ? 'font-medium' : ''}`}>
                <p className="text-sm text-steel truncate">{msg.subject}</p>
                <p className="text-xs text-concrete mt-0.5">{formatDateTime(msg.createdAt)}</p>
              </button>
            )) : <p className="p-4 text-sm text-concrete">No messages</p>}
          </div>
        </div>

        <div className="lg:col-span-2 card">
          {compose ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-steel">New Message</h3>
              <label className="label">To</label>
              <select value={form.recipientId} onChange={(e) => setForm({ ...form, recipientId: e.target.value })} className="input">
                <option value="">Select recipient...</option>
                {recipientOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label || `${getFullName(u)} (${u.email})`}
                  </option>
                ))}
              </select>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input" placeholder="Subject" />
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={8} className="input resize-none" placeholder="Write your message..." />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!form.recipientId) return toast.error('Select a recipient');
                    sendMutation.mutate({ ...form, recipientId: form.recipientId });
                  }}
                  disabled={sendMutation.isPending}
                  className="btn-primary"
                >
                  Send
                </button>
                <button onClick={() => setCompose(false)} className="btn-outline">Cancel</button>
              </div>
            </div>
          ) : selected ? (
            <div>
              <h3 className="text-lg font-semibold text-steel">{selected.subject}</h3>
              <p className="text-xs text-concrete mt-1">{formatDateTime(selected.createdAt)}</p>
              <div className="mt-6 text-steel leading-relaxed whitespace-pre-wrap">{selected.body}</div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-concrete">Select a message to read</div>
          )}
        </div>
      </div>
    </div>
  );
}
