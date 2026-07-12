const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: ['Toll', 'Maintenance', 'Repair', 'Insurance', 'Fuel', 'Other'],
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', ExpenseSchema);
