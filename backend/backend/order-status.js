const db = require('./db');

function latestShipmentStatus(orderId, vendorId) {
  const shipments = db
    .get('shipments')
    .filter({ orderId, vendorId })
    .value()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  if (!shipments.length) return 'confirmed';
  if (shipments.some(shipment => shipment.status === 'delivered')) return 'delivered';
  if (shipments.some(shipment => shipment.status === 'shipped')) return 'shipped';
  if (shipments.some(shipment => shipment.status === 'label_purchased' || shipment.status === 'pending')) return 'processing';
  return shipments[0].status || 'processing';
}

function deriveOrderStatus(order) {
  const vendorIds = [...new Set((order.items || []).map(item => item.vendorId))];
  if (!vendorIds.length) return order.status || 'confirmed';

  const statuses = vendorIds.map(vendorId => latestShipmentStatus(order.id, vendorId));

  if (statuses.every(status => status === 'delivered')) return 'delivered';
  if (statuses.every(status => status === 'shipped' || status === 'delivered')) return 'shipped';
  if (statuses.some(status => status === 'processing' || status === 'label_purchased' || status === 'pending')) return 'processing';
  return 'confirmed';
}

function refreshOrderStatus(orderId) {
  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return null;

  const status = deriveOrderStatus(order);
  db.get('orders').find({ id: orderId }).assign({ status, updatedAt: new Date().toISOString() }).write();
  return db.get('orders').find({ id: orderId }).value();
}

module.exports = { deriveOrderStatus, refreshOrderStatus };
