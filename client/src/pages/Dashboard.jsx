import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Truck, 
  Users, 
  Milestone, 
  Wrench, 
  Fuel, 
  TrendingUp, 
  AlertTriangle, 
  PlusCircle, 
  ClipboardList, 
  ChevronRight, 
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { analyticsService, tripService, fuelService, maintenanceService, vehicleService, driverService } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Modals state
  const [fuelOpen, setFuelOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  
  // Form fields states
  const [fuelData, setFuelData] = useState({ vehicle_id: '', date: new Date().toISOString().split('T')[0], fuel_quantity: '', fuel_cost: '', odometer: '' });
  const [maintData, setMaintData] = useState({ vehicle_id: '', issue: '', description: '', priority: 'Medium', estimated_cost: '' });

  // Load stats
  const fetchStats = async () => {
    try {
      const data = await analyticsService.getDashboard();
      setStats(data);
      
      // Load vehicles list for dropdowns
      const fleet = await vehicleService.getAll({ limit: 100 });
      setVehicles(fleet.vehicles || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Quick Action Fuel Submit
  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    try {
      await fuelService.create(fuelData);
      toast.success('Fuel log recorded and expense registered!');
      setFuelOpen(false);
      setFuelData({ vehicle_id: '', date: new Date().toISOString().split('T')[0], fuel_quantity: '', fuel_cost: '', odometer: '' });
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record fuel log.');
    }
  };

  // Quick Action Maintenance Submit
  const handleMaintSubmit = async (e) => {
    e.preventDefault();
    try {
      await maintenanceService.create(maintData);
      toast.success('Maintenance ticket logged successfully.');
      setMaintOpen(false);
      setMaintData({ vehicle_id: '', issue: '', description: '', priority: 'Medium', estimated_cost: '' });
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file maintenance request.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  const { kpis, recentTrips, maintenanceAlerts, licenseAlerts, vehicleStatusChart } = stats;

  // Custom colors for Pie chart
  const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ef4444']; // Available (Green), On Trip (Orange), In Shop (Blue), Retired (Red)
  const chartData = vehicleStatusChart?.length > 0 ? vehicleStatusChart : [
    { name: 'Available', value: kpis.availableVehicles },
    { name: 'On Trip', value: kpis.activeVehicles },
    { name: 'In Shop', value: kpis.inMaintenance },
    { name: 'Retired', value: 0 }
  ];

  return (
    <div className="space-y-8">
      {/* Overview stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Vehicles Card */}
        <div className="glass-card glass-card-hover p-6 flex items-center justify-between border-l-4 border-l-brand-orange animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block">Active Operations</span>
            <span className="text-3xl font-extrabold text-white mt-2 block font-sans">{kpis.activeTrips} / {kpis.activeVehicles}</span>
            <p className="text-[10px] text-gray-500 font-semibold uppercase mt-2">dispatched trips & trucks</p>
          </div>
          <div className="bg-brand-orange/10 p-3.5 rounded-xl border border-brand-orange/20">
            <Truck className="h-6 w-6 text-brand-orange" />
          </div>
        </div>

        {/* Drivers On Duty Card */}
        <div className="glass-card glass-card-hover p-6 flex items-center justify-between border-l-4 border-l-green-500 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block">Available Fleet</span>
            <span className="text-3xl font-extrabold text-white mt-2 block font-sans">{kpis.availableVehicles}</span>
            <p className="text-[10px] text-green-500 font-semibold uppercase mt-2">ready to dispatch</p>
          </div>
          <div className="bg-green-500/10 p-3.5 rounded-xl border border-green-500/20">
            <Users className="h-6 w-6 text-green-500" />
          </div>
        </div>

        {/* Fleet Utilization Card */}
        <div className="glass-card glass-card-hover p-6 flex items-center justify-between border-l-4 border-l-blue-500 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block">Utilization Rate</span>
            <span className="text-3xl font-extrabold text-white mt-2 block font-sans">{kpis.fleetUtilization}%</span>
            <div className="w-24 bg-white/5 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${kpis.fleetUtilization}%` }}></div>
            </div>
          </div>
          <div className="bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/20">
            <TrendingUp className="h-6 w-6 text-blue-500" />
          </div>
        </div>

        {/* Financial Flow Card */}
        <div className="glass-card glass-card-hover p-6 flex items-center justify-between border-l-4 border-l-amber-500 animate-in fade-in slide-in-from-bottom-3 duration-600">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block">Today's Costs</span>
            <span className="text-3xl font-extrabold text-white mt-2 block font-sans">₹{(kpis.todayExpenses + kpis.todayFuelCost).toFixed(2)}</span>
            <p className="text-[10px] text-gray-500 font-semibold uppercase mt-2">
              Fuel: ₹{kpis.todayFuelCost.toFixed(2)} | Exp: ₹{kpis.todayExpenses.toFixed(2)}
            </p>
          </div>
          <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20">
            <Fuel className="h-6 w-6 text-amber-500" />
          </div>
        </div>
      </section>

      {/* Quick Action Drawer Section */}
      <section className="glass-card p-6 border border-white/5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Operations Control Deck</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => navigate('/fleet')} className="btn-secondary h-14 flex items-center justify-center gap-3 bg-white/5 border border-white/5 hover:border-brand-orange/30 group">
            <PlusCircle className="h-4 w-4 text-brand-orange transition-transform duration-200 group-hover:scale-110" />
            <span className="font-semibold text-xs">Register Vehicle</span>
          </button>
          
          <button onClick={() => navigate('/trips')} className="btn-secondary h-14 flex items-center justify-center gap-3 bg-white/5 border border-white/5 hover:border-brand-orange/30 group">
            <Milestone className="h-4 w-4 text-brand-orange transition-transform duration-200 group-hover:scale-110" />
            <span className="font-semibold text-xs">Dispatch Trip</span>
          </button>
          
          <button onClick={() => setFuelOpen(true)} className="btn-secondary h-14 flex items-center justify-center gap-3 bg-white/5 border border-white/5 hover:border-brand-orange/30 group">
            <Fuel className="h-4 w-4 text-brand-orange transition-transform duration-200 group-hover:scale-110" />
            <span className="font-semibold text-xs">Log Fuel Cost</span>
          </button>
          
          <button onClick={() => setMaintOpen(true)} className="btn-secondary h-14 flex items-center justify-center gap-3 bg-white/5 border border-white/5 hover:border-brand-orange/30 group">
            <Wrench className="h-4 w-4 text-brand-orange transition-transform duration-200 group-hover:scale-110" />
            <span className="font-semibold text-xs">Raise Maintenance</span>
          </button>
        </div>
      </section>

      {/* Middle section: Chart and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips List (2/3 width) */}
        <section className="lg:col-span-2 glass-card border border-white/5 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-brand-orange" />
                Recent Dispatched Trips
              </h3>
              <button 
                onClick={() => navigate('/trips')} 
                className="text-xs text-brand-orange hover:text-white font-semibold transition-colors flex items-center gap-0.5"
              >
                View Registry
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="table-header text-[10px]">Route</th>
                    <th className="table-header text-[10px]">Vehicle</th>
                    <th className="table-header text-[10px]">Driver</th>
                    <th className="table-header text-[10px]">Weight</th>
                    <th className="table-header text-[10px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentTrips.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-xs text-gray-500">
                        No recent operations logs.
                      </td>
                    </tr>
                  ) : (
                    recentTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-white/5 transition-all">
                        <td className="table-cell py-3.5">
                          <p className="font-semibold text-white text-xs">{trip.source} → {trip.destination}</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">{trip.planned_distance} km</p>
                        </td>
                        <td className="table-cell py-3.5 text-xs">
                          <p className="text-white font-medium">{trip.vehicle_name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{trip.registration_number}</p>
                        </td>
                        <td className="table-cell py-3.5 text-xs font-medium text-gray-300">
                          {trip.driver_name}
                        </td>
                        <td className="table-cell py-3.5 text-xs text-gray-400 font-mono">
                          {trip.cargo_weight} kg
                        </td>
                        <td className="table-cell py-3.5 text-center">
                          <span className={`status-badge text-[9px] ${
                            trip.status === 'Completed' ? 'bg-green-500/15 text-green-400 border border-green-500/25' :
                            trip.status === 'Dispatched' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25' :
                            trip.status === 'Cancelled' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                            'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                          }`}>
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Fleet Distribution Chart (1/3 width) */}
        <section className="glass-card border border-white/5 p-6 flex flex-col justify-between h-full">
          <div className="border-b border-white/5 pb-4 mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-orange" />
              Fleet Status Share
            </h3>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0e1420', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend 
                  layout="horizontal" 
                  align="center" 
                  verticalAlign="bottom" 
                  iconSize={8}
                  formatter={(value) => <span className="text-[10px] text-gray-400 font-semibold font-sans">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Warnings & Alerts Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance Alerts */}
        <section className="glass-card p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-4 mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-brand-orange" />
            Active Repairs & Shop Tickets
          </h3>
          <div className="space-y-3.5">
            {maintenanceAlerts.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No active vehicles undergoing repairs.</p>
            ) : (
              maintenanceAlerts.map((log) => (
                <div key={log.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{log.issue} ({log.vehicle_name})</p>
                    <p className="text-[10px] text-gray-500 truncate mt-1">Est: ₹{log.estimated_cost} | {log.description}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                    log.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    log.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {log.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* License Expiry Alerts */}
        <section className="glass-card p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-4 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-brand-orange" />
            License Expiry Compliance Check
          </h3>
          <div className="space-y-3.5">
            {licenseAlerts.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">All driver credentials compliant.</p>
            ) : (
              licenseAlerts.map((driver) => {
                const expired = new Date(driver.license_expiry) <= new Date();
                return (
                  <div key={driver.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{driver.name}</p>
                      <p className="text-[10px] text-gray-500 mt-1">License: {driver.license_number}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold ${expired ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                        {expired ? 'EXPIRED' : 'EXPIRING SOON'}
                      </p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">{driver.license_expiry}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Quick Action Modal: Log Fuel */}
      <Modal isOpen={fuelOpen} onClose={() => setFuelOpen(false)} title="Log Fuel Expense">
        <form onSubmit={handleFuelSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vehicle</label>
            <select
              className="glass-input cursor-pointer"
              value={fuelData.vehicle_id}
              onChange={(e) => setFuelData({ ...fuelData, vehicle_id: e.target.value })}
              required
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
                placeholder="e.g. 150"
                className="glass-input"
                value={fuelData.fuel_quantity}
                onChange={(e) => setFuelData({ ...fuelData, fuel_quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Cost (Total USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 600"
                className="glass-input"
                value={fuelData.fuel_cost}
                onChange={(e) => setFuelData({ ...fuelData, fuel_cost: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Odometer Reading (KM)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 24500"
                className="glass-input"
                value={fuelData.odometer}
                onChange={(e) => setFuelData({ ...fuelData, odometer: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Log Date</label>
              <input
                type="date"
                className="glass-input"
                value={fuelData.date}
                onChange={(e) => setFuelData({ ...fuelData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setFuelOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Purchase</button>
          </div>
        </form>
      </Modal>

      {/* Quick Action Modal: Raise Maintenance */}
      <Modal isOpen={maintOpen} onClose={() => setMaintOpen(false)} title="File Maintenance Request">
        <form onSubmit={handleMaintSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vehicle</label>
              <select
                className="glass-input cursor-pointer"
                value={maintData.vehicle_id}
                onChange={(e) => setMaintData({ ...maintData, vehicle_id: e.target.value })}
                required
              >
                <option value="" className="bg-darkbg-sidebar">Select vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id} className="bg-darkbg-sidebar">
                    {v.name} ({v.registration_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Priority Level</label>
              <select
                className="glass-input cursor-pointer"
                value={maintData.priority}
                onChange={(e) => setMaintData({ ...maintData, priority: e.target.value })}
                required
              >
                <option value="Low" className="bg-darkbg-sidebar">Low Priority</option>
                <option value="Medium" className="bg-darkbg-sidebar">Medium Priority</option>
                <option value="High" className="bg-darkbg-sidebar">High Priority</option>
                <option value="Critical" className="bg-darkbg-sidebar">Critical (Grounded)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Reported Issue</label>
            <input
              type="text"
              placeholder="Brief summary of failure (e.g. Brake pad wear)..."
              className="glass-input"
              value={maintData.issue}
              onChange={(e) => setMaintData({ ...maintData, issue: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Estimated Cost ($ USD)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Estimated repair costs..."
              className="glass-input"
              value={maintData.estimated_cost}
              onChange={(e) => setMaintData({ ...maintData, estimated_cost: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Issue Description</label>
            <textarea
              rows="3"
              placeholder="Describe full mechanical diagnostics or troubleshooting notes..."
              className="glass-input resize-none"
              value={maintData.description}
              onChange={(e) => setMaintData({ ...maintData, description: e.target.value })}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setMaintOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Issue</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
