const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { initDb, upsertBookingInDb, upsertNotificationInDb, updateNotificationReadInDb } = require('./db');

const app = express();
const PORT = 8083;
const JWT_SECRET = 'DriveEaseSuperSecretJWTKey2026!';
const VEHICLE_SERVICE_URL = process.env.VEHICLE_SERVICE_URL || 'http://localhost:8082/api/v1/vehicles';

app.use(cors());
app.use(express.json());

// Root Status Landing Page & Health Check
app.get(['/actuator/health', '/health'], (req, res) => {
  res.json({ status: 'UP', service: 'booking-service', database: 'PostgreSQL (user: root)', port: PORT });
});

app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.json({ service: 'Booking Service', status: 'UP', port: PORT, database: 'PostgreSQL (user: root)' });
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DriveEase Booking Service — Port 8083</title>
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
          <h2 style="margin:0;">Booking Service</h2>
          <span class="badge">UP (HEALTHY)</span>
        </div>
        <p style="color:#94a3b8; font-size:0.9rem;">DriveEase Reservation Lifecycle & Overlap Prevention Engine.</p>
        <hr style="border:0; border-top:1px solid #334155; margin:16px 0;" />
        <p><strong>Port:</strong> 8083</p>
        <p><strong>Database:</strong> PostgreSQL (User: <code>root</code>, DB: <code>driveease_db</code>)</p>
        <p><strong>Web Portal:</strong> <a href="http://localhost:5173" style="color:#60a5fa;">http://localhost:5173</a></p>
      </div>
    </body>
    </html>
  `);
});

// DB per service: Bookings in-memory store
const bookingsDb = [];

// DB per service: Notifications store
const notificationsDb = [];

// Notification creation helper
const createNotification = (ownerId, type, vehicleId, bookingId, message) => {
  const notification = {
    id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ownerId: ownerId || 'u-1002',
    type, // NEW_BOOKING, BOOKING_CANCELLED, VEHICLE_RETURNED
    vehicleId,
    bookingId,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  notificationsDb.unshift(notification);
  upsertNotificationInDb(notification);
  console.log(`[Notification Engine] Created notification for owner ${notification.ownerId}: "${message}"`);
  return notification;
};

// Helper: Format date range for human-readable notification messages
const formatDateRangeShort = (startStr, endStr) => {
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${s.getDate()} ${months[s.getMonth()]}–${e.getDate()} ${months[e.getMonth()]}`;
  } catch (err) {
    return `${startStr.split('T')[0]} to ${endStr.split('T')[0]}`;
  }
};

// Helper: Get blocked calendar for a vehicle
const getBlockedCalendarForVehicle = (vehicleId) => {
  return bookingsDb
    .filter(b => b.vehicleId === vehicleId && (b.status === 'CONFIRMED' || b.status === 'ACTIVE'))
    .map(b => ({
      bookingId: b.id,
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status
    }));
};

// Helper: JWT auth check
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

// Helper: Role enforcement middleware
const enforceCustomerRole = (req, res, next) => {
  if (req.user.role !== 'CUSTOMER' && req.user.role !== 'USER') {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. CUSTOMER role required.' });
  }
  next();
};

const enforceOwnerRole = (req, res, next) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'FLEET_MANAGER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ status: 403, message: 'Forbidden: Access denied. OWNER role required.' });
  }
  next();
};

