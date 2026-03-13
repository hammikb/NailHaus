/* ─── API ─── */
const API = {
  async req(method, path, body) {
    const h = { 'Content-Type': 'application/json' };
    const t = Store.token();
    if (t) h.Authorization = `Bearer ${t}`;
    const r = await fetch('/api' + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  },
  get:    (p)    => API.req('GET',    p),
  post:   (p, b) => API.req('POST',   p, b),
  put:    (p, b) => API.req('PUT',    p, b),
  del:    (p)    => API.req('DELETE', p),
};

/* ─── STORE ─── */
const Store = {
  token:    () => localStorage.getItem('nh_tok'),
  user:     () => JSON.parse(localStorage.getItem('nh_usr') || 'null'),
  loggedIn: () => !!Store.token(),
  isVendor: () => Store.user()?.role === 'vendor',
  isAdmin:  () => Store.user()?.role === 'admin',

  setAuth(tok, usr) {
    localStorage.setItem('nh_tok', tok);
    localStorage.setItem('nh_usr', JSON.stringify(usr));
  },
  clearAuth() {
    localStorage.removeItem('nh_tok');
    localStorage.removeItem('nh_usr');
  },

  /* cart */
  _cart: () => JSON.parse(localStorage.getItem('nh_cart') || '[]'),
  _saveCart: (c) => localStorage.setItem('nh_cart', JSON.stringify(c)),

  cartItems()  { return this._cart(); },
  cartCount()  { return this._cart().reduce((s,i) => s + i.qty, 0); },
  cartTotal()  { return this._cart().reduce((s,i) => s + i.price * i.qty, 0); },

  addCart(product, qty = 1) {
    const cart = this._cart();
    const ex = cart.find(i => i.id === product.id);
    if (ex) ex.qty += qty; else cart.push({ ...product, qty });
    this._saveCart(cart);
  },
  removeCart(id) { this._saveCart(this._cart().filter(i => i.id !== id)); },
  clearCart()    { this._saveCart([]); },

  /* nail profile */
  nailProfile: () => JSON.parse(localStorage.getItem('nh_nail_profile') || 'null'),
  saveNailProfile(profile) { localStorage.setItem('nh_nail_profile', JSON.stringify(profile)); },

  /* wishlist */
  _wl: () => JSON.parse(localStorage.getItem('nh_wl') || '[]'),
  wishlisted: (id) => Store._wl().includes(id),
  toggleWish(id) {
    const wl = this._wl();
    const next = wl.includes(id) ? wl.filter(x => x !== id) : [...wl, id];
    localStorage.setItem('nh_wl', JSON.stringify(next));
    return next.includes(id);
  },

  /* followed vendors */
  _followedVendors: () => JSON.parse(localStorage.getItem('nh_following') || '[]'),
  isFollowing: (id) => Store._followedVendors().includes(id),
  toggleFollow(id) {
    const list = this._followedVendors();
    const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
    localStorage.setItem('nh_following', JSON.stringify(next));
    return next.includes(id);
  },

  /* restock alerts (local fallback) */
  _restockAlerts: () => JSON.parse(localStorage.getItem('nh_restock') || '[]'),
};

/* ─── TOAST ─── */
const Toast = {
  show(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = `toast t-${type}`;
    el.innerHTML = `${type === 'ok' ? '✓' : '✕'} ${msg}`;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3000);
  }
};

