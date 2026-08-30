import { membership, pickupOptions } from './data';

function MembershipPage({ user, onSignOut, onBack, onActivateMembership, onBookService }) {
  const handleActivate = () => {
    alert('Membership activation initiated!\n\nYou will be redirected to payment.');
  };

  return (
    <div className="membership-page">
      {/* NAVBAR */}
      <nav className="spa-navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="nav-icon">🏍</span>
            <span>BikeDoctor</span>
          </div>

          <ul className="nav-menu">
            <li><a href="#" onClick={onBack}>Back to Services</a></li>
            <li><a href="#plans">Plans</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>

          <div className="nav-user">
            {user.picture && <img src={user.picture} alt={user.name} className="nav-avatar" />}
            <div className="nav-user-text">
              <div className="nav-username">{user.name}</div>
              <div className="nav-useremail">{user.email}</div>
            </div>
            <button className="nav-signout" onClick={onSignOut}>
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
            <h1>Monthly Bike Care Membership</h1>
            <p>Our single ongoing care solution for total bike maintenance</p>
          </div>
        </section>

        {/* MEMBERSHIP SECTION */}
        <section className="membership-center" id="membership">
          <div className="section-title">
            <h2>Premium Membership</h2>
            <p>Ongoing bike care with exclusive benefits</p>
          </div>

          <div className="membership-card-saas"> 
            <div className="mem-badge">✨ BEST VALUE</div>
            <h2>{membership.title}</h2>
            <div className="mem-price">
              <span className="curr">₹</span>
              <span className="amt">{membership.price}</span>
              <span className="per">/month</span>
            </div>
            <ul className="mem-feat">
              {membership.features.map((feature, i) => (
                <li key={i}>
                  <span className="tick">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button className="mem-btn" onClick={onActivateMembership || handleActivate}>
              Activate Membership
            </button>
          </div>

          <div className="membership-details-grid">
            <div className="detail-card">
              <span className="detail-label">What’s included</span>
              <h3>Everything your bike needs, on a recurring schedule.</h3>
              <p>Members enjoy priority pickup, regular bike care, chain maintenance, and service history tracking without the hassle of repeat bookings.</p>
            </div>
            <div className="detail-card">
              <span className="detail-label">Why it works</span>
              <h3>Care plans designed for convenience and consistency.</h3>
              <p>Maintain your bike in peak condition with scheduled upkeep, faster service slots, and a smoother ownership experience.</p>
            </div>
            <div className="detail-card">
              <span className="detail-label">Best for</span>
              <h3>Daily riders, commuters, and frequent bike users.</h3>
              <p>Perfect for anyone who wants regular upkeep, fewer maintenance headaches, and dependable doorstep support.</p>
            </div>
          </div>
        </section>

        {/* WHY CHOOSE BIKEDOCTOR */}
        <section className="why-section">
          <div className="section-title">
            <h2>Why Choose Bike Doctor?</h2>
            <p>Premium service with professional care</p>
          </div>
          <div className="pickup-options">
            {pickupOptions.map((option, idx) => (
              <div key={idx} className="option-card">
                <div className="option-icon">{option.icon}</div>
                <h3>{option.title}</h3>
                <p>{option.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="spa-footer">
        <div className="footer-container">
          <div className="footer-col">
            <h4>BikeDoctor</h4>
            <p>Professional bike care at your doorstep</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#services">Services</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#about">About Us</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <ul>
              <li><a href="#twitter">Twitter</a></li>
              <li><a href="#instagram">Instagram</a></li>
              <li><a href="#facebook">Facebook</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Bike Doctor. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default MembershipPage;