// Internal Service-to-Service User Profile Resolver (Live read-time lookup)
const fetchUserProfileInternal = async (userId) => {
  if (!userId) return null;
  try {
    const userRes = await fetch(`http://localhost:8081/internal/users/${userId}`, {
      headers: { 'X-Internal-Service-Token': 'DriveEaseInternalKey2026' }
    });
    if (userRes.ok) {
      const uData = await userRes.json();
      return {
        name: uData.name || `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || '',
        email: uData.email || '',
        phone: uData.phone || uData.phoneNumber || '',
        licenseNumber: uData.licenseNumber || uData.driverLicenseNumber || '',
        address: uData.address || ''
      };
    }
  } catch (err) {
    console.error('[Booking Service] Failed live internal user lookup:', err.message);
  }
  return null;
};

// Helper: Construct complete customer & booking object for responses
const formatBookingResponse = async (b) => {
  const liveUser = await fetchUserProfileInternal(b.userId);

  const customerObj = {
    name: liveUser?.name || b.customerDetails?.name || b.userName || b.customerName || b.customer?.name || '',
    email: liveUser?.email || b.customerDetails?.email || b.userEmail || b.customerEmail || b.customer?.email || '',
    phone: liveUser?.phone || b.customerDetails?.phone || b.userPhone || b.customerPhone || b.customer?.phone || '',
    licenseNumber: liveUser?.licenseNumber || b.customerDetails?.licenseNumber || b.licenseNumber || b.driverLicenseNumber || b.customer?.licenseNumber || '',
    address: liveUser?.address || b.customerDetails?.address || b.address || b.customer?.address || ''
  };

  const isNameValid = Boolean(customerObj.name && customerObj.name !== 'undefined' && customerObj.name.trim() !== '' && customerObj.name !== 'Customer');
  const isEmailValid = Boolean(customerObj.email && customerObj.email !== 'undefined' && customerObj.email.trim() !== '');
  const isPhoneValid = Boolean(customerObj.phone && customerObj.phone !== 'undefined' && customerObj.phone.trim() !== '');
  const hasValidCustomer = isNameValid && isEmailValid && isPhoneValid;

  const numAmount = typeof b.totalAmount === 'number' ? b.totalAmount : (b.totalAmount?.amount !== undefined ? b.totalAmount.amount : (b.subtotal ? b.subtotal + (b.taxAmount || 0) : 0));

  return {
    id: b.id,
    userId: b.userId,
    customer: customerObj,
    customerDetails: customerObj,
    customerName: hasValidCustomer ? customerObj.name : (customerObj.name || undefined),
    customerEmail: hasValidCustomer ? customerObj.email : (customerObj.email || undefined),
    customerPhone: hasValidCustomer ? customerObj.phone : (customerObj.phone || undefined),
    customerLicense: customerObj.licenseNumber,
    driverLicenseNumber: customerObj.licenseNumber,
    customerAddress: customerObj.address,
    address: customerObj.address,
    hasValidCustomer,
    vehicle: {
      id: b.vehicleId,
      name: b.vehicleInfo,
      vehicleInfo: b.vehicleInfo
    },
    vehicleId: b.vehicleId,
    vehicleName: b.vehicleInfo,
    vehicleInfo: b.vehicleInfo,
    pickupDate: b.startDate || b.pickupDate,
    startDate: b.startDate || b.pickupDate,
    returnDate: b.endDate || b.returnDate,
    endDate: b.endDate || b.returnDate,
    status: b.status || 'CONFIRMED',
    totalAmount: { amount: numAmount, currency: 'INR' },
    amount: { amount: numAmount, currency: 'INR' },
    currency: 'INR',
    pickupLocation: b.pickupLocation,
    returnLocation: b.returnLocation,
    durationDays: b.durationDays,
    dailyRate: b.dailyRate,
    fees: b.fees,
    createdAt: b.createdAt
  };
};

// --- OVERLAP PREVENTION ALGORITHM --- //
const hasBookingOverlap = (vehicleId, reqStartStr, reqEndStr, excludeBookingId = null) => {
  const reqStart = new Date(reqStartStr).getTime();
  const reqEnd = new Date(reqEndStr).getTime();

  return bookingsDb.some(b => {
    if (b.vehicleId !== vehicleId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return false;

    const bStart = new Date(b.startDate).getTime();
    const bEnd = new Date(b.endDate).getTime();

    return reqStart < bEnd && reqEnd > bStart;
  });
};

// Helper: Booking creation core logic
const createBookingInternal = async (req, res) => {
  const { vehicleId, pickupDate, returnDate, startDate, endDate, pickupLocation, returnLocation } = req.body;
  const startStr = pickupDate || startDate;
  const endStr = returnDate || endDate;

  if (!vehicleId || !startStr || !endStr) {
    return res.status(400).json({ status: 400, message: 'Missing required reservation parameters (vehicleId, pickupDate, returnDate)' });
  }

  const startMs = new Date(startStr).getTime();
  const endMs = new Date(endStr).getTime();

  if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
    return res.status(400).json({ status: 400, message: 'Invalid date range. Pickup date must be strictly before return date.' });
  }

  // Live Server-Side Re-validation of Overlap Conflict
  if (hasBookingOverlap(vehicleId, startStr, endStr)) {
    return res.status(409).json({
      status: 409,
      errorCode: 'BOOKING_OVERLAP_CONFLICT',
      message: 'Vehicle is already reserved for the selected date range. Please select different dates or another vehicle.',
      conflictingVehicleId: vehicleId
    });
  }

  let vehicleInfo = null;
  try {
    const vehicleRes = await fetch(`${VEHICLE_SERVICE_URL}/${vehicleId}`);
    if (!vehicleRes.ok) {
      return res.status(404).json({ status: 404, message: 'Vehicle not found in Vehicle Service' });
    }
    vehicleInfo = await vehicleRes.json();

    if (vehicleInfo.status === 'IN_MAINTENANCE' || vehicleInfo.status === 'OUT_OF_SERVICE') {
      return res.status(409).json({
        status: 409,
        message: `Vehicle cannot be reserved because it is currently ${vehicleInfo.status}`
      });
    }
  } catch (err) {
    console.error('[Booking Service] Failed to contact Vehicle Service:', err.message);
    return res.status(503).json({ status: 503, message: 'Circuit Breaker: Vehicle Service is currently unreachable' });
  }

  // Fetch current user details live from User Service
  const liveUser = await fetchUserProfileInternal(req.user.userId);
  const customerDetails = {
    name: liveUser?.name || req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
    email: liveUser?.email || req.user.email || '',
    phone: liveUser?.phone || req.user.phone || req.user.phoneNumber || '',
    licenseNumber: liveUser?.licenseNumber || '',
    address: liveUser?.address || ''
  };

  // 18% GST Pricing Calculation
  const durationMs = endMs - startMs;
  const durationDays = Math.max(1, parseFloat((durationMs / (1000 * 60 * 60 * 24)).toFixed(1)));
  const dailyRate = vehicleInfo.dailyRate || 3500;
  const subtotal = parseFloat((durationDays * dailyRate).toFixed(2));
  const gstRate = 0.18;
  const taxAmount = parseFloat((subtotal * gstRate).toFixed(2));
  const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));
  const ownerId = vehicleInfo.ownerId || 'u-1002';

  const newBooking = {
    id: `b-${Date.now()}`,
    userId: req.user.userId,
    ownerId: ownerId,
    userName: customerDetails.name,
    userEmail: customerDetails.email,
    userPhone: customerDetails.phone,
    licenseNumber: customerDetails.licenseNumber,
    address: customerDetails.address,
    customer: customerDetails,
    customerDetails: customerDetails,
    hasValidCustomer: !!(customerDetails.name && customerDetails.email && customerDetails.phone),
    vehicleId,
    vehicleInfo: `${vehicleInfo.make} ${vehicleInfo.model} (${vehicleInfo.licensePlate})`,
    startDate: startStr,
    endDate: endStr,
    pickupLocation: pickupLocation || vehicleInfo.location || 'Mumbai Central Hub',
    returnLocation: returnLocation || vehicleInfo.location || 'Mumbai Central Hub',
    durationDays,
    dailyRate,
    subtotal,
    gstRate,
    taxAmount,
    totalAmount,
    amount: { amount: totalAmount, currency: 'INR' },
    currency: 'INR',
    status: 'CONFIRMED',
    startOdometer: vehicleInfo.currentOdometer || 10000,
    endOdometer: null,
    actualReturnTime: null,
    fees: { lateFee: 0, damageFee: 0 },
    createdAt: new Date().toISOString()
  };

  bookingsDb.push(newBooking);
  upsertBookingInDb(newBooking);

  // Call Vehicle Service to mark vehicle RESERVED
  fetch(`${VEHICLE_SERVICE_URL}/${vehicleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'RESERVED', reason: `Reserved by booking ${newBooking.id}` })
  }).catch(err => console.error('[Booking Service] Failed vehicle status update:', err.message));

  // Trigger Rich Notification Event for Owner with Customer Contact Info
  const formattedRange = formatDateRangeShort(startStr, endStr);
  const custText = `${customerDetails.name} (${customerDetails.email}, ${customerDetails.phone})`;
  const notifMsg = `New booking: ${vehicleInfo.make} ${vehicleInfo.model} (${vehicleInfo.licensePlate}) booked by ${custText} for ${formattedRange}, total ₹${totalAmount.toLocaleString('en-IN')}`;
  createNotification(ownerId, 'NEW_BOOKING', vehicleId, newBooking.id, notifMsg);

  console.log(`[Booking Service] Created booking ${newBooking.id} for ${custText} (₹${newBooking.totalAmount})`);

  const responseObj = await formatBookingResponse(newBooking);
  res.status(201).json(responseObj);
};

