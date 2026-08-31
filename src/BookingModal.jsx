import { useMemo, useState, useEffect } from 'react';
import { plans, services, charges } from './data';

function BookingModal({ isOpen, onClose, selectedService = 'Complete Service', bookingType = 'service', onProceedToPayment }) {
  const [formData, setFormData] = useState({
    name: '',
    location: 'home',
    landmark: '',
    mobile: '',
    altMobile: '',
    pickupPerson: '',
    receiverName: '',
    bikeModel: '',
    timeSlot: '09:00 AM - 11:00 AM',
  });

  const [currentService, setCurrentService] = useState(selectedService);
  const isMonthlySubscription = currentService === 'Monthly Subscription' || selectedService === 'Monthly Subscription';

  const [selectedPlan, setSelectedPlan] = useState(() => {
    if (selectedService === 'Monthly Subscription') return 'Monthly Subscription';
    const match = plans.find((p) => p.name === selectedService);
    return match ? match.name : 'Premium Care';
  });

  useEffect(() => {
    setCurrentService(selectedService);
    if (selectedService === 'Monthly Subscription') {
      setSelectedPlan('Monthly Subscription');
    } else {
      const match = plans.find((p) => p.name === selectedService);
      if (match) setSelectedPlan(match.name);
    }
  }, [selectedService]);

  const effectivePlan = isMonthlySubscription ? 'Monthly Subscription' : selectedPlan;

  const planDetails = useMemo(() => {
    const match = plans.find((plan) => plan.name === effectivePlan) || plans[1];
    return {
      ...match,
      summary: match.features ? match.features.slice(0, 4) : [],
    };
  }, [effectivePlan]);

  const deliveryFee = useMemo(() => {
    switch (formData.location) {
      case 'office': return 35;
      case 'theatre': return 50;
      default: return 20;
    }
  }, [formData.location]);

  const totalEstimatedAmount = useMemo(() => {
    return planDetails.price + deliveryFee;
  }, [planDetails.price, deliveryFee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxo6G9kHuFoehKhQX4OjuXdqWP9gBgdzZtetVUIegfZxsoHz1MsL3NYSpvPZ5ffdhjewg/exec';

    const planDisplayName = effectivePlan === 'Monthly Subscription' ? 'Monthly Bike Care' : effectivePlan;
    const fullPlanLabel = `${planDisplayName} - ₹${planDetails.price}`;

    const payload = {
      name: formData.name.trim(),
      locationType: formData.location,
      pickupType: formData.location,
      address: formData.landmark.trim(),
      location: formData.landmark.trim(),
      phone: formData.mobile.trim(),
      mobile: formData.mobile.trim(),
      altPhone: formData.altMobile.trim() || 'Not provided',
      altMobile: formData.altMobile.trim() || 'Not provided',
      alternateMobile: formData.altMobile.trim() || 'Not provided',
      pickupName: formData.pickupPerson.trim(),
      pickupPerson: formData.pickupPerson.trim(),
      receiverName: formData.receiverName.trim(),
      receiver: formData.receiverName.trim(),
      timeSlot: formData.timeSlot,
      time_slot: formData.timeSlot,
      timeslot: formData.timeSlot,
      slot: formData.timeSlot,
      time: formData.timeSlot,
      'Time Slot': formData.timeSlot,
      bikeModel: formData.bikeModel.trim(),
      bike_model: formData.bikeModel.trim(),
      bikemodel: formData.bikeModel.trim(),
      bike: formData.bikeModel.trim(),
      model: formData.bikeModel.trim(),
      'Bike Model': formData.bikeModel.trim(),
      service: fullPlanLabel,
      plan: fullPlanLabel,
      selectedPlan: fullPlanLabel,
      planName: planDisplayName,
      planPrice: planDetails.price,
      serviceName: currentService,
      deliveryFee: `₹${deliveryFee}`,
      totalAmount: `₹${totalEstimatedAmount}`,
      timestamp: new Date().toLocaleString(),
    };

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Failed to register booking in Google Sheet:', err);
    }

    setSubmitting(false);

    if (onProceedToPayment) {
      onProceedToPayment(payload);
      return;
    }

    alert(`Booking confirmed for ${currentService}!\nTotal Amount: ₹${totalEstimatedAmount}\nYour booking details have been registered in the Google Sheet.`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-copy">
            <div className="header-icon">
              <img src="/logo.png" alt="BikeDoctor Logo" className="modal-header-logo-img" />
            </div>
            <div>
              <h2>Book Your Bike Pickup</h2>
              <p>Fast doorstep pickup & expert maintenance</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <div className="booking-shell">
          <form onSubmit={handleSubmit} className="booking-form">
            <div className="form-section-title">Customer & Location Details</div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>YOUR NAME *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>PICKUP LOCATION *</label>
                <select name="location" value={formData.location} onChange={handleChange} required>
                  <option value="home">🏠 Home (Up to 5 km - ₹20)</option>
                  <option value="office">🏢 Office (Up to 10 km - ₹35)</option>
                  <option value="theatre">🎬 Theatre (Up to 15 km - ₹50)</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>LOCATION + LANDMARK *</label>
                <textarea
                  name="landmark"
                  placeholder="Example: XYZ Theatre, Anna Nagar, opposite ABC Hotel"
                  value={formData.landmark}
                  onChange={handleChange}
                  required
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>BIKE MODEL *</label>
                <input
                  type="text"
                  name="bikeModel"
                  placeholder="e.g. Royal Enfield Classic, Activa 6G, Pulsar 150"
                  value={formData.bikeModel}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>PREFERRED TIME SLOT *</label>
                <select name="timeSlot" value={formData.timeSlot} onChange={handleChange} required>
                  <option value="09:00 AM - 11:00 AM">🌅 09:00 AM - 11:00 AM</option>
                  <option value="11:00 AM - 01:00 PM">☀️ 11:00 AM - 01:00 PM</option>
                  <option value="01:00 PM - 03:00 PM">🌤️ 01:00 PM - 03:00 PM</option>
                  <option value="03:00 PM - 05:00 PM">🌇 03:00 PM - 05:00 PM</option>
                  <option value="05:00 PM - 07:00 PM">🌙 05:00 PM - 07:00 PM</option>
                </select>
              </div>

              <div className="form-group">
                <label>MOBILE NUMBER *</label>
                <input
                  type="tel"
                  name="mobile"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  pattern="[0-9]{10}"
                  required
                />
              </div>

              <div className="form-group">
                <label>ALTERNATE MOBILE NUMBER</label>
                <input
                  type="tel"
                  name="altMobile"
                  placeholder="Alternate number (optional)"
                  value={formData.altMobile}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>BIKE OWNER NAME *</label>
                <input
                  type="text"
                  name="pickupPerson"
                  placeholder="Bike owner name"
                  value={formData.pickupPerson}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>ALTERNATE CONTACT PERSON *</label>
                <input
                  type="text"
                  name="receiverName"
                  placeholder="Alternate person if owner unavailable"
                  value={formData.receiverName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-section-title">Package & Service Selection</div>

            <div className="service-selected">
              <label>CARE PLAN</label>
              {isMonthlySubscription ? (
                <div className="service-box">
                  <span className="service-box-tag">Fixed Plan</span>
                  <span>Monthly Subscription — ₹599/month</span>
                </div>
              ) : (
                <div className="plan-picker-box">
                  <select value={effectivePlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                    {plans.filter(p => p.name !== 'Monthly Subscription').map((plan) => (
                      <option key={plan.name} value={plan.name}>{plan.name} — ₹{plan.price}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>


            <div className="booking-info">
              <div className="info-item">
                <span className="info-icon">📱</span>
                <span>Confirmation will be sent immediately to BikeDoctor WhatsApp.</span>
              </div>
              <div className="info-item">
                <span className="info-icon">📊</span>
                <span>Booking details automatically recorded in Google Sheet dispatch queue.</span>
              </div>
            </div>

            <button type="submit" className="confirm-button" disabled={submitting}>
              {submitting ? 'Registering Booking...' : `Confirm & Pay ₹${totalEstimatedAmount} →`}
            </button>
          </form>

          <aside className="booking-summary">
            <div className="summary-badge">Service Plan</div>
            <h3>{selectedPlan}</h3>
            
            <div className="summary-price-box">
              <div className="price-row">
                <span>Base Plan Price</span>
                <strong>₹{planDetails.price}</strong>
              </div>
              <div className="price-row">
                <span>Doorstep Pickup Fee</span>
                <strong>₹{deliveryFee}</strong>
              </div>
              <div className="price-row total">
                <span>Total Amount</span>
                <strong>₹{totalEstimatedAmount}</strong>
              </div>
            </div>

            <div className="summary-section-label">Included Features:</div>
            <ul className="summary-list">
              {planDetails.summary.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>

            <div className="summary-card-footer">
              <span>🔒 256-Bit SSL Encrypted</span>
              <strong>Next: Payment</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
