const db = require('../config/db');

// Get all maintenance requests
exports.getAllMaintenance = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT m.*, v.name as vehicle_name, v.registration_number as vehicle_reg, v.status as vehicle_status
      FROM maintenance m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM maintenance m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (status && status !== 'All') {
      query += ' AND m.status = ?';
      countQuery += ' AND m.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (priority && priority !== 'All') {
      query += ' AND m.priority = ?';
      countQuery += ' AND m.priority = ?';
      params.push(priority);
      countParams.push(priority);
    }

    if (search && search.trim() !== '') {
      const pattern = `%${search}%`;
      query += ' AND (m.issue LIKE ? OR m.description LIKE ? OR v.name LIKE ?)';
      countQuery += ' AND (m.issue LIKE ? OR m.description LIKE ? OR v.name LIKE ?)';
      params.push(pattern, pattern, pattern);
      countParams.push(pattern, pattern, pattern);
    }

    query += ' ORDER BY m.id DESC LIMIT ? OFFSET ?';
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
    console.error('Get maintenance logs error:', error);
    res.status(500).json({ message: 'Error retrieving maintenance logs.' });
  }
};

// Create a maintenance request (Status starts at Pending)
exports.createRequest = async (req, res) => {
  const { vehicle_id, issue, description, priority, estimated_cost } = req.body;

  if (!vehicle_id || !issue || !priority || !estimated_cost) {
    return res.status(400).json({ message: 'Required fields missing for maintenance log.' });
  }

  try {
    const [vehicles] = await db.query('SELECT status FROM vehicles WHERE id = ?', [vehicle_id]);
    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    if (vehicles[0].status === 'On Trip') {
      return res.status(400).json({ message: 'Cannot place vehicle in maintenance while it is dispatched on a trip.' });
    }

    const [result] = await db.query(
      `INSERT INTO maintenance (vehicle_id, issue, description, priority, estimated_cost, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [vehicle_id, issue, description || '', priority, parseFloat(estimated_cost)]
    );

    res.status(201).json({ message: 'Maintenance ticket created.', requestId: result.insertId });

  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({ message: 'Failed to create maintenance record.' });
  }
};

// Update maintenance status (enforcing transitions and business rules)
exports.updateRequest = async (req, res) => {
  const { id } = req.params;
  const { status, actual_cost, priority, issue, description } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [tickets] = await conn.query('SELECT * FROM maintenance WHERE id = ?', [id]);
    if (tickets.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Maintenance ticket not found.' });
    }
    const ticket = tickets[0];
    const vehicleId = ticket.vehicle_id;

    // Fetch vehicle
    const [vehicles] = await conn.query('SELECT name FROM vehicles WHERE id = ?', [vehicleId]);
    const vehicleName = vehicles[0]?.name;

    // Handle updates of textual properties
    let newPriority = priority || ticket.priority;
    let newIssue = issue || ticket.issue;
    let newDescription = description !== undefined ? description : ticket.description;
    let newCost = actual_cost !== undefined ? parseFloat(actual_cost) : ticket.actual_cost;

    // Business Logic transitions:
    if (status && status !== ticket.status) {
      if (status === 'In Progress') {
        // Automatically put vehicle in shop
        await conn.query("UPDATE vehicles SET status = 'In Shop' WHERE id = ?", [vehicleId]);
      } else if (status === 'Completed') {
        // Verify cost is provided
        if (newCost <= 0) {
          await conn.rollback();
          return res.status(400).json({ message: 'Actual cost must be specified to complete maintenance.' });
        }
        // Automatically restore vehicle status to Available
        await conn.query("UPDATE vehicles SET status = 'Available' WHERE id = ?", [vehicleId]);
        
        // Log Expense
        await conn.query(
          `INSERT INTO expenses (vehicle_id, type, amount, date, description)
           VALUES (?, 'Maintenance', ?, CURDATE(), ?)`,
          [vehicleId, newCost, `Completed maintenance ID: ${id} for ${vehicleName}. Issue: ${newIssue}`]
        );
      } else if (status === 'Cancelled') {
        // If it was in progress, set vehicle back to Available
        if (ticket.status === 'In Progress') {
          await conn.query("UPDATE vehicles SET status = 'Available' WHERE id = ?", [vehicleId]);
        }
      }
    }

    // Update tickets
    await conn.query(
      `UPDATE maintenance 
       SET status = ?, actual_cost = ?, priority = ?, issue = ?, description = ? 
       WHERE id = ?`,
      [status || ticket.status, newCost, newPriority, newIssue, newDescription, id]
    );

    // Logging activity
    if (status && status !== ticket.status) {
      await conn.query(
        'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
        [req.user.id, 'Maintenance Update', `Ticket ID ${id} status updated to ${status}.`]
      );
    }

    await conn.commit();
    res.json({ message: 'Maintenance record updated successfully.' });

  } catch (error) {
    await conn.rollback();
    console.error('Update maintenance error:', error);
    res.status(500).json({ message: 'Failed to update maintenance record.' });
  } finally {
    conn.release();
  }
};

// Delete ticket
exports.deleteRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const [tickets] = await db.query('SELECT status FROM maintenance WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    if (tickets[0].status === 'In Progress') {
      return res.status(400).json({ message: 'Cannot delete maintenance ticket that is currently In Progress.' });
    }

    await db.query('DELETE FROM maintenance WHERE id = ?', [id]);
    res.json({ message: 'Maintenance record deleted.' });

  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({ message: 'Error deleting maintenance ticket.' });
  }
};
