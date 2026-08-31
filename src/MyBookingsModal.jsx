import React from 'react';
import { downloadInvoicePDF } from './utils/invoiceGenerator';

function MyBookingsModal({ isOpen, onClose, bookings = [] }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="my-bookings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="my-bookings-header">
          <div className="header-title-box">
            <span className="modal-icon-badge">📋</span>
            <div>
              <h2>My Service Bookings</h2>
              <p>Your bike maintenance history and downloadable invoices</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <div className="my-bookings-body">
          {bookings.length === 0 ? (
            <div className="empty-bookings-state">
              <div className="empty-icon">🏍️</div>
              <h3>No bookings found yet</h3>
              <p>You have not placed any service bookings. Schedule your first doorstep pickup today!</p>
            </div>
          ) : (
            <div className="bookings-history-list">
              {bookings.map((item, idx) => {
                const bookingId = item.bookingId || `BK${idx + 1000}`;
                const displayTotal = item.totalAmount || item.amount || '₹319';
                const paymentMethod = item.paymentMethod || 'Pay at Service';
                const paymentStatus = item.paymentStatus || (paymentMethod.includes('Online') || paymentMethod.includes('PAID') ? 'PAID' : 'Pending');
                const isPaid = paymentStatus.toLowerCase() === 'paid';

                return (
                  <div key={bookingId + idx} className="booking-card-item">
                    <div className="card-top-bar">
                      <div className="card-id-group">
                        <span className="card-id-label">ID:</span>
                        <strong className="card-id-val">{bookingId}</strong>
                      </div>
                      <span className={`status-pill ${isPaid ? 'paid' : 'pending'}`}>
                        {paymentStatus}
                      </span>
                    </div>

                    <div className="card-main-info">
                      <div className="info-col">
                        <span className="info-title">SERVICE PLAN</span>
                        <strong>{item.planName || item.plan || 'Premium Care'}</strong>
                        <p>{item.serviceName || item.service || 'Complete Service'}</p>
                      </div>

                      <div className="info-col">
                        <span className="info-title">BIKE & SLOT</span>
                        <strong>{item.bikeModel || 'Bike Service'}</strong>
                        <p>{item.timeSlot || 'Scheduled Slot'}</p>
                      </div>

                      <div className="info-col">
                        <span className="info-title">PAYMENT METHOD</span>
                        <strong>{paymentMethod}</strong>
                        <p className="price-tag">{displayTotal}</p>
                      </div>
                    </div>

                    <div className="card-footer-bar">
                      <span className="booking-date">
                        📅 {item.createdAt || item.timestamp || 'Recent Booking'}
                      </span>

                      <button
                        type="button"
                        className="card-invoice-btn"
                        onClick={() => downloadInvoicePDF(item)}
                      >
                        📄 Download Invoice (PDF)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyBookingsModal;
