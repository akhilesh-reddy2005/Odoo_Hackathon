const db = require('../config/db');

// Fetch all expenses with filters and pagination
exports.getAllExpenses = async (req, res) => {
  try {
    const { type, vehicle_id, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT e.*, v.name as vehicle_name, v.registration_number as vehicle_reg, t.source, t.destination
      FROM expenses e
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      LEFT JOIN trips t ON e.trip_id = t.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM expenses e WHERE 1=1';
    const params = [];
    const countParams = [];

    if (type && type !== 'All') {
      query += ' AND e.type = ?';
      countQuery += ' AND e.type = ?';
      params.push(type);
      countParams.push(type);
    }

    if (vehicle_id && vehicle_id !== 'All') {
      query += ' AND e.vehicle_id = ?';
      countQuery += ' AND e.vehicle_id = ?';
      params.push(vehicle_id);
      countParams.push(vehicle_id);
    }

    query += ' ORDER BY e.date DESC, e.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [expenses] = await db.query(query, params);
    const [[{ total }]] = await db.query(countQuery, countParams);

    res.json({
      expenses,
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
    const [result] = await db.query(
      `INSERT INTO expenses (vehicle_id, trip_id, type, amount, date, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [vehicle_id || null, trip_id || null, type, parseFloat(amount), date, description || '']
    );

    // Logging Activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Log Expense', `Recorded expense of type: ${type} worth $${amount}.`]
    );

    res.status(201).json({ message: 'Expense logged successfully.', expenseId: result.insertId });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Failed to record expense.' });
  }
};
