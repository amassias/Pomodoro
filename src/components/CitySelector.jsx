import React, { useEffect, useMemo, useState } from 'react';
import { useUserData } from '../context/UserDataContext.jsx';

// Extract YouTube video ID from various URL formats
const extractYouTubeId = (input) => {
  if (!input) return null;
  
  // Already a video ID (11 characters, alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }
  
  // YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

const CitySelector = ({ currentCity, cities, onSelect, isLoading = false, error = null, validationFailed = false }) => {
  const { favoriteCities, toggleFavorite, customLocations, addCustomLocation, removeCustomLocation } = useUserData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationUrl, setNewLocationUrl] = useState('');
  const [addError, setAddError] = useState('');

  const categories = useMemo(() => {
    if (!cities) return [];

    // Get unique categories from cities
    const allCats = [...new Set(Object.values(cities).map(c => c.category))];

    // If we have any favorites, prepend "Favorites" category
    if (favoriteCities && favoriteCities.length > 0) {
      return ['Favorites', ...allCats];
    }
    return allCats;
  }, [cities, favoriteCities]);

  const [activeCategory, setActiveCategory] = useState(
    (favoriteCities && favoriteCities.length > 0) ? 'Favorites' : 'Urban Night'
  );

  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-switch to newly appearing category if current active one disappears (unlikely here but good practice)
  // Also default to Favorites if available on first load
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const currentCityName = cities?.[currentCity]?.name || 'Select Location';

  const handleAddLocation = () => {
    setAddError('');
    
    const name = newLocationName.trim();
    if (!name) {
      setAddError('Please enter a name for this location');
      return;
    }
    
    const videoId = extractYouTubeId(newLocationUrl);
    if (!videoId) {
      setAddError('Please enter a valid YouTube URL or video ID');
      return;
    }
    
    const key = addCustomLocation(name, videoId);
    setNewLocationName('');
    setNewLocationUrl('');
    setShowAddModal(false);
    setActiveCategory('Custom');
    onSelect(key);
  };

  const renderExpandedContent = () => {
    if (isLoading) return <div className="status-msg">Loading locations…</div>;
    // Only show full error if no cities available (validation failed AND no fallback)
    if (error && (!cities || Object.keys(cities).length === 0)) {
      return <div className="status-msg">Unable to load locations</div>;
    }
    if (!cities || Object.keys(cities).length === 0) return <div className="status-msg">No locations available</div>;

    const visibleCitiesEntry = Object.entries(cities).filter(([key, city]) => {
      if (activeCategory === 'Favorites') {
        return favoriteCities.includes(key);
      }
      return city.category === activeCategory;
    });

    if (visibleCitiesEntry.length === 0 && activeCategory === 'Favorites') {
      // This can happen if user un-favorites the last item in the list
      return <div className="status-msg">No favorites yet</div>;
    }

    const isCustomCategory = activeCategory === 'Custom';

    return (
      <div className="expanded-content">
        {validationFailed && (
          <div className="validation-warning">
            ⚠️ Some streams may be offline. Couldn't verify availability.
          </div>
        )}
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
              {cat === 'Favorites' ? '❤️ Favorites' : cat === 'Custom' ? '➕ Custom' : cat}
            </button>
          ))}
        </div>

        <div className="city-grid">
          {visibleCitiesEntry.map(([key, city]) => {
            const isFav = favoriteCities.includes(key);
            const isCustom = key.startsWith('custom_');
            return (
              <button
                key={key}
                className={`city-btn ${currentCity === key ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(key);
                  setIsExpanded(false);
                }}
              >
                <div className="city-btn-inner">
                  <span>{city.name}</span>
                  <div className="city-btn-actions">
                    {isCustom && (
                      <span
                        className="delete-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove "${city.name}" from your custom locations?`)) {
                            removeCustomLocation(key);
                          }
                        }}
                        title="Remove custom location"
                      >
                        🗑️
                      </span>
                    )}
                    <span
                      className={`fav-icon ${isFav ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(key);
                      }}
                      title={isFav ? "Remove from favorites" : "Add to favorites"}
                    >
                      {isFav ? '❤️' : '🤍'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
          
          {/* Add Location Button - show in Custom category or when it's empty */}
          {(isCustomCategory || visibleCitiesEntry.length === 0) && (
            <button
              className="city-btn add-location-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddModal(true);
              }}
            >
              <div className="city-btn-inner">
                <span>➕ Add Location</span>
              </div>
            </button>
          )}
        </div>

        {/* Always show Add Location at the bottom */}
        {!isCustomCategory && visibleCitiesEntry.length > 0 && (
          <div className="add-location-footer">
            <button
              className="add-location-small-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddModal(true);
              }}
            >
              ➕ Add your own YouTube stream
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
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
      </footer>

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="add-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="add-modal-header">
              <h3>Add Custom Location</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <div className="add-modal-body">
              <p className="add-modal-hint">
                Paste a YouTube video or livestream URL to use as your background.
              </p>
              
              <div className="add-modal-field">
                <label>Location Name</label>
                <input
                  type="text"
                  placeholder="e.g., My Cozy Cafe"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="add-modal-field">
                <label>YouTube URL or Video ID</label>
                <input
                  type="text"
                  placeholder="e.g., https://youtube.com/watch?v=..."
                  value={newLocationUrl}
                  onChange={(e) => setNewLocationUrl(e.target.value)}
                />
              </div>
              
              {addError && <div className="add-modal-error">{addError}</div>}
              
              <button className="add-modal-submit" onClick={handleAddLocation}>
                Add Location
              </button>
            </div>
          </div>
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
          min-width: 140px;
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

        .city-btn-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            width: 100%;
        }

        .fav-icon {
            font-size: 0.9rem;
            opacity: 0.3;
            transition: all 0.2s;
            padding: 2px;
            border-radius: 50%;
        }

        .city-btn:hover .fav-icon {
            opacity: 0.7;
        }

        .fav-icon:hover {
            opacity: 1 !important;
            transform: scale(1.2);
            background: rgba(255,255,255,0.1);
        }
        
        .fav-icon.liked {
            opacity: 1;
        }

        .status-msg {
          color: var(--text-secondary);
          padding: 1rem;
          text-align: center;
        }

        .validation-warning {
          background: rgba(255, 193, 7, 0.15);
          border: 1px solid rgba(255, 193, 7, 0.3);
          color: #ffc107;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          text-align: center;
          margin-bottom: 0.75rem;
        }

        @media (max-width: 768px) {
          .bottom-bar {
            width: 100%;
            margin: 0;
            bottom: 0px;
            border-radius: 24px 24px 0 0;
          }

          .bottom-bar.expanded {
            width: 100%;
            height: 80vh; /* More height on mobile */
            max-height: 80vh;
            border-radius: 24px 24px 0 0;
          }

          .expanded-panel {
             /* Add safe area padding for devices with home indicator */
             padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
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

        /* Add Location Modal Styles */
        .add-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .add-modal {
          width: 90%;
          max-width: 400px;
          padding: 1.5rem;
          border-radius: 16px;
        }

        .add-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .add-modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .add-modal-header .close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .add-modal-hint {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 1rem;
        }

        .add-modal-field {
          margin-bottom: 1rem;
        }

        .add-modal-field label {
          display: block;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 0.4rem;
        }

        .add-modal-field input {
          width: 100%;
          padding: 0.7rem 0.8rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.25);
          color: rgba(255, 255, 255, 0.95);
          outline: none;
          font-size: 0.95rem;
        }

        .add-modal-field input:focus {
          border-color: rgba(255, 255, 255, 0.4);
        }

        .add-modal-error {
          color: #ff6b6b;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }

        .add-modal-submit {
          width: 100%;
          padding: 0.8rem;
          border-radius: 10px;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-modal-submit:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .add-location-footer {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
        }

        .add-location-small-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-location-small-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.9);
        }

        .add-location-btn {
          border-style: dashed !important;
          opacity: 0.7;
        }

        .add-location-btn:hover {
          opacity: 1;
        }

        .city-btn-actions {
          display: flex;
          gap: 0.3rem;
          align-items: center;
        }

        .delete-icon {
          font-size: 0.85rem;
          opacity: 0.6;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .delete-icon:hover {
          opacity: 1;
        }
      `}</style>
    </>
  );
};

export default CitySelector;
