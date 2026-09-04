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
  const customerScriptUrl = process.env.GOOGLE_CUSTOMER_SCRIPT_URL;
  const bookingScriptUrl = process.env.GOOGLE_BOOKING_SCRIPT_URL;
  const defaultScriptUrl = process.env.GOOGLE_SCRIPT_URL;

  const payload = {
    bookingId: bookingData.bookingId || `BK${Date.now()}`,
    name: bookingData.name || bookingData.customerName || '',
    customerName: bookingData.customerName || bookingData.name || '',
    email: bookingData.email || 'Not provided',
    phone: bookingData.mobile || bookingData.phone || '',
    mobile: bookingData.mobile || bookingData.phone || '',
    altPhone: bookingData.altMobile || bookingData.altPhone || 'Not provided',
    altMobile: bookingData.altMobile || bookingData.altPhone || 'Not provided',
    alternateMobile: bookingData.altMobile || bookingData.altPhone || 'Not provided',
    pickupPerson: bookingData.pickupPerson || bookingData.pickupName || bookingData.name || '',
    pickupName: bookingData.pickupPerson || bookingData.pickupName || bookingData.name || '',
    bikeOwnerName: bookingData.pickupPerson || bookingData.pickupName || bookingData.name || '',
    receiver: bookingData.receiverName || bookingData.receiver || 'Not provided',
    receiverName: bookingData.receiverName || bookingData.receiver || 'Not provided',
    alternateContactPerson: bookingData.receiverName || bookingData.receiver || 'Not provided',
    location: bookingData.location || bookingData.address || bookingData.landmark || '',
    address: bookingData.location || bookingData.address || bookingData.landmark || '',
    landmark: bookingData.location || bookingData.address || bookingData.landmark || '',
    locationType: bookingData.locationType || bookingData.pickupType || 'home',
    pickupType: bookingData.pickupType || bookingData.locationType || 'home',
    timeSlot: bookingData.timeSlot || bookingData.time_slot || '',
    time_slot: bookingData.timeSlot || bookingData.time_slot || '',
    'Time Slot': bookingData.timeSlot || bookingData.time_slot || '',
    bikeModel: bookingData.bikeModel || bookingData.bike_model || '',
    bike_model: bookingData.bikeModel || bookingData.bike_model || '',
    'Bike Model': bookingData.bikeModel || bookingData.bike_model || '',
    service: bookingData.plan || bookingData.service || bookingData.serviceName || '',
    plan: bookingData.plan || bookingData.service || bookingData.serviceName || '',
    amount: bookingData.amount || bookingData.totalAmount || '',
    totalAmount: bookingData.amount || bookingData.totalAmount || '',
    paymentMethod: bookingData.paymentMethod ? bookingData.paymentMethod.toUpperCase() : 'UPI',
    razorpayOrderId: bookingData.razorpayOrderId || '',
    razorpayPaymentId: bookingData.razorpayPaymentId || '',
    paymentStatus: bookingData.paymentStatus || 'PAID',
    bookingStatus: bookingData.bookingStatus || 'CONFIRMED',
    timestamp: bookingData.timestamp || bookingData.createdAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    createdAt: bookingData.createdAt || bookingData.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  const scriptUrls = new Set();
  [customerScriptUrl, bookingScriptUrl, defaultScriptUrl].forEach((url) => {
    if (url && !url.includes('YOUR_GOOGLE_SCRIPT_URL')) {
      scriptUrls.add(url);
    }
  });

  if (scriptUrls.size > 0) {
    let success = false;
    for (const url of scriptUrls) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        success = true;
      } catch (scriptErr) {
        console.warn(`Google Script URL post warning (${url}):`, scriptErr.message);
      }
    }
    if (success) {
      return { success: true, method: 'google_script_url' };
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
      range: `${sheetName}!A1:N1`,
    });

    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:N1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              'Timestamp',
              'Name',
              'Pickup Type',
              'Location',
              'Mobile',
              'Alternate Mobile',
              'Bike Owner Name',
              'Alternate Contact person',
              'Time Slot',
              'Bike Model',
              'Plan',
              'Booking ID',
              'Payment Method',
              'Payment Status',
            ],
          ],
        },
      });
    }
  } catch (err) {
    console.warn('Header auto-initialization note:', err.message);
  }

  const row = [
    bookingData.timestamp || bookingData.createdAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    bookingData.name || bookingData.customerName || '',
    bookingData.pickupType || bookingData.locationType || 'home',
    bookingData.location || bookingData.address || bookingData.landmark || '',
    bookingData.mobile || bookingData.phone || '',
    bookingData.altMobile || bookingData.altPhone || 'Not provided',
    bookingData.pickupPerson || bookingData.pickupName || bookingData.name || '',
    bookingData.receiverName || bookingData.receiver || 'Not provided',
    bookingData.timeSlot || bookingData.time_slot || '',
    bookingData.bikeModel || bookingData.bike_model || '',
    bookingData.plan || bookingData.service || '',
    bookingData.bookingId || '',
    bookingData.paymentMethod || '',
    bookingData.paymentStatus || '',
    bookingData.email || 'Not provided',
  ];

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:O`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });

  return response.data;
}
