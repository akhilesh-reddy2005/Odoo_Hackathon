import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Plus, 
  Fuel, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Layers,
  ArrowUpDown,
  Tag,
  ClipboardList
} from 'lucide-react';

import { fuelService, expenseService, vehicleService } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

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

  const { register, handleSubmit: handleForm, reset, formState: { errors } } = useForm();

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
      reset();
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
      toast.toast ? toast.toast('Expense recorded!') : toast.success('Expense successfully logged in ledger.');
      setExpenseOpen(false);
      reset();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record expense.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4">
        <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
          <button
            onClick={() => setActiveTab('fuel')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'fuel' 
                ? 'bg-brand-orange text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Fuel className="h-4 w-4" />
            Fuel Logs
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'expenses' 
                ? 'bg-brand-orange text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Expenses Ledger
          </button>
        </div>

        {activeTab === 'fuel' ? (
          <button onClick={() => setFuelOpen(true)} className="btn-primary h-10 px-4 text-xs font-bold">
            <Plus className="h-4 w-4" />
            Log Fuel Purchase
          </button>
        ) : (
          <button onClick={() => setExpenseOpen(true)} className="btn-primary h-10 px-4 text-xs font-bold">
            <Plus className="h-4 w-4" />
            Log Expense Entry
          </button>
        )}
      </div>

      {/* Filters Deck */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
        {activeTab === 'fuel' ? (
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter Vehicle:</span>
            <select
              className="glass-input cursor-pointer max-w-xs text-xs"
              value={fuelVehicleId}
              onChange={(e) => setFuelVehicleId(e.target.value)}
            >
              <option value="All" className="bg-darkbg-sidebar">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id} className="bg-darkbg-sidebar">{v.name} ({v.registration_number})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type:</span>
              <select
                className="glass-input cursor-pointer text-xs"
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value)}
              >
                <option value="All" className="bg-darkbg-sidebar">All Categories</option>
                <option value="Fuel" className="bg-darkbg-sidebar">Fuel Purchase</option>
                <option value="Maintenance" className="bg-darkbg-sidebar">Maintenance</option>
                <option value="Repair" className="bg-darkbg-sidebar">Repair Workshop</option>
                <option value="Toll" className="bg-darkbg-sidebar">Toll Fees</option>
                <option value="Insurance" className="bg-darkbg-sidebar">Insurance</option>
                <option value="Other" className="bg-darkbg-sidebar">Other Operational Costs</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle:</span>
              <select
                className="glass-input cursor-pointer text-xs"
                value={expenseVehicleId}
                onChange={(e) => setExpenseVehicleId(e.target.value)}
              >
                <option value="All" className="bg-darkbg-sidebar">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id} className="bg-darkbg-sidebar">{v.name}</option>
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
          <div className="glass-card border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="table-header text-[10px]">Date</th>
                  <th className="table-header text-[10px]">Vehicle</th>
                  <th className="table-header text-[10px]">Fuel Quantity</th>
                  <th className="table-header text-[10px]">Cost (INR)</th>
                  <th className="table-header text-[10px]">Odometer reading</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fuelLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="table-cell font-mono text-xs text-gray-400">
                      {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-white text-xs">{log.vehicle_name}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{log.vehicle_reg}</p>
                    </td>
                    <td className="table-cell text-xs text-gray-300 font-mono">
                      {log.fuel_quantity} Liters
                    </td>
                    <td className="table-cell text-xs font-semibold text-white font-mono">
                      ₹{parseFloat(log.fuel_cost).toFixed(2)}
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-400">
                      {parseFloat(log.odometer).toLocaleString()} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        expenses.length === 0 ? (
          <EmptyState title="No expenses registered" icon={DollarSign} />
        ) : (
          <div className="glass-card border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="table-header text-[10px]">Date</th>
                  <th className="table-header text-[10px]">Category</th>
                  <th className="table-header text-[10px]">Associated Target</th>
                  <th className="table-header text-[10px]">Amount</th>
                  <th className="table-header text-[10px]">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                    <td className="table-cell font-mono text-xs text-gray-400">
                      {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                        exp.type === 'Fuel' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        exp.type === 'Maintenance' || exp.type === 'Repair' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        exp.type === 'Toll' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {exp.type}
                      </span>
                    </td>
                    <td className="table-cell text-xs">
                      {exp.vehicle_name ? (
                        <>
                          <p className="font-semibold text-white text-xs">{exp.vehicle_name}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{exp.vehicle_reg}</p>
                        </>
                      ) : exp.source ? (
                        <p className="text-gray-400">Trip: {exp.source} → {exp.destination}</p>
                      ) : (
                        <span className="text-gray-500 font-mono">-</span>
                      )}
                    </td>
                    <td className="table-cell text-xs font-semibold text-white font-mono">
                      ₹{parseFloat(exp.amount).toFixed(2)}
                    </td>
                    <td className="table-cell text-xs text-gray-400 max-w-xs truncate">
                      {exp.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal: Log Fuel Purchase */}
      <Modal isOpen={fuelOpen} onClose={() => setFuelOpen(false)} title="Log Fuel Purchase">
        <form onSubmit={handleForm(onFuelSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vehicle</label>
            <select
              className="glass-input cursor-pointer"
              {...register('vehicle_id', { required: 'Vehicle selection required' })}
            >
              <option value="" className="bg-darkbg-sidebar">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id} className="bg-darkbg-sidebar">
                  {v.name} ({v.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Quantity (Liters)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 120"
                className="glass-input"
                {...register('fuel_quantity', { required: 'Quantity required' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Cost (₹ INR)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 480"
                className="glass-input"
                {...register('fuel_cost', { required: 'Cost required' })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Current Odometer (km)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Odometer at fueling..."
                className="glass-input"
                {...register('odometer', { required: 'Odometer required' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Purchase Date</label>
              <input
                type="date"
                className="glass-input"
                defaultValue={new Date().toISOString().split('T')[0]}
                {...register('date', { required: true })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setFuelOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Fuel Log</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Expense Entry */}
      <Modal isOpen={expenseOpen} onClose={() => setExpenseOpen(false)} title="Record Operational Expense">
        <form onSubmit={handleForm(onExpenseSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Expense Category</label>
              <select className="glass-input cursor-pointer" {...register('type', { required: true })}>
                <option value="Toll" className="bg-darkbg-sidebar">Toll Fees</option>
                <option value="Repair" className="bg-darkbg-sidebar">Minor Parts/Repair</option>
                <option value="Insurance" className="bg-darkbg-sidebar">Insurance Cost</option>
                <option value="Other" className="bg-darkbg-sidebar">Other Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Associated Vehicle</label>
              <select className="glass-input cursor-pointer" {...register('vehicle_id')}>
                <option value="" className="bg-darkbg-sidebar">No vehicle (General)</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id} className="bg-darkbg-sidebar">{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Amount Billed (₹ INR)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 120"
                className="glass-input"
                {...register('amount', { required: 'Amount required' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Transaction Date</label>
              <input
                type="date"
                className="glass-input"
                defaultValue={new Date().toISOString().split('T')[0]}
                {...register('date', { required: true })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Expense Description</label>
            <input
              type="text"
              placeholder="e.g. Bimonthly vehicle insurance premium..."
              className="glass-input"
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setExpenseOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Transaction</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
