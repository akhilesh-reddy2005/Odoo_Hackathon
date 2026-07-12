const mongoose = require('mongoose');

const FuelLogSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  fuel_quantity: {
    type: Number, // Liters
    required: true
  },
  fuel_cost: {
    type: Number, // USD
    required: true
  },
  odometer: {
    type: Number, // km
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FuelLog', FuelLogSchema);
