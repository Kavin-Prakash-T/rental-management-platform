export const rupeesToPaise = (rupees) => {
  if (rupees === null || rupees === undefined || isNaN(Number(rupees))) {
    return 0;
  }
  return Math.round(Number(rupees) * 100);
};

export const paiseToRupees = (paise) => {
  if (paise === null || paise === undefined || isNaN(Number(paise))) {
    return 0;
  }
  return Number((Number(paise) / 100).toFixed(2));
};

export const formatINR = (paise, includeSymbol = true) => {
  const rupees = paiseToRupees(paise);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);

  return includeSymbol ? `₹${formatted}` : formatted;
};

export const addPaise = (...amounts) => {
  return amounts.reduce((total, amount) => total + (Number(amount) || 0), 0);
};

export const subtractPaise = (base, ...deductions) => {
  return deductions.reduce((total, deduction) => total - (Number(deduction) || 0), Number(base) || 0);
};
