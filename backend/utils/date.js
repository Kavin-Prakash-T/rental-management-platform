const TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const nowUTC = () => new Date();

export const parseISTDate = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d;
};

export const startOfDayIST = (dateInput = new Date()) => {
  const target = new Date(dateInput);
  const istDate = new Date(target.getTime() + IST_OFFSET_MS);

  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();

  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS);
};

export const endOfDayIST = (dateInput = new Date()) => {
  const target = new Date(dateInput);
  const istDate = new Date(target.getTime() + IST_OFFSET_MS);

  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();

  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - IST_OFFSET_MS);
};

export const formatDateIST = (dateInput, options = {}) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const defaultOptions = {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat("en-IN", defaultOptions).format(d);
};

export const formatDateTimeIST = (dateInput) => {
  return formatDateIST(dateInput, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

export const diffInDays = (startDate, endDate) => {
  const start = startOfDayIST(startDate);
  const end = startOfDayIST(endDate);
  const diffTime = end.getTime() - start.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, days === 0 ? 1 : days);
};

export const isDateOverlap = (startA, endA, startB, endB) => {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  return aStart <= bEnd && aEnd >= bStart;
};

export const isPastDate = (dateInput) => {
  const target = startOfDayIST(dateInput);
  const today = startOfDayIST(new Date());
  return target.getTime() < today.getTime();
};