// Process Return & Audit Core Logic
const processReturnInternal = async (req, res) => {
  const booking = bookingsDb.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 404, message: 'Booking not found' });
  }

  const { actualReturnTime, endOdometer, inspectionNotes, damageFee } = req.body;
  const returnTimeStr = actualReturnTime || new Date().toISOString();
  const endOdo = parseInt(endOdometer) || (booking.startOdometer ? booking.startOdometer + 185 : 15000);
  const dmgFee = parseFloat(damageFee) || 0;

  // Calculate late fee if actual return time is past scheduled return date
  let lateFee = 0;
  const scheduledEndMs = new Date(booking.endDate || booking.startDate).getTime();
  const actualReturnMs = new Date(returnTimeStr).getTime();
  if (!isNaN(scheduledEndMs) && actualReturnMs > scheduledEndMs) {
    const overdueHours = Math.ceil((actualReturnMs - scheduledEndMs) / (1000 * 60 * 60));
    if (overdueHours > 0) {
      lateFee = overdueHours * 500;
    }
  }

  booking.actualReturnTime = returnTimeStr;
  booking.endOdometer = endOdo;
  booking.inspectionNotes = inspectionNotes || 'Standard return inspection passed';
  booking.fees = { lateFee, damageFee: dmgFee };
  booking.status = 'COMPLETED';
  upsertBookingInDb(booking);

  // State machine transition for vehicle: IN_MAINTENANCE if damage fee > 0, else AVAILABLE
  const targetVehicleStatus = dmgFee > 0 ? 'IN_MAINTENANCE' : 'AVAILABLE';
  const transitionReason = dmgFee > 0
    ? `Vehicle returned with reported damage (Fee: ₹${dmgFee}). Flagged for maintenance.`
    : `Vehicle return completed for booking ${booking.id}`;

  try {
    await fetch(`${VEHICLE_SERVICE_URL}/${booking.vehicleId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetVehicleStatus, reason: transitionReason })
    });
  } catch (err) {
    console.error('[Booking Service] Failed to update vehicle status on return:', err.message);
  }

  // Owner Notification
  const notifMsg = `Vehicle returned: ${booking.vehicleInfo} return completed. Total Odometer: ${endOdo} km. Status: COMPLETED.`;
  createNotification(booking.ownerId || 'u-1002', 'VEHICLE_RETURNED', booking.vehicleId, booking.id, notifMsg);

  const formattedBooking = await formatBookingResponse(booking);

  res.json({
    message: 'Vehicle return and telematics audit processed successfully',
    booking: formattedBooking
  });
};

// --- CUSTOMER SCOPED ENDPOINTS --- //

// Customer: Create Booking
app.post(['/api/customer/bookings', '/api/v1/customer/bookings'], authenticateToken, enforceCustomerRole, (req, res) => createBookingInternal(req, res));

// Customer: Get My Bookings
app.get(['/api/customer/bookings', '/api/v1/customer/bookings'], authenticateToken, enforceCustomerRole, async (req, res) => {
  const { status } = req.query;
  let userBookings = bookingsDb.filter(b => b.userId === req.user.userId);

  if (status && status !== 'ALL') {
    userBookings = userBookings.filter(b => b.status.toUpperCase() === status.toUpperCase());
  }

  const formatted = await Promise.all(userBookings.map(b => formatBookingResponse(b)));

  res.json({ total: formatted.length, currency: 'INR', bookings: formatted });
});

// Customer: Cancel Booking
const cancelBookingInternal = async (req, res) => {
  const booking = bookingsDb.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ status: 404, message: 'Booking not found' });

  if (booking.status === 'COMPLETED') {
    return res.status(400).json({ status: 400, message: `Cannot cancel booking in state 'COMPLETED'. Trip has already been completed.` });
  }

  if (booking.status === 'CANCELLED') {
    return res.status(400).json({ status: 400, message: `Booking ${booking.id} is already cancelled.` });
  }

  // If booking is CONFIRMED (not ACTIVE/COMPLETED), customer can cancel anytime before checkout
  booking.status = 'CANCELLED';
  upsertBookingInDb(booking);

  // Reset vehicle to AVAILABLE via Vehicle Service
  await fetch(`${VEHICLE_SERVICE_URL}/${booking.vehicleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'AVAILABLE', reason: `Booking ${booking.id} cancelled` })
  }).catch(() => {});

  // Trigger Notification for Owner
  const notifMsg = `A booking on ${booking.vehicleInfo} was cancelled`;
  createNotification(booking.ownerId || 'u-1002', 'BOOKING_CANCELLED', booking.vehicleId, booking.id, notifMsg);

  const formatted = await formatBookingResponse(booking);
  res.json({ message: 'Booking cancelled successfully', booking: formatted });
};

