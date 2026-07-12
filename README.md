# TransitOps | Transport Operations Management Platform

TransitOps is a production-quality, enterprise-grade ERP logistical dashboard designed for managing Fleet assets, Driver safety, Trip scheduling, Maintenance tickets, Fuel registries, and Financial Expenses. It features a glassmorphic dark theme built with React 19, Tailwind CSS, Express, and MongoDB.

---

## 🛠️ Technology Stack
*   **Frontend**: React 19, Vite, Tailwind CSS, React Router v6, Axios, React Hook Form, Recharts, Lucide Icons, React Hot Toast
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (via Mongoose ODM)
*   **Authentication**: JWT, bcryptjs
*   **Architecture**: MVC (Model-View-Controller)
*   **Currency Standard**: Indian Rupee (₹ INR)

---

## 🏗️ Project Architecture
```
TransitOps/
├── client/                     # Frontend Vite + React 19 App
│   ├── src/
│   │   ├── assets/             # UI/UX Assets
│   │   ├── components/         # Reusable Skeletons, Modals, Navbar, Sidebar
│   │   ├── hooks/              # useAuth context provider
│   │   ├── layouts/            # Layout dashboard wrapper
│   │   ├── pages/              # Dashboard, Fleet, Drivers, Trips, Maintenance, Settings, etc.
│   │   ├── services/           # api.js Axios configuration
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind + Custom styling rules
│   ├── tailwind.config.js      # Styling themes configurations
│   ├── vite.config.js          # Port setup & API proxying config
│   └── package.json
│
│── server/                     # Backend Node/Express API
│   ├── config/                 # db.js Mongoose connection config
│   ├── controllers/            # Auth, Fleet, Drivers, Trips, Maintenance, Fuel, Analytics controllers
│   ├── middleware/             # Auth JWT check, Role matrix check
│   ├── models/                 # Mongoose collection models (Role, User, Vehicle, Driver, Trip, etc.)
│   ├── routes/                 # Express route configurations
│   ├── server.js               # Express server entry point
│   └── package.json
│
└── push_to_github.ps1          # GitHub publishing script
```

---

## 🚀 Installation & Local Setup

### 1. Database Setup & Seeding
1. Make sure your MongoDB instance is running locally (`mongodb://localhost:27017`) or you have a remote MongoDB Atlas cluster connection string.
2. In the `server/.env` file, configure your `MONGO_URI` connection string:
   ```env
   MONGO_URI=mongodb://localhost:27017/transitops_db
   ```
3. Navigate to the `server/` directory and seed the database collections with mock data (Roles, Admin/Manager users, Vehicles, Drivers, Trips, Maintenance logs, and Expenses):
   ```bash
   cd server
   node models/seed.js
   ```
   *Note: If using MongoDB Atlas, verify that your client IP address is added to your cluster's Security Whitelist (`0.0.0.0/0` is recommended for demo deployments).*

### 2. Backend Server Setup
1. Navigate to the backend directory:
   ```bash
   cd server
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Boot up the developer server (uses nodemon for auto-reloading):
   ```bash
   npm run dev
   ```
   *The server should print `MongoDB Connected Successfully` and listen on port 5000.*

### 3. Frontend Client Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd client
   ```
2. Install React dependencies (use `--legacy-peer-deps` to bypass React 19 peer constraints):
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the local Vite development server:
   ```bash
   npm run dev
   ```
4. Open the displayed URL in your browser (typically `http://localhost:5173`).

---

## 🔐 Default Login Credentials
You can log in immediately using any of the seeded roles (all passwords are set to `password123`):

*   **Administrator**:
    *   Username: `admin` | Password: `password123`
    *   *Permissions: Complete access to all screens and configuration of the Role Permission Matrix.*
*   **Fleet Manager**:
    *   Username: `manager` | Password: `password123`
    *   *Permissions: Manage fleet assets, schedule routes, handle fuel logs and maintenance tickets.*
*   **Safety Officer**:
    *   Username: `safety` | Password: `password123`
    *   *Permissions: Manage drivers credentials, safety ratings, license expiration alerts.*
*   **Financial Analyst**:
    *   Username: `finance` | Password: `password123`
    *   *Permissions: Fuel registries, expenses ledger, financial operational analytics.*
*   **Driver**:
    *   Username: `driver_john` | Password: `password123`
    *   *Permissions: View assigned route schedules, log trip mileages.*

---

## 💡 Key Highlights & Business Rules
*   **Indian Rupee Currency System**: All costs (acquisitions, repairs, fuel, tolls, ROIs, and dashboards) are calculated and displayed in Indian Rupees (`₹`).
*   **Trip Lifecycle Validations**: Retired/in-shop trucks or suspended/expired drivers are blocked during trip dispatch.
*   **Automated Operational Updates**: Dispatching/completing/cancelling trips automatically synchronizes vehicle and driver duty statuses.
*   **Dynamic Score Engines**: Fleet Health Score (based on maintenance cost & age) and Driver Performance Score (safety logs & fuel efficiency).
*   **Administrative Control Deck**: Live notifications center, activity audits trail, CSV reporting, and Role-Based Access Matrix.
