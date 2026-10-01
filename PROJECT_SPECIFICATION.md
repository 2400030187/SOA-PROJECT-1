# DriveEase Fleet Operations — System & Service Specifications

---

## 1. OWNER SPECIFICATION

### Role Definition
The **Owner** (Fleet Manager / Administrator) role represents commercial vehicle operators and fleet owners responsible for managing vehicle inventory, defining rental rates in ₹ (INR), overseeing telemetry status, monitoring fleet availability, and viewing overall business earnings and utilization analytics.

---

### Account & Access Rules

- **Default Credentials**: `owner12@gmail.com` / `123456`
- **Allowed Email Domains**: `@gmail.com` or `@outlook.com`
- **Password Requirements**: Minimum 6 characters
- **JWT Claims**:
  ```json
  {
    "userId": "u-1002",
    "email": "owner12@gmail.com",
    "role": "OWNER",
    "firstName": "Sarah",
    "lastName": "Connor",
    "iat": 1727170000,
    "exp": 1727256400
  }
  ```
- **Profile Fields**:
  - `id`: Unique identifier (`u-xxxx`)
  - `email`: Validated `@gmail.com` / `@outlook.com` address
  - `firstName`: Owner first name
  - `lastName`: Owner last name
  - `role`: Fixed string `"OWNER"`
  - `phoneNumber`: Contact number (e.g. `+91-98765-43210`)

---

### Core Features

| Feature | Description |
|---|---|
| **Fleet Registration & Onboarding** | Add new vehicles with make, model, year, category, license plate, depot location, and daily rate in ₹ (INR). |
| **Fleet Inventory Management** | Edit rates, update depot locations, or decommission vehicles from the active fleet. |
| **Vehicle Status Oversight** | Manually transition vehicle state (`AVAILABLE`, `IN_MAINTENANCE`, `OUT_OF_SERVICE`) to reflect garage operations. |
| **Fleet Reservation Oversight** | View all customer bookings placed across owned vehicles in real-time. |
| **Earnings & Revenue Analytics** | View total rental revenues, completed trip payouts, and per-vehicle utilization statistics in ₹ (INR). |

---

### Constraints & Restrictions

1. Cannot place customer bookings on vehicles or reserve vehicles for personal rental.
2. Cannot delete a vehicle that currently has an `ACTIVE` or `CONFIRMED` booking.
3. Cannot modify daily rates retroactively for reservations that are already `CONFIRMED` or `ACTIVE`.
4. Must maintain unique license plates across the entire system.

---

### Relevant REST API Endpoints

- `POST /api/v1/users/owner/login` — Authenticate owner credentials
- `POST /api/v1/users/owner/register` — Register a new fleet owner account
- `GET /api/v1/owner/vehicles` — Retrieve vehicles managed by the authenticated owner
- `POST /api/v1/owner/vehicles` — Onboard a new vehicle into the fleet
- `PUT /api/v1/owner/vehicles/{id}` — Update vehicle parameters (daily rate, location)
- `DELETE /api/v1/owner/vehicles/{id}` — Remove an unreserved vehicle from the fleet
- `PATCH /api/v1/owner/vehicles/{id}/status` — Change state machine status (`AVAILABLE`, `IN_MAINTENANCE`, etc.)
- `GET /api/v1/owner/bookings` — View all reservations across the owner's fleet
- `GET /api/v1/owner/earnings` — View aggregate revenue and earnings report in ₹ (INR)

---

### Validation Rules Table

| Field / Action | Rule / Constraint | Error Message / Status Code |
|---|---|---|
| **Email Domain** | Must end with `@gmail.com` or `@outlook.com` | `400 Bad Request` — "Only @gmail.com or @outlook.com email addresses are allowed." |
| **Password Length** | Minimum 6 characters | `400 Bad Request` — "Password must be at least 6 characters long." |
| **Daily Rate** | Numeric decimal > 0 (in ₹ INR) | `400 Bad Request` — "Daily rate must be a positive amount in INR." |
| **License Plate** | Unique alphanumeric string | `409 Conflict` — "Vehicle with this license plate already exists." |
| **Vehicle Deletion** | Status must NOT be `RESERVED` or `IN_USE` | `400 Bad Request` — "Cannot delete vehicle with active or confirmed bookings." |

---

## 2. CUSTOMER SPECIFICATION

