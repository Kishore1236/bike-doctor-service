function parseAndVerifyGoogleToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  let token = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query?.token) {
    token = String(req.query.token).trim();
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
      };
    }
  } catch (e) {
    console.warn('Admin Google token verification error:', e.message);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const verifiedUser = parseAndVerifyGoogleToken(req);
    const adminEmails = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'rgdeepak91@gmail.com,kk863614@gmail.com')
      .toLowerCase()
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    const userEmail = verifiedUser?.email || String(req.query?.email || '').trim().toLowerCase();
    const isAdmin = userEmail && adminEmails.includes(userEmail);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Server authorization failed. Authorized administrator account required.',
      });
    }

    const customerSheetId = process.env.GOOGLE_CUSTOMER_SHEET_ID || process.env.GOOGLE_SHEET_ID || '1ct2jXUykSUX2XpU3vFVTZmDXZTHCliqV89ea92o5wFM';
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${customerSheetId}/gviz/tq?tqx=out:json`;

    const gvizRes = await fetch(gvizUrl);
    if (!gvizRes.ok) {
      return res.status(200).json({ success: true, stats: {} });
    }

    const text = await gvizRes.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    const rows = parsed.table?.rows || [];
    const todayStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    let paidCount = 0;
    let pendingCount = 0;
    let payAtServiceCount = 0;
    let onlinePaymentCount = 0;
    let todayBookingsCount = 0;
    let totalRevenue = 0;

    const serviceDistribution = {};

    rows.forEach((row) => {
      const cells = row.c || [];
      const getVal = (idx) => (cells[idx] && cells[idx].v !== null && cells[idx].v !== undefined) ? String(cells[idx].v).trim() : '';

      const rawTimestamp = getVal(0);
      let dateObj = null;
      if (rawTimestamp.startsWith('Date(')) {
        try {
          const parts = rawTimestamp.replace(/Date\(|\)/g, '').split(',').map(n => parseInt(n.trim(), 10));
          if (parts.length >= 3) {
            dateObj = new Date(parts[0], parts[1], parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);
          }
        } catch (e) {}
      }

      const planName = getVal(10) || 'Premium Care';
      const paymentMethod = getVal(12) || 'Pay at Service';
      const rawStatus = getVal(13);
      const paymentStatus = (rawStatus.toUpperCase() === 'PAID' || rawStatus.toUpperCase() === 'PAID ONLINE') ? 'PAID' : 'Pending';

      let numAmount = 319;
      if (planName.toLowerCase().includes('basic')) numAmount = 219;
      else if (planName.toLowerCase().includes('care')) numAmount = 519;
      else if (planName.toLowerCase().includes('premium')) numAmount = 319;

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

      const normPlan = planName.includes('Basic') ? 'Basic Wash' : planName.includes('Care') ? 'Monthly Bike Care' : 'Premium Care';
      serviceDistribution[normPlan] = (serviceDistribution[normPlan] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings: rows.length,
        todayBookings: todayBookingsCount,
        paidCount,
        pendingCount,
        payAtServiceCount,
        onlinePaymentCount,
        totalRevenue: `₹${totalRevenue}`,
        numRevenue: totalRevenue,
        serviceDistribution,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
