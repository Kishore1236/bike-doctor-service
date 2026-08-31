import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { appendBooking } from '../services/googleSheets.js';

const router = express.Router();

// Helper to calculate pricing server-side to prevent tampering
function calculateTotalAmount(planName, locationType) {
  let planPrice = 299; // default Premium Care
  if (planName) {
    const nameLower = planName.toLowerCase();
    if (nameLower.includes('basic')) planPrice = 199;
    else if (nameLower.includes('premium')) planPrice = 299;
    else if (nameLower.includes('bike care')) planPrice = 499;
    else if (nameLower.includes('monthly') || nameLower.includes('subscription')) planPrice = 599;
  }

  let deliveryFee = 20; // default home
  if (locationType === 'office') deliveryFee = 35;
  else if (locationType === 'theatre') deliveryFee = 50;

  return planPrice + deliveryFee;
}

// 1. Create Razorpay Order
router.post('/create-order', async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId.includes('YOUR_KEY_ID')) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay API credentials are not configured on the backend server.',
      });
    }

    const { planName, locationType, bookingDetails } = req.body || {};
    
    const plan = planName || bookingDetails?.planName || bookingDetails?.plan || 'Premium Care';
    const location = locationType || bookingDetails?.locationType || bookingDetails?.location || 'home';

    const totalRupees = calculateTotalAmount(plan, location);
    const amountInPaise = totalRupees * 100; // e.g., ₹319 -> 31900 paise

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const receipt = `rcpt_${Date.now()}`;
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        planName: plan,
        locationType: location,
        customerName: bookingDetails?.name || 'Customer',
      },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order.',
    });
  }
});

// 2. Verify Razorpay Payment Signature & Save to Google Sheets
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay payment verification parameters.',
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Backend server missing RAZORPAY_KEY_SECRET environment variable.',
      });
    }

    // Verify signature using HMAC SHA256
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

    // Generate unique booking ID
    const bookingId = `BK${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedAmount = bookingDetails?.totalAmount || `₹${calculateTotalAmount(bookingDetails?.planName, bookingDetails?.locationType)}`;

    const bookingRecord = {
      bookingId,
      customerName: bookingDetails?.name || bookingDetails?.pickupPerson || 'Customer',
      email: bookingDetails?.email || bookingDetails?.userEmail || 'Not provided',
      phone: bookingDetails?.mobile || bookingDetails?.phone || '',
      service: bookingDetails?.serviceName || bookingDetails?.service || 'Complete Service',
      plan: bookingDetails?.planName || bookingDetails?.plan || 'Premium Care',
      amount: formattedAmount,
      paymentMethod: bookingDetails?.paymentMethod || 'UPI',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
      createdAt: new Date().toLocaleString(),
    };

    // Save to Google Sheets
    let googleSheetSaved = false;
    let sheetError = null;
    try {
      await appendBooking(bookingRecord);
      googleSheetSaved = true;
    } catch (err) {
      console.error('Google Sheets storage error:', err.message);
      sheetError = err.message;
    }

    return res.status(200).json({
      success: true,
      bookingId,
      googleSheetSaved,
      sheetErrorNotice: sheetError ? `Payment verified as PAID. Google Sheet note: ${sheetError}` : null,
      message: 'Payment verified and booking recorded successfully.',
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error verifying payment.',
    });
  }
});

export default router;