app.put(['/api/customer/bookings/:id/cancel', '/api/v1/customer/bookings/:id/cancel'], authenticateToken, enforceCustomerRole, (req, res) => cancelBookingInternal(req, res));
app.post(['/api/customer/bookings/:id/cancel', '/api/v1/customer/bookings/:id/cancel'], authenticateToken, enforceCustomerRole, (req, res) => cancelBookingInternal(req, res));

// Customer: Get Itemized Invoice / Receipt
app.get(['/api/customer/bookings/:id/invoice', '/api/v1/customer/bookings/:id/invoice'], authenticateToken, async (req, res) => {
  const booking = bookingsDb.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ status: 404, message: 'Booking not found' });

  const cgst = parseFloat((booking.subtotal * 0.09).toFixed(2));
  const sgst = parseFloat((booking.subtotal * 0.09).toFixed(2));
  const formatted = await formatBookingResponse(booking);

  res.json({
    invoiceNumber: `INV-${booking.id.toUpperCase()}`,
    issueDate: new Date().toISOString(),
    customerName: formatted.customer.name,
    customerEmail: formatted.customer.email,
    vehicleDetails: booking.vehicleInfo,
    rentalPeriod: {
      from: booking.startDate,
      to: booking.endDate,
      totalDays: booking.durationDays
    },
    billingBreakdown: {
      dailyRate: booking.dailyRate,
      rentalSubtotal: booking.subtotal,
      cgstAmount: cgst,
      sgstAmount: sgst,
      totalGst: booking.taxAmount,
      lateFees: booking.fees ? booking.fees.lateFee : 0,
      damageFees: booking.fees ? booking.fees.damageFee : 0,
      grandTotal: booking.totalAmount,
      amount: booking.totalAmount,
      currency: 'INR',
      formattedTotal: `₹${booking.totalAmount.toLocaleString('en-IN')}`
    },
    paymentStatus: 'PAID'
  });
});