/* ─── HELPERS ─── */
const stars = (r) => '★'.repeat(Math.round(r || 0)).padEnd(5, '☆');
const ago = (d) => {
  const diff = Date.now() - new Date(d);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const AVATS = ['👩🏻','👩🏼','👩🏽','👩🏾','🧑🏻','🧑🏽','👩🏻‍🦱','👩🏼‍🦰'];
const avatar = (id) => AVATS[id ? id.charCodeAt(0) % AVATS.length : 0];

function renderProductCard(p) {
  const won = Store.wishlisted(p.id);
  const profile = Store.nailProfile();
  const shapeMatch = profile?.shape && p.shape === profile.shape;
  return `
  <div class="pcard" data-id="${p.id}" onclick="Nav.go('product','${p.id}')">
    <div class="pcard-img" style="background:${p.bgColor}">
      ${p.badge ? `<span class="pbadge b-${p.badge}">${p.badge==='hot'?'🔥 Hot':p.badge==='new'?'✦ New':'% Sale'}</span>` : ''}
      ${p.availability === 'made_to_order' ? `<span class="pbadge b-mto" style="top:${p.badge?'34px':'10px'}">🎨 Made to Order</span>` : ''}
      ${shapeMatch ? `<span class="pbadge b-fit" style="top:auto;bottom:10px;left:10px">💅 Fits your profile</span>` : ''}
      <button class="wish-btn ${won?'on':''}" data-wid="${p.id}" onclick="wishToggle(event,'${p.id}')">
        ${won ? '❤️' : '🤍'}
      </button>
      <span style="pointer-events:none">${p.emoji}</span>
    </div>
    <div class="pcard-body">
      ${p.vendor ? `<div class="pcard-vendor">${p.vendor.name}</div>` : ''}
      <div class="pcard-name">${p.name}</div>
      <div class="stars-row">
        <span class="stars">${stars(p.rating)}</span>
        <span class="rct">${p.rating||'—'} (${p.reviewCount})</span>
      </div>
      <div class="pcard-foot">
        <div>
          <span class="price">$${p.price}</span>
          ${p.originalPrice ? `<span class="price-orig">$${p.originalPrice}</span>` : ''}
        </div>
        <button class="atc-btn" onclick="quickAdd(event,'${p.id}')">+</button>
      </div>
    </div>
  </div>`;
}

function renderVendorCard(v) {
  const following = Store.isFollowing(v.id);
  return `
  <div class="vcard" onclick="Nav.go('vendor','${v.id}')">
    <div class="vemoji" style="background:${v.bgColor}">${v.emoji}</div>
    <div class="vcard-name">${v.name}</div>
    <div class="vcard-tag">${v.tagline||''}</div>
    ${v.verified ? '<div class="v-verified">✓ Verified</div>' : ''}
    <div class="vstats">
      <div><div class="vstat-n">${v.totalProducts}</div><div class="vstat-l">Sets</div></div>
      <div><div class="vstat-n">${(v.totalSales/1000).toFixed(v.totalSales>=1000?1:0)}${v.totalSales>=1000?'k':''}</div><div class="vstat-l">Sales</div></div>
      <div><div class="vstat-n">⭐${v.rating}</div><div class="vstat-l">Rating</div></div>
    </div>
    <div style="margin-top:.8rem" onclick="event.stopPropagation()">
      <button class="follow-btn ${following?'following':''}" data-vid="${v.id}" onclick="toggleFollow(event,'${v.id}')">
        ${following ? '♥ Following' : '♡ Follow'}
      </button>
    </div>
  </div>`;
}

function renderReviewCard(r) {
  return `
  <div class="rcard">
    <div class="rcard-top">
      <div class="rav">${avatar(r.id)}</div>
      <div>
        <div class="rname">${r.user?.name || 'Anonymous'}</div>
        <div class="rmeta">${stars(r.rating)} · ${ago(r.createdAt)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto;padding:.25rem .7rem;font-size:.68rem" onclick="openReport('review','${r.id}');event.stopPropagation()">Report</button>
    </div>
    ${r.title ? `<div style="font-size:.86rem;font-weight:500;margin-bottom:.35rem">${r.title}</div>` : ''}
    <p class="rbody">"${r.body}"</p>
    ${r.product ? `<div class="rproduct">💅 ${r.product.name}</div>` : ''}
    ${r.photo ? `<div class="review-photo-wrap"><img src="${r.photo}" class="review-photo" onclick="this.classList.toggle('review-photo-large')" alt="Customer photo"></div>` : ''}
  </div>`;
}

/* ─── WISH TOGGLE ─── */
function wishToggle(e, id) {
  e.stopPropagation();
  const on = Store.toggleWish(id);
  document.querySelectorAll(`[data-wid="${id}"]`).forEach(b => {
    b.textContent = on ? '❤️' : '🤍';
    b.classList.toggle('on', on);
  });
}

/* ─── QUICK ADD TO CART ─── */
async function quickAdd(e, id) {
  e.stopPropagation();
  try {
    const p = await API.get(`/products/${id}`);
    Store.addCart(p);
    CartUI.refresh();
    Toast.show(`${p.name} added to cart`);
    e.target.textContent = '✓';
    e.target.style.background = 'var(--mint)';
    setTimeout(() => { e.target.textContent = '+'; e.target.style.background = ''; }, 1300);
  } catch { Toast.show('Could not add to cart', 'err'); }
}

/* ─── CART UI ─── */
const CartUI = {
  open()    { document.getElementById('cartPanel').classList.add('open');  document.getElementById('bkdrop').classList.add('open');  this.refresh(); },
  close()   { document.getElementById('cartPanel').classList.remove('open'); document.getElementById('bkdrop').classList.remove('open'); },
  toggle()  { document.getElementById('cartPanel').classList.contains('open') ? this.close() : this.open(); },
  badge()   {
    const n = Store.cartCount();
    const el = document.getElementById('cartDot');
    el.textContent = n;
    el.style.display = n ? 'flex' : 'none';
  },
  refresh() {
    this.badge();
    const items = Store.cartItems();
    const body  = document.getElementById('cartBody');
    const foot  = document.getElementById('cartFoot');
    if (!items.length) {
      body.innerHTML = `<div class="cart-empty"><div style="font-size:2.5rem">💅</div><p style="margin-top:.5rem;font-size:.86rem">Your cart is empty.<br>Time to browse!</p></div>`;
      foot.innerHTML = '';
    } else {
      body.innerHTML = items.map(i => `
        <div class="citem">
          <div class="citem-img" style="background:${i.bgColor}">${i.emoji}</div>
          <div>
            <div class="citem-name">${i.name}</div>
            <div class="citem-vendor">${i.vendor?.name||''}</div>
            <div class="citem-price">$${i.price} × ${i.qty}</div>
            <button class="citem-rm" onclick="CartUI.remove('${i.id}')">Remove</button>
          </div>
        </div>`).join('');
      foot.innerHTML = `
        <div class="cart-total"><span>Total</span><span>$${Store.cartTotal().toFixed(2)}</span></div>
        <button class="btn btn-dark btn-full" onclick="Nav.go('checkout')">Checkout →</button>`;
    }
  },
  remove(id) { Store.removeCart(id); this.refresh(); }
};
