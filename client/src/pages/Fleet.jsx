import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Truck, 
  Calendar,
  Layers,
  Wrench,
  Milestone,
  HeartPulse,
  MapPin,
  Navigation,
  Compass
} from 'lucide-react';
import LeafletMap from '../components/LeafletMap';

import { vehicleService } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';



export default function Fleet() {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);



  // Filter and Query states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [sortBy, setSortBy] = useState('id');
  const [order, setOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Modals state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
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

  // Load vehicles
  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getAll({
        search,
        status,
        type,
        sortBy,
        order,
        page,
        limit
      });
      setVehicles(data.vehicles || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load fleet registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [search, status, type, sortBy, order, page]);

  // Handle Sort Change
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
    if (vehicles.length === 0) {
      toast.error('No data available to export.');
      return;
    }
    const headers = ['ID,Registration Number,Vehicle Name,Model,Type,Capacity (kg),Current Odometer (km),Acquisition Cost (₹),Purchase Date,Status,Health Score\n'];
    const rows = vehicles.map(v => 
      `"${v.id || v._id}","${v.registration_number}","${v.name}","${v.model}","${v.type}","${v.capacity}","${v.current_odometer}","${v.acquisition_cost}","${v.purchase_date}","${v.status}","${v.health_score}%"`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `transitops_fleet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Fleet registry downloaded as CSV.');
  };

  // Open Details Modal
  const openDetails = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await vehicleService.getById(vehicle.id || vehicle._id);
      setSelectedVehicle(data);
    } catch (err) {
      toast.error('Failed to load vehicle history logs.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Register Submit
  const onRegisterSubmit = async (data) => {
    try {
      await vehicleService.create(data);
      toast.success('New vehicle successfully registered in fleet.');
      setRegisterOpen(false);
      reset();
      loadVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    }
  };

  // Edit Trigger
  const openEdit = (vehicle) => {
    setSelectedVehicle(vehicle);
    setEditOpen(true);
    // Populate form fields
    setValue('registration_number', vehicle.registration_number);
    setValue('name', vehicle.name);
    setValue('model', vehicle.model);
    setValue('type', vehicle.type);
    setValue('capacity', vehicle.capacity);
    setValue('current_odometer', vehicle.current_odometer);
    setValue('acquisition_cost', vehicle.acquisition_cost);
    setValue('purchase_date', vehicle.purchase_date.split('T')[0]);
    setValue('status', vehicle.status);
  };

  // Edit Submit
  const onEditSubmit = async (data) => {
    try {
      await vehicleService.update(selectedVehicle.id || selectedVehicle._id, data);
      toast.success('Vehicle logs successfully updated.');
      setEditOpen(false);
      loadVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

  // Delete Vehicle
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to retire/delete this vehicle?')) return;
    try {
      const res = await vehicleService.delete(id);
      toast.success(res.message || 'Vehicle status updated to Retired.');
      loadVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove vehicle.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-6">
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search registration, name..."
              className="glass-input pl-10 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="glass-input cursor-pointer w-full sm:w-auto text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All" className="bg-darkbg-sidebar">All Statuses</option>
            <option value="Available" className="bg-darkbg-sidebar">Available</option>
            <option value="On Trip" className="bg-darkbg-sidebar">On Trip</option>
            <option value="In Shop" className="bg-darkbg-sidebar">In Shop</option>
            <option value="Retired" className="bg-darkbg-sidebar">Retired</option>
          </select>

          {/* Vehicle Type Filter */}
          <select
            className="glass-input cursor-pointer w-full sm:w-auto text-xs"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="All" className="bg-darkbg-sidebar">All Types</option>
            <option value="Semi-Truck" className="bg-darkbg-sidebar">Semi-Truck</option>
            <option value="Box Truck" className="bg-darkbg-sidebar">Box Truck</option>
            <option value="Delivery Van" className="bg-darkbg-sidebar">Delivery Van</option>
            <option value="Utility Vehicle" className="bg-darkbg-sidebar">Utility Vehicle</option>
          </select>
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-end">
          <button onClick={handleExport} className="btn-secondary h-11 px-4">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={() => setRegisterOpen(true)} className="btn-primary h-11 px-4">
            <Plus className="h-4 w-4" />
            Register Vehicle
          </button>
        </div>
      </div>

      {/* Grid of Vehicles */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : vehicles.length === 0 ? (
        <EmptyState title="No vehicles match filters" />
      ) : (
        <div className="glass-card border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="table-header cursor-pointer text-[10px]" onClick={() => handleSort('registration_number')}>
                    <span className="flex items-center gap-1">Reg Number <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header cursor-pointer text-[10px]" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1">Vehicle Details <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header cursor-pointer text-[10px]" onClick={() => handleSort('capacity')}>
                    <span className="flex items-center gap-1">Capacity <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header cursor-pointer text-[10px]" onClick={() => handleSort('current_odometer')}>
                    <span className="flex items-center gap-1">Odometer <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="table-header text-[10px] text-center">Health</th>
                  <th className="table-header text-[10px] text-center">Status</th>
                  <th className="table-header text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {vehicles.map((v) => (
                  <tr key={v.id || v._id} className="hover:bg-white/5 transition-all group">
                    <td className="table-cell font-mono text-xs font-semibold text-brand-orange">
                      {v.registration_number}
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-white text-xs">{v.name}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">{v.type} ({v.model})</p>
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-400">
                      {v.capacity} kg
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-400">
                      {parseFloat(v.current_odometer).toLocaleString()} km
                    </td>
                    <td className="table-cell text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        v.health_score >= 85 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        v.health_score >= 60 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        <HeartPulse className="h-3 w-3 mr-0.5" />
                        {v.health_score}%
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge text-[9px] ${
                        v.status === 'Available' ? 'bg-green-500/15 text-green-400 border border-green-500/25' :
                        v.status === 'On Trip' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25' :
                        v.status === 'In Shop' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                        'bg-red-500/15 text-red-400 border border-red-500/25'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openDetails(v)} className="p-1.5 bg-white/5 border border-white/10 hover:border-brand-orange/30 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(v)} className="p-1.5 bg-white/5 border border-white/10 hover:border-brand-orange/30 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(v.id || v._id)} className="p-1.5 bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all">
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
              <span className="text-gray-400">Showing {vehicles.length} of {total} vehicles</span>
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

      {/* Modal: Register Vehicle */}
      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} title="Register Fleet Vehicle">
        <form onSubmit={handleSubmit(onRegisterSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Registration Number</label>
              <input
                type="text"
                placeholder="e.g. TX-892-APP"
                className="glass-input uppercase"
                {...register('registration_number', { required: 'Registration is required' })}
              />
              {errors.registration_number && <p className="text-[10px] text-red-500 mt-1">{errors.registration_number.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vehicle Model Name</label>
              <input
                type="text"
                placeholder="e.g. Volvo VNL 860"
                className="glass-input"
                {...register('name', { required: 'Model Name is required' })}
              />
              {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Brand / Year</label>
              <input
                type="text"
                placeholder="e.g. Volvo 2022"
                className="glass-input"
                {...register('model', { required: 'Brand is required' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vehicle Category</label>
              <select className="glass-input cursor-pointer" {...register('type', { required: true })}>
                <option value="Semi-Truck" className="bg-darkbg-sidebar">Semi-Truck</option>
                <option value="Box Truck" className="bg-darkbg-sidebar">Box Truck</option>
                <option value="Delivery Van" className="bg-darkbg-sidebar">Delivery Van</option>
                <option value="Utility Vehicle" className="bg-darkbg-sidebar">Utility Vehicle</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Payload Capacity (kg)</label>
              <input
                type="number"
                placeholder="e.g. 36000"
                className="glass-input"
                {...register('capacity', { required: 'Capacity is required' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Initial Odometer (km)</label>
              <input
                type="number"
                placeholder="e.g. 125000"
                className="glass-input"
                {...register('current_odometer', { required: 'Odometer is required' })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Acquisition Cost (₹)</label>
              <input
                type="number"
                placeholder="e.g. 145000"
                className="glass-input"
                {...register('acquisition_cost', { required: 'Cost is required' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Acquisition Date</label>
              <input
                type="date"
                className="glass-input"
                {...register('purchase_date', { required: 'Purchase date is required' })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setRegisterOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Register Vehicle</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Vehicle */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Modify Vehicle Data">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Registration Number</label>
              <input
                type="text"
                className="glass-input uppercase"
                {...registerEdit('registration_number', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vehicle Model Name</label>
              <input
                type="text"
                className="glass-input"
                {...registerEdit('name', { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Brand / Year</label>
              <input
                type="text"
                className="glass-input"
                {...registerEdit('model', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vehicle Category</label>
              <select className="glass-input cursor-pointer" {...registerEdit('type', { required: true })}>
                <option value="Semi-Truck" className="bg-darkbg-sidebar">Semi-Truck</option>
                <option value="Box Truck" className="bg-darkbg-sidebar">Box Truck</option>
                <option value="Delivery Van" className="bg-darkbg-sidebar">Delivery Van</option>
                <option value="Utility Vehicle" className="bg-darkbg-sidebar">Utility Vehicle</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Payload Capacity (kg)</label>
              <input
                type="number"
                className="glass-input"
                {...registerEdit('capacity', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Odometer Reading (km)</label>
              <input
                type="number"
                className="glass-input"
                {...registerEdit('current_odometer', { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Acquisition Cost (₹)</label>
              <input
                type="number"
                className="glass-input"
                {...registerEdit('acquisition_cost', { required: true })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
              <select className="glass-input cursor-pointer" {...registerEdit('status', { required: true })}>
                <option value="Available" className="bg-darkbg-sidebar">Available</option>
                <option value="On Trip" className="bg-darkbg-sidebar">On Trip</option>
                <option value="In Shop" className="bg-darkbg-sidebar">In Shop</option>
                <option value="Retired" className="bg-darkbg-sidebar">Retired</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Acquisition Date</label>
            <input
              type="date"
              className="glass-input"
              {...registerEdit('purchase_date', { required: true })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Vehicle Details & History */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Vehicle Operational Logs & Live Status" size="lg">
        {detailLoading || !selectedVehicle ? (
          <div className="py-12 flex justify-center"><div className="h-8 w-8 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div></div>
        ) : (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Health Score</span>
                <span className="block text-xl font-extrabold text-white mt-1">{selectedVehicle.health_score}%</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Odometer Reading</span>
                <span className="block text-xl font-extrabold text-white mt-1 font-mono text-sm">{parseFloat(selectedVehicle.current_odometer).toLocaleString()} km</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Category</span>
                <span className="block text-xl font-extrabold text-white mt-1 text-xs truncate uppercase tracking-wider">{selectedVehicle.type}</span>
              </div>
            </div>

            {/* Advanced location details & Map preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 border-b border-white/5 animate-in fade-in duration-300">
              {/* Map Preview on Right */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <Compass className="h-4 w-4 text-brand-orange" />
                  Real-time Map Preview
                </h4>
                <div className="h-[210px] rounded-xl overflow-hidden border border-white/10 relative">
                  {selectedVehicle.currentLocation?.latitude ? (
                    <LeafletMap
                      center={{ lat: selectedVehicle.currentLocation.latitude, lng: selectedVehicle.currentLocation.longitude }}
                      zoom={8}
                      height="100%"
                      markers={[
                        {
                          lat: selectedVehicle.currentLocation.latitude,
                          lng: selectedVehicle.currentLocation.longitude,
                          color: '#3b82f6',
                          title: `Current: ${selectedVehicle.name}`,
                          size: 16
                        },
                        ...(selectedVehicle.lastKnownLocation?.latitude &&
                          (selectedVehicle.lastKnownLocation.latitude !== selectedVehicle.currentLocation.latitude ||
                           selectedVehicle.lastKnownLocation.longitude !== selectedVehicle.currentLocation.longitude)
                          ? [{ lat: selectedVehicle.lastKnownLocation.latitude, lng: selectedVehicle.lastKnownLocation.longitude, color: '#64748b', title: 'Last Known Location', size: 12 }]
                          : [])
                      ]}
                      polylines={
                        selectedVehicle.lastKnownLocation?.latitude &&
                        (selectedVehicle.lastKnownLocation.latitude !== selectedVehicle.currentLocation.latitude ||
                         selectedVehicle.lastKnownLocation.longitude !== selectedVehicle.currentLocation.longitude)
                          ? [{ points: [
                              { lat: selectedVehicle.lastKnownLocation.latitude, lng: selectedVehicle.lastKnownLocation.longitude },
                              { lat: selectedVehicle.currentLocation.latitude, lng: selectedVehicle.currentLocation.longitude }
                            ], color: '#64748b', weight: 2, opacity: 0.6, dashed: true }]
                          : []
                      }
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-900 flex items-center justify-center text-xs text-gray-500">
                      No coordinates logged for this transport vehicle.
                    </div>
                  )}
                </div>
              </div>

              {/* Location Diagnostics on Left */}
              <div className="space-y-4 justify-between flex flex-col">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5">
                    <Navigation className="h-4 w-4 text-brand-orange" />
                    Operational GPS Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-gray-500 font-medium">Current Location Coords</span>
                      <span className="font-mono text-white">
                        {selectedVehicle.currentLocation?.latitude ? `${selectedVehicle.currentLocation.latitude.toFixed(4)}, ${selectedVehicle.currentLocation.longitude.toFixed(4)}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-gray-500 font-medium">Last Known Coords</span>
                      <span className="font-mono text-white">
                        {selectedVehicle.lastKnownLocation?.latitude ? `${selectedVehicle.lastKnownLocation.latitude.toFixed(4)}, ${selectedVehicle.lastKnownLocation.longitude.toFixed(4)}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-gray-500 font-medium">Total Distance Travelled</span>
                      <span className="font-mono text-white">
                        {(selectedVehicle.trip_history?.filter(t => t.status === 'Completed').reduce((sum, t) => sum + (t.planned_distance || 0), 0) || 0).toLocaleString()} km
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-gray-500 font-medium">Total Completed Trips</span>
                      <span className="font-mono text-white font-bold">
                        {selectedVehicle.trip_history?.filter(t => t.status === 'Completed').length || 0} Trips
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-brand-orange/5 border border-brand-orange/10 rounded-xl flex items-start gap-2.5">
                  <Truck className="h-4.5 w-4.5 text-brand-orange mt-0.5" />
                  <div className="text-[10px] text-gray-400 font-medium leading-normal font-sans">
                    Real-time diagnostics tracking is synchronized via active GPS simulation. Active vehicles transmit coordinates every 5 seconds.
                  </div>
                </div>
              </div>
            </div>

            {/* Active Logs tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trip Logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <Milestone className="h-4 w-4 text-brand-orange" />
                  Recent Trips
                </h4>
                {selectedVehicle.trip_history?.length === 0 ? (
                  <p className="text-[11px] text-gray-500 py-4 text-center">No trips logged on this vehicle.</p>
                ) : (
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                    {selectedVehicle.trip_history?.map(t => (
                      <div key={t.id || t._id} className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                        <div className="flex justify-between font-semibold text-white">
                          <span>{t.source} → {t.destination}</span>
                          <span className="font-mono text-gray-400">{t.planned_distance} km</span>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-gray-500 font-medium">
                          <span>Driver: {t.driver_name}</span>
                          <span className="uppercase text-brand-orange">{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Maintenance history */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <Wrench className="h-4 w-4 text-brand-orange" />
                  Repair Workshop History
                </h4>
                {selectedVehicle.maintenance_history?.length === 0 ? (
                  <p className="text-[11px] text-gray-500 py-4 text-center">No maintenance logs recorded.</p>
                ) : (
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                    {selectedVehicle.maintenance_history?.map(m => (
                      <div key={m.id || m._id} className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                        <div className="flex justify-between font-semibold text-white">
                          <span>{m.issue}</span>
                          <span className="font-mono text-gray-400">₹{m.actual_cost || m.estimated_cost}</span>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-gray-500 font-medium">
                          <span>Status: {m.status}</span>
                          <span className="uppercase">{m.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="button" onClick={() => setDetailOpen(false)} className="btn-secondary">Close Logs</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
