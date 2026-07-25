import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  HardHat, FolderKanban, ClipboardCheck, Package, AlertCircle, Star, Briefcase,
} from 'lucide-react';
import { authAPI, contractorAPI, profileAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials, getFullName, formatCurrency, formatNumber } from '../../utils/helpers';
import { ROLE_LABELS } from '../../utils/constants';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export default function ContractorProfile() {
  const { user, updateUser, fetchProfile } = useAuth();
  const [tab, setTab] = useState('profile');

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: authAPI.getProfile,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['contractor-dashboard'],
    queryFn: contractorAPI.getDashboard,
  });

  const contractor = profileData?.contractor;
  const stats = dashboardData?.stats || {};

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' },
  });

  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const profileMutation = useMutation({
    mutationFn: profileAPI.update,
    onSuccess: async (data) => {
      updateUser(data.user || data);
      await fetchProfile();
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: profileAPI.updatePassword,
    onSuccess: () => { toast.success('Password updated'); passwordForm.reset(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update password'),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Profile & Settings" subtitle="Manage your account and contractor details" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Assigned Projects" value={formatNumber(stats.assignedProjects ?? 0)} icon={FolderKanban} />
        <StatCard title="Active Tasks" value={formatNumber(stats.tasksToday ?? 0)} icon={ClipboardCheck} />
        <StatCard title="Material Requests" value={formatNumber(stats.pendingMaterials ?? 0)} icon={Package} />
        <StatCard title="Open Issues" value={formatNumber(stats.openIssues ?? 0)} icon={AlertCircle} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="card text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-steel">{getFullName(user)}</h3>
            <p className="text-sm text-concrete">{user?.email}</p>
            <span className="badge-info mt-3">{ROLE_LABELS[user?.role]}</span>
          </div>

          {contractor && (
            <div className="card space-y-3">
              <h4 className="font-semibold text-steel flex items-center gap-2">
                <HardHat className="h-4 w-4 text-primary" /> Contractor Profile
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-concrete">Specialty</dt>
                  <dd className="font-medium text-steel">{contractor.specialty || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-concrete">License</dt>
                  <dd className="font-medium text-steel">{contractor.licenseNumber || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-concrete">Experience</dt>
                  <dd className="font-medium text-steel">{contractor.experienceYears ?? 0} years</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-concrete">Hourly Rate</dt>
                  <dd className="font-medium text-steel">{formatCurrency(contractor.hourlyRate)}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-concrete">Rating</dt>
                  <dd className="font-medium text-steel flex items-center gap-1">
                    <Star className="h-4 w-4 text-primary fill-primary" /> {contractor.rating?.toFixed(1) || '0.0'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-concrete">Availability</dt>
                  <dd className="font-medium text-steel capitalize">{contractor.availability || '—'}</dd>
                </div>
                {contractor.companyName && (
                  <div className="flex justify-between">
                    <dt className="text-concrete flex items-center gap-1"><Briefcase className="h-3 w-3" /> Company</dt>
                    <dd className="font-medium text-steel">{contractor.companyName}</dd>
                  </div>
                )}
              </dl>
              {contractor.bio && (
                <p className="text-sm text-concrete border-t border-steel-100 pt-3">{contractor.bio}</p>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card">
          <div className="flex gap-4 border-b border-steel-100 mb-6">
            {['profile', 'password'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-primary text-primary' : 'text-concrete'}`}
              >
                {t === 'profile' ? 'Personal Info' : 'Change Password'}
              </button>
            ))}
          </div>

          {tab === 'profile' ? (
            <form onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">First Name</label>
                  <input {...profileForm.register('firstName')} className="input" />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input {...profileForm.register('lastName')} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...profileForm.register('phone')} className="input" />
              </div>
              <div>
                <label className="label">Email</label>
                <input value={user?.email || ''} disabled className="input opacity-60 cursor-not-allowed" />
              </div>
              <button type="submit" className="btn-primary" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <form onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate({ currentPassword: d.currentPassword, newPassword: d.newPassword }))} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input {...passwordForm.register('currentPassword')} type="password" className="input" />
              </div>
              <div>
                <label className="label">New Password</label>
                <input {...passwordForm.register('newPassword')} type="password" className="input" />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input {...passwordForm.register('confirmPassword')} type="password" className="input" />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-danger">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <button type="submit" className="btn-primary" disabled={passwordMutation.isPending}>Update Password</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
