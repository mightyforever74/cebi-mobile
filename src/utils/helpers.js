import i18n from "../locales/i18n";

// Date & Time helpers
const localeMap = {
  tr: "tr-TR",
  en: "en-GB",
  nl: "nl-NL",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  bg: "bg-BG",
  ku: "tr-TR",
};

const getDateLocale = () => {
  const lang = (i18n.language || "tr").split("-")[0];
  return localeMap[lang] || "en-GB";
};

export const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString(getDateLocale());
};

export const formatDateTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString(getDateLocale());
};

export const formatTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleTimeString(getDateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getTimeAgo = (date) => {
  if (!date) return "-";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1)
    return i18n.t("time.ago.years", { count: Math.floor(interval) });

  interval = seconds / 2592000;
  if (interval > 1)
    return i18n.t("time.ago.months", { count: Math.floor(interval) });

  interval = seconds / 86400;
  if (interval > 1)
    return i18n.t("time.ago.days", { count: Math.floor(interval) });

  interval = seconds / 3600;
  if (interval > 1)
    return i18n.t("time.ago.hours", { count: Math.floor(interval) });

  interval = seconds / 60;
  if (interval > 1)
    return i18n.t("time.ago.minutes", { count: Math.floor(interval) });

  return i18n.t("time.ago.seconds", { count: Math.floor(seconds) });
};

// Number helpers
export const formatNumber = (num) => {
  if (num === null || num === undefined) return "-";
  return num.toLocaleString("tr-TR");
};

export const formatCurrency = (amount, currency = "TRY") => {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

export const formatDistance = (meters) => {
  if (!meters) return "0 m";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatSpeed = (kmh) => {
  if (!kmh) return "0 km/h";
  return `${Math.round(kmh)} km/h`;
};

export const formatFuel = (liters) => {
  if (!liters) return "0 L";
  return `${liters.toFixed(1)} L`;
};

// String helpers
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str, length = 50) => {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
};

// Validation helpers
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidPhone = (phone) => {
  // Turkish phone number format
  const re = /^(\+90|0)?[5][0-9]{9}$/;
  return re.test(phone.replace(/\s/g, ""));
};

export const isValidPlate = (plate) => {
  // Turkish license plate format
  const re = /^(0[1-9]|[1-7][0-9]|8[01])[A-Z]{1,3}[0-9]{2,4}$/;
  return re.test(plate.replace(/\s/g, ""));
};

// Task status helpers
export const getTaskStatusColor = (status) => {
  const colors = {
    pending: "#FB6340", // warning/orange
    in_progress: "#11CDEF", // info/blue
    completed: "#2DCE89", // success/green
    cancelled: "#F5365C", // danger/red
  };
  return colors[status] || "#8898AA";
};

export const getTaskStatusText = (status) => {
  const texts = {
    pending: "Bekliyor",
    in_progress: "Devam Ediyor",
    completed: "Tamamlandı",
    cancelled: "İptal Edildi",
  };
  return texts[status] || status;
};

// Alert type helpers
export const getAlertTypeColor = (type) => {
  const colors = {
    harsh_brake: "#F5365C",
    harsh_acceleration: "#FB6340",
    speeding: "#F5365C",
    idle_too_long: "#FB6340",
    low_fuel: "#FB6340",
    maintenance_due: "#11CDEF",
  };
  return colors[type] || "#8898AA";
};

export const getAlertTypeText = (type) => {
  const texts = {
    harsh_brake: "Sert Fren",
    harsh_acceleration: "Sert Hızlanma",
    speeding: "Hız Limiti Aşımı",
    idle_too_long: "Uzun Rölanti",
    low_fuel: "Düşük Yakıt",
    maintenance_due: "Bakım Zamanı",
  };
  return texts[type] || type;
};

// Location helpers
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return in meters
};

const toRad = (degrees) => {
  return (degrees * Math.PI) / 180;
};

// Error handling
export const getErrorMessage = (error) => {
  if (error.response) {
    // Server responded with error
    return error.response.data?.message || "Sunucu hatası";
  } else if (error.request) {
    // Request made but no response
    return "Sunucuya ulaşılamıyor";
  } else {
    // Something else happened
    return error.message || "Bilinmeyen hata";
  }
};

// Debounce helper
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Deep clone
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Check empty object
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};
