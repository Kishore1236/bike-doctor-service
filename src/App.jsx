import React, { Component, useEffect, useRef, useState } from 'react';
import Dashboard from './Dashboard';
import MembershipPage from './MembershipPage';
import BookingModal from './BookingModal';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f8f9ff',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.8rem', color: '#1f2438', marginBottom: '12px' }}>Something went wrong</h2>
          <p style={{ color: '#64748b', marginBottom: '24px', maxWidth: '400px' }}>
            We encountered an unexpected error. Click below to reset your session and reload.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              background: '#4c52e9',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 28px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🔄 Reset & Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function PaymentPage({ selectedService, bookingDetails, onBack, onComplete }) {
  const [processing, setProcessing] = useState(false);

  const planName = bookingDetails?.plan || 'Premium Care';
  const displayService = bookingDetails?.service || selectedService;
  const displayTotal = bookingDetails?.totalAmount || '₹ 319';

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      alert(`Payment of ${displayTotal} completed successfully! Redirecting...`);
      onComplete();
    }, 800);
  };

  return (
    <div className="payment-page-shell">
      <div className="payment-card">
        <div className="payment-badge">Secure Checkout</div>
        <h2>Complete Payment</h2>
        <div className="payment-summary">
          <div className="summary-row">
            <span>Service</span>
            <strong>{displayService}</strong>
          </div>
          <div className="summary-row">
            <span>Plan</span>
            <strong>{planName}</strong>
          </div>
          <div className="summary-row total-row">
            <span>Total</span>
            <strong>{displayTotal}</strong>
          </div>
        </div>

        <div className="payment-options">
          <button className="payment-option active" type="button">UPI</button>
          <button className="payment-option" type="button">Card</button>
          <button className="payment-option" type="button">Net Banking</button>
        </div>

        <button className="payment-confirm-btn" type="button" onClick={handlePay} disabled={processing}>
          {processing ? 'Processing...' : `Pay ${displayTotal}`}
        </button>

        <button className="payment-back-btn" type="button" onClick={onBack}>Back to booking</button>
      </div>
    </div>
  );
}

function App() {
  const googleButtonRef = useRef(null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bikeDoctor_user');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        return JSON.parse(stored);
      }
    } catch {
      return null;
    }
    return null;
  });
  const [authError, setAuthError] = useState('');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedService, setSelectedService] = useState('Complete Service');
  const [bookingType, setBookingType] = useState('service');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const channels = [
    { label: 'WhatsApp', code: 'W' },
    { label: 'Email', code: 'E' },
    { label: 'Pickup', code: 'P' },
    { label: 'Care', code: 'C' },
  ];

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('bikeDoctor_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('bikeDoctor_user');
    }
  }, [user]);

  useEffect(() => {
    if (!clientId) {
      setAuthReady(false);
      setAuthError('Google sign-in is configured but needs VITE_GOOGLE_CLIENT_ID in your environment.');
      return;
    }

    const checkGoogle = () => {
      if (!window.google?.accounts?.id) {
        setAuthReady(false);
        setAuthError('Google Identity Services failed to load.');
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response?.credential) {
            setAuthError('Google login was cancelled or failed.');
            return;
          }

          const base64Payload = response.credential.split('.')[1];
          const decoded = JSON.parse(atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/')));
          setUser({
            name: decoded.name || decoded.given_name || 'Google User',
            email: decoded.email || '',
            picture: decoded.picture || '',
          });
          setAuthError('');
        },
      });

      setAuthReady(true);

      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          logo_alignment: 'left',
        });

        window.google.accounts.id.prompt();
      }
    };

    if (window.google?.accounts?.id) {
      checkGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = checkGoogle;
    script.onerror = () => {
      setAuthReady(false);
      setAuthError('Google sign-in script failed to load.');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [clientId, user]);

  if (user) {
    const handleSignOut = () => {
      setUser(null);
      setCurrentPage('dashboard');
      setBookingType('service');
      setSelectedService('Complete Service');
      setAuthError('');
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    };

    const openServiceBooking = (serviceName = 'Complete Service') => {
      setSelectedService(serviceName);
      setBookingType('service');
      setCurrentPage('booking');
    };

    if (currentPage === 'booking') {
      return (
        <BookingModal
          isOpen={true}
          selectedService={selectedService}
          onClose={() => setCurrentPage('dashboard')}
          onProceedToPayment={(details) => {
            setBookingDetails(details);
            setCurrentPage('payment');
          }}
        />
      );
    }

    if (currentPage === 'payment') {
      return (
        <PaymentPage
          selectedService={selectedService}
          bookingDetails={bookingDetails}
          onBack={() => setCurrentPage('booking')}
          onComplete={() => {
            setCurrentPage('dashboard');
            setBookingType('service');
            setBookingDetails(null);
          }}
        />
      );
    }

    return (
      <Dashboard 
        user={user} 
        onSignOut={handleSignOut} 
        onNavigate={(page) => setCurrentPage(page)}
        onBookService={openServiceBooking}
      />
    );
  }

  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <div className="auth-brand">
          <div className="brand-cloud" aria-hidden="true">🏍</div>
          <span>BikeDoctor</span>
        </div>

        <div className="hero-copy">
          <h1>
            Schedule bike care
            <br />
            across every service
          </h1>

          <p>
            Book doorstep pickup, expert cleaning, and maintenance on your schedule—without leaving home.
          </p>
        </div>

        <div className="channel-grid" aria-label="BikeDoctor service channels">
          {channels.map((channel) => (
            <div className="channel-box" key={channel.label}>
              <div className="channel-icon">{channel.code}</div>
              <span>{channel.label}</span>
            </div>
          ))}
        </div>

        <div className="auth-footer">© 2026 Bike Doctor. Service-first bike care scheduling.</div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-icon" aria-hidden="true">🏍</div>

          <h2>Welcome to BikeDoctor</h2>
          <p>Sign in with your Google account to manage bookings and bike care services</p>

          <div className={`google-signin-wrapper ${authError ? 'error-mode' : ''}`}>
            {!clientId ? (
              <button type="button" className="google-signin-fallback" disabled>
                <span className="google-g">G</span>
                <span>Google sign-in unavailable</span>
              </button>
            ) : (
              <div ref={googleButtonRef} key={user ? 'signed-out' : 'signed-in'} />
            )}
          </div>
          {authError && <div className="auth-error">{authError}</div>}

          <div className="auth-divider">
            <span>or sign in directly</span>
          </div>

          <button
            type="button"
            className="google-direct-signin-btn"
            onClick={() => {
              const email = prompt('Enter your Google email address:', 'kk863614@gmail.com');
              if (email && email.trim()) {
                const namePart = email.trim().split('@')[0];
                const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                setUser({
                  name: formattedName,
                  email: email.trim(),
                  picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${namePart}`,
                });
                setAuthError('');
              }
            }}
          >
            <span className="google-g-icon">G</span>
            <span>Sign In with Any Google Account</span>
          </button>

          <button
            type="button"
            className="demo-signin-btn"
            onClick={() => {
              setUser({
                name: 'Alex Rider',
                email: 'alex.rider@example.com',
                picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
              });
              setAuthError('');
            }}
          >
            ⚡ Continue as Guest (Demo Mode)
          </button>

          <div className="secure-copy">Secure authentication powered by BikeDoctor</div>
        </div>
      </main>
    </div>
  );
}

export default function RootApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
