import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Lock, User, Eye, EyeOff, Activity, ShieldQuestion, ArrowRight, ShieldCheck, FileSpreadsheet, HeartPulse } from 'lucide-react';
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

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
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

  // Pre-fill and submit form for Demo Quick Links
  const handleQuickLogin = async (roleName) => {
    const demoAccounts = {
      'Administrator': { u: 'admin', p: 'password123' },
      'Fleet Manager': { u: 'manager', p: 'password123' },
      'Safety Officer': { u: 'safety', p: 'password123' },
      'Financial Analyst': { u: 'finance', p: 'password123' },
      'Driver': { u: 'driver_john', p: 'password123' }
    };

    const credentials = demoAccounts[roleName];
    if (credentials) {
      setValue('username', credentials.u);
      setValue('password', credentials.p);
      
      setLoadingState(true);
      try {
        await login(credentials.u, credentials.p);
        toast.success(`Demo Access Granted: Logged in as ${roleName}`);
        navigate(from, { replace: true });
      } catch (err) {
        toast.error(err || 'Demo login connection failed.');
      } finally {
        setLoadingState(false);
      }
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

  const demoRoles = [
    { name: 'Administrator', desc: 'Global configurations & role permissions matrices' },
    { name: 'Fleet Manager', desc: 'Fleet assets, scheduling, fuel logs, maintenance' },
    { name: 'Safety Officer', desc: 'Driver registry, safety profiles, credential checks' },
    { name: 'Financial Analyst', desc: 'Expense ledgers, operational cash flows, ROI analysis' },
    { name: 'Driver', desc: 'Assigned route schedules, mileage logs' }
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative bg-[#080c14] overflow-hidden select-none">
      {/* Background radial glow blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-orange/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Left Panel: Demo Quick Access deck */}
      <div className="w-full md:w-[40%] bg-slate-900/40 backdrop-blur-glass border-r border-white/5 p-8 flex flex-col justify-between relative z-10">
        <div>
          {/* Logo Header */}
          <div className="flex items-center gap-3.5 mb-8">
            <div className="bg-brand-orange/15 p-2.5 rounded-xl border border-brand-orange/40">
              <Activity className="h-6 w-6 text-brand-orange animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wider font-sans">TransitOps</h1>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mt-0.5">Fleet Logistics ERP</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Demo Quick Access</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Select an operator profile below to instantly pre-fill credentials and log in.
            </p>
          </div>

          {/* Quick links list */}
          <div className="space-y-3 mt-6">
            {demoRoles.map((role) => (
              <button
                key={role.name}
                onClick={() => handleQuickLogin(role.name)}
                disabled={loadingState}
                className="w-full text-left p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 rounded-2xl flex items-center justify-between group transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-brand-orange transition-colors">{role.name}</h4>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5 max-w-[240px] truncate">{role.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer info checks */}
        <div className="pt-8 border-t border-white/5">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">
            Hackathon Review Build v1.0.0
          </p>
        </div>
      </div>

      {/* Right Panel: Standard form login */}
      <div className="flex-1 p-8 flex items-center justify-center relative z-10">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white font-sans tracking-wide">Sign in to your account</h2>
            <p className="text-xs text-gray-400 mt-1">Enter your credentials to continue</p>
          </div>

          <div className="glass-card p-8 border border-white/5 relative shadow-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"><User className="h-4 w-4" /></span>
                  <input
                    type="text"
                    placeholder="Enter user handle..."
                    className="glass-input pl-10"
                    {...register('username', { required: 'Username required' })}
                  />
                </div>
                {errors.username && <p className="text-[10px] text-red-500 mt-1">{errors.username.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-[10px] text-brand-orange hover:text-white font-bold transition-colors uppercase tracking-widest"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"><Lock className="h-4 w-4" /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="glass-input pl-10 pr-10"
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
                {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              {/* Keep session */}
              <div className="flex items-center py-1">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-brand-orange border border-slate-700 bg-darkbg-sidebar rounded focus:ring-0 cursor-pointer"
                  {...register('rememberMe')}
                />
                <label htmlFor="rememberMe" className="ml-2.5 text-xs text-gray-400 font-semibold cursor-pointer select-none">
                  Keep operator session
                </label>
              </div>

              {/* Submit */}
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

          {/* Form bullet indicators matching mockup */}
          <div className="mt-6 p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ShieldCheck className="h-4 w-4 text-brand-orange" />
              <span>Role-based access matrix active</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <HeartPulse className="h-4 w-4 text-brand-orange" />
              <span>Real-time verification</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileSpreadsheet className="h-4 w-4 text-brand-orange" />
              <span>Audit logging active</span>
            </div>
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
