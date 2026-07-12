const axios = require('axios');

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE = 'https://api.openrouteservice.org';

// ─────────────────────────────────────────────────────────────────────────────
// Geocode an address using ORS Geocoding Search API
// Returns: { name, formattedAddress, latitude, longitude }
// ─────────────────────────────────────────────────────────────────────────────
async function geocodeAddress(address) {
  try {
    if (!ORS_API_KEY) throw new Error('ORS API key is missing on the server.');

    const response = await axios.get(`${ORS_BASE}/geocode/search`, {
      params: {
        api_key: ORS_API_KEY,
        text: address,
        size: 1
      }
    });

    const features = response.data.features;
    if (!features || features.length === 0) {
      throw new Error(`Geocoding returned no results for: "${address}"`);
    }

    const feature = features[0];
    const [longitude, latitude] = feature.geometry.coordinates;
    const props = feature.properties;

    return {
      formattedAddress: props.label || address,
      latitude,
      longitude,
      name: props.name || props.label || address
    };
  } catch (error) {
    console.error('ORS Geocoding error:', error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Autocomplete address suggestions (for frontend search input)
// Returns: array of { label, latitude, longitude }
// ─────────────────────────────────────────────────────────────────────────────
async function autocompleteAddress(text) {
  try {
    if (!ORS_API_KEY) throw new Error('ORS API key is missing on the server.');

    const response = await axios.get(`${ORS_BASE}/geocode/autocomplete`, {
      params: {
        api_key: ORS_API_KEY,
        text,
        size: 6
      }
    });

    const features = response.data.features || [];
    return features.map(f => ({
      label: f.properties.label,
      name: f.properties.name || f.properties.label,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0]
    }));
  } catch (error) {
    console.error('ORS Autocomplete error:', error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get driving directions using ORS Directions API (GeoJSON format)
// origin / destination: "lat,lng" strings  OR  { latitude, longitude }
// Returns: array of route objects matching original Google Maps shape
// ─────────────────────────────────────────────────────────────────────────────
async function getDirections(origin, destination, alternatives = false) {
  try {
    if (!ORS_API_KEY) throw new Error('ORS API key is missing on the server.');

    // Parse coords — accept "lat,lng" string or object
    const parseCoord = (c) => {
      if (typeof c === 'string') {
        const [lat, lng] = c.split(',').map(Number);
        return [lng, lat]; // ORS wants [lon, lat]
      }
      return [c.longitude, c.latitude];
    };

    const body = {
      coordinates: [parseCoord(origin), parseCoord(destination)],
      alternative_routes: alternatives
        ? { target_count: 3, weight_factor: 1.6, share_factor: 0.6 }
        : undefined,
      instructions: true,
      geometry: true
    };

    // Remove undefined keys
    if (!body.alternative_routes) delete body.alternative_routes;

    const response = await axios.post(
      `${ORS_BASE}/v2/directions/driving-car/geojson`,
      body,
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const routes = response.data.features;
    if (!routes || routes.length === 0) throw new Error('No routes returned from ORS.');

    return routes.map((feature, i) => {
      const summary = feature.properties.summary;
      const segments = feature.properties.segments || [];
      const distanceKm = summary.distance / 1000; // ORS returns meters
      const durationSec = summary.duration;        // seconds

      // GeoJSON LineString coords are [lng, lat] — convert to [{lat, lng}]
      const polylinePoints = feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

      // Build turn-by-turn steps from first segment
      const steps = (segments[0]?.steps || []).map(step => ({
        instruction: step.instruction || '',
        distance: `${(step.distance / 1000).toFixed(2)} km`,
        duration: `${Math.round(step.duration / 60)} min`,
        startLocation: {
          latitude: step.way_points ? feature.geometry.coordinates[step.way_points[0]][1] : 0,
          longitude: step.way_points ? feature.geometry.coordinates[step.way_points[0]][0] : 0
        },
        endLocation: {
          latitude: step.way_points ? feature.geometry.coordinates[step.way_points[1]][1] : 0,
          longitude: step.way_points ? feature.geometry.coordinates[step.way_points[1]][0] : 0
        }
      }));

      return {
        summary: feature.properties.way_points ? `Route ${i + 1}` : `Route ${i + 1}`,
        distance: distanceKm,
        duration: durationSec,
        durationInTraffic: durationSec,
        trafficDelay: 0,
        // For compatibility: store as flat array of {lat,lng} objects (JSON serializable)
        polyline: polylinePoints,
        steps
      };
    });
  } catch (error) {
    console.error('ORS Directions error:', error.response?.data || error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple distance calculation
// ─────────────────────────────────────────────────────────────────────────────
async function calculateDistance(origin, destination) {
  try {
    const routes = await getDirections(origin, destination, false);
    if (routes.length > 0) {
      return { distance: routes[0].distance, duration: routes[0].duration };
    }
    throw new Error('No routes found.');
  } catch (error) {
    console.error('ORS calculateDistance error:', error.message);
    throw error;
  }
}

module.exports = {
  geocodeAddress,
  autocompleteAddress,
  getDirections,
  calculateDistance
};
