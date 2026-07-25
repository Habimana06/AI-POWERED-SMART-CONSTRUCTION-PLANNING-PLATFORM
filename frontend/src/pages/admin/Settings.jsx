import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { flattenSettings } from '../../utils/adminHelpers';
import PageHeader from '../../components/PageHeader';
import AdminPage from '../../components/AdminPage';

const FIELDS = [
  { key: 'siteName', label: 'Site name', type: 'text' },
  { key: 'supportEmail', label: 'Support email', type: 'email' },
  { key: 'defaultCurrency', label: 'Default currency', type: 'text' },
  { key: 'aiEnabled', label: 'AI features', type: 'checkbox' },
  { key: 'maintenanceMode', label: 'Maintenance mode', type: 'checkbox' },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminAPI.getSettings,
  });

  useEffect(() => {
    if (data) setForm(flattenSettings(data));
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: adminAPI.updateSettings,
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save settings'),
  });

  return (
    <AdminPage>
      <PageHeader title="System Settings" subtitle="Light platform defaults — users manage profile, password, MFA, and notifications in Profile" />
      <div className="grid w-full gap-6 lg:grid-cols-2">
        <div className="card text-sm text-concrete">
          <p>End-user preferences (name, email, SMS, two-factor authentication, notification toggles) are edited on the shared <strong className="text-steel">Profile</strong> and <strong className="text-steel">Notifications</strong> pages for every role.</p>
        </div>
        <div className="card space-y-5">
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-steel-100" />)}</div>
        ) : (
          FIELDS.map((field) => (
            <div key={field.key}>
              <label className="label">{field.label}</label>
              {field.type === 'checkbox' ? (
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
                    className="h-5 w-5 rounded border-steel-200 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-concrete">Enable</span>
                </label>
              ) : (
                <input
                  type={field.type}
                  value={form[field.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="input"
                />
              )}
            </div>
          ))
        )}
        <button type="button" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending || isLoading} className="btn-primary">
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
        </div>
      </div>
    </AdminPage>
  );
}
