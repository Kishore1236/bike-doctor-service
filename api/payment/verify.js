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

    const secret = process.env.RAZORPAY_KEY_SECRET || 'Eiii2Std5EOSW44iTLrGkMKt';

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

    const bookingId = bookingDetails?.bookingId || `BK${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedAmount = bookingDetails?.totalAmount || '₹319';

    // Submit confirmed record to Google Sheets via Google Script URLs
    const bookingScriptUrl = process.env.GOOGLE_BOOKING_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz82A11CY_CXBoKWHPsIGhEMjdDHcZRczDPZPuXK1qtCIOROoPNErLKtwgyKb7smuUQ_g/exec';
    const customerScriptUrl = process.env.GOOGLE_CUSTOMER_SCRIPT_URL || process.env.VITE_GOOGLE_CUSTOMER_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz82A11CY_CXBoKWHPsIGhEMjdDHcZRczDPZPuXK1qtCIOROoPNErLKtwgyKb7smuUQ_g/exec';

    const formattedTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const userEmailVal = bookingDetails?.email ? String(bookingDetails.email).trim().toLowerCase() : '';
    const rawLoc = bookingDetails?.landmark || bookingDetails?.location || bookingDetails?.address || '';
    const cleanLoc = rawLoc.replace(/\s*\|\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '').trim();
    const selectedTimeSlot = bookingDetails?.timeSlot || bookingDetails?.time_slot || bookingDetails?.timeslot || bookingDetails?.slot || bookingDetails?.time || '09:00 AM - 11:00 AM';
    const selectedBikeModel = bookingDetails?.bikeModel || bookingDetails?.bike_model || bookingDetails?.bikemodel || bookingDetails?.bike || bookingDetails?.vehicle || bookingDetails?.vehicleModel || bookingDetails?.model || 'Bike Service';

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
      location: cleanLoc || rawLoc,
      address: cleanLoc || rawLoc,
      landmark: cleanLoc || rawLoc,
      'Location': cleanLoc || rawLoc,
      locationType: bookingDetails?.locationType || bookingDetails?.pickupType || 'home',
      pickupType: bookingDetails?.pickupType || bookingDetails?.locationType || 'home',
      'Pickup Type': bookingDetails?.pickupType || bookingDetails?.locationType || 'home',
      timeSlot: selectedTimeSlot,
      time_slot: selectedTimeSlot,
      timeslot: selectedTimeSlot,
      slot: selectedTimeSlot,
      time: selectedTimeSlot,
      TimeSlot: selectedTimeSlot,
      'Time Slot': selectedTimeSlot,
      service: bookingDetails?.plan || bookingDetails?.planName || 'Premium Care',
      bikeModel: selectedBikeModel,
      bike_model: selectedBikeModel,
      bikemodel: selectedBikeModel,
      bike: selectedBikeModel,
      model: selectedBikeModel,
      vehicle: selectedBikeModel,
      vehicleModel: selectedBikeModel,
      vehicle_model: selectedBikeModel,
      Vehicle: selectedBikeModel,
      'Vehicle Model': selectedBikeModel,
      'Bike Model': selectedBikeModel,
      serviceName: bookingDetails?.service || bookingDetails?.serviceName || 'Complete Service',
      plan: bookingDetails?.plan || bookingDetails?.planName || 'Premium Care',
      planName: bookingDetails?.plan || bookingDetails?.planName || 'Premium Care',
      'Plan': bookingDetails?.plan || bookingDetails?.planName || 'Premium Care',
      amount: formattedAmount,
      totalAmount: formattedAmount,
      paymentMethod: bookingDetails?.paymentMethod ? bookingDetails?.paymentMethod.toUpperCase() : 'PAY ONLINE (UPI)',
      'Payment Method': bookingDetails?.paymentMethod ? bookingDetails?.paymentMethod.toUpperCase() : 'PAY ONLINE (UPI)',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: 'PAID',
      'Payment Status': 'PAID',
      status: 'PAID',
      'Status': 'PAID',
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
        const params = new URLSearchParams();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.append(k, String(v));
        });
        const fullUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;

        await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn(`Google Script submit notice (${url}):`, err.message);
      }
    }

    // Direct Google Sheets API append for all 15 columns A:O
    try {
      const emailAcc = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY
        ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;
      const customerSheetId = process.env.GOOGLE_CUSTOMER_SHEET_ID || process.env.GOOGLE_SHEET_ID || '1ct2jXUykSUX2XpU3vFVTZmDXZTHCliqV89ea92o5wFM';

      if (emailAcc && privateKey) {
        const { google } = await import('googleapis');
        const auth = new google.auth.JWT({
          email: emailAcc,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const selectedPlanLabel = bookingDetails?.plan || bookingDetails?.planName || 'Premium Care';
        const methodStr = bookingDetails?.paymentMethod ? bookingDetails?.paymentMethod.toUpperCase() : 'PAY ONLINE (UPI)';

        const row = [
          formattedTimestamp,
          payload['Name'],
          payload['Pickup Type'],
          payload['Location'],
          payload['Mobile'],
          payload['Alternate Mobile'],
          payload['Bike Owner Name'],
          payload['Alternate Contact person'],
          payload['Time Slot'],
          payload['Bike Model'],
          selectedPlanLabel,
          bookingId,
          methodStr,
          'PAID',
          userEmailVal || payload['Email'] || 'Not provided',
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId: customerSheetId,
          range: 'A:O',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [row] },
        });
        console.log(`Directly appended paid booking ${bookingId} to Google Sheet A:O`);
      }
    } catch (sheetErr) {
      console.warn('Direct Google Sheet append notice:', sheetErr.message);
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
