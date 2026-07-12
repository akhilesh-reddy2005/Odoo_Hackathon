const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  registration_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Semi-Truck', 'Box Truck', 'Delivery Van', 'Utility Vehicle'],
    trim: true
  },
  capacity: {
    type: Number, // Cargo capacity in kg
    required: true
  },
  current_odometer: {
    type: Number, // in km
    required: true,
    default: 0
  },
  acquisition_cost: {
    type: Number,
    required: true
  },
  purchase_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'On Trip', 'In Shop', 'Retired'],
    default: 'Available'
  },
  currentLocation: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 }
  },
  lastKnownLocation: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', VehicleSchema);
