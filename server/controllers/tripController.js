const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Expense = require('../models/Expense');
const ActivityLog = require('../models/ActivityLog');

// Retrieve all trips with search/filters
exports.getAllTrips = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filterQuery = {};

    if (status && status !== 'All') {
      filterQuery.status = status;
    }

    // execute populated lookup
    let trips = await Trip.find(filterQuery)
      .populate('vehicle')
      .populate('driver')
      .sort({ createdAt: -1 });

    // Client-side mapping of search matches to support population nested filters
    if (search && search.trim() !== '') {
      const regex = new RegExp(search, 'i');
      trips = trips.filter(t => 
        regex.test(t.source) ||
        regex.test(t.destination) ||
        (t.vehicle && regex.test(t.vehicle.name)) ||
        (t.driver && regex.test(t.driver.name))
      );
    }

    const total = trips.length;
    const paginatedTrips = trips.slice(skip, skip + parseInt(limit));

    // Format structure to match client expectations
    const formattedTrips = paginatedTrips.map(t => {
      const obj = t.toObject();
      obj.vehicle_name = t.vehicle ? t.vehicle.name : 'Unknown';
      obj.vehicle_reg = t.vehicle ? t.vehicle.registration_number : '';
      obj.vehicle_capacity = t.vehicle ? t.vehicle.capacity : 0;
      obj.driver_name = t.driver ? t.driver.name : 'Unknown';
      obj.driver_phone = t.driver ? t.driver.phone : '';
      obj.driver_expiry = t.driver ? t.driver.license_expiry : null;
      return obj;
    });

    res.json({
      trips: formattedTrips,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ message: 'Error retrieving trips logs.' });
  }
};

// Fetch single trip
exports.getTripById = async (req, res) => {
  const { id } = req.params;
  try {
    const t = await Trip.findById(id).populate('vehicle').populate('driver');
    if (!t) {
      return res.status(404).json({ message: 'Trip record not found.' });
    }

    const obj = t.toObject();
    obj.vehicle_name = t.vehicle ? t.vehicle.name : 'Unknown';
    obj.registration_number = t.vehicle ? t.vehicle.registration_number : '';
    obj.vehicle_capacity = t.vehicle ? t.vehicle.capacity : 0;
    obj.vehicle_type = t.vehicle ? t.vehicle.type : '';
    obj.driver_name = t.driver ? t.driver.name : 'Unknown';
    obj.driver_phone = t.driver ? t.driver.phone : '';
    obj.driver_license = t.driver ? t.driver.license_number : '';
    obj.license_expiry = t.driver ? t.driver.license_expiry : null;
    obj.driver_safety = t.driver ? t.driver.safety_score : 100;

    res.json(obj);
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ message: 'Error retrieving trip details.' });
  }
};

// Create a new Trip (Draft state)
exports.createTrip = async (req, res) => {
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, notes } = req.body;

  if (!vehicle_id || !driver_id || !source || !destination || !cargo_weight || !planned_distance) {
    return res.status(400).json({ message: 'Missing required trip fields.' });
  }

  try {
    // 1. Verify Cargo Weight vs. Vehicle Capacity
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    if (parseFloat(cargo_weight) > parseFloat(vehicle.capacity)) {
      return res.status(400).json({ 
        message: `Cargo weight (${cargo_weight} kg) exceeds vehicle capacity (${vehicle.capacity} kg) for ${vehicle.name}.` 
      });
    }

    // 2. Insert as Draft
    const newTrip = await Trip.create({
      vehicle: vehicle_id,
      driver: driver_id,
      source,
      destination,
      cargo_weight: parseFloat(cargo_weight),
      planned_distance: parseFloat(planned_distance),
      status: 'Draft',
      notes: notes || ''
    });

    res.status(201).json({ message: 'Trip plan created in Draft.', tripId: newTrip._id });

  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ message: 'Failed to create trip plan.' });
  }
};

