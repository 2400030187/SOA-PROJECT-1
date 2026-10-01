import React from 'react';
import { Gauge, Fuel, Zap, MapPin, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';

export default function VehicleCatalog({ vehicles, onSelectVehicle, onBookVehicle }) {
  
  const getBadgeClass = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'badge-available';
      case 'RESERVED': return 'badge-reserved';
      case 'IN_USE': return 'badge-in-use';
      case 'IN_MAINTENANCE': return 'badge-maintenance';
      case 'OUT_OF_SERVICE': return 'badge-out-service';
      default: return 'badge-available';
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '10px 20px 60px 20px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Fleet Inventory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Showing {vehicles.length} vehicles managed by Vehicle Service
          </p>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <ShieldAlert size={48} color="var(--accent-amber)" style={{ marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.3rem' }}>No Vehicles Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search query or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {vehicles.map(vehicle => (
            <div
              key={vehicle.id}
              className="glass-panel"
              style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              
              {/* Vehicle Image Banner */}
              <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                <img
                  src={vehicle.imageUrl}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                
                {/* Status Badge Overlay */}
                <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                  <span className={`badge ${getBadgeClass(vehicle.status)}`}>
                    {vehicle.status}
                  </span>
                </div>

                {/* Fuel Type Tag */}
                <div style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: '14px',
                  background: 'rgba(11, 15, 25, 0.85)',
                  backdropFilter: 'blur(6px)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {vehicle.fuelType === 'ELECTRIC' ? <Zap size={14} color="var(--accent-cyan)" /> : <Fuel size={14} color="var(--accent-amber)" />}
                  {vehicle.fuelType}
                </div>
              </div>

              {/* Body Details */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {vehicle.year} • Plate: {vehicle.licensePlate}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        ₹{vehicle.dailyRate.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>/ day</span>
                    </div>
                  </div>

                  {/* Owner Modification Transparency Banner */}
                  {(vehicle.lastChangeSummary || vehicle.previousDailyRate) && (
                    <div style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      margin: '10px 0',
                      fontSize: '0.78rem',
                      color: '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ fontWeight: 800, shrink: 0 }}>🏷️ Owner Update:</span>
                      <span style={{ fontWeight: 500 }}>
                        {vehicle.lastChangeSummary || (
                          vehicle.previousDailyRate
                            ? `Rate revised: ₹${vehicle.previousDailyRate.toLocaleString('en-IN')} ➔ ₹${vehicle.dailyRate.toLocaleString('en-IN')}/day`
                            : 'Vehicle details modified by owner'
                        )}
                      </span>
                    </div>
                  )}

                  {/* Specs & Location */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '14px 0', padding: '10px', background: 'rgba(15,23,42,0.5)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <Gauge size={14} /> {vehicle.currentOdometer.toLocaleString()} km
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <MapPin size={14} /> {vehicle.location}
                    </div>
                  </div>

                  {/* Feature Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                    {vehicle.features.slice(0, 3).map((feat, idx) => (
                      <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onSelectVehicle(vehicle)}
                  >
                    Specs & Logs
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={vehicle.status === 'IN_MAINTENANCE' || vehicle.status === 'OUT_OF_SERVICE'}
                    onClick={() => onBookVehicle(vehicle)}
                  >
                    {vehicle.status === 'IN_MAINTENANCE' ? 'In Maintenance' : 'Reserve'} <ArrowRight size={14} />
                  </button>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
