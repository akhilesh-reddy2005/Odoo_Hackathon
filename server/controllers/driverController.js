const db = require('../config/db');

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
    const { search, status, expired, sortBy = 'id', order = 'DESC', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM drivers WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM drivers WHERE 1=1';
    const params = [];
    const countParams = [];

    // Search query
    if (search && search.trim() !== '') {
      const searchPattern = `%${search}%`;
      query += ' AND (name LIKE ? OR phone LIKE ? OR license_number LIKE ?)';
      countQuery += ' AND (name LIKE ? OR phone LIKE ? OR license_number LIKE ?)';
      params.push(searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Status filter
    if (status && status !== 'All') {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // License expiry filter
    if (expired === 'true') {
      query += ' AND license_expiry <= CURDATE()';
      countQuery += ' AND license_expiry <= CURDATE()';
    } else if (expired === 'false') {
      query += ' AND license_expiry > CURDATE()';
      countQuery += ' AND license_expiry > CURDATE()';
    }

    // Sorting
    const allowedSortFields = ['id', 'name', 'license_expiry', 'safety_score', 'status', 'trip_count', 'fuel_efficiency'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortBy} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [drivers] = await db.query(query, params);
    const [[{ total }]] = await db.query(countQuery, countParams);

    // Dynamic calculations
    drivers.forEach(driver => {
      driver.performance_score = calculatePerformanceScore(driver);
      // check if expired relative to curdate
      driver.is_license_expired = new Date(driver.license_expiry) <= new Date();
    });

    res.json({
      drivers,
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
    const [drivers] = await db.query('SELECT * FROM drivers WHERE id = ?', [id]);
    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver not found.' });
    }
    const driver = drivers[0];

    // Fetch related trips
    const [trips] = await db.query(
      `SELECT t.*, v.name as vehicle_name, v.registration_number 
       FROM trips t
       JOIN vehicles v ON t.vehicle_id = v.id
       WHERE t.driver_id = ? ORDER BY t.id DESC LIMIT 5`,
      [id]
    );

    driver.performance_score = calculatePerformanceScore(driver);
    driver.is_license_expired = new Date(driver.license_expiry) <= new Date();
    driver.trip_history = trips;

    res.json(driver);

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
    const [existing] = await db.query('SELECT id FROM drivers WHERE license_number = ?', [license_number]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `License number ${license_number} is already registered.` });
    }

    const [result] = await db.query(
      `INSERT INTO drivers (name, phone, license_number, license_category, license_expiry, safety_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, license_number, license_category, license_expiry, parseFloat(safety_score), status]
    );

    // Audit log
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Register Driver', `Registered driver: ${name} (License: ${license_number}).`]
    );

    res.status(201).json({ message: 'Driver profile registered successfully.', driverId: result.insertId });

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
    const [driver] = await db.query('SELECT status FROM drivers WHERE id = ?', [id]);
    if (driver.length === 0) {
      return res.status(404).json({ message: 'Driver profile not found.' });
    }

    // License uniqueness check
    const [existing] = await db.query('SELECT id FROM drivers WHERE license_number = ? AND id != ?', [license_number, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `License number ${license_number} is already in use by another driver.` });
    }

    // Check availability business constraints
    if (status === 'Available') {
      const [activeTrip] = await db.query("SELECT id FROM trips WHERE driver_id = ? AND status = 'Dispatched'", [id]);
      if (activeTrip.length > 0) {
        return res.status(400).json({ message: 'Driver cannot be set to Available while On Trip.' });
      }
    }

    await db.query(
      `UPDATE drivers 
       SET name = ?, phone = ?, license_number = ?, license_category = ?, license_expiry = ?, safety_score = ?, status = ?, fuel_efficiency = ?
       WHERE id = ?`,
      [name, phone, license_number, license_category, license_expiry, parseFloat(safety_score), status, parseFloat(fuel_efficiency || 0), id]
    );

    // Audit logs
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Update Driver', `Updated driver profile: ${name}.`]
    );

    res.json({ message: 'Driver details updated successfully.' });

  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ message: 'Failed to update driver details.' });
  }
};

// Delete driver profile
exports.deleteDriver = async (req, res) => {
  const { id } = req.params;
  try {
    const [driver] = await db.query('SELECT name, status FROM drivers WHERE id = ?', [id]);
    if (driver.length === 0) {
      return res.status(404).json({ message: 'Driver profile not found.' });
    }

    if (driver[0].status === 'On Trip') {
      return res.status(400).json({ message: 'Cannot delete a driver who is currently On Trip.' });
    }

    if (driver[0].status === 'Suspended') {
      await db.query('DELETE FROM drivers WHERE id = ?', [id]);
      return res.json({ message: 'Driver permanently deleted from database.' });
    }

    await db.query("UPDATE drivers SET status = 'Suspended' WHERE id = ?", [id]);

    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Suspend Driver', `Driver status suspended: ${driver[0].name}.`]
    );

    res.json({ message: "Driver status set to 'Suspended'." });

  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ message: 'Failed to delete driver. References in trips may exist.' });
  }
};
