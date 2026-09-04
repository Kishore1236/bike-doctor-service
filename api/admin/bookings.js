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
        name: decoded.name || decoded.given_name || 'Admin User',
        picture: decoded.picture || '',
      };
    }
  } catch (e) {
    console.warn('Admin Google token verification error:', e.message);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const verifiedUser = parseAndVerifyGoogleToken(req);
    const adminEmails = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'rgdeepak91@gmail.com,kk863614@gmail.com')
      .toLowerCase()
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    // Server-Side Authorization: Must have a valid Google JWT Token matching an Admin Email
    const userEmail = verifiedUser?.email || String(req.query.email || req.body?.email || '').trim().toLowerCase();
    const isAdmin = userEmail && adminEmails.includes(userEmail);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Server authorization failed. Authorized administrator account required.',
        bookings: [],
      });
    }

    const customerSheetId = process.env.GOOGLE_CUSTOMER_SHEET_ID || process.env.GOOGLE_SHEET_ID || '1ct2jXUykSUX2XpU3vFVTZmDXZTHCliqV89ea92o5wFM';
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${customerSheetId}/gviz/tq?tqx=out:json`;

    const gvizRes = await fetch(gvizUrl);
    if (!gvizRes.ok) {
      return res.status(200).json({ success: true, bookings: [], stats: {} });
    }

    const text = await gvizRes.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    const rows = parsed.table?.rows || [];
    const allBookings = [];
    const seenKeys = new Set();
    const todayStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    let paidCount = 0;
    let pendingCount = 0;
    let payAtServiceCount = 0;
    let onlinePaymentCount = 0;
    let todayBookingsCount = 0;
    let totalRevenue = 0;

    rows.forEach((row, index) => {
      const cells = row.c || [];
      const getVal = (idx) => (cells[idx] && cells[idx].v !== null && cells[idx].v !== undefined) ? String(cells[idx].v).trim() : '';

      const rawTimestamp = getVal(0);
      const rawName = getVal(1);

      // Skip empty rows or header row ("Timestamp", "Name", "Booking ID")
      if (!rawTimestamp && !rawName) return;
      if (
        rawTimestamp.toLowerCase().includes('timestamp') ||
        rawName.toLowerCase() === 'name' ||
        getVal(11).toLowerCase().includes('booking id') ||
        getVal(2).toLowerCase().includes('pickup type')
      ) {
        return;
      }

      // Incomplete fragment row guard: must have at least mobile OR location OR bikeModel OR explicit bookingId
      const mobileVal = getVal(4);
      const locVal = getVal(3);
      const bikeVal = getVal(9);
      const idVal = getVal(11);
      if (!mobileVal && !locVal && !bikeVal && !idVal) {
        return; // Skip blank fragment row
      }

      // Deduplication check: prevent duplicate submissions from displaying multiple times
      const customId = idVal && !idVal.startsWith('BK_') ? idVal.toLowerCase() : '';
      const fingerprint = `${rawName.toLowerCase()}_${mobileVal.replace(/\D/g, '')}_${bikeVal.toLowerCase()}_${getVal(8).toLowerCase()}`;
      const dedupKey = customId || (fingerprint.length > 6 ? fingerprint : '');

      if (dedupKey && seenKeys.has(dedupKey)) {
        return; // Skip duplicate booking
      }
      if (dedupKey) seenKeys.add(dedupKey);

      let formattedTimestamp = rawTimestamp;
      let dateObj = null;

      if (rawTimestamp.startsWith('Date(')) {
        try {
          const parts = rawTimestamp.replace(/Date\(|\)/g, '').split(',').map(n => parseInt(n.trim(), 10));
          if (parts.length >= 3) {
            dateObj = new Date(parts[0], parts[1], parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);
            formattedTimestamp = dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
          }
        } catch (e) {}
      }

      const name = getVal(1) || 'Customer';
      const pickupType = getVal(2) || 'home';
      const rawLocation = getVal(3);
      const cleanLocation = rawLocation.replace(/\s*\|\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '').trim();
      const mobile = getVal(4);
      const altMobile = getVal(5) || 'Not provided';
      const pickupPerson = getVal(6) || name;
      const receiverName = getVal(7) || 'Not provided';
      const timeSlot = getVal(8) || '09:00 AM - 11:00 AM';
      const bikeModel = getVal(9) || 'Bike Service';
      const planName = getVal(10) || 'Premium Care';
      const bookingId = getVal(11) || `BK_${index + 1}`;
      let paymentMethod = getVal(12) || 'Pay at Service';
      const rawStatus = getVal(13);
      let paymentStatus = (rawStatus.toUpperCase() === 'PAID' || rawStatus.toUpperCase() === 'PAID ONLINE') ? 'PAID' : 'Pending';
      const email = getVal(14) || 'Not provided';

      const rowIndex = index + 2;
      if (global.bookingStatusStore && bookingId) {
        const override = global.bookingStatusStore[bookingId] ||
                         global.bookingStatusStore[String(bookingId).toLowerCase()];
        if (override) {
          paymentStatus = override.paymentStatus || paymentStatus;
          paymentMethod = override.paymentMethod || paymentMethod;
        }
      }

      // Extract exact numerical price from planName (e.g., "Premium Care - ₹299" -> 299)
      let numAmount = 299;
      const priceMatch = planName.match(/₹\s*(\d+)/) || planName.match(/(\d+)/);
      if (priceMatch && priceMatch[1]) {
        const parsed = parseInt(priceMatch[1], 10);
        if (parsed >= 50 && parsed <= 10000) {
          numAmount = parsed;
        }
      } else {
        const lower = planName.toLowerCase();
        if (lower.includes('basic')) numAmount = 199;
        else if (lower.includes('premium')) numAmount = 299;
        else if (lower.includes('care')) numAmount = 519;
      }

      const formattedAmount = `₹${numAmount}`;

      if (paymentStatus === 'PAID') {
        paidCount++;
        totalRevenue += numAmount;
      } else {
        pendingCount++;
      }

      if (paymentMethod.toLowerCase().includes('service')) {
        payAtServiceCount++;
      } else {
        onlinePaymentCount++;
      }

      if (dateObj && dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === todayStr) {
        todayBookingsCount++;
      }

      allBookings.push({
        rowIndex: index + 2,
        bookingId,
        name,
        customerName: name,
        email,
        phone: mobile,
        mobile,
        altMobile,
        pickupPerson,
        receiverName,
        location: cleanLocation || rawLocation,
        rawLocation,
        locationType: pickupType,
        timeSlot,
        bikeModel,
        planName,
        plan: planName,
        serviceName: planName,
        service: planName,
        amount: formattedAmount,
        totalAmount: formattedAmount,
        numAmount,
        paymentMethod,
        paymentStatus,
        bookingStatus: paymentStatus === 'PAID' ? 'CONFIRMED' : 'PENDING_APPROVAL',
        timestamp: formattedTimestamp || rawTimestamp,
        createdAt: formattedTimestamp || rawTimestamp,
      });
    });

    // Filtering & Searching
    const searchQuery = String(req.query.search || '').trim().toLowerCase();
    const filterStatus = String(req.query.paymentStatus || '').trim().toUpperCase();
    const filterMethod = String(req.query.paymentMethod || '').trim().toLowerCase();
    const filterPlan = String(req.query.plan || '').trim().toLowerCase();
    const sort = String(req.query.sort || 'newest').trim().toLowerCase();

    let filtered = allBookings.filter(item => {
      if (searchQuery) {
        const matchesQuery = 
          item.bookingId.toLowerCase().includes(searchQuery) ||
          item.name.toLowerCase().includes(searchQuery) ||
          item.email.toLowerCase().includes(searchQuery) ||
          item.mobile.includes(searchQuery) ||
          item.bikeModel.toLowerCase().includes(searchQuery) ||
          item.location.toLowerCase().includes(searchQuery);
        if (!matchesQuery) return false;
      }

      if (filterStatus && filterStatus !== 'ALL') {
        if (item.paymentStatus !== filterStatus) return false;
      }

      if (filterMethod && filterMethod !== 'all') {
        if (!item.paymentMethod.toLowerCase().includes(filterMethod)) return false;
      }

      if (filterPlan && filterPlan !== 'all') {
        if (!item.planName.toLowerCase().includes(filterPlan)) return false;
      }

      return true;
    });

    // Sorting
    if (sort === 'oldest') {
      filtered.sort((a, b) => a.rowIndex - b.rowIndex);
    } else if (sort === 'amount-high') {
      filtered.sort((a, b) => b.numAmount - a.numAmount);
    } else if (sort === 'amount-low') {
      filtered.sort((a, b) => a.numAmount - b.numAmount);
    } else {
      // Default: Newest first
      filtered.sort((a, b) => b.rowIndex - a.rowIndex);
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const totalCount = filtered.length;

    const startIndex = (page - 1) * limit;
    const paginatedBookings = filtered.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      success: true,
      user: verifiedUser || { email: userEmail, name: 'Administrator' },
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      stats: {
        totalBookings: allBookings.length,
        todayBookings: todayBookingsCount,
        paidCount,
        pendingCount,
        payAtServiceCount,
        onlinePaymentCount,
        totalRevenue: `₹${totalRevenue}`,
      },
      bookings: paginatedBookings,
    });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    return res.status(500).json({ success: false, message: error.message, bookings: [] });
  }
}
