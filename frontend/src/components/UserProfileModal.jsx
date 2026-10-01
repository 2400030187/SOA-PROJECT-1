import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Shield, CheckCircle, AlertCircle, Building, FileText, Phone, Mail, MapPin, BadgeCheck } from 'lucide-react';

export default function UserProfileModal({ currentUser, onClose, onUpdateUser }) {
  const isOwner = currentUser && (currentUser.role === 'OWNER' || currentUser.role === 'FLEET_MANAGER' || currentUser.role === 'ADMIN');
  
  const [activeSubTab, setActiveSubTab] = useState('details'); // 'details' | 'password'

  // Profile fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Owner specific
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');

  // Customer specific
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status feedback
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Password validation
  const isNewPasswordValid = newPassword.length >= 6;
  const isPasswordMatch = newPassword === confirmPassword;

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('driveease_token');
      const endpoint = isOwner ? '/api/owner/profile' : '/api/customer/profile';
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setName(data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim());
        setEmail(data.email || '');
        setPhone(data.phone || data.phoneNumber || '');

        if (isOwner) {
          setBusinessName(data.businessName || data.companyName || '');
          setGstin(data.gstin || '');
        } else {
          setLicenseNumber(data.licenseNumber || data.driverLicenseNumber || '');
          setAddress(data.address || '');
        }
      } else {
        setErrorMsg(data.message || 'Failed to load profile');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to User Service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('driveease_token');
      const endpoint = isOwner ? '/api/owner/profile' : '/api/customer/profile';
      
      const payload = isOwner
        ? { name, phone, businessName, gstin }
        : { name, phone, licenseNumber, address };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg('Profile updated successfully!');
        if (onUpdateUser) {
          onUpdateUser({
            ...currentUser,
            firstName: data.firstName || name.split(' ')[0],
            lastName: data.lastName || (name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : ''),
            name: data.name || name,
            phone: data.phone || phone
          });
        }
      } else {
        setErrorMsg(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setErrorMsg('Network error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);

    if (!isNewPasswordValid) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('driveease_token');
      const endpoint = isOwner ? '/api/owner/profile/password' : '/api/customer/profile/password';

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(data.message || 'Failed to change password. Please check your current password.');
      }
    } catch (err) {
      setErrorMsg('Network error changing password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', padding: '32px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(99,102,241,0.15)', padding: '8px', borderRadius: '10px' }}>
                <User size={22} color="var(--primary)" />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {isOwner ? 'My Owner Profile & Business Settings' : 'My Customer Profile & Driver Info'}
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Manage your personal credentials, contact details, and account security.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Status Banners */}
        {statusMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} /> {statusMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {errorMsg}
          </div>
        )}

        {/* Sub Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(15,23,42,0.8)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <button
            className={`btn btn-sm ${activeSubTab === 'details' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, border: 'none' }}
            onClick={() => { setActiveSubTab('details'); setStatusMsg(null); setErrorMsg(null); }}
          >
            <User size={16} /> Personal & Account Details
          </button>
          <button
            className={`btn btn-sm ${activeSubTab === 'password' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, border: 'none' }}
            onClick={() => { setActiveSubTab('password'); setStatusMsg(null); setErrorMsg(null); }}
          >
            <Lock size={16} /> Change Password
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading user profile...
          </div>
        ) : activeSubTab === 'details' ? (
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Email Address <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>(Read-Only Identity)</span>
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  disabled
                  style={{ background: 'rgba(15,23,42,0.9)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Phone Number
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="+91-98765-43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>

            {isOwner ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Business / Company Name
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. DriveEase Fleet Ops Ltd"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      GSTIN Number
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={gstin}
                      onChange={e => setGstin(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Driver's License Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. DL-987654321"
                    value={licenseNumber}
                    onChange={e => setLicenseNumber(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Residential / Billing Address
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 123 Tech Lane, CA"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Current Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                New Password (6+ characters)
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              {newPassword && !isNewPasswordValid && (
                <span style={{ fontSize: '0.75rem', color: '#fb7185', marginTop: '4px', display: 'block' }}>
                  ⚠ Password must be at least 6 characters long.
                </span>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && !isPasswordMatch && (
                <span style={{ fontSize: '0.75rem', color: '#fb7185', marginTop: '4px', display: 'block' }}>
                  ⚠ Passwords do not match.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={saving || !isNewPasswordValid || !isPasswordMatch || !currentPassword}
              >
                <Lock size={16} /> {saving ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
