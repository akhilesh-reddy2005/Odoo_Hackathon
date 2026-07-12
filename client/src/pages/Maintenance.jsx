import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Wrench,
  Plus,
  Trash2,
  CheckCircle2,
  Play,
  XCircle,
  Tag,
  IndianRupee
} from 'lucide-react';

import { maintenanceService, vehicleService } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import Badge from '../components/Badge';

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

  const priorityTone = (p) => (
    p === 'Critical' ? 'danger' : p === 'High' ? 'warning' : p === 'Medium' ? 'info' : 'neutral'
  );

  return (
    <div className="space-y-6">
      {/* Search and control filter deck */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center card p-5">
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Search bar */}
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issue or vehicle..."
            className="w-full md:w-64"
          />

          {/* Status filter */}
          <select
            className="input cursor-pointer w-full sm:w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Requests</option>
            <option value="In Progress">Undergoing Repairs</option>
            <option value="Completed">Completed Tickets</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Priority filter */}
          <select
            className="input cursor-pointer w-full sm:w-auto"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <button onClick={() => setCreateOpen(true)} className="btn-primary h-10 px-4 w-full md:w-auto">
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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">Vehicle Target</th>
                  <th className="table-header">Reported Defect</th>
                  <th className="table-header">Costs Ledger</th>
                  <th className="table-header text-center">Priority</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right">Workshop Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id || log._id} className="hover:bg-surface-hover transition-colors group">
                    <td className="table-cell">
                      <p className="font-semibold text-ink-primary text-sm">{log.vehicle_name}</p>
                      <p className="text-xs text-ink-muted font-mono mt-0.5">{log.vehicle_reg}</p>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-ink-primary text-sm flex items-center gap-1">
                        <Tag className="h-3 w-3 text-brand" />
                        {log.issue}
                      </p>
                      <p className="text-xs text-ink-muted mt-1 max-w-xs truncate leading-relaxed">
                        {log.description || 'No diagnostic remarks.'}
                      </p>
                    </td>
                    <td className="table-cell text-xs font-mono">
                      <p className="text-ink-secondary">Est: ₹{log.estimated_cost}</p>
                      {log.status === 'Completed' && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Act: ₹{log.actual_cost}</p>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      <Badge tone={priorityTone(log.priority)}>{log.priority}</Badge>
                    </td>
                    <td className="table-cell text-center">
                      <Badge status={log.status} />
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex gap-2 justify-end items-center opacity-85 group-hover:opacity-100 transition-opacity">
                        {/* Start repair trigger */}
                        {log.status === 'Pending' && (
                          <button
                            onClick={() => handleStartRepair(log.id || log._id)}
                            className="btn-primary h-8 px-2.5 text-xs font-semibold"
                          >
                            <Play className="h-3 w-3" />
                            Start Work
                          </button>
                        )}

                        {/* Complete repair trigger */}
                        {log.status === 'In Progress' && (
                          <button
                            onClick={() => triggerComplete(log)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all active:scale-[0.98]"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </button>
                        )}

                        {/* Cancel ticket */}
                        {(log.status === 'Pending' || log.status === 'In Progress') && (
                          <button
                            onClick={() => handleCancelTicket(log.id || log._id)}
                            className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all active:scale-[0.98]"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        )}

                        {/* Delete ticket */}
                        {(log.status === 'Completed' || log.status === 'Cancelled') && (
                          <button
                            onClick={() => handleDelete(log.id || log._id)}
                            className="p-1.5 bg-surface border border-line hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 transition-all h-8 w-8 flex items-center justify-center"
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
            <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
          )}
        </div>
      )}

      {/* Modal: File ticket */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Open Workshop Maintenance Ticket">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Vehicle</label>
              <select
                className="input cursor-pointer"
                {...register('vehicle_id', { required: 'Vehicle selection required' })}
              >
                <option value="">Select vehicle...</option>
                {vehicles
                  .filter(v => v.status !== 'Retired' && v.status !== 'On Trip')
                  .map(v => (
                    <option key={v.id || v._id} value={v.id || v._id}>
                      {v.name} ({v.registration_number})
                    </option>
                  ))}
              </select>
              {errors.vehicle_id && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Priority Level</label>
              <select className="input cursor-pointer" {...register('priority', { required: true })}>
                <option value="Low">Low (Inspection)</option>
                <option value="Medium">Medium (Part wear)</option>
                <option value="High">High (Active failure)</option>
                <option value="Critical">Critical (Safety Ground)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Reported Issue Summary</label>
              <input
                type="text"
                placeholder="e.g. Steering alignment drift..."
                className="input"
                {...register('issue', { required: 'Issue title is required' })}
              />
              {errors.issue && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.issue.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Estimated Cost (₹ INR)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 450"
              className="input"
              {...register('estimated_cost', { required: 'Estimated cost is required' })}
            />
            {errors.estimated_cost && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.estimated_cost.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Mechanical Diagnostics Remark</label>
            <textarea
              rows="3"
              placeholder="Describe full diagnostics, worn parts numbers, or troubleshooting steps..."
              className="input resize-none"
              {...register('description')}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">File Ticket</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close Ticket & Register Actual Cost */}
      <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title="Close Ticket & File Costs">
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <p className="text-xs text-ink-muted leading-relaxed">
            Please input the actual repair cost billed by the workshop. This will complete the ticket, release the vehicle, and automatically file a transaction ledger in the expenses database.
          </p>
          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Actual Repair Cost (₹ INR)</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                type="number"
                step="0.01"
                placeholder="Enter final cost..."
                className="input pl-9"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => setCompleteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700">Complete Repair</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
