const formatCurrency = (paise) => {
  const rupees = (Number(paise) || 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
};

const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const renderBaseLayout = ({ title, preheader, content, business }) => {
  const businessName = business?.businessName || "RentSphere Event Rentals";
  const phone = business?.phone || "+91 98765 43210";
  const email = business?.email || "support@rentsphere.com";
  const address = business?.address
    ? [business.address.street, business.address.city, business.address.state]
        .filter(Boolean)
        .join(", ")
    : "Bengaluru, Karnataka";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #1e293b; }
    .wrapper { width: 100%; max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
    .body-content { padding: 32px 24px; }
    .footer { background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 9999px; }
    .badge-success { background-color: #dcfce7; color: #15803d; }
    .badge-info { background-color: #e0f2fe; color: #0369a1; }
    .badge-warning { background-color: #fef3c7; color: #b45309; }
    .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px dashed #e2e8f0; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #64748b; }
    .details-value { font-weight: 600; color: #0f172a; text-align: right; }
    .table-container { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .table-container th { background-color: #f1f5f9; padding: 10px; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #cbd5e1; }
    .table-container td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="wrapper">
    <div class="header">
      <h1>${businessName}</h1>
      <p>Professional Event & Equipment Rentals</p>
    </div>
    <div class="body-content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>${businessName}</strong> &bull; ${address}</p>
      <p style="margin: 0;">Phone: ${phone} | Email: ${email}</p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #94a3b8;">This is an automated notification regarding your rental transaction.</p>
    </div>
  </div>
</body>
</html>`;
};

export const bookingConfirmationTemplate = ({ booking, customer, business }) => {
  const itemsHtml = (booking.items || [])
    .map(
      (item) => `<tr>
        <td><strong>${item.name || item.sku}</strong></td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">${formatCurrency(item.rateSnapshot?.appliedRate || 0)}</td>
        <td style="text-align:right;">${formatCurrency(item.subtotal || 0)}</td>
      </tr>`
    )
    .join("");

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a;">Booking Confirmed!</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Hello ${customer?.name || "Valued Customer"}, thank you for choosing RentSphere. Your equipment reservation has been confirmed.
    </p>
    <div class="details-box">
      <div class="details-row"><span class="details-label">Booking Reference:</span><span class="details-value">${booking.bookingNumber}</span></div>
      <div class="details-row"><span class="details-label">Status:</span><span class="details-value"><span class="badge badge-success">Confirmed</span></span></div>
      <div class="details-row"><span class="details-label">Start Date:</span><span class="details-value">${formatDate(booking.startDate)}</span></div>
      <div class="details-row"><span class="details-label">End Date:</span><span class="details-value">${formatDate(booking.endDate)}</span></div>
      <div class="details-row"><span class="details-label">Rental Duration:</span><span class="details-value">${booking.duration} ${booking.rentalType === "hourly" ? "Hour(s)" : "Day(s)"}</span></div>
    </div>
    <h3 style="margin: 20px 0 8px 0; font-size: 15px; color: #0f172a;">Reserved Equipment</h3>
    <table class="table-container">
      <thead>
        <tr>
          <th>Equipment</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Rate</th>
          <th style="text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Please bring one government-issued photo ID (Aadhaar or Driving License) during equipment pickup. If you arranged external transportation with us, our logistics coordinator will contact you prior to dispatch.
    </p>
  `;

  return {
    subject: `Booking Confirmed - ${booking.bookingNumber} | RentSphere`,
    html: renderBaseLayout({
      title: `Booking Confirmed - ${booking.bookingNumber}`,
      preheader: `Your rental booking ${booking.bookingNumber} is confirmed.`,
      content,
      business,
    }),
  };
};

export const equipmentIssuedTemplate = ({ booking, customer, business }) => {
  const itemsHtml = (booking.items || [])
    .map(
      (item) => `<tr>
        <td><strong>${item.name || item.sku}</strong></td>
        <td style="text-align:center;">${item.issuedQuantity || item.quantity}</td>
        <td><span class="badge badge-info">Handed Over</span></td>
      </tr>`
    )
    .join("");

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a;">Equipment Handover Recorded</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Hello ${customer?.name || "Customer"}, your rented equipment has been inspected and handed over.
    </p>
    <div class="details-box">
      <div class="details-row"><span class="details-label">Booking Reference:</span><span class="details-value">${booking.bookingNumber}</span></div>
      <div class="details-row"><span class="details-label">Issued At:</span><span class="details-value">${formatDate(new Date())}</span></div>
      <div class="details-row"><span class="details-label">Return Due Date:</span><span class="details-value" style="color: #b45309;">${formatDate(booking.endDate)}</span></div>
    </div>
    <h3 style="margin: 20px 0 8px 0; font-size: 15px; color: #0f172a;">Issued Equipment Checklist</h3>
    <table class="table-container">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:center;">Quantity</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      <strong>Equipment Care:</strong> Please ensure all cords, covers, and accessories are safeguarded from moisture and power surges. For technical assistance or early returns, contact our shop directly.
    </p>
  `;

  return {
    subject: `Equipment Issued - ${booking.bookingNumber} | RentSphere`,
    html: renderBaseLayout({
      title: `Equipment Handover - ${booking.bookingNumber}`,
      preheader: `Equipment for booking ${booking.bookingNumber} has been issued.`,
      content,
      business,
    }),
  };
};

export const invoicePdfTemplate = ({ invoice, customer, business }) => {
  const pricing = invoice.pricing || {};
  const isPaid = pricing.outstandingBalance === 0;

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a;">Tax Invoice Attached</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Hello ${customer?.name || invoice.customer?.name || "Customer"}, your official tax invoice is now available. An official PDF copy has been attached to this email.
    </p>
    <div class="details-box">
      <div class="details-row"><span class="details-label">Invoice Number:</span><span class="details-value">${invoice.invoiceNumber}</span></div>
      <div class="details-row"><span class="details-label">Invoice Date:</span><span class="details-value">${formatDate(invoice.createdAt)}</span></div>
      <div class="details-row"><span class="details-label">Invoice Status:</span><span class="details-value"><span class="badge ${isPaid ? "badge-success" : "badge-warning"}">${isPaid ? "Paid in Full" : "Payment Due"}</span></span></div>
      <div class="details-row"><span class="details-label">Rental Revenue:</span><span class="details-value">${formatCurrency(pricing.rentalRevenue || 0)}</span></div>
      <div class="details-row"><span class="details-label">Refundable Deposit:</span><span class="details-value">${formatCurrency(pricing.refundableDeposit || 0)}</span></div>
      <div class="details-row"><span class="details-label">Total Invoiced:</span><span class="details-value">${formatCurrency(pricing.totalInvoiceAmount || 0)}</span></div>
      <div class="details-row"><span class="details-label">Total Paid:</span><span class="details-value">${formatCurrency(pricing.totalPaid || 0)}</span></div>
      <div class="details-row"><span class="details-label">Outstanding Balance:</span><span class="details-value" style="font-size: 16px; color: ${isPaid ? "#15803d" : "#dc2626"};">${formatCurrency(pricing.outstandingBalance || 0)}</span></div>
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      ${isPaid ? "Thank you for clearing your balance in full!" : "Please settle any outstanding balance using cash, bank transfer, or UPI as shown on the attached PDF invoice."}
    </p>
  `;

  return {
    subject: `Tax Invoice ${invoice.invoiceNumber} - RentSphere`,
    html: renderBaseLayout({
      title: `Tax Invoice ${invoice.invoiceNumber}`,
      preheader: `Invoice ${invoice.invoiceNumber} from RentSphere.`,
      content,
      business,
    }),
  };
};

export const paymentReceiptTemplate = ({ payment, invoice, booking, customer, business }) => {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a;">Payment Received</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Hello ${customer?.name || "Customer"}, we have successfully recorded and verified your payment.
    </p>
    <div class="details-box">
      <div class="details-row"><span class="details-label">Receipt Number:</span><span class="details-value">${payment.paymentNumber}</span></div>
      <div class="details-row"><span class="details-label">Amount Paid:</span><span class="details-value" style="color:#15803d; font-size: 16px;">${formatCurrency(payment.amount)}</span></div>
      <div class="details-row"><span class="details-label">Payment Method:</span><span class="details-value">${(payment.paymentMethod || "UPI").toUpperCase()}</span></div>
      <div class="details-row"><span class="details-label">Purpose:</span><span class="details-value">${(payment.purpose || "rental").toUpperCase()}</span></div>
      <div class="details-row"><span class="details-label">Payment Date:</span><span class="details-value">${formatDate(payment.paymentDate)}</span></div>
      ${payment.transactionReference ? `<div class="details-row"><span class="details-label">Transaction Ref:</span><span class="details-value">${payment.transactionReference}</span></div>` : ""}
      ${invoice?.invoiceNumber ? `<div class="details-row"><span class="details-label">Applied to Invoice:</span><span class="details-value">${invoice.invoiceNumber}</span></div>` : ""}
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Your financial statement has been updated. If you made an advance deposit payment, it will be automatically reflected on your final rental invoice.
    </p>
  `;

  return {
    subject: `Payment Receipt - ${payment.paymentNumber} | RentSphere`,
    html: renderBaseLayout({
      title: `Payment Receipt ${payment.paymentNumber}`,
      preheader: `Payment of ${formatCurrency(payment.amount)} received.`,
      content,
      business,
    }),
  };
};

export const upcomingReturnReminderTemplate = ({ booking, customer, business }) => {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a;">Equipment Return Reminder</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Hello ${customer?.name || "Customer"}, this is a friendly reminder that your equipment rental return is approaching.
    </p>
    <div class="details-box">
      <div class="details-row"><span class="details-label">Booking Reference:</span><span class="details-value">${booking.bookingNumber}</span></div>
      <div class="details-row"><span class="details-label">Return Due Date:</span><span class="details-value" style="color: #b45309; font-size: 15px;">${formatDate(booking.endDate)}</span></div>
      <div class="details-row"><span class="details-label">Return Location:</span><span class="details-value">${business?.address?.street || "Our Store Location"}</span></div>
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Please ensure all rented equipment, power supplies, cables, and packaging materials are intact prior to return. Returning gear on time helps ensure other scheduled events proceed smoothly.
    </p>
  `;

  return {
    subject: `Reminder: Equipment Return Due - ${booking.bookingNumber} | RentSphere`,
    html: renderBaseLayout({
      title: `Return Reminder - ${booking.bookingNumber}`,
      preheader: `Return reminder for booking ${booking.bookingNumber}.`,
      content,
      business,
    }),
  };
};

export const overdueRentalReminderTemplate = ({ booking, customer, business, overdueDays = 1 }) => {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #dc2626;">URGENT: Rental Equipment Overdue</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Hello ${customer?.name || "Customer"}, our records indicate that rented equipment for booking <strong>${booking.bookingNumber}</strong> has not yet been returned.
    </p>
    <div class="details-box" style="border-left: 4px solid #dc2626;">
      <div class="details-row"><span class="details-label">Booking Reference:</span><span class="details-value">${booking.bookingNumber}</span></div>
      <div class="details-row"><span class="details-label">Status:</span><span class="details-value"><span class="badge badge-warning" style="background-color: #fee2e2; color: #b91c1c;">Overdue</span></span></div>
      <div class="details-row"><span class="details-label">Scheduled Return Date:</span><span class="details-value" style="color: #dc2626; font-weight: 700;">${formatDate(booking.endDate)}</span></div>
      <div class="details-row"><span class="details-label">Days Overdue:</span><span class="details-value" style="color: #dc2626; font-weight: 700;">${overdueDays} day(s)</span></div>
      <div class="details-row"><span class="details-label">Return Location:</span><span class="details-value">${business?.address?.street || "Our Store Location"}</span></div>
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Please arrange for the immediate return of all equipment to prevent additional daily overdue charges or deductions from your security deposit. If you require a rental extension, contact our shop coordinator immediately.
    </p>
  `;

  return {
    subject: `Urgent: Rental Overdue - ${booking.bookingNumber} | RentSphere`,
    html: renderBaseLayout({
      title: `Overdue Rental Notice - ${booking.bookingNumber}`,
      preheader: `URGENT: Booking ${booking.bookingNumber} is overdue for return.`,
      content,
      business,
    }),
  };
};

export const rentalCompletedTemplate = ({ booking, customer, business }) => {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a;">Rental Successfully Completed</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Hello ${customer?.name || "Customer"}, all equipment for booking <strong>${booking.bookingNumber}</strong> has been returned and verified by our staff.
    </p>
    <div class="details-box">
      <div class="details-row"><span class="details-label">Booking Reference:</span><span class="details-value">${booking.bookingNumber}</span></div>
      <div class="details-row"><span class="details-label">Completion Status:</span><span class="details-value"><span class="badge badge-success">Completed</span></span></div>
      <div class="details-row"><span class="details-label">Completed On:</span><span class="details-value">${formatDate(new Date())}</span></div>
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Any refundable security deposits held for this booking will be processed and returned in accordance with our rental policy. Thank you for choosing RentSphere for your event!
    </p>
  `;

  return {
    subject: `Rental Completed - ${booking.bookingNumber} | RentSphere`,
    html: renderBaseLayout({
      title: `Rental Completed - ${booking.bookingNumber}`,
      preheader: `Rental ${booking.bookingNumber} completed successfully.`,
      content,
      business,
    }),
  };
};
