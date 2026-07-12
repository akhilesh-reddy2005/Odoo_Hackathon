const FuelLog = require('../models/FuelLog');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const ActivityLog = require('../models/ActivityLog');

// Retrieve all fuel logs
exports.getAllFuelLogs = async (req, res) => {
  try {
    const { vehicle_id, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filterQuery = {};
    if (vehicle_id && vehicle_id !== 'All') {
      filterQuery.vehicle = vehicle_id;
    }

    const logs = await FuelLog.find(filterQuery)
      .populate('vehicle')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FuelLog.countDocuments(filterQuery);

    const formattedLogs = logs.map(log => {
      const obj = log.toObject();
      obj.vehicle_name = log.vehicle ? log.vehicle.name : 'Unknown';
      obj.vehicle_reg = log.vehicle ? log.vehicle.registration_number : '';
      return obj;
    });

    res.json({
      logs: formattedLogs,
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

  try {
    // 1. Fetch Vehicle
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    const currentOdo = parseFloat(odometer);
    const qty = parseFloat(fuel_quantity);
    const cost = parseFloat(fuel_cost);

    // 2. Fetch the previous fuel log to calculate mileage
    const prevLog = await FuelLog.findOne({ vehicle: vehicle_id, odometer: { $lt: currentOdo } })
      .sort({ odometer: -1 });

    let calculatedMileage = 0.00;
    if (prevLog) {
      const prevOdo = parseFloat(prevLog.odometer);
      const distanceTravelled = currentOdo - prevOdo;
      if (distanceTravelled > 0 && qty > 0) {
        calculatedMileage = parseFloat((distanceTravelled / qty).toFixed(2));
      }
    } else {
      calculatedMileage = 4.0; // Default fallback
    }

    // 3. Insert fuel log
    const newLog = await FuelLog.create({
      vehicle: vehicle_id,
      date,
      fuel_quantity: qty,
      fuel_cost: cost,
      odometer: currentOdo
    });

    // 4. Update vehicle's odometer
    vehicle.current_odometer = currentOdo;
    await vehicle.save();

    // 5. Update vehicle's average mileage (average of last 5 fuel logs)
    const lastLogs = await FuelLog.find({ vehicle: vehicle_id })
      .sort({ odometer: -1 })
      .limit(5);

    if (lastLogs.length > 1) {
      const newestOdo = parseFloat(lastLogs[0].odometer);
      const oldestOdo = parseFloat(lastLogs[lastLogs.length - 1].odometer);
      const totalDist = newestOdo - oldestOdo;
      
      let totalFuel = 0;
      for (let i = 0; i < lastLogs.length - 1; i++) {
        totalFuel += parseFloat(lastLogs[i].fuel_quantity);
      }

      if (totalDist > 0 && totalFuel > 0) {
        const avgEff = parseFloat((totalDist / totalFuel).toFixed(2));
        
        // Find if driver is currently assigned to update their average fuel efficiency
        const activeTrip = await Trip.findOne({ vehicle: vehicle_id, status: 'Dispatched' });
        if (activeTrip) {
          await Driver.findByIdAndUpdate(activeTrip.driver, { fuel_efficiency: avgEff });
        }
      }
    }

    // 6. Log Expense entry
    await Expense.create({
      vehicle: vehicle_id,
      type: 'Fuel',
      amount: cost,
      date,
      description: `Automated Fuel Expense: logged ${qty} Liters for ${vehicle.name}`
    });

    // Logging Activity
    await ActivityLog.create({
      user: req.user.id,
      action: 'Log Fuel',
      details: `Logged $${cost} fuel purchase for ${vehicle.name}. Calculated mileage: ${calculatedMileage} km/L.`
    });

    res.status(201).json({ 
      message: 'Fuel log successfully recorded.', 
      logId: newLog._id,
      calculatedMileage
    });

  } catch (error) {
    console.error('Create fuel log error:', error);
    res.status(500).json({ message: 'Failed to record fuel log.' });
  }
};
