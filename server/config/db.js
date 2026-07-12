const mongoose = require('mongoose');
require('dotenv').config();

// Enable virtuals globally for both toObject and toJSON so that 'id' is mapped from '_id'
mongoose.plugin((schema) => {
  schema.set('toObject', { virtuals: true });
  schema.set('toJSON', { virtuals: true });
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/transitops_db';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully to:', mongoose.connection.name);
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    console.error('Ensure MongoDB server is running and MONGO_URI in server/.env is correct.');
  });

module.exports = mongoose.connection;
