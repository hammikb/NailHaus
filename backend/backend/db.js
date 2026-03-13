const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const adapter = new FileSync(path.join(__dirname, '../data/db.json'));
const db = low(adapter);

db.defaults({
  users: [],
  vendors: [],
  products: [],
  reviews: [],
  orders: [],
  shipments: [],
  reports: [],
  vendorVerificationRequests: [],
  adminAudit: [],
  discounts: [],
  restockAlerts: [],
  disputes: [],
  meta: { adminBootstrappedAt: null }
}).write();

function migrate() {
  // Ensure meta exists for bootstrap state
  if (!db.get('meta').value()) {
    db.set('meta', { adminBootstrappedAt: null }).write();
  }

  // Ensure user disabled flag exists
  const users = db.get('users').value();
  let usersChanged = false;
  users.forEach(u => {
    if (u.disabled === undefined) { u.disabled = false; usersChanged = true; }
    if (!u.role) { u.role = 'buyer'; usersChanged = true; }
  });
  if (usersChanged) db.set('users', users).write();

  // Ensure product moderation flag exists
  const products = db.get('products').value();
  let prodChanged = false;
  products.forEach(p => {
    if (p.hidden === undefined) { p.hidden = false; prodChanged = true; }
  });
  if (prodChanged) db.set('products', products).write();

  // Ensure every vendor has a shipping profile (ship-from + defaults)
  const vendors = db.get('vendors').value();
  let changed = false;

  vendors.forEach(v => {
    if (!v.shippingProfile) {
      changed = true;
      v.shippingProfile = {
        shipFrom: {
          name: v.name,
          company: v.name,
          street1: '',
          street2: '',
          city: '',
          state: '',
          zip: '',
          country: 'US',
          phone: '',
          email: ''
        },
        parcels: [
          { id: 'padded_mailer', label: 'Padded mailer (6x9 in)', length: 9, width: 6, height: 0.5, distance_unit: 'in', weight: 3, mass_unit: 'oz' },
          { id: 'small_box',     label: 'Small box (6x4x2 in)',   length: 6, width: 4, height: 2,   distance_unit: 'in', weight: 6, mass_unit: 'oz' }
        ],
        defaultParcelId: 'padded_mailer',
        preferences: {
          carrier: '',
          servicelevel: ''
        }
      };
    }
  });

  if (changed) {
    db.set('vendors', vendors).write();
  }

  // Seed sample shipments for the demo data if none exist yet
  if (db.get('shipments').size().value() === 0 && db.get('orders').size().value() > 0) {
    const orders = db.get('orders').value();
    const shipments = [];
    const now = new Date().toISOString();

    const mk = ({ id, orderId, vendorId, userId, itemRefs, status, shippo }) => ({
      id,
      orderId,
      vendorId,
      userId,
      itemRefs,
      fromAddress: null,
      toAddress: null,
      status,
      shippo: shippo || null,
      createdAt: now,
      updatedAt: now,
      shippedAt: status === 'shipped' || status === 'delivered' ? now : null,
      deliveredAt: status === 'delivered' ? now : null
    });

    const o1 = orders.find(o => o.id === 'o1');
    if (o1) {
      shipments.push(mk({
        id: 's1',
        orderId: o1.id,
        vendorId: 'v1',
        userId: o1.userId,
        itemRefs: o1.items.filter(i => i.vendorId === 'v1').map(i => ({ productId: i.productId, qty: i.qty })),
        status: 'delivered',
        shippo: { carrier: 'USPS', servicelevel: 'Ground Advantage', trackingNumber: '9400DEMO111111111111', trackingUrlProvider: '', labelUrl: '' }
      }));
      shipments.push(mk({
        id: 's2',
        orderId: o1.id,
        vendorId: 'v4',
        userId: o1.userId,
        itemRefs: o1.items.filter(i => i.vendorId === 'v4').map(i => ({ productId: i.productId, qty: i.qty })),
        status: 'delivered',
        shippo: { carrier: 'USPS', servicelevel: 'Ground Advantage', trackingNumber: '9400DEMO222222222222', trackingUrlProvider: '', labelUrl: '' }
      }));
    }

    const o2 = orders.find(o => o.id === 'o2');
    if (o2) {
      shipments.push(mk({
        id: 's3',
        orderId: o2.id,
        vendorId: 'v5',
        userId: o2.userId,
        itemRefs: o2.items.filter(i => i.vendorId === 'v5').map(i => ({ productId: i.productId, qty: i.qty })),
        status: 'shipped',
        shippo: { carrier: 'USPS', servicelevel: 'Priority', trackingNumber: '9400DEMO333333333333', trackingUrlProvider: '', labelUrl: '' }
      }));
    }

    const o3 = orders.find(o => o.id === 'o3');
    if (o3) {
      shipments.push(mk({
        id: 's4',
        orderId: o3.id,
        vendorId: 'v2',
        userId: o3.userId,
        itemRefs: o3.items.filter(i => i.vendorId === 'v2').map(i => ({ productId: i.productId, qty: i.qty })),
        status: 'pending'
      }));
    }

    if (shipments.length) db.get('shipments').push(...shipments).write();
  }
}

