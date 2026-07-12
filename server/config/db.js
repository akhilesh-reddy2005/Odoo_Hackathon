const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'transitops_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database Connected Successfully to:', process.env.DB_NAME || 'transitops_db');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.error('Ensure MySQL is running and credentials in server/.env are correct.');
  }
}

testConnection();

module.exports = pool;
