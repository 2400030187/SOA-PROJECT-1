import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, MapPin, CheckCircle, AlertCircle, XCircle, ArrowRight, UserCheck } from 'lucide-react';

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '₹0';
  let num = typeof val === 'object' ? (val.amount !== undefined ? val.amount : 0) : val;
  if (typeof num === 'string') num = parseFloat(num);
  if (isNaN(num)) num = 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

export default function CustomerDashboard({ currentUser, onReturnBooking }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);

  const fetchUserBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch('/api/v1/customer/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to fetch user bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBookings();
  }, []);

  const handleFetchInvoice = async (bookingId) => {
    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch(`/api/v1/customer/bookings/${bookingId}/invoice`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInvoiceData(data);
      }
    } catch (err) {
      console.error('Invoice fetch error:', err);
    }
  };

  const handleCheckoutPickup = async (bookingId) => {
    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch(`/api/v1/bookings/${bookingId}/checkout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActionMsg(`Pickup confirmed! Booking ${bookingId} is now ACTIVE.`);
        fetchUserBookings();
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  const [cancelTargetBooking, setCancelTargetBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelBooking = async (bookingId) => {
    setCancelling(true);
    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch(`/api/v1/customer/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`Booking ${bookingId} has been cancelled successfully. Vehicle returned to available fleet.`);
        setCancelTargetBooking(null);
        fetchUserBookings();
      } else {
        alert(`Cancellation Error: ${data.message || 'Unable to cancel booking'}`);
      }
    } catch (err) {
      console.error('Cancel failed:', err);
      alert('Network Error: Could not process cancellation request');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'badge-reserved';
      case 'ACTIVE': return 'badge-in-use';
      case 'COMPLETED': return 'badge-available';
      case 'CANCELLED': return 'badge-maintenance';
      default: return 'badge-available';
    }
  };

  const [selectedTab, setSelectedTab] = useState('ALL');

  const filteredBookings = bookings.filter(b => {
    if (selectedTab === 'ALL') return true;
    if (selectedTab === 'UPCOMING') return b.status === 'CONFIRMED';
    return b.status === selectedTab;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 20px 60px 20px' }}>
      
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Customer Portal — My Trips & Invoices</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Manage your active vehicle rentals, view 18% GST invoices, and complete returns.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(15,23,42,0.6)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          {['ALL', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                background: selectedTab === tab ? 'var(--primary)' : 'transparent',
                color: selectedTab === tab ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: selectedTab === tab ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'UPCOMING' ? 'Upcoming' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {actionMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '0.9rem' }}>
          ✓ {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Clock size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading customer reservations from Booking Service...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Calendar size={48} color="var(--primary)" style={{ marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.25rem' }}>No {selectedTab === 'ALL' ? '' : selectedTab.toLowerCase()} reservations found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>You don't have any bookings matching this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredBookings.map(b => {
            const custName = b.customerName || b.customerDetails?.name || currentUser?.name;
            const custEmail = b.customerEmail || b.customerDetails?.email || currentUser?.email;
            const custPhone = b.customerPhone || b.customerDetails?.phone || currentUser?.phone;

            return (
              <div key={b.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{b.vehicleInfo}</h3>
                      <span className={`badge ${getStatusBadgeClass(b.status)}`}>{b.status}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      ID: {b.id} • Created: {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {formatCurrency(b.totalAmount || b.amount)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {b.durationDays} days @ {formatCurrency(b.dailyRate)}/day (incl. 18% GST)
                    </span>
                  </div>
                </div>

                {/* NEW RULE B: Verified Customer Details reflected back clearly on active/confirmed booking */}
                {(b.status === 'CONFIRMED' || b.status === 'ACTIVE' || b.status === 'COMPLETED') && (
                  <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserCheck size={16} color="var(--accent-cyan)" />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700, marginRight: '6px' }}>Reserved By (Customer Contact):</span>
                      <strong>{custName}</strong> ({custEmail}) • <span>{custPhone}</span>
                    </div>
                  </div>
                )}

                {/* Lifecycle Progress Bar */}
                <div style={{ background: 'rgba(15,23,42,0.8)', padding: '14px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <div style={{ color: b.status === 'CONFIRMED' || b.status === 'ACTIVE' || b.status === 'COMPLETED' ? 'var(--accent-cyan)' : 'var(--text-dim)', fontWeight: 700 }}>
                    1. Reservation Confirmed
                  </div>
                  <ArrowRight size={14} color="var(--text-dim)" />
                  <div style={{ color: b.status === 'ACTIVE' || b.status === 'COMPLETED' ? 'var(--accent-cyan)' : 'var(--text-dim)', fontWeight: 700 }}>
                    2. Vehicle Picked Up (Active)
                  </div>
                  <ArrowRight size={14} color="var(--text-dim)" />
                  <div style={{ color: b.status === 'COMPLETED' ? 'var(--accent-emerald)' : 'var(--text-dim)', fontWeight: 700 }}>
                    3. Vehicle Returned (Completed)
                  </div>
                </div>

                {/* Dates & Locations */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Pickup Location & Date:</span>
                    <strong>{b.startDate ? new Date(b.startDate).toLocaleString() : 'N/A'}</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.78rem' }}><MapPin size={12} style={{ display: 'inline' }} /> {b.pickupLocation}</span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Return Schedule & Location:</span>
                    <strong>{b.endDate ? new Date(b.endDate).toLocaleString() : 'N/A'}</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.78rem' }}><MapPin size={12} style={{ display: 'inline' }} /> {b.returnLocation}</span>
                  </div>
                </div>

                {/* Action Controls */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleFetchInvoice(b.id)}>
                    View GST Invoice (₹)
                  </button>

                  {(b.status === 'CONFIRMED' || b.status === 'ACTIVE') && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#fb7185', borderColor: 'rgba(244,63,94,0.4)', background: 'rgba(244, 63, 94, 0.1)' }}
                      onClick={() => setCancelTargetBooking(b)}
                    >
                      <XCircle size={14} /> Cancel Reservation
                    </button>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleCheckoutPickup(b.id)}>
                      Pick Up Vehicle (Start Trip)
                    </button>
                  )}

                  {(b.status === 'ACTIVE' || b.status === 'CONFIRMED') && (
                    <button className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--primary))' }} onClick={() => onReturnBooking(b)}>
                      Return Vehicle & Telematics Audit
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* GST Invoice View Modal */}
      {invoiceData && (
        <div className="modal-overlay" onClick={() => setInvoiceData(null)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ padding: '30px', maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Tax Invoice / Tax Receipt</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>{invoiceData.invoiceNumber}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setInvoiceData(null)}>Close</button>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                <strong>{invoiceData.customerName} ({invoiceData.customerEmail})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vehicle Reserved:</span>
                <strong>{invoiceData.vehicleDetails}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Rental Period:</span>
                <span>{invoiceData.rentalPeriod.totalDays} Days</span>
              </div>

              <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Rental Base Subtotal:</span>
                  <span>{formatCurrency(invoiceData.billingBreakdown.rentalSubtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-muted)' }}>
                  <span>CGST (9%):</span>
                  <span>{formatCurrency(invoiceData.billingBreakdown.cgstAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-muted)' }}>
                  <span>SGST (9%):</span>
                  <span>{formatCurrency(invoiceData.billingBreakdown.sgstAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--glass-border)', fontSize: '1.1rem', fontWeight: 800 }}>
                  <span>Grand Total (INR):</span>
                  <span style={{ color: 'var(--accent-emerald)' }}>{formatCurrency(invoiceData.billingBreakdown.grandTotal || invoiceData.billingBreakdown.amount)}</span>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.print()}>
              Print / Download Invoice PDF
            </button>
          </div>
        </div>
      )}

      {/* Cancel Reservation Confirmation Modal */}
      {cancelTargetBooking && (
        <div className="modal-overlay" onClick={() => setCancelTargetBooking(null)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ padding: '30px', maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(244,63,94,0.15)', padding: '10px', borderRadius: '50%', color: '#fb7185' }}>
                <XCircle size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Confirm Cancel Reservation</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Booking ID: {cancelTargetBooking.id}</span>
              </div>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vehicle Reserved: </span>
                <strong>{cancelTargetBooking.vehicleInfo}</strong>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pickup Hub: </span>
                <strong><MapPin size={12} style={{ display: 'inline' }} /> {cancelTargetBooking.pickupLocation}</strong>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Scheduled Pickup: </span>
                <span>{new Date(cancelTargetBooking.startDate).toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Refund Amount:</span>
                <span style={{ color: 'var(--accent-emerald)' }}>{formatCurrency(cancelTargetBooking.totalAmount || cancelTargetBooking.amount)} (Full 100% Refund)</span>
              </div>
            </div>

            <p style={{ color: '#fb7185', fontSize: '0.85rem', marginBottom: '20px' }}>
              ⚠️ Cancelling will immediately release the vehicle back to the available fleet and notify the owner.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setCancelTargetBooking(null)}
                disabled={cancelling}
              >
                Keep Reservation
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={() => handleCancelBooking(cancelTargetBooking.id)}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