// Dispatch Trip
exports.dispatchTrip = async (req, res) => {
  const { id } = req.params;

  try {
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.status !== 'Draft') {
      return res.status(400).json({ message: `Cannot dispatch a trip that is currently in status: ${trip.status}` });
    }

    // Validate Vehicle Rules
    const vehicle = await Vehicle.findById(trip.vehicle);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    if (vehicle.status === 'Retired') {
      return res.status(400).json({ message: `Cannot dispatch: Vehicle '${vehicle.name}' is retired.` });
    }
    if (vehicle.status === 'In Shop') {
      return res.status(400).json({ message: `Cannot dispatch: Vehicle '${vehicle.name}' is undergoing maintenance in the shop.` });
    }
    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ message: `Cannot dispatch: Vehicle '${vehicle.name}' is already dispatched on another trip.` });
    }

    // Validate Driver Rules
    const driver = await Driver.findById(trip.driver);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }
    if (driver.status === 'Suspended') {
      return res.status(400).json({ message: `Cannot dispatch: Driver '${driver.name}' is currently suspended.` });
    }
    if (new Date(driver.license_expiry) <= new Date()) {
      return res.status(400).json({ message: `Cannot dispatch: Driver '${driver.name}' has an expired license (Expired: ${driver.license_expiry}).` });
    }
    if (driver.status === 'On Trip') {
      return res.status(400).json({ message: `Cannot dispatch: Driver '${driver.name}' is already assigned to an active trip.` });
    }

    // Update status of vehicle and driver
    vehicle.status = 'On Trip';
    await vehicle.save();

    driver.status = 'On Trip';
    await driver.save();

    // Update Trip status to Dispatched
    trip.status = 'Dispatched';
    trip.dispatched_at = new Date();
    await trip.save();

    // Logging Activity
    await ActivityLog.create({
      user: req.user.id,
      action: 'Dispatch Trip',
      details: `Dispatched Trip ID: ${id} with Vehicle: ${vehicle.name} & Driver: ${driver.name}`
    });

    res.json({ message: 'Trip successfully dispatched.' });

  } catch (error) {
    console.error('Dispatch trip error:', error);
    res.status(500).json({ message: 'Error dispatching trip.' });
  }
};

// Complete Trip
exports.completeTrip = async (req, res) => {
  const { id } = req.params;
  const { current_odometer } = req.body; // optionally update vehicle odometer

  try {
    const trip = await Trip.findById(id).populate('vehicle');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.status !== 'Dispatched') {
      return res.status(400).json({ message: 'Only dispatched trips can be completed.' });
    }

    // Update statuses back to Available
    await Vehicle.findByIdAndUpdate(trip.vehicle._id, {
      status: 'Available',
      $inc: { current_odometer: current_odometer ? 0 : parseFloat(trip.planned_distance) },
      ...(current_odometer && { current_odometer: parseFloat(current_odometer) })
    });

    await Driver.findByIdAndUpdate(trip.driver, {
      status: 'Available',
      $inc: { trip_count: 1 }
    });

    // Set trip as Completed
    trip.status = 'Completed';
    trip.completed_at = new Date();
    await trip.save();

    // Create Toll and operational expenses automatically
    const tollAmount = parseFloat((trip.planned_distance * 0.15).toFixed(2)); // $0.15 per km toll estimation
    await Expense.create({
      vehicle: trip.vehicle._id,
      trip: id,
      type: 'Toll',
      amount: tollAmount,
      date: new Date(),
      description: `Toll road expenses for completed trip ID: ${id}`
    });

    // Logging Activity
    await ActivityLog.create({
      user: req.user.id,
      action: 'Complete Trip',
      details: `Completed Trip ID: ${id}. Generated toll expense of $${tollAmount}.`
    });

    res.json({ message: 'Trip marked as completed.' });

  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ message: 'Error marking trip as completed.' });
  }
};

// Cancel Trip
exports.cancelTrip = async (req, res) => {
  const { id } = req.params;

  try {
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
      return res.status(400).json({ message: `Cannot cancel a trip that is already ${trip.status}.` });
    }

    // If dispatched, return vehicle and driver back to Available
    if (trip.status === 'Dispatched') {
      await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'Available' });
      await Driver.findByIdAndUpdate(trip.driver, { status: 'Available' });
    }

    // Update trip status
    trip.status = 'Cancelled';
    trip.cancelled_at = new Date();
    await trip.save();

    // Logging Activity
    await ActivityLog.create({
      user: req.user.id,
      action: 'Cancel Trip',
      details: `Cancelled Trip ID: ${id}.`
    });

    res.json({ message: 'Trip cancelled successfully.' });

  } catch (error) {
    console.error('Cancel trip error:', error);
    res.status(500).json({ message: 'Error cancelling trip.' });
  }
};

// Edit trip before dispatch
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, notes } = req.body;

  try {
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    
    if (trip.status !== 'Draft') {
      return res.status(400).json({ message: 'Only Draft trips can be modified.' });
    }

    // Validate Cargo capacity
    const vehicle = await Vehicle.findById(vehicle_id);
    if (vehicle && parseFloat(cargo_weight) > parseFloat(vehicle.capacity)) {
      return res.status(400).json({ message: `Cargo weight exceeds vehicle capacity of ${vehicle.capacity} kg.` });
    }

    await Trip.findByIdAndUpdate(id, {
      vehicle: vehicle_id,
      driver: driver_id,
      source,
      destination,
      cargo_weight: parseFloat(cargo_weight),
      planned_distance: parseFloat(planned_distance),
      notes: notes || ''
    });

    res.json({ message: 'Trip plan updated.' });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ message: 'Failed to update trip details.' });
  }
};

// Delete Trip (only Draft or Cancelled)
exports.deleteTrip = async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.status !== 'Draft' && trip.status !== 'Cancelled') {
      return res.status(400).json({ message: 'Cannot delete an active or completed trip.' });
    }

    await Trip.findByIdAndDelete(id);
    res.json({ message: 'Trip deleted.' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ message: 'Failed to delete trip record.' });
  }
};
