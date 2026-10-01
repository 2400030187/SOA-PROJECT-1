import React, { useState } from 'react';
import { X, Calendar, DollarSign, ShieldAlert, CheckCircle, ArrowRight, MapPin } from 'lucide-react';

export default function BookingWizardModal({ vehicle, currentUser, onClose, onSuccessBooking, onOpenAuth }) {
  const today = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(`${today}T09:00`);
  const [endDate, setEndDate] = useState(`${defaultEnd}T18:00`);
  const defaultVehLoc = vehicle ? vehicle.location : 'Mumbai Central Hub';
  
  // Available Hubs list
  const availableHubs = Array.from(new Set([
    defaultVehLoc,
    'Mumbai Central Hub (Dadar West)',
    'Delhi Airport Terminal 3 Hub',
    'Bengaluru Indiranagar Hub',
    'Pune Station Depot',
    'Hyderabad HITECH City Hub',
    'Chennai Airport Hub'
  ]));

  const [selectedPickupHub, setSelectedPickupHub] = useState(defaultVehLoc);
  const [customPickup, setCustomPickup] = useState('');
  const [pickupLocation, setPickupLocation] = useState(defaultVehLoc);
  
  const [sameAsPickup, setSameAsPickup] = useState(true);
  const [selectedReturnHub, setSelectedReturnHub] = useState(defaultVehLoc);
  const [customReturn, setCustomReturn] = useState('');
  const [returnLocation, setReturnLocation] = useState(defaultVehLoc);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!vehicle) return null;

  const handlePickupChange = (val) => {
    setSelectedPickupHub(val);
    let finalPickup = val;
    if (val === 'CUSTOM') {
      finalPickup = customPickup || 'Custom Address';
    }
    setPickupLocation(finalPickup);
    if (sameAsPickup) {
      setSelectedReturnHub(val);
      setCustomReturn(customPickup);
      setReturnLocation(finalPickup);
    }
  };

  const handleCustomPickupChange = (text) => {
    setCustomPickup(text);
    setPickupLocation(text);
    if (sameAsPickup) {
      setCustomReturn(text);
      setReturnLocation(text);
    }
  };

  const handleReturnChange = (val) => {
    setSelectedReturnHub(val);
    if (val === 'CUSTOM') {
      setReturnLocation(customReturn || 'Custom Address');
    } else {
      setReturnLocation(val);
    }
  };

  const handleCustomReturnChange = (text) => {
    setCustomReturn(text);
    setReturnLocation(text);
  };

  // Calculate pricing (18% GST)
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const validDates = !isNaN(startMs) && !isNaN(endMs) && endMs > startMs;

  const durationDays = validDates ? Math.max(1, parseFloat(((endMs - startMs) / (1000 * 60 * 60 * 24)).toFixed(1))) : 1;
  const dailyRate = vehicle ? vehicle.dailyRate : 0;
  const subtotal = parseFloat((durationDays * dailyRate).toFixed(2));
  const taxAmount = parseFloat((subtotal * 0.18).toFixed(2));
  const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!validDates) {
      setErrorMsg('Return date must be strictly after pickup date.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('driveease_token');
      const response = await fetch('/api/v1/customer/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          pickupLocation,
          returnLocation
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrorMsg(data.error || 'Conflict: Vehicle is already reserved for the selected date range.');
        } else {
          setErrorMsg(data.error || 'Failed to complete reservation');
        }
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccessBooking(data);
      onClose();
    } catch (err) {
      console.error('Reservation error:', err);
      setErrorMsg('Network Error: Unable to contact Booking Service via API Gateway');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ padding: '30px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Confirm Reservation</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Reserve {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Overlap / Error Alert Box */}
        {errorMsg && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fb7185',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <ShieldAlert size={20} style={{ shrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '2px' }}>Booking Overlap Conflict</strong>
              {errorMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleConfirmReservation}>
          
          {/* Date Picker Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> Pickup Date & Time
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> Return Date & Time
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Location Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '4px', color: 'var(--accent-cyan)' }} /> Select Pickup Location
              </label>
              <select
                className="input-field"
                value={selectedPickupHub}
                onChange={e => handlePickupChange(e.target.value)}
              >
                {availableHubs.map(hub => (
                  <option key={hub} value={hub}>
                    {hub === vehicle.location ? `📍 ${hub} (Vehicle Base Depot)` : hub}
                  </option>
                ))}
                <option value="CUSTOM">✏️ Enter Custom Pickup Address...</option>
              </select>

              {selectedPickupHub === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Enter full street address or airport terminal..."
                  className="input-field"
                  style={{ marginTop: '8px' }}
                  value={customPickup}
                  onChange={e => handleCustomPickupChange(e.target.value)}
                  required
                />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px', color: 'var(--accent-emerald)' }} /> Return Location
                </label>
                <label style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="checkbox"
                    checked={sameAsPickup}
                    onChange={e => {
                      const isChecked = e.target.checked;
                      setSameAsPickup(isChecked);
                      if (isChecked) {
                        setSelectedReturnHub(selectedPickupHub);
                        setCustomReturn(customPickup);
                        setReturnLocation(pickupLocation);
                      }
                    }}
                  />
                  Same as pickup
                </label>
              </div>

              {!sameAsPickup ? (
                <>
                  <select
                    className="input-field"
                    value={selectedReturnHub}
                    onChange={e => handleReturnChange(e.target.value)}
                  >
                    {availableHubs.map(hub => (
                      <option key={hub} value={hub}>{hub}</option>
                    ))}
                    <option value="CUSTOM">✏️ Enter Custom Return Address...</option>
                  </select>

                  {selectedReturnHub === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="Enter return street address or depot..."
                      className="input-field"
                      style={{ marginTop: '8px' }}
                      value={customReturn}
                      onChange={e => handleCustomReturnChange(e.target.value)}
                      required
                    />
                  )}
                </>
              ) : (
                <div className="input-field" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Same as Pickup ({pickupLocation})
                </div>
              )}
            </div>
          </div>

          {/* Owner Change Notice Alert */}
          {(vehicle.lastChangeSummary || vehicle.previousDailyRate) && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontWeight: 800, shrink: 0 }}>⚡ Owner Revision Notice:</span>
              <div>
                {vehicle.lastChangeSummary || `Owner updated daily rate to ₹${vehicle.dailyRate.toLocaleString('en-IN')}/day`}
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div style={{ background: 'rgba(15,23,42,0.8)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pricing Breakdown (INR ₹)
            </h4>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Duration Rate ({durationDays} days @ ₹{dailyRate.toLocaleString('en-IN')}/day):</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>GST on Rental Services (18%):</span>
              <span>₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>

            <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
              <span>Total Estimated Amount:</span>
              <span style={{ color: 'var(--accent-emerald)' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>

            {!currentUser ? (
              <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={onOpenAuth}>
                Log In to Reserve
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading || !validDates}>
                {loading ? 'Processing via Booking Service...' : 'Confirm & Reserve Vehicle'}
              </button>
            )}
          </div>

        </form>

      </div>
    </div>
  );
}
