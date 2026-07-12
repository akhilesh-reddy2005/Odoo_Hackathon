-- Seed Data for TransitOps

USE transitops_db;

-- 1. Seed Roles
INSERT INTO roles (id, name, permissions) VALUES
(1, 'Admin', '{"dashboard":true,"fleet":true,"drivers":true,"trips":true,"maintenance":true,"fuel":true,"expenses":true,"analytics":true,"settings":true}'),
(2, 'Fleet Manager', '{"dashboard":true,"fleet":true,"drivers":false,"trips":true,"maintenance":true,"fuel":true,"expenses":true,"analytics":true,"settings":false}'),
(3, 'Safety Officer', '{"dashboard":true,"fleet":false,"drivers":true,"trips":true,"maintenance":false,"fuel":false,"expenses":false,"analytics":true,"settings":false}'),
(4, 'Financial Analyst', '{"dashboard":true,"fleet":false,"drivers":false,"trips":false,"maintenance":false,"fuel":true,"expenses":true,"analytics":true,"settings":false}'),
(5, 'Driver', '{"dashboard":true,"fleet":false,"drivers":false,"trips":true,"maintenance":false,"fuel":true,"expenses":false,"analytics":false,"settings":false}');

-- 2. Seed Users (Password hash is for 'password123')
INSERT INTO users (username, email, password_hash, role_id, name, status) VALUES
('admin', 'admin@transitops.com', '$2a$10$L121tJ9p2wVf4zY9bI6mueoK3z7g9tFv4sM1zM0d4xNn2rT9KzG.u', 1, 'Alex Mercer', 'Active'),
('manager', 'manager@transitops.com', '$2a$10$L121tJ9p2wVf4zY9bI6mueoK3z7g9tFv4sM1zM0d4xNn2rT9KzG.u', 2, 'Sarah Jenkins', 'Active'),
('safety', 'safety@transitops.com', '$2a$10$L121tJ9p2wVf4zY9bI6mueoK3z7g9tFv4sM1zM0d4xNn2rT9KzG.u', 3, 'David Miller', 'Active'),
('finance', 'finance@transitops.com', '$2a$10$L121tJ9p2wVf4zY9bI6mueoK3z7g9tFv4sM1zM0d4xNn2rT9KzG.u', 4, 'Robert Chen', 'Active'),
('driver_john', 'john.doe@transitops.com', '$2a$10$L121tJ9p2wVf4zY9bI6mueoK3z7g9tFv4sM1zM0d4xNn2rT9KzG.u', 5, 'John Doe', 'Active');

-- 3. Seed Vehicles
INSERT INTO vehicles (registration_number, name, model, type, capacity, current_odometer, acquisition_cost, purchase_date, status) VALUES
('TX-892-APP', 'Volvo VNL 860', 'Volvo 2022', 'Semi-Truck', 36000.00, 125430.20, 145000.00, '2022-03-15', 'Available'),
('CA-401-TRK', 'Freightliner Cascadia', 'Freightliner 2021', 'Semi-Truck', 38000.00, 240150.50, 138000.00, '2021-06-20', 'On Trip'),
('NY-772-VAN', 'Ford Transit 350 Cargo', 'Ford 2023', 'Delivery Van', 2000.00, 15420.00, 48000.00, '2023-01-10', 'Available'),
('FL-109-BOX', 'Isuzu NPR-HD', 'Isuzu 2020', 'Box Truck', 6500.00, 89100.80, 72000.00, '2020-11-05', 'In Shop'),
('WA-551-RET', 'Peterbilt 389', 'Peterbilt 2015', 'Semi-Truck', 35000.00, 850400.00, 160000.00, '2015-04-18', 'Retired'),
('IL-884-APP', 'Kenworth T680', 'Kenworth 2023', 'Semi-Truck', 37000.00, 45200.00, 155000.00, '2023-05-12', 'Available');

-- 4. Seed Drivers
INSERT INTO drivers (name, phone, license_number, license_category, license_expiry, safety_score, status, trip_count, fuel_efficiency) VALUES
('John Doe', '+1-555-0199', 'DL-TEX-8921A', 'CDL-A', '2027-08-14', 96.50, 'Available', 24, 3.80),
('Jane Smith', '+1-555-0245', 'DL-CAL-3021B', 'CDL-A', '2028-11-22', 98.20, 'On Trip', 38, 4.10),
('Robert Johnson', '+1-555-0371', 'DL-NY-7712C', 'CDL-B', '2026-05-01', 88.00, 'Available', 12, 5.20), -- License Expired (relative to current date 2026-07-12)
('Michael Brown', '+1-555-0489', 'DL-FL-4009D', 'CDL-A', '2027-04-10', 72.40, 'Suspended', 18, 3.50), -- Suspended
('Emily Davis', '+1-555-0512', 'DL-WA-5503E', 'CDL-A', '2029-01-15', 94.80, 'Available', 8, 3.90);