### Role Definition
The **Customer** (Renter) role represents individual clients who search the available vehicle fleet, inspect daily rates in ₹ (INR), place time-bound reservations, manage active bookings, complete vehicle returns, and inspect itemized GST invoices.

---

### Account & Access Rules

- **Authentication Rule**: Register if new user, login if existing account
- **Allowed Email Domains**: `@gmail.com` or `@outlook.com`
- **Password Requirements**: Minimum 6 characters
- **JWT Claims**:
  ```json
  {
    "userId": "u-1001",
    "email": "alex@gmail.com",
    "role": "CUSTOMER",
    "firstName": "Alex",
    "lastName": "Morgan",
    "iat": 1727170000,
    "exp": 1727256400
  }
  ```
- **Profile Fields**:
  - `id`: Unique identifier (`u-xxxx`)
  - `email`: Validated `@gmail.com` / `@outlook.com` address
  - `firstName`: Customer first name
  - `lastName`: Customer last name
  - `role`: Fixed string `"CUSTOMER"`
  - `phoneNumber`: Contact phone number
  - `driverLicense`: License number, state, expiration date, and verification status

---

### Core Features

| Feature | Description |
|---|---|
| **Fleet Catalog Browsing** | Search and filter available vehicles by category (Sedan, SUV, Luxury, Electric), depot location, and maximum price in ₹ (INR). |
| **Booking Reservation Wizard** | Select pickup and return timestamps, inspect estimated duration and pricing breakdown in ₹ (INR), and confirm reservations. |
| **Trip Management** | View active and past reservations, track booking status, and view pickup/return locations. |
| **Vehicle Return Checklist** | Complete return inspection, submit ending odometer reading, and settle any late or damage fees. |
| **GST Invoice Inspection** | View itemized receipts with rental subtotal, 18% GST calculation (optional/itemized), and grand total in ₹ (INR). |

---

### Constraints & Restrictions

1. Cannot register vehicles or modify fleet pricing/status.
2. Cannot reserve a vehicle whose status is `IN_MAINTENANCE` or `OUT_OF_SERVICE`.
3. Cannot create overlapping bookings for the same vehicle during an already reserved date window.
4. Return timestamp must be strictly after the pickup timestamp (`endDate > startDate`).

---

### Relevant REST API Endpoints

- `POST /api/v1/users/customer/login` — Authenticate customer credentials
- `POST /api/v1/users/customer/register` — Register a new customer account
- `GET /api/v1/vehicles/search` — Public endpoint to search and filter available vehicles
- `GET /api/v1/vehicles/{id}` — Get single vehicle details
- `POST /api/v1/customer/bookings` — Create a new vehicle reservation (triggers overlap check)
- `GET /api/v1/customer/bookings` — View current customer's booking history
- `PUT /api/v1/customer/bookings/{id}/cancel` — Cancel a pending/confirmed booking
- `POST /api/v1/customer/bookings/{id}/return` — Complete vehicle return process
- `GET /api/v1/customer/bookings/{id}/invoice` — Fetch itemized invoice in ₹ (INR)

---

### Validation Rules Table

| Field / Action | Rule / Constraint | Error Message / Status Code |
|---|---|---|
| **Email Domain** | Must end with `@gmail.com` or `@outlook.com` | `400 Bad Request` — "Only @gmail.com or @outlook.com email addresses are allowed." |
| **Password Length** | Minimum 6 characters | `400 Bad Request` — "Password must be at least 6 characters long." |
| **Date Window** | `endDate` must be strictly after `startDate` | `400 Bad Request` — "Return date must be strictly after pickup date." |
| **Overlap Conflict** | Selected range must not overlap existing bookings | `409 Conflict` — "Vehicle is already reserved for the selected date range." |
| **Driver License** | Required prior to confirming initial booking | `400 Bad Request` — "Driver's license verification required before booking." |

---

## 3. VEHICLE SERVICE SPECIFICATION

### Purpose and Scope
The **Vehicle Service** (Port `8082`) is the authoritative microservice for maintaining the vehicle catalog, handling telemetry/odometer data, tracking depot locations, enforcing daily rental pricing in ₹ (INR), and managing the vehicle operational state machine.

---

### Data Model

