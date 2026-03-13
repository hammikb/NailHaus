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
