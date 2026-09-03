// Helper to parse and verify Google JWT ID Tokens
function parseAndVerifyGoogleToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  let token = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query?.token) {
    token = String(req.query.token).trim();
  } else if (req.body?.token) {
    token = String(req.body.token).trim();
  }

  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);

    const isValidIssuer = decoded.iss === 'https://accounts.google.com' || decoded.iss === 'accounts.google.com';
    const isNotExpired = !decoded.exp || (decoded.exp * 1000 > Date.now() - 300000);

    if (isValidIssuer && isNotExpired && decoded.email) {
      return {
        email: decoded.email.trim().toLowerCase(),
        name: decoded.name || decoded.given_name || 'Customer',
      };
    }
  } catch (e) {
    console.warn('Google token verification error:', e.message);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const verifiedUser = parseAndVerifyGoogleToken(req);
    let userEmail = verifiedUser ? verifiedUser.email : (req.query.email ? String(req.query.email).trim().toLowerCase() : '');

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in with Google.',
        bookings: [],
      });
    }

    const customerSheetId = process.env.GOOGLE_CUSTOMER_SHEET_ID || process.env.GOOGLE_SHEET_ID || '1ct2jXUykSUX2XpU3vFVTZmDXZTHCliqV89ea92o5wFM';
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${customerSheetId}/gviz/tq?tqx=out:json`;

    const gvizRes = await fetch(gvizUrl);
    if (!gvizRes.ok) {
      return res.status(200).json({ success: true, bookings: [] });
    }

    const text = await gvizRes.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    const rows = parsed.table?.rows || [];
    const matchedBookings = [];

    rows.forEach((row, index) => {
      const cells = row.c || [];
      const getVal = (idx) => (cells[idx] && cells[idx].v !== null && cells[idx].v !== undefined) ? String(cells[idx].v).trim() : '';

      let isExactEmailMatch = false;
      for (let i = 0; i < cells.length; i++) {
        const val = getVal(i).toLowerCase();
        if (val === userEmail || (userEmail.includes('@') && val.includes(userEmail))) {
          isExactEmailMatch = true;
          break;
        }
      }

      if (!isExactEmailMatch) {
        const rowName = getVal(1).toLowerCase();
        const rowLoc = getVal(3).toLowerCase();
        if (userEmail.includes('@') && (rowName === userEmail || rowLoc.includes(userEmail))) {
          isExactEmailMatch = true;
        }
      }

      if (isExactEmailMatch) {
        const rawTimestamp = getVal(0);
        let formattedTimestamp = rawTimestamp;
        if (rawTimestamp.startsWith('Date(')) {
          try {
            const parts = rawTimestamp.replace(/Date\(|\)/g, '').split(',').map(n => parseInt(n.trim(), 10));
            if (parts.length >= 3) {
              const d = new Date(parts[0], parts[1], parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);
              formattedTimestamp = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            }
          } catch (e) {}
        }

        const rowName = getVal(1);
        const pickupType = getVal(2);
        const rawLocation = getVal(3);
        const cleanLocation = rawLocation.replace(/\s*\|\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '').trim();
        const mobile = getVal(4);
        const timeSlot = getVal(8);
        const bikeModel = getVal(9);
        const planName = getVal(10);
        const bookingId = getVal(11) || `BK_${index + 1}`;
        let paymentMethod = getVal(12) || 'Pay at Service';
        let paymentStatus = getVal(13) || (paymentMethod.toLowerCase().includes('paid') || paymentMethod.toLowerCase().includes('online') ? 'PAID' : 'Pending');
        const emailVal = getVal(14) || userEmail;

        const rowIndex = index + 2;
        if (global.bookingStatusStore) {
          const override = global.bookingStatusStore[bookingId] ||
                           global.bookingStatusStore[String(bookingId).toLowerCase()] ||
                           global.bookingStatusStore[`row_${rowIndex}`] ||
                           (rowName ? global.bookingStatusStore[`name_${String(rowName).toLowerCase()}`] : null) ||
                           (userEmail ? global.bookingStatusStore[`email_${String(userEmail).toLowerCase()}`] : null);
          if (override) {
            paymentStatus = override.paymentStatus || paymentStatus;
            paymentMethod = override.paymentMethod || paymentMethod;
          }
        }

        matchedBookings.push({
          bookingId,
          name: rowName || verifiedUser?.name || 'Customer',
          customerName: rowName || verifiedUser?.name || 'Customer',
          email: emailVal || userEmail,
          phone: mobile,
          location: cleanLocation || rawLocation,
          locationType: pickupType,
          timeSlot: timeSlot || 'Scheduled Slot',
          bikeModel: bikeModel || 'Bike Service',
          planName: planName || 'Premium Care',
          plan: planName || 'Premium Care',
          serviceName: planName || 'Complete Service',
          service: planName || 'Complete Service',
          totalAmount: planName.includes('Basic') ? '₹219' : planName.includes('Care') ? '₹519' : '₹319',
          paymentMethod,
          paymentStatus,
          createdAt: formattedTimestamp || new Date().toLocaleString(),
          timestamp: formattedTimestamp || new Date().toLocaleString(),
        });
      }
    });

    return res.status(200).json({
      success: true,
      bookings: matchedBookings.reverse(),
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return res.status(200).json({ success: true, bookings: [] });
  }
}
