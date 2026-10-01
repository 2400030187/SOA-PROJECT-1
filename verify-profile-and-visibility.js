const GATEWAY_URL = 'http://localhost:8080';

async function request(path, options = {}) {
  const url = `${GATEWAY_URL}${path}`;
  const headers = options.headers || {};
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

async function runTestSuite() {
  console.log('===========================================================');
  console.log('🧪 DRIVE EASE PROFILE & VISIBILITY CORRECTION VERIFICATION');
  console.log('===========================================================\n');

  const results = [];
  const recordResult = (num, title, passed, details = '') => {
    const symbol = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${symbol} [Test ${num}] ${title}`);
    if (details) console.log(`   └─ Details: ${details}`);
    results.push({ num, title, passed, details });
  };

  try {
    // -------------------------------------------------------------
    // SETUP: Register & Login Owner and Customer
    // -------------------------------------------------------------
    const timestamp = Date.now();
    const ownerEmail = `owner_${timestamp}@gmail.com`;
    const ownerPassword = 'ownerPassword123';
    const ownerReg = await request('/api/owner/register', {
      method: 'POST',
      body: {
        email: ownerEmail,
        password: ownerPassword,
        name: 'Samantha Connor',
        phone: '+91-98765-11111',
        businessName: 'Connor Fleet Logistics',
        gstin: '27AAAAA1111A1Z1'
      }
    });
    const ownerToken = ownerReg.body.accessToken || ownerReg.body.token;

    const customerEmail = `customer_${timestamp}@gmail.com`;
    const customerPassword = 'custPassword123';
    const customerReg = await request('/api/customer/register', {
      method: 'POST',
      body: {
        email: customerEmail,
        password: customerPassword,
        name: 'David Miller',
        phone: '+91-98765-22222',
        driverLicenseNumber: 'DL-555666777',
        address: '789 Innovation Way, Mumbai'
      }
    });
    const customerToken = customerReg.body.accessToken || customerReg.body.token;

    // -------------------------------------------------------------
    // Test 1: Owner fetches own profile -> matches registered data
    // -------------------------------------------------------------
    const t1Res = await request('/api/owner/profile', {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const t1Pass = t1Res.status === 200 &&
      t1Res.body.email === ownerEmail &&
      t1Res.body.name === 'Samantha Connor' &&
      t1Res.body.businessName === 'Connor Fleet Logistics' &&
      t1Res.body.gstin === '27AAAAA1111A1Z1';
    recordResult(1, 'Owner fetches own profile -> matches registered data', t1Pass, `Status ${t1Res.status}: name="${t1Res.body.name}", businessName="${t1Res.body.businessName}"`);

    // -------------------------------------------------------------
    // Test 2: Owner updates phone and business name -> GET reflects change
    // -------------------------------------------------------------
    const newOwnerPhone = '+91-98765-99999';
    const newBusinessName = 'Connor Apex Mobility';
    const t2Put = await request('/api/owner/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ownerToken}` },
      body: { phone: newOwnerPhone, businessName: newBusinessName, gstin: '27AAAAA9999A1Z9' }
    });
    const t2Get = await request('/api/owner/profile', {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const t2Pass = t2Put.status === 200 && t2Get.status === 200 &&
      (t2Get.body.phone === newOwnerPhone || t2Get.body.phoneNumber === newOwnerPhone) &&
      t2Get.body.businessName === newBusinessName;
    recordResult(2, 'Owner updates phone and business name -> GET reflects change', t2Pass, `Phone: ${t2Get.body.phone}, BusinessName: ${t2Get.body.businessName}`);

    // -------------------------------------------------------------
    // Test 3: Owner attempts to edit profile using a CUSTOMER token -> 403
    // -------------------------------------------------------------
    const t3Res = await request('/api/owner/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${customerToken}` },
      body: { name: 'Hacker Name' }
    });
    const t3Pass = t3Res.status === 403;
    recordResult(3, 'Owner attempts to edit profile using CUSTOMER token -> 403', t3Pass, `Status: ${t3Res.status} (Expected 403)`);

    // -------------------------------------------------------------
    // Test 4: Customer updates address and license number -> GET reflects change
    // -------------------------------------------------------------
    const newAddress = '999 Heights Tower, Bandra West, Mumbai';
    const newLicense = 'DL-999000111';
    const t4Put = await request('/api/customer/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${customerToken}` },
      body: { address: newAddress, licenseNumber: newLicense }
    });
    const t4Get = await request('/api/customer/profile', {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const t4Pass = t4Put.status === 200 && t4Get.status === 200 &&
      t4Get.body.address === newAddress &&
      (t4Get.body.licenseNumber === newLicense || t4Get.body.driverLicenseNumber === newLicense);
    recordResult(4, 'Customer updates address and license number -> GET reflects change', t4Pass, `Address: ${t4Get.body.address}, License: ${t4Get.body.licenseNumber}`);

    // -------------------------------------------------------------
    // Test 5: Customer changes password with correct current password + valid new password -> success, can log in with new password afterward
    // -------------------------------------------------------------
    const newCustPassword = 'newSecretPassword123';
    const t5Put = await request('/api/customer/profile/password', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${customerToken}` },
      body: { currentPassword: customerPassword, newPassword: newCustPassword }
    });
    const t5Login = await request('/api/customer/login', {
      method: 'POST',
      body: { email: customerEmail, password: newCustPassword }
    });
    const t5Pass = t5Put.status === 200 && t5Login.status === 200 && (t5Login.body.token || t5Login.body.accessToken);
    recordResult(5, 'Customer changes password with valid current/new password -> success & login', t5Pass, `Put status: ${t5Put.status}, Login status: ${t5Login.status}`);

    // Update customer token for subsequent tests
    const activeCustomerToken = t5Login.body.accessToken || t5Login.body.token || customerToken;

    // -------------------------------------------------------------
    // Test 6: Customer changes password with wrong current password -> 401
    // -------------------------------------------------------------
    const t6Res = await request('/api/customer/profile/password', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${activeCustomerToken}` },
      body: { currentPassword: 'WRONG_PASSWORD', newPassword: 'anotherNewPassword123' }
    });
    const t6Pass = t6Res.status === 401;
    recordResult(6, 'Customer changes password with wrong current password -> 401', t6Pass, `Status: ${t6Res.status} (Expected 401)`);

    // -------------------------------------------------------------
    // Test 7: Customer changes password with 4-character new password -> 400
    // -------------------------------------------------------------
    const t7Res = await request('/api/customer/profile/password', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${activeCustomerToken}` },
      body: { currentPassword: newCustPassword, newPassword: '1234' }
    });
    const t7Pass = t7Res.status === 400;
    recordResult(7, 'Customer changes password with < 6 chars new password -> 400', t7Pass, `Status: ${t7Res.status} (Expected 400)`);

    // -------------------------------------------------------------
    // PART 1 TEST: Create booking -> call GET /api/owner/bookings as owner -> confirm response includes complete customer object (name, email, phone, licenseNumber, address, vehicle, dates, totalAmount)
    // -------------------------------------------------------------
    // Login Owner 1 (owner12@gmail.com) who owns vehicle v-101 / v-102
    const defaultOwnerLogin = await request('/api/owner/login', {
      method: 'POST',
      body: { email: 'owner12@gmail.com', password: '123456' }
    });
    const defaultOwnerToken = defaultOwnerLogin.body.accessToken || defaultOwnerLogin.body.token;

    // Pick an available vehicle from owner's fleet
    const vehiclesRes = await request('/api/vehicles');
    const vehList = Array.isArray(vehiclesRes.body) ? vehiclesRes.body : (vehiclesRes.body.vehicles || []);
    const targetVeh = vehList.find(v => v.status === 'AVAILABLE') || vehList[0] || { id: 'v-101' };

    const pickDateMs = Date.now() + (Math.floor(Math.random() * 10000) + 100) * 86400000;
    const dropDateMs = pickDateMs + 86400000 * 3;

    const bookingRes = await request('/api/customer/bookings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${activeCustomerToken}` },
      body: {
        vehicleId: targetVeh.id,
        pickupDate: new Date(pickDateMs).toISOString(),
        returnDate: new Date(dropDateMs).toISOString()
      }
    });
    const bookingId = bookingRes.body.id;

    const ownerBookingsRes = await request('/api/owner/bookings', {
      headers: { 'Authorization': `Bearer ${defaultOwnerToken}` }
    });

    const targetBooking = (ownerBookingsRes.body.bookings || []).find(b => b.id === bookingId);

    const part1Pass = ownerBookingsRes.status === 200 && targetBooking &&
      targetBooking.customer &&
      typeof targetBooking.customer.name === 'string' && targetBooking.customer.name.length > 0 &&
      typeof targetBooking.customer.email === 'string' && targetBooking.customer.email.length > 0 &&
      typeof targetBooking.customer.phone === 'string' && targetBooking.customer.phone.length > 0 &&
      typeof targetBooking.customer.licenseNumber === 'string' && targetBooking.customer.licenseNumber.length > 0 &&
      typeof targetBooking.customer.address === 'string' && targetBooking.customer.address.length > 0 &&
      targetBooking.vehicle && (targetBooking.pickupDate || targetBooking.startDate) &&
      targetBooking.totalAmount && typeof targetBooking.totalAmount.amount === 'number' && targetBooking.totalAmount.currency === 'INR';

    recordResult('1B', 'Owner visibility test: GET /api/owner/bookings returns COMPLETE customer object (name, email, phone, licenseNumber, address)', part1Pass,
      targetBooking ? `Customer Object: ${JSON.stringify(targetBooking.customer)}` : 'Booking not found'
    );

    // -------------------------------------------------------------
    // Test 8: After customer updates phone number, GET /api/owner/bookings reflects UPDATED phone number (live read-time resolution)
    // -------------------------------------------------------------
    const updatedCustomerPhone = '+91-98765-77777';
    await request('/api/customer/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${activeCustomerToken}` },
      body: { phone: updatedCustomerPhone }
    });

    const ownerBookingsFresh = await request('/api/owner/bookings', {
      headers: { 'Authorization': `Bearer ${defaultOwnerToken}` }
    });

    const freshBooking = (ownerBookingsFresh.body.bookings || []).find(b => b.id === bookingId);
    const t8Pass = freshBooking && freshBooking.customer && freshBooking.customer.phone === updatedCustomerPhone;
    recordResult(8, 'Owner sees updated customer phone on existing booking after customer profile edit', t8Pass,
      freshBooking ? `Resolved Phone: ${freshBooking.customer?.phone} (Expected: ${updatedCustomerPhone})` : 'Booking not found'
    );

  } catch (err) {
    console.error('Test execution exception:', err);
  }

  console.log('\n===========================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`TOTAL RESULT: ${passedCount}/${results.length} PASSED`);
  console.log('===========================================================');
}

runTestSuite();
