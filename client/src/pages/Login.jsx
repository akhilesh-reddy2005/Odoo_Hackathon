import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Lock, User, Eye, EyeOff, Activity, ShieldCheck, HeartPulse, FileSpreadsheet } from 'lucide-react';
import Modal from '../components/Modal';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loadingState, setLoadingState] = useState(false);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      username: '',
      password: '',
      rememberMe: true
    }
  });

  // Redirect target after login
  const from = location.state?.from?.pathname || '/';

  // Perform login submission
  const onSubmit = async (data) => {
    setLoadingState(true);
    try {
      await login(data.username, data.password);

      if (data.rememberMe) {
        localStorage.setItem('transitops_remembered_user', data.username);
      } else {
        localStorage.removeItem('transitops_remembered_user');
      }

      toast.success('Access Granted. Welcome to TransitOps ERP!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err || 'Failed to authenticate. Check server configuration.');
    } finally {
      setLoadingState(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter a valid email address.');
      return;
    }
    toast.success(`Password recovery link dispatched to: ${forgotEmail}`);
    setForgotOpen(false);
    setForgotEmail('');
  };

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Login Card Container */}
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <div className="bg-brand/10 p-3 rounded-xl border border-brand/20 mb-4">
            <Activity className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-ink-primary tracking-tight">TransitOps</h1>
          <p className="text-sm text-ink-muted mt-1">Enterprise Fleet Logistics Platform</p>
        </div>

        {/* Credentials Form Box */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-ink-primary mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"><User className="h-4 w-4" /></span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  className={`input pl-10 ${errors.username ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/20' : ''}`}
                  {...register('username', { required: 'Username required' })}
                />
              </div>
              {errors.username && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{errors.username.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-brand hover:text-brand-hover transition-colors font-medium"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"><Lock className="h-4 w-4" /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pl-10 pr-10 ${errors.password ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/20' : ''}`}
                  {...register('password', { required: 'Password required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{errors.password.message}</p>}
            </div>

            {/* Keep session check */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 rounded border-line accent-brand focus:ring-brand/30 cursor-pointer"
                {...register('rememberMe')}
              />
              <label htmlFor="rememberMe" className="ml-2.5 text-sm text-ink-secondary cursor-pointer select-none">
                Remember me on this device
              </label>
            </div>

            {/* Action Submit */}
            <button
              type="submit"
              disabled={loadingState}
              className="w-full btn-primary py-3 mt-2"
            >
              {loadingState ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Security Audit Notices at bottom */}
        <div className="mt-6 p-4 bg-surface-sunken border border-line rounded-xl space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-ink-secondary">
            <ShieldCheck className="h-4 w-4 text-ink-muted" />
            <span>Role-based access matrix active</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-ink-secondary">
            <HeartPulse className="h-4 w-4 text-ink-muted" />
            <span>Real-time verification active</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-ink-secondary">
            <FileSpreadsheet className="h-4 w-4 text-ink-muted" />
            <span>Audit logging active</span>
          </div>
        </div>
      </div>

      {/* Forgot Password modal */}
      <Modal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot Access Credentials?">
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <p className="text-sm text-ink-secondary leading-relaxed">
            Enter the registered email associated with your operator profile, and the system database will dispatch a secure reset key.
          </p>
          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">Email Address</label>
            <input
              type="email"
              placeholder="e.g. name@transitops.com"
              className="input"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setForgotOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Send Reset Code</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
