import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import BrandLogo from '../../components/BrandLogo';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const codeSchema = z.object({
  code: z.string().min(6, 'Enter the 6-digit code').max(8),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState(null);
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const codeForm = useForm({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await login(data);
      if (result.requires2FA) {
        setTwoFactorToken(result.twoFactorToken);
        toast('Enter the code from your authenticator app', { icon: '🔐' });
        return;
      }
      toast.success('Welcome back!');
      navigate(from || result.redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async ({ code }) => {
    setLoading(true);
    try {
      const result = await verify2FA({ twoFactorToken, code });
      toast.success('Welcome back!');
      navigate(from || result.redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-concrete hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to landing page
      </Link>

      <div className="rounded-2xl border border-steel-100 bg-white shadow-xl shadow-steel-900/5 p-6 sm:p-8">
        <div className="flex justify-center mb-6 lg:hidden">
          <BrandLogo to="/" showText={false} imageClassName="h-14 w-14" />
        </div>

        <div className="text-center mb-8">
          <div className="hidden lg:flex justify-center mb-4">
          <BrandLogo asLink={false} showText={false} imageClassName="h-12 w-12" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-success/10 text-success px-3 py-1 text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure sign-in
          </div>
          <h2 className="text-2xl font-bold text-steel-800">Welcome back</h2>
          <p className="mt-2 text-sm text-concrete">
            {twoFactorToken ? 'Enter your authenticator code' : 'Sign in to your construction workspace'}
          </p>
        </div>

        {!twoFactorToken ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-concrete" /> Email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="input !py-3"
                placeholder="you@company.com"
              />
              {errors.email && <p className="mt-1.5 text-xs text-danger font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label !mb-0 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-concrete" /> Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary-600 font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-12 !py-3"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-400 hover:text-steel-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-danger font-medium">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 text-base shadow-glow-primary">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={codeForm.handleSubmit(onVerify2FA)} className="space-y-5">
            <div>
              <label className="label">Authenticator code</label>
              <input
                {...codeForm.register('code')}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="input text-center text-lg tracking-widest font-mono !py-3"
                placeholder="000000"
              />
              {codeForm.formState.errors.code && (
                <p className="mt-1.5 text-xs text-danger font-medium">{codeForm.formState.errors.code.message}</p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 text-base">
              {loading ? 'Verifying…' : 'Continue'}
            </button>
            <button
              type="button"
              className="w-full text-sm text-concrete hover:text-steel font-medium"
              onClick={() => { setTwoFactorToken(null); codeForm.reset(); }}
            >
              Back to sign in
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
