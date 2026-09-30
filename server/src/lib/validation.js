export function isValidUUID(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidEmail(value) {
  if (typeof value !== "string") {
    return false;
  }

  const email = value.trim();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidMoney(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return false;
  }

  return /^\d+(\.\d{1,4})?$/.test(String(value));
}

export function isPositiveMoney(value) {
  if (!isValidMoney(value)) {
    return false;
  }

  return Number(value) > 0;
}

export function isValidCurrencyCode(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /^[A-Z]{3}$/.test(value);
}

export function isValidDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.valueOf())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}