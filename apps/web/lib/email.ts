import { Resend } from 'resend';

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.EMAIL_FROM || 'NailHaus <orders@nailhaus.co>';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nailhaus.co';

export async function sendOrderConfirmation({
  to,
  buyerName,
  orderId,
  total,
  items,
}: {
  to: string;
  buyerName: string;
  orderId: string;
  total: number;
  items: Array<{ name: string; qty: number; price: number; size?: string }>;
}) {
  const resend = getResend();
  if (!resend) return;

  const itemRows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0e0eb;">${i.name}${i.size ? ` <span style="color:#9a4a7a;font-size:12px;">(${i.size})</span>` : ''}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0e0eb;text-align:center;">${i.qty}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0e0eb;text-align:right;">$${(i.price * i.qty).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your NailHaus order is confirmed 💅`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#2d1a2e;">
        <div style="background:linear-gradient(135deg,#fce4f5,#fde8e8);padding:32px 24px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">💅</div>
          <h1 style="margin:0;font-size:24px;color:#9a4a7a;">Order confirmed!</h1>
          <p style="margin:8px 0 0;color:#7a3a6a;font-size:14px;">Hi ${buyerName}, your nails are on their way.</p>
        </div>
        <div style="background:#fff;padding:28px 24px;border-radius:0 0 16px 16px;border:1px solid #f0e0eb;">
          <p style="color:#9a4a7a;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 16px;">Order #${orderId.slice(0, 8)}</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="color:#b07090;font-size:11px;text-transform:uppercase;letter-spacing:.06em;">
                <th style="text-align:left;padding-bottom:8px;">Item</th>
                <th style="text-align:center;padding-bottom:8px;">Qty</th>
                <th style="text-align:right;padding-bottom:8px;">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="margin-top:16px;text-align:right;font-size:18px;font-weight:700;color:#9a4a7a;">
            Total: $${total.toFixed(2)}
          </div>
          <div style="margin-top:24px;text-align:center;">
            <a href="${SITE}/orders" style="display:inline-block;background:#c45990;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;">View your order</a>
          </div>
          <p style="margin-top:24px;font-size:12px;color:#b07090;text-align:center;">Questions? Reply to this email and we'll help you out.</p>
        </div>
      </div>`,
  }).catch(() => {}); // never block the webhook
}

export async function sendRestockNotification({
  to,
  productName,
  productId,
}: {
  to: string;
  productName: string;
  productId: string;
}) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${productName} is back in stock! 💅`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#2d1a2e;">
        <div style="background:linear-gradient(135deg,#fce4f5,#fde8e8);padding:28px 24px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">💅</div>
          <h1 style="margin:0;font-size:22px;color:#9a4a7a;">Back in stock!</h1>
          <p style="margin:8px 0 0;color:#7a3a6a;font-size:14px;">Good news — <strong>${productName}</strong> is available again.</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;border:1px solid #f0e0eb;">
          <p style="color:#7a3a6a;font-size:14px;margin:0 0 20px;">Get it before it sells out again — these go fast!</p>
          <div style="text-align:center;">
            <a href="${SITE}/products/${productId}" style="display:inline-block;background:#c45990;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;">Shop now →</a>
          </div>
          <p style="margin-top:20px;font-size:11px;color:#b07090;text-align:center;">You're receiving this because you joined the waitlist for this product.</p>
        </div>
      </div>`,
  }).catch(() => {});
}

export async function sendShippedNotification({
  to,
  buyerName,
  orderId,
  trackingNumber,
  carrier,
  items,
}: {
  to: string;
  buyerName: string;
  orderId: string;
  trackingNumber?: string;
  carrier?: string;
  items: Array<{ name: string; qty: number; size?: string }>;
}) {
  const resend = getResend();
  if (!resend) return;

  function trackingUrl(carrier: string, tracking: string) {
    const c = carrier.toLowerCase();
    if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`;
    if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${tracking}`;
    if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${tracking}`;
    if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}`;
    return null;
  }

  const itemList = items.map((i) =>
    `<li style="padding:4px 0;">${i.qty}× ${i.name}${i.size ? ` <span style="color:#9a4a7a;font-size:12px;">(${i.size})</span>` : ''}</li>`
  ).join('');

  const trackingUrl_ = trackingNumber && carrier ? trackingUrl(carrier, trackingNumber) : null;
  const trackingBlock = trackingNumber
    ? `<div style="background:#fdf0f8;border-radius:10px;padding:16px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#b07090;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Tracking number</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#9a4a7a;">${carrier ? carrier + ' · ' : ''}${trackingNumber}</p>
        ${trackingUrl_ ? `<a href="${trackingUrl_}" style="display:inline-block;margin-top:12px;background:#c45990;color:#fff;text-decoration:none;padding:10px 24px;border-radius:999px;font-weight:700;font-size:13px;">Track package →</a>` : ''}
      </div>`
    : '';

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your NailHaus order has shipped! 📦`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#2d1a2e;">
        <div style="background:linear-gradient(135deg,#fce4f5,#fde8e8);padding:32px 24px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">📦</div>
          <h1 style="margin:0;font-size:24px;color:#9a4a7a;">Your order shipped!</h1>
          <p style="margin:8px 0 0;color:#7a3a6a;font-size:14px;">Hi ${buyerName}, your nails are on their way.</p>
        </div>
        <div style="background:#fff;padding:28px 24px;border-radius:0 0 16px 16px;border:1px solid #f0e0eb;">
          <p style="color:#9a4a7a;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px;">Order #${orderId.slice(0, 8)}</p>
          <ul style="margin:0 0 8px;padding:0 0 0 18px;font-size:14px;line-height:1.9;">${itemList}</ul>
          ${trackingBlock}
          <div style="margin-top:24px;text-align:center;">
            <a href="${SITE}/orders" style="display:inline-block;background:#c45990;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;">View your order</a>
          </div>
          <p style="margin-top:24px;font-size:12px;color:#b07090;text-align:center;">Questions? Reply to this email and we'll help you out.</p>
        </div>
      </div>`,
  }).catch(() => {});
}

export async function sendOrderCancelledNotification({
  to,
  buyerName,
  orderId,
}: {
  to: string;
  buyerName: string;
  orderId: string;
}) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your NailHaus order was cancelled`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#2d1a2e;">
        <div style="background:linear-gradient(135deg,#fce4f5,#fde8e8);padding:28px 24px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">💌</div>
          <h1 style="margin:0;font-size:22px;color:#9a4a7a;">Order cancelled</h1>
          <p style="margin:8px 0 0;color:#7a3a6a;font-size:14px;">Hi ${buyerName}, your order #${orderId.slice(0, 8)} was cancelled.</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;border:1px solid #f0e0eb;">
          <p style="font-size:14px;color:#7a3a6a;margin:0 0 20px;">No payment was collected. If you think this is a mistake or need help, just reply to this email.</p>
          <div style="text-align:center;">
            <a href="${SITE}/shop" style="display:inline-block;background:#c45990;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;">Shop again →</a>
          </div>
        </div>
      </div>`,
  }).catch(() => {});
}

export async function sendVendorNewOrderNotification({
  to,
  vendorName,
  orderId,
  items,
}: {
  to: string;
  vendorName: string;
  orderId: string;
  items: Array<{ name: string; qty: number }>;
}) {
  const resend = getResend();
  if (!resend) return;

  const itemList = items.map((i) => `<li>${i.qty}× ${i.name}</li>`).join('');

  await resend.emails.send({
    from: FROM,
    to,
    subject: `New order on NailHaus 🛍️`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#2d1a2e;">
        <div style="background:linear-gradient(135deg,#fce4f5,#fde8e8);padding:28px 24px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">🛍️</div>
          <h1 style="margin:0;font-size:22px;color:#9a4a7a;">You have a new order!</h1>
          <p style="margin:8px 0 0;color:#7a3a6a;font-size:14px;">Hi ${vendorName}, someone just bought from your shop.</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;border:1px solid #f0e0eb;">
          <p style="color:#9a4a7a;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px;">Order #${orderId.slice(0, 8)}</p>
          <ul style="margin:0 0 20px;padding:0 0 0 18px;font-size:14px;line-height:1.8;">${itemList}</ul>
          <div style="text-align:center;">
            <a href="${SITE}/dashboard/vendor" style="display:inline-block;background:#c45990;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;">View dashboard</a>
          </div>
        </div>
      </div>`,
  }).catch(() => {});
}
