import React, { Component, useEffect, useRef, useState } from 'react';
import Dashboard from './Dashboard';
import MembershipPage from './MembershipPage';
import BookingModal from './BookingModal';
import ConfirmationModal from './ConfirmationModal';
import MyBookingsModal from './MyBookingsModal';

const API_URL = (() => {
  let apiUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!apiUrl) {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      apiUrl = 'https://bike-doctor-backend-vert.vercel.app';
    } else {
      apiUrl = ''; // Use Vercel serverless API functions inside bike-doctor-service/api/payment
    }
  }
  return apiUrl.replace(/\/$/, '');
})();

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
  const [payMode, setPayMode] = useState('online'); // 'online' | 'service'
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card', 'netbanking'
  const [errorMsg, setErrorMsg] = useState('');

  const planName = bookingDetails?.planName || bookingDetails?.plan || 'Premium Care';
  const displayService = bookingDetails?.serviceName || bookingDetails?.service || selectedService;
  const displayTotal = bookingDetails?.totalAmount || '₹319';

  const handlePayOnline = async () => {
    if (processing) return;
    setErrorMsg('');
    if (!window.Razorpay) {
      setErrorMsg('Razorpay SDK failed to load. Please refresh the page or check your internet connection.');
      return;
    }

    setProcessing(true);

    try {
      // 1. Create order on backend
      const res = await fetch(`${API_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName,
          locationType: bookingDetails?.locationType || bookingDetails?.location || 'home',
          bookingDetails: {
            ...bookingDetails,
            paymentMethod,
          },
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to create Razorpay payment order.');
      }

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || orderData.keyId;

      // 2. Open Razorpay Checkout modal
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Bike Doctor',
        description: `${planName} Service Booking`,
        order_id: orderData.orderId,
        prefill: {
          name: bookingDetails?.name || bookingDetails?.pickupPerson || '',
          email: bookingDetails?.email || '',
          contact: bookingDetails?.mobile || bookingDetails?.phone || '',
          method: paymentMethod,
        },
        config: {
          display: {
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async function (response) {
          try {
            // 3. Verify payment signature on backend
            const verifyRes = await fetch(`${API_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingDetails: {
                  ...bookingDetails,
                  paymentMethod: 'Pay Online (' + paymentMethod.toUpperCase() + ')',
                  totalAmount: displayTotal,
                  planName,
                  serviceName: displayService,
                },
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              const record = {
                bookingId: verifyData.bookingId || `BK${Date.now().toString().slice(-6)}`,
                totalAmount: displayTotal,
                amount: displayTotal,
                planName,
                plan: planName,
                serviceName: displayService,
                service: displayService,
                bikeModel: bookingDetails?.bikeModel || 'Bike Service',
                timeSlot: bookingDetails?.timeSlot || '09:00 AM - 11:00 AM',
                name: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
                customerName: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
                email: bookingDetails?.email || '',
                phone: bookingDetails?.mobile || bookingDetails?.phone || '',
                location: bookingDetails?.landmark || bookingDetails?.location || '',
                paymentMethod: `Pay Online (${paymentMethod.toUpperCase()})`,
                paymentStatus: 'PAID',
                createdAt: new Date().toLocaleString(),
                timestamp: new Date().toLocaleString(),
              };
              setProcessing(false);
              onComplete(record);
            } else {
              setErrorMsg(verifyData.message || 'Payment signature verification failed on backend server.');
              setProcessing(false);
            }
          } catch (err) {
            console.error('Verification error:', err);
            setErrorMsg('Network error while verifying payment signature with server.');
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setErrorMsg(resp.error?.description || 'Payment transaction was declined or failed.');
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Order creation error:', err);
      setErrorMsg(err.message || 'Could not connect to payment backend server.');
      setProcessing(false);
    }
  };

  const handlePayAtService = async () => {
    if (processing) return;
    setErrorMsg('');
    setProcessing(true);

    const payloadDetails = {
      ...bookingDetails,
      paymentMethod: 'Pay at Service',
      paymentStatus: 'Pending',
      totalAmount: displayTotal,
      planName,
      serviceName: displayService,
    };

    let bookingId = bookingDetails?.bookingId || `BK${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    const scriptUrl = import.meta.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || import.meta.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec';

    try {
      const res = await fetch(`${API_URL}/api/payment/pay-at-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingDetails: payloadDetails }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.bookingId) {
          bookingId = data.bookingId;
        }
      }
    } catch (err) {
      console.warn('Pay at Service API notice:', err.message);
    }

    // Direct Google Sheets client dispatch fallback
    try {
      const formattedTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const userEmailVal = bookingDetails?.email ? String(bookingDetails.email).trim().toLowerCase() : '';
      const rawLoc = bookingDetails?.landmark || bookingDetails?.location || bookingDetails?.address || '';
      const locWithEmail = (userEmailVal && !rawLoc.toLowerCase().includes(userEmailVal)) ? `${rawLoc} | ${userEmailVal}` : rawLoc;

      const directPayload = {
        bookingId,
        name: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
        customerName: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
        'Name': bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
        email: bookingDetails?.email || 'Not provided',
        'Email': bookingDetails?.email || 'Not provided',
        phone: bookingDetails?.mobile || bookingDetails?.phone || '',
        mobile: bookingDetails?.mobile || bookingDetails?.phone || '',
        'Mobile': bookingDetails?.mobile || bookingDetails?.phone || '',
        altPhone: bookingDetails?.altMobile || 'Not provided',
        altMobile: bookingDetails?.altMobile || 'Not provided',
        alternateMobile: bookingDetails?.altMobile || 'Not provided',
        'Alternate Mobile': bookingDetails?.altMobile || 'Not provided',
        pickupPerson: bookingDetails?.pickupPerson || bookingDetails?.name || '',
        pickupName: bookingDetails?.pickupPerson || bookingDetails?.name || '',
        bikeOwnerName: bookingDetails?.pickupPerson || bookingDetails?.name || '',
        'Bike Owner Name': bookingDetails?.pickupPerson || bookingDetails?.name || '',
        receiver: bookingDetails?.receiverName || bookingDetails?.receiver || 'Not provided',
        receiverName: bookingDetails?.receiverName || bookingDetails?.receiver || 'Not provided',
        alternateContactPerson: bookingDetails?.receiverName || bookingDetails?.receiver || 'Not provided',
        'Alternate Contact person': bookingDetails?.receiverName || bookingDetails?.receiver || 'Not provided',
        location: locWithEmail,
        address: locWithEmail,
        landmark: locWithEmail,
        'Location': locWithEmail,
        locationType: bookingDetails?.locationType || bookingDetails?.pickupType || 'home',
        pickupType: bookingDetails?.pickupType || bookingDetails?.locationType || 'home',
        'Pickup Type': bookingDetails?.pickupType || bookingDetails?.locationType || 'home',
        timeSlot: bookingDetails?.timeSlot || '',
        time_slot: bookingDetails?.timeSlot || '',
        'Time Slot': bookingDetails?.timeSlot || '',
        bikeModel: bookingDetails?.bikeModel || '',
        bike_model: bookingDetails?.bikeModel || '',
        'Bike Model': bookingDetails?.bikeModel || '',
        service: displayService,
        plan: planName,
        'Plan': planName,
        amount: displayTotal,
        totalAmount: displayTotal,
        paymentMethod: 'Pay at Service',
        paymentStatus: 'Pending',
        bookingStatus: 'CONFIRMED',
        timestamp: formattedTimestamp,
        createdAt: formattedTimestamp,
        'Timestamp': formattedTimestamp,
      };

      const scriptUrls = [
        import.meta.env.VITE_GOOGLE_CUSTOMER_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxyCbvsvoQxXSpXjiJykrfWRyPy_fXSi4Ulr-zx7szw-R-VLLf8yY0HwVyHaLmXIHd8yw/exec',
        import.meta.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || import.meta.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec'
      ];

      for (const sUrl of scriptUrls) {
        if (!sUrl) continue;
        try {
          const params = new URLSearchParams();
          Object.entries(directPayload).forEach(([k, v]) => {
            if (v !== undefined && v !== null) params.append(k, String(v));
          });
          const fullScriptUrl = `${sUrl}${sUrl.includes('?') ? '&' : '?'}${params.toString()}`;

          await fetch(fullScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            mode: 'no-cors',
            body: JSON.stringify(directPayload),
          });
        } catch (e) {}
      }
    } catch (directErr) {
      console.warn('Direct Google Script client dispatch notice:', directErr);
    }

    const record = {
      bookingId,
      totalAmount: displayTotal,
      amount: displayTotal,
      planName,
      plan: planName,
      serviceName: displayService,
      service: displayService,
      bikeModel: bookingDetails?.bikeModel || 'Bike Service',
      timeSlot: bookingDetails?.timeSlot || '09:00 AM - 11:00 AM',
      name: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
      customerName: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
      email: bookingDetails?.email || '',
      phone: bookingDetails?.mobile || bookingDetails?.phone || '',
      location: bookingDetails?.landmark || bookingDetails?.location || '',
      paymentMethod: 'Pay at Service',
      paymentStatus: 'Pending',
      createdAt: new Date().toLocaleString(),
      timestamp: new Date().toLocaleString(),
    };

    setProcessing(false);
    onComplete(record);
  };

  const handleConfirmAction = () => {
    if (payMode === 'online') {
      handlePayOnline();
    } else {
      handlePayAtService();
    }
  };

  return (
    <div className="payment-page-shell">
      <div className="payment-card">
        <div className="payment-badge">Checkout & Confirm</div>
        <h2>Select Payment Method</h2>
        <div className="payment-summary">
          {bookingDetails?.bikeModel && (
            <div className="summary-row">
              <span>Bike Model</span>
              <strong>{bookingDetails.bikeModel}</strong>
            </div>
          )}
          {bookingDetails?.timeSlot && (
            <div className="summary-row">
              <span>Time Slot</span>
              <strong>{bookingDetails.timeSlot}</strong>
            </div>
          )}
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

        {/* 1. Payment Mode Selector (Pay Online vs Pay at Service) */}
        <div className="payment-mode-section">
          <div className="mode-section-title">CHOOSE PAYMENT OPTION</div>
          <div className="pay-mode-grid">
            <button
              type="button"
              className={`pay-mode-card ${payMode === 'online' ? 'active' : ''}`}
              onClick={() => { setPayMode('online'); setErrorMsg(''); }}
            >
              <div className="mode-card-header">
                <span className="mode-icon">💳</span>
                <strong>Pay Online</strong>
              </div>
              <p>Pay securely online using Razorpay (UPI, Cards, Net Banking)</p>
            </button>

            <button
              type="button"
              className={`pay-mode-card ${payMode === 'service' ? 'active' : ''}`}
              onClick={() => { setPayMode('service'); setErrorMsg(''); }}
            >
              <div className="mode-card-header">
                <span className="mode-icon">🤝</span>
                <strong>Pay at Service</strong>
              </div>
              <p>Pay directly to the service provider when the service is completed</p>
            </button>
          </div>
        </div>

        {/* 2. Sub-options or Notice depending on payMode */}
        {payMode === 'online' ? (
          <div className="payment-options">
            <button
              className={`payment-option ${paymentMethod === 'upi' ? 'active' : ''}`}
              type="button"
              onClick={() => setPaymentMethod('upi')}
            >
              UPI
            </button>
            <button
              className={`payment-option ${paymentMethod === 'card' ? 'active' : ''}`}
              type="button"
              onClick={() => setPaymentMethod('card')}
            >
              Card
            </button>
            <button
              className={`payment-option ${paymentMethod === 'netbanking' ? 'active' : ''}`}
              type="button"
              onClick={() => setPaymentMethod('netbanking')}
            >
              Net Banking
            </button>
          </div>
        ) : (
          <div className="pay-at-service-notice">
            <span className="notice-icon">📋</span>
            <div>
              <strong>Pay Upon Completion</strong>
              <p>Please pay the service provider directly when the service is completed at your location.</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="payment-error-box">
            <strong>⚠️ Payment Error:</strong> {errorMsg}
          </div>
        )}

        <button
          className="payment-confirm-btn"
          type="button"
          onClick={handleConfirmAction}
          disabled={processing}
        >
          {processing
            ? 'Processing...'
            : payMode === 'online'
            ? `Pay ${displayTotal} Online →`
            : `Confirm Booking (${displayTotal}) →`}
        </button>

        <button className="payment-back-btn" type="button" onClick={onBack} disabled={processing}>
          Back to booking
        </button>
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

  const [confirmationBooking, setConfirmationBooking] = useState(null);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [bookingsHistory, setBookingsHistory] = useState(() => {
    try {
      const storedUser = localStorage.getItem('bikeDoctor_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u?.email) {
          const stored = localStorage.getItem('bikeDoctor_history_' + u.email.toLowerCase());
          if (stored) return JSON.parse(stored);
        }
      }
    } catch (e) {}
    return [];
  });

  const addBookingToHistory = (newBooking) => {
    const userEmail = user?.email ? user.email.toLowerCase() : '';
    const bookingWithEmail = { ...newBooking, email: userEmail || newBooking.email || '' };
    setBookingsHistory((prev) => {
      const updated = [bookingWithEmail, ...prev];
      if (userEmail) {
        try {
          localStorage.setItem('bikeDoctor_history_' + userEmail, JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '979562784305-qv4cn7nkbs9evd9b6d3dg1okvd96qmsj.apps.googleusercontent.com';

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

  // Auto-upload unsynced local bookings (e.g. Thunder bird) to Google Sheets when user opens app
  useEffect(() => {
    if (!user) return;

    const syncLocalToBackend = async () => {
      const scriptUrl = import.meta.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || import.meta.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec';
      const userEmail = user.email ? user.email.toLowerCase() : '';
      const historyKeys = ['bikeDoctor_history', 'bikeDoctor_history_' + userEmail].filter(Boolean);

      for (const key of historyKeys) {
        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;
          const localList = JSON.parse(stored);
          if (!Array.isArray(localList) || localList.length === 0) continue;

          let countSynced = 0;
          for (const item of localList) {
            if (!item._synced) {
              try {
                const formattedTimestamp = item.timestamp || item.createdAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                const rawLoc = item.location || item.address || item.landmark || '';
                const userEmailVal = item.email || user.email || '';
                const locWithEmail = (userEmailVal && !rawLoc.toLowerCase().includes(userEmailVal)) ? `${rawLoc} | ${userEmailVal}` : rawLoc;

                const payload = {
                  bookingId: item.bookingId || `BK${Date.now()}`,
                  name: item.name || item.customerName || user.name || 'Customer',
                  customerName: item.customerName || item.name || user.name || 'Customer',
                  'Name': item.name || item.customerName || user.name || 'Customer',
                  email: userEmailVal || 'Not provided',
                  'Email': userEmailVal || 'Not provided',
                  phone: item.phone || item.mobile || '',
                  mobile: item.mobile || item.phone || '',
                  'Mobile': item.mobile || item.phone || '',
                  altPhone: item.altMobile || 'Not provided',
                  altMobile: item.altMobile || 'Not provided',
                  alternateMobile: item.altMobile || 'Not provided',
                  'Alternate Mobile': item.altMobile || 'Not provided',
                  pickupPerson: item.pickupPerson || item.name || user.name || '',
                  pickupName: item.pickupPerson || item.name || user.name || '',
                  bikeOwnerName: item.pickupPerson || item.name || user.name || '',
                  'Bike Owner Name': item.pickupPerson || item.name || user.name || '',
                  receiver: item.receiverName || item.receiver || 'Not provided',
                  receiverName: item.receiverName || item.receiver || 'Not provided',
                  alternateContactPerson: item.receiverName || item.receiver || 'Not provided',
                  'Alternate Contact person': item.receiverName || item.receiver || 'Not provided',
                  location: locWithEmail,
                  address: locWithEmail,
                  landmark: locWithEmail,
                  'Location': locWithEmail,
                  locationType: item.locationType || item.pickupType || 'home',
                  pickupType: item.pickupType || item.locationType || 'home',
                  'Pickup Type': item.pickupType || item.locationType || 'home',
                  timeSlot: item.timeSlot || '09:00 AM - 11:00 AM',
                  time_slot: item.timeSlot || '09:00 AM - 11:00 AM',
                  'Time Slot': item.timeSlot || '09:00 AM - 11:00 AM',
                  bikeModel: item.bikeModel || 'Bike Service',
                  bike_model: item.bikeModel || 'Bike Service',
                  'Bike Model': item.bikeModel || 'Bike Service',
                  service: item.serviceName || item.service || 'Complete Service',
                  plan: item.planName || item.plan || 'Premium Care',
                  'Plan': item.planName || item.plan || 'Premium Care',
                  amount: item.totalAmount || item.amount || '₹319',
                  totalAmount: item.totalAmount || item.amount || '₹319',
                  paymentMethod: item.paymentMethod || 'Pay at Service',
                  paymentStatus: item.paymentStatus || 'Pending',
                  bookingStatus: 'CONFIRMED',
                  timestamp: formattedTimestamp,
                  createdAt: formattedTimestamp,
                  'Timestamp': formattedTimestamp,
                };

                const scriptUrls = [
                  import.meta.env.VITE_GOOGLE_CUSTOMER_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxyCbvsvoQxXSpXjiJykrfWRyPy_fXSi4Ulr-zx7szw-R-VLLf8yY0HwVyHaLmXIHd8yw/exec',
                  import.meta.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || import.meta.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec'
                ];

                for (const sUrl of scriptUrls) {
                  if (!sUrl) continue;
                  try {
                    const params = new URLSearchParams();
                    Object.entries(payload).forEach(([k, v]) => {
                      if (v !== undefined && v !== null) params.append(k, String(v));
                    });
                    const fullUrl = `${sUrl}${sUrl.includes('?') ? '&' : '?'}${params.toString()}`;

                    await fetch(fullUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'text/plain' },
                      mode: 'no-cors',
                      body: JSON.stringify(payload),
                    });
                  } catch (e) {}
                }

                item._synced = true;
                countSynced++;
              } catch (e) {
                console.warn('Auto-sync item failed:', e.message);
              }
            }
          }
          if (countSynced > 0) {
            localStorage.setItem(key, JSON.stringify(localList));
          }
        } catch (err) {
          console.warn('Sync local bookings error for key:', key, err);
        }
      }
    };

    syncLocalToBackend();
  }, [user]);

  // Fetch central user bookings from backend whenever user logs in
  useEffect(() => {
    if (!user || !user.email) {
      setBookingsHistory([]);
      return;
    }

    let isSubscribed = true;
    const userEmail = user.email.toLowerCase();
    const historyKey = 'bikeDoctor_history_' + userEmail;

    // 1. Immediately populate state from user-specific local storage cache
    try {
      const cached = localStorage.getItem(historyKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBookingsHistory(parsed);
        }
      }
    } catch (e) {}

    // 2. Fetch remote user bookings and merge safely
    const fetchUserBookings = async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (user.credential) {
          headers['Authorization'] = `Bearer ${user.credential}`;
        }

        const res = await fetch(`${API_URL}/api/payment/user-bookings?email=${encodeURIComponent(userEmail)}`, { headers });
        if (!res.ok) return;

        const data = await res.json();
        if (isSubscribed && data.success && Array.isArray(data.bookings)) {
          const remoteUserBookings = data.bookings.filter(b => b.email && b.email.toLowerCase() === userEmail);
          
          let currentLocal = [];
          try {
            const rawLocal = localStorage.getItem(historyKey);
            if (rawLocal) currentLocal = JSON.parse(rawLocal) || [];
          } catch (e) {}

          const bookingMap = new Map();
          currentLocal.forEach(b => {
            if (b && (b.bookingId || b.createdAt)) {
              bookingMap.set(b.bookingId || b.createdAt, b);
            }
          });
          remoteUserBookings.forEach(b => {
            if (b && (b.bookingId || b.createdAt)) {
              bookingMap.set(b.bookingId || b.createdAt, b);
            }
          });

          const mergedBookings = Array.from(bookingMap.values());
          if (isSubscribed) {
            setBookingsHistory(mergedBookings);
            try {
              localStorage.setItem(historyKey, JSON.stringify(mergedBookings));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Could not fetch remote user bookings:', err.message);
      }
    };

    fetchUserBookings();

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!clientId || user) {
      return;
    }

    const checkGoogle = () => {
      if (!window.google?.accounts?.id) {
        setAuthReady(false);
        return;
      }

      if (!initializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              return;
            }

            try {
              const base64Url = response.credential.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const decoded = JSON.parse(jsonPayload);
              
              // Set REAL Google user data returned from Google OAuth
              setUser({
                name: decoded.name || decoded.given_name || 'Google User',
                email: decoded.email,
                picture: decoded.picture || '',
                credential: response.credential,
              });
              setAuthError('');
            } catch (err) {
              console.error('Failed to parse Google credential token:', err);
              setAuthError('Unable to process Google login response.');
            }
          },
        });
        initializedRef.current = true;
      }

      setAuthReady(true);

      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_blue',
          shape: 'pill',
          size: 'large',
          width: 380,
          text: 'signin_with',
          logo_alignment: 'left',
        });
      }
    };

    if (window.google?.accounts?.id) {
      checkGoogle();
    } else {
      let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      const handleLoad = () => checkGoogle();
      script.addEventListener('load', handleLoad);
      return () => {
        script.removeEventListener('load', handleLoad);
      };
    }
  }, [clientId, user]);

  if (user) {
    const handleSignOut = () => {
      setUser(null);
      setBookingsHistory([]);
      setCurrentPage('dashboard');
      setBookingType('service');
      setSelectedService('Complete Service');
      setAuthError('');
      localStorage.removeItem('bikeDoctor_user');
      localStorage.removeItem('bikeDoctor_history');
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
        <>
          <BookingModal
            isOpen={true}
            user={user}
            selectedService={selectedService}
            onClose={() => setCurrentPage('dashboard')}
            onProceedToPayment={(details) => {
              setBookingDetails({
                ...details,
                email: user?.email || details?.email || '',
              });
              setCurrentPage('payment');
            }}
          />
          <ConfirmationModal
            isOpen={!!confirmationBooking}
            booking={confirmationBooking}
            onClose={() => setConfirmationBooking(null)}
            onViewMyBookings={() => {
              setConfirmationBooking(null);
              setIsMyBookingsOpen(true);
            }}
          />
          <MyBookingsModal
            isOpen={isMyBookingsOpen}
            onClose={() => setIsMyBookingsOpen(false)}
            bookings={bookingsHistory}
          />
        </>
      );
    }

    if (currentPage === 'payment') {
      return (
        <>
          <PaymentPage
            selectedService={selectedService}
            bookingDetails={bookingDetails}
            onBack={() => setCurrentPage('booking')}
            onComplete={(confirmedRecord) => {
              if (confirmedRecord) {
                addBookingToHistory(confirmedRecord);
                setConfirmationBooking(confirmedRecord);
              }
              setCurrentPage('dashboard');
              setBookingType('service');
              setBookingDetails(null);
            }}
          />
          <ConfirmationModal
            isOpen={!!confirmationBooking}
            booking={confirmationBooking}
            onClose={() => setConfirmationBooking(null)}
            onViewMyBookings={() => {
              setConfirmationBooking(null);
              setIsMyBookingsOpen(true);
            }}
          />
          <MyBookingsModal
            isOpen={isMyBookingsOpen}
            onClose={() => setIsMyBookingsOpen(false)}
            bookings={bookingsHistory}
          />
        </>
      );
    }

    return (
      <>
        <Dashboard 
          user={user} 
          onSignOut={handleSignOut} 
          onNavigate={(page) => setCurrentPage(page)}
          onBookService={openServiceBooking}
          onOpenMyBookings={() => setIsMyBookingsOpen(true)}
        />
        <ConfirmationModal
          isOpen={!!confirmationBooking}
          booking={confirmationBooking}
          onClose={() => setConfirmationBooking(null)}
          onViewMyBookings={() => {
            setConfirmationBooking(null);
            setIsMyBookingsOpen(true);
          }}
        />
        <MyBookingsModal
          isOpen={isMyBookingsOpen}
          onClose={() => setIsMyBookingsOpen(false)}
          bookings={bookingsHistory}
        />
      </>
    );
  }

  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <div className="auth-brand">
          <img src="/logo.png" alt="BikeDoctor Logo" className="brand-logo-img" />
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
          <div className="auth-card-icon">
            <img src="/logo.png" alt="BikeDoctor Logo" className="auth-card-logo-img" />
          </div>

          <h2>Welcome to BikeDoctor</h2>
          <p>Sign in with your Google account to manage bookings and bike care services</p>

          <div className="google-signin-wrapper">
            <div
              ref={googleButtonRef}
              key={user ? 'signed-out' : 'signed-in'}
            />
          </div>

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
