import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Fuel,
  DollarSign,
  IndianRupee
} from 'lucide-react';

import { fuelService, expenseService, vehicleService } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

export default function FuelExpenses() {
  const [activeTab, setActiveTab] = useState('fuel'); // fuel, expenses
  const [loading, setLoading] = useState(true);

  // Lists data
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Counts
  const [fuelTotal, setFuelTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);

  // Filters
  const [fuelVehicleId, setFuelVehicleId] = useState('All');
  const [expenseType, setExpenseType] = useState('All');
  const [expenseVehicleId, setExpenseVehicleId] = useState('All');

  // Modals state
  const [fuelOpen, setFuelOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  // Track selected vehicle for odometer hint
  const [selectedVehicleOdo, setSelectedVehicleOdo] = useState(null);

  // Separate form instances to prevent cross-modal validation bleed
  const {
    register,
    handleSubmit: handleFuelSubmit,
    reset: resetFuel,
    formState: { errors: fuelErrors }
  } = useForm();

  const {
    register: registerExp,
    handleSubmit: handleExpSubmit,
    reset: resetExp,
    formState: { errors: expErrors }
  } = useForm();

  // Load fuel logs
  const loadFuel = async () => {
    try {
      const data = await fuelService.getAll({
        vehicle_id: fuelVehicleId === 'All' ? undefined : fuelVehicleId,
        limit: 50
      });
      setFuelLogs(data.logs || []);
      setFuelTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load fuel logs.');
    }
  };

  // Load expenses
  const loadExpenses = async () => {
    try {
      const data = await expenseService.getAll({
        type: expenseType === 'All' ? undefined : expenseType,
        vehicle_id: expenseVehicleId === 'All' ? undefined : expenseVehicleId,
        limit: 50
      });
      setExpenses(data.expenses || []);
      setExpenseTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load expenses ledger.');
    }
  };

  // Initial load
  const loadData = async () => {
    setLoading(true);
    try {
      // Load vehicles list
      const fleet = await vehicleService.getAll({ limit: 100 });
      setVehicles(fleet.vehicles || []);

      await Promise.all([loadFuel(), loadExpenses()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update lists when filters change
  useEffect(() => {
    if (!loading) {
      if (activeTab === 'fuel') loadFuel();
      else loadExpenses();
    }
  }, [fuelVehicleId, expenseType, expenseVehicleId, activeTab]);

  // Submit Fuel
  const onFuelSubmit = async (data) => {
    try {
      await fuelService.create(data);
      toast.success('Fuel log recorded. Vehicle efficiency & expenses updated!');
      setFuelOpen(false);
      setSelectedVehicleOdo(null);
      resetFuel();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record purchase.');
    }
  };

  // Submit Expense
  const onExpenseSubmit = async (data) => {
    try {
      await expenseService.create({
        ...data,
        vehicle_id: data.vehicle_id ? parseInt(data.vehicle_id) : null
      });
      toast.success('Expense successfully logged in ledger.');
      setExpenseOpen(false);
      resetExp();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record expense.');
    }
  };

  const expenseTone = (type) => {
    if (type === 'Fuel' || type === 'Toll') return 'warning';
    if (type === 'Maintenance' || type === 'Repair') return 'info';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex justify-between items-center card p-4">
        <div className="flex gap-1 p-1 bg-surface-sunken border border-line rounded-lg">
          <button
            onClick={() => setActiveTab('fuel')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'fuel'
                ? 'bg-surface text-ink-primary shadow-sm font-medium'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Fuel className="h-4 w-4" />
            Fuel Logs
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'expenses'
                ? 'bg-surface text-ink-primary shadow-sm font-medium'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Expenses Ledger
          </button>
        </div>

        {activeTab === 'fuel' ? (
          <button onClick={() => setFuelOpen(true)} className="btn-primary h-10 px-4 text-xs font-semibold">
            <Plus className="h-4 w-4" />
            Log Fuel Purchase
          </button>
        ) : (
          <button onClick={() => setExpenseOpen(true)} className="btn-primary h-10 px-4 text-xs font-semibold">
            <Plus className="h-4 w-4" />
            Log Expense Entry
          </button>
        )}
      </div>

      {/* Filters Deck */}
      <div className="card p-6">
        {activeTab === 'fuel' ? (
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Filter Vehicle:</span>
            <select
              className="input cursor-pointer max-w-xs text-xs"
              value={fuelVehicleId}
              onChange={(e) => setFuelVehicleId(e.target.value)}
            >
              <option value="All">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id || v._id} value={v.id || v._id}>{v.name} ({v.registration_number})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Type:</span>
              <select
                className="input cursor-pointer text-xs"
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Fuel">Fuel Purchase</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Repair">Repair Workshop</option>
                <option value="Toll">Toll Fees</option>
                <option value="Insurance">Insurance</option>
                <option value="Other">Other Operational Costs</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Vehicle:</span>
              <select
                className="input cursor-pointer text-xs"
                value={expenseVehicleId}
                onChange={(e) => setExpenseVehicleId(e.target.value)}
              >
                <option value="All">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v.id || v._id} value={v.id || v._id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Lists display */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : activeTab === 'fuel' ? (
        fuelLogs.length === 0 ? (
          <EmptyState title="No fuel logs registered" icon={Fuel} />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Vehicle</th>
                    <th className="table-header">Fuel Quantity</th>
                    <th className="table-header">Cost (INR)</th>
                    <th className="table-header">Odometer reading</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelLogs.map(log => (
                    <tr key={log.id || log._id} className="hover:bg-surface-hover transition-colors">
                      <td className="table-cell font-mono text-xs text-ink-muted">
                        {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="table-cell">
                        <p className="font-medium text-ink-primary text-sm">{log.vehicle_name}</p>
                        <p className="text-xs text-ink-muted font-mono mt-0.5">{log.vehicle_reg}</p>
                      </td>
                      <td className="table-cell text-sm text-ink-secondary font-mono">
                        {log.fuel_quantity} Liters
                      </td>
                      <td className="table-cell text-sm font-semibold text-ink-primary font-mono">
                        ₹{parseFloat(log.fuel_cost).toFixed(2)}
                      </td>
                      <td className="table-cell text-xs font-mono text-ink-muted">
                        {parseFloat(log.odometer).toLocaleString()} km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        expenses.length === 0 ? (
          <EmptyState title="No expenses registered" icon={DollarSign} />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Associated Target</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id || exp._id} className="hover:bg-surface-hover transition-colors">
                      <td className="table-cell font-mono text-xs text-ink-muted">
                        {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="table-cell">
                        <Badge tone={expenseTone(exp.type)}>{exp.type}</Badge>
                      </td>
                      <td className="table-cell text-sm">
                        {exp.vehicle_name ? (
                          <>
                            <p className="font-medium text-ink-primary text-sm">{exp.vehicle_name}</p>
                            <p className="text-xs text-ink-muted font-mono mt-0.5">{exp.vehicle_reg}</p>
                          </>
                        ) : exp.source ? (
                          <p className="text-ink-muted">Trip: {exp.source} → {exp.destination}</p>
                        ) : (
                          <span className="text-ink-muted font-mono">-</span>
                        )}
                      </td>
                      <td className="table-cell text-sm font-semibold text-ink-primary font-mono">
                        ₹{parseFloat(exp.amount).toFixed(2)}
                      </td>
                      <td className="table-cell text-sm text-ink-muted max-w-xs truncate">
                        {exp.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal: Log Fuel Purchase */}
      <Modal isOpen={fuelOpen} onClose={() => { setFuelOpen(false); setSelectedVehicleOdo(null); }} title="Log Fuel Purchase">
        <form onSubmit={handleFuelSubmit(onFuelSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Vehicle</label>
            <select
              className="input cursor-pointer"
              {...register('vehicle_id', { required: 'Vehicle selection required' })}
              onChange={(e) => {
                const v = vehicles.find(v => (v.id || v._id) == e.target.value);
                setSelectedVehicleOdo(v ? parseFloat(v.current_odometer) : null);
              }}
            >
              <option value="">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id || v._id} value={v.id || v._id}>
                  {v.name} ({v.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Quantity (Liters)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 120"
                className="input"
                {...register('fuel_quantity', { required: 'Quantity required', min: { value: 0.01, message: 'Must be > 0' } })}
              />
              {fuelErrors.fuel_quantity && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{fuelErrors.fuel_quantity.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Cost (₹ INR)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 480"
                  className="input pl-9"
                  {...register('fuel_cost', { required: 'Cost required', min: { value: 0.01, message: 'Must be > 0' } })}
                />
              </div>
              {fuelErrors.fuel_cost && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{fuelErrors.fuel_cost.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Current Odometer (km)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Odometer at fueling..."
                className="input"
                {...register('odometer', { required: 'Odometer required' })}
              />
              {fuelErrors.odometer && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{fuelErrors.odometer.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Purchase Date</label>
              <input
                type="date"
                className="input"
                defaultValue={new Date().toISOString().split('T')[0]}
                {...register('date', { required: true })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => { setFuelOpen(false); setSelectedVehicleOdo(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Fuel Log</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Expense Entry */}
      <Modal isOpen={expenseOpen} onClose={() => setExpenseOpen(false)} title="Record Operational Expense">
        <form onSubmit={handleExpSubmit(onExpenseSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Expense Category</label>
              <select className="input cursor-pointer" {...registerExp('type', { required: true })}>
                <option value="Toll">Toll Fees</option>
                <option value="Repair">Minor Parts/Repair</option>
                <option value="Insurance">Insurance Cost</option>
                <option value="Other">Other Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Associated Vehicle</label>
              <select className="input cursor-pointer" {...registerExp('vehicle_id')}>
                <option value="">No vehicle (General)</option>
                 {vehicles.map(v => (
                  <option key={v.id || v._id} value={v.id || v._id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Amount Billed (₹ INR)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 120"
                  className="input pl-9"
                  {...registerExp('amount', { required: 'Amount required' })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Transaction Date</label>
              <input
                type="date"
                className="input"
                defaultValue={new Date().toISOString().split('T')[0]}
                {...registerExp('date', { required: true })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Expense Description</label>
            <input
              type="text"
              placeholder="e.g. Bimonthly vehicle insurance premium..."
              className="input"
              {...registerExp('description')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => setExpenseOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Transaction</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
