export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { bookingDetails } = req.body || {};

    const bookingId = `BK${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedAmount = bookingDetails?.totalAmount || '₹319';

    // Submit confirmed Pay at Service record to Google Sheets
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec';

    if (scriptUrl) {
      const payload = {
        bookingId,
        name: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
        customerName: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
        email: bookingDetails?.email || 'Not provided',
        phone: bookingDetails?.mobile || bookingDetails?.phone || '',
        mobile: bookingDetails?.mobile || bookingDetails?.phone || '',
        altPhone: bookingDetails?.altMobile || 'Not provided',
        altMobile: bookingDetails?.altMobile || 'Not provided',
        pickupPerson: bookingDetails?.pickupPerson || '',
        receiver: bookingDetails?.receiverName || '',
        location: bookingDetails?.landmark || bookingDetails?.location || '',
        timeSlot: bookingDetails?.timeSlot || '',
        'Time Slot': bookingDetails?.timeSlot || '',
        bikeModel: bookingDetails?.bikeModel || '',
        'Bike Model': bookingDetails?.bikeModel || '',
        service: bookingDetails?.serviceName || bookingDetails?.service || 'Complete Service',
        plan: bookingDetails?.planName || bookingDetails?.plan || 'Premium Care',
        amount: formattedAmount,
        totalAmount: formattedAmount,
        paymentMethod: 'Pay at Service',
        paymentStatus: 'Pending',
        bookingStatus: 'CONFIRMED',
        timestamp: new Date().toLocaleString(),
        createdAt: new Date().toLocaleString(),
      };

      try {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Google Script submit note (Pay at Service):', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      bookingId,
      paymentMethod: 'Pay at Service',
      paymentStatus: 'Pending',
      message: 'Booking confirmed. Please pay the service provider directly when the service is completed.',
    });
  } catch (error) {
    console.error('Error confirming Pay at Service booking:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error confirming booking.',
    });
  }
}
