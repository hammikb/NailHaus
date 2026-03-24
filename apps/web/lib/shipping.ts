import { supabaseAdmin } from './route-helpers';

export const LABEL_MARKUP = 1.0;

export type ShippingAddress = {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type ParcelPreset = {
  id: 'slim_mailer' | 'standard_mailer' | 'bundle_box' | 'large_bundle_box';
  label: string;
  length: number;
  width: number;
  height: number;
  weightOz: number;
};

export type VendorShippingQuote = {
  vendorId: string;
  vendorName: string;
  totalQty: number;
  parcelPreset: ParcelPreset['id'];
  parcel: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  carrier: string;
  service: string;
  carrierCost: number;
  priceCharged: number;
  deliveryDays: number | null;
  deliveryDate: string | null;
};

export type CheckoutShippingQuote = {
  totalCarrierCost: number;
  totalPriceCharged: number;
  labelCount: number;
  vendors: VendorShippingQuote[];
};

type EasyPostRate = {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  delivery_days?: number | null;
  delivery_date?: string | null;
};

type QuoteVendorInput = {
  vendorId: string;
  vendorName: string;
  fromAddress: Record<string, string>;
  totalQty: number;
};

const PRESS_ON_NAIL_PRESETS: ParcelPreset[] = [
  { id: 'slim_mailer', label: 'Slim mailer', length: 6, width: 4, height: 1, weightOz: 2 },
  { id: 'standard_mailer', label: 'Standard mailer', length: 8, width: 6, height: 1, weightOz: 4 },
  { id: 'bundle_box', label: 'Bundle box', length: 9, width: 6, height: 2, weightOz: 8 },
  { id: 'large_bundle_box', label: 'Large bundle box', length: 10, width: 8, height: 3, weightOz: 12 },
];

export function normalizeShippingAddress(value: unknown): ShippingAddress {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    name: String(source.name || '').trim() || undefined,
    line1: String(source.line1 || source.street1 || '').trim(),
    line2: String(source.line2 || source.street2 || '').trim() || undefined,
    city: String(source.city || '').trim(),
    state: String(source.state || '').trim(),
    postal_code: String(source.postal_code || source.zip || '').trim(),
    country: String(source.country || 'US').trim().toUpperCase(),
  };
}

export function isCompleteShippingAddress(address: ShippingAddress) {
  return Boolean(address.line1 && address.city && address.state && address.postal_code && address.country);
}

export function getPressOnNailParcel(totalQty: number): ParcelPreset {
  if (totalQty <= 1) return PRESS_ON_NAIL_PRESETS[0];
  if (totalQty <= 3) return PRESS_ON_NAIL_PRESETS[1];
  if (totalQty <= 6) return PRESS_ON_NAIL_PRESETS[2];
  return PRESS_ON_NAIL_PRESETS[3];
}

function getEasyPostApiKey() {
  const apiKey = process.env.EASYPOST_API_KEY;
  if (!apiKey) throw new Error('EASYPOST_API_KEY not configured');
  return apiKey;
}

function toAuthHeader(apiKey: string) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

function formatRate(rate: EasyPostRate) {
  const carrierCost = Number(rate.rate);
  return {
    rateId: rate.id,
    carrier: rate.carrier,
    service: rate.service,
    carrierCost,
    price: Math.round((carrierCost + LABEL_MARKUP) * 100) / 100,
    deliveryDays: rate.delivery_days ?? null,
    deliveryDate: rate.delivery_date ?? null,
  };
}

function choosePreferredRate(rates: Array<ReturnType<typeof formatRate>>) {
  return [...rates].sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price;
    return (a.deliveryDays ?? Number.POSITIVE_INFINITY) - (b.deliveryDays ?? Number.POSITIVE_INFINITY);
  })[0] ?? null;
}

