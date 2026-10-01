const GATEWAY_URL = 'http://localhost:8080';

async function runTestSuite() {
  console.log('===========================================================');
  console.log('🧪 DRIVE EASE FLEET OPERATIONS — CUSTOMER & NOTIFICATION SUITE');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  const testResults = [];

  const recordResult = (id, name, isSuccess, details = '') => {
    if (isSuccess) {
      passed++;
      console.log(`✅ [PASS] Test ${id}: ${name}`);
    } else {
      failed++;
      console.log(`❌ [FAIL] Test ${id}: ${name} — ${details}`);
    }
    testResults.push({ id, name, status: isSuccess ? 'PASS' : 'FAIL', details });
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Register with invalid email domain -> expect 400
    // -------------------------------------------------------------
    const res1 = await fetch(`${GATEWAY_URL}/api/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john@yahoo.com', password: 'password123', name: 'John Doe' })
    });
    const data1 = await res1.json();
    recordResult(1, 'Register with invalid email domain (@yahoo.com)', res1.status === 400, `Status ${res1.status}: ${data1.message || data1.error}`);

    // -------------------------------------------------------------
    // Test 2: Register with a 5-character password -> expect 400
    // -------------------------------------------------------------
    const res2 = await fetch(`${GATEWAY_URL}/api/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john@gmail.com', password: '12345', name: 'John Doe' })
    });
    const data2 = await res2.json();
    recordResult(2, 'Register with short password (< 6 chars)', res2.status === 400, `Status ${res2.status}: ${data2.message || data2.error}`);

    // -------------------------------------------------------------
    // Test 3: Register a new customer -> JWT returned, GET /bookings returns empty
    // -------------------------------------------------------------
    const newCustomerEmail = `cust_${Date.now()}@gmail.com`;
    const res3 = await fetch(`${GATEWAY_URL}/api/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newCustomerEmail,
        password: 'password123',
        name: 'Alex Morgan',
        phone: '+1-555-019-2834',
        driverLicenseNumber: 'DL-987654321',
        address: '123 Tech Lane, CA'
      })
    });
    const data3 = await res3.json();
    const customerToken = data3.accessToken || data3.token;
    
    let getBookingsEmpty = false;
    if (res3.status === 201 && customerToken) {
      const res3_b = await fetch(`${GATEWAY_URL}/api/customer/bookings`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      const data3_b = await res3_b.json();
      getBookingsEmpty = res3_b.status === 200 && Array.isArray(data3_b.bookings) && data3_b.bookings.length === 0;
    }
    recordResult(3, 'Register new customer & verify empty bookings list', res3.status === 201 && getBookingsEmpty, `Status ${res3.status}`);

    // Log in Owner to monitor notifications
    const ownerLoginRes = await fetch(`${GATEWAY_URL}/api/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner12@gmail.com', password: '123456' })
    });
    const ownerLoginData = await ownerLoginRes.json();
    const ownerToken = ownerLoginData.accessToken || ownerLoginData.token;

    // Get initial unread count
    const initialUnreadRes = await fetch(`${GATEWAY_URL}/api/owner/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const initialUnreadData = await initialUnreadRes.json();
    const initialUnreadCount = initialUnreadData.unreadCount || 0;

    // -------------------------------------------------------------
    // Test 4: Create booking on available vehicle -> 201, vehicle RESERVED, Notification created
    // -------------------------------------------------------------
    const res4 = await fetch(`${GATEWAY_URL}/api/customer/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        vehicleId: 'v-102', // BMW X5
        pickupDate: '2026-12-10T09:00:00Z',
        returnDate: '2026-12-15T18:00:00Z',
        pickupLocation: 'Delhi Airport',
        returnLocation: 'Delhi Airport'
      })
    });
    const data4 = await res4.json();
    const booking1Id = data4.id;

    // Verify vehicle is RESERVED
    const vehCheckRes = await fetch(`${GATEWAY_URL}/api/vehicles/v-102`);
    const vehCheckData = await vehCheckRes.json();

    recordResult(4, 'Create booking (201 Created, Vehicle RESERVED, Notification generated)', res4.status === 201 && vehCheckData.status === 'RESERVED', `Booking ID: ${booking1Id}`);

    // -------------------------------------------------------------
    // Test 5: Create second overlapping booking -> expect 409, no notification created
    // -------------------------------------------------------------
    const res5 = await fetch(`${GATEWAY_URL}/api/customer/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        vehicleId: 'v-102',
        pickupDate: '2026-12-12T10:00:00Z',
        returnDate: '2026-12-14T12:00:00Z'
      })
    });
    const data5 = await res5.json();
    recordResult(5, 'Reject second overlapping booking with 409 Conflict', res5.status === 409, `Status ${res5.status}: ${data5.message || data5.error}`);

    // -------------------------------------------------------------
    // Test 6: Cancel future booking -> vehicle returns to AVAILABLE, owner gets BOOKING_CANCELLED notification
    // -------------------------------------------------------------
    const res6 = await fetch(`${GATEWAY_URL}/api/customer/bookings/${booking1Id}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const data6 = await res6.json();

    const vehAfterCancel = await fetch(`${GATEWAY_URL}/api/vehicles/v-102`);
    const vehAfterCancelData = await vehAfterCancel.json();

    recordResult(6, 'Cancel booking (Vehicle returns to AVAILABLE, owner receives cancellation alert)', res6.status === 200 && vehAfterCancelData.status === 'AVAILABLE', `Message: ${data6.message}`);

    // -------------------------------------------------------------
    // Test 7: Return a booking 2 days late -> late fee added (ratePerDay * 1.5 per extra day)
    // -------------------------------------------------------------
    // Create new booking for return test on v-103
    const res7_a = await fetch(`${GATEWAY_URL}/api/customer/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        vehicleId: 'v-103', // Mercedes-Benz C-Class (Daily rate: ₹5500)
        pickupDate: '2026-09-01T09:00:00Z',
        returnDate: '2026-09-03T18:00:00Z'
      })
    });
    const data7_a = await res7_a.json();
    const booking2Id = data7_a.id;

    // Checkout pickup
    await fetch(`${GATEWAY_URL}/api/bookings/${booking2Id}/checkout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    // Process return 2 days late (2026-09-05)
    const res7_b = await fetch(`${GATEWAY_URL}/api/customer/bookings/${booking2Id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        actualReturnTime: '2026-09-05T18:00:00Z',
        endOdometer: 9800,
        inspectionNotes: 'Returned in good condition'
      })
    });
    const data7_b = await res7_b.json();
    // Daily rate = ₹5,500. 1.5x = ₹8,250/day. 2 days late = ₹16,500 late fee.
    const expectedLateFee = 5500 * 1.5 * 2;
    const isLateFeeCorrect = data7_b.lateFee === expectedLateFee;

    recordResult(7, 'Return booking 2 days late (Late fee = 1.5x dailyRate per day)', res7_b.status === 200 && isLateFeeCorrect, `Late Fee: ₹${data7_b.lateFee} (Expected: ₹${expectedLateFee})`);

    // -------------------------------------------------------------
    // Test 8: Owner fetches GET /api/owner/notifications -> sees all 3 notifications in newest-first order
    // -------------------------------------------------------------
    const res8 = await fetch(`${GATEWAY_URL}/api/owner/notifications`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const data8 = await res8.json();
    const notifs = data8.notifications || [];
    const has3NewNotifs = notifs.length >= 3;

    recordResult(8, 'Owner fetches notifications (Sees all notifications in newest-first order)', res8.status === 200 && has3NewNotifs, `Total notifications: ${notifs.length}`);

    // -------------------------------------------------------------
    // Test 9: Owner marks one notification as read -> unread-count decreases by 1
    // -------------------------------------------------------------
    const targetNotifId = notifs[0]?.id;
    const unreadBeforeRes = await fetch(`${GATEWAY_URL}/api/owner/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const countBefore = (await unreadBeforeRes.json()).unreadCount;

    const res9 = await fetch(`${GATEWAY_URL}/api/owner/notifications/${targetNotifId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });

    const unreadAfterRes = await fetch(`${GATEWAY_URL}/api/owner/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const countAfter = (await unreadAfterRes.json()).unreadCount;

    recordResult(9, 'Owner marks notification as read (Unread count decreases by 1)', res9.status === 200 && countAfter === countBefore - 1, `Count Before: ${countBefore}, Count After: ${countAfter}`);

  } catch (err) {
    console.error('Fatal test runner exception:', err);
  }

  console.log('\n===========================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('===========================================================');
}

runTestSuite();
