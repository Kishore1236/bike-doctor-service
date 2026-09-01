export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { email, phone, name } = req.query || {};
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
    const searchEmail = (email || '').trim().toLowerCase();
    const searchPhone = (phone || '').trim().toLowerCase();
    const searchName = (name || '').trim().toLowerCase();

    const matchedBookings = [];

    rows.forEach((row, index) => {
      const cells = row.c || [];
      const getVal = (idx) => (cells[idx] && cells[idx].v !== null && cells[idx].v !== undefined) ? String(cells[idx].v).trim() : '';

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
      const location = getVal(3);
      const mobile = getVal(4);
      const altMobile = getVal(5);
      const bikeOwnerName = getVal(6);
      const timeSlot = getVal(8);
      const bikeModel = getVal(9);
      const planName = getVal(10);
      const bookingId = getVal(11) || `BK_HIST_${index + 1}`;
      const paymentMethod = getVal(12) || 'Pay at Service';
      const paymentStatus = getVal(13) || (paymentMethod.toLowerCase().includes('paid') || paymentMethod.toLowerCase().includes('online') ? 'PAID' : 'Pending');

      const emailUser = searchEmail ? searchEmail.split('@')[0] : '';
      const rName = rowName.toLowerCase();
      const bOwner = bikeOwnerName.toLowerCase();

      const matchesEmail = searchEmail && (
        (rName && (rName.includes(searchEmail) || searchEmail.includes(rName))) ||
        (emailUser && emailUser.length > 2 && rName && (rName.includes(emailUser) || emailUser.includes(rName))) ||
        location.toLowerCase().includes(searchEmail)
      );
      const matchesPhone = searchPhone && (mobile.includes(searchPhone) || altMobile.includes(searchPhone));
      const matchesName = searchName && (
        (rName && (rName.includes(searchName) || searchName.includes(rName))) ||
        (bOwner && (bOwner.includes(searchName) || searchName.includes(bOwner)))
      );

      const isMatch = (!searchEmail && !searchPhone && !searchName) || matchesEmail || matchesPhone || matchesName;

      if (isMatch) {
        matchedBookings.push({
          bookingId,
          name: rowName || searchName || 'Customer',
          customerName: rowName || searchName || 'Customer',
          phone: mobile,
          location,
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
