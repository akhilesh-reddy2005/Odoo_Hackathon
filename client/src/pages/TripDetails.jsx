import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Truck,
  User,
  Weight,
  Milestone,
  Clock,
  Navigation
} from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { tripService } from '../services/api';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import Timeline from '../components/Timeline';

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

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center gap-4">
        <Spinner size="lg" />
        <p className="text-xs text-ink-muted font-semibold uppercase tracking-wide">Loading Live Route...</p>
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
      color: '#10B981',
      title: 'Origin Location'
    }] : []),
    ...(trip.destinationLocation?.latitude ? [{
      lat: trip.destinationLocation.latitude,
      lng: trip.destinationLocation.longitude,
      label: 'B',
      color: '#F43F5E',
      title: 'Destination Hub'
    }] : []),
    ...(vehiclePos && trip.status === 'Dispatched' ? [{
      lat: vehiclePos.lat,
      lng: vehiclePos.lng,
      color: '#4F46E5',
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
          className="p-2.5 bg-surface border border-line hover:bg-surface-hover rounded-xl text-ink-muted hover:text-ink-primary transition-all active:scale-95"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-ink-primary tracking-wide">Live Dispatch Tracker</h2>
          <p className="text-xs text-ink-muted mt-0.5">Trip ID: {trip._id} &bull; Real-time GPS movement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <section className="lg:col-span-2 card h-[550px] overflow-hidden relative">
          <LeafletMap
            center={mapCenter}
            zoom={6}
            height="100%"
            autoBounds={mapMarkers.length >= 2}
            markers={mapMarkers}
            polylines={pathPoints.length > 0 ? [{ points: pathPoints, color: '#4F46E5', weight: 4, opacity: 0.85 }] : []}
          />

          {/* Floating GPS Tracking Chip */}
          {trip.status === 'Dispatched' && (
            <div className="absolute top-4 right-4 z-[1000] bg-surface/90 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-line shadow-sm flex items-center gap-2 text-xs font-semibold text-ink-secondary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              GPS Tracking Active
            </div>
          )}
        </section>

        {/* Dispatch details summary sidebar */}
        <section className="space-y-6">
          {/* Trip Summary Card */}
          <div className="card p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-line">
              <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">Operational Summary</h3>
              <Badge status={trip.status} />
            </div>

            <div className="space-y-4">
              {/* Route line */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1.5 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <div className="w-0.5 h-8 bg-line"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                </div>
                <div className="space-y-3 min-w-0">
                  <div>
                    <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide block">Origin Location</span>
                    <p className="text-xs font-semibold text-ink-primary truncate mt-0.5" title={trip.sourceLocation?.address || trip.source}>
                      {trip.sourceLocation?.name || trip.source}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide block">Destination Hub</span>
                    <p className="text-xs font-semibold text-ink-primary truncate mt-0.5" title={trip.destinationLocation?.address || trip.destination}>
                      {trip.destinationLocation?.name || trip.destination}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-surface-sunken rounded-lg border border-line">
                  <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide flex items-center gap-1">
                    <Milestone className="h-3 w-3 text-brand" />
                    Distance
                  </span>
                  <span className="block text-sm font-bold text-ink-primary mt-1.5 font-mono">{trip.plannedDistance || trip.planned_distance} km</span>
                </div>
                <div className="p-3 bg-surface-sunken rounded-lg border border-line">
                  <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide flex items-center gap-1">
                    <Clock className="h-3 w-3 text-brand" />
                    Travel Time
                  </span>
                  <span className="block text-sm font-bold text-ink-primary mt-1.5 font-mono">{durationHours} Hours</span>
                </div>
              </div>

              {/* Cargo Details */}
              <div className="p-3 bg-surface-sunken rounded-lg border border-line flex items-center gap-3">
                <Weight className="h-5 w-5 text-ink-muted" />
                <div>
                  <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide block">Cargo weight payload</span>
                  <span className="block text-xs font-bold text-ink-primary mt-0.5 font-mono">{trip.cargo_weight.toLocaleString()} kg</span>
                </div>
              </div>

              {/* Vehicle info */}
              <div className="p-3 bg-surface-sunken rounded-lg border border-line flex items-center gap-3">
                <Truck className="h-5 w-5 text-ink-muted" />
                <div className="min-w-0">
                  <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide block">Assigned Transport Vehicle</span>
                  <span className="block text-xs font-bold text-ink-primary mt-0.5 truncate">{trip.vehicle_name}</span>
                  <span className="block text-xs text-ink-muted font-mono">{trip.registration_number}</span>
                </div>
              </div>

              {/* Driver info */}
              <div className="p-3 bg-surface-sunken rounded-lg border border-line flex items-center gap-3">
                <User className="h-5 w-5 text-ink-muted" />
                <div>
                  <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide block">Operator on Duty</span>
                  <span className="block text-xs font-bold text-ink-primary mt-0.5">{trip.driver_name}</span>
                  <span className="block text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Safety Rating: {trip.driver_safety || 95}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline dispatch phase */}
          <div className="card p-6 space-y-4">
            <h3 className="text-xs font-bold text-ink-primary uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="h-4 w-4 text-brand" />
              Dispatch Lifecycle Status
            </h3>

            <Timeline
              size="sm"
              steps={[
                {
                  label: 'Draft Plan Created',
                  timestamp: new Date(trip.createdAt).toLocaleString(),
                  tone: 'success'
                },
                {
                  label: 'Route Dispatched',
                  timestamp: trip.dispatched_at ? new Date(trip.dispatched_at).toLocaleString() : undefined,
                  tone: trip.dispatched_at ? 'info' : 'pending'
                },
                trip.status === 'Cancelled'
                  ? {
                      label: 'Trip Cancelled',
                      timestamp: trip.cancelled_at ? new Date(trip.cancelled_at).toLocaleString() : undefined,
                      tone: 'danger'
                    }
                  : {
                      label: 'Hub Delivery Complete',
                      timestamp: trip.completed_at ? new Date(trip.completed_at).toLocaleString() : undefined,
                      tone: trip.completed_at ? 'success' : 'pending'
                    }
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
