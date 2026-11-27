import PDFDocument from "pdfkit";
import { formatINR } from "./currency.js";

const formatCurrency = (paise) => {
  return `Rs. ${formatINR(paise, false)}`;
};

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const generateInvoicePdfBuffer = async (invoice, qrBuffer = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc
        .fillColor("#1e293b")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(invoice.businessDetails?.name || "RentSphere Event Rentals", 40, 40);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#64748b")
        .text(invoice.businessDetails?.address?.street || "", 40, 65)
        .text(
          `${invoice.businessDetails?.address?.city || ""}, ${invoice.businessDetails?.address?.state || ""} ${invoice.businessDetails?.address?.pincode || ""}`.trim(),
          40,
          78
        )
        .text(`Phone: ${invoice.businessDetails?.phone || "N/A"} | Email: ${invoice.businessDetails?.email || "N/A"}`, 40, 91);

      if (invoice.businessDetails?.gstin) {
        doc.text(`GSTIN: ${invoice.businessDetails.gstin}`, 40, 104);
      }

      doc
        .fillColor("#0f172a")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("TAX INVOICE", 400, 40, { align: "right" });

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#334155")
        .text(`Invoice No: ${invoice.invoiceNumber}`, 400, 65, { align: "right" })
        .text(`Date of Issue: ${formatDate(invoice.createdAt || new Date())}`, 400, 78, { align: "right" })
        .text(`Status: ${(invoice.status || "issued").toUpperCase()}`, 400, 91, { align: "right" });

      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, 125).lineTo(555, 125).stroke();

      const billY = 135;
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("BILLED TO:", 40, billY);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#334155")
        .text(invoice.customer?.name || "", 40, billY + 15)
        .text(`Phone: ${invoice.customer?.phone || ""}`, 40, billY + 28);

      if (invoice.customer?.email) {
        doc.text(`Email: ${invoice.customer.email}`, 40, billY + 41);
      }

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("RENTAL PERIOD:", 350, billY);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#334155")
        .text(`From: ${formatDate(invoice.rentalPeriod?.startDate)}`, 350, billY + 15)
        .text(`To: ${formatDate(invoice.rentalPeriod?.endDate)}`, 350, billY + 28)
        .text(
          `Duration: ${invoice.rentalPeriod?.duration || 1} ${invoice.rentalPeriod?.rentalType === "hourly" ? "Hour(s)" : "Day(s)"}`,
          350,
          billY + 41
        );

      const tableTop = 205;
      doc
        .rect(40, tableTop, 515, 20)
        .fillColor("#f1f5f9")
        .fill();

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#1e293b")
        .text("Equipment Item", 45, tableTop + 5)
        .text("SKU", 220, tableTop + 5)
        .text("Qty", 320, tableTop + 5, { align: "right", width: 40 })
        .text("Rate", 380, tableTop + 5, { align: "right", width: 70 })
        .text("Subtotal", 470, tableTop + 5, { align: "right", width: 80 });

      let currentY = tableTop + 24;
      doc.font("Helvetica").fontSize(9);

      for (const item of invoice.items || []) {
        doc
          .fillColor("#1e293b")
          .text(item.name, 45, currentY, { width: 170 })
          .text(item.sku, 220, currentY, { width: 95 })
          .text(String(item.quantity), 320, currentY, { align: "right", width: 40 })
          .text(formatCurrency(item.appliedRate), 380, currentY, { align: "right", width: 70 })
          .text(formatCurrency(item.subtotal), 470, currentY, { align: "right", width: 80 });

        currentY += 18;
      }

      doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(40, currentY + 5).lineTo(555, currentY + 5).stroke();
      currentY += 15;

      const summaryX = 350;
      const valueX = 470;
      const valWidth = 80;

      const drawRow = (label, amount, isBold = false) => {
        doc
          .font(isBold ? "Helvetica-Bold" : "Helvetica")
          .fillColor("#1e293b")
          .fontSize(9)
          .text(label, summaryX, currentY, { width: 120 })
          .text(formatCurrency(amount), valueX, currentY, { align: "right", width: valWidth });
        currentY += 14;
      };

      drawRow("Equipment Subtotal:", invoice.pricing?.equipmentSubtotal || 0);

      if (invoice.pricing?.discount > 0) {
        drawRow("Discount:", -(invoice.pricing.discount || 0));
      }

      drawRow("Taxable Amount:", invoice.pricing?.taxableAmount || 0);

      if (invoice.pricing?.tax?.totalTax > 0) {
        drawRow(`GST (${invoice.pricing.tax.rate || 18}%):`, invoice.pricing.tax.totalTax);
      }

      if (invoice.pricing?.transportation?.arrangementFee > 0) {
        drawRow("Transport Fee (Shop):", invoice.pricing.transportation.arrangementFee);
      }

      if (invoice.pricing?.transportation?.passThroughCost > 0) {
        drawRow("Transport Pass-Through:", invoice.pricing.transportation.passThroughCost);
      }

      if (invoice.pricing?.refundableDeposit > 0) {
        drawRow("Refundable Deposit:", invoice.pricing.refundableDeposit);
      }

      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(summaryX, currentY).lineTo(555, currentY).stroke();
      currentY += 5;

      drawRow("Total Invoice Amount:", invoice.pricing?.totalInvoiceAmount || 0, true);

      if (invoice.pricing?.totalPaid > 0) {
        drawRow("Total Paid / Advances:", invoice.pricing.totalPaid);
      }

      drawRow("Net Balance Due:", invoice.pricing?.outstandingBalance || 0, true);

      if (qrBuffer) {
        const qrY = Math.max(currentY + 15, 600);
        doc.image(qrBuffer, 40, qrY, { width: 100 });
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor("#0f172a")
          .text("SCAN TO PAY VIA UPI", 150, qrY + 15)
          .font("Helvetica")
          .fillColor("#64748b")
          .text(`UPI ID: ${invoice.businessDetails?.upiId || "N/A"}`, 150, qrY + 30)
          .text(`Payable: ${formatCurrency(invoice.pricing?.outstandingBalance || invoice.pricing?.totalInvoiceAmount || 0)}`, 150, qrY + 42)
          .text("Scan using Google Pay, PhonePe, Paytm or any UPI app.", 150, qrY + 54);
      }

      const footerY = 760;
      doc
        .strokeColor("#e2e8f0")
        .lineWidth(1)
        .moveTo(40, footerY)
        .lineTo(555, footerY)
        .stroke();

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#94a3b8")
        .text(
          "Thank you for your business. Refundable deposits are refunded upon physical equipment inspection and verification.",
          40,
          footerY + 10,
          { align: "center", width: 515 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
