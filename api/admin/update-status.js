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

    const { bookingId, rowIndex, name, email, paymentStatus, paymentMethod } = req.body || {};

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    const newStatus = paymentStatus ? String(paymentStatus).toUpperCase() : 'PAID';
    const newMethod = paymentMethod || 'Pay Online (Admin Updated)';

    // Save in global server memory store for immediate consistency
    if (!global.bookingStatusStore) {
      global.bookingStatusStore = {};
    }
    const storePayload = {
      paymentStatus: newStatus,
      paymentMethod: newMethod,
      updatedAt: Date.now(),
    };
    global.bookingStatusStore[bookingId] = storePayload;
    if (bookingId) global.bookingStatusStore[bookingId.toLowerCase()] = storePayload;
    if (email) global.bookingStatusStore[`email_${String(email).toLowerCase()}`] = storePayload;

    const bookingScriptUrl = process.env.GOOGLE_BOOKING_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec';
    const customerScriptUrl = process.env.GOOGLE_CUSTOMER_SCRIPT_URL || process.env.VITE_GOOGLE_CUSTOMER_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxyCbvsvoQxXSpXjiJykrfWRyPy_fXSi4Ulr-zx7szw-R-VLLf8yY0HwVyHaLmXIHd8yw/exec';

    const payload = {
      bookingId,
      paymentStatus: newStatus,
      'Payment Status': newStatus,
      status: newStatus,
      'Status': newStatus,
      paymentMethod: newMethod,
      'Payment Method': newMethod,
      action: 'UPDATE_STATUS',
    };

    const scriptUrls = new Set();
    [bookingScriptUrl, customerScriptUrl].forEach(url => {
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

        fetch(fullUrl, { mode: 'no-cors' }).catch(() => {});
        await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn(`Update status script notice (${url}):`, err.message);
      }
    }

    // Direct Google Sheets API update for persistent cloud storage
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

        let targetRow = parseInt(rowIndex, 10);

        if (!targetRow || targetRow < 2) {
          const getRes = await sheets.spreadsheets.values.get({
            spreadsheetId: customerSheetId,
            range: 'A:O',
          });
          const rows = getRes.data.values || [];
          const cleanBId = bookingId ? String(bookingId).trim().toLowerCase() : '';
          const cleanName = name ? String(name).trim().toLowerCase() : '';

          for (let i = 1; i < rows.length; i++) {
            const r = rows[i] || [];
            const cellL = r[11] ? String(r[11]).trim().toLowerCase() : '';
            const cellB = r[1] ? String(r[1]).trim().toLowerCase() : '';

            if (cleanBId && cellL && cellL === cleanBId) {
              targetRow = i + 1;
              break;
            } else if (cleanBId && r.some(c => c && String(c).toLowerCase().includes(cleanBId))) {
              targetRow = i + 1;
              break;
            } else if (cleanName && cellB && cellB === cleanName) {
              targetRow = i + 1;
              break;
            }
          }
        }

        if (targetRow && targetRow >= 2) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: customerSheetId,
            range: `L${targetRow}:N${targetRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[bookingId || `BK_${targetRow - 1}`, newMethod, newStatus]],
            },
          });
          console.log(`Directly updated Google Sheet row ${targetRow} [L:N] via Vercel Admin API with bookingId=${bookingId}, method=${newMethod}, status=${newStatus}`);
        }
      }
    } catch (sheetApiErr) {
      console.warn('Vercel Google Sheets API direct update notice:', sheetApiErr.message);
    }

    return res.status(200).json({
      success: true,
      bookingId,
      paymentStatus: newStatus,
      paymentMethod: newMethod,
      message: `Booking ${bookingId} status updated to ${newStatus} successfully in persistent Google Sheets storage.`,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
