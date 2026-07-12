# TransitOps | Transport Operations Management Platform

TransitOps is a production-quality, enterprise-grade ERP-like logistical dashboard designed for Fleet, Driver, Trip, Maintenance, Fuel logs, and Financial Expenses Operations. It features a stunning glassmorphic dark theme built with React 19, Tailwind CSS, Express, and MySQL.

---

## 🛠️ Technology Stack
*   **Frontend**: React 19, Vite, Tailwind CSS, React Router v6, Axios, React Hook Form, Recharts, Lucide Icons, React Hot Toast
*   **Backend**: Node.js, Express.js
*   **Database**: MySQL
*   **Authentication**: JWT, bcryptjs
*   **Architecture**: MVC (Model-View-Controller)

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
├── server/                     # Backend Node/Express API
│   ├── config/                 # db.js Connection pool
│   ├── controllers/            # Auth, Fleet, Drivers, Trips, Repairs controllers
│   ├── middleware/             # Auth JWT check, Role matrix check
│   ├── models/                 # schema.sql, seed.sql
│   ├── routes/                 # Express route configs
│   ├── server.js               # Express server entry point
│   └── package.json
└── README.md
```

---

## 🚀 Installation & Local Setup

### 1. Database Setup
1. Open your MySQL client shell or tool (e.g. MySQL Workbench, command line, etc.)
2. Import the schema to create the database:
   ```bash
   mysql -u root -p < server/models/schema.sql
   ```
3. Import the seed data to pre-populate roles, users, vehicles, drivers, trips, fuel, and expenses:
   ```bash
   mysql -u root -p < server/models/seed.sql
   ```

### 2. Backend Server Setup
1. Navigate to the backend directory:
   ```bash
   cd server
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables in `server/.env`. Adjust database host, port, user, or password if needed:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=transitops_db
   JWT_SECRET=transitops_super_secret_jwt_key_2026_keyphrase
   JWT_EXPIRES_IN=7d
   ```
4. Boot up the developer server (uses nodemon for auto-reloading):
   ```bash
   npm run dev
   ```
   *The server should print `Database Connected Successfully` and listen on port 5000.*

### 3. Frontend Client Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd client
   ```
2. Install React dependencies:
   ```bash
   npm install
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
    *   *Permissions: Manage fleet, schedule routes, handle fuel logs and maintenance tickets.*
*   **Safety Officer**:
    *   Username: `safety` | Password: `password123`
    *   *Permissions: Manage drivers credentials, safety ratings, compliance alerts.*
*   **Financial Analyst**:
    *   Username: `finance` | Password: `password123`
    *   *Permissions: Fuel registries, expenses ledger, financial operational analytics.*

---

## 💡 Key Highlights & Business Rules
*   **Trip lifecycle validations**: Retired/in-shop trucks or suspended/expired drivers are blocked during trip dispatch.
*   **Automated operational updates**: Dispatching/completing/cancelling trips automatically synchronizes vehicle and driver duty statuses.
*   **Dynamic score engines**: Fleet Health Score (based on maintenance cost & age) and Driver Performance Score (safety logs & fuel efficiency).
*   **Administrative control deck**: Live notifications center, activity audits trail, CSV reporting, and Role-Based Access Matrix.
