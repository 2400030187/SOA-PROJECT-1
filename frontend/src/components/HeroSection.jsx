import React from 'react';
import { Search, Calendar, MapPin, Filter, Sparkles } from 'lucide-react';

export default function HeroSection({ filters, setFilters, locations, categories }) {
  return (
    <div style={{ padding: '40px 20px 20px 20px', maxWidth: '1280px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '40px 36px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Glow background accent */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          <Sparkles size={16} /> Real-Time Availability & Overlap Protection
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '14px' }}>
          Smart Fleet Mobility, <span style={{ background: 'linear-gradient(90deg, var(--primary), var(--accent-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Zero Overlaps</span>
        </h1>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', marginBottom: '30px' }}>
          Explore our premium electric, luxury, and utility fleet. Reserve with guaranteed availability powered by controlled state-machine validation and Spring Cloud microservices.
        </p>

        {/* Quick Search Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          background: 'rgba(11, 15, 25, 0.7)',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--glass-border)'
        }}>
          
          {/* Search Term */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Search size={14} style={{ display: 'inline', marginRight: '4px' }} /> Search Vehicle
            </label>
            <input
              type="text"
              placeholder="e.g. Tesla, BMW, SUV..."
              className="input-field"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          {/* Location Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> Depot Location
            </label>
            <select
              className="input-field"
              value={filters.location}
              onChange={e => setFilters({ ...filters, location: e.target.value })}
            >
              <option value="ALL">All Hubs & Depots</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Filter size={14} style={{ display: 'inline', marginRight: '4px' }} /> Category
            </label>
            <select
              className="input-field"
              value={filters.category}
              onChange={e => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Max Price: <span style={{ color: 'var(--accent-emerald)', fontWeight: 800 }}>₹{filters.maxPrice.toLocaleString('en-IN')}/day</span>
            </label>
            <input
              type="range"
              min="1000"
              max="20000"
              step="500"
              value={filters.maxPrice}
              onChange={e => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
              style={{ width: '100%', marginTop: '10px', accentColor: 'var(--primary)' }}
            />
          </div>

        </div>

      </div>
    </div>
  );
}
