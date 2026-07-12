const Vehicle = require('../models/Vehicle');
const Maintenance = require('../models/Maintenance');
const Trip = require('../models/Trip');
const ActivityLog = require('../models/ActivityLog');

// Helper to calculate individual vehicle health score
function calculateHealthScore(vehicle, maintenanceLogs = []) {
  let score = 100.0;
  
  // 1. Age Deduction: Deduct 1.5 points per year since purchase
  if (vehicle.purchase_date) {
    const purchaseYear = new Date(vehicle.purchase_date).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - purchaseYear);
    score -= age * 1.5;
  }

  // 2. Odometer Deduction: Deduct 1 point per 50,000 km
  const odometerKms = Number(vehicle.current_odometer) || 0;
  score -= (odometerKms / 50000);

  // 3. Maintenance Deduction: Deduct for logs
  let pendingMaintenanceCount = 0;
  let criticalIssuesCount = 0;
  let totalMaintenanceCosts = 0;

  maintenanceLogs.forEach(log => {
    totalMaintenanceCosts += Number(log.actual_cost) || 0;
    if (log.status === 'Pending' || log.status === 'In Progress') {
      pendingMaintenanceCount++;
    }
    if (log.priority === 'Critical') {
      criticalIssuesCount++;
    }
  });

  score -= (pendingMaintenanceCount * 3);
  score -= (criticalIssuesCount * 8);
  score -= (totalMaintenanceCosts / 2000); // Deduct 1 point per $2,000 spent on maintenance

  // Clamp score between 0 and 100
  return parseFloat(Math.min(100, Math.max(0, score)).toFixed(2));
}

// Fetch all vehicles with search, sort, filter, pagination
exports.getAllVehicles = async (req, res) => {
  try {
    const { search, status, type, sortBy = 'createdAt', order = 'DESC', page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query filters
    const filterQuery = {};

    if (search && search.trim() !== '') {
      const regex = new RegExp(search, 'i');
      filterQuery.$or = [
        { registration_number: regex },
        { name: regex },
        { model: regex }
      ];
    }

    if (status && status !== 'All') {
      filterQuery.status = status;
    }

    if (type && type !== 'All') {
      filterQuery.type = type;
    }

    // Sort mappings
    const sortParams = {};
    const sortFieldMap = {
      id: '_id',
      registration_number: 'registration_number',
      name: 'name',
      model: 'model',
      type: 'type',
      capacity: 'capacity',
      current_odometer: 'current_odometer',
      acquisition_cost: 'acquisition_cost',
      purchase_date: 'purchase_date',
      status: 'status',
      createdAt: 'createdAt'
    };
    const targetSortField = sortFieldMap[sortBy] || 'createdAt';
    sortParams[targetSortField] = order.toUpperCase() === 'ASC' ? 1 : -1;

    // Execute queries
    const vehicles = await Vehicle.find(filterQuery)
      .sort(sortParams)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vehicle.countDocuments(filterQuery);

    // Compute health scores dynamically for all returned vehicles
    const vehiclesWithHealth = await Promise.all(vehicles.map(async (v) => {
      const maint = await Maintenance.find({ vehicle: v._id });
      const plainVeh = v.toObject();
      plainVeh.health_score = calculateHealthScore(v, maint);
      return plainVeh;
    }));

    res.json({
      vehicles: vehiclesWithHealth,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ message: 'Error retrieving vehicle data.' });
  }
};

// Fetch single vehicle details with trip and maintenance logs
exports.getVehicleById = async (req, res) => {
  const { id } = req.params;
  try {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    // Fetch Maintenance and Trip histories
    const maintenance = await Maintenance.find({ vehicle: id }).sort({ createdAt: -1 }).limit(5);
    const trips = await Trip.find({ vehicle: id })
      .populate('driver')
      .sort({ createdAt: -1 })
      .limit(5);

    const formattedTrips = trips.map(t => {
      const obj = t.toObject();
      obj.driver_name = t.driver ? t.driver.name : 'Unknown';
      return obj;
    });

    const plainVeh = vehicle.toObject();
    plainVeh.health_score = calculateHealthScore(vehicle, maintenance);
    plainVeh.maintenance_history = maintenance;
    plainVeh.trip_history = formattedTrips;

    res.json(plainVeh);
  } catch (error) {
    console.error('Get vehicle detail error:', error);
    res.status(500).json({ message: 'Error retrieving vehicle detail.' });
  }
};

// Create a new vehicle registration
exports.createVehicle = async (req, res) => {
  const { registration_number, name, model, type, capacity, current_odometer, acquisition_cost, purchase_date, status = 'Available' } = req.body;

  // Validation
  if (!registration_number || !name || !model || !type || !capacity || !current_odometer || !acquisition_cost || !purchase_date) {
    return res.status(400).json({ message: 'All vehicle fields are required.' });
  }

  try {
    const existing = await Vehicle.findOne({ registration_number: registration_number.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: `Registration number ${registration_number} already exists.` });
    }

    const newVehicle = await Vehicle.create({
      registration_number: registration_number.toUpperCase(),
      name,
      model,
      type,
      capacity: parseFloat(capacity),
      current_odometer: parseFloat(current_odometer),
      acquisition_cost: parseFloat(acquisition_cost),
      purchase_date,
      status
    });

    // Audit logs
    await ActivityLog.create({
      user: req.user.id,
      action: 'Register Vehicle',
      details: `Registered new vehicle: ${name} (${registration_number}).`
    });

    res.status(201).json({ message: 'Vehicle registered successfully.', vehicleId: newVehicle._id });

  } catch (error) {
    console.error('Register vehicle error:', error);
    res.status(500).json({ message: 'Failed to register vehicle.' });
  }
};

