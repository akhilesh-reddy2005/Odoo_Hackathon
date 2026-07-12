import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Wrench, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  XCircle, 
  ExternalLink,
  Tag,
  IndianRupee
} from 'lucide-react';

import { maintenanceService, vehicleService } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

export default function Maintenance() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [vehicles, setVehicles] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  
  // Completing tickets parameters
  const [completingTicket, setCompletingTicket] = useState(null);
  const [actualCost, setActualCost] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Load maintenance reports list
  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await maintenanceService.getAll({ search, status, priority, page, limit });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);

      // Load vehicles list for dropdowns
      const fleet = await vehicleService.getAll({ limit: 100 });
      setVehicles(fleet.vehicles || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load maintenance logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [search, status, priority, page]);

  // Create Ticket Submit
  const onCreateSubmit = async (data) => {
    try {
      await maintenanceService.create(data);
      toast.toast ? toast.toast('Maintenance request filed!') : toast.success('Maintenance ticket logged in Pending status.');
      setCreateOpen(false);
      reset();
      loadLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file maintenance request.');
    }
  };

  // Start repair
  const handleStartRepair = async (id) => {
    try {
      await maintenanceService.update(id, { status: 'In Progress' });
      toast.success('Vehicle logged in workshop. Status set to In Shop.');
      loadLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start repairs.');
    }
  };

  // Trigger Complete Dialog
  const triggerComplete = (ticket) => {
    setCompletingTicket(ticket);
    setActualCost(ticket.estimated_cost); // pre-populate with estimation
    setCompleteOpen(true);
  };

  // Complete ticket
  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!actualCost || parseFloat(actualCost) <= 0) {
      toast.error('Please input a valid actual repair cost.');
      return;
    }
    try {
      await maintenanceService.update(completingTicket.id || completingTicket._id, { 
        status: 'Completed', 
        actual_cost: parseFloat(actualCost) 
      });
      toast.success('Repairs completed. Vehicle status restored. Expense logged.');
      setCompleteOpen(false);
      loadLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete repairs.');
    }
  };

  // Cancel Ticket
  const handleCancelTicket = async (id) => {
    if (!window.confirm('Cancel this maintenance ticket?')) return;
    try {
      await maintenanceService.update(id, { status: 'Cancelled' });
      toast.success('Maintenance ticket marked as Cancelled.');
      loadLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel ticket.');
    }
  };

  // Delete Ticket
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ticket from database permanently?')) return;
    try {
      await maintenanceService.delete(id);
      toast.success('Ticket deleted.');
      loadLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and control filter deck */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-6">
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search issue or vehicle..."
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
            <option value="Pending" className="bg-darkbg-sidebar">Pending Requests</option>
            <option value="In Progress" className="bg-darkbg-sidebar">Undergoing Repairs</option>
            <option value="Completed" className="bg-darkbg-sidebar">Completed Tickets</option>
            <option value="Cancelled" className="bg-darkbg-sidebar">Cancelled</option>
          </select>

          {/* Priority filter */}
          <select
            className="glass-input cursor-pointer w-full sm:w-auto text-xs"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="All" className="bg-darkbg-sidebar">All Priorities</option>
            <option value="Low" className="bg-darkbg-sidebar">Low</option>
            <option value="Medium" className="bg-darkbg-sidebar">Medium</option>
            <option value="High" className="bg-darkbg-sidebar">High</option>
            <option value="Critical" className="bg-darkbg-sidebar">Critical</option>
          </select>
        </div>

        <button onClick={() => setCreateOpen(true)} className="btn-primary h-11 px-4 w-full md:w-auto">
          <Plus className="h-4 w-4" />
          Log Maintenance
        </button>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : logs.length === 0 ? (
        <EmptyState title="No maintenance tickets match selection" icon={Wrench} />
      ) : (
        <div className="glass-card border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="table-header text-[10px]">Vehicle Target</th>
                  <th className="table-header text-[10px]">Reported Defect</th>
                  <th className="table-header text-[10px]">Costs Ledger</th>
                  <th className="table-header text-[10px] text-center">Priority</th>
                  <th className="table-header text-[10px] text-center">Status</th>
                  <th className="table-header text-[10px] text-right">Workshop Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id || log._id} className="hover:bg-white/5 transition-all group">
                    <td className="table-cell">
                      <p className="font-semibold text-white text-xs">{log.vehicle_name}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{log.vehicle_reg}</p>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-white text-xs flex items-center gap-1">
                        <Tag className="h-3 w-3 text-brand-orange" />
                        {log.issue}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-xs truncate leading-relaxed">
                        {log.description || 'No diagnostic remarks.'}
                      </p>
                    </td>
                    <td className="table-cell text-xs font-mono">
                      <p className="text-gray-300">Est: ₹{log.estimated_cost}</p>
                      {log.status === 'Completed' && (
                        <p className="text-green-400 font-semibold mt-0.5">Act: ₹{log.actual_cost}</p>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded border ${
                        log.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        log.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {log.priority}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge text-[9px] ${
                        log.status === 'Completed' ? 'bg-green-500/15 text-green-400 border border-green-500/25' :
                        log.status === 'In Progress' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25' :
                        log.status === 'Cancelled' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                        'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex gap-2 justify-end items-center opacity-85 group-hover:opacity-100 transition-opacity">
                        {/* Start repair trigger */}
                        {log.status === 'Pending' && (
                          <button
                            onClick={() => handleStartRepair(log.id || log._id)}
                            className="btn-primary h-8 px-2.5 text-[10px] uppercase font-bold flex items-center gap-1 shadow-md shadow-brand-orange/10"
                          >
                            <Play className="h-3 w-3" />
                            Start Work
                          </button>
                        )}

                        {/* Complete repair trigger */}
                        {log.status === 'In Progress' && (
                          <button
                            onClick={() => triggerComplete(log)}
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-2.5 text-[10px] uppercase font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </button>
                        )}

                        {/* Cancel ticket */}
                        {(log.status === 'Pending' || log.status === 'In Progress') && (
                          <button
                            onClick={() => handleCancelTicket(log.id || log._id)}
                            className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 h-8 px-2.5 text-[10px] uppercase font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        )}

                        {/* Delete ticket */}
                        {(log.status === 'Completed' || log.status === 'Cancelled') && (
                          <button
                            onClick={() => handleDelete(log.id || log._id)}
                            className="p-1.5 bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all h-8 w-8 flex items-center justify-center"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
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
              <span className="text-gray-400">Showing {logs.length} of {total} tickets</span>
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

      {/* Modal: File ticket */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Open Workshop Maintenance Ticket">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vehicle</label>
              <select
                className="glass-input cursor-pointer"
                {...register('vehicle_id', { required: 'Vehicle selection required' })}
              >
                <option value="" className="bg-darkbg-sidebar">Select vehicle...</option>
                {vehicles
                  .filter(v => v.status !== 'Retired' && v.status !== 'On Trip')
                  .map(v => (
                    <option key={v.id || v._id} value={v.id || v._id} className="bg-darkbg-sidebar">
                      {v.name} ({v.registration_number})
                    </option>
                  ))}
              </select>
              {errors.vehicle_id && <p className="text-[10px] text-red-500 mt-1">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Priority Level</label>
              <select className="glass-input cursor-pointer" {...register('priority', { required: true })}>
                <option value="Low" className="bg-darkbg-sidebar">Low (Inspection)</option>
                <option value="Medium" className="bg-darkbg-sidebar">Medium (Part wear)</option>
                <option value="High" className="bg-darkbg-sidebar">High (Active failure)</option>
                <option value="Critical" className="bg-darkbg-sidebar">Critical (Safety Ground)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Reported Issue Summary</label>
              <input
                type="text"
                placeholder="e.g. Steering alignment drift..."
                className="glass-input"
                {...register('issue', { required: 'Issue title is required' })}
              />
              {errors.issue && <p className="text-[10px] text-red-500 mt-1">{errors.issue.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Estimated Cost (₹ INR)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 450"
              className="glass-input"
              {...register('estimated_cost', { required: 'Estimated cost is required' })}
            />
            {errors.estimated_cost && <p className="text-[10px] text-red-500 mt-1">{errors.estimated_cost.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Mechanical Diagnostics Remark</label>
            <textarea
              rows="3"
              placeholder="Describe full diagnostics, worn parts numbers, or troubleshooting steps..."
              className="glass-input resize-none"
              {...register('description')}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">File Ticket</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close Ticket & Register Actual Cost */}
      <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title="Close Ticket & File Costs">
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Please input the actual repair cost billed by the workshop. This will complete the ticket, release the vehicle, and automatically file a transaction ledger in the expenses database.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Actual Repair Cost (₹ INR)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold"><IndianRupee className="h-4 w-4" /></span>
              <input
                type="number"
                step="0.01"
                placeholder="Enter final cost..."
                className="glass-input pl-8"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setCompleteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary bg-green-600 hover:bg-green-700">Complete Repair</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
