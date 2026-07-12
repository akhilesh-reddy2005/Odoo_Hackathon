import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  ArrowUpDown,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  Award,
  Milestone,
  Navigation,
  Compass,
  Clock,
  ShieldAlert
} from 'lucide-react';
import LeafletMap from '../components/LeafletMap';

import { driverService } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';



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

  const performanceTone = (score) => (score >= 85 ? 'success' : score >= 65 ? 'warning' : 'danger');
  const safetyColor = (score) =>
    score >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
    score >= 80 ? 'text-amber-600 dark:text-amber-400' :
    'text-rose-600 dark:text-rose-400';

  return (
    <div className="space-y-6">
      {/* Filters card */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center card p-5">
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Search */}
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search driver name, phone..."
            className="w-full md:w-64"
          />

          {/* Status filter */}
          <select
            className="input cursor-pointer w-full sm:w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* License expiration filter */}
          <select
            className="input cursor-pointer w-full sm:w-auto"
            value={expired}
            onChange={(e) => setExpired(e.target.value)}
          >
            <option value="All">License Status</option>
            <option value="Valid">Active/Valid License</option>
            <option value="Expired">Expired License</option>
          </select>
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-end">
          <button onClick={handleExport} className="btn-secondary h-10 px-4">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={() => setRegisterOpen(true)} className="btn-primary h-10 px-4">
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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header cursor-pointer" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header">License Details</th>
                  <th className="table-header cursor-pointer" onClick={() => handleSort('license_expiry')}>
                    <span className="flex items-center gap-1">License Expiry <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header cursor-pointer text-center" onClick={() => handleSort('safety_score')}>
                    <span className="flex items-center gap-1 justify-center">Safety Score <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header text-center">Perf Rating</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-hover transition-colors group">
                    <td className="table-cell">
                      <p className="font-medium text-ink-primary text-sm">{d.name}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{d.phone}</p>
                    </td>
                    <td className="table-cell">
                      <span className="bg-surface-sunken border border-line px-2 py-0.5 rounded text-xs font-mono mr-1.5 uppercase text-ink-secondary">{d.license_category}</span>
                      <span className="font-mono text-ink-secondary">{d.license_number}</span>
                    </td>
                    <td className="table-cell font-mono text-ink-muted">
                      <span className="flex items-center gap-1.5">
                        {d.is_license_expired ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {d.license_expiry.split('T')[0]} (Expired)
                          </span>
                        ) : (
                          <span>{d.license_expiry.split('T')[0]}</span>
                        )}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`inline-flex items-center justify-center font-mono font-bold text-sm ${safetyColor(d.safety_score)}`}>
                        {d.safety_score} / 100
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <Badge tone={performanceTone(d.performance_score)}>
                        <Award className="h-3 w-3" />
                        {d.performance_score}%
                      </Badge>
                    </td>
                    <td className="table-cell text-center">
                      <Badge status={d.status} />
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex gap-1.5 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openDetails(d)} className="p-1.5 bg-surface border border-line hover:border-brand/30 hover:bg-surface-hover rounded-lg text-ink-muted hover:text-ink-primary transition-all">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(d)} className="p-1.5 bg-surface border border-line hover:border-brand/30 hover:bg-surface-hover rounded-lg text-ink-muted hover:text-ink-primary transition-all">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 bg-surface border border-line hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 transition-all">
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
            <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
          )}
        </div>
      )}

      {/* Modal: Add Driver */}
      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} title="Register Vehicle Operator">
        <form onSubmit={handleSubmit(onRegisterSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Driver Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              className="input"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +1-555-0199"
                className="input"
                {...register('phone', { required: 'Phone is required' })}
              />
              {errors.phone && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">License Number</label>
              <input
                type="text"
                placeholder="e.g. DL-TEX-8921A"
                className="input uppercase"
                {...register('license_number', { required: 'License is required' })}
              />
              {errors.license_number && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.license_number.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">License Category</label>
              <select className="input cursor-pointer" {...register('license_category', { required: true })}>
                <option value="CDL-A">CDL Class A</option>
                <option value="CDL-B">CDL Class B</option>
                <option value="CDL-C">CDL Class C</option>
                <option value="Standard">Standard Driver License</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">License Expiry Date</label>
              <input
                type="date"
                className="input"
                {...register('license_expiry', { required: 'Expiry date is required' })}
              />
              {errors.license_expiry && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.license_expiry.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => setRegisterOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Driver</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Driver */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Update Operator Credentials">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Driver Full Name</label>
            <input
              type="text"
              className="input"
              {...registerEdit('name', { required: true })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Phone Number</label>
              <input
                type="text"
                className="input"
                {...registerEdit('phone', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">License Number</label>
              <input
                type="text"
                className="input uppercase"
                {...registerEdit('license_number', { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">License Category</label>
              <select className="input cursor-pointer" {...registerEdit('license_category', { required: true })}>
                <option value="CDL-A">CDL Class A</option>
                <option value="CDL-B">CDL Class B</option>
                <option value="CDL-C">CDL Class C</option>
                <option value="Standard">Standard Driver License</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">License Expiry Date</label>
              <input
                type="date"
                className="input"
                {...registerEdit('license_expiry', { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Safety Score (0-100)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                {...registerEdit('safety_score', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Fuel Efficiency (km/L)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                {...registerEdit('fuel_efficiency', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Duty Status</label>
              <select className="input cursor-pointer" {...registerEdit('status', { required: true })}>
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="Off Duty">Off Duty</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Driver Details & History */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Operator Performance Card & Active Route" size="lg">
        {detailLoading || !selectedDriver ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="stat-tile">
                <span className="text-xs text-ink-muted font-medium uppercase tracking-wide">Perf Rating</span>
                <span className="block text-lg font-bold text-ink-primary mt-1">{selectedDriver.performance_score}%</span>
              </div>
              <div className="stat-tile">
                <span className="text-xs text-ink-muted font-medium uppercase tracking-wide">Safety Score</span>
                <span className="block text-lg font-bold text-ink-primary mt-1">{selectedDriver.safety_score}</span>
              </div>
              <div className="stat-tile">
                <span className="text-xs text-ink-muted font-medium uppercase tracking-wide">Completed Trips</span>
                <span className="block text-lg font-bold text-ink-primary mt-1 font-mono">{selectedDriver.trip_count || 0}</span>
              </div>
              <div className="stat-tile">
                <span className="text-xs text-ink-muted font-medium uppercase tracking-wide">Fuel Economy</span>
                <span className="block text-lg font-bold text-ink-primary mt-1 font-mono">{selectedDriver.fuel_efficiency || 0} km/L</span>
              </div>
            </div>

            {/* Active Assigned Route Section */}
            {selectedDriver.status === 'On Trip' && selectedDriver.trip_history?.find(t => t.status === 'Dispatched') ? (() => {
              const activeTrip = selectedDriver.trip_history.find(t => t.status === 'Dispatched');
              const eta = activeTrip.dispatched_at && activeTrip.estimatedDuration
                ? new Date(new Date(activeTrip.dispatched_at).getTime() + activeTrip.estimatedDuration * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'N/A';

              const decodedPath = activeTrip.routePolyline ? (() => {
                const poly = [];
                let idx = 0, length = activeTrip.routePolyline.length;
                let lt = 0, lg = 0;
                while (idx < length) {
                  let b, shift = 0, result = 0;
                  do {
                    b = activeTrip.routePolyline.charCodeAt(idx++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                  } while (b >= 0x20);
                  let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                  lt += dlat;
                  shift = 0;
                  result = 0;
                  do {
                    b = activeTrip.routePolyline.charCodeAt(idx++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                  } while (b >= 0x20);
                  let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                  lg += dlng;
                  poly.push({ lat: lt / 1e5, lng: lg / 1e5 });
                }
                return poly;
              })() : [];

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-surface-sunken rounded-lg border border-line">
                  {/* Map Column */}
                  <div className="space-y-2">
                    <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide flex items-center gap-1.5 pb-1 border-b border-line">
                      <Compass className="h-3.5 w-3.5 text-ink-muted" />
                      Current Assigned Route Map
                    </span>
                    <div className="h-[200px] rounded-lg overflow-hidden border border-line relative">
                      {activeTrip.sourceLocation?.latitude ? (
                        <LeafletMap
                          center={{ lat: activeTrip.sourceLocation.latitude, lng: activeTrip.sourceLocation.longitude }}
                          zoom={6}
                          height="100%"
                          autoBounds
                          markers={[
                            { lat: activeTrip.sourceLocation.latitude, lng: activeTrip.sourceLocation.longitude, label: 'A', color: '#22c55e' },
                            { lat: activeTrip.destinationLocation.latitude, lng: activeTrip.destinationLocation.longitude, label: 'B', color: '#3b82f6' },
                            ...(activeTrip.vehicle?.currentLocation?.latitude ? [{
                              lat: activeTrip.vehicle.currentLocation.latitude,
                              lng: activeTrip.vehicle.currentLocation.longitude,
                              color: '#f97316', title: 'Vehicle Position', size: 14
                            }] : [])
                          ]}
                          polylines={decodedPath.length > 0 ? [{ points: decodedPath, color: '#f97316', weight: 3.5, opacity: 0.85 }] : []}
                        />
                      ) : (
                        <div className="h-full w-full bg-surface-sunken flex items-center justify-center text-xs text-ink-muted">
                          Failed to load live route preview.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details Column */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide flex items-center gap-1.5 pb-1 border-b border-line">
                        <Navigation className="h-3.5 w-3.5 text-ink-muted" />
                        Dispatch Details
                      </span>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-xs text-ink-muted font-medium uppercase tracking-wide block">Route Path</span>
                          <span className="font-semibold text-ink-primary block mt-0.5">{activeTrip.source} &rarr; {activeTrip.destination}</span>
                        </div>
                        <div>
                          <span className="text-xs text-ink-muted font-medium uppercase tracking-wide block">Destination Hub Address</span>
                          <span className="text-ink-secondary block mt-0.5 truncate" title={activeTrip.destinationLocation?.address}>{activeTrip.destinationLocation?.address || activeTrip.destination}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="p-2.5 bg-surface rounded-lg border border-line">
                            <span className="text-xs text-ink-muted font-medium uppercase block">Planned Distance</span>
                            <span className="font-semibold text-ink-primary font-mono text-xs block mt-0.5">{activeTrip.planned_distance} km</span>
                          </div>
                          <div className="p-2.5 bg-surface rounded-lg border border-line">
                            <span className="text-xs text-ink-muted font-medium uppercase block flex items-center gap-1">
                              <Clock className="h-3 w-3 text-brand" />
                              Trip ETA
                            </span>
                            <span className="font-semibold text-brand font-mono text-xs block mt-0.5 truncate">{eta}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg text-xs text-blue-700 dark:text-blue-400 leading-normal flex items-start gap-2">
                      <Compass className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Operator is actively on duty and executing this dispatch route. GPS coordinates are refreshed dynamically.</span>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="p-4 bg-surface-sunken rounded-lg border border-line text-center text-xs text-ink-muted font-medium flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-ink-muted" />
                No active dispatch routes currently assigned.
              </div>
            )}

            {/* Profile Logs */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-semibold text-ink-primary uppercase tracking-wide flex items-center gap-1.5 pb-2 border-b border-line">
                <Milestone className="h-4 w-4 text-ink-muted" />
                Recent Dispatched Trips
              </h4>
              {selectedDriver.trip_history?.length === 0 ? (
                <p className="text-xs text-ink-muted py-4 text-center">No operations registered under this driver.</p>
              ) : (
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                  {selectedDriver.trip_history?.map(t => (
                    <div key={t.id || t._id} className="p-3 bg-surface-sunken rounded-lg border border-line text-xs flex justify-between items-center gap-4">
                      <div>
                        <p className="font-medium text-ink-primary">{t.source} &rarr; {t.destination}</p>
                        <p className="text-xs text-ink-muted mt-0.5">Vehicle: {t.vehicle_name} ({t.registration_number})</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-ink-muted block">{t.planned_distance} km</span>
                        <span className="text-brand font-medium mt-1 block">{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-line">
              <button type="button" onClick={() => setDetailOpen(false)} className="btn-secondary">Close Card</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