// Update an existing vehicle
exports.updateVehicle = async (req, res) => {
  const { id } = req.params;
  const { registration_number, name, model, type, capacity, current_odometer, acquisition_cost, purchase_date, status } = req.body;

  try {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    // Uniqueness validation
    const existing = await Vehicle.findOne({ registration_number: registration_number.toUpperCase(), _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({ message: `Registration number ${registration_number} already in use.` });
    }

    // Business Rule Check: Do not allow changing status of vehicle to Available if it has active trip or maintenance
    if (status === 'Available') {
      const activeTrip = await Trip.findOne({ vehicle: id, status: 'Dispatched' });
      if (activeTrip) {
        return res.status(400).json({ message: 'Vehicle cannot be set to Available while On Trip.' });
      }
      const activeMaint = await Maintenance.findOne({ vehicle: id, status: 'In Progress' });
      if (activeMaint) {
        return res.status(400).json({ message: 'Vehicle cannot be set to Available while In Shop.' });
      }
    }

    await Vehicle.findByIdAndUpdate(id, {
      registration_number: registration_number.toUpperCase(),
      name,
      model,
      type,
      capacity: parseFloat(capacity),
      current_odometer: parseFloat(current_odometer),
      acquisition_cost: parseFloat(acquisition_cost),
      purchase_date,
      status
    });

    // Audit logs
    await ActivityLog.create({
      user: req.user.id,
      action: 'Update Vehicle',
      details: `Updated vehicle: ${name} (${registration_number}).`
    });

    res.json({ message: 'Vehicle updated successfully.' });

  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ message: 'Failed to update vehicle details.' });
  }
};

// Delete or retire a vehicle
exports.deleteVehicle = async (req, res) => {
  const { id } = req.params;
  try {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    // Business checks
    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ message: 'Cannot delete vehicle that is currently On Trip.' });
    }

    // If already Retired, delete permanently
    if (vehicle.status === 'Retired') {
      await Vehicle.findByIdAndDelete(id);
      return res.json({ message: 'Vehicle deleted from database.' });
    }

    vehicle.status = 'Retired';
    await vehicle.save();

    await ActivityLog.create({
      user: req.user.id,
      action: 'Retire Vehicle',
      details: `Vehicle retired: ${vehicle.name} (${vehicle.registration_number}).`
    });

    res.json({ message: "Vehicle status successfully set to 'Retired'." });

  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ message: 'Failed to delete or retire vehicle.' });
  }
};
