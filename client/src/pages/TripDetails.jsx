import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  MapPin, 
  Truck, 
  User, 
  Weight, 
  Milestone, 
  Clock, 
  Navigation,
  Compass,
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { tripService } from '../services/api';

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pathPoints, setPathPoints] = useState([]);
  
  // Smooth vehicle marker animation
  const [vehiclePos, setVehiclePos] = useState(null);
  const animationRef = useRef(null);

  // Fetch Trip Details
  const fetchTrip = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await tripService.getById(id);
      setTrip(data);
      
      // Decode / load polyline points
      if (data.routePolyline) {
        // ORS stores polylines as a flat array [{lat, lng}] — try parsing directly
        let decoded;
        if (Array.isArray(data.routePolyline)) {
          decoded = data.routePolyline;
        } else if (typeof data.routePolyline === 'string') {
          decoded = decodePolylinePoints(data.routePolyline);
        } else {
          decoded = [];
        }
        setPathPoints(decoded);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load trip details.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip(true);

    // Poll trip status and vehicle position every 5 seconds
    const interval = setInterval(() => {
      fetchTrip(false);
    }, 5000);

    return () => {
      clearInterval(interval);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [id]);

  // Legacy Google Polyline decoder (for old trips stored with encoded polylines)
  const decodePolylinePoints = (encoded) => {
    if (!encoded) return [];
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0; result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return poly;
  };

  // Interpolate vehicle marker smoothly
  useEffect(() => {
    if (trip?.vehicle?.currentLocation?.latitude && trip.status === 'Dispatched') {
      const targetLat = trip.vehicle.currentLocation.latitude;
      const targetLng = trip.vehicle.currentLocation.longitude;
      
      const startLat = vehiclePos ? vehiclePos.lat : (trip.vehicle.lastKnownLocation?.latitude || targetLat);
      const startLng = vehiclePos ? vehiclePos.lng : (trip.vehicle.lastKnownLocation?.longitude || targetLng);

      const startTime = performance.now();
      const duration = 5000;

      const animateMarker = (time) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentLat = startLat + (targetLat - startLat) * progress;
        const currentLng = startLng + (targetLng - startLng) * progress;
        setVehiclePos({ lat: currentLat, lng: currentLng });
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateMarker);
        }
      };
      animationRef.current = requestAnimationFrame(animateMarker);
    } else if (trip?.vehicle?.currentLocation?.latitude) {
      setVehiclePos({
        lat: trip.vehicle.currentLocation.latitude,
        lng: trip.vehicle.currentLocation.longitude
      });
    }
  }, [trip?.vehicle?.currentLocation?.latitude, trip?.vehicle?.currentLocation?.longitude, trip?.status]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/15 text-green-400 border border-green-500/25';
      case 'Dispatched': return 'bg-blue-500/15 text-blue-400 border border-blue-500/25';
      case 'Cancelled': return 'bg-red-500/15 text-red-400 border border-red-500/25';
      default: return 'bg-slate-500/15 text-slate-400 border border-slate-500/25';
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center gap-4">
        <div className="h-10 w-10 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Loading Live Route...</p>
      </div>
    );
  }

  const durationHours = (trip.estimatedDuration / 3600).toFixed(1);

  // Build markers for the map
  const mapMarkers = [
    ...(trip.sourceLocation?.latitude ? [{
      lat: trip.sourceLocation.latitude,
      lng: trip.sourceLocation.longitude,
      label: 'A',
      color: '#22c55e',
      title: 'Origin Location'
    }] : []),
    ...(trip.destinationLocation?.latitude ? [{
      lat: trip.destinationLocation.latitude,
      lng: trip.destinationLocation.longitude,
      label: 'B',
      color: '#3b82f6',
      title: 'Destination Hub'
    }] : []),
    ...(vehiclePos && trip.status === 'Dispatched' ? [{
      lat: vehiclePos.lat,
      lng: vehiclePos.lng,
      color: '#f97316',
      title: `Active Vehicle: ${trip.vehicle_name}`,
      size: 18
    }] : [])
  ];

  const mapCenter = trip.sourceLocation?.latitude
    ? { lat: trip.sourceLocation.latitude, lng: trip.sourceLocation.longitude }
    : { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/trips')} 
          className="p-2.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Live Dispatch Tracker</h2>
          <p className="text-xs text-gray-500 mt-0.5">Trip ID: {trip._id} &bull; Real-time GPS movement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <section className="lg:col-span-2 glass-card border border-white/5 rounded-2xl h-[550px] overflow-hidden relative">
          <LeafletMap
            center={mapCenter}
            zoom={6}
            height="100%"
            autoBounds={mapMarkers.length >= 2}
            markers={mapMarkers}
            polylines={pathPoints.length > 0 ? [{ points: pathPoints, color: '#f97316', weight: 4, opacity: 0.85 }] : []}
          />

          {/* Floating Compass Indicator */}
          {trip.status === 'Dispatched' && (
            <div className="absolute top-4 right-4 z-[1000] bg-[#0e1420]/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
              <Compass className="h-3.5 w-3.5 animate-spin duration-[4000ms]" />
              GPS Tracking Active
            </div>
          )}
        </section>

        {/* Dispatch details summary sidebar */}
        <section className="space-y-6">
          {/* Trip Summary Card */}
          <div className="glass-card p-6 border border-white/5 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operational Summary</h3>
              <span className={`status-badge text-[9px] font-bold ${getStatusBadgeClass(trip.status)}`}>
                {trip.status}
              </span>
            </div>

            <div className="space-y-4">
              {/* Route line */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1.5 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-brand-orange bg-[#0e1420]"></div>
                  <div className="w-0.5 h-8 bg-white/10"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                </div>
                <div className="space-y-3 min-w-0">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Origin Location</span>
                    <p className="text-xs font-semibold text-white truncate mt-0.5" title={trip.sourceLocation?.address || trip.source}>
                      {trip.sourceLocation?.name || trip.source}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Destination Hub</span>
                    <p className="text-xs font-semibold text-white truncate mt-0.5" title={trip.destinationLocation?.address || trip.destination}>
                      {trip.destinationLocation?.name || trip.destination}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Milestone className="h-3 w-3 text-brand-orange" />
                    Distance
                  </span>
                  <span className="block text-sm font-extrabold text-white mt-1.5 font-mono">{trip.plannedDistance || trip.planned_distance} km</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3 text-brand-orange" />
                    Travel Time
                  </span>
                  <span className="block text-sm font-extrabold text-white mt-1.5 font-mono">{durationHours} Hours</span>
                </div>
              </div>

              {/* Cargo Details */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                <Weight className="h-5 w-5 text-gray-500" />
                <div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Cargo weight payload</span>
                  <span className="block text-xs font-bold text-white mt-0.5 font-mono">{trip.cargo_weight.toLocaleString()} kg</span>
                </div>
              </div>

              {/* Vehicle info */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                <Truck className="h-5 w-5 text-gray-500" />
                <div className="min-w-0">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Assigned Transport Vehicle</span>
                  <span className="block text-xs font-bold text-white mt-0.5 truncate">{trip.vehicle_name}</span>
                  <span className="block text-[10px] text-gray-500 font-mono">{trip.registration_number}</span>
                </div>
              </div>

              {/* Driver info */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Operator on Duty</span>
                  <span className="block text-xs font-bold text-white mt-0.5">{trip.driver_name}</span>
                  <span className="block text-[9px] text-green-400 font-bold mt-0.5">Safety Rating: {trip.driver_safety || 95}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline dispatch phase */}
          <div className="glass-card p-6 border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="h-4 w-4 text-brand-orange" />
              Dispatch Lifecycle Status
            </h3>

            <div className="pl-4 border-l border-white/10 space-y-4 relative text-xs">
              <div className="relative">
                <div className="absolute -left-[21px] top-0 bg-[#0e1420] p-0.5 rounded-full border border-green-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                </div>
                <p className="font-bold text-white">Draft Plan Created</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{new Date(trip.createdAt).toLocaleString()}</p>
              </div>

              <div className="relative">
                <div className={`absolute -left-[21px] top-0 bg-[#0e1420] p-0.5 rounded-full border ${trip.dispatched_at ? 'border-blue-500' : 'border-white/10'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${trip.dispatched_at ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                </div>
                <p className={`font-bold ${trip.dispatched_at ? 'text-white' : 'text-gray-600'}`}>Route Dispatched</p>
                {trip.dispatched_at && (
                  <p className="text-[10px] text-gray-500 mt-0.5">{new Date(trip.dispatched_at).toLocaleString()}</p>
                )}
              </div>

              {trip.status === 'Cancelled' ? (
                <div className="relative">
                  <div className="absolute -left-[21px] top-0 bg-[#0e1420] p-0.5 rounded-full border border-red-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  </div>
                  <p className="font-bold text-red-400">Dispatch Cancelled</p>
                  {trip.cancelled_at && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{new Date(trip.cancelled_at).toLocaleString()}</p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className={`absolute -left-[21px] top-0 bg-[#0e1420] p-0.5 rounded-full border ${trip.completed_at ? 'border-green-500' : 'border-white/10'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${trip.completed_at ? 'bg-green-500' : 'bg-white/10'}`}></div>
                  </div>
                  <p className={`font-bold ${trip.completed_at ? 'text-white' : 'text-gray-600'}`}>Hub Delivery Complete</p>
                  {trip.completed_at && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{new Date(trip.completed_at).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
