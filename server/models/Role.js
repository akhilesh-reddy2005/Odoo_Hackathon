const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  permissions: {
    dashboard: { type: Boolean, default: false },
    fleet: { type: Boolean, default: false },
    drivers: { type: Boolean, default: false },
    trips: { type: Boolean, default: false },
    maintenance: { type: Boolean, default: false },
    fuel: { type: Boolean, default: false },
    expenses: { type: Boolean, default: false },
    analytics: { type: Boolean, default: false },
    settings: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', RoleSchema);
