import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Lock, User, Eye, EyeOff, Activity, ShieldCheck, HeartPulse, FileSpreadsheet } from 'lucide-react';
import Modal from '../components/Modal';

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
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background radial glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-orange/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Login Card Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <div className="bg-brand-orange/15 p-3 rounded-2xl border border-brand-orange/40 mb-3 animate-pulse">
            <Activity className="h-8 w-8 text-brand-orange" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wider font-sans">TransitOps</h1>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-1">Enterprise Fleet Logistical ERP</p>
        </div>

        {/* Credentials Form Box */}
        <div className="glass-card p-8 border border-white/5 shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-orange/50 to-transparent"></div>
          
          <h2 className="text-lg font-bold text-white mb-6">Operator Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"><User className="h-4 w-4" /></span>
                <input
                  type="text"
                  placeholder="Enter operator handle..."
                  className={`glass-input pl-10 ${errors.username ? 'border-red-500/50' : ''}`}
                  {...register('username', { required: 'Username required' })}
                />
              </div>
              {errors.username && <p className="text-[11px] text-red-500 mt-1">{errors.username.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-brand-orange hover:text-white transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"><Lock className="h-4 w-4" /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`glass-input pl-10 pr-10 ${errors.password ? 'border-red-500/50' : ''}`}
                  {...register('password', { required: 'Password required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Keep session check */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 rounded bg-darkbg-sidebar border-white/10 text-brand-orange focus:ring-0 focus:ring-offset-0 text-orange-600 bg-orange-600 border border-slate-700 cursor-pointer"
                {...register('rememberMe')}
              />
              <label htmlFor="rememberMe" className="ml-2.5 text-xs text-gray-400 font-medium cursor-pointer select-none">
                Remember operator session
              </label>
            </div>

            {/* Action Submit */}
            <button
              type="submit"
              disabled={loadingState}
              className="w-full btn-primary font-bold py-3 mt-2 shadow-lg shadow-brand-orange/20"
            >
              {loadingState ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Security Audit Notices at bottom */}
        <div className="mt-6 p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="h-4 w-4 text-brand-orange" />
            <span>Role-based access matrix active</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <HeartPulse className="h-4 w-4 text-brand-orange" />
            <span>Real-time verification active</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <FileSpreadsheet className="h-4 w-4 text-brand-orange" />
            <span>Audit logging active</span>
          </div>
        </div>
      </div>

      {/* Forgot Password modal */}
      <Modal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot Access Credentials?">
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Enter the registered email associated with your operator profile, and the system database will dispatch a secure reset key.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              placeholder="e.g. name@transitops.com"
              className="glass-input"
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
