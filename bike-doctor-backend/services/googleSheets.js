import { google } from 'googleapis';

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY is missing in environment variables.');
  }

  // Handle line breaks in RSA private key
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT(
    email,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  return google.sheets({ version: 'v4', auth });
}

export async function appendBooking(bookingData) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

  // Option 1: Use Google Apps Script Web App URL if provided
  if (scriptUrl && !scriptUrl.includes('YOUR_GOOGLE_SCRIPT_URL')) {
    const payload = {
      bookingId: bookingData.bookingId || `BK${Date.now()}`,
      name: bookingData.customerName || bookingData.name || '',
      customerName: bookingData.customerName || bookingData.name || '',
      email: bookingData.email || 'Not provided',
      phone: bookingData.phone || bookingData.mobile || '',
      mobile: bookingData.phone || bookingData.mobile || '',
      altPhone: bookingData.altPhone || bookingData.altMobile || 'Not provided',
      altMobile: bookingData.altMobile || 'Not provided',
      pickupPerson: bookingData.pickupPerson || bookingData.pickupName || '',
      pickupName: bookingData.pickupPerson || bookingData.pickupName || '',
      receiver: bookingData.receiver || bookingData.receiverName || '',
      receiverName: bookingData.receiver || bookingData.receiverName || '',
      location: bookingData.location || bookingData.address || '',
      address: bookingData.location || bookingData.address || '',
      locationType: bookingData.locationType || 'home',
      timeSlot: bookingData.timeSlot || '',
      time_slot: bookingData.timeSlot || '',
      'Time Slot': bookingData.timeSlot || '',
      bikeModel: bookingData.bikeModel || '',
      bike_model: bookingData.bikeModel || '',
      'Bike Model': bookingData.bikeModel || '',
      service: bookingData.service || bookingData.serviceName || '',
      plan: bookingData.plan || bookingData.planName || '',
      amount: bookingData.amount || bookingData.totalAmount || '',
      totalAmount: bookingData.amount || bookingData.totalAmount || '',
      paymentMethod: bookingData.paymentMethod ? bookingData.paymentMethod.toUpperCase() : 'UPI',
      razorpayOrderId: bookingData.razorpayOrderId || '',
      razorpayPaymentId: bookingData.razorpayPaymentId || '',
      paymentStatus: bookingData.paymentStatus || 'PAID',
      bookingStatus: bookingData.bookingStatus || 'CONFIRMED',
      timestamp: bookingData.createdAt || new Date().toLocaleString(),
      createdAt: bookingData.createdAt || new Date().toLocaleString(),
    };

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { success: true, method: 'google_script_url' };
    } catch (scriptErr) {
      console.warn('Google Script URL post warning:', scriptErr.message);
    }
  }

  // Option 2: Fallback to Google Sheets API via Service Account JWT
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId || spreadsheetId.includes('YOUR_GOOGLE_SHEET_ID')) {
    throw new Error('Neither GOOGLE_SCRIPT_URL nor GOOGLE_SHEET_ID is configured in environment variables.');
  }

  const sheets = getSheetsClient();
  const sheetName = 'Bookings';

  // Ensure header row exists in Bookings tab
  try {
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:M1`,
    });

    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:M1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              'Booking ID',
              'Customer Name',
              'Email',
              'Phone',
              'Service',
              'Plan',
              'Amount',
              'Payment Method',
              'Razorpay Order ID',
              'Razorpay Payment ID',
              'Payment Status',
              'Booking Status',
              'Created At',
            ],
          ],
        },
      });
    }
  } catch (err) {
    console.warn('Header auto-initialization note:', err.message);
  }

  const row = [
    bookingData.bookingId || `BK${Date.now()}`,
    bookingData.customerName || bookingData.name || '',
    bookingData.email || 'Not provided',
    bookingData.phone || bookingData.mobile || '',
    bookingData.service || bookingData.serviceName || '',
    bookingData.plan || bookingData.planName || '',
    bookingData.amount || bookingData.totalAmount || '',
    bookingData.paymentMethod ? bookingData.paymentMethod.toUpperCase() : 'UPI',
    bookingData.razorpayOrderId || '',
    bookingData.razorpayPaymentId || '',
    bookingData.paymentStatus || 'PAID',
    bookingData.bookingStatus || 'CONFIRMED',
    bookingData.createdAt || new Date().toLocaleString(),
  ];

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:M`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });

  return response.data;
}
