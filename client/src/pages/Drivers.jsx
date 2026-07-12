import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  ArrowUpDown, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ShieldAlert, 
  UserCheck, 
  Calendar, 
  Phone, 
  FileText,
  TrendingUp,
  Award,
  Milestone
} from 'lucide-react';

import { driverService } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

export default function Drivers() {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [expired, setExpired] = useState('All');
  const [sortBy, setSortBy] = useState('id');
  const [order, setOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Modals state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form hooks — separate instances to prevent state bleed between modals
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    setValue,
    formState: { errors: editErrors }
  } = useForm();

  // Load drivers list
  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await driverService.getAll({
        search,
        status,
        expired: expired === 'Expired' ? 'true' : expired === 'Valid' ? 'false' : undefined,
        sortBy,
        order,
        page,
        limit
      });
      setDrivers(data.drivers || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load driver registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [search, status, expired, sortBy, order, page]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setOrder(order === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setOrder('DESC');
    }
  };

  // CSV Export
  const handleExport = () => {
    if (drivers.length === 0) {
      toast.error('No data available to export.');
      return;
    }
    const headers = ['ID,Driver Name,Phone,License Number,License Category,License Expiry,Safety Score,Status,Trips Completed,Avg Fuel Efficiency (km/L),Performance Score\n'];
    const rows = drivers.map(d => 
      `"${d.id}","${d.name}","${d.phone}","${d.license_number}","${d.license_category}","${d.license_expiry}","${d.safety_score}","${d.status}","${d.trip_count}","${d.fuel_efficiency}","${d.performance_score}%"`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `transitops_drivers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Driver logs downloaded as CSV.');
  };

  // Details open
  const openDetails = async (driver) => {
    setSelectedDriver(driver);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await driverService.getById(driver.id);
      setSelectedDriver(data);
    } catch (err) {
      toast.error('Failed to load driver profiles details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Create Submit
  const onRegisterSubmit = async (data) => {
    try {
      await driverService.create(data);
      toast.success('Driver successfully added to the registry.');
      setRegisterOpen(false);
      reset();
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add driver.');
    }
  };

  // Edit Trigger
  const openEdit = (driver) => {
    setSelectedDriver(driver);
    setEditOpen(true);
    setValue('name', driver.name);
    setValue('phone', driver.phone);
    setValue('license_number', driver.license_number);
    setValue('license_category', driver.license_category);
    setValue('license_expiry', driver.license_expiry.split('T')[0]);
    setValue('safety_score', driver.safety_score);
    setValue('status', driver.status);
    setValue('fuel_efficiency', driver.fuel_efficiency);
  };

  // Edit Submit
  const onEditSubmit = async (data) => {
    try {
      await driverService.update(selectedDriver.id, data);
      toast.success('Driver credentials updated.');
      setEditOpen(false);
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to suspend or delete this driver?')) return;
    try {
      const res = await driverService.delete(id);
      toast.success(res.message || 'Driver suspended.');
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suspension failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters card */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-6">
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search driver name, phone..."
              className="glass-input pl-10 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            className="glass-input cursor-pointer w-full sm:w-auto text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All" className="bg-darkbg-sidebar">All Statuses</option>
            <option value="Available" className="bg-darkbg-sidebar">Available</option>
            <option value="On Trip" className="bg-darkbg-sidebar">On Trip</option>
            <option value="Off Duty" className="bg-darkbg-sidebar">Off Duty</option>
            <option value="Suspended" className="bg-darkbg-sidebar">Suspended</option>
          </select>

          {/* License expiration filter */}
          <select
            className="glass-input cursor-pointer w-full sm:w-auto text-xs"
            value={expired}
            onChange={(e) => setExpired(e.target.value)}
          >
            <option value="All" className="bg-darkbg-sidebar">License Status</option>
            <option value="Valid" className="bg-darkbg-sidebar">Active/Valid License</option>
            <option value="Expired" className="bg-darkbg-sidebar">Expired License</option>
          </select>
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-end">
          <button onClick={handleExport} className="btn-secondary h-11 px-4">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={() => setRegisterOpen(true)} className="btn-primary h-11 px-4">
            <Plus className="h-4 w-4" />
            Add Driver
          </button>
        </div>
      </div>

      {/* Driver Registry Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : drivers.length === 0 ? (
        <EmptyState title="No operators in registry match filters" />
      ) : (
        <div className="glass-card border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="table-header cursor-pointer text-[10px]" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header text-[10px]">License Details</th>
                  <th className="table-header cursor-pointer text-[10px]" onClick={() => handleSort('license_expiry')}>
                    <span className="flex items-center gap-1">License Expiry <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header cursor-pointer text-[10px] text-center" onClick={() => handleSort('safety_score')}>
                    <span className="flex items-center gap-1 justify-center">Safety Score <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header text-[10px] text-center">Perf Rating</th>
                  <th className="table-header text-[10px] text-center">Status</th>
                  <th className="table-header text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-white/5 transition-all group">
                    <td className="table-cell">
                      <p className="font-semibold text-white text-xs">{d.name}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">{d.phone}</p>
                    </td>
                    <td className="table-cell text-xs font-medium text-gray-300">
                      <span className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[10px] font-mono mr-1.5 uppercase">{d.license_category}</span>
                      <span className="font-mono">{d.license_number}</span>
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-400">
                      <span className="flex items-center gap-1.5">
                        {d.is_license_expired ? (
                          <span className="text-red-500 font-bold flex items-center gap-0.5 animate-pulse">
                            <ShieldAlert className="h-3 w-3" />
                            {d.license_expiry.split('T')[0]} (Expired)
                          </span>
                        ) : (
                          <span>{d.license_expiry.split('T')[0]}</span>
                        )}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`inline-flex items-center justify-center font-mono font-bold text-xs ${
                        d.safety_score >= 90 ? 'text-green-400' :
                        d.safety_score >= 80 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {d.safety_score} / 100
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        d.performance_score >= 85 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        d.performance_score >= 65 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        <Award className="h-3 w-3 mr-0.5 text-brand-orange" />
                        {d.performance_score}%
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge text-[9px] ${
                        d.status === 'Available' ? 'bg-green-500/15 text-green-400 border border-green-500/25' :
                        d.status === 'On Trip' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25' :
                        d.status === 'Off Duty' ? 'bg-slate-500/15 text-slate-400 border border-slate-500/25' :
                        'bg-red-500/15 text-red-400 border border-red-500/25'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openDetails(d)} className="p-1.5 bg-white/5 border border-white/10 hover:border-brand-orange/30 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(d)} className="p-1.5 bg-white/5 border border-white/10 hover:border-brand-orange/30 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/5 bg-black/10 flex justify-between items-center text-xs">
              <span className="text-gray-400">Showing {drivers.length} of {total} operators</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Driver */}
      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} title="Register Vehicle Operator">
        <form onSubmit={handleSubmit(onRegisterSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Driver Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              className="glass-input"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +1-555-0199"
                className="glass-input"
                {...register('phone', { required: 'Phone is required' })}
              />
              {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">License Number</label>
              <input
                type="text"
                placeholder="e.g. DL-TEX-8921A"
                className="glass-input uppercase"
                {...register('license_number', { required: 'License is required' })}
              />
              {errors.license_number && <p className="text-[10px] text-red-500 mt-1">{errors.license_number.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">License Category</label>
              <select className="glass-input cursor-pointer" {...register('license_category', { required: true })}>
                <option value="CDL-A" className="bg-darkbg-sidebar">CDL Class A</option>
                <option value="CDL-B" className="bg-darkbg-sidebar">CDL Class B</option>
                <option value="CDL-C" className="bg-darkbg-sidebar">CDL Class C</option>
                <option value="Standard" className="bg-darkbg-sidebar">Standard Driver License</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">License Expiry Date</label>
              <input
                type="date"
                className="glass-input"
                {...register('license_expiry', { required: 'Expiry date is required' })}
              />
              {errors.license_expiry && <p className="text-[10px] text-red-500 mt-1">{errors.license_expiry.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setRegisterOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Driver</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Driver */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Update Operator Credentials">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Driver Full Name</label>
            <input
              type="text"
              className="glass-input"
              {...registerEdit('name', { required: true })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Phone Number</label>
              <input
                type="text"
                className="glass-input"
                {...registerEdit('phone', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">License Number</label>
              <input
                type="text"
                className="glass-input uppercase"
                {...registerEdit('license_number', { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">License Category</label>
              <select className="glass-input cursor-pointer" {...registerEdit('license_category', { required: true })}>
                <option value="CDL-A" className="bg-darkbg-sidebar">CDL Class A</option>
                <option value="CDL-B" className="bg-darkbg-sidebar">CDL Class B</option>
                <option value="CDL-C" className="bg-darkbg-sidebar">CDL Class C</option>
                <option value="Standard" className="bg-darkbg-sidebar">Standard Driver License</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">License Expiry Date</label>
              <input
                type="date"
                className="glass-input"
                {...registerEdit('license_expiry', { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Safety Score (0-100)</label>
              <input
                type="number"
                step="0.01"
                className="glass-input"
                {...registerEdit('safety_score', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Fuel Efficiency (km/L)</label>
              <input
                type="number"
                step="0.01"
                className="glass-input"
                {...registerEdit('fuel_efficiency', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Duty Status</label>
              <select className="glass-input cursor-pointer" {...registerEdit('status', { required: true })}>
                <option value="Available" className="bg-darkbg-sidebar">Available</option>
                <option value="On Trip" className="bg-darkbg-sidebar">On Trip</option>
                <option value="Off Duty" className="bg-darkbg-sidebar">Off Duty</option>
                <option value="Suspended" className="bg-darkbg-sidebar">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Driver Details & History */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Operator Performance Card" size="lg">
        {detailLoading || !selectedDriver ? (
          <div className="py-12 flex justify-center"><div className="h-8 w-8 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div></div>
        ) : (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Perf Rating</span>
                <span className="block text-lg font-extrabold text-white mt-1">{selectedDriver.performance_score}%</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Safety Score</span>
                <span className="block text-lg font-extrabold text-green-400 mt-1">{selectedDriver.safety_score}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Completed Trips</span>
                <span className="block text-lg font-extrabold text-white mt-1 font-mono">{selectedDriver.trip_count || 0}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Fuel Economy</span>
                <span className="block text-lg font-extrabold text-amber-500 mt-1 font-mono text-sm">{selectedDriver.fuel_efficiency || 0} km/L</span>
              </div>
            </div>

            {/* Profile Logs */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5">
                <Milestone className="h-4 w-4 text-brand-orange" />
                Recent Dispatched Trips
              </h4>
              {selectedDriver.trip_history?.length === 0 ? (
                <p className="text-[11px] text-gray-500 py-4 text-center">No operations registered under this driver.</p>
              ) : (
                <div className="space-y-2.5">
                  {selectedDriver.trip_history?.map(t => (
                    <div key={t.id} className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs flex justify-between items-center gap-4">
                      <div>
                        <p className="font-semibold text-white">{t.source} → {t.destination}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Vehicle: {t.vehicle_name} ({t.registration_number})</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-gray-400 block">{t.planned_distance} km</span>
                        <span className="text-[9px] uppercase tracking-wider text-brand-orange font-bold mt-1 block">{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="button" onClick={() => setDetailOpen(false)} className="btn-secondary">Close Card</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
