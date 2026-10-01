import React from 'react';
import { Car, ShieldCheck, User, ArrowUpRight, Cpu } from 'lucide-react';

export default function LandingPortal({ onSelectRole, onOpenMonitor, onBrowseCatalog }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      backgroundImage: `
        radial-gradient(at 0% 0%, rgba(245, 158, 11, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 50%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
        radial-gradient(at 50% 100%, rgba(99, 102, 241, 0.05) 0px, transparent 70%)
      `,
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'between',
      padding: '40px 6%',
      boxSizing: 'border-box',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* Top Header Row with Microservices Monitor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        {/* Car Logo */}
        <div style={{
          width: '52px',
          height: '52px',
          background: '#f59e0b',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
          cursor: 'pointer'
        }}
        onClick={onBrowseCatalog}
        title="DriveEase Fleet"
        >
          <Car size={28} color="#090d16" strokeWidth={2.4} />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={onOpenMonitor}
            style={{
              background: 'rgba(6, 182, 212, 0.12)',
              color: '#06b6d4',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              padding: '10px 18px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              backdropFilter: 'blur(8px)'
            }}
          >
            <Cpu size={16} /> Microservices Monitor
          </button>

          <button
            onClick={onBrowseCatalog}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '10px 18px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 500
            }}
          >
            Explore Vehicles
          </button>
        </div>
      </div>

      {/* Main Hero Content Split Layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(300px, 0.8fr)',
        gap: '60px',
        alignItems: 'center',
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto'
      }}>
        
        {/* Left Typography Section */}
        <div>
          <div style={{
            color: '#06b6d4',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '20px'
          }}>
            DRIVE EASE / FLEET ACCESS
          </div>

          <h1 style={{
            fontSize: 'clamp(2.8rem, 5.5vw, 4.4rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            color: '#ffffff',
            marginBottom: '28px',
            fontFamily: "'Outfit', sans-serif"
          }}>
            Move<br />
            through the<br />
            city on your<br />
            terms.
          </h1>

          <p style={{
            color: '#94a3b8',
            fontSize: '1.05rem',
            maxWidth: '480px',
            lineHeight: 1.5
          }}>
            Choose your space to enter the DriveEase prototype.
          </p>
        </div>

        {/* Right Role Choice Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Owner Card */}
          <div
            onClick={() => onSelectRole('OWNER')}
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '18px',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(12px)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Owner
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                  Manage your fleet and see vehicle status.
                </p>
              </div>
            </div>

            <ArrowUpRight size={22} color="#64748b" />
          </div>

          {/* Customer Card */}
          <div
            onClick={() => onSelectRole('CUSTOMER')}
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '18px',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(12px)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#06b6d4'
              }}>
                <User size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Customer
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                  Browse vehicles and plan your next trip.
                </p>
              </div>
            </div>

            <ArrowUpRight size={22} color="#64748b" />
          </div>

        </div>

      </div>

      {/* Footer System Status */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#64748b',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        paddingTop: '24px',
        marginTop: '40px'
      }}>
        DriveEase Fleet Access Portal • Spring Cloud & Microservices Ecosystem
      </div>

    </div>
  );
}
