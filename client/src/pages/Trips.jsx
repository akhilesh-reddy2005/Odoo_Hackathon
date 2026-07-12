import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  MapPin,
  Weight,
  Milestone,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  FileText,
  Compass
} from 'lucide-react';
import LeafletMap from '../components/LeafletMap';

import { tripService, vehicleService, driverService, mapsService } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import Badge from '../components/Badge';
import Timeline from '../components/Timeline';

export default function Trips() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ORS Autocomplete States
  const [sourceQuery, setSourceQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSourceDrop, setShowSourceDrop] = useState(false);
  const [showDestDrop, setShowDestDrop] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState({ source: false, dest: false });
  const sourceDebounce = React.useRef(null);
  const destDebounce = React.useRef(null);
  const [sourceLocation, setSourceLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loadingDirections, setLoadingDirections] = useState(false);

  // Dropdown options lists
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Queries
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Odometer completion state
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingTripId, setCompletingTripId] = useState(null);
  const [completionOdo, setCompletionOdo] = useState('');
  const [selectedVehicleTargetOdo, setSelectedVehicleTargetOdo] = useState(0);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();

  // Watch fields for dynamic client-side cargo validations
  const watchedVehicleId = watch('vehicle_id');
  const watchedCargoWeight = watch('cargo_weight');
  const [capacityWarning, setCapacityWarning] = useState('');


  // Debounced ORS autocomplete handlers
  const handleSourceInput = (e) => {
    const val = e.target.value;
    setSourceQuery(val);
    setSourceLocation(null);
    setValue('source', '');
    if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
    if (val.length < 2) { setSourceSuggestions([]); return; }
    sourceDebounce.current = setTimeout(async () => {
      setAutocompleteLoading(p => ({ ...p, source: true }));
      try {
        const results = await mapsService.autocomplete(val);
        setSourceSuggestions(results);
        setShowSourceDrop(true);
      } catch (_) {}
      finally { setAutocompleteLoading(p => ({ ...p, source: false })); }
    }, 350);
  };

  const handleDestInput = (e) => {
    const val = e.target.value;
    setDestQuery(val);
    setDestinationLocation(null);
    setValue('destination', '');
    if (destDebounce.current) clearTimeout(destDebounce.current);
    if (val.length < 2) { setDestSuggestions([]); return; }
    destDebounce.current = setTimeout(async () => {
      setAutocompleteLoading(p => ({ ...p, dest: true }));
      try {
        const results = await mapsService.autocomplete(val);
        setDestSuggestions(results);
        setShowDestDrop(true);
      } catch (_) {}
      finally { setAutocompleteLoading(p => ({ ...p, dest: false })); }
    }, 350);
  };

  const selectSource = (s) => {
    setSourceQuery(s.label);
    setSourceLocation({ name: s.name || s.label, address: s.label, latitude: s.latitude, longitude: s.longitude });
    setValue('source', s.label);
    setShowSourceDrop(false);
    setSourceSuggestions([]);
  };

  const selectDest = (s) => {
    setDestQuery(s.label);
    setDestinationLocation({ name: s.name || s.label, address: s.label, latitude: s.latitude, longitude: s.longitude });
    setValue('destination', s.label);
    setShowDestDrop(false);
    setDestSuggestions([]);
  };

  // Load directions routes automatically when locations are picked
  useEffect(() => {
    if (sourceLocation && destinationLocation) {
      const fetchRoutes = async () => {
        setLoadingDirections(true);
        try {
          const origin = `${sourceLocation.latitude},${sourceLocation.longitude}`;
          const destination = `${destinationLocation.latitude},${destinationLocation.longitude}`;
          const data = await mapsService.getDirections(origin, destination, true); // fetch alternatives
          setRoutes(data);
          setSelectedRouteIndex(0);
          if (data.length > 0) {
            setValue('planned_distance', parseFloat(data[0].distance.toFixed(1)));
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to calculate route directions.');
        } finally {
          setLoadingDirections(false);
        }
      };
      fetchRoutes();
    }
  }, [sourceLocation, destinationLocation]);

  const handleRouteChange = (index) => {
    setSelectedRouteIndex(index);
    if (routes[index]) {
      setValue('planned_distance', parseFloat(routes[index].distance.toFixed(1)));
    }
  };

  const resetState = () => {
    setSourceLocation(null);
    setDestinationLocation(null);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setSourceQuery('');
    setDestQuery('');
    reset();
  };

  // Update capacity warning dynamically
  useEffect(() => {
    if (watchedVehicleId && watchedCargoWeight) {
      const selected = vehicles.find(v => (v.id || v._id) === watchedVehicleId);
      if (selected && parseFloat(watchedCargoWeight) > parseFloat(selected.capacity)) {
        setCapacityWarning(`Warning: Cargo weight (${watchedCargoWeight} kg) exceeds vehicle payload capacity (${selected.capacity} kg) for ${selected.name}!`);
      } else {
        setCapacityWarning('');
      }
    } else {
      setCapacityWarning('');
    }
  }, [watchedVehicleId, watchedCargoWeight, vehicles]);

  // Load trips list
  const loadTrips = async () => {
    setLoading(true);
    try {
      const data = await tripService.getAll({ search, status, page, limit });
      setTrips(data.trips || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);

      // Load vehicles & drivers for dropdowns
      const fleet = await vehicleService.getAll({ limit: 100 });
      setVehicles(fleet.vehicles || []);

      const people = await driverService.getAll({ limit: 100 });
      setDrivers(people.drivers || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load trips registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [search, status, page]);

  // Create Trip Submit
  const onCreateSubmit = async (data) => {
    try {
      if (!sourceLocation || !destinationLocation || routes.length === 0) {
        toast.error('Please select valid origin/destination locations with calculated route.');
        return;
      }
      const activeRoute = routes[selectedRouteIndex];
      const payload = {
        vehicle_id: data.vehicle_id,
        driver_id: data.driver_id,
        sourceLocation,
        destinationLocation,
        plannedDistance: activeRoute.distance,
        estimatedDuration: activeRoute.duration,
        routePolyline: activeRoute.polyline,
        cargo_weight: parseFloat(data.cargo_weight),
        notes: data.notes
      };
      await tripService.create(payload);
      toast.success('Trip planned in Draft state successfully.');
      setCreateOpen(false);
      resetState();
      loadTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create trip plan.');
    }
  };

  // Dispatch lifecycle
  const handleDispatch = async (id) => {
    try {
      await tripService.dispatch(id);
      toast.success('Trip successfully dispatched! Vehicles and drivers are now On Trip.');
      loadTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch trip.');
    }
  };

  // Complete trigger
  const triggerComplete = (trip) => {
    setCompletingTripId(trip.id || trip._id);
    setSelectedVehicleTargetOdo(parseFloat(trip.planned_distance)); // default odometer bump
    setCompleteOpen(true);
  };

  // Complete submit
  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    try {
      await tripService.complete(completingTripId, completionOdo ? parseFloat(completionOdo) : undefined);
      toast.success('Trip marked as Completed. Toll expenses added, status restored.');
      setCompleteOpen(false);
      setCompletionOdo('');
      loadTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete trip.');
    }
  };

  // Cancel lifecycle
  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      await tripService.cancel(id);
      toast.success('Trip cancelled successfully.');
      loadTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel trip.');
    }
  };

  // Delete trip
  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this trip record?')) return;
    try {
      await tripService.delete(id);
      toast.success('Trip record deleted.');
      loadTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  // Format Dates
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Dispatch-lifecycle timeline steps for the selected trip
  const buildTimelineSteps = (trip) => {
    if (!trip) return [];
    const steps = [
      {
        label: 'Draft Plan Created',
        timestamp: `${formatDate(trip.created_at)} | ${formatTime(trip.created_at)}`,
        description: 'Operator registered route outline. Vehicle and driver checked for compliance.',
        tone: 'success',
        icon: FileText
      },
      {
        label: 'Route Dispatched',
        timestamp: trip.dispatched_at ? `${formatDate(trip.dispatched_at)} | ${formatTime(trip.dispatched_at)}` : undefined,
        description: trip.dispatched_at ? 'Truck and driver actively in-transit. Odometer locked. Driver safety compliance activated.' : undefined,
        tone: trip.dispatched_at ? 'info' : 'pending',
        icon: Play
      }
    ];

    if (trip.status === 'Cancelled') {
      steps.push({
        label: 'Trip Cancelled',
        timestamp: `${formatDate(trip.cancelled_at)} | ${formatTime(trip.cancelled_at)}`,
        description: 'Trip route cancelled. Driver and vehicle status released back to Available pool.',
        tone: 'danger',
        icon: XCircle
      });
    } else {
      steps.push({
        label: 'Hub Delivery Complete',
        timestamp: trip.completed_at ? `${formatDate(trip.completed_at)} | ${formatTime(trip.completed_at)}` : undefined,
        description: trip.completed_at ? 'Vehicle and operator successfully reached destination hub. Odometer advanced. Automated toll expenses registered.' : undefined,
        tone: trip.completed_at ? 'success' : 'pending',
        icon: CheckCircle
      });
    }

    return steps;
  };

  return (
    <div className="space-y-6">
      {/* Search and planning controls header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center card p-5">
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search source or destination..."
            className="w-full md:w-64"
          />

          {/* Status filter */}
          <select
            className="input cursor-pointer w-full sm:w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All">All Lifecycles</option>
            <option value="Draft">Draft Plans</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <button onClick={() => setCreateOpen(true)} className="btn-primary h-11 px-4 w-full md:w-auto">
          <Plus className="h-4 w-4" />
          Plan New Trip
        </button>
      </div>

      {/* Trips lists table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : trips.length === 0 ? (
        <EmptyState title="No scheduled operations logs match search" icon={Milestone} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">Route Path</th>
                  <th className="table-header">Assigned Vehicle</th>
                  <th className="table-header">Assigned Operator</th>
                  <th className="table-header">Cargo Weight</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id || t._id} className="hover:bg-surface-hover transition-colors group">
                    <td className="table-cell">
                      <p className="font-semibold text-ink-primary text-xs flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-brand" />
                        {t.source} → {t.destination}
                      </p>
                      <p className="text-xs text-ink-muted font-medium mt-1 pl-5">
                        Planned: {t.planned_distance} km
                      </p>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-ink-primary text-xs">{t.vehicle_name}</p>
                      <p className="text-xs text-ink-muted font-mono mt-0.5">{t.vehicle_reg}</p>
                    </td>
                    <td className="table-cell text-xs font-semibold text-ink-secondary">
                      {t.driver_name}
                    </td>
                    <td className="table-cell text-xs font-mono text-ink-muted">
                      <span className="flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5 text-ink-muted" />
                        {t.cargo_weight} kg
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <Badge status={t.status} />
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex gap-2 justify-end items-center opacity-70 group-hover:opacity-100 transition-opacity">
                        {/* Dispatch trigger for Drafts */}
                        {t.status === 'Draft' && (
                          <button
                            onClick={() => handleDispatch(t.id || t._id)}
                            className="btn-primary h-8 px-2.5 text-xs"
                            title="Dispatch Trip"
                          >
                            <Play className="h-3 w-3" />
                            Dispatch
                          </button>
                        )}

                        {/* Complete trigger for Dispatched */}
                        {t.status === 'Dispatched' && (
                          <button
                            onClick={() => triggerComplete(t)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs font-medium rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                            title="Complete Trip"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </button>
                        )}

                        {/* Cancel trigger for Drafts & Dispatched */}
                        {(t.status === 'Draft' || t.status === 'Dispatched') && (
                          <button
                            onClick={() => handleCancel(t.id || t._id)}
                            className="bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 h-8 px-2.5 text-xs font-medium rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                            title="Cancel Trip"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        )}

                        {/* Live Tracking Map page link */}
                        <button
                          onClick={() => navigate(`/trips/${t.id || t._id}`)}
                          className="p-1.5 bg-surface border border-line hover:border-brand/30 hover:bg-surface-hover rounded-lg text-ink-muted hover:text-ink-primary transition-all h-8 w-8 flex items-center justify-center"
                          title="View Live Tracker & Map"
                        >
                          <Compass className="h-3.5 w-3.5" />
                        </button>

                        {/* Details timeline */}
                        <button
                          onClick={() => { setSelectedTrip(t); setTimelineOpen(true); }}
                          className="p-1.5 bg-surface border border-line hover:border-brand/30 hover:bg-surface-hover rounded-lg text-ink-muted hover:text-ink-primary transition-all h-8 w-8 flex items-center justify-center"
                          title="View Dispatch Timeline"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete trigger for drafts/cancelled */}
                        {(t.status === 'Draft' || t.status === 'Cancelled') && (
                          <button
                            onClick={() => handleDelete(t.id || t._id)}
                            className="p-1.5 bg-surface border border-line hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 transition-all h-8 w-8 flex items-center justify-center"
                            title="Delete Record"
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

      {/* Modal: Plan New Trip */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); resetState(); }} title="Schedule Dispatch Route" size="lg">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Dispatch Vehicle</label>
              <select
                className="input cursor-pointer"
                {...register('vehicle_id', { required: 'Vehicle is required' })}
              >
                <option value="">Select vehicle...</option>
                {vehicles
                  .filter(v => v.status === 'Available')
                  .map(v => (
                    <option key={v.id || v._id} value={v.id || v._id}>
                      {v.name} ({v.registration_number}) - Cap: {v.capacity}kg
                    </option>
                  ))}
              </select>
              {errors.vehicle_id && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Assign Operator</label>
              <select
                className="input cursor-pointer"
                {...register('driver_id', { required: 'Driver is required' })}
              >
                <option value="">Select driver...</option>
                {drivers
                  .filter(d => d.status === 'Available')
                  .map(d => (
                    <option key={d.id || d._id} value={d.id || d._id}>
                      {d.name} ({d.license_category})
                    </option>
                  ))}
              </select>
              {errors.driver_id && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.driver_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Origin Location</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search origin address..."
                  className="input w-full"
                  value={sourceQuery}
                  onChange={handleSourceInput}
                  onFocus={() => sourceSuggestions.length > 0 && setShowSourceDrop(true)}
                  onBlur={() => setTimeout(() => setShowSourceDrop(false), 200)}
                  autoComplete="off"
                />
                {autocompleteLoading.source && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">...</span>}
                {showSourceDrop && sourceSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-line shadow-lg rounded-lg overflow-hidden max-h-[180px] overflow-y-auto">
                    {sourceSuggestions.map((s, i) => (
                      <li key={i} onMouseDown={() => selectSource(s)}
                        className="px-3 py-2 text-xs text-ink-secondary hover:bg-surface-hover hover:text-ink-primary cursor-pointer transition-colors truncate">
                        {s.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input type="hidden" {...register('source', { required: 'Origin is required' })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Destination Hub</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search destination address..."
                  className="input w-full"
                  value={destQuery}
                  onChange={handleDestInput}
                  onFocus={() => destSuggestions.length > 0 && setShowDestDrop(true)}
                  onBlur={() => setTimeout(() => setShowDestDrop(false), 200)}
                  autoComplete="off"
                />
                {autocompleteLoading.dest && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">...</span>}
                {showDestDrop && destSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-line shadow-lg rounded-lg overflow-hidden max-h-[180px] overflow-y-auto">
                    {destSuggestions.map((s, i) => (
                      <li key={i} onMouseDown={() => selectDest(s)}
                        className="px-3 py-2 text-xs text-ink-secondary hover:bg-surface-hover hover:text-ink-primary cursor-pointer transition-colors truncate">
                        {s.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input type="hidden" {...register('destination', { required: 'Destination is required' })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Cargo Payload Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 15000"
                className="input"
                {...register('cargo_weight', { required: 'Cargo weight is required' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Planned Route Distance (km)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Auto-calculated distance"
                className="input bg-surface-sunken cursor-not-allowed border-dashed text-ink-muted"
                readOnly
                {...register('planned_distance', { required: 'Distance is required' })}
              />
            </div>
          </div>

          {/* Interactive Map & Alternatives Selection */}
          {sourceLocation && destinationLocation && routes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-surface-sunken rounded-xl border border-line">
              <div className="h-[200px] rounded-lg overflow-hidden relative border border-line">
                <LeafletMap
                  center={{ lat: sourceLocation.latitude, lng: sourceLocation.longitude }}
                  zoom={6}
                  height="100%"
                  autoBounds
                  markers={[
                    { lat: sourceLocation.latitude, lng: sourceLocation.longitude, label: 'A', color: '#22c55e' },
                    { lat: destinationLocation.latitude, lng: destinationLocation.longitude, label: 'B', color: '#3b82f6' }
                  ]}
                  polylines={routes.map((route, rIdx) => ({
                    points: Array.isArray(route.polyline) ? route.polyline : [],
                    color: rIdx === selectedRouteIndex ? '#6366f1' : '#64748b',
                    weight: rIdx === selectedRouteIndex ? 5 : 2.5,
                    opacity: rIdx === selectedRouteIndex ? 0.9 : 0.4
                  }))}
                />
              </div>

              <div className="space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide block">Available Routes</span>
                  <div className="max-h-[100px] overflow-y-auto space-y-1.5 pr-1">
                    {routes.map((route, rIdx) => {
                      const isSelected = rIdx === selectedRouteIndex;
                      const delayMin = Math.round(route.trafficDelay / 60);
                      return (
                        <div
                          key={rIdx}
                          onClick={() => handleRouteChange(rIdx)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-brand-light border-brand ring-1 ring-brand text-ink-primary'
                              : 'bg-surface border-line text-ink-secondary hover:bg-surface-hover hover:text-ink-primary'
                          }`}
                        >
                          <div className="flex justify-between font-semibold">
                            <span className="truncate max-w-[120px]">via {route.summary}</span>
                            <span>{route.distance.toFixed(1)} km</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-ink-muted mt-0.5">
                            <span>Est: {Math.round(route.duration / 60)} mins</span>
                            {delayMin > 0 && (
                              <Badge tone="danger">+{delayMin}m delay</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line">
                  <div className="p-2 bg-surface-sunken rounded-lg border border-line text-center">
                    <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide block">Dest. Weather</span>
                    <span className="text-xs font-bold text-ink-primary block mt-0.5">Sunny &bull; 24°C</span>
                  </div>
                  <div className="p-2 bg-brand-light rounded-lg border border-brand/20 text-center">
                    <span className="text-xs text-brand font-semibold uppercase tracking-wide block">Nearest Fuel</span>
                    <span className="text-xs font-bold text-ink-primary block mt-0.5">Shell (0.8km)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {capacityWarning && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{capacityWarning}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Dispatch Guidelines / Notes</label>
            <textarea
              rows="3"
              placeholder="Provide special instructions or cargo storage alerts..."
              className="input resize-none"
              {...register('notes')}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!!capacityWarning}>Schedule Plan</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete Trip Odometer Bump */}
      <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title="Close Out Trip & Log Odometer">
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <p className="text-xs text-ink-secondary leading-relaxed">
            Please verify the vehicle's new odometer reading. If left empty, the vehicle odometer will be advanced by the trip's planned distance (+{selectedVehicleTargetOdo} km).
          </p>
          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">Actual Odometer Reading (KM)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Enter final odometer reading..."
              className="input"
              value={completionOdo}
              onChange={(e) => setCompletionOdo(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={() => setCompleteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700">Complete Trip</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Dispatch Timeline Progress */}
      <Modal isOpen={timelineOpen} onClose={() => setTimelineOpen(false)} title="Operational Dispatch Timeline" size="md">
        {selectedTrip && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface-sunken p-4 rounded-lg border border-line">
              <div>
                <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide block">Operational Route</span>
                <span className="font-semibold text-sm text-ink-primary mt-1 block">{selectedTrip.source} → {selectedTrip.destination}</span>
              </div>
              <Badge status={selectedTrip.status} />
            </div>

            {/* Timeline Steps */}
            <Timeline steps={buildTimelineSteps(selectedTrip)} />

            <div className="flex justify-end pt-4 border-t border-line">
              <button type="button" onClick={() => setTimelineOpen(false)} className="btn-secondary">Close Details</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
