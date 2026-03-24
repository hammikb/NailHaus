'use client';

export type SavedShippingAddress = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export const SHIPPING_ADDRESS_KEY = 'nh_shipping_address';

export const EMPTY_SAVED_SHIPPING_ADDRESS: SavedShippingAddress = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
};

function normalizeAddress(input?: Partial<SavedShippingAddress> | null): SavedShippingAddress {
  return {
    name: String(input?.name || '').trim(),
    line1: String(input?.line1 || '').trim(),
    line2: String(input?.line2 || '').trim(),
    city: String(input?.city || '').trim(),
    state: String(input?.state || '').trim(),
    postal_code: String(input?.postal_code || '').trim(),
    country: String(input?.country || 'US').trim() || 'US',
  };
}

export function readSavedShippingAddress(): SavedShippingAddress | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(SHIPPING_ADDRESS_KEY);
    if (!raw) return null;
    return normalizeAddress(JSON.parse(raw) as Partial<SavedShippingAddress>);
  } catch {
    return null;
  }
}

export function saveShippingAddress(address: Partial<SavedShippingAddress>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHIPPING_ADDRESS_KEY, JSON.stringify(normalizeAddress(address)));
}

export function clearSavedShippingAddress() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SHIPPING_ADDRESS_KEY);
}

export function hasAddressValue(address: Partial<SavedShippingAddress> | null | undefined) {
  if (!address) return false;
  return ['name', 'line1', 'city', 'state', 'postal_code']
    .some((key) => Boolean(String(address[key as keyof SavedShippingAddress] || '').trim()));
}

export function sameShippingAddress(a: Partial<SavedShippingAddress> | null | undefined, b: Partial<SavedShippingAddress> | null | undefined) {
  const left = normalizeAddress(a);
  const right = normalizeAddress(b);

  return (
    left.name === right.name &&
    left.line1 === right.line1 &&
    left.line2 === right.line2 &&
    left.city === right.city &&
    left.state === right.state &&
    left.postal_code === right.postal_code &&
    left.country === right.country
  );
}
