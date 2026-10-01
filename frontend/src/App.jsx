import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPortal from './components/LandingPortal';
import HeroSection from './components/HeroSection';
import VehicleCatalog from './components/VehicleCatalog';
import BookingWizardModal from './components/BookingWizardModal';
import AuthModal from './components/AuthModal';
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import ReturnInspectorModal from './components/ReturnInspectorModal';
import MicroservicesMonitorModal from './components/MicroservicesMonitorModal';
import UserProfileModal from './components/UserProfileModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('landing'); // 'landing', 'catalog', 'my-bookings', 'fleet-admin'

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Search & Filters (INR ₹)
  const [filters, setFilters] = useState({
    search: '',
    location: 'ALL',
    category: 'ALL',
    maxPrice: 20000
  });

  // Modal States
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState(null);
  const [selectedBookingForReturn, setSelectedBookingForReturn] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authMode, setAuthMode] = useState('CUSTOMER');
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load User from stored JWT
  useEffect(() => {
    const token = localStorage.getItem('driveease_token');
    if (token) {
      fetch('/api/v1/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user) {
          setCurrentUser(user);
          setShowAuthModal(false);
          if (user.role === 'OWNER' || user.role === 'FLEET_MANAGER' || user.role === 'ADMIN') {
            setActiveTab('fleet-admin');
          } else {
            setActiveTab('my-bookings');
          }
        } else {
          setShowAuthModal(true);
        }
      })
      .catch(() => {
        setShowAuthModal(true);
      });
    } else {
      setShowAuthModal(true);
    }
  }, []);

  // Fetch Vehicles from Vehicle Service
  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const query = new URLSearchParams();
      if (filters.category !== 'ALL') query.append('category', filters.category);
      if (filters.location !== 'ALL') query.append('location', filters.location);
      if (filters.maxPrice) query.append('maxPrice', filters.maxPrice.toString());
      if (filters.search) query.append('search', filters.search);

      const res = await fetch(`/api/v1/vehicles?${query.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [filters]);

  const handleLogout = () => {
    localStorage.removeItem('driveease_token');
    setCurrentUser(null);
    setActiveTab('landing');
    showToast('Logged out successfully');
  };

  const handleOpenAuth = (mode = 'CUSTOMER') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Distinct locations & categories from vehicles
  const locations = Array.from(new Set(vehicles.map(v => v.location)));
  const categories = Array.from(new Set(vehicles.map(v => v.category)));

  // Render Opening Landing Screen when activeTab is 'landing'
  if (activeTab === 'landing' && !currentUser) {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16' }}>
        <LandingPortal
          onSelectRole={(role) => handleOpenAuth(role)}
          onOpenMonitor={() => setShowMonitorModal(true)}
          onBrowseCatalog={() => setActiveTab('catalog')}
        />

        {showAuthModal && (
          <AuthModal
            initialMode={authMode}
            onClose={() => setShowAuthModal(false)}
            onSuccessAuth={(user) => {
              setCurrentUser(user);
              showToast(`Welcome back, ${user.firstName}! (${user.role})`);
              if (user.role === 'OWNER' || user.role === 'FLEET_MANAGER' || user.role === 'ADMIN') {
                setActiveTab('fleet-admin');
              } else {
                setActiveTab('my-bookings');
              }
            }}
          />
        )}

        {showMonitorModal && (
          <MicroservicesMonitorModal
            onClose={() => setShowMonitorModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Glassmorphic Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuth}
        onOpenMonitor={() => setShowMonitorModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onLogout={handleLogout}
      />

      {/* Global Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(16, 185, 129, 0.9)',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.3s ease'
        }}>
          ✓ {notification}
        </div>
      )}

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {activeTab === 'catalog' && (
          <>
            <HeroSection
              filters={filters}
              setFilters={setFilters}
              locations={locations}
              categories={categories}
            />

            <VehicleCatalog
              vehicles={vehicles}
              onSelectVehicle={(veh) => setSelectedVehicleForBooking(veh)}
              onBookVehicle={(veh) => setSelectedVehicleForBooking(veh)}
            />
          </>
        )}

        {activeTab === 'my-bookings' && currentUser && (
          <CustomerDashboard
            currentUser={currentUser}
            onReturnBooking={(b) => setSelectedBookingForReturn(b)}
          />
        )}

        {activeTab === 'fleet-admin' && currentUser && (
          <AdminDashboard
            vehicles={vehicles}
            onRefreshVehicles={fetchVehicles}
            onReturnBooking={(b) => setSelectedBookingForReturn(b)}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '24px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
        <p>DriveEase Fleet Operations • Spring Cloud Microservices Architecture</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
          Eureka Server (:8761) | API Gateway (:8080) | User Service (:8081) | Vehicle Service (:8082) | Booking Service (:8083)
        </p>
      </footer>

      {/* Modals */}
      {selectedVehicleForBooking && (
        <BookingWizardModal
          vehicle={selectedVehicleForBooking}
          currentUser={currentUser}
          onClose={() => setSelectedVehicleForBooking(null)}
          onOpenAuth={() => {
            setSelectedVehicleForBooking(null);
            handleOpenAuth('CUSTOMER');
          }}
          onSuccessBooking={(booking) => {
            showToast(`Reservation ${booking.id} confirmed!`);
            fetchVehicles();
            setActiveTab('my-bookings');
          }}
        />
      )}

      {selectedBookingForReturn && (
        <ReturnInspectorModal
          booking={selectedBookingForReturn}
          onClose={() => setSelectedBookingForReturn(null)}
          onSuccessReturn={(resData) => {
            showToast(`Vehicle return completed. Total: ₹${resData.booking.totalAmount.toLocaleString('en-IN')}`);
            fetchVehicles();
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccessAuth={(user) => {
            setCurrentUser(user);
            showToast(`Welcome back, ${user.firstName}! (${user.role})`);
            if (user.role === 'OWNER' || user.role === 'FLEET_MANAGER' || user.role === 'ADMIN') {
              setActiveTab('fleet-admin');
            } else {
              setActiveTab('my-bookings');
            }
          }}
        />
      )}

      {showMonitorModal && (
        <MicroservicesMonitorModal
          onClose={() => setShowMonitorModal(false)}
        />
      )}

      {showProfileModal && currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUpdateUser={(updatedUser) => {
            setCurrentUser(updatedUser);
            showToast('Profile updated successfully!');
          }}
        />
      )}

    </div>
  );
}
