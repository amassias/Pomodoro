import React, { useEffect, useMemo, useState } from 'react';

const CitySelector = ({ currentCity, cities, onSelect, isLoading = false, error = null }) => {
  const categories = useMemo(
    () => cities ? [...new Set(Object.values(cities).map(c => c.category))] : [],
    [cities]
  );
  
  const [activeCategory, setActiveCategory] = useState('Urban Night');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const currentCityName = cities?.[currentCity]?.name || 'Select Location';

  const renderExpandedContent = () => {
    if (isLoading) return <div className="status-msg">Loading locations…</div>;
    if (error) return <div className="status-msg">Unable to load locations</div>;
    if (!cities || Object.keys(cities).length === 0) return <div className="status-msg">No locations available</div>;

    return (
      <div className="expanded-content">
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveCategory(cat);
              }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(key);
                  setIsExpanded(false);
                }}
              >
                {city.name}
              </button>
            ))}
        </div>
      </div>
    );
  };

  return (
    <footer className={`bottom-bar glass-panel ${isExpanded ? 'expanded' : ''}`}>
      <div 
        className="footer-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <p className="location-text">
          {isLoading
            ? 'Loading locations…'
            : currentCity && currentCityName
              ? `Studying in ${currentCityName}`
              : error
                ? 'Unable to load locations'
                : 'No available locations'}
        </p>
        <span className="chevron">{isExpanded ? '⌃' : '⌄'}</span>
      </div>

      {isExpanded && (
        <div className="expanded-panel">
          {renderExpandedContent()}
        </div>
      )}

      <style jsx>{`
        .bottom-bar {
          position: fixed;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          width: auto;
          min-width: 200px;
          max-width: 90%;
          padding: 0;
          margin: 0;
          z-index: 100;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          border-radius: 99px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .bottom-bar.expanded {
          max-height: 70vh;
          overflow-y: auto;
          width: 90%;
          max-width: 900px;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .footer-header {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 1.2rem;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
          border-radius: inherit;
        }

        .bottom-bar.expanded .footer-header {
          padding: 0.8rem 2rem;
          border-radius: 20px 20px 0 0;
        }

        .footer-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .location-text {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 400;
          letter-spacing: 0.5px;
          transition: font-size 0.3s;
        }

        .bottom-bar.expanded .location-text {
          font-size: 1.1rem;
          letter-spacing: 1px;
        }

        .chevron {
          font-size: 1rem;
          opacity: 0.6;
          transition: all 0.3s ease;
          margin-left: 0.4rem;
        }

        .bottom-bar.expanded .chevron {
          font-size: 1.2rem;
          opacity: 0.5;
          margin-left: 0.5rem;
        }

        .expanded-panel {
          padding: 1rem 2rem 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .expanded-content {
          width: 100%;
        }

        .category-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .cat-btn {
          background: rgba(255,255,255,0.08);
          border: none;
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          border-radius: 99px;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: 0.2s;
          cursor: pointer;
          font-weight: 600;
        }

        .cat-btn:hover {
          background: rgba(255,255,255,0.2);
          color: #fff;
        }

        .cat-btn.active {
          background: #fff;
          color: #000;
        }

        .city-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.6rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .city-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-secondary);
          padding: 0.7rem 1.2rem;
          border-radius: 12px;
          font-size: 1rem;
          transition: 0.2s;
          cursor: pointer;
          min-width: 120px;
        }

        .city-btn:hover {
          border-color: rgba(255,255,255,0.4);
          color: #fff;
          background: rgba(255,255,255,0.05);
          transform: translateY(-2px);
        }

        .city-btn.active {
          border-color: var(--accent-color);
          background: rgba(255, 107, 107, 0.15);
          color: white;
        }

        .status-msg {
          color: var(--text-secondary);
          padding: 1rem;
          text-align: center;
        }

        @media (max-width: 768px) {
          .bottom-bar {
            width: 100%;
            margin: 0;
            border-radius: 24px 24px 0 0;
          }

          .footer-header {
            padding: 1rem 1.5rem;
          }

          .expanded-panel {
            padding: 1rem 1rem 1.5rem;
          }

          .city-btn {
            min-width: 100px;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </footer>
  );
};

export default CitySelector;