```sql
CREATE TABLE vehicles (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL CHECK (year >= 2000),
    license_plate VARCHAR(30) NOT NULL UNIQUE,
    category VARCHAR(30) NOT NULL DEFAULT 'SEDAN', -- SEDAN, SUV, LUXURY, ELECTRIC, TRUCK
    fuel_type VARCHAR(30) NOT NULL DEFAULT 'GASOLINE', -- GASOLINE, ELECTRIC, HYBRID, DIESEL
    daily_rate DECIMAL(10, 2) NOT NULL CHECK (daily_rate > 0), -- Stored in INR (₹)
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, RESERVED, IN_USE, IN_MAINTENANCE, OUT_OF_SERVICE
    current_odometer INT NOT NULL DEFAULT 0,
    location VARCHAR(255) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### Status / State Machine Workflow

```
   ┌─────────────┐       Booking Confirmed       ┌─────────────┐
   │  AVAILABLE  │ ────────────────────────────► │  RESERVED   │
   └──────┬──────┘                               └──────┬──────┘
          │                                             │
          │ Maintenance                                 │ Trip Started
          │ Triggered                                   │ (Key Handover)
          ▼                                             ▼
   ┌─────────────┐                               ┌─────────────┐
   │    IN_      │ ◄──────────────────────────── │   IN_USE    │
   │ MAINTENANCE │        Trip Completed         └─────────────┘
   └──────┬──────┘
          │
          │ Decommissioned
          ▼
   ┌─────────────┐
   │   OUT_OF_   │
   │   SERVICE   │
   └─────────────┘
```

1. **`AVAILABLE`**: Vehicle is ready in depot for rental search and reservation.
2. **`RESERVED`**: Reservation placed by a customer for an upcoming date window.
3. **`IN_USE`**: Vehicle picked up by customer; trip currently active.
4. **`IN_MAINTENANCE`**: Vehicle in workshop for service/repairs (blocked from new reservations).
5. **`OUT_OF_SERVICE`**: Decommissioned or permanently offline.

---

### Exposed APIs

#### Public / Customer-Facing APIs
- `GET /api/v1/vehicles/search` — Query vehicles with optional filters (`category`, `location`, `maxPrice`, `search`)
- `GET /api/v1/vehicles/{id}` — Get single vehicle details

#### Owner-Facing APIs (JWT Protected: `role == "OWNER"`)
- `GET /api/v1/owner/vehicles` — Get all vehicles owned by logged-in owner
- `POST /api/v1/owner/vehicles` — Register a new vehicle
- `PUT /api/v1/owner/vehicles/{id}` — Update vehicle parameters
- `DELETE /api/v1/owner/vehicles/{id}` — Remove vehicle from catalog
- `PATCH /api/v1/owner/vehicles/{id}/status` — Update vehicle state machine status
- `GET /api/v1/owner/earnings` — Calculate total fleet earnings in ₹ (INR)

---

## 4. BOOKING SERVICE SPECIFICATION

### Purpose and Scope
The **Booking Service** (Port `8083`) manages reservation lifecycles, enforces strict date overlap protection, performs rental duration and 18% GST price calculations in ₹ (INR), records vehicle pickup/return odometers, and generates itemized customer invoices.

---

### Data Model

```sql
CREATE TABLE bookings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    vehicle_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(200) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    vehicle_info VARCHAR(255) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    return_location VARCHAR(255) NOT NULL,
    duration_days DECIMAL(5, 2) NOT NULL CHECK (duration_days > 0),
    daily_rate DECIMAL(10, 2) NOT NULL, -- in INR (₹)
    subtotal DECIMAL(10, 2) NOT NULL, -- in INR (₹)
    gst_rate DECIMAL(4, 2) NOT NULL DEFAULT 0.18, -- 18% GST
    tax_amount DECIMAL(10, 2) NOT NULL, -- in INR (₹)
    total_amount DECIMAL(10, 2) NOT NULL, -- in INR (₹)
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED', -- PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED
    start_odometer INT,
    end_odometer INT,
    actual_return_time TIMESTAMP WITH TIME ZONE,
    late_fee DECIMAL(10, 2) DEFAULT 0.00,
    damage_fee DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### Booking Lifecycle States

- **`PENDING`**: Reservation request initiated.
- **`CONFIRMED`**: Payment verified and reservation locked.
- **`ACTIVE`**: Customer picked up vehicle; trip ongoing.
- **`COMPLETED`**: Vehicle returned to depot, final inspection passed, invoice settled.
- **`CANCELLED`**: Booking cancelled prior to pickup.

