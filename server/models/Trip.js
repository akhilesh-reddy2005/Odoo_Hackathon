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
  cargo_weight: {
    type: Number, // in kg
    required: true
  },
  planned_distance: {
    type: Number, // in km
    required: true
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
