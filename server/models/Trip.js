const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  sourceLocation: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 }
  },
  destinationLocation: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 }
  },
  cargo_weight: {
    type: Number, // in kg
    required: true
  },
  planned_distance: {
    type: Number, // in km
    required: true
  },
  plannedDistance: {
    type: Number, // in km
    default: 0
  },
  estimatedDuration: {
    type: Number, // in seconds
    default: 0
  },
  routePolyline: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Draft', 'Dispatched', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  dispatched_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  cancelled_at: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Trip', TripSchema);
