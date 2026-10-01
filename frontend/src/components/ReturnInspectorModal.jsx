import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, DollarSign, Gauge, Calendar } from 'lucide-react';

export default function ReturnInspectorModal({ booking, onClose, onSuccessReturn }) {
  const [endOdometer, setEndOdometer] = useState(booking ? (booking.startOdometer + 185) : 15000);
  const [inspectionNotes, setInspectionNotes] = useState('Standard inspection passed. Vehicle clean.');
  const [damageFee, setDamageFee] = useState('0');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!booking) return null;

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('driveease_token');
      const response = await fetch(`/api/v1/bookings/${booking.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          actualReturnTime: new Date().toISOString(),
          endOdometer: parseInt(endOdometer),
          inspectionNotes,
          damageFee: parseFloat(damageFee) || 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || 'Failed to process return');
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccessReturn(data);
      onClose();
    } catch (err) {
      setErrorMsg('Network Error contacting Booking Service');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ padding: '30px', maxWidth: '540px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Vehicle Return & Telematics Audit</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Booking: <strong>{booking.id}</strong> ({booking.vehicleInfo})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', color: '#fb7185', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '0.85rem' }}>
            ⚠ {errorMsg}
          </div>
        )}

        <form onSubmit={handleProcessReturn}>
          
          <div style={{ background: 'rgba(15,23,42,0.6)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Start Odometer:</span>
              <strong>{booking.startOdometer ? booking.startOdometer.toLocaleString() : 'N/A'} km</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Original Booking Total:</span>
              <strong style={{ color: 'var(--accent-emerald)' }}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(typeof booking.totalAmount === 'object' ? (booking.totalAmount.amount || 0) : (booking.totalAmount || 0))}
              </strong>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Gauge size={14} style={{ display: 'inline', marginRight: '4px' }} /> Return Odometer (km)
            </label>
            <input
              type="number"
              className="input-field"
              value={endOdometer}
              onChange={e => setEndOdometer(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Additional Damage Fee (₹)
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="0.00"
              value={damageFee}
              onChange={e => setDamageFee(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
              * If damage fee &gt; ₹0, vehicle state machine will automatically transition to IN_MAINTENANCE.
            </span>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Inspection & Condition Notes
            </label>
            <textarea
              className="input-field"
              rows={3}
              value={inspectionNotes}
              onChange={e => setInspectionNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Processing Return...' : 'Complete Return & Audit'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
