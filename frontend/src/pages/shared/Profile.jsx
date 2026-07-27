import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Shield, Upload, Mail, HardHat, BadgeCheck } from 'lucide-react';
import { authAPI, profileAPI, contractorAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials, getFullName } from '../../utils/helpers';
import { AVATAR_CHARACTERS, resolveAvatarCharacterId } from '../../utils/avatarCharacters';
import { ROLE_LABELS } from '../../utils/constants';
import UserAvatar from '../../components/UserAvatar';
import PageHeader from '../../components/PageHeader';
import { ChevronDown } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

function prefsKey(userId) {
  return `buildplan-user-prefs-${userId}`;
}

export default function Profile() {
  const { user, updateUser, fetchProfile } = useAuth();
  const [tab, setTab] = useState('profile');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [contractorForm, setContractorForm] = useState({
    specialty: '', licenseNumber: '', experienceYears: 0, hourlyRate: 0, availability: 'available', bio: '',
  });

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      jobTitle: '',
      department: '',
      bio: '',
    },
  });

  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['auth-profile'],
    queryFn: authAPI.getProfile,
    enabled: !!user?.id,
  });

  const contractorInfo = profileData?.contractor;

  useEffect(() => {
    const u = profileData?.user || profileData;
    if (!u?.id && !user?.id) return;
    const prefs = user?.id ? JSON.parse(localStorage.getItem(prefsKey(user.id)) || '{}') : {};
    profileForm.reset({
      firstName: u?.firstName || user?.firstName || '',
      lastName: u?.lastName || user?.lastName || '',
      email: u?.email || user?.email || '',
      phone: u?.phone || user?.phone || '',
      jobTitle: u?.jobTitle || prefs.jobTitle || '',
      department: u?.department || prefs.department || '',
      bio: prefs.bio || '',
    });
  }, [profileData, user?.id, user?.firstName, user?.lastName, user?.email, user?.phone, profileForm]);

  useEffect(() => {
    if (!contractorInfo) return;
    setContractorForm({
      specialty: contractorInfo.specialty || '',
      licenseNumber: contractorInfo.licenseNumber || '',
      experienceYears: contractorInfo.experienceYears ?? 0,
      hourlyRate: contractorInfo.hourlyRate ?? 0,
      availability: contractorInfo.availability || 'available',
      bio: contractorInfo.bio || '',
    });
  }, [contractorInfo]);

  useEffect(() => {
    const u = profileData?.user || profileData;
    if (u?.totpEnabled != null) setTotpEnabled(!!u.totpEnabled);
    if (u?.notifyEmail != null) setNotifyEmail(!!u.notifyEmail);
  }, [profileData]);

  useEffect(() => {
    if (!user?.id) return;
    const u = profileData?.user || profileData;
    if (u?.avatarUrl) setAvatarUrl(u.avatarUrl);
    else if (user?.avatarUrl) setAvatarUrl(user.avatarUrl);
  }, [user?.id, user?.avatarUrl, profileData]);

  const savePrefs = (patch) => {
    if (!user?.id) return;
    const prev = JSON.parse(localStorage.getItem(prefsKey(user.id)) || '{}');
    localStorage.setItem(prefsKey(user.id), JSON.stringify({ ...prev, ...patch }));
  };

  const profileMutation = useMutation({
    mutationFn: profileAPI.update,
    onSuccess: (data) => {
      const u = data.user || data;
      updateUser(u);
      if (u?.avatarUrl) setAvatarUrl(u.avatarUrl);
      else if (u && 'avatarUrl' in u && !u.avatarUrl) setAvatarUrl('');
      savePrefs({
        jobTitle: profileForm.getValues('jobTitle'),
        department: profileForm.getValues('department'),
        bio: profileForm.getValues('bio'),
        avatarUrl,
      });
      toast.success('Profile saved');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const saveAvatar = (url) => {
    const next = url || '';
    setAvatarUrl(next || '');
    profileMutation.mutate({
      firstName: profileForm.getValues('firstName') || user?.firstName,
      lastName: profileForm.getValues('lastName') || user?.lastName,
      phone: profileForm.getValues('phone'),
      email: profileForm.getValues('email') || user?.email,
      avatarUrl: next,
    });
  };

  const characterId = resolveAvatarCharacterId(avatarUrl);

  const onCharacterSelect = (e) => {
    const id = e.target.value;
    if (!id) {
      saveAvatar('');
      toast.success('Using default initials avatar');
      return;
    }
    const ch = AVATAR_CHARACTERS.find((c) => c.id === id);
    if (ch) {
      saveAvatar(ch.src);
      toast.success(`Avatar set to ${ch.label}`);
    }
  };

  const passwordMutation = useMutation({
    mutationFn: profileAPI.updatePassword,
    onSuccess: () => { toast.success('Password updated'); passwordForm.reset(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update password'),
  });

  const setup2FAMutation = useMutation({
    mutationFn: authAPI.setup2FA,
    onSuccess: (data) => {
      setQrDataUrl(data.qrDataUrl || '');
      toast.success('Scan the QR code with your authenticator app');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not start 2FA setup'),
  });

  const enable2FAMutation = useMutation({
    mutationFn: (code) => authAPI.enable2FA(code),
    onSuccess: async () => {
      setTotpEnabled(true);
      setQrDataUrl('');
      setSetupCode('');
      await fetchProfile();
      refetchProfile();
      toast.success('Two-factor authentication is on — required at next login');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid code'),
  });

  const disable2FAMutation = useMutation({
    mutationFn: () => authAPI.disable2FA({ code: disableCode, password: disablePassword }),
    onSuccess: async () => {
      setTotpEnabled(false);
      setDisableCode('');
      setDisablePassword('');
      await fetchProfile();
      refetchProfile();
      toast.success('2FA disabled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not disable 2FA'),
  });

  const notifyMutation = useMutation({
    mutationFn: () => profileAPI.updateNotifications({ notifyEmail }),
    onSuccess: (data) => {
      toast.success(data?.message || 'Notification preferences saved');
      updateUser({ notifyEmail, notifySms: false });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save preferences'),
  });

  const contractorMutation = useMutation({
    mutationFn: contractorAPI.updateContractorProfile,
    onSuccess: () => {
      toast.success('Contractor profile updated');
      refetchProfile();
    },
    onError: () => toast.error('Could not update contractor profile'),
  });

  const onAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      saveAvatar(reader.result);
      toast.success('Profile photo saved');
    };
    reader.readAsDataURL(file);
  };

  const saveNotifications = () => {
    notifyMutation.mutate();
  };

  return (
    <div>
      <PageHeader title="Profile & Security" subtitle="Personal information, 2FA, and notification preferences" />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="card text-center space-y-4">
          <UserAvatar user={{ ...user, avatarUrl }} size="lg" className="mx-auto" />
          <label className="btn-outline inline-flex items-center gap-2 cursor-pointer text-sm mx-auto">
            <Upload className="h-4 w-4" /> Upload photo
            <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
          </label>
          <div className="text-left w-full max-w-xs mx-auto space-y-2">
            <label className="label flex items-center gap-2">
              <ChevronDown className="h-3.5 w-3.5 text-concrete" /> Character avatar
            </label>
            <div className="flex items-center gap-3">
              {characterId && characterId !== 'custom' && (
                <img
                  src={AVATAR_CHARACTERS.find((c) => c.id === characterId)?.src}
                  alt=""
                  className="h-11 w-11 rounded-xl border border-steel-100 object-cover shrink-0"
                />
              )}
              {characterId === 'custom' && avatarUrl && (
                <img src={avatarUrl} alt="" className="h-11 w-11 rounded-xl border border-steel-100 object-cover shrink-0" />
              )}
              <select
                className="input flex-1 !py-2 text-sm"
                value={characterId === 'custom' ? '' : characterId}
                onChange={onCharacterSelect}
                disabled={profileMutation.isPending}
              >
                <option value="">Default (your initials)</option>
                {AVATAR_CHARACTERS.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.label}</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-concrete">Choose a construction role avatar, or upload your own photo above.</p>
          </div>
          <h3 className="text-lg font-semibold text-steel flex items-center justify-center gap-2 flex-wrap">
            {getFullName(user)}
            {(user?.isVerified || profileData?.user?.isVerified) && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </h3>
          <p className="text-sm text-concrete">{user?.email}</p>
          {user?.role === 'project_manager' && !(user?.isVerified || profileData?.user?.isVerified) && (
            <p className="text-xs text-amber-700 mt-1">Awaiting admin verification to create projects and assign contractors.</p>
          )}
          <span className="badge-info">{ROLE_LABELS[user?.role]}</span>
          {totpEnabled && <span className="badge-success text-xs">2FA active</span>}
        </div>

        <div className="lg:col-span-2 card">
          <div className="flex flex-wrap gap-4 border-b border-steel-100 mb-6">
            {[
              { id: 'profile', label: 'Personal Info' },
              ...(user?.role === 'contractor' ? [{ id: 'contractor', label: 'Contractor' }] : []),
              { id: 'password', label: 'Password' },
              { id: 'security', label: '2FA' },
              { id: 'notifications', label: 'Notifications' },
            ].map(({ id, label }) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={`pb-3 text-sm font-medium ${tab === id ? 'border-b-2 border-primary text-primary' : 'text-concrete'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
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
                <div>
                  <label className="label">Email</label>
                  <input {...profileForm.register('email')} type="email" className="input" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input {...profileForm.register('phone')} className="input" />
                </div>
                <div>
                  <label className="label">Job title</label>
                  <input {...profileForm.register('jobTitle')} className="input" placeholder="Senior Project Manager" />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input {...profileForm.register('department')} className="input" placeholder="Construction Planning" />
                </div>
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea {...profileForm.register('bio')} rows={3} className="input resize-none" />
              </div>
              <button type="submit" className="btn-primary" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving...' : 'Save profile'}
              </button>
            </form>
          )}

          {tab === 'contractor' && user?.role === 'contractor' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-steel font-semibold">
                <HardHat className="h-5 w-5 text-primary" /> Professional details
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Specialty</label>
                  <input className="input" value={contractorForm.specialty} onChange={(e) => setContractorForm({ ...contractorForm, specialty: e.target.value })} />
                </div>
                <div>
                  <label className="label">License number</label>
                  <input className="input" value={contractorForm.licenseNumber} onChange={(e) => setContractorForm({ ...contractorForm, licenseNumber: e.target.value })} />
                </div>
                <div>
                  <label className="label">Experience (years)</label>
                  <input type="number" min={0} className="input" value={contractorForm.experienceYears} onChange={(e) => setContractorForm({ ...contractorForm, experienceYears: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Hourly rate (FRw)</label>
                  <input type="number" min={0} className="input" value={contractorForm.hourlyRate} onChange={(e) => setContractorForm({ ...contractorForm, hourlyRate: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Availability</label>
                  <select className="input" value={contractorForm.availability} onChange={(e) => setContractorForm({ ...contractorForm, availability: e.target.value })}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea className="input resize-none" rows={3} value={contractorForm.bio} onChange={(e) => setContractorForm({ ...contractorForm, bio: e.target.value })} />
              </div>
              {contractorInfo?.companyName && (
                <p className="text-sm text-concrete">Company: {contractorInfo.companyName}</p>
              )}
              <button type="button" className="btn-primary" disabled={contractorMutation.isPending} onClick={() => contractorMutation.mutate(contractorForm)}>
                Save contractor profile
              </button>
            </div>
          )}

          {tab === 'password' && (
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
                {passwordForm.formState.errors.confirmPassword && <p className="mt-1 text-xs text-danger">{passwordForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <button type="submit" className="btn-primary" disabled={passwordMutation.isPending}>Update Password</button>
            </form>
          )}

          {tab === 'security' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-steel-100 p-4 flex items-start gap-3">
                <Shield className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-steel">Authenticator app (TOTP)</p>
                    <p className="text-sm text-concrete mt-1">
                      Scan the QR code with Google Authenticator, Authy, or similar. After enabling, each login requires a 6-digit code.
                    </p>
                  </div>
                  {!totpEnabled && !qrDataUrl && (
                    <button type="button" className="btn-primary" onClick={() => setup2FAMutation.mutate()} disabled={setup2FAMutation.isPending}>
                      {setup2FAMutation.isPending ? 'Preparing QR...' : 'Set up 2FA — show QR code'}
                    </button>
                  )}
                  {qrDataUrl && !totpEnabled && (
                    <div className="space-y-3">
                      <img src={qrDataUrl} alt="Scan for 2FA" className="mx-auto rounded-lg border border-steel-100 w-[220px] h-[220px]" />
                      <div>
                        <label className="label">Enter code from app to confirm</label>
                        <input
                          className="input max-w-xs font-mono tracking-widest"
                          value={setupCode}
                          onChange={(e) => setSetupCode(e.target.value)}
                          placeholder="000000"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={enable2FAMutation.isPending || setupCode.length < 6}
                        onClick={() => enable2FAMutation.mutate(setupCode)}
                      >
                        Enable 2FA
                      </button>
                    </div>
                  )}
                  {totpEnabled && (
                    <div className="space-y-2 border-t border-steel-100 pt-3">
                      <p className="text-sm text-success font-medium">2FA is enabled for this account.</p>
                      <input className="input max-w-xs" type="password" placeholder="Current password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
                      <input className="input max-w-xs font-mono" placeholder="Authenticator code" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} />
                      <button type="button" className="btn-outline text-danger border-danger/30" disabled={disable2FAMutation.isPending} onClick={() => disable2FAMutation.mutate()}>
                        Disable 2FA
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4">
              <p className="text-sm text-concrete">
                Alerts are sent to <strong className="text-steel">{user?.email}</strong> when email notifications are enabled.
              </p>
              <label className="flex items-start gap-3 rounded-xl border border-steel-100 p-4 cursor-pointer">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-steel">Email notifications</p>
                  <p className="text-xs text-concrete">
                    {user?.role === 'contractor'
                      ? 'Assignments, material approvals, issue updates, and messages'
                      : user?.role === 'admin'
                        ? 'Platform activity, contact messages, and team alerts'
                        : 'Assignments, contractor activity, progress, and messages'}
                  </p>
                </div>
                <input type="checkbox" className="h-5 w-5 accent-primary" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
              </label>
              <button type="button" className="btn-primary" onClick={saveNotifications} disabled={notifyMutation.isPending}>
                Save notification preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