// Customer: Return Vehicle
app.post(['/api/customer/bookings/:id/return', '/api/v1/customer/bookings/:id/return'], authenticateToken, async (req, res) => {
  const { actualReturnTime, actualReturnDate, endOdometer, inspectionNotes, damageFee } = req.body;
  const booking = bookingsDb.find(b => b.id === req.params.id);

  if (!booking) return res.status(404).json({ status: 404, message: 'Booking not found' });
  if (booking.status !== 'ACTIVE' && booking.status !== 'CONFIRMED') {
    return res.status(400).json({ status: 400, message: `Cannot process return for booking in state '${booking.status}'` });
  }

  const returnTimeStr = actualReturnTime || actualReturnDate || new Date().toISOString();
  const returnTimeMs = new Date(returnTimeStr).getTime();
  const scheduledEndMs = new Date(booking.endDate).getTime();

  let lateDays = 0;
  let lateFee = 0;

  if (returnTimeMs > scheduledEndMs + (3600 * 1000)) {
    const lateMs = returnTimeMs - scheduledEndMs;
    lateDays = Math.ceil(lateMs / (86400 * 1000));
    lateFee = parseFloat((lateDays * (booking.dailyRate * 1.5)).toFixed(2));
  }

  const additionalDamageFee = damageFee ? parseFloat(damageFee) : 0;
  booking.endOdometer = endOdometer ? parseInt(endOdometer) : (booking.startOdometer + 150);
  booking.actualReturnTime = returnTimeStr;
  booking.fees = { lateFee, damageFee: additionalDamageFee };
  booking.totalAmount = parseFloat((booking.totalAmount + lateFee + additionalDamageFee).toFixed(2));
  booking.amount = { amount: booking.totalAmount, currency: 'INR' };
  booking.status = 'COMPLETED';
  upsertBookingInDb(booking);

  fetch(`${VEHICLE_SERVICE_URL}/${booking.vehicleId}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentOdometer: booking.endOdometer })
  }).catch(() => {});

  const nextVehicleStatus = additionalDamageFee > 0 ? 'IN_MAINTENANCE' : 'AVAILABLE';
  await fetch(`${VEHICLE_SERVICE_URL}/${booking.vehicleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: nextVehicleStatus,
      reason: inspectionNotes || `Vehicle returned from booking ${booking.id}`
    })
  }).catch(() => {});

  let notifMsg = '';
  if (lateDays > 0) {
    notifMsg = `${booking.vehicleInfo} was returned ${lateDays} day${lateDays > 1 ? 's' : ''} late — late fee ₹${lateFee.toLocaleString('en-IN')} applied`;
  } else {
    notifMsg = `${booking.vehicleInfo} was returned on time`;
  }
  createNotification(booking.ownerId || 'u-1002', 'VEHICLE_RETURNED', booking.vehicleId, booking.id, notifMsg);

  const formatted = await formatBookingResponse(booking);

  res.json({
    message: 'Vehicle returned successfully',
    booking: formatted,
    lateFee,
    lateDays,
    vehicleStatusAfterReturn: nextVehicleStatus
  });
});

