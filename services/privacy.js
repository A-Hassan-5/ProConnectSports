export function normalizeGovernmentId(value) {
  return (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function validateGovernmentId(value) {
  const normalized = normalizeGovernmentId(value);
  return normalized.length >= 8 && normalized.length <= 20;
}

export function maskGovernmentId(value) {
  const normalized = normalizeGovernmentId(value);
  if (!normalized) {
    return '';
  }
  const last4 = normalized.slice(-4);
  return `****${last4}`;
}
