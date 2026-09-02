import Razorpay from 'razorpay';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const customerSheetId = process.env.GOOGLE_CUSTOMER_SHEET_ID || process.env.GOOGLE_SHEET_ID || '1ct2jXUykSUX2XpU3vFVTZmDXZTHCliqV89ea92o5wFM';
  const bookingScriptUrl = process.env.GOOGLE_BOOKING_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_BOOKING_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz-7FfKmE6FgZGxs75wMK-QuFuP97U915UAy9Ukeo5JxlgqwYoevb25RQKHFFZkunjw/exec';

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  let razorpay = null;
  if (keyId && keySecret && !keyId.includes('YOUR_KEY_ID')) {
    try {
      razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } catch (e) {
      console.warn('Razorpay SDK initialization warning:', e.message);
    }
  }

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${customerSheetId}/gviz/tq?tqx=out:json`;

  const report = {
    success: true,
    timestamp: new Date().toISOString(),
    totalRowsAudited: 0,
    reconciledPaidCount: 0,
    legitimatePendingCount: 0,
    manualReviewCount: 0,
    reconciledPaid: [],
    alreadyPaid: [],
    legitimatePending: [],
    manualReview: [],
    errors: [],
  };

  try {
    const gvizRes = await fetch(gvizUrl);
    if (!gvizRes.ok) {
      throw new Error(`Failed to fetch Google Sheet via GViz endpoint (Status ${gvizRes.status})`);
    }

    const text = await gvizRes.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);
    const rows = parsed.table?.rows || [];

    report.totalRowsAudited = rows.length;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const cells = row.c || [];
      const getVal = (idx) => (cells[idx] && cells[idx].v !== null && cells[idx].v !== undefined) ? String(cells[idx].v).trim() : '';

      const rawTimestamp = getVal(0);
      const name = getVal(1);
      const pickupType = getVal(2);
      const location = getVal(3);
      const mobile = getVal(4);
      const timeSlot = getVal(8);
      const bikeModel = getVal(9);
      const planName = getVal(10);
      const bookingId = getVal(11) || `BK_EXIST_${index + 1}`;
      const paymentMethod = getVal(12) || 'Pay at Service';
      const paymentStatus = getVal(13) || 'Pending';
      const email = getVal(14) || '';

      const recordInfo = {
        sheetRowIndex: index + 2,
        bookingId,
        name,
        email,
        mobile,
        planName,
        paymentMethod,
        paymentStatus,
        location,
        timestamp: rawTimestamp,
      };

      const isStatusPaid = paymentStatus.toUpperCase() === 'PAID' || paymentStatus.toUpperCase() === 'PAID ONLINE';

      if (isStatusPaid) {
        report.alreadyPaid.push(recordInfo);
        continue;
      }

      let rzpPaymentId = null;
      let rzpOrderId = null;

      for (let c = 0; c < cells.length; c++) {
        const textVal = getVal(c);
        const pMatch = textVal.match(/pay_[A-Za-z0-9]+/);
        if (pMatch && !rzpPaymentId) rzpPaymentId = pMatch[0];

        const oMatch = textVal.match(/order_[A-Za-z0-9]+/);
        if (oMatch && !rzpOrderId) rzpOrderId = oMatch[0];
      }

      let isConfirmedCaptured = false;
      let capturedDetails = null;

      if (razorpay && (rzpPaymentId || rzpOrderId)) {
        try {
          if (rzpPaymentId) {
            const pObj = await razorpay.payments.fetch(rzpPaymentId);
            if (pObj && pObj.status === 'captured') {
              isConfirmedCaptured = true;
              capturedDetails = { paymentId: pObj.id, amount: pObj.amount / 100, method: pObj.method };
            }
          } else if (rzpOrderId) {
            const oPayments = await razorpay.orders.fetchPayments(rzpOrderId);
            if (oPayments && Array.isArray(oPayments.items)) {
              const cap = oPayments.items.find(p => p.status === 'captured');
              if (cap) {
                isConfirmedCaptured = true;
                capturedDetails = { paymentId: cap.id, amount: cap.amount / 100, method: cap.method };
              }
            }
          }
        } catch (rzpErr) {
          console.warn(`Razorpay API verification warning for row ${index + 2}:`, rzpErr.message);
        }
      }

      if (isConfirmedCaptured) {
        const updatePayload = {
          bookingId,
          name,
          customerName: name,
          location,
          address: location,
          landmark: location,
          mobile,
          phone: mobile,
          pickupPerson: name,
          timeSlot,
          bikeModel,
          plan: planName,
          service: planName,
          paymentMethod: `Pay Online (${(capturedDetails?.method || 'UPI').toUpperCase()})`,
          paymentStatus: 'PAID',
          email,
          'Email': email,
        };

        try {
          await fetch(bookingScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
          });
          recordInfo.paymentStatus = 'PAID';
          recordInfo.updatedMethod = updatePayload.paymentMethod;
          recordInfo.capturedDetails = capturedDetails;
          report.reconciledPaid.push(recordInfo);
        } catch (uErr) {
          report.errors.push(`Failed to update booking ${bookingId} to PAID: ${uErr.message}`);
          report.manualReview.push({ ...recordInfo, reason: `Payment captured on Razorpay (${capturedDetails?.paymentId}) but sheet update failed` });
        }
      } else if (paymentMethod.toLowerCase().includes('service')) {
        report.legitimatePending.push(recordInfo);
      } else {
        report.manualReview.push({ ...recordInfo, reason: 'Pending online payment without verifiable Razorpay captured status' });
      }
    }

    report.reconciledPaidCount = report.reconciledPaid.length;
    report.legitimatePendingCount = report.legitimatePending.length;
    report.manualReviewCount = report.manualReview.length;

    return res.status(200).json(report);
  } catch (err) {
    console.error('Reconciliation API error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