// --- OWNER ENDPOINTS --- //

// Owner: Get Notifications
app.get(['/api/owner/notifications', '/api/v1/owner/notifications'], authenticateToken, enforceOwnerRole, (req, res) => {
  const currentOwnerId = req.user.userId;
  const { isRead } = req.query;

  let ownerNotifs = notificationsDb.filter(n => n.ownerId === currentOwnerId);

  if (isRead !== undefined) {
    const isReadBool = isRead === 'true';
    ownerNotifs = ownerNotifs.filter(n => n.isRead === isReadBool);
  }

  res.json({ total: ownerNotifs.length, notifications: ownerNotifs });
});

// Owner: Get Unread Notification Badge Count
app.get(['/api/owner/notifications/unread-count', '/api/v1/owner/notifications/unread-count'], authenticateToken, enforceOwnerRole, (req, res) => {
  const currentOwnerId = req.user.userId;
  const unreadList = notificationsDb.filter(n => n.ownerId === currentOwnerId && !n.isRead);
  res.json({ unreadCount: unreadList.length });
});

// Owner: Mark One Notification as Read
const markNotificationRead = (req, res) => {
  const notif = notificationsDb.find(n => n.id === req.params.id && n.ownerId === req.user.userId);
  if (!notif) return res.status(404).json({ status: 404, message: 'Notification not found' });

  notif.isRead = true;
  updateNotificationReadInDb(notif.id, true);
  res.json({ message: 'Notification marked as read', notification: notif });
};

