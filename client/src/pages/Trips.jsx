import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Weight, 
  Navigation, 
  Milestone, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
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

  return (
    <div className="space-y-6">
      {/* Search and planning controls header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-6">
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search source or destination..."
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
            <option value="All" className="bg-darkbg-sidebar">All Lifecycles</option>
            <option value="Draft" className="bg-darkbg-sidebar">Draft Plans</option>
            <option value="Dispatched" className="bg-darkbg-sidebar">Dispatched</option>
            <option value="Completed" className="bg-darkbg-sidebar">Completed</option>
            <option value="Cancelled" className="bg-darkbg-sidebar">Cancelled</option>
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
        <div className="glass-card border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="table-header text-[10px]">Route Path</th>
                  <th className="table-header text-[10px]">Assigned Vehicle</th>
                  <th className="table-header text-[10px]">Assigned Operator</th>
                  <th className="table-header text-[10px]">Cargo Weights</th>
                  <th className="table-header text-[10px] text-center">Status</th>
                  <th className="table-header text-[10px] text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trips.map((t) => (
                  <tr key={t.id || t._id} className="hover:bg-white/5 transition-all group">
                    <td className="table-cell">
                      <p className="font-semibold text-white text-xs flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-brand-orange" />
                        {t.source} → {t.destination}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium mt-1 pl-5">
                        Planned: {t.planned_distance} km
                      </p>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-white text-xs">{t.vehicle_name}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{t.vehicle_reg}</p>
                    </td>
                    <td className="table-cell text-xs font-semibold text-gray-300">
                      {t.driver_name}
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-400">
                      <span className="flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5 text-gray-500" />
                        {t.cargo_weight} kg
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge text-[9px] ${
                        t.status === 'Completed' ? 'bg-green-500/15 text-green-400 border border-green-500/25' :
                        t.status === 'Dispatched' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25' :
                        t.status === 'Cancelled' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                        'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex gap-2 justify-end items-center opacity-85 group-hover:opacity-100 transition-opacity">
                        {/* Dispatch trigger for Drafts */}
                        {t.status === 'Draft' && (
                          <button
                            onClick={() => handleDispatch(t.id || t._id)}
                            className="btn-primary h-8 px-2.5 text-[10px] uppercase font-bold flex items-center gap-1 shadow-md shadow-brand-orange/10"
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
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-2.5 text-[10px] uppercase font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-all"
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
                            className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 h-8 px-2.5 text-[10px] uppercase font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                            title="Cancel Trip"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        )}

                        {/* Live Tracking Map page link */}
                        <button
                          onClick={() => navigate(`/trips/${t.id || t._id}`)}
                          className="p-1.5 bg-white/5 border border-white/10 hover:border-brand-orange/30 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all h-8 w-8 flex items-center justify-center"
                          title="View Live Tracker & Map"
                        >
                          <Compass className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                        </button>

                        {/* Details timeline */}
                        <button
                          onClick={() => { setSelectedTrip(t); setTimelineOpen(true); }}
                          className="p-1.5 bg-white/5 border border-white/10 hover:border-brand-orange/30 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all h-8 w-8 flex items-center justify-center"
                          title="View Dispatch Timeline"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete trigger for drafts/cancelled */}
                        {(t.status === 'Draft' || t.status === 'Cancelled') && (
                          <button
                            onClick={() => handleDelete(t.id || t._id)}
                            className="p-1.5 bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all h-8 w-8 flex items-center justify-center"
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
            <div className="px-6 py-4 border-t border-white/5 bg-black/10 flex justify-between items-center text-xs">
              <span className="text-gray-400">Showing {trips.length} of {total} operations</span>
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

      {/* Modal: Plan New Trip */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); resetState(); }} title="Schedule Dispatch Route" size="lg">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Dispatch Vehicle</label>
              <select
                className="glass-input cursor-pointer"
                {...register('vehicle_id', { required: 'Vehicle is required' })}
              >
                <option value="" className="bg-darkbg-sidebar">Select vehicle...</option>
                {vehicles
                  .filter(v => v.status === 'Available')
                  .map(v => (
                    <option key={v.id || v._id} value={v.id || v._id} className="bg-darkbg-sidebar">
                      {v.name} ({v.registration_number}) - Cap: {v.capacity}kg
                    </option>
                  ))}
              </select>
              {errors.vehicle_id && <p className="text-[10px] text-red-500 mt-1">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Assign Operator</label>
              <select
                className="glass-input cursor-pointer"
                {...register('driver_id', { required: 'Driver is required' })}
              >
                <option value="" className="bg-darkbg-sidebar">Select driver...</option>
                {drivers
                  .filter(d => d.status === 'Available')
                  .map(d => (
                    <option key={d.id || d._id} value={d.id || d._id} className="bg-darkbg-sidebar">
                      {d.name} ({d.license_category})
                    </option>
                  ))}
              </select>
              {errors.driver_id && <p className="text-[10px] text-red-500 mt-1">{errors.driver_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Origin Location</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search origin address..."
                  className="glass-input w-full"
                  value={sourceQuery}
                  onChange={handleSourceInput}
                  onFocus={() => sourceSuggestions.length > 0 && setShowSourceDrop(true)}
                  onBlur={() => setTimeout(() => setShowSourceDrop(false), 200)}
                  autoComplete="off"
                />
                {autocompleteLoading.source && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">...</span>}
                {showSourceDrop && sourceSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-[#0e1420] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-[180px] overflow-y-auto">
                    {sourceSuggestions.map((s, i) => (
                      <li key={i} onMouseDown={() => selectSource(s)}
                        className="px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors truncate">
                        {s.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input type="hidden" {...register('source', { required: 'Origin is required' })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Destination Hub</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search destination address..."
                  className="glass-input w-full"
                  value={destQuery}
                  onChange={handleDestInput}
                  onFocus={() => destSuggestions.length > 0 && setShowDestDrop(true)}
                  onBlur={() => setTimeout(() => setShowDestDrop(false), 200)}
                  autoComplete="off"
                />
                {autocompleteLoading.dest && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">...</span>}
                {showDestDrop && destSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-[#0e1420] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-[180px] overflow-y-auto">
                    {destSuggestions.map((s, i) => (
                      <li key={i} onMouseDown={() => selectDest(s)}
                        className="px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors truncate">
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
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Cargo Payload Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 15000"
                className="glass-input"
                {...register('cargo_weight', { required: 'Cargo weight is required' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Planned Route Distance (km)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Auto-calculated distance"
                className="glass-input bg-white/5 cursor-not-allowed border-dashed"
                readOnly
                {...register('planned_distance', { required: 'Distance is required' })}
              />
            </div>
          </div>

          {/* Interactive Map & Alternatives Selection */}
          {sourceLocation && destinationLocation && routes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="h-[200px] rounded-lg overflow-hidden relative border border-white/10">
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
                    color: rIdx === selectedRouteIndex ? '#f97316' : '#64748b',
                    weight: rIdx === selectedRouteIndex ? 5 : 2.5,
                    opacity: rIdx === selectedRouteIndex ? 0.9 : 0.4
                  }))}
                />
              </div>

              <div className="space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Available Routes</span>
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
                              ? 'bg-brand-orange/15 border-brand-orange text-white'
                              : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex justify-between font-bold">
                            <span className="truncate max-w-[120px]">via {route.summary}</span>
                            <span>{route.distance.toFixed(1)} km</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-gray-500 mt-0.5">
                            <span>Est: {Math.round(route.duration / 60)} mins</span>
                            {delayMin > 0 && (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/25 px-1 py-0.5 rounded text-[8px] font-bold">
                                +{delayMin}m delay
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <div className="p-1.5 bg-white/5 rounded-lg border border-white/5 text-center">
                    <span className="text-[7px] text-gray-500 font-bold uppercase tracking-widest block">Dest. Weather</span>
                    <span className="text-[9px] font-bold text-white block mt-0.5">Sunny &bull; 24°C</span>
                  </div>
                  <div className="p-1.5 bg-brand-orange/5 rounded-lg border border-brand-orange/10 text-center">
                    <span className="text-[7px] text-brand-orange font-bold uppercase tracking-widest block">Nearest Fuel</span>
                    <span className="text-[9px] font-bold text-white block mt-0.5 font-sans">Shell (0.8km)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {capacityWarning && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2 animate-pulse">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{capacityWarning}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Dispatch Guidelines / Notes</label>
            <textarea
              rows="3"
              placeholder="Provide special instructions or cargo storage alerts..."
              className="glass-input resize-none"
              {...register('notes')}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!!capacityWarning}>Schedule Plan</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete Trip Odometer Bump */}
      <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title="Close Out Trip & Log Odometer">
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Please verify the vehicle's new odometer reading. If left empty, the vehicle odometer will be advanced by the trip's planned distance (+{selectedVehicleTargetOdo} km).
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Actual Odometer Reading (KM)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Enter final odometer reading..."
              className="glass-input"
              value={completionOdo}
              onChange={(e) => setCompletionOdo(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setCompleteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary bg-green-600 hover:bg-green-700">Complete Trip</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Dispatch Timeline Progress */}
      <Modal isOpen={timelineOpen} onClose={() => setTimelineOpen(false)} title="Operational Dispatch Timeline" size="md">
        {selectedTrip && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Operational Route</span>
                <span className="font-semibold text-sm text-white mt-1 block">{selectedTrip.source} → {selectedTrip.destination}</span>
              </div>
              <span className={`status-badge text-[9px] ${
                selectedTrip.status === 'Completed' ? 'bg-green-500/15 text-green-400 border border-green-500/25' :
                selectedTrip.status === 'Dispatched' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25' :
                selectedTrip.status === 'Cancelled' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                'bg-slate-500/15 text-slate-400 border border-slate-500/25'
              }`}>
                {selectedTrip.status}
              </span>
            </div>

            {/* Timeline Steps */}
            <div className="pl-6 border-l border-white/10 space-y-6 relative">
              {/* Draft Phase */}
              <div className="relative">
                <span className="absolute -left-[30px] top-0.5 bg-[#141b2c] p-1.5 rounded-full border border-green-500">
                  <FileText className="h-3.5 w-3.5 text-green-500" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Draft Planned</h4>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">{formatDate(selectedTrip.created_at)} | {formatTime(selectedTrip.created_at)}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Operator registered route outline. Vehicles and drivers checked for compliance.</p>
                </div>
              </div>

              {/* Dispatch Phase */}
              <div className="relative">
                <span className={`absolute -left-[30px] top-0.5 bg-[#141b2c] p-1.5 rounded-full border ${selectedTrip.dispatched_at ? 'border-orange-500' : 'border-white/10 text-gray-600'}`}>
                  <Play className={`h-3.5 w-3.5 ${selectedTrip.dispatched_at ? 'text-orange-500' : ''}`} />
                </span>
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${selectedTrip.dispatched_at ? 'text-white' : 'text-gray-600'}`}>Trip Dispatched</h4>
                  {selectedTrip.dispatched_at && (
                    <>
                      <p className="text-[10px] text-gray-500 mt-1 font-mono">{formatDate(selectedTrip.dispatched_at)} | {formatTime(selectedTrip.dispatched_at)}</p>
                      <p className="text-[11px] text-gray-400 mt-1">Truck and Driver actively in-transit. Odometer locked. Driver safety compliance activated.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Completion Phase / Cancellation Phase */}
              {selectedTrip.status === 'Cancelled' ? (
                <div className="relative">
                  <span className="absolute -left-[30px] top-0.5 bg-[#141b2c] p-1.5 rounded-full border border-red-500">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Trip Cancelled</h4>
                    <p className="text-[10px] text-gray-500 mt-1 font-mono">{formatDate(selectedTrip.cancelled_at)} | {formatTime(selectedTrip.cancelled_at)}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Trip route cancelled. Driver and vehicle status released back to Available pool.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <span className={`absolute -left-[30px] top-0.5 bg-[#141b2c] p-1.5 rounded-full border ${selectedTrip.completed_at ? 'border-green-500' : 'border-white/10 text-gray-600'}`}>
                    <CheckCircle className={`h-3.5 w-3.5 ${selectedTrip.completed_at ? 'text-green-500' : ''}`} />
                  </span>
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${selectedTrip.completed_at ? 'text-white' : 'text-gray-600'}`}>Trip Completed</h4>
                    {selectedTrip.completed_at && (
                      <>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">{formatDate(selectedTrip.completed_at)} | {formatTime(selectedTrip.completed_at)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">Vehicle and operator successfully reached destination hub. Odometer advanced. Automated toll expenses registered.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="button" onClick={() => setTimelineOpen(false)} className="btn-secondary">Close Details</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
