const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const ActivityLog = require('../models/ActivityLog');

// Fetch all expenses with filters and pagination
exports.getAllExpenses = async (req, res) => {
  try {
    const { type, vehicle_id, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filterQuery = {};

    if (type && type !== 'All') {
      filterQuery.type = type;
    }

    if (vehicle_id && vehicle_id !== 'All') {
      filterQuery.vehicle = vehicle_id;
    }

    // populated lookups
    const expenses = await Expense.find(filterQuery)
      .populate('vehicle')
      .populate('trip')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(filterQuery);

    const formattedExpenses = expenses.map(exp => {
      const obj = exp.toObject();
      obj.vehicle_name = exp.vehicle ? exp.vehicle.name : '';
      obj.vehicle_reg = exp.vehicle ? exp.vehicle.registration_number : '';
      obj.source = exp.trip ? exp.trip.source : '';
      obj.destination = exp.trip ? exp.trip.destination : '';
      return obj;
    });

    res.json({
      expenses: formattedExpenses,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Error retrieving expenses.' });
  }
};

// Create a manual expense log
exports.createExpense = async (req, res) => {
  const { vehicle_id, trip_id, type, amount, date, description } = req.body;

  if (!type || !amount || !date) {
    return res.status(400).json({ message: 'Type, amount, and date are required fields.' });
  }

  try {
    const newExpense = await Expense.create({
      vehicle: vehicle_id || null,
      trip: trip_id || null,
      type,
      amount: parseFloat(amount),
      date,
      description: description || ''
    });

    // Logging Activity
    await ActivityLog.create({
      user: req.user.id,
      action: 'Log Expense',
      details: `Recorded expense of type: ${type} worth $${amount}.`
    });

    res.status(201).json({ message: 'Expense logged successfully.', expenseId: newExpense._id });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Failed to record expense.' });
  }
};