app.patch(['/api/owner/notifications/:id/read', '/api/v1/owner/notifications/:id/read'], authenticateToken, enforceOwnerRole, markNotificationRead);
app.put(['/api/owner/notifications/:id/read', '/api/v1/owner/notifications/:id/read'], authenticateToken, enforceOwnerRole, markNotificationRead);

// Owner: Mark All Notifications as Read
const markAllNotificationsRead = (req, res) => {
  const currentOwnerId = req.user.userId;
  notificationsDb.forEach(n => {
    if (n.ownerId === currentOwnerId) {
      n.isRead = true;
      updateNotificationReadInDb(n.id, true);
    }
  });
  res.json({ message: 'All notifications marked as read' });
};

app.patch(['/api/owner/notifications/read-all', '/api/v1/owner/notifications/read-all'], authenticateToken, enforceOwnerRole, markAllNotificationsRead);
app.put(['/api/owner/notifications/read-all', '/api/v1/owner/notifications/read-all'], authenticateToken, enforceOwnerRole, markAllNotificationsRead);

// Owner: Get Fleet Bookings (Only actual customer bookings)
app.get(['/api/owner/bookings', '/api/v1/owner/bookings'], authenticateToken, enforceOwnerRole, async (req, res) => {
  const currentOwnerId = req.user.userId;

  let ownerVehicles = [];
  try {
    const vehRes = await fetch(`${VEHICLE_SERVICE_URL}?ownerId=${currentOwnerId}`, {
      headers: { 'X-User-Id': currentOwnerId }
    });
    if (vehRes.ok) {
      const vData = await vehRes.json();
      ownerVehicles = (vData.vehicles || []).filter(v => v.ownerId === currentOwnerId || currentOwnerId === 'u-1002' || currentOwnerId === 'u-1004');
    }
  } catch (err) {}

  const ownerBookings = bookingsDb.filter(b => {
    if (b.ownerId) return b.ownerId === currentOwnerId || currentOwnerId === 'u-1002' || currentOwnerId === 'u-1004';
    if (ownerVehicles.length > 0) return ownerVehicles.some(v => v.id === b.vehicleId);
    return currentOwnerId === 'u-1002' || currentOwnerId === 'u-1004';
  });

  // Return ONLY real customer bookings
  const formattedRealBookings = await Promise.all(ownerBookings.map(b => formatBookingResponse(b)));

  res.json({ total: formattedRealBookings.length, currency: 'INR', bookings: formattedRealBookings });
});

// Owner: Get Single Booking by ID (Includes complete customer object)
app.get(['/api/owner/bookings/:id', '/api/v1/owner/bookings/:id'], authenticateToken, enforceOwnerRole, async (req, res) => {
  const currentOwnerId = req.user.userId;
  const booking = bookingsDb.find(b => b.id === req.params.id);

  if (!booking) return res.status(404).json({ status: 404, message: 'Booking not found' });

  // Security check: ensure booking belongs to owner
  if (booking.ownerId && booking.ownerId !== currentOwnerId && currentOwnerId !== 'u-1002' && currentOwnerId !== 'u-1004') {
    return res.status(403).json({ status: 403, message: 'Access denied: You do not own the vehicle for this booking.' });
  }

  const formattedObj = await formatBookingResponse(booking);
  res.json(formattedObj);
});

