const TOKEN = process.env.SHIPPO_TOKEN || '';

const API_BASE = 'https://api.goshippo.com';

function required(v, msg) {
  if (!v) throw new Error(msg);
  return v;
}

async function shippoRequest(path, { method = 'GET', body } = {}) {
  required(TOKEN, 'Shippo is not configured (missing SHIPPO_TOKEN)');

  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      Authorization: `ShippoToken ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg =
      data?.detail ||
      data?.message ||
      (Array.isArray(data?.__all__) ? data.__all__.join(', ') : null) ||
      (Array.isArray(data) ? data.map(x => x?.message || x?.detail).filter(Boolean).join(', ') : null) ||
      `Shippo request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function normalizeRates(rates) {
  return (rates || [])
    .filter(r => r && (r.object_id || r.id))
    .map(r => ({
      id: r.object_id || r.id,
      carrier: r.provider || r.carrier || '',
      servicelevel: r.servicelevel?.name || r.servicelevel?.token || r.servicelevel || '',
      amount: Number(r.amount || r.amount_local || 0),
      currency: r.currency || r.currency_local || 'USD',
      durationTerms: r.duration_terms || '',
      estimatedDays: r.estimated_days ?? null
    }))
    .sort((a, b) => (a.amount || 0) - (b.amount || 0));
}

function toShippoAddress(a) {
  required(a, 'Address is required');
  const out = {
    name: a.name || '',
    company: a.company || '',
    street1: a.street1 || a.address || '',
    street2: a.street2 || '',
    city: a.city || '',
    state: a.state || '',
    zip: a.zip || '',
    country: a.country || 'US',
    phone: a.phone || '',
    email: a.email || ''
  };
  required(out.street1, 'Address street is required');
  required(out.city, 'Address city is required');
  required(out.state, 'Address state is required');
  required(out.zip, 'Address zip is required');
  required(out.country, 'Address country is required');
  return out;
}

function toShippoParcel(p) {
  required(p, 'Parcel is required');
  const out = {
    length: String(p.length ?? ''),
    width: String(p.width ?? ''),
    height: String(p.height ?? ''),
    distance_unit: p.distance_unit || 'in',
    weight: String(p.weight ?? ''),
    mass_unit: p.mass_unit || 'oz'
  };
  required(out.length, 'Parcel length is required');
  required(out.width, 'Parcel width is required');
  required(out.height, 'Parcel height is required');
  required(out.weight, 'Parcel weight is required');
  return out;
}

async function getRatesForShipment({ fromAddress, toAddress, parcel }) {
  const body = {
    address_from: toShippoAddress(fromAddress),
    address_to: toShippoAddress(toAddress),
    parcels: [toShippoParcel(parcel)],
    async: false
  };

  const shipment = await shippoRequest('/shipments/', { method: 'POST', body });
  const rates = normalizeRates(shipment?.rates || []);
  if (!rates.length) throw new Error('No shipping rates available for this shipment');
  return { shipment, rates };
}

async function purchaseLabel({ rateId }) {
  required(rateId, 'rateId is required');
  const body = {
    rate: rateId,
    label_file_type: 'PDF',
    async: false
  };

  const tx = await shippoRequest('/transactions/', { method: 'POST', body });
  if (tx.status && tx.status !== 'SUCCESS') {
    const msgs = (tx.messages || []).map(m => m?.text).filter(Boolean).join(', ');
    throw new Error(msgs || 'Shippo transaction did not succeed');
  }

  return {
    transactionId: tx.object_id || tx.id,
    trackingNumber: tx.tracking_number || '',
    trackingUrlProvider: tx.tracking_url_provider || '',
    labelUrl: tx.label_url || '',
    carrier: tx.rate?.provider || '',
    servicelevel: tx.rate?.servicelevel?.name || tx.rate?.servicelevel?.token || '',
    amount: Number(tx.rate?.amount || 0),
    currency: tx.rate?.currency || 'USD'
  };
}

module.exports = { getRatesForShipment, purchaseLabel };

