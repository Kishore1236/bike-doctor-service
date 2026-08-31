import React from 'react';
import { downloadInvoicePDF } from './utils/invoiceGenerator';

function ConfirmationModal({ isOpen, onClose, booking, onViewMyBookings }) {
  if (!isOpen || !booking) return null;

  const bookingId = booking.bookingId || `BK${Date.now().toString().slice(-6)}`;
  const displayTotal = booking.totalAmount || booking.amount || '₹319';
  const paymentMethod = booking.paymentMethod || 'Pay at Service';
  const paymentStatus = booking.paymentStatus || (paymentMethod.includes('Online') || paymentMethod.includes('PAID') ? 'PAID' : 'Pending');
  const isPayAtService = paymentMethod.toLowerCase().includes('service') || paymentStatus.toLowerCase().includes('pending');

  const handleDownloadInvoice = () => {
    downloadInvoicePDF(booking);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header">
          <div className="success-icon-badge">🎉</div>
          <h2>Booking Confirmed!</h2>
          <p>Your bike pickup & service request has been successfully registered.</p>
        </div>

        <div className="confirmation-receipt-card">
          <div className="receipt-top-row">
            <span className="receipt-label">BOOKING ID</span>
            <strong className="booking-id-tag">{bookingId}</strong>
          </div>

          <div className="receipt-grid">
            <div className="receipt-item">
              <span>Amount</span>
              <strong className="receipt-price">{displayTotal}</strong>
            </div>

            <div className="receipt-item">
              <span>Payment Method</span>
              <strong>{paymentMethod}</strong>
            </div>

            <div className="receipt-item">
              <span>Payment Status</span>
              <span className={`status-badge-inline ${isPayAtService ? 'pending' : 'paid'}`}>
                {paymentStatus}
              </span>
            </div>

            {booking.bikeModel && (
              <div className="receipt-item">
                <span>Bike Model</span>
                <strong>{booking.bikeModel}</strong>
              </div>
            )}

            {booking.timeSlot && (
              <div className="receipt-item">
                <span>Time Slot</span>
                <strong>{booking.timeSlot}</strong>
              </div>
            )}
          </div>

          {/* Payment Instructions Box */}
          <div className={`confirmation-instruction-box ${isPayAtService ? 'at-service' : 'paid'}`}>
            <span className="box-icon">{isPayAtService ? '💵' : '✅'}</span>
            <p>
              {isPayAtService
                ? 'Please pay the service provider directly via Cash or UPI when the service is completed at your location.'
                : 'Payment received successfully. Our service technician will arrive at your scheduled slot.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="confirmation-actions">
          <button
            type="button"
            className="invoice-download-btn"
            onClick={handleDownloadInvoice}
          >
            📄 Download Invoice (PDF)
          </button>

          {onViewMyBookings && (
            <button
              type="button"
              className="my-bookings-btn"
              onClick={() => {
                onClose();
                onViewMyBookings();
              }}
            >
              📋 View My Bookings
            </button>
          )}

          <button
            type="button"
            className="confirmation-done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
