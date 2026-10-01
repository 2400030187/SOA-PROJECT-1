import React, { useState, useEffect } from 'react';
import { Car, ShieldCheck, User, LogOut, Cpu, Calendar, LayoutDashboard, Bell, CheckCheck, Check, UserCog } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onOpenAuth, onOpenMonitor, onOpenProfile, onLogout }) {
  const isOwner = currentUser && (currentUser.role === 'OWNER' || currentUser.role === 'FLEET_MANAGER' || currentUser.role === 'ADMIN');
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Fetch Notifications for Owner
  const fetchOwnerNotifications = async () => {
    if (!isOwner) return;
    try {
      const token = localStorage.getItem('driveease_token');
      const res = await fetch('/api/owner/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        const unread = (data.notifications || []).filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      // Non-blocking fallback
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchOwnerNotifications();
      const interval = setInterval(fetchOwnerNotifications, 15000); // 15s polling
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('driveease_token');
      await fetch(`/api/owner/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchOwnerNotifications();
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('driveease_token');
      await fetch('/api/owner/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchOwnerNotifications();
    } catch (err) {}
  };

  return (
    <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, position: 'sticky', top: 0, zIndex: 100, padding: '14px 28px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('catalog')}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(99,102,241,0.4)'
          }}>
            <Car size={24} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DriveEase
            </span>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
              FLEET OPERATIONS
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15,23,42,0.6)', padding: '6px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: activeTab === 'catalog' ? 'none' : 'transparent' }}
            onClick={() => setActiveTab('catalog')}
          >
            <Car size={16} /> Fleet Catalog
          </button>

          {currentUser && (currentUser.role === 'CUSTOMER' || currentUser.role === 'USER') && (
            <button
              className={`btn btn-sm ${activeTab === 'my-bookings' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: activeTab === 'my-bookings' ? 'none' : 'transparent' }}
              onClick={() => setActiveTab('my-bookings')}
            >
              <Calendar size={16} /> Customer Portal
            </button>
          )}

          {isOwner && (
            <button
              className={`btn btn-sm ${activeTab === 'fleet-admin' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: activeTab === 'fleet-admin' ? 'none' : 'transparent' }}
              onClick={() => setActiveTab('fleet-admin')}
            >
              <LayoutDashboard size={16} /> Owner Oversight
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Architecture Live Monitor Button */}
          <button
            onClick={onOpenMonitor}
            style={{
              background: 'rgba(6, 182, 212, 0.12)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              padding: '8px 14px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <Cpu size={16} /> Microservices Monitor
          </button>

          {/* Owner Notification Bell with Dropdown */}
          {isOwner && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#f59e0b',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title="Fleet Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifDropdown && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '48px',
                  width: '360px',
                  background: '#0f172a',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '16px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(245, 158, 11, 0.15)',
                  zIndex: 200,
                  overflow: 'hidden',
                  fontFamily: "'Inter', sans-serif"
                }}>
                  <div style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(15, 23, 42, 0.95)'
                  }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={16} color="#f59e0b" /> Owner Alerts ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No fleet notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                          style={{
                            padding: '14px 18px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: n.isRead ? 'transparent' : 'rgba(245, 158, 11, 0.06)',
                            cursor: n.isRead ? 'default' : 'pointer',
                            transition: 'background 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: n.type === 'NEW_BOOKING' ? 'rgba(16,185,129,0.15)' : n.type === 'BOOKING_CANCELLED' ? 'rgba(239,68,68,0.15)' : 'rgba(6,182,212,0.15)',
                              color: n.type === 'NEW_BOOKING' ? '#34d399' : n.type === 'BOOKING_CANCELLED' ? '#f87171' : '#38bdf8'
                            }}>
                              {n.type.replace('_', ' ')}
                            </span>
                            {!n.isRead && (
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                            )}
                          </div>
                          <p style={{ fontSize: '0.82rem', color: n.isRead ? '#94a3b8' : '#ffffff', lineHeight: 1.4, margin: '4px 0' }}>
                            {n.message}
                          </p>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                onClick={onOpenProfile}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--glass-border)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Click to view & edit profile"
              >
                <User size={16} color="var(--primary)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.firstName} {currentUser.lastName}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{currentUser.role} • Profile ⚙</div>
                </div>
              </div>

              <button
                onClick={onLogout}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => onOpenAuth('CUSTOMER')}>
                Customer Login
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => onOpenAuth('OWNER')}>
                Owner Login
              </button>
            </div>
          )}

        </div>

      </div>
    </nav>
  );
}
