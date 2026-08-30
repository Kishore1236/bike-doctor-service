import { services, membership, plans, reasons, steps, faqs, charges } from './data';
import { useState } from 'react';
import BookingModal from './BookingModal';

function Dashboard({ user, onSignOut, onNavigate, onActivateMembership, onBookService }) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [modalService, setModalService] = useState('Complete Service');
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOpenBooking = (serviceName = 'Complete Service') => {
    if (onBookService) {
      onBookService(serviceName);
    } else {
      setModalService(serviceName);
      setIsBookingOpen(true);
    }
  };

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const currentUser = user || {
    name: 'Customer',
    email: 'customer@bikedoctor.com',
    picture: '',
  };

  return (
    <div className="spa-layout">
      {/* NAVBAR */}
      <nav className="spa-navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="nav-icon">🏍</span>
            <span>BikeDoctor</span>
          </div>

          <button 
            className="mobile-menu-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <ul className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <li><a href="#services" onClick={() => setMobileMenuOpen(false)}>Services</a></li>
            <li><a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Plans</a></li>
            <li><a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it Works</a></li>
            <li><a href="#why-us" onClick={() => setMobileMenuOpen(false)}>Why Us</a></li>
            <li><a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a></li>
            <li><a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a></li>
          </ul>

          <div className="nav-user">
            {currentUser.picture && <img src={currentUser.picture} alt={currentUser.name || 'User'} className="nav-avatar" />}
            <div className="nav-user-text">
              <div className="nav-username">{currentUser.name || 'Customer'}</div>
              <div className="nav-useremail">{currentUser.email || ''}</div>
            </div>
            <button className="nav-signout" onClick={onSignOut} title="Sign out of your account">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="spa-main">
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">✨ Premium Doorstep Bike Care</div>
            <h1>Your Bike. Our Care.</h1>
            <p>Professional doorstep cleaning, chain maintenance, detailing, and pickup & delivery services tailored to your schedule.</p>
            <div className="hero-actions">
              <button 
                className="hero-primary-btn" 
                onClick={() => handleOpenBooking('Complete Service')}
              >
                Book Pickup Now →
              </button>
            </div>
          </div>
        </section>

        {/* SERVICES CENTER */}
        <section className="services-center" id="services">
          <div className="services-card-wrapper">
            <div className="services-card">
              <div className="services-header">
                <span className="services-kicker">Our Services</span>
                <h2>OUR BEST SERVICES</h2>
                <div className="services-divider" aria-hidden="true" />
              </div>

              <div className="services-grid">
                {services.map((service, idx) => (
                  <div key={idx} className="service-item">
                    <div className="item-icon-box">
                      <span>{service.icon || '🏍'}</span>
                    </div>
                    <div className="item-content">
                      <h4>{service.title}</h4>
                      <p>{service.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="services-book-btn"
                onClick={() => handleOpenBooking('Complete Service')}
              >
                Book Service
              </button>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="how-it-works-section" id="how-it-works">
          <div className="section-title">
            <span className="section-kicker">Simple & Fast</span>
            <h2>How BikeDoctor Works</h2>
            <p>Get professional bike care in 5 easy steps</p>
          </div>

          <div className="steps-grid">
            {steps.map((step, idx) => (
              <div key={idx} className="step-card">
                <div className="step-num">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICE PLANS SECTION */}
        <section className="plans-center" id="pricing">
          <div className="section-title plans-header-center">
            <span className="section-kicker">Transparent Pricing</span>
            <h2>Service Plans</h2>
            <p>One-time care packages for every type of ride</p>
          </div>

          <div className="plans-container">
            {plans.map((plan, idx) => (
              <div key={idx} className={`plan-card-saas ${plan.name === 'Monthly Subscription' ? 'featured monthly-highlight' : plan.tag ? 'featured' : ''}`}>
                {plan.tag && <div className="plan-tag-saas">{plan.tag}</div>}
                <div className="plan-head">
                  <h3>{plan.name}</h3>
                </div>
                <div className="plan-price-saas">
                  <span className="curr">₹</span>
                  <span className="amt">{plan.price}</span>
                </div>
                <ul className="plan-feat">
                  {plan.features.map((feature, i) => (
                    <li key={i}>
                      <span className="tick">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* PICKUP CHARGES BREAKDOWN */}
        <section className="charges-section">
          <div className="charges-card">
            <div className="charges-header">
              <span className="charges-icon">🚚</span>
              <div>
                <h3>Doorstep Pickup & Delivery Charges</h3>
                <p>Fair distance-based pricing calculated upfront</p>
              </div>
            </div>
            <div className="charges-grid">
              {charges.map((charge, idx) => (
                <div key={idx} className="charge-item">
                  <span className="charge-label">{charge.label}</span>
                  <strong className="charge-value">{charge.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MEMBERSHIP CTA SECTION */}
        <section className="membership-cta">
          <div className="membership-preview">
            <div className="cta-content">
              <div className="mem-badge">✨ BEST VALUE</div>
              <h2>{membership.title}</h2>
              <p>Unlimited bike care with ongoing benefits, priority slots, and digital history</p>
              <div className="mem-price-cta">
                <span className="curr">₹</span>
                <span className="amt">{membership.price}</span>
                <span className="per">/month</span>
              </div>
              <button 
                className="cta-button"
                onClick={() => handleOpenBooking('Monthly Subscription')}
              >
                Book Monthly Subscription →
              </button>
            </div>
          </div>
        </section>
        <section className="why-section" id="why-us">
          <div className="section-title">
            <span className="section-kicker">Why Us</span>
            <h2>Why Choose Bike Doctor?</h2>
            <p>Top-tier bike care designed around your peace of mind</p>
          </div>
          <div className="reasons-grid">
            {reasons.map((reason, idx) => (
              <div key={idx} className="reason-card">
                <div className="reason-icon">{reason.icon}</div>
                <h3>{reason.title}</h3>
                <p>{reason.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section className="faq-section" id="faq">
          <div className="section-title">
            <span className="section-kicker">Got Questions?</span>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about our services and process</p>
          </div>

          <div className="faq-container">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className={`faq-item ${openFaq === idx ? 'open' : ''}`}
                onClick={() => toggleFaq(idx)}
              >
                <div className="faq-question">
                  <h3>{faq.q}</h3>
                  <span className="faq-toggle">{openFaq === idx ? '−' : '+'}</span>
                </div>
                {openFaq === idx && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section className="contact-section" id="contact">
          <div className="contact-card">
            <div className="contact-copy">
              <h2>Need custom bike care or help?</h2>
              <p>Contact our support team anytime on WhatsApp or phone.</p>
            </div>
            <div className="contact-actions">
              <a 
                href="https://wa.me/?text=Hi%20BikeDoctor,%20I%20have%20a%20question%20about%20my%20bike%20service." 
                target="_blank" 
                rel="noreferrer"
                className="whatsapp-contact-btn"
              >
                💬 Chat on WhatsApp
              </a>
              <a 
                href="https://instagram.com/bike_doctor.service" 
                target="_blank" 
                rel="noreferrer"
                className="instagram-contact-btn"
              >
                📸 Instagram
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="spa-footer">
        <div className="footer-container">
          <div className="footer-col">
            <h4>BikeDoctor</h4>
            <p>Professional bike care, cleaning & maintenance at your doorstep.</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#services">Services</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><a href="#faq">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#pricing">Plans</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <ul>
              <li><a href="https://wa.me/" target="_blank" rel="noreferrer">WhatsApp</a></li>
              <li><a href="https://instagram.com/bike_doctor.service" target="_blank" rel="noreferrer">Instagram</a></li>
              <li><a href="#contact">Customer Support</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Bike Doctor. All rights reserved.</p>
        </div>
      </footer>

      {/* BOOKING MODAL */}
      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)}
        selectedService={modalService}
      />
    </div>
  );
}

export default Dashboard;
