-- MySQL Schema for TransitOps Transport Operations Management Platform

CREATE DATABASE IF NOT EXISTS transitops_db;
USE transitops_db;

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions TEXT NOT NULL, -- JSON string representing permission matrix
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'Active', -- Active, Inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  registration_number VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- Semi-Truck, Box Truck, Delivery Van, Utility Vehicle
  capacity DECIMAL(10,2) NOT NULL, -- Cargo capacity in kg
  current_odometer DECIMAL(12,2) NOT NULL, -- in km
  acquisition_cost DECIMAL(12,2) NOT NULL,
  purchase_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'Available', -- Available, On Trip, In Shop, Retired
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  license_category VARCHAR(10) NOT NULL, -- CDL-A, CDL-B, etc.
  license_expiry DATE NOT NULL,
  safety_score DECIMAL(5,2) DEFAULT 100.00, -- Scale 0-100
  status VARCHAR(30) DEFAULT 'Available', -- Available, On Trip, Off Duty, Suspended
  trip_count INT DEFAULT 0,
  fuel_efficiency DECIMAL(5,2) DEFAULT 0.00, -- km per Liter
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_id INT NOT NULL,
  driver_id INT NOT NULL,
  source VARCHAR(150) NOT NULL,
  destination VARCHAR(150) NOT NULL,
  cargo_weight DECIMAL(10,2) NOT NULL, -- in kg
  planned_distance DECIMAL(10,2) NOT NULL, -- in km
  status VARCHAR(30) DEFAULT 'Draft', -- Draft, Dispatched, Completed, Cancelled
  notes TEXT,
  dispatched_at DATETIME NULL,
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Maintenance Table
CREATE TABLE IF NOT EXISTS maintenance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_id INT NOT NULL,
  issue VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL, -- Low, Medium, High, Critical
  estimated_cost DECIMAL(10,2) NOT NULL,
  actual_cost DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(30) DEFAULT 'Pending', -- Pending, In Progress, Completed, Cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Fuel Logs Table
CREATE TABLE IF NOT EXISTS fuel_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_id INT NOT NULL,
  date DATE NOT NULL,
  fuel_quantity DECIMAL(10,2) NOT NULL, -- in liters
  fuel_cost DECIMAL(10,2) NOT NULL, -- total cost
  odometer DECIMAL(12,2) NOT NULL, -- odometer reading at fueling
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_id INT NULL,
  trip_id INT NULL,
  type VARCHAR(50) NOT NULL, -- Toll, Maintenance, Repair, Insurance, Fuel, Other
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'Info', -- Warning, Info, Success, Danger
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
