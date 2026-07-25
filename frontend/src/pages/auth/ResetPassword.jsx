import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password: data.password });
      setSuccess(true);
      toast.success('Password reset successfully');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-steel">Password Reset</h2>
        <p className="mt-2 text-concrete">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-steel">Reset Password</h2>
      <p className="mt-2 text-sm text-concrete mb-8">Enter your new password below.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input {...register('confirmPassword')} type="password" className="input" />
          {errors.confirmPassword && <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-concrete">
        <Link to="/login" className="text-primary hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
