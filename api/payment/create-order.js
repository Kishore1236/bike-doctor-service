import Razorpay from 'razorpay';

function calculateTotalAmount(planName, locationType) {
  let planPrice = 299;
  if (planName) {
    const nameLower = planName.toLowerCase();
    if (nameLower.includes('basic')) planPrice = 199;
    else if (nameLower.includes('premium')) planPrice = 299;
    else if (nameLower.includes('bike care')) planPrice = 499;
    else if (nameLower.includes('monthly') || nameLower.includes('subscription')) planPrice = 599;
  }

  let deliveryFee = 20;
  if (locationType === 'office') deliveryFee = 35;
  else if (locationType === 'theatre') deliveryFee = 50;

  return planPrice + deliveryFee;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay API credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) not configured in Vercel environment variables.',
      });
    }

    const { planName, locationType, bookingDetails } = req.body || {};
    const plan = planName || bookingDetails?.planName || bookingDetails?.plan || 'Premium Care';
    const location = locationType || bookingDetails?.locationType || bookingDetails?.location || 'home';

    const totalRupees = calculateTotalAmount(plan, location);
    const amountInPaise = totalRupees * 100;

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const receipt = `rcpt_${Date.now()}`;
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        planName: plan,
        locationType: location,
        customerName: bookingDetails?.name || 'Customer',
      },
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order.',
    });
  }
}
