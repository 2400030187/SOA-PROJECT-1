import React, { useState } from 'react';
import { X, User, ShieldCheck, Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react';

export default function AuthModal({ onClose, onSuccessAuth, initialMode = 'CUSTOMER' }) {
  const [currentMode, setCurrentMode] = useState(initialMode);
  const isOwner = currentMode === 'OWNER';
  const role = isOwner ? 'OWNER' : 'CUSTOMER';
  const accentColor = isOwner ? '#f59e0b' : '#06b6d4';
  const accentGradient = isOwner 
    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
    : 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)';
  const glowShadow = isOwner 
    ? '0 0 30px rgba(245, 158, 11, 0.22)' 
    : '0 0 30px rgba(6, 182, 212, 0.22)';

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Email Domain Validator: @driveease.com, @gmail.com, or @outlook.com allowed
  const validateEmailDomain = (val) => {
    if (!val) return false;
    const lower = val.toLowerCase().trim();
    return lower.endsWith('@gmail.com') || lower.endsWith('@outlook.com') || lower.endsWith('@driveease.com');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Email Restriction Enforced Before Submission
    if (!validateEmailDomain(cleanEmail)) {
      setErrorMsg('Only @driveease.com, @gmail.com, or @outlook.com email addresses are allowed.');
      return;
    }

    // 2. Minimum 6 Characters Password Rule Enforced
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const rolePath = isOwner ? 'owner' : 'customer';
    const actionPath = isRegister ? 'register' : 'login';
    const endpoint = `/api/v1/users/${rolePath}/${actionPath}`;

    const payload = isRegister
      ? { 
          email: cleanEmail, 
          password, 
          firstName: firstName || (isOwner ? 'Owner' : 'Customer'), 
          lastName: lastName || 'User', 
          role 
        }
      : { email: cleanEmail, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        if (!isRegister && response.status === 401 && data.error && data.error.includes('Invalid email')) {
          setErrorMsg(`${data.error}. If you don't have an account yet, click "Sign Up" below.`);
        } else {
          setErrorMsg(data.error || 'Authentication failed');
        }
        setLoading(false);
        return;
      }

      localStorage.setItem('driveease_token', data.accessToken);
      setLoading(false);
      onSuccessAuth(data.user);
      onClose();
    } catch (err) {
      setErrorMsg('Network Error: Gateway or User Service is offline');
      setLoading(false);
    }
  };

  const handleQuickFill = (presetEmail, presetPass) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setIsRegister(false);
    setErrorMsg(null);
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        background: 'rgba(5, 8, 15, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1000
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          background: '#0f172a',
          backgroundImage: `radial-gradient(circle at 50% 0%, ${isOwner ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)'} 0px, transparent 70%)`,
          border: `1px solid ${isOwner ? 'rgba(245, 158, 11, 0.35)' : 'rgba(6, 182, 212, 0.35)'}`,
          borderRadius: '24px',
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.6), ${glowShadow}`,
          padding: '40px 36px',
          maxWidth: '440px',
          width: '100%',
          position: 'relative',
          color: '#ffffff',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '20px', 
            right: '20px', 
            background: 'rgba(255, 255, 255, 0.06)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            color: '#94a3b8', 
            cursor: 'pointer',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Role Switcher Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '4px',
          borderRadius: '14px',
          marginBottom: '22px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={() => { setCurrentMode('CUSTOMER'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '10px',
              border: 'none',
              background: !isOwner ? 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)' : 'transparent',
              color: !isOwner ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: !isOwner ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            Customer Access
          </button>
          <button
            type="button"
            onClick={() => { setCurrentMode('OWNER'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '10px',
              border: 'none',
              background: isOwner ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
              color: isOwner ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isOwner ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
            }}
          >
            Owner Access
          </button>
        </div>

        {/* Circular Role Badge */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '18px',
          background: isOwner ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)',
          border: `1px solid ${isOwner ? 'rgba(245, 158, 11, 0.35)' : 'rgba(6, 182, 212, 0.35)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          color: accentColor,
          boxShadow: isOwner ? '0 8px 24px rgba(245, 158, 11, 0.25)' : '0 8px 24px rgba(6, 182, 212, 0.25)'
        }}>
          {isOwner ? <ShieldCheck size={32} /> : <User size={32} />}
        </div>

        {/* Header Title */}
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: '1.55rem', 
          fontWeight: 800, 
          color: '#ffffff', 
          marginBottom: '6px', 
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontFamily: "'Outfit', sans-serif"
        }}>
          {isRegister ? `${role} SIGN UP` : `${role} LOGIN`}
        </h2>
        
        <p style={{ 
          textAlign: 'center', 
          fontSize: '0.88rem', 
          color: '#94a3b8', 
          marginBottom: '28px' 
        }}>
          {isOwner 
            ? 'Manage your fleet and see vehicle status.' 
            : 'Browse vehicles and plan your next trip.'
          }
        </p>

        {/* Quick Fill Preset Option */}
        <div style={{ 
          marginBottom: '22px', 
          background: 'rgba(255, 255, 255, 0.03)', 
          padding: '10px 14px', 
          borderRadius: '12px', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color={accentColor} /> Quick Fill Demo:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {isOwner ? (
              <>
                <button
                  type="button"
                  style={{
                    fontSize: '0.75rem',
                    padding: '5px 10px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onClick={() => handleQuickFill('owner@driveease.com', 'password123')}
                >
                  owner@driveease.com
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: '0.75rem',
                    padding: '5px 10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                  onClick={() => handleQuickFill('owner12@gmail.com', '123456')}
                >
                  owner12@gmail.com
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  style={{
                    fontSize: '0.75rem',
                    padding: '5px 10px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '8px',
                    color: '#06b6d4',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onClick={() => handleQuickFill('customer@driveease.com', 'password123')}
                >
                  customer@driveease.com
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: '0.75rem',
                    padding: '5px 10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                  onClick={() => handleQuickFill('alex@gmail.com', 'password123')}
                >
                  alex@gmail.com
                </button>
              </>
            )}
          </div>
        </div>

        {errorMsg && (
          <div style={{ 
            background: 'rgba(244, 63, 94, 0.15)', 
            border: '1px solid rgba(244, 63, 94, 0.4)', 
            color: '#fb7185', 
            padding: '12px 14px', 
            borderRadius: '10px', 
            marginBottom: '20px', 
            fontSize: '0.85rem' 
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {/* Email Address Field */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={isOwner ? 'owner@driveease.com' : 'customer@driveease.com'}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Mail 
                size={18} 
                color="#64748b" 
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
              />
            </div>
          </div>

          {/* Password Field with Eye/EyeOff toggle */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="•••••••••"
                minLength={6}
                required
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Lock 
                size={18} 
                color="#64748b" 
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role-Themed Full-Width Action Button */}
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '14px', 
              background: accentGradient, 
              color: isOwner ? '#090d16' : '#ffffff', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 800, 
              fontSize: '1rem', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              marginBottom: '20px', 
              transition: 'all 0.25s ease', 
              boxShadow: isOwner ? '0 8px 24px rgba(245, 158, 11, 0.3)' : '0 8px 24px rgba(6, 182, 212, 0.3)',
              opacity: loading ? 0.8 : 1,
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            {loading 
              ? 'Authenticating...' 
              : isRegister 
                ? `Register as ${isOwner ? 'Owner' : 'Customer'}` 
                : `Log In as ${isOwner ? 'Owner' : 'Customer'}`
            }
          </button>

          {/* Bottom Switch Link: Don't have an account? Sign Up */}
          <div style={{ textAlign: 'center', fontSize: '0.88rem', color: '#94a3b8' }}>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: accentColor, 
                cursor: 'pointer', 
                fontWeight: 700,
                padding: 0,
                marginLeft: '4px',
                textDecoration: 'underline'
              }}
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
              }}
            >
              {isRegister ? 'Log In' : 'Sign Up'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

