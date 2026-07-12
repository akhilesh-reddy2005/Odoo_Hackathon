const db = require('../config/db');

// Retrieve all trips with search/filters
exports.getAllTrips = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT t.*, 
             v.name as vehicle_name, v.registration_number as vehicle_reg, v.capacity as vehicle_capacity,
             d.name as driver_name, d.phone as driver_phone, d.license_expiry as driver_expiry
      FROM trips t
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN drivers d ON t.driver_id = d.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM trips t
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN drivers d ON t.driver_id = d.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (status && status !== 'All') {
      query += ' AND t.status = ?';
      countQuery += ' AND t.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (search && search.trim() !== '') {
      const pattern = `%${search}%`;
      query += ' AND (t.source LIKE ? OR t.destination LIKE ? OR v.name LIKE ? OR d.name LIKE ?)';
      countQuery += ' AND (t.source LIKE ? OR t.destination LIKE ? OR v.name LIKE ? OR d.name LIKE ?)';
      params.push(pattern, pattern, pattern, pattern);
      countParams.push(pattern, pattern, pattern, pattern);
    }

    query += ' ORDER BY t.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [trips] = await db.query(query, params);
    const [[{ total }]] = await db.query(countQuery, countParams);

    res.json({
      trips,
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
    const [trips] = await db.query(
      `SELECT t.*, 
              v.name as vehicle_name, v.registration_number, v.capacity as vehicle_capacity, v.type as vehicle_type,
              d.name as driver_name, d.phone as driver_phone, d.license_number as driver_license, d.license_expiry, d.safety_score as driver_safety
       FROM trips t
       JOIN vehicles v ON t.vehicle_id = v.id
       JOIN drivers d ON t.driver_id = d.id
       WHERE t.id = ?`,
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip record not found.' });
    }

    res.json(trips[0]);
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ message: 'Error retrieving trip details.' });
  }
};

// Create a new Trip (enters Draft state)
exports.createTrip = async (req, res) => {
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, notes } = req.body;

  if (!vehicle_id || !driver_id || !source || !destination || !cargo_weight || !planned_distance) {
    return res.status(400).json({ message: 'Missing required trip fields.' });
  }

  try {
    // 1. Verify Cargo Weight vs. Vehicle Capacity
    const [vehicles] = await db.query('SELECT capacity, status, name FROM vehicles WHERE id = ?', [vehicle_id]);
    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    const vehicle = vehicles[0];
    if (parseFloat(cargo_weight) > parseFloat(vehicle.capacity)) {
      return res.status(400).json({ 
        message: `Cargo weight (${cargo_weight} kg) exceeds vehicle capacity (${vehicle.capacity} kg) for ${vehicle.name}.` 
      });
    }

    // 2. Insert as Draft
    const [result] = await db.query(
      `INSERT INTO trips (vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'Draft', ?)`,
      [vehicle_id, driver_id, source, destination, parseFloat(cargo_weight), parseFloat(planned_distance), notes || '']
    );

    res.status(201).json({ message: 'Trip plan created in Draft.', tripId: result.insertId });

  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ message: 'Failed to create trip plan.' });
  }
};