---

### Overlap-Prevention Logic (Business Rule)

To prevent double-booking a single vehicle, the Booking Service evaluates proposed date ranges against existing `CONFIRMED` or `ACTIVE` reservations for `targetVehicleId`:

$$\text{Overlap Condition} = (\text{RequestedStart} < \text{ExistingEnd}) \;\land\; (\text{RequestedEnd} > \text{ExistingStart})$$

```javascript
// Overlap Detection Algorithm
const existingBookings = await db.findBookingsForVehicle(vehicleId, ['CONFIRMED', 'ACTIVE']);

const hasOverlap = existingBookings.some(b => {
  const existingStart = new Date(b.startDate).getTime();
  const existingEnd = new Date(b.endDate).getTime();
  const reqStart = new Date(requestedStartDate).getTime();
  const reqEnd = new Date(requestedEndDate).getTime();

  return (reqStart < existingEnd) && (reqEnd > existingStart);
});

if (hasOverlap) {
  throw new OverlapConflictException("Vehicle is already reserved for the selected date range.");
}
```

---

### Pricing & Currency Calculation Logic (₹ INR)

All financial totals are calculated in **INR (₹)**. An optional **18% Goods & Services Tax (GST)** breakdown is itemized on all quotes and invoices:

1. **Duration Calculation**:
   $$\text{Duration (Days)} = \max\left(1, \frac{\text{End Timestamp} - \text{Start Timestamp}}{1000 \times 60 \times 60 \times 24}\right)$$
2. **Subtotal**:
   $$\text{Subtotal (₹)} = \text{Duration} \times \text{Daily Rate (₹)}$$
3. **GST Calculation (18%)**:
   $$\text{CGST (9\%)} = \text{Subtotal} \times 0.09$$
   $$\text{SGST (9\%)} = \text{Subtotal} \times 0.09$$
   $$\text{Tax Amount (₹)} = \text{CGST} + \text{SGST} = \text{Subtotal} \times 0.18$$
4. **Total Rental Amount**:
   $$\text{Total Amount (₹)} = \text{Subtotal} + \text{Tax Amount} + \text{Late Fee} + \text{Damage Fee}$$

---

### Exposed APIs

- `POST /api/v1/customer/bookings` — Reserve a vehicle (Customer JWT required)
- `GET /api/v1/customer/bookings` — List authenticated customer's reservations
- `PUT /api/v1/customer/bookings/{id}/cancel` — Cancel an upcoming booking
- `POST /api/v1/customer/bookings/{id}/return` — Complete vehicle return and calculate final bill
- `GET /api/v1/customer/bookings/{id}/invoice` — Generate itemized 18% GST invoice in ₹ (INR)
- `GET /api/v1/owner/bookings` — List all reservations across owned fleet (Owner JWT required)

---

## 5. USER SERVICE SPECIFICATION

### Purpose and Scope
The **User Service** (Port `8081`) acts as the identity and access management (IAM) provider. It handles user registration and authentication for both **Owner** and **Customer** roles, enforces `@gmail.com` / `@outlook.com` email rules, issues signed JWT access tokens, and manages driver license verification metadata.

---

### Data Model

```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER', -- CUSTOMER or OWNER
    phone_number VARCHAR(20),
    driver_license_number VARCHAR(50),
    driver_license_state VARCHAR(10),
    driver_license_expiry DATE,
    license_verification_status VARCHAR(20) DEFAULT 'UNVERIFIED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### Authentication Flow (Register / Login)

```
        CLIENT                      USER SERVICE                       JWT ISSUED
          │                              │                                 │
          │  POST /users/owner/login     │                                 │
          ├─────────────────────────────►│ Validate Domain (@gmail/@outlook)│
          │                              │ Check Password Length (>=6)     │
          │                              │ Verify Password Hash            │
          │                              ├────────────────────────────────►│ Generate Signed Token
          │   200 OK + Bearer <JWT>      │                                 │ (role: OWNER)
          │◄─────────────────────────────┤                                 │
```

1. **Role-Segregated Endpoints**:
   - Customer Portal: `POST /api/v1/users/customer/register` & `/login`
   - Owner Portal: `POST /api/v1/users/owner/register` & `/login`
2. **Domain Enforcement**: Validates that email string ends with `@gmail.com` or `@outlook.com`.
3. **Password Validation**: Ensures password string contains at least 6 characters.

---

### JWT Structure (Claims Included)

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "u-1001",
    "email": "alex@gmail.com",
    "role": "CUSTOMER",
    "firstName": "Alex",
    "lastName": "Morgan",
    "iat": 1727170000,
    "exp": 1727256400
  }
}
```

