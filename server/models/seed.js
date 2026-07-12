const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' });

// Models
const Role = require('./Role');
const User = require('./User');
const Vehicle = require('./Vehicle');
const Driver = require('./Driver');
const Trip = require('./Trip');
const Maintenance = require('./Maintenance');
const FuelLog = require('./FuelLog');
const Expense = require('./Expense');
const Notification = require('./Notification');
const ActivityLog = require('./ActivityLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/transitops_db';

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected! Cleaning existing collections...');

    // Wipe previous data
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      Trip.deleteMany({}),
      Maintenance.deleteMany({}),
      FuelLog.deleteMany({}),
      Expense.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({})
    ]);
    console.log('Database cleared.');

    // 1. Seed Roles
    const roles = await Role.insertMany([
      {
        name: 'Admin',
        permissions: { dashboard: true, fleet: true, drivers: true, trips: true, maintenance: true, fuel: true, expenses: true, analytics: true, settings: true }
      },
      {
        name: 'Fleet Manager',
        permissions: { dashboard: true, fleet: true, drivers: false, trips: true, maintenance: true, fuel: true, expenses: true, analytics: true, settings: false }
      },
      {
        name: 'Safety Officer',
        permissions: { dashboard: true, fleet: false, drivers: true, trips: true, maintenance: false, fuel: false, expenses: false, analytics: true, settings: false }
      },
      {
        name: 'Financial Analyst',
        permissions: { dashboard: true, fleet: false, drivers: false, trips: false, maintenance: false, fuel: true, expenses: true, analytics: true, settings: false }
      },
      {
        name: 'Driver',
        permissions: { dashboard: true, fleet: false, drivers: false, trips: true, maintenance: false, fuel: true, expenses: false, analytics: false, settings: false }
      }
    ]);
    console.log('Roles seeded.');

    // Find role IDs
    const adminRole = roles.find(r => r.name === 'Admin')._id;
    const managerRole = roles.find(r => r.name === 'Fleet Manager')._id;
    const safetyRole = roles.find(r => r.name === 'Safety Officer')._id;
    const financeRole = roles.find(r => r.name === 'Financial Analyst')._id;
    const driverRole = roles.find(r => r.name === 'Driver')._id;

    // 2. Seed Users (Password hash generated dynamically)
    const passwordHash = await bcrypt.hash('password123', 10);
    const users = await User.insertMany([
      { username: 'admin', email: 'admin@transitops.com', password_hash: passwordHash, role: adminRole, name: 'Alex Mercer', status: 'Active' },
      { username: 'manager', email: 'manager@transitops.com', password_hash: passwordHash, role: managerRole, name: 'Sarah Jenkins', status: 'Active' },
      { username: 'safety', email: 'safety@transitops.com', password_hash: passwordHash, role: safetyRole, name: 'David Miller', status: 'Active' },
      { username: 'finance', email: 'finance@transitops.com', password_hash: passwordHash, role: financeRole, name: 'Robert Chen', status: 'Active' },
      { username: 'driver_john', email: 'john.doe@transitops.com', password_hash: passwordHash, role: driverRole, name: 'John Doe', status: 'Active' }
    ]);
    console.log('Users seeded.');

    const adminUserId = users.find(u => u.username === 'admin')._id;

    // 3. Seed Vehicles
    const vehicles = await Vehicle.insertMany([
      { 
        registration_number: 'TX-892-APP', name: 'Volvo VNL 860', model: 'Volvo 2022', type: 'Semi-Truck', capacity: 36000, current_odometer: 125430.2, acquisition_cost: 145000, purchase_date: new Date('2022-03-15'), status: 'Available',
        currentLocation: { latitude: 32.7767, longitude: -96.7970 }, // Dallas, TX
        lastKnownLocation: { latitude: 32.7767, longitude: -96.7970 }
      },
      { 
        registration_number: 'CA-401-TRK', name: 'Freightliner Cascadia', model: 'Freightliner 2021', type: 'Semi-Truck', capacity: 38000, current_odometer: 240150.5, acquisition_cost: 138000, purchase_date: new Date('2021-06-20'), status: 'On Trip',
        currentLocation: { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles, CA
        lastKnownLocation: { latitude: 34.0522, longitude: -118.2437 }
      },
      { 
        registration_number: 'NY-772-VAN', name: 'Ford Transit 350 Cargo', model: 'Ford 2023', type: 'Delivery Van', capacity: 2000, current_odometer: 15420, acquisition_cost: 48000, purchase_date: new Date('2023-01-10'), status: 'Available',
        currentLocation: { latitude: 47.6062, longitude: -122.3321 }, // Seattle, WA
        lastKnownLocation: { latitude: 47.6062, longitude: -122.3321 }
      },
      { 
        registration_number: 'FL-109-BOX', name: 'Isuzu NPR-HD', model: 'Isuzu 2020', type: 'Box Truck', capacity: 6500, current_odometer: 89100.8, acquisition_cost: 72000, purchase_date: new Date('2020-11-05'), status: 'In Shop',
        currentLocation: { latitude: 25.7617, longitude: -80.1918 }, // Miami, FL
        lastKnownLocation: { latitude: 25.7617, longitude: -80.1918 }
      },
      { 
        registration_number: 'WA-551-RET', name: 'Peterbilt 389', model: 'Peterbilt 2015', type: 'Semi-Truck', capacity: 35000, current_odometer: 850400, acquisition_cost: 160000, purchase_date: new Date('2015-04-18'), status: 'Retired',
        currentLocation: { latitude: 47.6101, longitude: -122.3421 }, // Seattle (retired)
        lastKnownLocation: { latitude: 47.6101, longitude: -122.3421 }
      },
      { 
        registration_number: 'IL-884-APP', name: 'Kenworth T680', model: 'Kenworth 2023', type: 'Semi-Truck', capacity: 37000, current_odometer: 45200, acquisition_cost: 155000, purchase_date: new Date('2023-05-12'), status: 'Available',
        currentLocation: { latitude: 41.8781, longitude: -87.6298 }, // Chicago, IL
        lastKnownLocation: { latitude: 41.8781, longitude: -87.6298 }
      }
    ]);
    console.log('Vehicles seeded.');
 
    // 4. Seed Drivers
    const drivers = await Driver.insertMany([
      { name: 'John Doe', phone: '+1-555-0199', license_number: 'DL-TEX-8921A', license_category: 'CDL-A', license_expiry: new Date('2027-08-14'), safety_score: 96.5, status: 'Available', trip_count: 24, fuel_efficiency: 3.8 },
      { name: 'Jane Smith', phone: '+1-555-0245', license_number: 'DL-CAL-3021B', license_category: 'CDL-A', license_expiry: new Date('2028-11-22'), safety_score: 98.2, status: 'On Trip', trip_count: 38, fuel_efficiency: 4.1 },
      { name: 'Robert Johnson', phone: '+1-555-0371', license_number: 'DL-NY-7712C', license_category: 'CDL-B', license_expiry: new Date('2026-05-01'), safety_score: 88.0, status: 'Available', trip_count: 12, fuel_efficiency: 5.2 },
      { name: 'Michael Brown', phone: '+1-555-0489', license_number: 'DL-FL-4009D', license_category: 'CDL-A', license_expiry: new Date('2027-04-10'), safety_score: 72.4, status: 'Suspended', trip_count: 18, fuel_efficiency: 3.5 },
      { name: 'Emily Davis', phone: '+1-555-0512', license_number: 'DL-WA-5503E', license_category: 'CDL-A', license_expiry: new Date('2029-01-15'), safety_score: 94.8, status: 'Available', trip_count: 8, fuel_efficiency: 3.9 }
    ]);
    console.log('Drivers seeded.');
 
    const vVolvo = vehicles.find(v => v.registration_number === 'TX-892-APP');
    const vCascadia = vehicles.find(v => v.registration_number === 'CA-401-TRK');
    const vTransit = vehicles.find(v => v.registration_number === 'NY-772-VAN');
    const vIsuzu = vehicles.find(v => v.registration_number === 'FL-109-BOX');
 
    const dJohn = drivers.find(d => d.name === 'John Doe');
    const dJane = drivers.find(d => d.name === 'Jane Smith');
    const dEmily = drivers.find(d => d.name === 'Emily Davis');
 
    // 5. Seed Trips
    const trips = await Trip.insertMany([
      {
        vehicle: vVolvo._id,
        driver: dJohn._id,
        source: 'Dallas, TX',
        destination: 'Houston, TX',
        sourceLocation: { name: 'Dallas, TX', address: 'Dallas, TX, USA', latitude: 32.7767, longitude: -96.7970 },
        destinationLocation: { name: 'Houston, TX', address: 'Houston, TX, USA', latitude: 29.7604, longitude: -95.3698 },
        cargo_weight: 18000,
        planned_distance: 390,
        plannedDistance: 390,
        estimatedDuration: 13500, // 3h 45m
        routePolyline: '_abwEl~paU_i@xXogAf`@u_@h\\_`AdFsn@b[u}AhP_}Af`@',
        status: 'Completed',
        notes: 'Standard dry van shipment.',
        dispatched_at: new Date('2026-07-08T08:00:00Z'),
        completed_at: new Date('2026-07-08T14:30:00Z')
      },
      {
        vehicle: vCascadia._id,
        driver: dJane._id,
        source: 'Los Angeles, CA',
        destination: 'Phoenix, AZ',
        sourceLocation: { name: 'Los Angeles, CA', address: 'Los Angeles, CA, USA', latitude: 34.0522, longitude: -118.2437 },
        destinationLocation: { name: 'Phoenix, AZ', address: 'Phoenix, AZ, USA', latitude: 33.4484, longitude: -112.0740 },
        cargo_weight: 22000,
        planned_distance: 598,
        plannedDistance: 598,
        estimatedDuration: 21000, // 5h 50m
        routePolyline: 'crznF~ebxU{~A~}A{~A~}A{~A~}A{~A~}A{~A~}A{~A~}A',
        status: 'Dispatched',
        notes: 'Refrigerated cargo, temp set to -18C.',
        dispatched_at: new Date() // Set to now to show active simulation
      },
      {
        vehicle: vTransit._id,
        driver: dEmily._id,
        source: 'Seattle, WA',
        destination: 'Portland, OR',
        sourceLocation: { name: 'Seattle, WA', address: 'Seattle, WA, USA', latitude: 47.6062, longitude: -122.3321 },
        destinationLocation: { name: 'Portland, OR', address: 'Portland, OR, USA', latitude: 45.5152, longitude: -122.6784 },
        cargo_weight: 1200,
        planned_distance: 280,
        plannedDistance: 280,
        estimatedDuration: 10000, // 2h 46m
        routePolyline: 'iyp`H{~riVw`@e`A_i@g`A_i@g`A',
        status: 'Completed',
        notes: 'Last-mile electronic parts delivery.',
        dispatched_at: new Date('2026-07-10T09:00:00Z'),
        completed_at: new Date('2026-07-10T13:45:00Z')
      },
      {
        vehicle: vVolvo._id,
        driver: dJohn._id,
        source: 'Dallas, TX',
        destination: 'Austin, TX',
        sourceLocation: { name: 'Dallas, TX', address: 'Dallas, TX, USA', latitude: 32.7767, longitude: -96.7970 },
        destinationLocation: { name: 'Austin, TX', address: 'Austin, TX, USA', latitude: 30.2672, longitude: -97.7431 },
        cargo_weight: 15000,
        planned_distance: 310,
        plannedDistance: 310,
        estimatedDuration: 11000,
        routePolyline: '_abwEl~paU{~A~}A{~A',
        status: 'Draft',
        notes: 'Pending final customer invoice confirmation.'
      }
    ]);
    console.log('Trips seeded.');

    const tTrip1 = trips[0];
    const tTrip3 = trips[2];

    // 6. Seed Maintenance
    const maintenance = await Maintenance.insertMany([
      { vehicle: vIsuzu._id, issue: 'Engine Misfire', description: 'Cylinder 3 misfire detected. Replacing spark plugs and coil pack.', priority: 'High', estimated_cost: 850, actual_cost: 0, status: 'In Progress' },
      { vehicle: vVolvo._id, issue: 'Scheduled 50k Inspection', description: 'Oil change, filter replacements, brake pad inspection.', priority: 'Low', estimated_cost: 350, actual_cost: 350, status: 'Completed' },
      { vehicle: vCascadia._id, issue: 'Cooling System Leak', description: 'Radiator hose replacement and coolant flush.', priority: 'Medium', estimated_cost: 450, actual_cost: 480, status: 'Completed' },
      { vehicle: vTransit._id, issue: 'Tire Replacement', description: 'Replace rear left worn tire.', priority: 'Medium', estimated_cost: 200, actual_cost: 0, status: 'Pending' }
    ]);
    console.log('Maintenance tickets seeded.');

    // 7. Seed FuelLogs
    const fuelLogs = await FuelLog.insertMany([
      { vehicle: vVolvo._id, date: new Date('2026-07-05'), fuel_quantity: 120, fuel_cost: 480, odometer: 124800 },
      { vehicle: vVolvo._id, date: new Date('2026-07-08'), fuel_quantity: 110, fuel_cost: 451, odometer: 125190 },
      { vehicle: vCascadia._id, date: new Date('2026-07-04'), fuel_quantity: 280, fuel_cost: 1148, odometer: 239200 },
      { vehicle: vCascadia._id, date: new Date('2026-07-09'), fuel_quantity: 270, fuel_cost: 1107, odometer: 240100 },
      { vehicle: vTransit._id, date: new Date('2026-07-10'), fuel_quantity: 45, fuel_cost: 184.5, odometer: 15400 }
    ]);
    console.log('Fuel logs seeded.');

    // 8. Seed Expenses
    await Expense.insertMany([
      { vehicle: vVolvo._id, trip: tTrip1._id, type: 'Toll', amount: 45.00, date: new Date('2026-07-08'), description: 'I-45 Toll road fees' },
      { vehicle: vTransit._id, trip: tTrip3._id, type: 'Toll', amount: 12.00, date: new Date('2026-07-10'), description: 'Express lane toll' },
      { vehicle: vVolvo._id, type: 'Maintenance', amount: 350.00, date: new Date('2026-07-05'), description: 'Completed Scheduled 50k Inspection' },
      { vehicle: vCascadia._id, type: 'Maintenance', amount: 480.00, date: new Date('2026-07-09'), description: 'Cooling system leak repair' },
      { vehicle: vVolvo._id, type: 'Fuel', amount: 480.00, date: new Date('2026-07-05'), description: 'Fuel purchase - 120L' },
      { vehicle: vVolvo._id, type: 'Fuel', amount: 451.00, date: new Date('2026-07-08'), description: 'Fuel purchase - 110L' },
      { vehicle: vCascadia._id, type: 'Fuel', amount: 1148.00, date: new Date('2026-07-04'), description: 'Fuel purchase - 280L' },
      { vehicle: vCascadia._id, type: 'Fuel', amount: 1107.00, date: new Date('2026-07-09'), description: 'Fuel purchase - 270L' },
      { vehicle: vTransit._id, type: 'Fuel', amount: 184.50, date: new Date('2026-07-10'), description: 'Fuel purchase - 45L' }
    ]);
    console.log('Expenses seeded.');

    // 9. Seed Notifications
    await Notification.insertMany([
      { title: 'Expired License Alert', message: 'Driver Robert Johnson license expired on 2026-05-01. Please update license before assigning trips.', type: 'Danger', is_read: false },
      { title: 'Vehicle In Shop', message: 'Vehicle FL-109-BOX status changed to In Shop for repairs.', type: 'Info', is_read: false },
      { title: 'Driver Suspended', message: 'Safety Officer updated Michael Brown status to Suspended due to safety score drop.', type: 'Warning', is_read: false },
      { title: 'High Maintenance Cost Alert', message: 'Vehicle CA-401-TRK has accumulated over $2,000 in repair costs this month.', type: 'Warning', is_read: false }
    ]);
    console.log('Notifications seeded.');

    // 10. Seed Activity Logs
    await ActivityLog.insertMany([
      { user: adminUserId, action: 'Database Seeded', details: 'Initial seed data successfully inserted for Mongoose collections.' },
      { user: adminUserId, action: 'Trip Dispatched', details: 'Dispatched Trip with Driver Jane Smith on Freightliner Cascadia.' },
      { user: adminUserId, action: 'Driver Suspended', details: 'Changed Michael Brown status to Suspended due to compliance issue.' }
    ]);
    console.log('Activity logs seeded.');

    console.log('MongoDB Seeding Completed Successfully.');
    process.exit(0);

  } catch (error) {
    console.error('Seeding process encountered error:', error);
    process.exit(1);
  }
}

seedDatabase();
