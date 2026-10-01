const http = require('http');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: () => JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, ok: false, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function testCancelActiveBooking() {
  const API_BASE = 'http://localhost:8080';
  
  // 1. Get available vehicle
  const vehRes = await request(`${API_BASE}/api/v1/vehicles`);
  const vehData = await vehRes.json();
  const availVeh = vehData.vehicles.find(v => v.status === 'AVAILABLE');
  console.log('Selected available vehicle:', availVeh.id, availVeh.make, availVeh.model);

  // 2. Register customer
  const custRes = await request(`${API_BASE}/api/v1/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: `testcust_${Date.now()}@gmail.com`,
    password: 'password123',
    name: 'Test Customer',
    phone: '9876543210',
    licenseNumber: 'DL-99999'
  });
  const custData = await custRes.json();
  const token = custData.token;

  // 3. Create booking
  const startYear = 2028; // Future date range to avoid overlap
  const bookRes = await request(`${API_BASE}/api/v1/customer/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    vehicleId: availVeh.id,
    startDate: `${startYear}-05-10T10:00:00.000Z`,
    endDate: `${startYear}-05-15T10:00:00.000Z`,
    pickupLocation: 'Mumbai Central Hub',
    returnLocation: 'Mumbai Central Hub'
  });
  const bookingData = await bookRes.json();
  const bookingId = bookingData.id;
  console.log('Created booking:', bookingId, 'Status:', bookingData.status);

  // 4. Start trip (Checkout) -> ACTIVE state
  const checkoutRes = await request(`${API_BASE}/api/v1/bookings/${bookingId}/checkout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const checkoutData = await checkoutRes.json();
  console.log('Checked out booking:', bookingId, 'Status:', checkoutData.booking ? checkoutData.booking.status : checkoutData.status);

  // 5. Cancel ACTIVE booking
  const cancelRes = await request(`${API_BASE}/api/v1/customer/bookings/${bookingId}/cancel`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const cancelData = await cancelRes.json();
  console.log('Cancel response status code:', cancelRes.status);
  console.log('Cancel response message:', cancelData.message);
  if (cancelRes.ok && cancelData.booking.status === 'CANCELLED') {
    console.log('✅ SUCCESS: Customer can cancel booking in ACTIVE state at any time!');
  } else {
    console.error('❌ FAILED:', cancelData);
    process.exit(1);
  }
}

testCancelActiveBooking();
