import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PATH = process.env.NAILHAUS_DB_PATH || path.join(process.cwd(), 'backend', 'data', 'db.json');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

async function ensureAuthUsers(users) {
  const idMap = new Map();

  for (const user of users) {
    const email = String(user.email).toLowerCase();
    const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const match = existing.data?.users?.find((u) => u.email?.toLowerCase() === email);

    let authUser = match;
    if (!authUser) {
      const created = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { legacy_id: user.id },
      });
      if (created.error) throw created.error;
      authUser = created.data.user;
    }

    idMap.set(user.id, authUser.id);

    const profilePayload = {
      id: authUser.id,
      name: user.name,
      role: user.role || 'buyer',
      disabled: Boolean(user.disabled),
      created_at: user.createdAt || new Date().toISOString(),
    };

    const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
    if (profileError) throw profileError;
  }

  return idMap;
}

function vendorRow(vendor, userIdMap) {
  return {
    id: vendor.id,
    user_id: userIdMap.get(vendor.userId),
    name: vendor.name,
    tagline: vendor.tagline || '',
    description: vendor.description || '',
    emoji: vendor.emoji || '💅',
    bg_color: vendor.bgColor || '#fde8e8',
    tags: vendor.tags || [],
    verified: Boolean(vendor.verified),
    rating: vendor.rating || 0,
    total_sales: vendor.totalSales || 0,
    total_products: vendor.totalProducts || 0,
    social_links: vendor.socialLinks || {},
    announcement: vendor.announcement || '',
    collections: vendor.collections || [],
    shipping_profile: vendor.shippingProfile || null,
    created_at: vendor.createdAt || new Date().toISOString(),
  };
}

function productRow(product) {
  return {
    id: product.id,
    vendor_id: product.vendorId,
    name: product.name,
    description: product.description || '',
    price: product.price,
    original_price: product.originalPrice || null,
    emoji: product.emoji || '💅',
    bg_color: product.bgColor || '#fde8e8',
    shape: product.shape || 'almond',
    style: product.style || 'minimal',
    badge: product.badge || null,
    stock: product.stock || 0,
    tags: product.tags || [],
    availability: product.availability || 'in_stock',
    production_days: product.productionDays || null,
    occasions: product.occasions || [],
    collection_id: product.collectionId || null,
    nail_count: product.nailCount || null,
    sizes: product.sizes || '',
    finish: product.finish || '',
    glue_included: product.glueIncluded ?? null,
    reusable: product.reusable ?? null,
    wear_time: product.wearTime || '',
    hidden: Boolean(product.hidden),
    rating: product.rating || 0,
    review_count: product.reviewCount || 0,
    created_at: product.createdAt || new Date().toISOString(),
  };
}

function orderRow(order, userIdMap) {
  return {
    id: order.id,
    user_id: userIdMap.get(order.userId) || null,
    total: order.total,
    original_total: order.originalTotal || order.total,
    discount_id: order.discountId || null,
    discount_savings: order.discountSavings || 0,
    status: order.status || 'confirmed',
    shipping_address: order.shippingAddress || {},
    created_at: order.createdAt || new Date().toISOString(),
  };
}

function orderItemsRows(orders) {
  return orders.flatMap((order) =>
    (order.items || []).map((item) => ({
      id: `${order.id}_${item.productId}_${item.vendorId}`,
      order_id: order.id,
      product_id: item.productId,
      vendor_id: item.vendorId,
      qty: item.qty,
      price: item.price,
    }))
  );
}

function reviewRow(review, userIdMap) {
  return {
    id: review.id,
    user_id: userIdMap.get(review.userId) || null,
    product_id: review.productId,
    vendor_id: review.vendorId,
    rating: review.rating,
    title: review.title || '',
    body: review.body || '',
    helpful: review.helpful || 0,
    photo: review.photo || null,
    vendor_reply: review.vendorReply || null,
    vendor_reply_at: review.vendorReplyAt || null,
    created_at: review.createdAt || new Date().toISOString(),
  };
}

function shipmentRow(shipment, userIdMap) {
  return {
    id: shipment.id,
    order_id: shipment.orderId,
    vendor_id: shipment.vendorId,
    status: shipment.status || 'pending',
    shippo: shipment.shippo || {},
    created_at: shipment.createdAt || new Date().toISOString(),
  };
}

async function upsert(table, rows, onConflict = 'id') {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw error;
}

const main = async () => {
  const userIdMap = await ensureAuthUsers(raw.users || []);
  await upsert('vendors', (raw.vendors || []).map((v) => vendorRow(v, userIdMap)));
  await upsert('products', (raw.products || []).map(productRow));
  await upsert('orders', (raw.orders || []).map((o) => orderRow(o, userIdMap)));
  await upsert('order_items', orderItemsRows(raw.orders || []));
  await upsert('reviews', (raw.reviews || []).map((r) => reviewRow(r, userIdMap)));
  await upsert('shipments', (raw.shipments || []).map((s) => shipmentRow(s, userIdMap)));
  console.log('Seed complete');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
