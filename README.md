# DriveEase Fleet Operations — Microservices Platform

DriveEase Fleet Operations is a commercial fleet telematics, management, and vehicle rental platform built with a modern microservices architecture and React frontend.

---

## 🚀 Architecture Overview

- **Eureka Service Registry** (`:8761`) — Dynamic service discovery & heartbeat monitor
- **API Gateway** (`:8080`) — Central ingress router with role-based JWT validation
- **User Service** (`:8081`) — IAM provider for Owner & Customer accounts
- **Vehicle Service** (`:8082`) — Fleet inventory, state machine, and odometer telemetry
- **Booking Service** (`:8083`) — Overlap protection engine, 18% GST pricing calculation in ₹ (INR), and returns
- **React 18 Frontend** (`:5173` / `:3000`) — Dark navy glassmorphic portal with role-segregated login flows

---

## 🛠️ Quick Start

### 1. Install All Dependencies
```bash
npm run install:all
# or node install-all.js
```

### 2. Start Microservices & Frontend
```bash
npm start
# or node start-all.js
```

Access the Web Portal at:
- **Frontend App**: [http://localhost:5173](http://localhost:5173) (also available on [http://localhost:3000](http://localhost:3000))
- **Eureka Dashboard**: [http://localhost:8761](http://localhost:8761)
- **API Gateway**: [http://localhost:8080](http://localhost:8080)

---

## 🐳 Docker Deployment

To run with PostgreSQL and Docker:
```bash
docker-compose up --build
```

---

## 🧪 Testing the API Suite

1. **Postman Collection**: Import `DriveEase_API_Tests.postman_collection.json` into Postman.
2. **REST Client**: Open `requests.http` in VS Code with the REST Client extension.

### Pre-seeded Demo Credentials
- **Owner Demo**: `owner@driveease.com` / `password123` or `owner12@gmail.com` / `123456`
- **Customer Demo**: `customer@driveease.com` / `password123` or `alex@gmail.com` / `password123`

---

## 📋 Features & Business Rules

- **Currency**: All financial values are stored as `DECIMAL(10,2)` in ₹ (INR) with optional 18% GST calculation.
- **Email Validation**: Emails must use `@gmail.com`, `@outlook.com`, or `@driveease.com`.
- **Password Rules**: Minimum 6 characters required.
- **Server-Side Overlap Rejection**: `POST /api/v1/customer/bookings` rejects date conflicts with HTTP `409 Conflict`.
