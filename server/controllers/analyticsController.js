const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Maintenance = require('../models/Maintenance');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');

// Get Dashboard KPIs and Summary Lists
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Vehicle status counts
    const totalVehicles = await Vehicle.countDocuments({});
    const activeVehicles = await Vehicle.countDocuments({ status: 'On Trip' });
    const availableVehicles = await Vehicle.countDocuments({ status: 'Available' });
    const shopVehicles = await Vehicle.countDocuments({ status: 'In Shop' });

    // 2. Driver counts
    const activeDrivers = await Driver.countDocuments({ status: 'On Trip' });

    // 3. Trip counts
    const activeTrips = await Trip.countDocuments({ status: 'Dispatched' });
    const pendingTrips = await Trip.countDocuments({ status: 'Draft' });

    // 4. Fleet Utilization %
    const utilizationRate = totalVehicles > 0 ? parseFloat(((activeVehicles / totalVehicles) * 100).toFixed(2)) : 0;

    // 5. Today's costs sum range
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayExpensesAgg = await Expense.aggregate([
      { $match: { date: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const todayExpenses = todayExpensesAgg.length > 0 ? todayExpensesAgg[0].total : 0;

    const todayFuelAgg = await FuelLog.aggregate([
      { $match: { date: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, total: { $sum: "$fuel_cost" } } }
    ]);
    const todayFuel = todayFuelAgg.length > 0 ? todayFuelAgg[0].total : 0;

    // 6. Recent Trips (Top 5)
    const recentTripsRaw = await Trip.find({})
      .populate('vehicle')
      .populate('driver')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentTrips = recentTripsRaw.map(t => ({
      id: t._id,
      source: t.source,
      destination: t.destination,
      planned_distance: t.planned_distance,
      cargo_weight: t.cargo_weight,
      status: t.status,
      vehicle_name: t.vehicle ? t.vehicle.name : 'Unknown',
      registration_number: t.vehicle ? t.vehicle.registration_number : '',
      driver_name: t.driver ? t.driver.name : 'Unknown'
    }));

    // 7. Maintenance Alerts (Pending/In Progress tickets)
    const maintRaw = await Maintenance.find({ status: { $in: ['Pending', 'In Progress'] } })
      .populate('vehicle')
      .sort({ priority: 1, createdAt: -1 }) // Custom ordering priorities handled in JS
      .limit(5);

    const maintenanceAlerts = maintRaw.map(m => ({
      id: m._id,
      issue: m.issue,
      description: m.description,
      priority: m.priority,
      estimated_cost: m.estimated_cost,
      status: m.status,
      vehicle_name: m.vehicle ? m.vehicle.name : 'Unknown',
      registration_number: m.vehicle ? m.vehicle.registration_number : ''
    }));

    // 8. License Expiry Alerts (Expired or expiring in 30 days)
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + 30);

    const licenseAlertsRaw = await Driver.find({ license_expiry: { $lte: expiryThreshold } })
      .sort({ license_expiry: 1 })
      .limit(5);

    const licenseAlerts = licenseAlertsRaw.map(d => ({
      id: d._id,
      name: d.name,
      license_number: d.license_number,
      license_expiry: d.license_expiry.toISOString().split('T')[0],
      status: d.status
    }));

    // 9. Vehicles status summary chart formats
    const statusChartAgg = await Vehicle.aggregate([
      { $group: { _id: "$status", value: { $sum: 1 } } }
    ]);
    const vehicleStatusChart = statusChartAgg.map(item => ({
      name: item._id,
      value: item.value
    }));

    // 10. Fetch notifications list
    const notifications = await Notification.find({}).sort({ created_at: -1 }).limit(10);

    res.json({
      kpis: {
        activeVehicles,
        availableVehicles,
        inMaintenance: shopVehicles,
        driversOnDuty: activeDrivers,
        activeTrips,
        pendingTrips,
        fleetUtilization: utilizationRate,
        todayExpenses: parseFloat(todayExpenses),
        todayFuelCost: parseFloat(todayFuel)
      },
      recentTrips,
      maintenanceAlerts,
      licenseAlerts,
      vehicleStatusChart,
      notifications
    });

  } catch (error) {
    console.error('Dashboard Stats error:', error);
    res.status(500).json({ message: 'Failed to retrieve dashboard metrics.' });
  }
};

// Get Analytics Charts Data (Recharts format pipelines)
exports.getAnalyticsCharts = async (req, res) => {
  try {
    // 1. Monthly Trips Chart
    const monthlyTripsAgg = await Trip.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%b %Y", date: "$createdAt" } },
          trips: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
          minDate: { $min: "$createdAt" }
        }
      },
      { $sort: { minDate: 1 } },
      { $project: { _id: 0, name: "$_id", trips: 1, completed: 1, cancelled: 1 } },
      { $limit: 6 }
    ]);

    // 2. Monthly Expenses Stacked Chart
    const monthlyExpensesAgg = await Expense.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%b %Y", date: "$date" } },
          Fuel: { $sum: { $cond: [{ $eq: ["$type", "Fuel"] }, "$amount", 0] } },
          Maintenance: { $sum: { $cond: [{ $in: ["$type", ["Maintenance", "Repair"]] }, "$amount", 0] } },
          Tolls: { $sum: { $cond: [{ $eq: ["$type", "Toll"] }, "$amount", 0] } },
          Other: { $sum: { $cond: [{ $not: [{ $in: ["$type", ["Fuel", "Maintenance", "Repair", "Toll"]] }] }, "$amount", 0] } },
          minDate: { $min: "$date" }
        }
      },
      { $sort: { minDate: 1 } },
      { $project: { _id: 0, month: "$_id", Fuel: 1, Maintenance: 1, Tolls: 1, Other: 1 } },
      { $limit: 6 }
    ]);

    // 3. Fuel Consumption Trends (liters and cost by vehicle, top 5)
    const fuelConsumption = await FuelLog.aggregate([
      {
        $group: {
          _id: "$vehicle",
          quantity: { $sum: "$fuel_quantity" },
          cost: { $sum: "$fuel_cost" }
        }
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "_id",
          foreignField: "_id",
          as: "vehicleInfo"
        }
      },
      { $unwind: "$vehicleInfo" },
      { $project: { _id: 0, name: "$vehicleInfo.name", quantity: 1, cost: 1 } },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    // 4. Maintenance Costs per Vehicle (top 5 costly vehicles)
    const costlyVehicles = await Maintenance.aggregate([
      { $match: { status: 'Completed' } },
      {
        $group: {
          _id: "$vehicle",
          cost: { $sum: "$actual_cost" }
        }
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "_id",
          foreignField: "_id",
          as: "vehicleInfo"
        }
      },
      { $unwind: "$vehicleInfo" },
      { $project: { _id: 0, name: "$vehicleInfo.name", reg: "$vehicleInfo.registration_number", cost: 1 } },
      { $sort: { cost: -1 } },
      { $limit: 5 }
    ]);

    // 5. Driver performance top standings
    const topDriversRaw = await Driver.find({})
      .sort({ safety_score: -1 })
      .limit(5);

    const topDrivers = topDriversRaw.map(d => ({
      name: d.name,
      safety: d.safety_score,
      trips: d.trip_count,
      efficiency: d.fuel_efficiency
    }));

    // 6. Vehicle ROI Analysis: cost of acquisition vs. trip earnings and expenses
    const vehiclesList = await Vehicle.find({}).limit(6);
    const vehicleROI = await Promise.all(vehiclesList.map(async (v) => {
      const expenseSumAgg = await Expense.aggregate([
        { $match: { vehicle: v._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      const expenses = expenseSumAgg.length > 0 ? expenseSumAgg[0].total : 0;

      const tripsDistanceAgg = await Trip.aggregate([
        { $match: { vehicle: v._id, status: 'Completed' } },
        { $group: { _id: null, total: { $sum: "$planned_distance" } } }
      ]);
      const totalDistance = tripsDistanceAgg.length > 0 ? tripsDistanceAgg[0].total : 0;
      const revenue = parseFloat((totalDistance * 1.80).toFixed(2)); // estimated $1.80 per km

      const netProfit = revenue - expenses;
      const roiPercentage = v.acquisition_cost > 0 ? parseFloat(((netProfit / v.acquisition_cost) * 100).toFixed(2)) : 0;

      return {
        name: v.name,
        acquisition: v.acquisition_cost,
        expenses,
        revenue,
        roi: roiPercentage
      };
    }));

    // 7. Most Travelled Routes
    const mostTravelledRoutes = await Trip.aggregate([
      { $match: { status: 'Completed' } },
      {
        $group: {
          _id: { source: "$source", destination: "$destination" },
          count: { $sum: 1 },
          avgDistance: { $avg: "$planned_distance" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          route: { $concat: ["$_id.source", " → ", "$_id.destination"] },
          count: 1,
          distance: { $round: ["$avgDistance", 1] }
        }
      }
    ]);

    // 8. Average distance & duration for completed trips
    const avgStats = await Trip.aggregate([
      { $match: { status: 'Completed' } },
      {
        $group: {
          _id: null,
          avgDistance: { $avg: "$planned_distance" },
          avgDuration: { $avg: "$estimatedDuration" }
        }
      }
    ]);
    const averageDistance = avgStats.length > 0 ? parseFloat((avgStats[0].avgDistance || 0).toFixed(1)) : 0;
    const averageDuration = avgStats.length > 0 ? parseFloat(((avgStats[0].avgDuration || 0) / 60).toFixed(1)) : 0; // in minutes

    // 9. Heatmap points of visited locations
    const heatmapPointsRaw = await Trip.aggregate([
      { $match: { status: { $in: ['Dispatched', 'Completed'] } } },
      {
        $project: {
          points: [
            { lat: "$sourceLocation.latitude", lng: "$sourceLocation.longitude" },
            { lat: "$destinationLocation.latitude", lng: "$destinationLocation.longitude" }
          ]
        }
      },
      { $unwind: "$points" },
      {
        $group: {
          _id: { lat: "$points.lat", lng: "$points.lng" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          lat: "$_id.lat",
          lng: "$_id.lng",
          weight: "$count"
        }
      }
    ]);

    // Clean up any 0 values (for un-geocoded or default trips)
    const heatmapPoints = heatmapPointsRaw.filter(p => p.lat !== 0 && p.lng !== 0);

    res.json({
      monthlyTrips: monthlyTripsAgg,
      monthlyExpenses: monthlyExpensesAgg,
      fuelConsumption,
      costlyVehicles,
      topDrivers,
      vehicleROI,
      mostTravelledRoutes,
      averageDistance,
      averageDuration,
      heatmapPoints
    });

  } catch (error) {
    console.error('Analytics charts error:', error);
    res.status(500).json({ message: 'Error retrieving analytics data.' });
  }
};
