const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const { decodePolyline } = require('./maps.service');

// Simulation runs every 5 seconds
const SIMULATION_INTERVAL_MS = 5000;
// Full route is completed in 120 seconds (2 minutes)
const TOTAL_SIMULATION_DURATION_MS = 120000; 

let intervalId = null;

async function simulateVehicles() {
  try {
    const activeTrips = await Trip.find({ status: 'Dispatched' }).populate('vehicle');

    for (const trip of activeTrips) {
      if (!trip.vehicle) continue;
      if (!trip.routePolyline) continue;

      const coordinates = decodePolyline(trip.routePolyline);
      if (coordinates.length === 0) continue;

      const dispatchedTime = new Date(trip.dispatched_at).getTime();
      const elapsedMs = Date.now() - dispatchedTime;
      const progress = Math.min(1.0, elapsedMs / TOTAL_SIMULATION_DURATION_MS);

      const coordinateIndex = Math.min(
        coordinates.length - 1,
        Math.floor(progress * coordinates.length)
      );

      const currentCoord = coordinates[coordinateIndex];

      const vehicle = await Vehicle.findById(trip.vehicle._id);
      if (vehicle) {
        if (vehicle.currentLocation && vehicle.currentLocation.latitude) {
          vehicle.lastKnownLocation = {
            latitude: vehicle.currentLocation.latitude,
            longitude: vehicle.currentLocation.longitude
          };
        } else {
          vehicle.lastKnownLocation = {
            latitude: coordinates[0].latitude,
            longitude: coordinates[0].longitude
          };
        }

        vehicle.currentLocation = {
          latitude: currentCoord.latitude,
          longitude: currentCoord.longitude
        };

        await vehicle.save();
      }
    }
  } catch (error) {
    console.error('Error in vehicle simulation background task:', error.message);
  }
}

function startSimulation() {
  if (intervalId) return;

  console.log('[Simulation Service] Starting background vehicle movement simulator (5s intervals)...');
  intervalId = setInterval(simulateVehicles, SIMULATION_INTERVAL_MS);
}

function stopSimulation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Simulation Service] Background simulator stopped.');
  }
}

module.exports = {
  startSimulation,
  stopSimulation
};