// Dispatch Trip
exports.dispatchTrip = async (req, res) => {
  const { id } = req.params;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch Trip details
    const [trips] = await conn.query('SELECT * FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Trip not found.' });
    }
    const trip = trips[0];

    if (trip.status !== 'Draft') {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot dispatch a trip that is currently in status: ${trip.status}` });
    }

    // 2. Validate Vehicle Rules
    const [vehicles] = await conn.query('SELECT name, status, capacity FROM vehicles WHERE id = ?', [trip.vehicle_id]);
    const vehicle = vehicles[0];

    if (vehicle.status === 'Retired') {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot dispatch: Vehicle '${vehicle.name}' is retired.` });
    }
    if (vehicle.status === 'In Shop') {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot dispatch: Vehicle '${vehicle.name}' is undergoing maintenance in the shop.` });
    }
    if (vehicle.status === 'On Trip') {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot dispatch: Vehicle '${vehicle.name}' is already dispatched on another trip.` });
    }

    // 3. Validate Driver Rules
    const [drivers] = await conn.query('SELECT name, status, license_expiry FROM drivers WHERE id = ?', [trip.driver_id]);
    const driver = drivers[0];

    if (driver.status === 'Suspended') {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot dispatch: Driver '${driver.name}' is currently suspended.` });
    }
    if (new Date(driver.license_expiry) <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot dispatch: Driver '${driver.name}' has an expired license (Expired: ${driver.license_expiry}).` });
    }
    if (driver.status === 'On Trip') {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot dispatch: Driver '${driver.name}' is already assigned to an active trip.` });
    }

    // 4. Update status of vehicle and driver
    await conn.query("UPDATE vehicles SET status = 'On Trip' WHERE id = ?", [trip.vehicle_id]);
    await conn.query("UPDATE drivers SET status = 'On Trip' WHERE id = ?", [trip.driver_id]);

    // 5. Update Trip status to Dispatched
    await conn.query("UPDATE trips SET status = 'Dispatched', dispatched_at = NOW() WHERE id = ?", [id]);

    // Logging Activity
    await conn.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Dispatch Trip', `Dispatched Trip ID: ${id} with Vehicle: ${vehicle.name} & Driver: ${driver.name}`]
    );

    // Commit Transaction
    await conn.commit();
    res.json({ message: 'Trip successfully dispatched.' });

  } catch (error) {
    await conn.rollback();
    console.error('Dispatch trip error:', error);
    res.status(500).json({ message: 'Error dispatching trip.' });
  } finally {
    conn.release();
  }
};

// Complete Trip
exports.completeTrip = async (req, res) => {
  const { id } = req.params;
  const { current_odometer } = req.body; // optionally update vehicle odometer

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [trips] = await conn.query('SELECT * FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Trip not found.' });
    }
    const trip = trips[0];

    if (trip.status !== 'Dispatched') {
      await conn.rollback();
      return res.status(400).json({ message: 'Only dispatched trips can be completed.' });
    }

    // Update statuses back to Available
    await conn.query("UPDATE vehicles SET status = 'Available' WHERE id = ?", [trip.vehicle_id]);
    await conn.query("UPDATE drivers SET status = 'Available', trip_count = trip_count + 1 WHERE id = ?", [trip.driver_id]);

    // If odometer updated, update vehicle odometer
    if (current_odometer) {
      await conn.query('UPDATE vehicles SET current_odometer = ? WHERE id = ?', [parseFloat(current_odometer), trip.vehicle_id]);
    } else {
      // automatically advance odometer by planned distance
      await conn.query('UPDATE vehicles SET current_odometer = current_odometer + ? WHERE id = ?', [parseFloat(trip.planned_distance), trip.vehicle_id]);
    }

    // Set trip as Completed
    await conn.query("UPDATE trips SET status = 'Completed', completed_at = NOW() WHERE id = ?", [id]);

    // Create Toll and operational expenses automatically
    const tollAmount = parseFloat((trip.planned_distance * 0.15).toFixed(2)); // $0.15 per km toll estimation
    await conn.query(
      'INSERT INTO expenses (vehicle_id, trip_id, type, amount, date, description) VALUES (?, ?, ?, ?, CURDATE(), ?)',
      [trip.vehicle_id, id, 'Toll', tollAmount, `Toll road expenses for completed trip ID: ${id}`]
    );

    // Logging Activity
    await conn.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Complete Trip', `Completed Trip ID: ${id}. Generated toll expense of $${tollAmount}.`]
    );

    await conn.commit();
    res.json({ message: 'Trip marked as completed.' });

  } catch (error) {
    await conn.rollback();
    console.error('Complete trip error:', error);
    res.status(500).json({ message: 'Error marking trip as completed.' });
  } finally {
    conn.release();
  }
};

// Cancel Trip
exports.cancelTrip = async (req, res) => {
  const { id } = req.params;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [trips] = await conn.query('SELECT * FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Trip not found.' });
    }
    const trip = trips[0];

    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot cancel a trip that is already ${trip.status}.` });
    }

    // If dispatched, return vehicle and driver back to Available
    if (trip.status === 'Dispatched') {
      await conn.query("UPDATE vehicles SET status = 'Available' WHERE id = ?", [trip.vehicle_id]);
      await conn.query("UPDATE drivers SET status = 'Available' WHERE id = ?", [trip.driver_id]);
    }

    // Update trip status
    await conn.query("UPDATE trips SET status = 'Cancelled', cancelled_at = NOW() WHERE id = ?", [id]);

    // Logging Activity
    await conn.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Cancel Trip', `Cancelled Trip ID: ${id}.`]
    );

    await conn.commit();
    res.json({ message: 'Trip cancelled successfully.' });

  } catch (error) {
    await conn.rollback();
    console.error('Cancel trip error:', error);
    res.status(500).json({ message: 'Error cancelling trip.' });
  } finally {
    conn.release();
  }
};

// Edit trip before dispatch
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, notes } = req.body;

  try {
    const [trips] = await db.query('SELECT status FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    
    if (trips[0].status !== 'Draft') {
      return res.status(400).json({ message: 'Only Draft trips can be modified.' });
    }

    // Validate Cargo capacity
    const [vehicles] = await db.query('SELECT capacity FROM vehicles WHERE id = ?', [vehicle_id]);
    if (vehicles.length > 0 && parseFloat(cargo_weight) > parseFloat(vehicles[0].capacity)) {
      return res.status(400).json({ message: `Cargo weight exceeds vehicle capacity of ${vehicles[0].capacity} kg.` });
    }

    await db.query(
      `UPDATE trips 
       SET vehicle_id = ?, driver_id = ?, source = ?, destination = ?, cargo_weight = ?, planned_distance = ?, notes = ?
       WHERE id = ?`,
      [vehicle_id, driver_id, source, destination, parseFloat(cargo_weight), parseFloat(planned_distance), notes || '', id]
    );

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
    const [trips] = await db.query('SELECT status FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const { status } = trips[0];
    if (status !== 'Draft' && status !== 'Cancelled') {
      return res.status(400).json({ message: 'Cannot delete an active or completed trip.' });
    }

    await db.query('DELETE FROM trips WHERE id = ?', [id]);
    res.json({ message: 'Trip deleted.' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ message: 'Failed to delete trip record.' });
  }
};
