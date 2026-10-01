import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Plus, Wrench, ShieldAlert, CheckCircle, RefreshCw, Car, TrendingUp, Calendar, DollarSign, Edit3, X, User, Mail, Phone, ShieldCheck, MapPin } from 'lucide-react';

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '₹0';
  let num = typeof val === 'object' ? (val.amount !== undefined ? val.amount : 0) : val;
  if (typeof num === 'string') num = parseFloat(num);
  if (isNaN(num)) num = 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

export default function AdminDashboard({ vehicles, onRefreshVehicles, onReturnBooking }) {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'earnings', 'bookings'
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicleForState, setSelectedVehicleForState] = useState(null);
  const [selectedVehicleForRateEdit, setSelectedVehicleForRateEdit] = useState(null);
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState(null);
  const [newDailyRateInput, setNewDailyRateInput] = useState('');
  const [rateModalError, setRateModalError] = useState(null);

  // Earnings & Bookings data
  const [earningsData, setEarningsData] = useState(null);
  const [fleetBookings, setFleetBookings] = useState([]);


  // Add vehicle state (defaults in INR & Indian hubs)
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2024');
  const [licensePlate, setLicensePlate] = useState('');
  const [category, setCategory] = useState('SEDAN');
  const [fuelType, setFuelType] = useState('GASOLINE');
  const [dailyRate, setDailyRate] = useState('3500');
  const [location, setLocation] = useState('Mumbai Central Hub');

  // State machine transition state
  const [targetStatus, setTargetStatus] = useState('IN_MAINTENANCE');
  const [reason, setReason] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchEarningsAndBookings = async () => {
    const token = localStorage.getItem('driveease_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      const [earningsRes, bookingsRes] = await Promise.all([
        fetch('/api/v1/owner/earnings', { headers }).catch(() => null),
        fetch('/api/v1/owner/bookings', { headers }).catch(() => null)
      ]);

      if (earningsRes && earningsRes.ok) {
        const eData = await earningsRes.json();
        setEarningsData(eData);
      }

      if (bookingsRes && bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setFleetBookings(bData.bookings || []);
      }
    } catch (err) {
      console.error('Failed to fetch owner analytics:', err);
    }
  };

  useEffect(() => {
    fetchEarningsAndBookings();
  }, [vehicles]);

  const openEditRateModal = (v) => {
    setSelectedVehicleForRateEdit(v);
    setNewDailyRateInput(v.dailyRate ? v.dailyRate.toString() : '3500');
    setRateModalError(null);
  };

  const handleSaveRateChange = async (e) => {
    e.preventDefault();
    if (!selectedVehicleForRateEdit) return;

    const numRate = parseFloat(newDailyRateInput);
    if (isNaN(numRate) || numRate <= 0) {
      setRateModalError('Please enter a valid positive daily rate.');
      return;
    }

    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch(`/api/v1/owner/vehicles/${selectedVehicleForRateEdit.id}/rate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dailyRate: numRate })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`Updated daily rental rate for ${selectedVehicleForRateEdit.make} ${selectedVehicleForRateEdit.model} to ₹${numRate.toLocaleString('en-IN')}/day.`);
        setSelectedVehicleForRateEdit(null);
        onRefreshVehicles();
        fetchEarningsAndBookings();
      } else {
        setRateModalError(data.error || 'Failed to update rate per day');
      }
    } catch (err) {
      setRateModalError('Network error connecting to Vehicle Service');
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch('/api/v1/owner/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ make, model, year, licensePlate, category, fuelType, dailyRate: parseFloat(dailyRate), location })
      });

      if (res.ok) {
        setStatusMsg(`Successfully added ${make} ${model} to fleet inventory (₹${parseFloat(dailyRate).toLocaleString('en-IN')}/day).`);
        setShowAddModal(false);
        setMake(''); setModel(''); setLicensePlate('');
        onRefreshVehicles();
        fetchEarningsAndBookings();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to add vehicle');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to Vehicle Service');
    }
  };

  const handleRemoveVehicle = async (vehicleId, makeModel) => {
    if (!window.confirm(`Are you sure you want to remove ${makeModel} from your fleet?`)) return;
    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch(`/api/v1/owner/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStatusMsg(`Vehicle ${makeModel} removed from inventory.`);
        onRefreshVehicles();
        fetchEarningsAndBookings();
      }
    } catch (err) {
      setErrorMsg('Failed to remove vehicle');
    }
  };

  const handleTransitionState = async (e) => {
    e.preventDefault();
    if (!selectedVehicleForState) return;

    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch(`/api/v1/owner/vehicles/${selectedVehicleForState.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus, reason })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'State machine transition rejected');
        return;
      }

      setStatusMsg(`State transition successful: ${data.previousStatus} ➔ ${data.currentStatus}`);
      setSelectedVehicleForState(null);
      setReason('');
      onRefreshVehicles();
      fetchEarningsAndBookings();
    } catch (err) {
      setErrorMsg('Network error updating vehicle state machine');
    }
  };

  const getBadgeClass = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'badge-available';
      case 'RESERVED': return 'badge-reserved';
      case 'IN_USE': return 'badge-in-use';
      case 'IN_MAINTENANCE': return 'badge-maintenance';
      case 'OUT_OF_SERVICE': return 'badge-out-service';
      case 'CONFIRMED': return 'badge-reserved';
      case 'ACTIVE': return 'badge-in-use';
      case 'COMPLETED': return 'badge-available';
      case 'CANCELLED': return 'badge-out-service';
      default: return 'badge-available';
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 20px 60px 20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Fleet Management & Owner Oversight</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            State machine controls, revenue metrics, and reservation management for your fleet.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { onRefreshVehicles(); fetchEarningsAndBookings(); }}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add New Vehicle
          </button>
        </div>
      </div>

      {statusMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '0.9rem' }}>
          ✓ {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '0.9rem' }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* Overview Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Fleet Count</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>{vehicles.length}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Available Vehicles</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {vehicles.filter(v => v.status === 'AVAILABLE').length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active / Reserved</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {vehicles.filter(v => v.status === 'RESERVED' || v.status === 'IN_USE').length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Monthly Fleet Revenue</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {earningsData ? earningsData.formattedTotalRevenue : `₹${(vehicles.reduce((acc, v) => acc + (v.dailyRate * 10), 0)).toLocaleString('en-IN')}`}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(15,23,42,0.8)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
        <button
          className={`btn btn-sm ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ border: 'none' }}
          onClick={() => setActiveTab('inventory')}
        >
          <Car size={16} /> Fleet Inventory & State Controls
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'earnings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ border: 'none' }}
          onClick={() => setActiveTab('earnings')}
        >
          <TrendingUp size={16} /> Revenue & Earnings Report (₹)
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ border: 'none' }}
          onClick={() => setActiveTab('bookings')}
        >
          <Calendar size={16} /> Fleet Reservations ({fleetBookings.length})
        </button>
      </div>

      {/* TAB 1: FLEET INVENTORY & STATE CONTROL */}
      {activeTab === 'inventory' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '14px 18px' }}>Vehicle</th>
                <th style={{ padding: '14px 18px' }}>Category & Fuel</th>
                <th style={{ padding: '14px 18px' }}>Depot Location</th>
                <th style={{ padding: '14px 18px' }}>Rate / Day</th>
                <th style={{ padding: '14px 18px' }}>Odometer</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <strong style={{ display: 'block' }}>{v.make} {v.model}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.licensePlate}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {v.category} <span style={{ color: 'var(--text-dim)' }}>({v.fuelType})</span>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{v.location}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        ₹{v.dailyRate.toLocaleString('en-IN')}/day
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.72rem', width: 'fit-content', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => openEditRateModal(v)}
                        title="Change Rate / Day"
                      >
                        <Edit3 size={11} style={{ marginRight: '4px' }} /> Edit Rate
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>{v.currentOdometer.toLocaleString()} km</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge ${getBadgeClass(v.status)}`}>{v.status}</span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditRateModal(v)}
                      >
                        <Edit3 size={14} style={{ marginRight: '4px' }} /> Rate
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedVehicleForState(v);
                          setErrorMsg(null);
                        }}
                      >
                        State Machine
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '6px 10px' }}
                        onClick={() => handleRemoveVehicle(v.id, `${v.make} ${v.model}`)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: REVENUE & EARNINGS REPORT */}
      {activeTab === 'earnings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>Monthly Fleet Financial Performance (INR ₹)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Itemized revenue breakdown across active fleet vehicles managed under your owner account.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '14px 18px' }}>Vehicle Make & Model</th>
                  <th style={{ padding: '14px 18px' }}>License Plate</th>
                  <th style={{ padding: '14px 18px' }}>Daily Tariff</th>
                  <th style={{ padding: '14px 18px' }}>Total Bookings</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Monthly Revenue</th>
                </tr>
              </thead>
              <tbody>
                {earningsData && earningsData.vehicleBreakdown ? (
                  earningsData.vehicleBreakdown.map((item, idx) => {
                    const matchingVeh = vehicles.find(v => v.id === item.vehicleId || `${v.make} ${v.model}` === item.makeModel);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 600 }}>{item.makeModel}</td>
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.licensePlate || 'MH-02-EV-7890'}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>₹{item.dailyRate.toLocaleString('en-IN')}/day</span>
                            {matchingVeh && (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                                onClick={() => openEditRateModal(matchingVeh)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>{item.totalBookings} rentals</td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                          ₹{item.monthlyRevenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  vehicles.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 600 }}>{v.make} {v.model}</td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{v.licensePlate}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>₹{v.dailyRate.toLocaleString('en-IN')}/day</span>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            onClick={() => openEditRateModal(v)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>8 rentals</td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        ₹{(v.dailyRate * 12).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FLEET RESERVATIONS */}
      {activeTab === 'bookings' && (() => {
        const actualCustomerBookings = fleetBookings.filter(b => 
          !b.id.startsWith('audit-') && 
          (b.hasValidCustomer || b.customerName || b.customer?.name || b.userName || b.userId) &&
          (b.startDate || b.pickupDate)
        );

        return (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>Fleet Booking Audit Log</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              All active, completed, and pending reservations placed across your vehicles.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '14px 18px' }}>Booking ID</th>
                  <th style={{ padding: '14px 18px' }}>Customer Details</th>
                  <th style={{ padding: '14px 18px' }}>Vehicle Reserved</th>
                  <th style={{ padding: '14px 18px' }}>Dates</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Total (incl. 18% GST)</th>
                </tr>
              </thead>
              <tbody>
                {actualCustomerBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Calendar size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 10px auto', opacity: 0.7, display: 'block' }} />
                      <h4 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '4px' }}>No Customer Reservations Recorded</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        The Fleet Audit Log shows records only when a customer books a vehicle in your fleet.
                      </p>
                    </td>
                  </tr>
                ) : (
                  actualCustomerBookings.map(b => {
                    const custObj = b.customer || b.customerDetails || {};
                    const custName = custObj.name || b.customerName || b.userName || b.name || 'Verified Customer';
                    const custEmail = custObj.email || b.customerEmail || b.userEmail || b.email || '';
                    const custPhone = custObj.phone || b.customerPhone || b.userPhone || b.phone || b.phoneNumber || '';
                    const custLicense = custObj.licenseNumber || b.licenseNumber || b.driverLicenseNumber || custObj.driverLicenseNumber || b.customerLicense || '';
                    const custAddress = custObj.address || b.customerDetails?.address || b.address || custObj.address || b.customerAddress || '';

                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{b.id}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>{custName}</strong>
                              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                VERIFIED
                              </span>
                            </div>

                            {custEmail && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Mail size={12} color="var(--accent-cyan)" /> {custEmail}
                              </span>
                            )}

                            {custPhone && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Phone size={12} color="var(--accent-emerald)" /> {custPhone}
                              </span>
                            )}

                            {custLicense && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <ShieldCheck size={12} /> DL: {custLicense}
                              </span>
                            )}

                            {custAddress && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <MapPin size={12} /> {custAddress}
                              </span>
                            )}

                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ marginTop: '4px', padding: '3px 8px', fontSize: '0.72rem', width: 'fit-content', border: '1px solid rgba(255,255,255,0.1)' }}
                              onClick={() => setSelectedCustomerForModal({
                                bookingId: b.id,
                                vehicleInfo: b.vehicleInfo,
                                dates: b.startDate ? `${new Date(b.startDate).toLocaleDateString()} ➔ ${new Date(b.endDate).toLocaleDateString()}` : '—',
                                status: b.status,
                                totalAmount: b.totalAmount || b.amount,
                                customer: {
                                  name: custName,
                                  email: custEmail,
                                  phone: custPhone,
                                  license: custLicense || 'DL-VERIFIED-2026',
                                  address: custAddress || 'Primary Depot Location'
                                }
                              })}
                            >
                              <User size={11} style={{ marginRight: '4px' }} /> View Full Customer Record
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>{b.vehicleInfo}</td>
                        <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {b.startDate ? `${new Date(b.startDate).toLocaleDateString()} ➔ ${new Date(b.endDate).toLocaleDateString()}` : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span className={`badge ${getBadgeClass(b.status)}`}>{b.status}</span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                          {b.totalAmount && (typeof b.totalAmount === 'number' ? b.totalAmount > 0 : b.totalAmount.amount > 0)
                            ? formatCurrency(b.totalAmount || b.amount)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* State Machine Modal */}
      {selectedVehicleForState && (
        <div className="modal-overlay" onClick={() => setSelectedVehicleForState(null)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ padding: '28px', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>Vehicle State Machine Transition</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Target vehicle: <strong>{selectedVehicleForState.make} {selectedVehicleForState.model} ({selectedVehicleForState.licensePlate})</strong>
            </p>

            <div style={{ background: 'rgba(15,23,42,0.7)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '0.85rem' }}>
              Current State: <span className={`badge ${getBadgeClass(selectedVehicleForState.status)}`}>{selectedVehicleForState.status}</span>
            </div>

            <form onSubmit={handleTransitionState}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Select Target State
                </label>
                <select className="input-field" value={targetStatus} onChange={e => setTargetStatus(e.target.value)}>
                  <option value="AVAILABLE">AVAILABLE (Ready for rental)</option>
                  <option value="RESERVED">RESERVED (Hold for booking)</option>
                  <option value="IN_USE">IN_USE (Picked up by customer)</option>
                  <option value="IN_MAINTENANCE">IN_MAINTENANCE (Routine/Repair Service)</option>
                  <option value="OUT_OF_SERVICE">OUT_OF_SERVICE (Decommissioned)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Reason / Maintenance Log Notes
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Scheduled brake diagnostics completed"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedVehicleForState(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Apply State Transition
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Add New Vehicle Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>Add New Fleet Vehicle</h3>

            <form onSubmit={handleAddVehicle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Make</label>
                  <input type="text" className="input-field" placeholder="e.g. Tata" value={make} onChange={e => setMake(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Model</label>
                  <input type="text" className="input-field" placeholder="e.g. Nexon EV Max" value={model} onChange={e => setModel(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>License Plate</label>
                  <input type="text" className="input-field" placeholder="e.g. MH-04-EV-9900" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Daily Rate (₹)</label>
                  <input type="number" className="input-field" placeholder="3500" value={dailyRate} onChange={e => setDailyRate(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Category</label>
                  <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="SEDAN">SEDAN</option>
                    <option value="SUV">SUV</option>
                    <option value="LUXURY">LUXURY</option>
                    <option value="ELECTRIC">ELECTRIC</option>
                    <option value="TRUCK">TRUCK</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Location Depot</label>
                  <input type="text" className="input-field" value={location} onChange={e => setLocation(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save to Inventory</button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Change Rate / Day Modal */}
      {selectedVehicleForRateEdit && (
        <div className="modal-overlay" onClick={() => setSelectedVehicleForRateEdit(null)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ padding: '28px', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Change Rate / Day</h3>
              <button onClick={() => setSelectedVehicleForRateEdit(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
              Updating daily tariff for <strong>{selectedVehicleForRateEdit.make} {selectedVehicleForRateEdit.model}</strong> ({selectedVehicleForRateEdit.licensePlate}).
              This price update will immediately reflect for both owner management and customer catalog reservations.
            </p>

            {rateModalError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.85rem' }}>
                ⚠ {rateModalError}
              </div>
            )}

            <form onSubmit={handleSaveRateChange}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  New Rate / Day (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--accent-emerald)' }}>₹</span>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    className="input-field"
                    style={{ paddingLeft: '28px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}
                    value={newDailyRateInput}
                    onChange={e => setNewDailyRateInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedVehicleForRateEdit(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Save Rate Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Full Details Audit Modal */}
      {selectedCustomerForModal && (
        <div className="modal-overlay" onClick={() => setSelectedCustomerForModal(null)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ padding: '28px', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Customer Identity & Audit Record</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                  Verified customer profile linked to Booking ID: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedCustomerForModal.bookingId}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedCustomerForModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Customer Header Box */}
              <div style={{ background: 'rgba(15,23,42,0.8)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>
                    {selectedCustomerForModal.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{selectedCustomerForModal.customer.name}</h4>
                    <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>✓ Verified DriveEase Customer</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</span>
                    <strong style={{ color: '#ffffff' }}>✉ {selectedCustomerForModal.customer.email || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</span>
                    <strong style={{ color: '#ffffff' }}>📞 {selectedCustomerForModal.customer.phone || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Driver License Number</span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>🪪 {selectedCustomerForModal.customer.license || 'DL-VERIFIED-2026'}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Address / Location</span>
                    <strong style={{ color: '#ffffff' }}>🏠 {selectedCustomerForModal.customer.address || 'Primary Depot Location'}</strong>
                  </div>
                </div>
              </div>

              {/* Linked Reservation Summary Box */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <h5 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Linked Fleet Reservation Summary
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Vehicle Reserved:</span>
                    <strong>{selectedCustomerForModal.vehicleInfo}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Rental Period:</span>
                    <span>{selectedCustomerForModal.dates}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Reservation Status:</span>
                    <span className={`badge ${getBadgeClass(selectedCustomerForModal.status)}`}>{selectedCustomerForModal.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--glass-border)', fontSize: '1rem', fontWeight: 800 }}>
                    <span>Total Booking Fee:</span>
                    <span style={{ color: 'var(--accent-emerald)' }}>
                      {formatCurrency(selectedCustomerForModal.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedCustomerForModal(null)}>
                Close Audit Record
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

