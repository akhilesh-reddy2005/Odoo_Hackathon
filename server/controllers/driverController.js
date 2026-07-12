const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const ActivityLog = require('../models/ActivityLog');

// Helper to calculate Driver Performance Score
function calculatePerformanceScore(driver) {
  const safety = parseFloat(driver.safety_score) || 0;
  const efficiency = parseFloat(driver.fuel_efficiency) || 0;
  const trips = parseInt(driver.trip_count) || 0;

  // Weighted calculation:
  // - 50% based on Safety Score (0-100)
  // - 30% based on Fuel Efficiency (calibrated such that 5.0 km/L = 100%) -> (Efficiency / 5.0) * 100
  // - 20% based on Trip Count (cap at 50 trips = 100%) -> (Trips / 50) * 100
  const safetyWeight = safety * 0.5;
  const efficiencyWeight = Math.min(100, (efficiency / 5.0) * 100) * 0.3;
  const tripWeight = Math.min(100, (trips / 50) * 100) * 0.2;

  return parseFloat((safetyWeight + efficiencyWeight + tripWeight).toFixed(2));
}

// Fetch all drivers with search, filtering, and sorting
exports.getAllDrivers = async (req, res) => {
  try {
    const { search, status, expired, sortBy = 'createdAt', order = 'DESC', page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filterQuery = {};

    // Search query
    if (search && search.trim() !== '') {
      const regex = new RegExp(search, 'i');
      filterQuery.$or = [
        { name: regex },
        { phone: regex },
        { license_number: regex }
      ];
    }

    // Status filter
    if (status && status !== 'All') {
      filterQuery.status = status;
    }

    // License expiry filter
    if (expired === 'true') {
      filterQuery.license_expiry = { $lte: new Date() };
    } else if (expired === 'false') {
      filterQuery.license_expiry = { $gt: new Date() };
    }

    // Sorting parameters mapping
    const sortParams = {};
    const sortFieldMap = {
      id: '_id',
      name: 'name',
      license_expiry: 'license_expiry',
      safety_score: 'safety_score',
      status: 'status',
      trip_count: 'trip_count',
      fuel_efficiency: 'fuel_efficiency',
      createdAt: 'createdAt'
    };
    const targetSortField = sortFieldMap[sortBy] || 'createdAt';
    sortParams[targetSortField] = order.toUpperCase() === 'ASC' ? 1 : -1;

    const drivers = await Driver.find(filterQuery)
      .sort(sortParams)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Driver.countDocuments(filterQuery);

    // Dynamic calculations formatting
    const formattedDrivers = drivers.map(d => {
      const obj = d.toObject();
      obj.performance_score = calculatePerformanceScore(d);
      obj.is_license_expired = new Date(d.license_expiry) <= new Date();
      return obj;
    });

    res.json({
      drivers: formattedDrivers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ message: 'Error retrieving driver lists.' });
  }
};

// Fetch single driver detail
exports.getDriverById = async (req, res) => {
  const { id } = req.params;
  try {
    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    // Fetch related trips
    const trips = await Trip.find({ driver: id })
      .populate('vehicle')
      .sort({ createdAt: -1 })
      .limit(5);

    const formattedTrips = trips.map(t => {
      const obj = t.toObject();
      obj.vehicle_name = t.vehicle ? t.vehicle.name : 'Unknown';
      obj.registration_number = t.vehicle ? t.vehicle.registration_number : '';
      return obj;
    });

    const obj = driver.toObject();
    obj.performance_score = calculatePerformanceScore(driver);
    obj.is_license_expired = new Date(driver.license_expiry) <= new Date();
    obj.trip_history = formattedTrips;

    res.json(obj);

  } catch (error) {
    console.error('Get driver detail error:', error);
    res.status(500).json({ message: 'Error retrieving driver profile details.' });
  }
};

// Create driver registration
exports.createDriver = async (req, res) => {
  const { name, phone, license_number, license_category, license_expiry, safety_score = 100.00, status = 'Available' } = req.body;

  if (!name || !phone || !license_number || !license_category || !license_expiry) {
    return res.status(400).json({ message: 'All driver registration fields are required.' });
  }

  try {
    const existing = await Driver.findOne({ license_number: license_number.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: `License number ${license_number} is already registered.` });
    }

    const newDriver = await Driver.create({
      name,
      phone,
      license_number: license_number.toUpperCase(),
      license_category,
      license_expiry,
      safety_score: parseFloat(safety_score),
      status
    });

    // Audit log
    await ActivityLog.create({
      user: req.user.id,
      action: 'Register Driver',
      details: `Registered driver: ${name} (License: ${license_number}).`
    });

    res.status(201).json({ message: 'Driver profile registered successfully.', driverId: newDriver._id });

  } catch (error) {
    console.error('Register driver error:', error);
    res.status(500).json({ message: 'Failed to create driver profile.' });
  }
};

// Update driver details
exports.updateDriver = async (req, res) => {
  const { id } = req.params;
  const { name, phone, license_number, license_category, license_expiry, safety_score, status, fuel_efficiency } = req.body;

  try {
    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found.' });
    }

    // License uniqueness check
    const existing = await Driver.findOne({ license_number: license_number.toUpperCase(), _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({ message: `License number ${license_number} is already in use by another driver.` });
    }

    // Check availability business constraints
    if (status === 'Available') {
      const activeTrip = await Trip.findOne({ driver: id, status: 'Dispatched' });
      if (activeTrip) {
        return res.status(400).json({ message: 'Driver cannot be set to Available while On Trip.' });
      }
    }

    await Driver.findByIdAndUpdate(id, {
      name,
      phone,
      license_number: license_number.toUpperCase(),
      license_category,
      license_expiry,
      safety_score: parseFloat(safety_score),
      status,
      fuel_efficiency: parseFloat(fuel_efficiency || 0)
    });

    // Audit logs
    await ActivityLog.create({
      user: req.user.id,
      action: 'Update Driver',
      details: `Updated driver profile: ${name}.`
    });

    res.json({ message: 'Driver details updated successfully.' });

  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ message: 'Failed to update driver details.' });
  }
};

// Suspend or delete driver profile
exports.deleteDriver = async (req, res) => {
  const { id } = req.params;
  try {
    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found.' });
    }

    if (driver.status === 'On Trip') {
      return res.status(400).json({ message: 'Cannot delete a driver who is currently On Trip.' });
    }

    // If already Suspended, delete permanently
    if (driver.status === 'Suspended') {
      await Driver.findByIdAndDelete(id);
      return res.json({ message: 'Driver permanently deleted from database.' });
    }

    driver.status = 'Suspended';
    await driver.save();

    await ActivityLog.create({
      user: req.user.id,
      action: 'Suspend Driver',
      details: `Driver status suspended: ${driver.name}.`
    });

    res.json({ message: "Driver status set to 'Suspended'." });

  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ message: 'Failed to delete driver.' });
  }
};
