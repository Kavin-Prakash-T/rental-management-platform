import QRCode from "qrcode";

export const buildUpiUri = ({ upiId, displayName, amountPaise, note }) => {
  const amountRupees = (amountPaise / 100).toFixed(2);
  const cleanId = encodeURIComponent(upiId);
  const cleanName = encodeURIComponent(displayName || "RentSphere");
  const cleanNote = encodeURIComponent(note || "Rental Payment");

  return `upi://pay?pa=${cleanId}&pn=${cleanName}&am=${amountRupees}&cu=INR&tn=${cleanNote}`;
};

export const generateUpiQrDataUrl = async (upiUri) => {
  return await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 250,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
};

export const generateUpiQrBuffer = async (upiUri) => {
  return await QRCode.toBuffer(upiUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 200,
    type: "png",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
};
