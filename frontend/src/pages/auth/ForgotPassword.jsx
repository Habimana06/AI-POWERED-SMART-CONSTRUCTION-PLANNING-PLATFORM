import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const codeSchema = z.object({
  code: z.string().min(6, 'Enter the 6-digit code').max(6),
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const codeForm = useForm({ resolver: zodResolver(codeSchema) });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const onEmailSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(data.email);
      setEmail(data.email.trim().toLowerCase());
      setStep('code');
      toast.success('Verification code sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No account found with this email');
    } finally {
      setLoading(false);
    }
  };

  const onCodeSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.verifyForgotPasswordCode({ email, code: data.code.trim() });
      setResetToken(res.resetToken);
      setStep('password');
      toast.success('Code verified — set a new password');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.resetPassword({ resetToken, password: data.password });
      toast.success('Password updated');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-concrete hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>

      <h2 className="text-2xl font-bold text-steel">Forgot Password</h2>
      <p className="mt-2 text-sm text-concrete mb-8">
        {step === 'email' && 'Enter your account email — we will verify it exists and send a code.'}
        {step === 'code' && `Enter the 6-digit code sent to ${email}`}
        {step === 'password' && 'Choose a new password for your account.'}
      </p>

      {step === 'email' && (
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <input {...emailForm.register('email')} type="email" className="input" placeholder="you@company.com" />
            {emailForm.formState.errors.email && (
              <p className="mt-1 text-xs text-danger">{emailForm.formState.errors.email.message}</p>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? 'Checking...' : 'Send verification code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-5">
          <div className="card flex items-center gap-3 mb-2">
            <Mail className="h-8 w-8 text-primary shrink-0" />
            <p className="text-sm text-steel">Check your inbox for the code from BuildPlan AI.</p>
          </div>
          <div>
            <label className="label">Verification code</label>
            <input
              {...codeForm.register('code')}
              inputMode="numeric"
              maxLength={6}
              className="input text-center text-lg tracking-[0.4em] font-mono"
              placeholder="000000"
            />
            {codeForm.formState.errors.code && (
              <p className="mt-1 text-xs text-danger">{codeForm.formState.errors.code.message}</p>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            <KeyRound className="h-4 w-4" />
            {loading ? 'Verifying...' : 'Verify code'}
          </button>
          <button type="button" className="text-sm text-primary w-full" onClick={() => setStep('email')}>
            Use a different email
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
          <div className="flex items-center gap-2 text-success text-sm mb-2">
            <CheckCircle2 className="h-5 w-5" /> Email verified
          </div>
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <input
                {...passwordForm.register('password')}
                type={showPassword ? 'text' : 'password'}
                className="input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordForm.formState.errors.password && (
              <p className="mt-1 text-xs text-danger">{passwordForm.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input {...passwordForm.register('confirmPassword')} type="password" className="input" />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="mt-1 text-xs text-danger">{passwordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}