export async function createEasyPostShipment(input: {
  fromAddress: Record<string, string>;
  toAddress: ShippingAddress;
  parcel: ParcelPreset;
}) {
  const apiKey = getEasyPostApiKey();
  const response = await fetch('https://api.easypost.com/v2/shipments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: toAuthHeader(apiKey),
    },
    body: JSON.stringify({
      shipment: {
        from_address: {
          name: input.fromAddress.name || 'Vendor',
          street1: input.fromAddress.street1,
          street2: input.fromAddress.street2 || '',
          city: input.fromAddress.city,
          state: input.fromAddress.state,
          zip: input.fromAddress.zip,
          country: input.fromAddress.country || 'US',
        },
        to_address: {
          name: input.toAddress.name || 'Customer',
          street1: input.toAddress.line1,
          street2: input.toAddress.line2 || '',
          city: input.toAddress.city,
          state: input.toAddress.state,
          zip: input.toAddress.postal_code,
          country: input.toAddress.country || 'US',
        },
        parcel: {
          length: input.parcel.length,
          width: input.parcel.width,
          height: input.parcel.height,
          weight: input.parcel.weightOz,
        },
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = (payload as { error?: { message?: string } })?.error?.message || 'Could not get shipping rates';
    throw new Error(message);
  }

  return response.json();
}

export async function buildCheckoutShippingQuote(vendors: QuoteVendorInput[], toAddress: ShippingAddress): Promise<CheckoutShippingQuote> {
  if (!vendors.length) throw new Error('No shippable items provided');
  if (!isCompleteShippingAddress(toAddress)) throw new Error('Complete shipping address required');

  const vendorQuotes = await Promise.all(
    vendors.map(async (vendor) => {
      if (!vendor.fromAddress?.street1 || !vendor.fromAddress?.city || !vendor.fromAddress?.state || !vendor.fromAddress?.zip) {
        throw new Error(`${vendor.vendorName || 'A vendor'} is not ready for shipping yet`);
      }

      const parcel = getPressOnNailParcel(vendor.totalQty);
      const shipment = await createEasyPostShipment({
        fromAddress: vendor.fromAddress,
        toAddress,
        parcel,
      });

      const rates = (((shipment as { rates?: EasyPostRate[] }).rates) || [])
        .filter((rate) => rate?.rate)
        .map(formatRate);

      const selectedRate = choosePreferredRate(rates);
      if (!selectedRate) throw new Error(`No shipping rates available for ${vendor.vendorName}`);

      return {
        vendorId: vendor.vendorId,
        vendorName: vendor.vendorName,
        totalQty: vendor.totalQty,
        parcelPreset: parcel.id,
        parcel: {
          length: parcel.length,
          width: parcel.width,
          height: parcel.height,
          weight: parcel.weightOz,
        },
        carrier: selectedRate.carrier,
        service: selectedRate.service,
        carrierCost: selectedRate.carrierCost,
        priceCharged: selectedRate.price,
        deliveryDays: selectedRate.deliveryDays,
        deliveryDate: selectedRate.deliveryDate,
      } satisfies VendorShippingQuote;
    })
  );

  return {
    totalCarrierCost: vendorQuotes.reduce((sum, quote) => sum + quote.carrierCost, 0),
    totalPriceCharged: Math.round(vendorQuotes.reduce((sum, quote) => sum + quote.priceCharged, 0) * 100) / 100,
    labelCount: vendorQuotes.length,
    vendors: vendorQuotes,
  };
}

export async function loadShippingVendorsForCheckout(items: Array<{ productId: string; qty: number }>) {
  const vendorMap = new Map<string, QuoteVendorInput>();

  for (const item of items) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, vendor_id, hidden, vendors!vendor_id(id, name, ship_from_address)')
      .eq('id', item.productId)
      .single();

    if (!product || product.hidden) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    const joinedVendor = Array.isArray(product.vendors) ? product.vendors[0] : product.vendors;
    const vendor = (joinedVendor && typeof joinedVendor === 'object' ? joinedVendor : null) as
      | { id: string; name: string; ship_from_address: Record<string, string> | null }
      | null;

    if (!vendor) throw new Error('Vendor shipping profile missing');

    const existing = vendorMap.get(vendor.id);
    if (existing) {
      existing.totalQty += Math.max(1, item.qty || 1);
      continue;
    }

    vendorMap.set(vendor.id, {
      vendorId: vendor.id,
      vendorName: vendor.name || 'Vendor',
      fromAddress: vendor.ship_from_address || {},
      totalQty: Math.max(1, item.qty || 1),
    });
  }

  return Array.from(vendorMap.values());
}

export function getVendorQuoteFromShippingAddress(
  shippingAddress: Record<string, unknown> | null | undefined,
  vendorId: string
) {
  const quote = shippingAddress?._shippingQuote;
  if (!quote || typeof quote !== 'object') return null;

  const vendors = (quote as { vendors?: unknown }).vendors;
  if (!Array.isArray(vendors)) return null;

  return (
    vendors.find(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        String((entry as { vendorId?: string }).vendorId || '') === vendorId
    ) as VendorShippingQuote | undefined
  ) || null;
}