---

### Exposed APIs

- `POST /api/v1/users/customer/register` — Register a customer account
- `POST /api/v1/users/customer/login` — Login as a customer
- `POST /api/v1/users/owner/register` — Register an owner account
- `POST /api/v1/users/owner/login` — Login as a fleet owner (`owner12@gmail.com` / `123456`)
- `GET /api/v1/users/me` — Retrieve current authenticated user profile
- `POST /api/v1/users/driver-license` — Submit/update driver's license verification details

---

## 6. NON-FUNCTIONAL REQUIREMENTS

### Security
- **Gateway Authentication**: Spring API Gateway (`:8080`) intercepts incoming HTTP requests, validates the signature of the `Authorization: Bearer <JWT>` header, and extracts the `role` claim.
- **Role Enforcement**: Gateway blocks unauthorized ingress attempt (e.g. `CUSTOMER` trying to invoke `POST /api/v1/owner/vehicles`) with a `403 Forbidden` status code.
- **CORS & Input Sanitization**: Configured with strict CORS policies and input domain validation (`@gmail.com` / `@outlook.com`).

### Service Discovery (Eureka)
- **Eureka Registry**: Eureka Server runs on port `8761`.
- **Dynamic Registration**: All microservices (`USER-SERVICE`, `VEHICLE-SERVICE`, `BOOKING-SERVICE`, `API-GATEWAY`) register heartbeat metadata every 15 seconds.
- **Client-Side Load Balancing**: API Gateway dynamically routes requests to healthy registered instances.

### Inter-Service Communication
- **REST / OpenFeign**: Synchronous HTTP calls between microservices (e.g. Booking Service fetching vehicle pricing from Vehicle Service).
- **Decoupled Repositories**: Each service maintains its own isolated data model and store.

### Fault Tolerance & Circuit Breaker Behavior
- **Resilience Capabilities**: Microservice calls wrapped with circuit breaker fallback handlers.
- **Graceful Fallbacks**: If Vehicle Service fails during catalog browsing, cached/degraded fleet list is served; if User Service is temporarily unreachable, Gateway returns `503 Service Unavailable`.

### Scalability Notes
- **Stateless Microservices**: Services maintain zero session state; scale horizontally behind API Gateway.
- **Independent Scaling**: Vehicle Service can scale up during high rental search traffic independently of Booking Service.

---

## 7. COMPARISON TABLE

### Side-by-Side Owner vs. Customer Capabilities

| Capability / Attribute | Owner Role | Customer Role |
|---|---|---|
| **Primary Portal** | Owner Oversight Portal | Customer Rental Portal |
| **Allowed Email Domains** | `@gmail.com` / `@outlook.com` | `@gmail.com` / `@outlook.com` |
| **Password Rule** | Min 6 characters | Min 6 characters |
| **Sample Credentials** | `owner12@gmail.com` / `123456` | Register if new, login if existing |
| **JWT Scope Claim** | `"role": "OWNER"` | `"role": "CUSTOMER"` |
| **Add / Onboard Vehicles** | Yes (`POST /api/v1/owner/vehicles`) | No (Denied `403 Forbidden`) |
| **Modify Daily Rates (₹)** | Yes (`PUT /api/v1/owner/vehicles/{id}`) | No (Denied `403 Forbidden`) |
| **Manage Vehicle Status** | Yes (`AVAILABLE`, `IN_MAINTENANCE`, etc.) | No |
| **Browse / Search Fleet** | Full view of owned fleet | Search filtered fleet by location, price (₹) |
| **Place Vehicle Reservations** | No | Yes (`POST /api/v1/customer/bookings`) |
| **Overlap Protection** | N/A | Enforced on every reservation attempt |
| **Cancel Bookings** | N/A | Yes (`PUT /api/v1/customer/bookings/{id}/cancel`) |
| **Vehicle Return Checklist** | Inspect fleet return records | Submit odometer & complete return |
| **Revenue / Invoice Access** | View fleet earnings breakdown in ₹ | View itemized receipt with 18% GST in ₹ |
