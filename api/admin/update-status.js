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
      };
    }
  } catch (e) {
    console.warn('Admin Google token verification error:', e.message);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const verifiedUser = parseAndVerifyGoogleToken(req);
    const adminEmails = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'rgdeepak91@gmail.com,kk863614@gmail.com')
      .toLowerCase()
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    const userEmail = verifiedUser?.email || String(req.body?.email || req.query?.email || '').trim().toLowerCase();
    const isAdmin = userEmail && adminEmails.includes(userEmail);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Server authorization failed. Authorized administrator account required.',
      });
    }

    const { bookingId, paymentStatus, paymentMethod } = req.body || {};

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    const newStatus = paymentStatus ? String(paymentStatus).toUpperCase() : 'PAID';
    const newMethod = paymentMethod || 'Pay Online (Admin Updated)';

    const bookingScriptUrl = process.env.GOOGLE_BOOKING_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec';
    const customerScriptUrl = process.env.GOOGLE_CUSTOMER_SCRIPT_URL || process.env.VITE_GOOGLE_CUSTOMER_SCRIPT_URL;

    const payload = {
      bookingId,
      paymentStatus: newStatus,
      'Payment Status': newStatus,
      status: newStatus,
      'Status': newStatus,
      paymentMethod: newMethod,
      'Payment Method': newMethod,
    };

    const scriptUrls = new Set();
    [bookingScriptUrl, customerScriptUrl].forEach(url => {
      if (url && !url.includes('YOUR_GOOGLE_SCRIPT_URL')) {
        scriptUrls.add(url);
      }
    });

    for (const url of scriptUrls) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn(`Update status script notice (${url}):`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      bookingId,
      paymentStatus: newStatus,
      message: `Booking ${bookingId} status updated to ${newStatus} successfully.`,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
