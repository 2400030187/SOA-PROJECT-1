-- =========================================================================
-- DriveEase Fleet Operations — MySQL Database Schema (driveease_db)
-- Compatible with MySQL 8.0+ / MariaDB & Spring Boot JPA Hibernate
-- =========================================================================

CREATE DATABASE IF NOT EXISTS driveease_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE driveease_db;

-- 1. Users Table (IAM & Customer/Owner Profiles)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
  phone_number VARCHAR(50),
  business_name VARCHAR(255),
  company_name VARCHAR(255),
  gstin VARCHAR(50),
  address TEXT,
  driver_license_number VARCHAR(50),
  driver_license JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Vehicles Table (Fleet Inventory & Daily Rates)
CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(100) PRIMARY KEY,
  owner_id VARCHAR(100) NOT NULL,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  license_plate VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL DEFAULT 'SEDAN',
  fuel_type VARCHAR(50) NOT NULL DEFAULT 'GASOLINE',
  daily_rate DECIMAL(10, 2) NOT NULL,
  previous_daily_rate DECIMAL(10, 2),
  last_change_summary TEXT,
  last_changed_at VARCHAR(100),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  current_odometer INT NOT NULL DEFAULT 0,
  location VARCHAR(255) NOT NULL,
  image_url TEXT,
  features JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner (owner_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Bookings Table (Reservations, Overlap Engine & Cancellations)
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_phone VARCHAR(50),
  vehicle_id VARCHAR(100) NOT NULL,
  vehicle_info VARCHAR(255) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  return_location VARCHAR(255) NOT NULL,
  duration_days DECIMAL(5, 2) NOT NULL,
  daily_rate DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  gst_rate DECIMAL(4, 2) NOT NULL DEFAULT 0.18,
  tax_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
  start_odometer INT,
  end_odometer INT,
  actual_return_time DATETIME,
  fees JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_user (user_id),
  INDEX idx_booking_vehicle (vehicle_id),
  INDEX idx_booking_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Notifications Table (Real-Time Owner Audit Alerts)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(100) PRIMARY KEY,
  owner_id VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  vehicle_id VARCHAR(100),
  booking_id VARCHAR(100),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_owner (owner_id),
  INDEX idx_notif_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Maintenance Logs Table (Telematics & Service History)
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id VARCHAR(100) PRIMARY KEY,
  vehicle_id VARCHAR(100) NOT NULL,
  service_date DATETIME NOT NULL,
  issue_description TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_maint_veh (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
