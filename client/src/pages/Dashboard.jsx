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
  Calendar,
  Layers,
  Compass
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import LeafletMap from '../components/LeafletMap';

import { analyticsService, tripService, fuelService, maintenanceService, vehicleService, driverService } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { CHART_TOOLTIP_STYLE, CHART_TOOLTIP_LABEL_STYLE } from '../constants/theme';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [vehicles, setVehicles] = useState([]);

  // Modals state
  const [fuelOpen, setFuelOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);

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

    // Poll vehicle locations every 5 seconds to keep dashboard map live
    const interval = setInterval(async () => {
      try {
        const fleet = await vehicleService.getAll({ limit: 100 });
        setVehicles(fleet.vehicles || []);
      } catch (err) {
        console.error("Error polling vehicle locations on dashboard:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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

  // Pie chart colors — success/info/warning/danger semantic mapping
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#F43F5E']; // Available, On Trip, In Shop, Retired
  const chartData = vehicleStatusChart?.length > 0 ? vehicleStatusChart : [
    { name: 'Available', value: kpis.availableVehicles },
    { name: 'On Trip', value: kpis.activeVehicles },
    { name: 'In Shop', value: kpis.inMaintenance },
    { name: 'Retired', value: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Overview stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Vehicles Card */}
        <div className="card p-5 flex items-center justify-between border-l-2 border-l-brand">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Active Operations</span>
            <span className="text-2xl font-bold text-ink-primary mt-2 block">{kpis.activeTrips} / {kpis.activeVehicles}</span>
            <p className="text-xs text-ink-muted mt-2">dispatched trips &amp; trucks</p>
          </div>
          <div className="bg-brand/10 p-3 rounded-lg">
            <Truck className="h-5 w-5 text-brand" />
          </div>
        </div>

        {/* Available Fleet Card */}
        <div className="card p-5 flex items-center justify-between border-l-2 border-l-emerald-500">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Available Fleet</span>
            <span className="text-2xl font-bold text-ink-primary mt-2 block">{kpis.availableVehicles}</span>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">ready to dispatch</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-lg">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Fleet Utilization Card */}
        <div className="card p-5 flex items-center justify-between border-l-2 border-l-blue-500">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Utilization Rate</span>
            <span className="text-2xl font-bold text-ink-primary mt-2 block">{kpis.fleetUtilization}%</span>
            <div className="w-24 bg-surface-hover rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${kpis.fleetUtilization}%` }}></div>
            </div>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Financial Flow Card */}
        <div className="card p-5 flex items-center justify-between border-l-2 border-l-amber-500">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Today's Costs</span>
            <span className="text-2xl font-bold text-ink-primary mt-2 block">₹{(kpis.todayExpenses + kpis.todayFuelCost).toFixed(2)}</span>
            <p className="text-xs text-ink-muted mt-2">
              Fuel: ₹{kpis.todayFuelCost.toFixed(2)} · Exp: ₹{kpis.todayExpenses.toFixed(2)}
            </p>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-lg">
            <Fuel className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </section>

      {/* Quick Action Drawer Section */}
      <section className="card p-6">
        <h3 className="text-sm font-semibold text-ink-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => navigate('/fleet')} className="btn-secondary h-12">
            <PlusCircle className="h-4 w-4 text-brand" />
            <span className="text-xs font-medium">Register Vehicle</span>
          </button>

          <button onClick={() => navigate('/trips')} className="btn-secondary h-12">
            <Milestone className="h-4 w-4 text-brand" />
            <span className="text-xs font-medium">Dispatch Trip</span>
          </button>

          <button onClick={() => setFuelOpen(true)} className="btn-secondary h-12">
            <Fuel className="h-4 w-4 text-brand" />
            <span className="text-xs font-medium">Log Fuel Cost</span>
          </button>

          <button onClick={() => setMaintOpen(true)} className="btn-secondary h-12">
            <Wrench className="h-4 w-4 text-brand" />
            <span className="text-xs font-medium">Raise Maintenance</span>
          </button>
        </div>
      </section>

      {/* Interactive Fleet Map Section */}
      <section className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-line pb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <Compass className="h-4 w-4 text-ink-muted" />
              Real-time Fleet Operations Map
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">Live vehicle tracking and dispatch diagnostics</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-ink-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> On Trip</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Maintenance</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Retired</span>
          </div>
        </div>

        <div className="h-[380px] rounded-lg overflow-hidden border border-line relative">
          <LeafletMap
            center={{ lat: 39.8283, lng: -98.5795 }}
            zoom={4}
            height="100%"
            markers={vehicles
              .filter(v => v.currentLocation && v.currentLocation.latitude !== 0)
              .map(vehicle => {
                let color = '#94A3B8';
                if (vehicle.status === 'Available') color = '#10B981';
                else if (vehicle.status === 'On Trip') color = '#3B82F6';
                else if (vehicle.status === 'In Shop') color = '#F59E0B';
                return {
                  lat: vehicle.currentLocation.latitude,
                  lng: vehicle.currentLocation.longitude,
                  color,
                  title: `${vehicle.name} (${vehicle.registration_number}) — ${vehicle.status}`,
                  size: 16
                };
              })
            }
          />
        </div>
      </section>

      {/* Middle section: Chart and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Trips List (2/3 width) */}
        <section className="lg:col-span-2 card overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-ink-muted" />
                Recent Dispatched Trips
              </h3>
              <button
                onClick={() => navigate('/trips')}
                className="text-xs text-brand hover:text-brand-hover font-medium transition-colors flex items-center gap-0.5"
              >
                View Registry
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header">Route</th>
                    <th className="table-header">Vehicle</th>
                    <th className="table-header">Driver</th>
                    <th className="table-header text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-sm text-ink-muted">
                        No recent operations logs.
                      </td>
                    </tr>
                  ) : (
                    recentTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-surface-hover transition-colors">
                        <td className="table-cell">
                          <p className="font-medium text-ink-primary text-sm">{trip.source} → {trip.destination}</p>
                          <p className="text-xs text-ink-muted mt-0.5">{trip.planned_distance} km</p>
                        </td>
                        <td className="table-cell">
                          <p className="text-ink-primary font-medium">{trip.vehicle_name}</p>
                          <p className="text-xs text-ink-muted font-mono">{trip.registration_number}</p>
                        </td>
                        <td className="table-cell font-medium">
                          {trip.driver_name}
                        </td>
                        <td className="table-cell text-center">
                          <Badge status={trip.status} />
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
        <section className="card p-6 flex flex-col justify-between h-full">
          <div className="border-b border-line pb-4 mb-4">
            <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <Layers className="h-4 w-4 text-ink-muted" />
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
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-ink-muted font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Warnings & Alerts Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Maintenance Alerts */}
        <section className="card p-6">
          <h3 className="text-sm font-semibold text-ink-primary border-b border-line pb-4 mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-ink-muted" />
            Active Repairs &amp; Shop Tickets
          </h3>
          <div className="space-y-3">
            {maintenanceAlerts.length === 0 ? (
              <p className="text-sm text-ink-muted py-4 text-center">No active vehicles undergoing repairs.</p>
            ) : (
              maintenanceAlerts.map((log) => (
                <div key={log.id} className="p-3 bg-surface-sunken rounded-lg border border-line flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-primary truncate">{log.issue} ({log.vehicle_name})</p>
                    <p className="text-xs text-ink-muted truncate mt-1">Est: ₹{log.estimated_cost} · {log.description}</p>
                  </div>
                  <Badge tone={log.priority === 'Critical' ? 'danger' : log.priority === 'High' ? 'warning' : 'info'}>
                    {log.priority}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </section>

        {/* License Expiry Alerts */}
        <section className="card p-6">
          <h3 className="text-sm font-semibold text-ink-primary border-b border-line pb-4 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-ink-muted" />
            License Expiry Compliance Check
          </h3>
          <div className="space-y-3">
            {licenseAlerts.length === 0 ? (
              <p className="text-sm text-ink-muted py-4 text-center">All driver credentials compliant.</p>
            ) : (
              licenseAlerts.map((driver) => {
                const expired = new Date(driver.license_expiry) <= new Date();
                return (
                  <div key={driver.id} className="p-3 bg-surface-sunken rounded-lg border border-line flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-primary truncate">{driver.name}</p>
                      <p className="text-xs text-ink-muted mt-1">License: {driver.license_number}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${expired ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {expired ? 'EXPIRED' : 'EXPIRING SOON'}
                      </p>
                      <p className="text-xs text-ink-muted font-mono mt-0.5">{driver.license_expiry}</p>
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
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Vehicle</label>
            <select
              className="input cursor-pointer"
              value={fuelData.vehicle_id}
              onChange={(e) => setFuelData({ ...fuelData, vehicle_id: e.target.value })}
              required
            >
              <option value="">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
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
                placeholder="e.g. 150"
                className="input"
                value={fuelData.fuel_quantity}
                onChange={(e) => setFuelData({ ...fuelData, fuel_quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Cost (Total ₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 600"
                className="input"
                value={fuelData.fuel_cost}
                onChange={(e) => setFuelData({ ...fuelData, fuel_cost: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Odometer Reading (KM)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 24500"
                className="input"
                value={fuelData.odometer}
                onChange={(e) => setFuelData({ ...fuelData, odometer: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Log Date</label>
              <input
                type="date"
                className="input"
                value={fuelData.date}
                onChange={(e) => setFuelData({ ...fuelData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
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
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Vehicle</label>
              <select
                className="input cursor-pointer"
                value={maintData.vehicle_id}
                onChange={(e) => setMaintData({ ...maintData, vehicle_id: e.target.value })}
                required
              >
                <option value="">Select vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.registration_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Priority Level</label>
              <select
                className="input cursor-pointer"
                value={maintData.priority}
                onChange={(e) => setMaintData({ ...maintData, priority: e.target.value })}
                required
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
                <option value="Critical">Critical (Grounded)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Reported Issue</label>
            <input
              type="text"
              placeholder="Brief summary of failure (e.g. Brake pad wear)..."
              className="input"
              value={maintData.issue}
              onChange={(e) => setMaintData({ ...maintData, issue: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Estimated Cost (₹)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Estimated repair costs..."
              className="input"
              value={maintData.estimated_cost}
              onChange={(e) => setMaintData({ ...maintData, estimated_cost: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Issue Description</label>
            <textarea
              rows="3"
              placeholder="Describe full mechanical diagnostics or troubleshooting notes..."
              className="input resize-none"
              value={maintData.description}
              onChange={(e) => setMaintData({ ...maintData, description: e.target.value })}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => setMaintOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Issue</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
