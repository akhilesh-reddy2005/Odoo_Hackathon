/**
 * LeafletMap — shared reusable map component using react-leaflet + Leaflet.js
 *
 * Props:
 *   center:    { lat, lng }  — map center
 *   zoom:      number        — initial zoom level
 *   height:    string        — CSS height (default: '100%')
 *   markers:   Array<{ lat, lng, color?, title?, label? }>
 *   polylines: Array<{ points: [{lat,lng}], color?, weight?, opacity? }>
 *   circles:   Array<{ lat, lng, radius, color?, fillOpacity? }>
 *   onMarkerClick: (marker) => void
 */
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix Leaflet default broken icon path (common with bundlers) ─────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create colored circle markers as DivIcons
function createColoredIcon(color = '#f97316', size = 14) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2px solid rgba(255,255,255,0.8);
      border-radius:50%;
      box-shadow:0 0 6px ${color}80;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function createLabelIcon(label = 'A', color = '#f97316') {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};color:white;
      font-weight:800;font-size:11px;font-family:Inter,sans-serif;
      width:24px;height:24px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      border:2px solid rgba(255,255,255,0.85);
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    ">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

// Auto-fit bounds when markers/polyline changes
function AutoBounds({ markers, polylines }) {
  const map = useMap();

  useEffect(() => {
    const coords = [];
    markers.forEach(m => coords.push([m.lat, m.lng]));
    polylines.forEach(pl => pl.points.forEach(p => coords.push([p.lat, p.lng])));

    if (coords.length >= 2) {
      try {
        map.fitBounds(coords, { padding: [30, 30], maxZoom: 14 });
      } catch (_) {}
    } else if (coords.length === 1) {
      map.setView(coords[0], 10);
    }
  }, [markers, polylines, map]);

  return null;
}

export default function LeafletMap({
  center = { lat: 20.5937, lng: 78.9629 },
  zoom = 5,
  height = '100%',
  markers = [],
  polylines = [],
  circles = [],
  autoBounds = false,
  onMarkerClick
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ width: '100%', height }}
      zoomControl
      attributionControl={false}
    >
      {/* CartoDB Dark Matter — free, no API key required */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      {/* Auto-fit bounds */}
      {autoBounds && <AutoBounds markers={markers} polylines={polylines} />}

      {/* Markers */}
      {markers.map((m, i) => (
        <Marker
          key={i}
          position={[m.lat, m.lng]}
          icon={m.label ? createLabelIcon(m.label, m.color || '#f97316') : createColoredIcon(m.color || '#f97316', m.size || 14)}
          eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m) } : {}}
        >
          {m.title && <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>{m.title}</Tooltip>}
        </Marker>
      ))}

      {/* Polylines (route paths) */}
      {polylines.map((pl, i) => (
        <Polyline
          key={i}
          positions={pl.points.map(p => [p.lat, p.lng])}
          color={pl.color || '#f97316'}
          weight={pl.weight || 4}
          opacity={pl.opacity ?? 0.85}
          dashArray={pl.dashed ? '8 6' : undefined}
        />
      ))}

      {/* Circle overlays (density / heatmap simulation) */}
      {circles.map((c, i) => (
        <Circle
          key={i}
          center={[c.lat, c.lng]}
          radius={c.radius || 22000}
          pathOptions={{
            color: c.color || '#f97316',
            fillColor: c.color || '#f97316',
            fillOpacity: c.fillOpacity ?? 0.18,
            weight: 0
          }}
        />
      ))}
    </MapContainer>
  );
}
