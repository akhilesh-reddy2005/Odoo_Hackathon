import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Shield, 
  Check, 
  Settings as SettingsIcon, 
  Bell, 
  Lock, 
  Mail, 
  Save, 
  Activity,
  ToggleLeft
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api';

export default function Settings() {
  const { user, updateProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // profile, roles, system
  
  // Profile form
  const { register, handleSubmit: handleProfileSubmit, reset: resetProfile } = useForm({
    defaultValues: {
      name: user?.name,
      email: user?.email,
      newPassword: ''
    }
  });

  // Role Matrix states
  const [roles, setRoles] = useState([]);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Load role matrix if user is Admin
  const loadRoles = async () => {
    if (user?.role !== 'Admin') return;
    setMatrixLoading(true);
    try {
      const data = await authService.getRoles();
      setRoles(data || []);
    } catch (err) {
      toast.error('Failed to load system roles matrix.');
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles') {
      loadRoles();
    }
  }, [activeTab]);

  // Submit Profile update
  const onProfileSubmit = async (data) => {
    try {
      await updateProfile({
        name: data.name,
        email: data.email,
        newPassword: data.newPassword || undefined
      });
      toast.success('Your operator credentials updated successfully!');
      resetProfile({ name: data.name, email: data.email, newPassword: '' });
    } catch (err) {
      toast.error(err || 'Failed to update credentials.');
    }
  };

  // Toggle permission check in matrix
  const handleMatrixToggle = (roleId, permissionKey) => {
    setRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [permissionKey]: !role.permissions[permissionKey]
          }
        };
      }
      return role;
    }));
  };

  // Save Role Matrix
  const saveRoleMatrix = async (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    try {
      await authService.updateRolePermissions(roleId, role.permissions);
      toast.success(`Access permissions updated for: ${role.name}`);
    } catch (err) {
      toast.error('Failed to save permissions configuration.');
    }
  };

  const permissionKeys = ['dashboard', 'fleet', 'drivers', 'trips', 'maintenance', 'fuel', 'expenses', 'analytics', 'settings'];

  return (
    <div className="space-y-6">
      {/* Settings layout wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar Panel */}
        <aside className="md:col-span-1 glass-card p-4 space-y-1 h-fit border border-white/5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'profile' 
                ? 'bg-brand-orange text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="h-4 w-4" />
            Profile Account
          </button>

          {user?.role === 'Admin' && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'roles' 
                  ? 'bg-brand-orange text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="h-4 w-4" />
              Role Matrix
            </button>
          )}

          <button
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'system' 
                ? 'bg-brand-orange text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            System Preferences
          </button>
        </aside>

        {/* Content Viewport Card */}
        <div className="md:col-span-3 glass-card p-6 border border-white/5">
          
          {/* Tab: Profile Account */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-4 mb-4">Operator Profile Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"><User className="h-4 w-4" /></span>
                    <input
                      type="text"
                      className="glass-input pl-10"
                      {...register('name', { required: true })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Operator Email</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"><Mail className="h-4 w-4" /></span>
                    <input
                      type="email"
                      className="glass-input pl-10"
                      {...register('email', { required: true })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Change Access Password</label>
                <div className="relative max-w-sm">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"><Lock className="h-4 w-4" /></span>
                  <input
                    type="password"
                    placeholder="Leave empty to keep current password..."
                    className="glass-input pl-10 text-xs"
                    {...register('newPassword')}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button type="submit" className="btn-primary px-5">
                  <Save className="h-4 w-4" />
                  Save profile changes
                </button>
              </div>
            </form>
          )}

          {/* Tab: Role Matrix (Admin Only) */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-4 mb-4">Enterprise Role Permission Matrix</h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                Configure module level authorization flags. System administrators possess universal bypass parameters. Roles listed below dictate field manager overlays.
              </p>

              {matrixLoading ? (
                <div className="py-12 flex justify-center"><div className="h-8 w-8 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div></div>
              ) : (
                <div className="space-y-6">
                  {roles
                    .filter(r => r.name !== 'Admin') // Admin doesn't need to be set
                    .map(role => (
                      <div key={role.id} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{role.name} Permissions</span>
                          <button
                            onClick={() => saveRoleMatrix(role.id)}
                            className="bg-brand-orange/15 hover:bg-brand-orange text-brand-orange hover:text-white border border-brand-orange/30 text-[10px] uppercase font-extrabold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                          >
                            <Save className="h-3 w-3" />
                            Save matrix
                          </button>
                        </div>

                        {/* Grid checkbox metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {permissionKeys.map(key => (
                            <label 
                              key={key} 
                              className="flex items-center gap-3 p-2 bg-black/20 rounded-lg hover:bg-black/30 border border-white/5 cursor-pointer select-none transition-all"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-orange-600 border border-slate-700 bg-orange-600 bg-darkbg-sidebar rounded cursor-pointer focus:ring-0"
                                checked={role.permissions[key] === true}
                                onChange={() => handleMatrixToggle(role.id, key)}
                              />
                              <span className="text-[11px] text-gray-300 font-semibold uppercase tracking-wider">{key}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: System preferences */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-4 mb-4">System Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Interface dark mode</h4>
                    <p className="text-[10px] text-gray-500 mt-1">Glow accent settings and backdrop details.</p>
                  </div>
                  <div className="h-6 w-11 bg-brand-orange rounded-full relative flex items-center p-0.5 cursor-pointer">
                    <span className="h-5 w-5 bg-white rounded-full shadow-md translate-x-5 transition-transform duration-200"></span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">SMS / Email Alerts</h4>
                    <p className="text-[10px] text-gray-500 mt-1">Dispatch alerts sent directly to operators.</p>
                  </div>
                  <div className="h-6 w-11 bg-white/10 border border-white/10 rounded-full relative flex items-center p-0.5 cursor-pointer">
                    <span className="h-5 w-5 bg-gray-500 rounded-full shadow-md transition-transform duration-200"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
