const db = require('../config/db');

// Retrieve all fuel logs
exports.getAllFuelLogs = async (req, res) => {
  try {
    const { vehicle_id, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT f.*, v.name as vehicle_name, v.registration_number as vehicle_reg
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM fuel_logs f';
    const params = [];

    if (vehicle_id && vehicle_id !== 'All') {
      query += ' WHERE f.vehicle_id = ?';
      countQuery += ' WHERE f.vehicle_id = ?';
      params.push(vehicle_id);
    }

    query += ' ORDER BY f.date DESC, f.id DESC LIMIT ? OFFSET ?';
    // For counts
    const countParams = [...params];
    
    params.push(parseInt(limit), offset);

    const [logs] = await db.query(query, params);
    const [[{ total }]] = await db.query(countQuery, countParams);

    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Get fuel logs error:', error);
    res.status(500).json({ message: 'Error retrieving fuel logs.' });
  }
};

// Create a fuel log with automatic mileage and efficiency calculations
exports.createFuelLog = async (req, res) => {
  const { vehicle_id, date, fuel_quantity, fuel_cost, odometer } = req.body;

  if (!vehicle_id || !date || !fuel_quantity || !fuel_cost || !odometer) {
    return res.status(400).json({ message: 'All fuel log fields are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch Vehicle
    const [vehicles] = await conn.query('SELECT name, current_odometer FROM vehicles WHERE id = ?', [vehicle_id]);
    if (vehicles.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    const vehicle = vehicles[0];

    const currentOdo = parseFloat(odometer);
    const qty = parseFloat(fuel_quantity);
    const cost = parseFloat(fuel_cost);

    // Business check: odometer cannot be less than current odometer of the vehicle
    if (currentOdo < parseFloat(vehicle.current_odometer)) {
      await conn.rollback();
      return res.status(400).json({ 
        message: `Odometer reading (${currentOdo} km) cannot be less than vehicle's current odometer (${vehicle.current_odometer} km).` 
      });
    }

    // 2. Fetch the previous fuel log to calculate mileage
    const [prevLogs] = await conn.query(
      'SELECT odometer FROM fuel_logs WHERE vehicle_id = ? AND odometer < ? ORDER BY odometer DESC LIMIT 1',
      [vehicle_id, currentOdo]
    );

    let calculatedMileage = 0.00;
    if (prevLogs.length > 0) {
      const prevOdo = parseFloat(prevLogs[0].odometer);
      const distanceTravelled = currentOdo - prevOdo;
      if (distanceTravelled > 0 && qty > 0) {
        calculatedMileage = parseFloat((distanceTravelled / qty).toFixed(2));
      }
    } else {
      // Default estimation for first fuel log based on average vehicle category consumption
      calculatedMileage = 4.0; 
    }

    // 3. Insert fuel log
    const [result] = await conn.query(
      `INSERT INTO fuel_logs (vehicle_id, date, fuel_quantity, fuel_cost, odometer)
       VALUES (?, ?, ?, ?, ?)`,
      [vehicle_id, date, qty, cost, currentOdo]
    );

    // 4. Update vehicle's odometer
    await conn.query('UPDATE vehicles SET current_odometer = ? WHERE id = ?', [currentOdo, vehicle_id]);

    // 5. Update vehicle's average mileage (average of last 5 fuel logs)
    const [lastLogs] = await conn.query(
      'SELECT odometer, fuel_quantity FROM fuel_logs WHERE vehicle_id = ? ORDER BY odometer DESC LIMIT 5',
      [vehicle_id]
    );

    if (lastLogs.length > 1) {
      const newestOdo = parseFloat(lastLogs[0].odometer);
      const oldestOdo = parseFloat(lastLogs[lastLogs.length - 1].odometer);
      const totalDist = newestOdo - oldestOdo;
      
      // Sum fuel of all except the oldest one because fuel is consumed *between* readings
      let totalFuel = 0;
      for (let i = 0; i < lastLogs.length - 1; i++) {
        totalFuel += parseFloat(lastLogs[i].fuel_quantity);
      }

      if (totalDist > 0 && totalFuel > 0) {
        const avgEff = parseFloat((totalDist / totalFuel).toFixed(2));
        // We will store fuel efficiency in drivers table and dynamically compute, 
        // let's update current driver's fuel efficiency as well if driver is assigned
        const [activeTrip] = await conn.query(
          "SELECT driver_id FROM trips WHERE vehicle_id = ? AND status = 'Dispatched' LIMIT 1",
          [vehicle_id]
        );
        if (activeTrip.length > 0) {
          await conn.query(
            'UPDATE drivers SET fuel_efficiency = ? WHERE id = ?',
            [avgEff, activeTrip[0].driver_id]
          );
        }
      }
    }

    // 6. Log dynamic Expense entry for Fuel Cost
    await conn.query(
      `INSERT INTO expenses (vehicle_id, type, amount, date, description)
       VALUES (?, 'Fuel', ?, ?, ?)`,
      [vehicle_id, cost, date, `Automated Fuel Expense: logged ${qty} Liters for ${vehicle.name}`]
    );

    // Logging Activity
    await conn.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Log Fuel', `Logged $${cost} fuel purchase for ${vehicle.name}. Calculated mileage: ${calculatedMileage} km/L.`]
    );

    await conn.commit();
    res.status(201).json({ 
      message: 'Fuel log successfully recorded.', 
      logId: result.insertId,
      calculatedMileage
    });

  } catch (error) {
    await conn.rollback();
    console.error('Create fuel log error:', error);
    res.status(500).json({ message: 'Failed to record fuel log.' });
  } finally {
    conn.release();
  }
};
