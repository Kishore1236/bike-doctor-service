import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay verification parameters.',
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'RAZORPAY_KEY_SECRET environment variable is missing in Vercel settings.',
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isValidSignature = expectedSignature === razorpay_signature;

    if (!isValidSignature) {
      console.error('Payment verification failed: Invalid Razorpay signature');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid Razorpay signature.',
      });
    }

    const bookingId = `BK${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedAmount = bookingDetails?.totalAmount || '₹319';

    // Submit confirmed record to Google Sheets via Google Script URL
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
        paymentMethod: bookingDetails?.paymentMethod ? bookingDetails?.paymentMethod.toUpperCase() : 'UPI',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: 'PAID',
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
        console.warn('Google Script submit note:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      bookingId,
      message: 'Payment verified and booking recorded successfully.',
    });
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error verifying payment.',
    });
  }
}
