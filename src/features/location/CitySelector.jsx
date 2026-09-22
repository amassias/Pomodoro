import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUserData } from '../../providers/UserDataProvider.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus';

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

const CitySelector = ({ currentCity, currentCityLabel, cities, onSelect, isLoading = false, error = null, validationFailed = false }) => {
  const { favoriteCities, toggleFavorite, addCustomLocation, removeCustomLocation, settings, setSettings } = useUserData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationUrl, setNewLocationUrl] = useState('');
  const [addError, setAddError] = useState('');
  const addDialogRef = useRef(null);
  const closeAddDialog = useCallback(() => setShowAddModal(false), []);
  useDialogFocus({ open: showAddModal, onClose: closeAddDialog, dialogRef: addDialogRef });

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
  const [isMenuRendered, setIsMenuRendered] = useState(false);
  const expansionTimerRef = useRef(null);
  const effectiveActiveCategory = categories.includes(activeCategory)
    ? activeCategory
    : (categories[0] || '');

  const currentCityName = currentCityLabel || cities?.[currentCity]?.name || 'Select Location';

  const closeExpandedMenu = useCallback(() => {
    if (expansionTimerRef.current) {
      window.clearTimeout(expansionTimerRef.current);
    }
    setIsExpanded(false);
    expansionTimerRef.current = window.setTimeout(() => {
      setIsMenuRendered(false);
      expansionTimerRef.current = null;
    }, 280);
  }, []);

  const toggleExpandedMenu = useCallback(() => {
    if (expansionTimerRef.current) {
      window.clearTimeout(expansionTimerRef.current);
      expansionTimerRef.current = null;
    }

    if (isExpanded) {
      closeExpandedMenu();
      return;
    }

    setIsMenuRendered(true);
    const reveal = () => setIsExpanded(true);
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(reveal);
    else window.setTimeout(reveal, 0);
  }, [closeExpandedMenu, isExpanded]);

  useEffect(() => () => {
    if (expansionTimerRef.current) {
      window.clearTimeout(expansionTimerRef.current);
    }
  }, []);

  const saveAtmosphere = () => {
    const name = window.prompt('Atmosphere name');
    if (!name?.trim()) return;
    const collection = { id: crypto.randomUUID(), name: name.trim().slice(0, 24), city: currentCity, musicProvider: settings.musicProvider || 'lofi', createdAt: new Date().toISOString() };
    setSettings({ ...settings, atmosphereCollections: [...(Array.isArray(settings.atmosphereCollections) ? settings.atmosphereCollections : []), collection].slice(-8) });
  };

  const applyAtmosphere = (collection) => {
    if (cities?.[collection.city]) onSelect(collection.city);
    setSettings({ ...settings, musicProvider: collection.musicProvider || 'lofi' });
    closeExpandedMenu();
  };

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
      if (effectiveActiveCategory === 'Favorites') {
        return favoriteCities.includes(key);
      }
      return city.category === effectiveActiveCategory;
    });

    if (visibleCitiesEntry.length === 0 && effectiveActiveCategory === 'Favorites') {
      // This can happen if user un-favorites the last item in the list
      return <div className="status-msg">No favorites yet</div>;
    }

    const isCustomCategory = effectiveActiveCategory === 'Custom';

    return (
      <div className="expanded-content">
        <p className="status-msg">Unavailable streams are temporarily hidden. Availability is checked every 5 minutes.</p>
        <div className="atmosphere-collections">
          <button className="save-atmosphere" onClick={saveAtmosphere}>Save current atmosphere</button>
          {(Array.isArray(settings.atmosphereCollections) ? settings.atmosphereCollections : []).map(collection => (
            <div key={collection.id}>
              <button onClick={() => applyAtmosphere(collection)}>{collection.name}</button>
              <button aria-label={`Delete ${collection.name}`} onClick={() => setSettings({ ...settings, atmosphereCollections: settings.atmosphereCollections.filter(item => item.id !== collection.id) })}>×</button>
            </div>
          ))}
        </div>
        {validationFailed && (
          <div className="validation-warning">
            ⚠️ Some streams may be offline. Couldn't verify availability.
          </div>
        )}
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-btn ${effectiveActiveCategory === cat ? 'active' : ''}`}
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
                  closeExpandedMenu();
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
      <footer className={`bottom-bar glass-panel location-menu-compact location-menu-low location-menu-curtain ${isExpanded || isMenuRendered ? 'expanded' : ''}`}>
        <button type="button" className="footer-header" aria-expanded={isExpanded} aria-controls={isMenuRendered ? 'location-options' : undefined} onClick={toggleExpandedMenu}>
          <p className="location-text">{isLoading ? 'Loading locations…' : currentCity && currentCityName ? `Studying in ${currentCityName}` : error ? 'Unable to load locations' : 'No available locations'}</p>
          <span className="chevron">{isExpanded ? '⌃' : '⌄'}</span>
        </button>
        {isMenuRendered && (
          <div className={`expanded-panel ${isExpanded ? 'is-open' : ''}`} id="location-options" aria-hidden={!isExpanded} inert={!isExpanded}>
            <div className="expanded-panel-inner">{renderExpandedContent()}</div>
          </div>
        )}
      </footer>

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="add-modal-overlay" onClick={closeAddDialog}>
          <div ref={addDialogRef} className="add-modal glass-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-location-title">
            <div className="add-modal-header">
              <h3 id="add-location-title">Add Custom Location</h3>
              <button className="close-btn" onClick={closeAddDialog} aria-label="Close custom location dialog">×</button>
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

      <style>{`
        .footer-header { width: 100%; color: var(--text-primary); background: transparent; font: inherit; }
        .atmosphere-collections { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.75rem; }
        .atmosphere-collections > div { display: flex; border: 1px solid var(--glass-border); border-radius: 999px; overflow: hidden; }
        .atmosphere-collections button { padding: 0.38rem 0.58rem; background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.68rem; }
        .atmosphere-collections .save-atmosphere { color: var(--accent-color); border: 1px dashed rgba(255,113,107,0.45); border-radius: 999px; }
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

        .bottom-bar.location-menu-low,
        .bottom-bar.location-menu-low.expanded {
          bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
        }

        .bottom-bar.location-menu-low.expanded {
          max-height: min(62vh, calc(100vh - 3.5rem));
        }

        .bottom-bar.location-menu-curtain {
          transition: width 220ms cubic-bezier(0.16, 1, 0.3, 1), max-height 220ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 180ms ease-out, box-shadow 180ms ease-out;
        }

        .bottom-bar.location-menu-curtain .expanded-panel {
          clip-path: inset(100% 0 0 0 round 0 0 18px 18px);
          transition: grid-template-rows 280ms cubic-bezier(0.16, 1, 0.3, 1), clip-path 220ms ease-out, opacity 180ms ease-out, border-color 180ms ease-out;
        }

        .bottom-bar.location-menu-curtain .expanded-panel.is-open {
          clip-path: inset(0 0 0 0 round 0 0 18px 18px);
          transition: grid-template-rows 280ms cubic-bezier(0.16, 1, 0.3, 1), clip-path 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out, border-color 180ms ease-out;
        }

        .bottom-bar.expanded {
          bottom: calc(1rem + 5.5rem);
          max-height: 70vh;
          overflow-y: auto;
          width: 90%;
          max-width: 900px;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .bottom-bar.location-menu-compact {
          min-width: 180px;
          max-width: min(840px, 86vw);
        }

        .bottom-bar.location-menu-compact.expanded {
          width: min(840px, 86vw);
          max-width: min(840px, 86vw);
          max-height: 62vh;
          border-radius: 18px;
        }

        .bottom-bar.location-menu-compact.expanded .footer-header { padding: 0.6rem 1rem; }
        .bottom-bar.location-menu-compact.expanded .footer-header { border-radius: 18px 18px 0 0; }
        .bottom-bar.location-menu-compact .expanded-panel-inner { padding: 0.65rem 1rem 1rem; }
        .bottom-bar.location-menu-compact .status-msg { padding: 0.7rem; }
        .bottom-bar.location-menu-compact .category-tabs { gap: 0.3rem; margin-bottom: 0.8rem; }
        .bottom-bar.location-menu-compact .city-grid { gap: 0.45rem; }
        .bottom-bar.location-menu-compact .city-btn {
          min-width: 118px;
          padding: 0.5rem 0.75rem;
          font-size: 0.86rem;
        }

        .footer-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.5rem 1.2rem;
          cursor: pointer;
          user-select: none;
          transition: color 180ms ease-out, background-color 220ms ease-out, transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: inherit;
        }

        .footer-header[aria-expanded="true"] { background: rgba(255, 113, 107, 0.08); }
        .footer-header:active { transform: scale(0.985); }

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
          transform-origin: 50% 55%;
          transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), color 180ms ease-out, opacity 180ms ease-out, font-size 300ms ease;
        }

        .footer-header[aria-expanded="true"] .chevron { transform: rotate(180deg); color: var(--accent-color); }

        .bottom-bar.expanded .chevron {
          font-size: 1.2rem;
          opacity: 0.5;
        }

        @media (prefers-reduced-motion: reduce) {
          .footer-header,
          .footer-header .chevron {
            transition-duration: 1ms;
          }
        }

        .expanded-panel {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
          padding: 0;
          border-top: 0 solid transparent;
          transition: grid-template-rows 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out, border-color 180ms ease-out;
        }

        .expanded-panel.is-open {
          grid-template-rows: 1fr;
          opacity: 1;
          pointer-events: auto;
          border-top-width: 1px;
          border-top-color: rgba(255, 255, 255, 0.1);
        }

        .expanded-panel-inner {
          min-height: 0;
          overflow: hidden;
          padding: 1rem 2rem 2rem;
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
          background: var(--accent-soft);
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
            bottom: 0;
            height: 80vh; /* More height on mobile */
            max-height: 80vh;
            border-radius: 24px 24px 0 0;
          }

          .bottom-bar.location-menu-compact,
          .bottom-bar.location-menu-compact.expanded {
            width: 100%;
            max-width: 100%;
          }

          .bottom-bar.location-menu-compact.expanded {
            height: 80vh;
            max-height: 80vh;
            border-radius: 24px 24px 0 0;
          }

          .bottom-bar.location-menu-compact.expanded .footer-header {
            border-radius: 24px 24px 0 0;
          }

          .expanded-panel-inner { padding: 1rem 1rem calc(1.5rem + env(safe-area-inset-bottom, 0px)); }

          .footer-header {
            padding: 1rem 1.5rem;
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
