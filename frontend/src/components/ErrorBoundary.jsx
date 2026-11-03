import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-dark, #0F1117)',
          color: 'var(--text-primary, #F8FAFC)',
          padding: 24,
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            background: 'var(--bg-card, #1A1D27)',
            padding: '36px 28px',
            borderRadius: 20,
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            boxShadow: '0 20px 48px rgba(0,0,0,0.4)'
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: 'var(--primary, #FF5722)' }}>
              Something Went Wrong
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.6, margin: '0 0 24px' }}>
              We encountered an unexpected issue while loading this page. Please try reloading or return to the home screen.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  background: 'var(--primary, #FF5722)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #94A3B8)',
                  border: '1px solid var(--border, rgba(255,255,255,0.15))',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