-- 5. Seed Trips
INSERT INTO trips (vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, status, notes, dispatched_at, completed_at) VALUES
(1, 1, 'Dallas, TX', 'Houston, TX', 18000.00, 390.00, 'Completed', 'Standard dry van shipment.', '2026-07-08 08:00:00', '2026-07-08 14:30:00'),
(2, 2, 'Los Angeles, CA', 'Phoenix, AZ', 22000.00, 598.00, 'Dispatched', 'Refrigerated cargo, temp set to -18C.', '2026-07-11 06:00:00', NULL),
(3, 5, 'Seattle, WA', 'Portland, OR', 1200.00, 280.00, 'Completed', 'Last-mile electronic parts delivery.', '2026-07-10 09:00:00', '2026-07-10 13:45:00'),
(1, 1, 'Dallas, TX', 'Austin, TX', 15000.00, 310.00, 'Draft', 'Pending final customer invoice confirmation.', NULL, NULL);

-- 6. Seed Maintenance Logs
INSERT INTO maintenance (vehicle_id, issue, description, priority, estimated_cost, actual_cost, status) VALUES
(4, 'Engine Misfire', 'Cylinder 3 misfire detected. Replacing spark plugs and coil pack.', 'High', 850.00, 0.00, 'In Progress'),
(1, 'Scheduled 50k Inspection', 'Oil change, filter replacements, brake pad inspection.', 'Low', 350.00, 350.00, 'Completed'),
(2, 'Cooling System Leak', 'Radiator hose replacement and coolant flush.', 'Medium', 450.00, 480.00, 'Completed'),
(3, 'Tire Replacement', 'Replace rear left worn tire.', 'Medium', 200.00, 0.00, 'Pending');

-- 7. Seed Fuel Logs
INSERT INTO fuel_logs (vehicle_id, date, fuel_quantity, fuel_cost, odometer) VALUES
(1, '2026-07-05', 120.00, 480.00, 124800.00),
(1, '2026-07-08', 110.00, 451.00, 125190.00),
(2, '2026-07-04', 280.00, 1148.00, 239200.00),
(2, '2026-07-09', 270.00, 1107.00, 240100.00),
(3, '2026-07-10', 45.00, 184.50, 15400.00);

-- 8. Seed Expenses
INSERT INTO expenses (vehicle_id, trip_id, type, amount, date, description) VALUES
(1, 1, 'Toll', 45.00, '2026-07-08', 'I-45 Toll road fees'),
(3, 3, 'Toll', 12.00, '2026-07-10', 'Express lane toll'),
(1, NULL, 'Maintenance', 350.00, '2026-07-05', 'Completed Scheduled 50k Inspection'),
(2, NULL, 'Maintenance', 480.00, '2026-07-09', 'Cooling system leak repair'),
(1, NULL, 'Fuel', 480.00, '2026-07-05', 'Fuel purchase - 120L'),
(1, NULL, 'Fuel', 451.00, '2026-07-08', 'Fuel purchase - 110L'),
(2, NULL, 'Fuel', 1148.00, '2026-07-04', 'Fuel purchase - 280L'),
(2, NULL, 'Fuel', 1107.00, '2026-07-09', 'Fuel purchase - 270L'),
(3, NULL, 'Fuel', 184.50, '2026-07-10', 'Fuel purchase - 45L');

-- 9. Seed Notifications
INSERT INTO notifications (title, message, type, is_read) VALUES
('Expired License Alert', 'Driver Robert Johnson license expired on 2026-05-01. Please update license before assigning trips.', 'Danger', 0),
('Vehicle In Shop', 'Vehicle FL-109-BOX status changed to In Shop for repairs.', 'Info', 0),
('Driver Suspended', 'Safety Officer updated Michael Brown status to Suspended due to safety score drop.', 'Warning', 0),
('High Maintenance Cost Alert', 'Vehicle CA-401-TRK has accumulated over $2,000 in repair costs this month.', 'Warning', 0);

-- 10. Seed Activity Logs
INSERT INTO activity_logs (user_id, action, details) VALUES
(1, 'Database Seeded', 'Initial seed data successfully inserted for roles, users, and core entities.'),
(2, 'Trip Dispatched', 'Dispatched Trip ID 2 with Driver Jane Smith on Freightliner Cascadia.'),
(3, 'Driver Suspended', 'Changed Michael Brown status to Suspended due to compliance issue.');
