export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { bookingDetails } = req.body || {};

    const bookingId = bookingDetails?.bookingId || `BK${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedAmount = bookingDetails?.totalAmount || '₹319';

    // Submit confirmed Pay at Service record to Google Sheets via Google Script URLs
    const bookingScriptUrl = process.env.GOOGLE_BOOKING_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbw0yS2sAlX6V8QfFW20CtI2vgAQsjHeuPHhEDrMCNV3W1N0dON2-_W7xhU-dLmZy403VQ/exec';
    const customerScriptUrl = process.env.GOOGLE_CUSTOMER_SCRIPT_URL || process.env.VITE_GOOGLE_CUSTOMER_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbw0yS2sAlX6V8QfFW20CtI2vgAQsjHeuPHhEDrMCNV3W1N0dON2-_W7xhU-dLmZy403VQ/exec';

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
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
          'Pay at Service',
          'Pending',
          userEmailVal || payload['Email'] || 'Not provided',
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId: customerSheetId,
          range: 'A:O',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [row] },
        });
        console.log(`Directly appended booking ${bookingId} to Google Sheet A:O`);
      }
    } catch (sheetErr) {
      console.warn('Direct Google Sheet append notice:', sheetErr.message);
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
