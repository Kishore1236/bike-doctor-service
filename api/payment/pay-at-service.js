export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { bookingDetails } = req.body || {};

    const bookingId = bookingDetails?.bookingId || `BK${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedAmount = bookingDetails?.totalAmount || '₹319';

    // Submit confirmed Pay at Service record to Google Sheets via Google Script URLs
    const bookingScriptUrl = process.env.GOOGLE_BOOKING_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec';
    const customerScriptUrl = process.env.GOOGLE_CUSTOMER_SCRIPT_URL || process.env.VITE_GOOGLE_CUSTOMER_SCRIPT_URL;

    const formattedTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const userEmailVal = bookingDetails?.email ? String(bookingDetails.email).trim().toLowerCase() : '';
    const rawLoc = bookingDetails?.landmark || bookingDetails?.location || bookingDetails?.address || '';
    const locWithEmail = (userEmailVal && !rawLoc.toLowerCase().includes(userEmailVal)) ? `${rawLoc} | ${userEmailVal}` : rawLoc;

    const payload = {
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
      service: bookingDetails?.service || bookingDetails?.serviceName || 'Complete Service',
      plan: bookingDetails?.plan || bookingDetails?.planName || 'Premium Care',
      'Plan': bookingDetails?.plan || bookingDetails?.planName || 'Premium Care',
      amount: formattedAmount,
      totalAmount: formattedAmount,
      paymentMethod: 'Pay at Service',
      paymentStatus: 'Pending',
      bookingStatus: 'CONFIRMED',
      timestamp: formattedTimestamp,
      createdAt: formattedTimestamp,
      'Timestamp': formattedTimestamp,
    };

    const scriptUrls = new Set();
    [customerScriptUrl, bookingScriptUrl].forEach(url => {
      if (url && !url.includes('YOUR_GOOGLE_SCRIPT_URL')) {
        scriptUrls.add(url);
      }
    });

    for (const url of scriptUrls) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn(`Google Script submit notice (${url}):`, err.message);
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
