import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  User,
  Shield,
  Settings as SettingsIcon,
  Lock,
  Mail,
  Save
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { authService } from '../services/api';
import Spinner from '../components/Spinner';

export default function Settings() {
  const { user, updateProfile, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  // Non-functional preference toggle (kept decorative, matching prior behavior)
  const [alertsEnabled, setAlertsEnabled] = useState(false);

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

  const navItemClass = (tab) => `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    activeTab === tab
      ? 'bg-brand-light text-brand font-semibold'
      : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-hover'
  }`;

  return (
    <div className="space-y-6">
      {/* Settings layout wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* Navigation Sidebar Panel */}
        <aside className="md:col-span-1 card p-3 space-y-1 h-fit">
          <button onClick={() => setActiveTab('profile')} className={navItemClass('profile')}>
            <User className="h-4 w-4" />
            Profile Account
          </button>

          {user?.role === 'Admin' && (
            <button onClick={() => setActiveTab('roles')} className={navItemClass('roles')}>
              <Shield className="h-4 w-4" />
              Role Matrix
            </button>
          )}

          <button onClick={() => setActiveTab('system')} className={navItemClass('system')}>
            <SettingsIcon className="h-4 w-4" />
            System Preferences
          </button>
        </aside>

        {/* Content Viewport Card */}
        <div className="md:col-span-3 card p-6">

          {/* Tab: Profile Account */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
              <h3 className="text-sm font-semibold text-ink-primary border-b border-line pb-4 mb-4">Operator Profile Settings</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">Display Name</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"><User className="h-4 w-4" /></span>
                    <input
                      type="text"
                      className="input pl-10"
                      {...register('name', { required: true })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">Operator Email</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"><Mail className="h-4 w-4" /></span>
                    <input
                      type="email"
                      className="input pl-10"
                      {...register('email', { required: true })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">Change Access Password</label>
                <div className="relative max-w-sm">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"><Lock className="h-4 w-4" /></span>
                  <input
                    type="password"
                    placeholder="Leave empty to keep current password..."
                    className="input pl-10"
                    {...register('newPassword')}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-line flex justify-end">
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
              <h3 className="text-sm font-semibold text-ink-primary border-b border-line pb-4 mb-4">Enterprise Role Permission Matrix</h3>
              <p className="text-sm text-ink-secondary leading-relaxed max-w-xl">
                Configure module level authorization flags. System administrators possess universal bypass parameters. Roles listed below dictate field manager overlays.
              </p>

              {matrixLoading ? (
                <div className="py-12 flex justify-center"><Spinner /></div>
              ) : (
                <div className="space-y-4">
                  {roles
                    .filter(r => r.name !== 'Admin') // Admin doesn't need to be set
                    .map(role => (
                      <div key={role.id} className="p-4 bg-surface-sunken border border-line rounded-lg space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-line">
                          <span className="text-sm font-semibold text-ink-primary">{role.name} Permissions</span>
                          <button
                            onClick={() => saveRoleMatrix(role.id)}
                            className="bg-brand/10 hover:bg-brand text-brand hover:text-white border border-brand/20 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 active:scale-95"
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
                              className="flex items-center gap-3 p-2.5 bg-surface rounded-lg hover:bg-surface-hover border border-line cursor-pointer select-none transition-colors"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-line accent-brand focus:ring-brand/30 cursor-pointer"
                                checked={role.permissions[key] === true}
                                onChange={() => handleMatrixToggle(role.id, key)}
                              />
                              <span className="text-xs text-ink-secondary font-medium capitalize">{key}</span>
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
              <h3 className="text-sm font-semibold text-ink-primary border-b border-line pb-4 mb-4">System Preferences</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-surface-sunken border border-line rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-ink-primary">Interface dark mode</h4>
                    <p className="text-xs text-ink-muted mt-1">Switch between light and dark appearance.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme === 'dark'}
                    onClick={toggleTheme}
                    className={`h-6 w-11 rounded-full relative flex items-center p-0.5 cursor-pointer transition-colors ${
                      theme === 'dark' ? 'bg-brand' : 'bg-surface-hover border border-line'
                    }`}
                  >
                    <span className={`h-5 w-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                    }`}></span>
                  </button>
                </div>

                <div className="flex justify-between items-center p-4 bg-surface-sunken border border-line rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-ink-primary">SMS / Email Alerts</h4>
                    <p className="text-xs text-ink-muted mt-1">Dispatch alerts sent directly to operators.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={alertsEnabled}
                    onClick={() => setAlertsEnabled(v => !v)}
                    className={`h-6 w-11 rounded-full relative flex items-center p-0.5 cursor-pointer transition-colors ${
                      alertsEnabled ? 'bg-brand' : 'bg-surface-hover border border-line'
                    }`}
                  >
                    <span className={`h-5 w-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      alertsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}></span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