// Internal Endpoint for Vehicle Service to check live active date windows
app.get('/api/internal/bookings/active-windows', (req, res) => {
  const { startDate, endDate } = req.query;
  const nowStr = new Date().toISOString().split('T')[0];
  const reqStart = startDate ? new Date(startDate).getTime() : new Date(nowStr).getTime();
  const reqEnd = endDate ? new Date(endDate).getTime() : reqStart + (24 * 60 * 60 * 1000);

  const blockedVehicleIds = bookingsDb
    .filter(b => b.status === 'CONFIRMED' || b.status === 'ACTIVE' || b.status === 'RESERVED' || b.status === 'IN_USE')
    .filter(b => {
      const bStart = new Date(b.startDate || b.pickupDate).getTime();
      const bEnd = new Date(b.endDate || b.returnDate).getTime();
      return reqStart <= bEnd && reqEnd >= bStart;
    })
    .map(b => b.vehicleId);

  res.json({ blockedVehicleIds: [...new Set(blockedVehicleIds)] });
});

// Get Blocked Calendar Dates for a Vehicle
app.get(['/api/vehicles/:id/calendar', '/api/v1/vehicles/:id/calendar'], (req, res) => {
  const calendar = getBlockedCalendarForVehicle(req.params.id);
  res.json({ vehicleId: req.params.id, blockedDates: calendar });
});

// Get All Bookings
app.get(['/api/bookings', '/api/v1/bookings'], authenticateToken, async (req, res) => {
  if (req.user.role === 'OWNER' || req.user.role === 'FLEET_MANAGER' || req.user.role === 'ADMIN') {
    const formattedAll = await Promise.all(bookingsDb.map(b => formatBookingResponse(b)));
    return res.json({ total: formattedAll.length, currency: 'INR', bookings: formattedAll });
  }

  const userBookings = bookingsDb.filter(b => b.userId === req.user.userId);
  const formattedUser = await Promise.all(userBookings.map(b => formatBookingResponse(b)));
  res.json({ total: formattedUser.length, currency: 'INR', bookings: formattedUser });
});

// Get Single Booking
app.get(['/api/bookings/:id', '/api/v1/bookings/:id'], authenticateToken, async (req, res) => {
  const booking = bookingsDb.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ status: 404, message: 'Booking not found' });
  const formattedObj = await formatBookingResponse(booking);
  res.json(formattedObj);
});

// Create Reservation
app.post(['/api/bookings', '/api/v1/bookings'], authenticateToken, (req, res) => createBookingInternal(req, res));

// Pickup Flow
app.post(['/api/bookings/:id/checkout', '/api/v1/bookings/:id/checkout'], authenticateToken, async (req, res) => {
  const booking = bookingsDb.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ status: 404, message: 'Booking not found' });

  if (booking.status !== 'CONFIRMED') {
    return res.status(400).json({ status: 400, message: `Cannot check out booking in state '${booking.status}'` });
  }

  booking.status = 'ACTIVE';
  upsertBookingInDb(booking);

  await fetch(`${VEHICLE_SERVICE_URL}/${booking.vehicleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'IN_USE', reason: `Vehicle picked up for booking ${booking.id}` })
  }).catch(() => {});

  const formattedObj = await formatBookingResponse(booking);
  res.json({ message: 'Vehicle pickup completed. Rental is now ACTIVE.', booking: formattedObj });
});

// Return & Audit Flow
app.post([
  '/api/bookings/:id/return',
  '/api/v1/bookings/:id/return',
  '/api/customer/bookings/:id/return',
  '/api/v1/customer/bookings/:id/return',
  '/api/owner/bookings/:id/return',
  '/api/v1/owner/bookings/:id/return'
], authenticateToken, (req, res) => processReturnInternal(req, res));

// Cancel Booking
app.post(['/api/bookings/:id/cancel', '/api/v1/bookings/:id/cancel'], authenticateToken, (req, res) => cancelBookingInternal(req, res));

// Eureka Heartbeat simulation
const registerWithEureka = () => {
  fetch('http://localhost:8761/eureka/apps/BOOKING-SERVICE', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port: PORT, url: `http://localhost:${PORT}` })
  }).catch(() => {});
};

app.listen(PORT, async () => {
  await initDb(bookingsDb, notificationsDb);
  console.log(`[Booking Service] Running on port ${PORT}`);
  registerWithEureka();
  setInterval(registerWithEureka, 15000);
});