function seed() {
  const shouldSeedDemoData = (() => {
    if ((process.env.ALLOW_DEMO_SEED || '').toLowerCase() === 'true') return true;
    return process.env.NODE_ENV !== 'production';
  })();

  if (!shouldSeedDemoData) return;
  if (db.get('vendors').size().value() > 0) return;

  const pw = bcrypt.hashSync('password123', 10);
  const users = [
    { id: 'u1', name: 'Sofia Reyes',   email: 'sofia@petalpressstudio.com', password: pw, role: 'vendor', createdAt: new Date().toISOString() },
    { id: 'u2', name: 'Jasmine Wu',    email: 'jasmine@luxeglamco.com',      password: pw, role: 'vendor', createdAt: new Date().toISOString() },
    { id: 'u3', name: 'Maya Torres',   email: 'maya@shoreshine.com',         password: pw, role: 'vendor', createdAt: new Date().toISOString() },
    { id: 'u4', name: 'Chloe Kim',     email: 'chloe@kawaiiklaws.com',       password: pw, role: 'vendor', createdAt: new Date().toISOString() },
    { id: 'u5', name: 'Amara Osei',    email: 'amara@bloomblossom.com',      password: pw, role: 'vendor', createdAt: new Date().toISOString() },
    { id: 'u6', name: 'Mia Rodriguez', email: 'mia@example.com',             password: pw, role: 'buyer',  createdAt: new Date().toISOString() },
    { id: 'u7', name: 'Jordan Taylor', email: 'jordan@example.com',          password: pw, role: 'buyer',  createdAt: new Date().toISOString() },
  ];
  db.get('users').push(...users).write();

  const vendors = [
    { id: 'v1', userId: 'u1', name: 'PetalPress Studio', tagline: 'Handpainted florals & botanicals', description: 'We specialize in delicate, hand-painted botanical designs. Every set is made to order with love and lasting adhesive included.', emoji: '🌸', bgColor: '#fde8e8', tags: ['floral','botanical','handmade'], verified: true, rating: 4.9, totalSales: 2400, totalProducts: 47, createdAt: new Date().toISOString() },
    { id: 'v2', userId: 'u2', name: 'LuxeGlam Co.',      tagline: 'Chrome, glitter & statement nails',   description: 'Luxury press-ons for those who refuse to blend in. Chrome finishes, bold shapes, gallery-worthy designs.', emoji: '✨', bgColor: '#ede8fd', tags: ['glam','chrome','bold'], verified: true, rating: 5.0, totalSales: 1800, totalProducts: 31, createdAt: new Date().toISOString() },
    { id: 'v3', userId: 'u3', name: 'Shore & Shine',     tagline: 'Coastal minimalism & soft hues',      description: 'Inspired by ocean mornings and sandy beaches. Clean shapes, soft gradients, effortless wear.', emoji: '🐚', bgColor: '#e8f0fd', tags: ['minimal','coastal','ombre'], verified: true, rating: 4.7, totalSales: 980,  totalProducts: 28, createdAt: new Date().toISOString() },
    { id: 'v4', userId: 'u4', name: 'Kawaii Klaws',      tagline: 'Cute, Y2K & playful designs',         description: 'Everything cute, colorful, and whimsical. From strawberry milk to bunny ears — if it sparks joy, we make it.', emoji: '🍓', bgColor: '#fde8f0', tags: ['cute','y2k','kawaii'], verified: true, rating: 4.8, totalSales: 3100, totalProducts: 62, createdAt: new Date().toISOString() },
    { id: 'v5', userId: 'u5', name: 'Bloom & Blossom',   tagline: '3D sculptural & handmade nail art',   description: 'Each set is a wearable sculpture. Premium gel and hand-sculpted 3D elements — no two sets alike.', emoji: '🌺', bgColor: '#fde8f5', tags: ['3d','sculptural','handmade'], verified: true, rating: 4.9, totalSales: 740,  totalProducts: 19, createdAt: new Date().toISOString() },
  ];
  db.get('vendors').push(...vendors).write();

  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const products = [
    { id: 'p1',  vendorId: 'v1', name: 'Rosé Bloom Almond Set',     description: 'Hand-painted floral details on a sheer nude base. Delicate rose motifs on accent nails, glossy finish throughout. 24 nails in 12 sizes, glue included.', price: 28, originalPrice: null, emoji: '🌸', bgColor: '#fde8e8', shape: 'almond',   style: 'floral',  badge: 'hot',  rating: 4.9, reviewCount: 312, stock: 24, tags: ['floral','nude','elegant'], createdAt: daysAgo(5) },
    { id: 'p2',  vendorId: 'v3', name: 'Coastal Mist Coffin',        description: 'Dreamy ocean-inspired ombre from white to sky blue. Coffin shape, medium length. Nail file, glue, and prep pad included.', price: 22, originalPrice: null, emoji: '🐚', bgColor: '#e8f0fd', shape: 'coffin',   style: 'minimal', badge: 'new',  rating: 4.7, reviewCount: 198, stock: 18, tags: ['ombre','blue','summer'],  createdAt: daysAgo(2) },
    { id: 'p3',  vendorId: 'v2', name: 'Midnight Stiletto Chrome',   description: 'High-shine mirror chrome on deep navy. Ultra-pointed stiletto for maximum drama. Statement nails for the bold.', price: 35, originalPrice: 42,   emoji: '✨', bgColor: '#ede8fd', shape: 'stiletto', style: 'glam',    badge: 'sale', rating: 5.0, reviewCount:  87, stock: 12, tags: ['chrome','navy','statement'], createdAt: daysAgo(10) },
    { id: 'p4',  vendorId: 'v4', name: 'Strawberry Milk Square',     description: 'Milky pink base with strawberry charm accents on ring fingers. Lightweight and comfortable for everyday wear.', price: 18, originalPrice: null, emoji: '🍓', bgColor: '#fde8f0', shape: 'square',   style: 'cute',    badge: 'hot',  rating: 4.8, reviewCount: 441, stock: 35, tags: ['pink','cute','everyday'],  createdAt: daysAgo(3) },
    { id: 'p5',  vendorId: 'v1', name: 'Butter Yellow Almond',       description: 'Soft butter yellow with a high-gloss finish. Clean, feminine, incredibly wearable. Perfect for spring and summer.', price: 24, originalPrice: null, emoji: '🌼', bgColor: '#fdfde8', shape: 'almond',   style: 'minimal', badge: 'new',  rating: 4.6, reviewCount: 156, stock: 20, tags: ['yellow','spring','minimal'], createdAt: daysAgo(1) },
    { id: 'p6',  vendorId: 'v5', name: '3D Floral Round Tips',        description: 'Sculptural 3D flowers hand-placed on soft white. Made to order — allow 3-5 days. No two sets exactly alike.', price: 32, originalPrice: null, emoji: '🌺', bgColor: '#fde8f5', shape: 'round',    style: 'floral',  badge: 'hot',  rating: 4.9, reviewCount: 223, stock: 8,  tags: ['3d','white','sculptural'], createdAt: daysAgo(4) },
    { id: 'p7',  vendorId: 'v2', name: 'Glass Coffin Nails',          description: 'Ultra-transparent gel-style press-ons with a crystal-clear finish. Minimalist luxury. Compatible with nail art overlays.', price: 29, originalPrice: null, emoji: '💎', bgColor: '#e8fdf5', shape: 'coffin',   style: 'glam',    badge: null,   rating: 4.8, reviewCount: 189, stock: 22, tags: ['clear','minimal','gel'],   createdAt: daysAgo(8) },
    { id: 'p8',  vendorId: 'v5', name: 'Cherry Blossom Stiletto',    description: 'Delicate pink blossoms hand-applied to each nail. Sizing kit and removal wraps included. Wearable art for special occasions.', price: 34, originalPrice: 40,   emoji: '🌷', bgColor: '#fde8e8', shape: 'stiletto', style: 'floral',  badge: 'sale', rating: 4.7, reviewCount:  94, stock: 10, tags: ['pink','floral','special'], createdAt: daysAgo(7) },
    { id: 'p9',  vendorId: 'v4', name: 'Cloud Nine Square Set',       description: 'Soft lilac and white cloud motifs on a dreamy pastel base. Short square for comfort. Adorable everyday wear.', price: 20, originalPrice: null, emoji: '☁️', bgColor: '#ede8fd', shape: 'square',   style: 'cute',    badge: 'new',  rating: 4.7, reviewCount:  67, stock: 28, tags: ['purple','clouds','pastel'], createdAt: daysAgo(2) },
    { id: 'p10', vendorId: 'v3', name: 'Sand Dune Almond',            description: 'Warm beige ombre with a matte finish. Effortlessly chic, understated. Long almond shape — goes with everything.', price: 26, originalPrice: null, emoji: '🏖️', bgColor: '#f5ead4', shape: 'almond',   style: 'minimal', badge: null,   rating: 4.5, reviewCount: 134, stock: 16, tags: ['beige','matte','neutral'], createdAt: daysAgo(12) },
    { id: 'p11', vendorId: 'v2', name: 'Rose Gold Chrome Coffin',     description: 'Warm rose gold mirror chrome on a medium coffin shape. Catches light beautifully. Our most-complimented set.', price: 38, originalPrice: null, emoji: '🌹', bgColor: '#fde8e8', shape: 'coffin',   style: 'glam',    badge: 'hot',  rating: 5.0, reviewCount: 276, stock: 14, tags: ['rose gold','chrome','coffin'], createdAt: daysAgo(6) },
    { id: 'p12', vendorId: 'v1', name: 'Lavender Dreams Round',       description: 'Soft lavender base with tiny white floral accents. Short round — perfect for beginners. Includes detailed application guide.', price: 19, originalPrice: null, emoji: '💜', bgColor: '#ede8fd', shape: 'round',    style: 'floral',  badge: null,   rating: 4.6, reviewCount:  88, stock: 30, tags: ['lavender','floral','beginner'], createdAt: daysAgo(9) },
  ];
  db.get('products').push(...products).write();

  const avatars = ['👩🏻','👩🏼','👩🏽','👩🏾','🧑🏻','🧑🏽'];
  const reviewData = [
    { pid: 'p1',  vid: 'v1', uid: 'u6', rating: 5, title: 'Absolutely obsessed!',          body: 'These lasted two full weeks without a single chip. The floral details are so delicate — I\'ve gotten so many compliments. Will 100% reorder.' },
    { pid: 'p3',  vid: 'v2', uid: 'u7', rating: 5, title: 'Chrome finish is STUNNING',      body: 'Easy to apply with the guide included. The navy and chrome combo is next level. Already bought two more sets.' },
    { pid: 'p4',  vid: 'v4', uid: 'u6', rating: 5, title: 'So cute!! Love these',           body: 'The strawberry charms didn\'t fall off even after a week of daily wear. Super lightweight, barely notice them on.' },
    { pid: 'p6',  vid: 'v5', uid: 'u7', rating: 5, title: 'Wearable art, worth every penny', body: 'I was nervous about 3D nails snagging but these are perfectly balanced. The flowers look so real. Bought as a gift too.' },
    { pid: 'p5',  vid: 'v1', uid: 'u7', rating: 4, title: 'Great everyday set',              body: 'Color is exactly as pictured — that perfect creamy yellow. Took a little practice sizing but extras in the kit helped.' },
    { pid: 'p7',  vid: 'v2', uid: 'u6', rating: 5, title: 'Effortlessly chic',               body: 'The most elegant nails I\'ve ever worn. The transparency is so sophisticated. Just bought my third set from LuxeGlam.' },
    { pid: 'p11', vid: 'v2', uid: 'u7', rating: 5, title: 'Rose gold perfection',            body: 'Got so many compliments at my friend\'s wedding. The chrome catch on this set is unlike anything I\'ve seen at this price point.' },
    { pid: 'p2',  vid: 'v3', uid: 'u6', rating: 4, title: 'Perfect summer vibe',             body: 'The ombre is even better in person. Lasted 10 days before I removed them myself — they were still holding strong.' },
  ];

  const reviews = reviewData.map((r, i) => ({
    id: `r${i+1}`, userId: r.uid, productId: r.pid, vendorId: r.vid,
    rating: r.rating, title: r.title, body: r.body, helpful: Math.floor(Math.random()*60)+5,
    createdAt: daysAgo(Math.floor(Math.random()*14)+1)
  }));
  db.get('reviews').push(...reviews).write();

  // Sample orders
  const orders = [
    { id: 'o1', userId: 'u6', items: [{ productId:'p1', vendorId:'v1', qty:1, price:28 },{ productId:'p4', vendorId:'v4', qty:1, price:18 }], total: 46, status: 'delivered',  shippingAddress:{ name:'Mia Rodriguez', address:'123 Main St', city:'New York, NY 10001' }, createdAt: daysAgo(20) },
    { id: 'o2', userId: 'u6', items: [{ productId:'p6', vendorId:'v5', qty:1, price:32 }],                                                     total: 32, status: 'shipped',   shippingAddress:{ name:'Mia Rodriguez', address:'123 Main St', city:'New York, NY 10001' }, createdAt: daysAgo(5) },
    { id: 'o3', userId: 'u7', items: [{ productId:'p3', vendorId:'v2', qty:1, price:35 },{ productId:'p11',vendorId:'v2', qty:1, price:38 }], total: 73, status: 'confirmed', shippingAddress:{ name:'Jordan Taylor',  address:'456 Oak Ave',  city:'Los Angeles, CA 90001' }, createdAt: daysAgo(2) },
  ];
  db.get('orders').push(...orders).write();

  console.log('✅ Database seeded');
}

seed();
migrate();
module.exports = db;
