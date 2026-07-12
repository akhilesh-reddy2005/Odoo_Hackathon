const db = require('../config/db');

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
    const { search, status, type, sortBy = 'id', order = 'DESC', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM vehicles WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM vehicles WHERE 1=1';
    const params = [];
    const countParams = [];

    // Search filter
    if (search && search.trim() !== '') {
      const searchPattern = `%${search}%`;
      query += ' AND (registration_number LIKE ? OR name LIKE ? OR model LIKE ?)';
      countQuery += ' AND (registration_number LIKE ? OR name LIKE ? OR model LIKE ?)';
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

    // Type filter
    if (type && type !== 'All') {
      query += ' AND type = ?';
      countQuery += ' AND type = ?';
      params.push(type);
      countParams.push(type);
    }

    // Sorting list of allowed fields to avoid SQL injection
    const allowedSortFields = ['id', 'registration_number', 'name', 'model', 'type', 'capacity', 'current_odometer', 'acquisition_cost', 'purchase_date', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${safeSortBy} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    // Run queries
    const [vehicles] = await db.query(query, params);
    const [[{ total }]] = await db.query(countQuery, countParams);

    // Compute health scores dynamically for all returned vehicles
    for (let vehicle of vehicles) {
      const [maint] = await db.query('SELECT priority, actual_cost, status FROM maintenance WHERE vehicle_id = ?', [vehicle.id]);
      vehicle.health_score = calculateHealthScore(vehicle, maint);
    }

    res.json({
      vehicles,
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
    const [vehicles] = await db.query('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    const vehicle = vehicles[0];

    // Fetch Maintenance and Trip histories
    const [maintenance] = await db.query('SELECT * FROM maintenance WHERE vehicle_id = ? ORDER BY id DESC LIMIT 5', [id]);
    const [trips] = await db.query(
      `SELECT t.*, d.name as driver_name 
       FROM trips t
       JOIN drivers d ON t.driver_id = d.id
       WHERE t.vehicle_id = ? ORDER BY t.id DESC LIMIT 5`,
      [id]
    );

    vehicle.health_score = calculateHealthScore(vehicle, maintenance);
    vehicle.maintenance_history = maintenance;
    vehicle.trip_history = trips;

    res.json(vehicle);
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
    const [existing] = await db.query('SELECT id FROM vehicles WHERE registration_number = ?', [registration_number]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `Registration number ${registration_number} already exists.` });
    }

    const [result] = await db.query(
      `INSERT INTO vehicles (registration_number, name, model, type, capacity, current_odometer, acquisition_cost, purchase_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [registration_number, name, model, type, parseFloat(capacity), parseFloat(current_odometer), parseFloat(acquisition_cost), purchase_date, status]
    );

    // Audit logs
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Register Vehicle', `Registered new vehicle: ${name} (${registration_number}).`]
    );

    res.status(201).json({ message: 'Vehicle registered successfully.', vehicleId: result.insertId });

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
    const [vehicle] = await db.query('SELECT status FROM vehicles WHERE id = ?', [id]);
    if (vehicle.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    // Uniqueness validation
    const [existing] = await db.query('SELECT id FROM vehicles WHERE registration_number = ? AND id != ?', [registration_number, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `Registration number ${registration_number} already in use.` });
    }

    // Business Rule Check: Do not allow changing status of vehicle to Available if it has active trip or maintenance
    if (status === 'Available') {
      const [activeTrip] = await db.query("SELECT id FROM trips WHERE vehicle_id = ? AND status = 'Dispatched'", [id]);
      if (activeTrip.length > 0) {
        return res.status(400).json({ message: 'Vehicle cannot be set to Available while On Trip.' });
      }
      const [activeMaint] = await db.query("SELECT id FROM maintenance WHERE vehicle_id = ? AND status = 'In Progress'", [id]);
      if (activeMaint.length > 0) {
        return res.status(400).json({ message: 'Vehicle cannot be set to Available while In Shop.' });
      }
    }

    await db.query(
      `UPDATE vehicles 
       SET registration_number = ?, name = ?, model = ?, type = ?, capacity = ?, current_odometer = ?, acquisition_cost = ?, purchase_date = ?, status = ?
       WHERE id = ?`,
      [registration_number, name, model, type, parseFloat(capacity), parseFloat(current_odometer), parseFloat(acquisition_cost), purchase_date, status, id]
    );

    // Audit logs
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Update Vehicle', `Updated vehicle: ${name} (${registration_number}).`]
    );

    res.json({ message: 'Vehicle updated successfully.' });

  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ message: 'Failed to update vehicle details.' });
  }
};

// Delete a vehicle
exports.deleteVehicle = async (req, res) => {
  const { id } = req.params;
  try {
    const [vehicle] = await db.query('SELECT name, registration_number, status FROM vehicles WHERE id = ?', [id]);
    if (vehicle.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    // Business checks
    if (vehicle[0].status === 'On Trip') {
      return res.status(400).json({ message: 'Cannot delete vehicle that is currently On Trip.' });
    }

    // Soft-delete or retire vehicle instead of deleting if referenced in logs,
    // For simplicity, let's mark it as 'Retired'. If it is 'Available', we can also allow hard delete
    if (vehicle[0].status === 'Retired') {
      await db.query('DELETE FROM vehicles WHERE id = ?', [id]);
      return res.json({ message: 'Vehicle deleted from database.' });
    }

    await db.query("UPDATE vehicles SET status = 'Retired' WHERE id = ?", [id]);

    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Retire Vehicle', `Vehicle retired: ${vehicle[0].name} (${vehicle[0].registration_number}).`]
    );

    res.json({ message: "Vehicle status successfully set to 'Retired'." });

  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ message: 'Failed to delete or retire vehicle. References may exist.' });
  }
};
