const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');
const ActivityLog = require('../models/ActivityLog');

// Get all maintenance requests
exports.getAllMaintenance = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filterQuery = {};

    if (status && status !== 'All') {
      filterQuery.status = status;
    }

    if (priority && priority !== 'All') {
      filterQuery.priority = priority;
    }

    // populated lookups
    let logs = await Maintenance.find(filterQuery)
      .populate('vehicle')
      .sort({ createdAt: -1 });

    // Client-side search matching population refs
    if (search && search.trim() !== '') {
      const regex = new RegExp(search, 'i');
      logs = logs.filter(log => 
        regex.test(log.issue) ||
        regex.test(log.description) ||
        (log.vehicle && regex.test(log.vehicle.name))
      );
    }

    const total = logs.length;
    const paginatedLogs = logs.slice(skip, skip + parseInt(limit));

    // Format structure matching client requirements
    const formattedLogs = paginatedLogs.map(log => {
      const obj = log.toObject();
      obj.vehicle_name = log.vehicle ? log.vehicle.name : 'Unknown';
      obj.vehicle_reg = log.vehicle ? log.vehicle.registration_number : '';
      obj.vehicle_status = log.vehicle ? log.vehicle.status : 'Unknown';
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
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ message: 'Cannot place vehicle in maintenance while it is dispatched on a trip.' });
    }

    const newLog = await Maintenance.create({
      vehicle: vehicle_id,
      issue,
      description: description || '',
      priority,
      estimated_cost: parseFloat(estimated_cost),
      status: 'Pending'
    });

    res.status(201).json({ message: 'Maintenance ticket created.', requestId: newLog._id });

  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({ message: 'Failed to create maintenance record.' });
  }
};

// Update maintenance status (enforcing transitions and business rules)
exports.updateRequest = async (req, res) => {
  const { id } = req.params;
  const { status, actual_cost, priority, issue, description } = req.body;

  try {
    const ticket = await Maintenance.findById(id).populate('vehicle');
    if (!ticket) {
      return res.status(404).json({ message: 'Maintenance ticket not found.' });
    }
    const vehicleId = ticket.vehicle._id;
    const vehicleName = ticket.vehicle.name;

    // Handle updates of properties
    let newPriority = priority || ticket.priority;
    let newIssue = issue || ticket.issue;
    let newDescription = description !== undefined ? description : ticket.description;
    let newCost = actual_cost !== undefined ? parseFloat(actual_cost) : ticket.actual_cost;

    // Business Logic transitions:
    if (status && status !== ticket.status) {
      if (status === 'In Progress') {
        // Put vehicle in shop
        await Vehicle.findByIdAndUpdate(vehicleId, { status: 'In Shop' });
      } else if (status === 'Completed') {
        if (newCost <= 0) {
          return res.status(400).json({ message: 'Actual cost must be specified to complete maintenance.' });
        }
        // Restore vehicle to Available
        await Vehicle.findByIdAndUpdate(vehicleId, { status: 'Available' });
        
        // Log Expense
        await Expense.create({
          vehicle: vehicleId,
          type: 'Maintenance',
          amount: newCost,
          date: new Date(),
          description: `Completed maintenance ID: ${id} for ${vehicleName}. Issue: ${newIssue}`
        });
      } else if (status === 'Cancelled') {
        if (ticket.status === 'In Progress') {
          await Vehicle.findByIdAndUpdate(vehicleId, { status: 'Available' });
        }
      }
    }

    // Update tickets
    await Maintenance.findByIdAndUpdate(id, {
      status: status || ticket.status,
      actual_cost: newCost,
      priority: newPriority,
      issue: newIssue,
      description: newDescription
    });

    // Logging activity
    if (status && status !== ticket.status) {
      await ActivityLog.create({
        user: req.user.id,
        action: 'Maintenance Update',
        details: `Ticket ID ${id} status updated to ${status}.`
      });
    }

    res.json({ message: 'Maintenance record updated successfully.' });

  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({ message: 'Failed to update maintenance record.' });
  }
};

// Delete ticket
exports.deleteRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const ticket = await Maintenance.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    if (ticket.status === 'In Progress') {
      return res.status(400).json({ message: 'Cannot delete maintenance ticket that is currently In Progress.' });
    }

    await Maintenance.findByIdAndDelete(id);
    res.json({ message: 'Maintenance record deleted.' });

  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({ message: 'Error deleting maintenance ticket.' });
  }
};
