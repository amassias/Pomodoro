import React, { useEffect, useMemo, useState } from 'react';

const CitySelector = ({ currentCity, cities, onSelect, isLoading = false, error = null }) => {
  if (isLoading) {
    return (
      <div className="city-selector-container">
        <div className="category-tabs" />
        <div className="city-grid">
          <div style={{ color: 'var(--text-secondary)', opacity: 0.9 }}>
            Loading locations…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="city-selector-container">
        <div className="category-tabs" />
        <div className="city-grid">
          <div style={{ color: 'var(--text-secondary)', opacity: 0.9 }}>
            {error === 'dev_api_unavailable'
              ? 'Dev mode: /api is not running (use Vercel dev to validate live streams)'
              : 'Unable to load locations'}
          </div>
        </div>
      </div>
    );
  }

  const categories = useMemo(
    () => [...new Set(Object.values(cities).map(c => c.category))],
    [cities]
  );
  const [activeCategory, setActiveCategory] = useState('Urban Night');

  useEffect(() => {
    if (!categories.length) return;
    if (categories.includes(activeCategory)) return;
    setActiveCategory(categories[0]);
  }, [activeCategory, categories]);

  if (!categories.length) {
    return (
      <div className="city-selector-container">
        <div className="category-tabs" />
        <div className="city-grid">
          <div style={{ color: 'var(--text-secondary)', opacity: 0.9 }}>
            No available locations
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="city-selector-container">
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="city-grid">
        {Object.entries(cities)
          .filter(([_, city]) => city.category === activeCategory)
          .map(([key, city]) => (
            <button
              key={key}
              className={`city-btn ${currentCity === key ? 'active' : ''}`}
              onClick={() => onSelect(key)}
            >
              {city.name}
            </button>
          ))}
      </div>

      <style jsx>{`
        .city-selector-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
        }
        .category-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .cat-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: var(--text-secondary);
          padding: 0.4rem 0.8rem;
          border-radius: 99px;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.2s;
        }
        .cat-btn:hover, .cat-btn.active {
          background: #fff;
          color: #000;
        }
        .city-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
          max-width: 800px;
        }
        .city-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 400;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .city-btn:hover {
          border-color: #fff;
          color: #fff;
          background: rgba(255,255,255,0.05);
        }
        .city-btn.active {
          border-color: var(--accent-color);
          color: #fff;
          background: rgba(255, 107, 107, 0.1);
        }
      `}</style>
    </div>
  );
};

export default CitySelector;
