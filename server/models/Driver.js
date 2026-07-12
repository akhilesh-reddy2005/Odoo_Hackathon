const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  license_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  license_category: {
    type: String,
    required: true,
    trim: true
  },
  license_expiry: {
    type: Date,
    required: true
  },
  safety_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 100.00
  },
  status: {
    type: String,
    enum: ['Available', 'On Trip', 'Off Duty', 'Suspended'],
    default: 'Available'
  },
  trip_count: {
    type: Number,
    default: 0
  },
  fuel_efficiency: {
    type: Number, // km per Liter
    default: 0.00
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Driver', DriverSchema);
