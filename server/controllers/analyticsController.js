const db = require('../config/db');

// Get Dashboard KPIs and Summary Lists
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Vehicle counts by status
    const [[{ total: totalVehicles }]] = await db.query('SELECT COUNT(*) as total FROM vehicles');
    const [[{ total: activeVehicles }]] = await db.query("SELECT COUNT(*) as total FROM vehicles WHERE status = 'On Trip'");
    const [[{ total: availableVehicles }]] = await db.query("SELECT COUNT(*) as total FROM vehicles WHERE status = 'Available'");
    const [[{ total: shopVehicles }]] = await db.query("SELECT COUNT(*) as total FROM vehicles WHERE status = 'In Shop'");
    
    // 2. Driver counts
    const [[{ total: activeDrivers }]] = await db.query("SELECT COUNT(*) as total FROM drivers WHERE status = 'On Trip'");
    
    // 3. Trip counts
    const [[{ total: activeTrips }]] = await db.query("SELECT COUNT(*) as total FROM trips WHERE status = 'Dispatched'");
    const [[{ total: pendingTrips }]] = await db.query("SELECT COUNT(*) as total FROM trips WHERE status = 'Draft'");
    
    // 4. Fleet Utilization %
    const utilizationRate = totalVehicles > 0 ? parseFloat(((activeVehicles / totalVehicles) * 100).toFixed(2)) : 0;
    
    // 5. Today's Expenses
    const [[{ total: todayExpenses }]] = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = CURDATE()');
    const [[{ total: todayFuel }]] = await db.query('SELECT COALESCE(SUM(fuel_cost), 0) as total FROM fuel_logs WHERE date = CURDATE()');
    
    // 6. Recent Trips (Top 5)
    const [recentTrips] = await db.query(
      `SELECT t.*, v.name as vehicle_name, v.registration_number, d.name as driver_name
       FROM trips t
       JOIN vehicles v ON t.vehicle_id = v.id
       JOIN drivers d ON t.driver_id = d.id
       ORDER BY t.id DESC LIMIT 5`
    );

    // 7. Maintenance Alerts (Pending/In Progress tickets)
    const [maintenanceAlerts] = await db.query(
      `SELECT m.*, v.name as vehicle_name, v.registration_number
       FROM maintenance m
       JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.status IN ('Pending', 'In Progress')
       ORDER BY m.priority = 'Critical' DESC, m.id DESC LIMIT 5`
    );

    // 8. License Expiry Alerts (Expired or expiring in 30 days)
    const [licenseAlerts] = await db.query(
      `SELECT id, name, license_number, license_expiry, status
       FROM drivers
       WHERE license_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY license_expiry ASC LIMIT 5`
    );

    // 9. Vehicles status summary
    const [vehicleStatusChart] = await db.query(
      'SELECT status as name, COUNT(*) as value FROM vehicles GROUP BY status'
    );

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
      vehicleStatusChart
    });

  } catch (error) {
    console.error('Dashboard Stats error:', error);
    res.status(500).json({ message: 'Failed to retrieve dashboard metrics.' });
  }
};

// Get Analytics Charts Data (Recharts formats)
exports.getAnalyticsCharts = async (req, res) => {
  try {
    // 1. Monthly Trips Chart (Trips per month, last 6 months)
    const [monthlyTrips] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%b %Y') as name, 
              COUNT(*) as trips,
              SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status='Cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM trips
       GROUP BY DATE_FORMAT(created_at, '%b %Y'), YEAR(created_at), MONTH(created_at)
       ORDER BY YEAR(created_at) DESC, MONTH(created_at) DESC
       LIMIT 6`
    );

    // 2. Monthly Expenses Chart by category (Toll, Fuel, Maintenance, Insurance, etc.)
    const [monthlyExpenses] = await db.query(
      `SELECT DATE_FORMAT(date, '%b %Y') as month,
              SUM(CASE WHEN type='Fuel' THEN amount ELSE 0 END) as Fuel,
              SUM(CASE WHEN type='Maintenance' OR type='Repair' THEN amount ELSE 0 END) as Maintenance,
              SUM(CASE WHEN type='Toll' THEN amount ELSE 0 END) as Tolls,
              SUM(CASE WHEN type NOT IN ('Fuel', 'Maintenance', 'Repair', 'Toll') THEN amount ELSE 0 END) as Other
       FROM expenses
       GROUP BY DATE_FORMAT(date, '%b %Y'), YEAR(date), MONTH(date)
       ORDER BY YEAR(date) DESC, MONTH(date) DESC
       LIMIT 6`
    );

    // 3. Fuel Consumption Trends (liters and cost by vehicle, top 5)
    const [fuelConsumption] = await db.query(
      `SELECT v.name, SUM(f.fuel_quantity) as quantity, SUM(f.fuel_cost) as cost
       FROM fuel_logs f
       JOIN vehicles v ON f.vehicle_id = v.id
       GROUP BY v.id, v.name
       ORDER BY quantity DESC LIMIT 5`
    );

    // 4. Maintenance Costs per Vehicle (top 5 costly vehicles)
    const [costlyVehicles] = await db.query(
      `SELECT v.name, v.registration_number as reg, COALESCE(SUM(m.actual_cost), 0) as cost
       FROM maintenance m
       JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.status = 'Completed'
       GROUP BY v.id, v.name, v.registration_number
       ORDER BY cost DESC LIMIT 5`
    );

    // 5. Driver performance top standings
    const [topDrivers] = await db.query(
      `SELECT name, safety_score as safety, trip_count as trips, fuel_efficiency as efficiency
       FROM drivers
       ORDER BY safety_score DESC LIMIT 5`
    );

    // 6. Vehicle ROI Analysis: cost of acquisition vs. trip earnings and expenses
    // We estimate average earnings of $1.80 per planned distance km as trip revenue.
    const [vehicleROI] = await db.query(
      `SELECT v.name, 
              v.acquisition_cost as acquisition,
              COALESCE(SUM(e.amount), 0) as total_expenses,
              COALESCE(SUM(t.planned_distance * 1.80), 0) as estimated_revenue
       FROM vehicles v
       LEFT JOIN expenses e ON v.id = e.vehicle_id
       LEFT JOIN trips t ON v.id = t.vehicle_id AND t.status = 'Completed'
       GROUP BY v.id, v.name, v.acquisition_cost
       LIMIT 6`
    );

    // Formats ROI
    const formattedROI = vehicleROI.map(item => {
      const expenses = parseFloat(item.total_expenses);
      const revenue = parseFloat(item.estimated_revenue);
      const netProfit = revenue - expenses;
      const roiPercentage = item.acquisition > 0 ? parseFloat(((netProfit / item.acquisition) * 100).toFixed(2)) : 0;
      return {
        name: item.name,
        acquisition: parseFloat(item.acquisition),
        expenses,
        revenue,
        roi: roiPercentage
      };
    });

    res.json({
      monthlyTrips: monthlyTrips.reverse(),
      monthlyExpenses: monthlyExpenses.reverse(),
      fuelConsumption,
      costlyVehicles,
      topDrivers,
      vehicleROI: formattedROI
    });

  } catch (error) {
    console.error('Analytics charts error:', error);
    res.status(500).json({ message: 'Error retrieving analytics data.' });
  }
};
