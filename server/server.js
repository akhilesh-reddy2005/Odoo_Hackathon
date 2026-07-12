const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/db');

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for testing/development simplicity
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const tripRoutes = require('./routes/tripRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const fuelRoutes = require('./routes/fuelRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const mapRoutes = require('./routes/mapRoutes');

// API Mount Points
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/maps', mapRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TransitOps API Service',
    version: '1.0.0',
    status: 'Healthy',
    timestamp: new Date()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Import Simulation Service
const { startSimulation } = require('./services/simulation.service');

// Start Server
app.listen(PORT, () => {
  console.log(`TransitOps Backend Running on port: ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
  
  // Start simulation background task
  startSimulation();
});
