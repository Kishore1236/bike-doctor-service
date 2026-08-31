export function generateInvoiceHTML(booking) {
  const bookingId = booking.bookingId || `BK${Date.now().toString().slice(-6)}`;
  const dateStr = booking.createdAt || booking.timestamp || new Date().toLocaleString();
  const customerName = booking.customerName || booking.name || booking.pickupPerson || 'Valued Customer';
  const phone = booking.phone || booking.mobile || 'Not provided';
  const location = booking.location || booking.landmark || booking.address || 'Doorstep Pickup';
  const bikeModel = booking.bikeModel || booking.bike || 'Bike Service';
  const timeSlot = booking.timeSlot || 'Scheduled Slot';
  const planName = booking.planName || booking.plan || 'Premium Care';
  const serviceName = booking.serviceName || booking.service || 'Doorstep Bike Maintenance';
  const totalAmount = booking.totalAmount || booking.amount || '₹319';
  const paymentMethod = booking.paymentMethod || 'Pay at Service';
  const paymentStatus = booking.paymentStatus || (paymentMethod.includes('Online') || paymentMethod.includes('PAID') ? 'PAID' : 'PENDING');

  const isPaid = paymentStatus.toUpperCase() === 'PAID';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${bookingId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 40px 20px;
    }
    .invoice-card {
      max-width: 750px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      padding: 40px;
      border: 1px solid #e2e8f0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #fee2e2;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      background: #dc2626;
      color: #fff;
      font-weight: 900;
      font-size: 1.4rem;
      padding: 8px 14px;
      border-radius: 10px;
      letter-spacing: -0.04em;
    }
    .brand-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #1e293b;
    }
    .brand-tagline {
      font-size: 0.8rem;
      color: #64748b;
    }
    .invoice-title-box {
      text-align: right;
    }
    .invoice-title-box h1 {
      font-size: 1.6rem;
      font-weight: 900;
      color: #dc2626;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-item {
      font-size: 0.88rem;
      color: #64748b;
      margin-top: 4px;
    }
    .meta-item strong {
      color: #0f172a;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
    }
    .section-label {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #dc2626;
      margin-bottom: 8px;
    }
    .info-line {
      font-size: 0.92rem;
      color: #334155;
      margin-bottom: 4px;
    }
    .info-line strong {
      color: #0f172a;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    .table th {
      background: #1e293b;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 12px 16px;
      text-align: left;
    }
    .table td {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.94rem;
      color: #334155;
    }
    .table tr:last-child td {
      border-bottom: 2px solid #cbd5e1;
    }
    .summary-box {
      margin-left: auto;
      width: 320px;
      background: #fff5f5;
      border: 1.5px solid rgba(220, 38, 38, 0.2);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 32px;
    }
    .sum-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.92rem;
      color: #475569;
      margin-bottom: 8px;
    }
    .sum-row.total {
      padding-top: 10px;
      border-top: 1px solid rgba(220, 38, 38, 0.2);
      font-size: 1.15rem;
      font-weight: 800;
      color: #991b1b;
      margin-bottom: 0;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .status-paid {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .status-pending {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde047;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      text-align: center;
      font-size: 0.82rem;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer strong {
      color: #475569;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <div class="logo-badge">BD</div>
        <div>
          <div class="brand-title">BikeDoctor</div>
          <div class="brand-tagline">Doorstep Bike Care & Pickup Services</div>
        </div>
      </div>
      <div class="invoice-title-box">
        <h1>Tax Invoice</h1>
        <div class="meta-item">Invoice #: <strong>${bookingId}</strong></div>
        <div class="meta-item">Date: <strong>${dateStr}</strong></div>
      </div>
    </div>

    <div class="details-grid">
      <div>
        <div class="section-label">Customer Information</div>
        <div class="info-line"><strong>Name:</strong> ${customerName}</div>
        <div class="info-line"><strong>Phone:</strong> ${phone}</div>
        <div class="info-line"><strong>Address / Landmark:</strong> ${location}</div>
      </div>
      <div>
        <div class="section-label">Service Details</div>
        <div class="info-line"><strong>Bike Model:</strong> ${bikeModel}</div>
        <div class="info-line"><strong>Time Slot:</strong> ${timeSlot}</div>
        <div class="info-line"><strong>Payment Method:</strong> ${paymentMethod}</div>
        <div class="info-line">
          <strong>Payment Status:</strong> 
          <span class="status-badge ${isPaid ? 'status-paid' : 'status-pending'}">
            ${paymentStatus}
          </span>
        </div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Type</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${planName}</strong><br>
            <span style="font-size:0.82rem; color:#64748b;">${serviceName}</span>
          </td>
          <td>Package</td>
          <td style="text-align: right;">${totalAmount}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-box">
      <div class="sum-row">
        <span>Grand Total</span>
        <strong>${totalAmount}</strong>
      </div>
      <div class="sum-row total">
        <span>Amount Due</span>
        <span>${isPaid ? '₹0 (Paid)' : totalAmount}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing <strong>BikeDoctor</strong>! For queries, contact us via WhatsApp or Phone.</p>
      <p style="margin-top: 4px;">© 2026 Bike Doctor. Service-first bike care scheduling.</p>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
  `;
}

export function downloadInvoicePDF(booking) {
  const html = generateInvoiceHTML(booking);
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert('Please allow popups for this site to download/print your invoice PDF.');
  }
}
