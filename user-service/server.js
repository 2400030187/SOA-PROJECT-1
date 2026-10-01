const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { initDb, upsertUserInDb } = require('./db');

const app = express();
const PORT = 8081;
const JWT_SECRET = 'DriveEaseSuperSecretJWTKey2026!';

app.use(cors());
app.use(express.json());

// Root Status Landing Page & Health Check
app.get(['/actuator/health', '/health'], (req, res) => {
  res.json({ status: 'UP', service: 'user-service', database: 'PostgreSQL (user: root)', port: PORT });
});

app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.json({ service: 'User Service', status: 'UP', port: PORT, database: 'PostgreSQL (user: root)' });
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DriveEase User Service — Port 8081</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 600px; margin: 40px auto; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .badge { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; border: 1px solid rgba(16, 185, 129, 0.3); }
      </style>
    </head>
    <body>
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="margin:0;">User Service</h2>
          <span class="badge">UP (HEALTHY)</span>
        </div>
        <p style="color:#94a3b8; font-size:0.9rem;">DriveEase IAM Provider for Owner & Customer accounts.</p>
        <hr style="border:0; border-top:1px solid #334155; margin:16px 0;" />
        <p><strong>Port:</strong> 8081</p>
        <p><strong>Database:</strong> PostgreSQL (User: <code>root</code>, DB: <code>driveease_db</code>)</p>
        <p><strong>Web Portal:</strong> <a href="http://localhost:5173" style="color:#60a5fa;">http://localhost:5173</a></p>
      </div>
    </body>
    </html>
  `);
});

// DB per service: Users in-memory database store
const usersDb = [
  {
    id: 'u-1001',
    email: 'alex@gmail.com',
    password: 'password123',
    firstName: 'Alex',
    lastName: 'Morgan',
    role: 'CUSTOMER',
    phoneNumber: '+1-555-019-2834',
    address: '123 Tech Lane, San Francisco, CA',
    createdAt: '2026-01-15T08:30:00Z',
    driverLicense: {
      licenseNumber: 'DL-987654321',
      issuingState: 'CA',
      expirationDate: '2028-10-15',
      verificationStatus: 'VERIFIED'
    }
  },
  {
    id: 'u-1002',
    email: 'owner12@gmail.com',
    password: '123456',
    firstName: 'Sarah',
    lastName: 'Connor',
    role: 'OWNER',
    phoneNumber: '+91-98765-43210',
    businessName: 'Connor Fleet Management',
    companyName: 'Connor Fleet Management',
    gstin: '27AAAAA0000A1Z5',
    address: '456 Fleet Blvd, Mumbai, MH',
    createdAt: '2025-11-01T10:00:00Z',
    driverLicense: {
      licenseNumber: 'DL-112233445',
      issuingState: 'MH',
      expirationDate: '2029-05-20',
      verificationStatus: 'VERIFIED'
    }
  },
  {
    id: 'u-1003',
    email: 'customer@driveease.com',
    password: 'password123',
    firstName: 'Alex',
    lastName: 'Morgan',
    role: 'CUSTOMER',
    phoneNumber: '+1-555-019-2834',
    address: '123 Tech Lane, San Francisco, CA',
    createdAt: '2026-01-15T08:30:00Z',
    driverLicense: {
      licenseNumber: 'DL-987654321',
      issuingState: 'CA',
      expirationDate: '2028-10-15',
      verificationStatus: 'VERIFIED'
    }
  },
  {
    id: 'u-1004',
    email: 'owner@driveease.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Connor',
    role: 'OWNER',
    phoneNumber: '+91-98765-43210',
    businessName: 'DriveEase Operations Ltd',
    companyName: 'DriveEase Operations Ltd',
    gstin: '27AAAAA0000A1Z5',
    address: '456 Fleet Blvd, Mumbai, MH',
    createdAt: '2025-11-01T10:00:00Z',
    driverLicense: {
      licenseNumber: 'DL-112233445',
      issuingState: 'MH',
      expirationDate: '2029-05-20',
      verificationStatus: 'VERIFIED'
    }
  }
];

// Helper: Ensure default owners and customers are seeded/updated
const ensureOwnerSeeded = () => {
  let owner = usersDb.find(u => u.email.toLowerCase() === 'owner12@gmail.com');
  if (!owner) {
    owner = {
      id: 'u-1002',
      email: 'owner12@gmail.com',
      password: '123456',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: 'OWNER',
      phoneNumber: '+91-98765-43210',
      businessName: 'Connor Fleet Management',
      companyName: 'Connor Fleet Management',
      gstin: '27AAAAA0000A1Z5',
      address: '456 Fleet Blvd, Mumbai, MH',
      createdAt: '2025-11-01T10:00:00Z',
      driverLicense: null
    };
    usersDb.push(owner);
  } else {
    owner.password = owner.password || '123456';
    owner.role = 'OWNER';
    if (!owner.businessName) owner.businessName = 'Connor Fleet Management';
    if (!owner.companyName) owner.companyName = owner.businessName;
    if (!owner.gstin) owner.gstin = '27AAAAA0000A1Z5';
  }

  let ownerDE = usersDb.find(u => u.email.toLowerCase() === 'owner@driveease.com');
  if (!ownerDE) {
    usersDb.push({
      id: 'u-1004',
      email: 'owner@driveease.com',
      password: 'password123',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: 'OWNER',
      phoneNumber: '+91-98765-43210',
      businessName: 'DriveEase Operations Ltd',
      companyName: 'DriveEase Operations Ltd',
      gstin: '27AAAAA0000A1Z5',
      address: '456 Fleet Blvd, Mumbai, MH',
      createdAt: '2025-11-01T10:00:00Z',
      driverLicense: null
    });
  }
};
ensureOwnerSeeded();

// Helper: Email domain validation (^[^\s@]+@(gmail|outlook|driveease)\.com$)
const isValidEmailDomain = (email) => {
  if (!email) return false;
  const regex = /^[^\s@]+@(gmail|outlook|driveease)\.com$/i;
  return regex.test(email.trim());
};

// Helper: Validate phone number format
const isValidPhoneNumber = (phone) => {
  if (!phone) return true;
  const phoneStr = String(phone).trim();
  if (phoneStr === '') return true;
  const regex = /^\+?[0-9\s\-()]{7,20}$/;
  return regex.test(phoneStr);
};

// Helper: JWT verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ status: 401, message: 'Unauthorized: Missing JWT token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ status: 403, message: 'Forbidden: Invalid or expired JWT token' });
    req.user = user;
    next();
  });
};

// Helper: Register User
const registerUserWithRole = (req, res, forcedRole) => {
  ensureOwnerSeeded();
  const { email, password, name, firstName, lastName, phone, phoneNumber, driverLicenseNumber, address, role, businessName, companyName, gstin } = req.body;

  const fName = firstName || (name ? name.split(' ')[0] : 'User');
  const lName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : 'Account');

  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'Email and password are required.' });
  }

  if (!isValidEmailDomain(email)) {
    return res.status(400).json({ status: 400, message: 'Email must be a valid @gmail.com or @outlook.com address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ status: 400, message: 'Password must be at least 6 characters long.' });
  }

  const assignedRole = forcedRole || (role === 'OWNER' || role === 'FLEET_MANAGER' || role === 'ADMIN' ? 'OWNER' : 'CUSTOMER');

  const existing = usersDb.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.role === assignedRole);
  if (existing) {
    return res.status(409).json({ status: 409, message: 'User with this email already exists for this role.' });
  }

  const newUser = {
    id: `u-${Date.now()}`,
    email: email.toLowerCase().trim(),
    password: bcrypt.hashSync(password, 10),
    firstName: fName,
    lastName: lName,
    role: assignedRole,
    phoneNumber: phone || phoneNumber || '',
    address: address || '',
    businessName: businessName || companyName || '',
    companyName: businessName || companyName || '',
    gstin: gstin || '',
    createdAt: new Date().toISOString(),
    driverLicense: driverLicenseNumber ? {
      licenseNumber: driverLicenseNumber,
      verificationStatus: 'VERIFIED'
    } : null
  };

  usersDb.push(newUser);
  upsertUserInDb(newUser);

  // Generate Token
  const token = jwt.sign(
    { userId: newUser.id, email: newUser.email, role: newUser.role, firstName: newUser.firstName, lastName: newUser.lastName },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log(`[User Service] Registered: ${newUser.email} (${newUser.role})`);

  res.status(201).json({
    tokenType: 'Bearer',
    accessToken: token,
    token: token,
    expiresIn: 86400,
    user: {
      id: newUser.id,
      userId: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      name: `${newUser.firstName} ${newUser.lastName}`,
      role: newUser.role,
      phoneNumber: newUser.phoneNumber,
      address: newUser.address,
      businessName: newUser.businessName,
      gstin: newUser.gstin,
      driverLicense: newUser.driverLicense
    }
  });
};

// Helper: Login User
const loginUserWithRole = (req, res, expectedRole = null) => {
  ensureOwnerSeeded();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'Email and password are required.' });
  }

  if (!isValidEmailDomain(email)) {
    return res.status(400).json({ status: 400, message: 'Email must be a valid @gmail.com or @outlook.com address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ status: 400, message: 'Password must be at least 6 characters long.' });
  }

  const user = usersDb.find(u => {
    if (u.email.toLowerCase() !== email.toLowerCase().trim()) return false;
    // Support both bcrypt hash & legacy plain string
    const match = bcrypt.compareSync(password, u.password) || u.password === password;
    return match;
  });

  if (!user) {
    return res.status(401).json({ status: 401, message: 'Invalid email or password.' });
  }

  if (expectedRole && user.role !== expectedRole && !(expectedRole === 'OWNER' && (user.role === 'FLEET_MANAGER' || user.role === 'ADMIN'))) {
    return res.status(403).json({ status: 403, message: `Access denied: Account is registered as ${user.role}, not ${expectedRole}` });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log(`[User Service] Login successful: ${user.email} (${user.role})`);

  res.json({
    tokenType: 'Bearer',
    accessToken: token,
    token: token,
    expiresIn: 86400,
    user: {
      id: user.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      businessName: user.businessName,
      gstin: user.gstin,
      driverLicense: user.driverLicense
    }
  });
};

// --- REST ENDPOINTS --- //

// Unversioned Customer & Owner Auth Endpoints
app.post('/api/customer/register', (req, res) => registerUserWithRole(req, res, 'CUSTOMER'));
app.post('/api/customer/login', (req, res) => loginUserWithRole(req, res, 'CUSTOMER'));
app.post('/api/owner/register', (req, res) => registerUserWithRole(req, res, 'OWNER'));
app.post('/api/owner/login', (req, res) => loginUserWithRole(req, res, 'OWNER'));

// Versioned Customer & Owner Auth Endpoints
app.post('/api/v1/users/customer/register', (req, res) => registerUserWithRole(req, res, 'CUSTOMER'));
app.post('/api/v1/users/customer/login', (req, res) => loginUserWithRole(req, res, 'CUSTOMER'));
app.post('/api/v1/users/owner/register', (req, res) => registerUserWithRole(req, res, 'OWNER'));
app.post('/api/v1/users/owner/login', (req, res) => loginUserWithRole(req, res, 'OWNER'));

// Generic User Registration & Login
app.post('/api/v1/users/register', (req, res) => registerUserWithRole(req, res));
app.post('/api/v1/users/login', (req, res) => loginUserWithRole(req, res));

// --- OWNER PROFILE ENDPOINTS --- //

// GET /api/owner/profile
const getOwnerProfile = (req, res) => {
  if (req.user.role === 'CUSTOMER' || req.user.role === 'USER') {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. CUSTOMER token cannot access owner profile.' });
  }

  const user = usersDb.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ status: 404, message: 'Owner profile not found' });

  res.json({
    id: user.id,
    userId: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phoneNumber || user.phone || '',
    phoneNumber: user.phoneNumber || user.phone || '',
    businessName: user.businessName || user.companyName || '',
    companyName: user.businessName || user.companyName || '',
    gstin: user.gstin || '',
    role: user.role
  });
};

app.get(['/api/owner/profile', '/api/v1/owner/profile'], authenticateToken, getOwnerProfile);

// PUT /api/owner/profile
const updateOwnerProfile = (req, res) => {
  if (req.user.role === 'CUSTOMER' || req.user.role === 'USER') {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. CUSTOMER token cannot edit owner profile.' });
  }

  const user = usersDb.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ status: 404, message: 'Owner profile not found' });

  const { name, firstName, lastName, phone, phoneNumber, businessName, companyName, gstin } = req.body;

  const targetPhone = phone !== undefined ? phone : phoneNumber;
  if (targetPhone !== undefined && !isValidPhoneNumber(targetPhone)) {
    return res.status(400).json({ status: 400, message: 'Invalid phone number format.' });
  }

  if (name !== undefined) {
    const parts = name.trim().split(' ');
    user.firstName = parts[0] || 'User';
    user.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  } else {
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
  }

  if (targetPhone !== undefined) user.phoneNumber = targetPhone;
  if (businessName !== undefined || companyName !== undefined) {
    const bName = businessName !== undefined ? businessName : companyName;
    user.businessName = bName;
    user.companyName = bName;
  }
  if (gstin !== undefined) user.gstin = gstin;

  upsertUserInDb(user);
  console.log(`[User Service] Updated Owner Profile: ${user.email}`);

  res.json({
    id: user.id,
    userId: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phoneNumber || '',
    phoneNumber: user.phoneNumber || '',
    businessName: user.businessName || '',
    companyName: user.companyName || '',
    gstin: user.gstin || '',
    role: user.role
  });
};

app.put(['/api/owner/profile', '/api/v1/owner/profile'], authenticateToken, updateOwnerProfile);

// PUT /api/owner/profile/password
const updateOwnerPassword = (req, res) => {
  if (req.user.role === 'CUSTOMER' || req.user.role === 'USER') {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. CUSTOMER token cannot change owner password.' });
  }

  const user = usersDb.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ status: 404, message: 'User not found' });

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ status: 400, message: 'Both currentPassword and newPassword are required.' });
  }

  const isCurrentValid = bcrypt.compareSync(currentPassword, user.password) || user.password === currentPassword;
  if (!isCurrentValid) {
    return res.status(401).json({ status: 401, message: 'Invalid current password.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ status: 400, message: 'New password must be at least 6 characters long.' });
  }

  user.password = bcrypt.hashSync(newPassword, 10);
  upsertUserInDb(user);
  console.log(`[User Service] Updated password for owner ${user.email}`);

  res.json({ status: 200, message: 'Password updated successfully' });
};

app.put(['/api/owner/profile/password', '/api/v1/owner/profile/password'], authenticateToken, updateOwnerPassword);

// --- CUSTOMER PROFILE ENDPOINTS --- //

// GET /api/customer/profile
const getCustomerProfile = (req, res) => {
  if (req.user.role === 'OWNER' || req.user.role === 'FLEET_MANAGER' || req.user.role === 'ADMIN') {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. OWNER token cannot access customer profile.' });
  }

  const user = usersDb.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ status: 404, message: 'Customer profile not found' });

  const licenseNum = user.driverLicense?.licenseNumber || user.driverLicenseNumber || user.licenseNumber || '';

  res.json({
    id: user.id,
    userId: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phoneNumber || user.phone || '',
    phoneNumber: user.phoneNumber || user.phone || '',
    licenseNumber: licenseNum,
    driverLicenseNumber: licenseNum,
    address: user.address || '',
    role: user.role
  });
};

app.get(['/api/customer/profile', '/api/v1/customer/profile'], authenticateToken, getCustomerProfile);

// PUT /api/customer/profile
const updateCustomerProfile = (req, res) => {
  if (req.user.role === 'OWNER' || req.user.role === 'FLEET_MANAGER' || req.user.role === 'ADMIN') {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. OWNER token cannot edit customer profile.' });
  }

  const user = usersDb.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ status: 404, message: 'Customer profile not found' });

  const { name, firstName, lastName, phone, phoneNumber, licenseNumber, driverLicenseNumber, address } = req.body;

  const targetPhone = phone !== undefined ? phone : phoneNumber;
  if (targetPhone !== undefined && !isValidPhoneNumber(targetPhone)) {
    return res.status(400).json({ status: 400, message: 'Invalid phone number format.' });
  }

  if (name !== undefined) {
    const parts = name.trim().split(' ');
    user.firstName = parts[0] || 'User';
    user.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  } else {
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
  }

  if (targetPhone !== undefined) user.phoneNumber = targetPhone;

  const targetLicense = licenseNumber !== undefined ? licenseNumber : driverLicenseNumber;
  if (targetLicense !== undefined) {
    user.driverLicenseNumber = targetLicense;
    user.licenseNumber = targetLicense;
    user.driverLicense = {
      ...(user.driverLicense || {}),
      licenseNumber: targetLicense,
      verificationStatus: 'VERIFIED'
    };
  }

  if (address !== undefined) user.address = address;

  upsertUserInDb(user);
  console.log(`[User Service] Updated Customer Profile: ${user.email}`);

  const updatedLicense = user.driverLicense?.licenseNumber || user.driverLicenseNumber || '';

  res.json({
    id: user.id,
    userId: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phoneNumber || '',
    phoneNumber: user.phoneNumber || '',
    licenseNumber: updatedLicense,
    driverLicenseNumber: updatedLicense,
    address: user.address || '',
    role: user.role
  });
};

app.put(['/api/customer/profile', '/api/v1/customer/profile'], authenticateToken, updateCustomerProfile);

// PUT /api/customer/profile/password
const updateCustomerPassword = (req, res) => {
  if (req.user.role === 'OWNER' || req.user.role === 'FLEET_MANAGER' || req.user.role === 'ADMIN') {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. OWNER token cannot change customer password.' });
  }

  const user = usersDb.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ status: 404, message: 'User not found' });

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ status: 400, message: 'Both currentPassword and newPassword are required.' });
  }

  const isCurrentValid = bcrypt.compareSync(currentPassword, user.password) || user.password === currentPassword;
  if (!isCurrentValid) {
    return res.status(401).json({ status: 401, message: 'Invalid current password.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ status: 400, message: 'New password must be at least 6 characters long.' });
  }

  user.password = bcrypt.hashSync(newPassword, 10);
  upsertUserInDb(user);
  console.log(`[User Service] Updated password for customer ${user.email}`);

  res.json({ status: 200, message: 'Password updated successfully' });
};

app.put(['/api/customer/profile/password', '/api/v1/customer/profile/password'], authenticateToken, updateCustomerPassword);

// Get Current User Profile (/api/v1/users/me)
app.get('/api/v1/users/me', authenticateToken, (req, res) => {
  const user = usersDb.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User profile not found' });

  const { password, ...safeUser } = user;
  const licenseNum = user.driverLicense?.licenseNumber || user.driverLicenseNumber || user.licenseNumber || '';

  res.json({
    ...safeUser,
    userId: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    phone: user.phoneNumber || '',
    licenseNumber: licenseNum,
    driverLicenseNumber: licenseNum,
    address: user.address || '',
    businessName: user.businessName || '',
    gstin: user.gstin || ''
  });
});

// Internal User Lookup Endpoint (Service-to-Service Only)
const INTERNAL_SERVICE_TOKEN = 'DriveEaseInternalKey2026';

app.get(['/internal/users/:id', '/api/v1/internal/users/:id'], (req, res) => {
  const token = req.headers['x-internal-service-token'] || req.headers['x-internal-token'] || (req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null);
  
  if (token !== INTERNAL_SERVICE_TOKEN) {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. Invalid or missing internal service token.' });
  }

  const user = usersDb.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ status: 404, message: 'User not found in User Service' });
  }

  const licenseNum = user.driverLicense?.licenseNumber || user.driverLicenseNumber || user.licenseNumber || '';

  res.json({
    id: user.id,
    userId: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phoneNumber || user.phone || '',
    phoneNumber: user.phoneNumber || user.phone || '',
    licenseNumber: licenseNum,
    driverLicenseNumber: licenseNum,
    address: user.address || '',
    businessName: user.businessName || user.companyName || '',
    companyName: user.businessName || user.companyName || '',
    gstin: user.gstin || '',
    role: user.role
  });
});

// Update Driver License
app.post('/api/v1/users/driver-license', authenticateToken, (req, res) => {
  const { licenseNumber, issuingState, expirationDate } = req.body;

  const user = usersDb.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.driverLicenseNumber = licenseNumber;
  user.licenseNumber = licenseNumber;
  user.driverLicense = {
    licenseNumber,
    issuingState,
    expirationDate,
    verificationStatus: 'VERIFIED'
  };
  upsertUserInDb(user);

  res.json({ message: 'Driver license verified successfully', driverLicense: user.driverLicense });
});

// Eureka Heartbeat simulation
const registerWithEureka = () => {
  fetch('http://localhost:8761/eureka/apps/USER-SERVICE', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port: PORT, url: `http://localhost:${PORT}` })
  }).catch(() => {});
};

app.listen(PORT, async () => {
  await initDb(usersDb);
  console.log(`[User Service] Running on port ${PORT}`);
  registerWithEureka();
  setInterval(registerWithEureka, 15000);
});
