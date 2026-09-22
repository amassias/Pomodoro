import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="glass-panel"
          style={{
            maxWidth: 560,
            margin: '2rem auto',
            padding: '1.5rem',
            textAlign: 'center'
          }}
        >
          <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
          <p style={{ margin: '0.75rem 0 1.25rem' }}>
            Please reload the page. If the issue persists, try signing out and back in.
          </p>
          <button type="button" className="primary-btn" onClick={this.handleReload}>
            Reload
          </button>
          <style>{`
            .primary-btn {
              background: #fff;
              color: #000;
              padding: 1rem 3rem;
              border-radius: 99px;
              font-weight: 600;
              letter-spacing: 2px;
              font-size: 1rem;
            }
            .primary-btn:hover {
              transform: scale(1.05);
              box-shadow: 0 0 20px rgba(255,255,255,0.4);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
