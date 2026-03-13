/* ═══════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════ */
const Nav = {
  go(page, id = null) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`p-${page}`);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    Pages[page]?.(id);
  }
};

function renderNav() {
  const u = Store.user();
  const el = document.getElementById('navUser');
  if (u) {
    el.innerHTML = `
      <span style="font-size:.8rem;color:var(--muted);cursor:pointer" onclick="Nav.go('account')">${u.name.split(' ')[0]}</span>
      ${u.role==='admin' ? `<button class="btn-nav btn-nav-solid btn-sm" onclick="Nav.go('admin')">Admin</button>` : ''}
      ${u.role==='vendor' ? `<button class="btn-nav btn-nav-solid btn-sm" onclick="Nav.go('dashboard')">Dashboard</button>` : ''}
      <button class="btn-nav btn-nav-outline" onclick="doLogout()">Sign out</button>`;
  } else {
    el.innerHTML = `
      <button class="btn-nav btn-nav-outline" onclick="Nav.go('login')">Sign in</button>
      <button class="btn-nav btn-nav-solid" onclick="Nav.go('register')">Join free</button>`;
  }
}

function doLogout() {
  Store.clearAuth();
  renderNav();
  Toast.show('Signed out. See you soon! 🌸');
  Nav.go('home');
}

/* ─── MODULE-LEVEL STATE ─── */
window._discount = null;
window._orderItems = {}; // stores order items keyed by orderId for "order again"

/* ─── OCCASION FILTER STATE ─── */
let _selectedOccasion = 'all';

/* ═══════════════════════════════════════════
   PAGE RENDERERS
═══════════════════════════════════════════ */
const Pages = {

  /* ── HOME ── */
  async home() {
    try {
      const [products, vendors, reviews, newProducts] = await Promise.all([
        API.get('/products?sort=popular&limit=6'),
        API.get('/vendors'),
        API.get('/reviews/recent?limit=6'),
        API.get('/products?sort=newest&limit=4')
      ]);
      document.getElementById('home-products').innerHTML = products.map(renderProductCard).join('');
      document.getElementById('home-vendors').innerHTML  = vendors.slice(0,6).map(renderVendorCard).join('');
      document.getElementById('home-reviews').innerHTML  = reviews.map(renderReviewCard).join('') || '<p style="color:var(--muted)">No reviews yet.</p>';
      if (newProducts.length) {
        document.getElementById('home-new').innerHTML = newProducts.map(p => `<div style="min-width:220px;flex-shrink:0">${renderProductCard(p)}</div>`).join('');
        document.getElementById('home-new-section').style.display = '';
      }
    } catch(e) {
      document.getElementById('home-products').innerHTML = `<p style="color:var(--muted)">${e.message}</p>`;
    }
  },

  /* ── SHOP ── */
  async shop() {
    const grid   = document.getElementById('shop-grid');
    const search = document.getElementById('shop-q')?.value || '';
    const shape  = document.getElementById('sh-shape')?.value || 'all';
    const style  = document.getElementById('sh-style')?.value || 'all';
    const sort   = document.getElementById('sh-sort')?.value || 'popular';

    grid.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';
    const params = new URLSearchParams({ sort });
    if (search) params.set('search', search);
    if (shape !== 'all') params.set('shape', shape);
    if (style !== 'all') params.set('style', style);
    const inStock = document.getElementById('sh-instock')?.checked;
    if (inStock) params.set('availability', 'in_stock');
    if (_selectedOccasion && _selectedOccasion !== 'all') params.set('occasion', _selectedOccasion);

    try {
      const products = await API.get('/products?' + params);
      grid.innerHTML = products.length
        ? products.map(renderProductCard).join('')
        : `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>No sets found</h3><p>Try adjusting your filters or search term</p><button class="btn btn-ghost btn-sm" onclick="document.getElementById('shop-q').value='';document.getElementById('sh-shape').value='all';document.getElementById('sh-style').value='all';document.getElementById('sh-sort').value='popular';document.getElementById('sh-instock').checked=false;_selectedOccasion='all';document.querySelectorAll('.occ-chip').forEach((c,i)=>c.classList.toggle('active',i===0));document.querySelectorAll('.chip').forEach(c=>{if(c.textContent.trim()==='All')c.classList.add('on');else c.classList.remove('on')});Pages.shop()">Clear all filters</button></div>`;
    } catch(e) {
      grid.innerHTML = `<p style="color:var(--muted)">${e.message}</p>`;
    }
  },

  /* ── VENDORS ── */
  async vendors() {
    const el = document.getElementById('vendors-grid');
    el.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';
    try {
      const v = await API.get('/vendors');
      el.innerHTML = v.map(renderVendorCard).join('');
    } catch(e) { el.innerHTML = `<p style="color:var(--muted)">${e.message}</p>`; }
  },

  /* ── VENDOR DETAIL ── */
  async vendor(id) {
    const el = document.getElementById('vendor-content');
    el.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';
    try {
      const v = await API.get(`/vendors/${id}`);
      const isFollowing = Store.isFollowing(v.id);
      el.innerHTML = `
        <div class="vendor-hero" style="background:linear-gradient(135deg,${v.bgColor},var(--linen))">
          <div class="vendor-hero-inner">
            <div class="v-big-emoji" style="background:${v.bgColor}">${v.emoji}</div>
            <div>
              <div class="eyebrow">${(v.tags||[]).join(' · ')}</div>
              <h1 class="display" style="font-size:2.2rem;margin:.3rem 0">${v.name}</h1>
              <p style="color:var(--muted);font-size:.9rem">${v.tagline||''}</p>
              ${(v.socialLinks?.instagram || v.socialLinks?.tiktok) ? `
                <div style="display:flex;gap:.7rem;margin-top:.6rem;flex-wrap:wrap">
                  ${v.socialLinks?.instagram ? `<a href="${v.socialLinks.instagram.startsWith('http') ? v.socialLinks.instagram : 'https://instagram.com/' + v.socialLinks.instagram.replace('@','')}" target="_blank" rel="noreferrer" style="font-size:.78rem;color:var(--accent);display:flex;align-items:center;gap:.3rem" onclick="event.stopPropagation()">📸 Instagram</a>` : ''}
                  ${v.socialLinks?.tiktok ? `<a href="${v.socialLinks.tiktok.startsWith('http') ? v.socialLinks.tiktok : 'https://tiktok.com/' + v.socialLinks.tiktok.replace('@','')}" target="_blank" rel="noreferrer" style="font-size:.78rem;color:var(--accent);display:flex;align-items:center;gap:.3rem" onclick="event.stopPropagation()">🎵 TikTok</a>` : ''}
                </div>` : ''}
            </div>
            <div style="margin-left:auto;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
              ${v.verified ? '<span class="sbadge s-delivered">verified</span>' : '<span class="sbadge s-pending">unverified</span>'}
              <button id="vendor-follow-btn" class="follow-btn ${isFollowing?'following':''}" onclick="toggleFollow(event,'${v.id}')">${isFollowing ? '♥ Following' : '♡ Follow'}</button>
              <button class="btn btn-ghost btn-sm" onclick="openReport('vendor','${v.id}')">Report</button>
            </div>
          </div>
          ${v.announcement ? `<div class="wrap"><div class="vendor-announcement">📢 ${v.announcement}</div></div>` : ''}
          <div class="wrap" style="padding-top:1.8rem">
            <div style="display:flex;gap:2.5rem;flex-wrap:wrap">
              <div><div style="font-family:'Cormorant Garamond',serif;font-size:1.8rem">${v.totalProducts}</div><div style="font-size:.7rem;color:var(--muted)">Nail Sets</div></div>
              <div><div style="font-family:'Cormorant Garamond',serif;font-size:1.8rem">${v.totalSales.toLocaleString()}</div><div style="font-size:.7rem;color:var(--muted)">Sales</div></div>
              <div><div style="font-family:'Cormorant Garamond',serif;font-size:1.8rem">⭐${v.rating}</div><div style="font-size:.7rem;color:var(--muted)">Avg Rating</div></div>
            </div>
          </div>
        </div>
        <div class="wrap sec">
          ${v.description ? `<p style="color:var(--muted);line-height:1.72;max-width:600px;margin-bottom:2.5rem">${v.description}</p>` : ''}
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.5rem">
            <h2 class="sec-title">All <em>Sets</em></h2>
          </div>
          ${(() => {
            const collections = v.collections || [];
            const products = v.products || [];
            const uncollected = products.filter(p => !p.collectionId || !collections.find(c=>c.id===p.collectionId));
            if (!collections.length) {
              return `<div class="pgrid">${products.map(p=>renderProductCard({...p,vendor:{id:v.id,name:v.name}})).join('') || '<div class="empty"><div class="empty-icon">💅</div><h3>No products yet</h3></div>'}</div>`;
            }
            return collections.map(col => {
              const colProducts = products.filter(p => p.collectionId === col.id);
              if (!colProducts.length) return '';
              return `
                <div class="collection-section">
                  <div class="collection-header">
                    <h3 class="display" style="font-size:1.3rem">${col.name}</h3>
                    ${col.description ? `<p style="font-size:.82rem;color:var(--muted)">${col.description}</p>` : ''}
                  </div>
                  <div class="pgrid">${colProducts.map(p=>renderProductCard({...p,vendor:{id:v.id,name:v.name}})).join('')}</div>
                </div>`;
            }).join('') + (uncollected.length ? `
              <div class="collection-section">
                <div class="collection-header"><h3 class="display" style="font-size:1.3rem">More Sets</h3></div>
                <div class="pgrid">${uncollected.map(p=>renderProductCard({...p,vendor:{id:v.id,name:v.name}})).join('')}</div>
              </div>` : '');
          })()}
          ${v.reviews?.length ? `
            <h2 class="sec-title" style="margin:3rem 0 1.5rem">Customer <em>Reviews</em></h2>
            <div class="rgrid">${v.reviews.map(renderReviewCard).join('')}</div>` : ''}
        </div>`;
    } catch(e) {
      el.innerHTML = `<div class="wrap"><p style="color:var(--muted);padding:3rem 0">${e.message}</p></div>`;
    }
  },

  /* ── PRODUCT DETAIL ── */
  async product(id) {
    const el = document.getElementById('product-content');
    el.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';
    try {
      const p = await API.get(`/products/${id}`);
      window._product = p; window._qty = 1;

      el.innerHTML = `
        <div class="wrap sec">
          <div style="font-size:.76rem;color:var(--muted);margin-bottom:1.5rem;cursor:pointer" onclick="Nav.go('shop')">← Back to Shop</div>
          <div class="pd-grid">
            <div class="pd-img" style="background:${p.bgColor}"><span>${p.emoji}</span></div>
            <div>
              <div class="pd-vendor" onclick="Nav.go('vendor','${p.vendorId}')">${p.vendor?.name||''}</div>
              <h1 class="display" style="font-size:2rem;margin:.35rem 0">${p.name}</h1>
              <div class="stars-row" style="margin:.5rem 0">
                <span class="stars" style="font-size:.85rem">${stars(p.rating)}</span>
                <span style="font-size:.78rem;color:var(--muted)">${p.rating||'No ratings'} · ${p.reviewCount} review${p.reviewCount!==1?'s':''}</span>
              </div>
              <div class="pd-price">
                $${p.price}
                ${p.originalPrice ? `<span class="price-orig" style="font-size:1.2rem">$${p.originalPrice}</span>` : ''}
              </div>
              <p style="color:var(--muted);line-height:1.7;font-size:.88rem;margin-bottom:1rem">${p.description}</p>
              <div class="ptags">
                ${(p.tags||[]).map(t=>`<span class="ptag">${t}</span>`).join('')}
                <span class="ptag">Shape: ${p.shape}</span>
                <span class="ptag">Style: ${p.style}</span>
                <span class="ptag avail-${p.availability === 'made_to_order' ? 'mto' : 'stock'}">${p.availability === 'made_to_order' ? '🎨 Made to Order' : '✓ In Stock'}</span>
                ${p.availability === 'made_to_order' && p.productionDays ? `<span class="ptag">Ships in ${p.productionDays} days</span>` : ''}
                <span class="ptag">${p.stock} units available</span>
              </div>
              ${(p.occasions||[]).length ? `<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem">${p.occasions.map(o=>`<span class="ptag occ-tag">${{wedding:'💍 Wedding',everyday:'☀️ Every Day',event:'✨ Event',festival:'🎪 Festival',work:'💼 Work',party:'🎉 Party',holiday:'🎄 Holiday'}[o]||o}</span>`).join('')}</div>` : ''}
              ${Store.loggedIn() && !Store.nailProfile() ? `<div style="font-size:.76rem;color:var(--accent);cursor:pointer;margin-top:.5rem" onclick="document.getElementById('size-quiz-modal').classList.add('open');loadSizeQuiz()">💅 Set up your nail profile for better recommendations</div>` : ''}
              ${(() => {
                const prof = Store.nailProfile();
                const shapeMatch = prof?.shape && p.shape === prof.shape;
                return shapeMatch ? `<div style="display:inline-flex;align-items:center;gap:.4rem;background:var(--mint);color:var(--success);border-radius:var(--r-pill);padding:.3rem .85rem;font-size:.76rem;margin-top:.5rem">💅 Fits your nail profile</div>` : '';
              })()}
              <div class="qty-row">
                <button class="qty-btn" onclick="window._qty=Math.max(1,window._qty-1);document.getElementById('qty-n').textContent=window._qty">−</button>
                <span class="qty-n" id="qty-n">1</span>
                <button class="qty-btn" onclick="window._qty++;document.getElementById('qty-n').textContent=window._qty">+</button>
              </div>
              <div style="display:flex;gap:.8rem">
                ${p.stock === 0 ? `
                  <button class="btn btn-dark" style="flex:1;opacity:.5;cursor:not-allowed" disabled>Out of Stock</button>
                  <button id="restock-btn" class="restock-btn" onclick="toggleRestockAlert('${p.id}',false)">🔔 Notify me when back in stock</button>
                ` : `
                  <button class="btn btn-dark" style="flex:1" onclick="addProductToCart()">Add to Cart 🛍</button>
                `}
                <button class="wish-btn ${Store.wishlisted(p.id)?'on':''}" data-wid="${p.id}" onclick="wishToggle(event,'${p.id}')" style="position:static;width:48px;height:48px;border-radius:var(--r-sm);flex-shrink:0">${Store.wishlisted(p.id)?'❤️':'🤍'}</button>
              </div>
              <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.75rem">
                <button class="btn btn-ghost btn-sm" onclick="openReport('product','${p.id}')">Report listing</button>
              </div>
              ${!Store.loggedIn() ? `<p style="font-size:.76rem;color:var(--muted);margin-top:.8rem"><a onclick="Nav.go('login')" style="color:var(--accent);cursor:pointer">Sign in</a> to save to wishlist or leave a review.</p>` : ''}
            </div>
          </div>

          ${(() => {
            const hasSpecs = p.nailCount || p.sizes || p.finish || p.wearTime || p.glueIncluded !== null && p.glueIncluded !== undefined || p.reusable !== null && p.reusable !== undefined;
            if (!hasSpecs) return '';
            const specs = [];
            if (p.nailCount) specs.push({ label: 'Nail Count', value: `${p.nailCount} nails` });
            if (p.sizes) specs.push({ label: 'Sizes', value: p.sizes });
            if (p.finish) specs.push({ label: 'Finish', value: p.finish });
            if (p.wearTime) specs.push({ label: 'Wear Time', value: p.wearTime });
            if (p.glueIncluded !== null && p.glueIncluded !== undefined) specs.push({ label: 'Glue Included', value: p.glueIncluded ? '✓ Yes' : '✗ No' });
            if (p.reusable !== null && p.reusable !== undefined) specs.push({ label: 'Reusable', value: p.reusable ? '✓ Yes' : '✗ Single use' });
            return `
              <div class="card card-p" style="margin-top:2.5rem">
                <h3 class="display" style="font-size:1.35rem;margin-bottom:.5rem">What's in the <em>Box</em></h3>
                <div class="spec-grid">
                  ${specs.map(s => `<div class="spec-item"><div class="spec-label">${s.label}</div><div class="spec-value">${s.value}</div></div>`).join('')}
                </div>
              </div>`;
          })()}

          <div style="margin-top:4rem">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
              <h2 class="sec-title">Customer <em>Reviews</em></h2>
              ${Store.loggedIn() ? `<button class="btn btn-ghost btn-sm" onclick="openReviewModal('${p.id}')">Write a Review ✦</button>` : ''}
            </div>
            <div id="prod-reviews">
              ${p.reviews?.length
                ? `<div class="rgrid">${p.reviews.map(renderReviewCard).join('')}</div>`
                : `<div class="empty"><div class="empty-icon">⭐</div><h3>No reviews yet</h3><p>Be the first to share your experience!</p>${Store.loggedIn()?`<button class="btn btn-ghost btn-sm" onclick="openReviewModal('${p.id}')">Write the first review</button>`:''}</div>`}
            </div>
          </div>

          <div id="also-like" style="margin-top:4rem"></div>
        </div>`;
      // Load restock status if product is out of stock
      if (p.stock === 0 && Store.loggedIn()) {
        loadRestockStatus(p.id);
      }

      // Load "You Might Also Like" section
      loadAlsoLike(p.id, p.shape, p.style);

    } catch(e) {
      el.innerHTML = `<div class="wrap"><p style="color:var(--muted);padding:3rem 0">${e.message}</p></div>`;
    }
  },

  /* ── LOGIN ── */
  login() { document.getElementById('login-err').textContent = ''; },

  /* ── REGISTER ── */
  register() { document.getElementById('reg-err').textContent = ''; },

  /* ── ACCOUNT ── */
  async account() {
    if (!Store.loggedIn()) { Nav.go('login'); return; }
    const u = Store.user();
    document.getElementById('acc-name').textContent  = u.name;
    document.getElementById('acc-email').textContent = u.email;
    document.getElementById('acc-role').textContent  = u.role === 'vendor' ? '🛍 Vendor Account' : '🛒 Shopper Account';
    renderNailProfile();
    renderFollowing();
    await this._loadOrders();
  },

  async _loadOrders() {
    const el = document.getElementById('acc-orders');
    el.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';
    try {
      const orders = await API.get('/orders/my');
      if (!orders.length) {
        el.innerHTML = `<div class="empty"><div class="empty-icon">📦</div><h3>No orders yet</h3><p>Your order history will appear here.</p><button class="btn btn-dark btn-sm" onclick="Nav.go('shop')">Start Shopping</button></div>`;
        return;
      }
      // Store order items globally for "Order Again"
      window._orderItems = {};
      orders.forEach(o => { window._orderItems[o.id] = o.items; });

      el.innerHTML = `<div class="tbl-wrap"><table>
        <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${orders.map(o=>`
          <tr>
            <td style="font-family:monospace;font-size:.72rem">${o.id.slice(0,8)}…</td>
            <td>${new Date(o.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
            <td style="max-width:220px">${o.items.map(i=>`${i.product?.emoji||'💅'} ${i.product?.name||'Item'}`).join(', ')}</td>
            <td>
              $${o.total.toFixed(2)}
              ${o.discountSavings > 0 ? `<div style="font-size:.68rem;color:var(--success)">−$${o.discountSavings.toFixed(2)} discount</div>` : ''}
              ${o.shippingAddress?.city ? `<div style="font-size:.68rem;color:var(--muted);margin-top:.2rem">📦 ${o.shippingAddress.name||''} · ${o.shippingAddress.city}</div>` : ''}
            </td>
            <td><span class="sbadge s-${o.status}">${o.status}</span></td>
            <td style="white-space:nowrap">
              <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                <button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:.3rem .7rem" onclick="orderAgain('${o.id}')">Order Again</button>
                <button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:.3rem .7rem" onclick="openDispute('${o.id}')">Problem?</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
    } catch(e) { el.innerHTML = `<p style="color:var(--muted)">${e.message}</p>`; }
  },

  /* ── DASHBOARD ── */
  async dashboard() {
    if (!Store.loggedIn()) { Nav.go('login'); return; }
    const el = document.getElementById('dash-content');
    el.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';
    try {
      const d = await API.get('/vendors/me/dashboard');
      const { vendor, stats, products, recentReviews, recentOrders, fulfillmentQueue, recentShipments, verificationRequest } = d;

      // Profile completeness
      const checks = [
        { label: 'Brand name',    done: !!vendor.name },
        { label: 'Tagline',       done: !!vendor.tagline },
        { label: 'Description',   done: !!vendor.description },
        { label: 'Verified',      done: !!vendor.verified },
        { label: 'Has products',  done: stats.totalProducts > 0 },
        { label: 'Social link',   done: !!(vendor.socialLinks?.instagram || vendor.socialLinks?.tiktok) },
        { label: 'Announcement',  done: !!vendor.announcement },
      ];
      const done = checks.filter(c => c.done).length;
      const pct  = Math.round((done / checks.length) * 100);

      // Low stock
      const lowStock = products.filter(p => p.stock <= 3 && p.stock >= 0);

      // Top products by revenue
      const revByProduct = {};
      (recentOrders || []).forEach(o => {
        o.items.filter(i => i.vendorId === vendor.id).forEach(i => {
          revByProduct[i.productId] = (revByProduct[i.productId] || 0) + i.price * i.qty;
        });
      });
      const topProducts = products
        .map(p => ({ ...p, earned: revByProduct[p.id] || 0 }))
        .sort((a,b) => b.earned - a.earned)
        .slice(0, 5);

      el.innerHTML = `

        <!-- GREETING HEADER -->
        <div class="dash-greeting">
          <div class="dash-greeting-emoji">${vendor.emoji || '💅'}</div>
          <div>
            <div class="eyebrow">Seller Dashboard</div>
            <div class="display" style="font-size:1.6rem;margin-top:.1rem">${vendor.name}</div>
          </div>
        </div>

        <!-- SECTION TABS -->
        <div class="dash-tabs">
          <a class="dash-tab" href="#ds-overview">Overview</a>
          <a class="dash-tab" href="#ds-fulfillment">Fulfill${fulfillmentQueue?.length ? `<span class="dtab-badge dtab-urgent">${fulfillmentQueue.length}</span>` : ''}</a>
          <a class="dash-tab" href="#ds-products">Products${products.length ? `<span class="dtab-badge dtab-n">${products.length}</span>` : ''}</a>
          <a class="dash-tab" href="#ds-orders">Orders</a>
          <a class="dash-tab" href="#ds-discounts">Discounts</a>
          <a class="dash-tab" href="#ds-reviews">Reviews</a>
        </div>

        <!-- QUICK ACTIONS -->
        <div id="ds-overview" class="dash-quick-actions">
          <button class="dqa-btn" onclick="openAddProduct()"><span class="dqa-icon">+</span><span>Add Product</span></button>
          <button class="dqa-btn" style="border-color:var(--accent);color:var(--accent)" onclick="Nav.go('vendor','${vendor.id}')"><span class="dqa-icon">🖼️</span><span>View Storefront →</span></button>
          <button class="dqa-btn" onclick="openEditStorefront()"><span class="dqa-icon">✏️</span><span>Edit Profile</span></button>
          <button class="dqa-btn" onclick="openShippingProfile()"><span class="dqa-icon">📦</span><span>Shipping Profile</span></button>
          ${!vendor.verified ? `<button class="dqa-btn dqa-verify" onclick="openVerificationRequest()"><span class="dqa-icon">✦</span><span>Get Verified</span></button>` : `<div class="dqa-btn dqa-verified"><span class="dqa-icon">✓</span><span>Verified</span></div>`}
        </div>

        <!-- PROFILE COMPLETENESS -->
        ${pct < 100 ? `
        <div class="dash-complete card card-p" style="margin-bottom:1.5rem">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.7rem;flex-wrap:wrap;gap:.5rem">
            <div>
              <div class="eyebrow">Your storefront</div>
              <div class="display" style="font-size:1.2rem;margin-top:.2rem">Profile <em>${pct}% complete</em></div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="openEditStorefront()">Complete profile →</button>
          </div>
          <div class="complete-bar-bg"><div class="complete-bar-fill" style="width:${pct}%"></div></div>
          <div class="complete-checks">
            ${checks.map(c=>`<span class="cc-item ${c.done?'cc-done':''}">${c.done?'✓':'○'} ${c.label}</span>`).join('')}
          </div>
        </div>` : ''}

        <!-- LOW STOCK ALERT -->
        ${lowStock.length ? `
        <div class="dash-alert card card-p" style="margin-bottom:1.5rem">
          <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.7rem">
            <span style="font-size:1.1rem">⚠️</span>
            <div class="eyebrow" style="color:#b85c00">Low Stock Alert</div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:.6rem">
            ${lowStock.map(p=>`
              <div class="low-stock-chip">
                ${p.emoji} ${p.name}
                <span class="lsc-n ${p.stock===0?'lsc-out':''}">${p.stock===0?'Out of stock':`${p.stock} left`}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- STATS ROW -->
        <div class="stat-row">
          <div class="scard"><div class="scard-n">${stats.totalProducts}</div><div class="scard-l">Products</div></div>
          <div class="scard"><div class="scard-n">${stats.totalOrders}</div><div class="scard-l">Orders</div></div>
          <div class="scard"><div class="scard-n">$${Number(stats.totalRevenue).toFixed(0)}</div><div class="scard-l">Gross Revenue</div></div>
          <div class="scard"><div class="scard-n">⭐${stats.avgRating}</div><div class="scard-l">Avg Rating</div></div>
          <div class="scard"><div class="scard-n">${stats.totalReviews}</div><div class="scard-l">Reviews</div></div>
        </div>

        <!-- REVENUE TREND + PAYOUTS -->
        <div class="dash-two-col" style="margin:1.5rem 0">
          <div class="card card-p" id="revenue-chart-card">
            <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:.5rem">
              <div>
                <div class="eyebrow">Revenue</div>
                <div class="display" style="font-size:1.3rem;margin-top:.2rem">30-Day <em>Trend</em></div>
              </div>
            </div>
            <div id="revenue-chart"><div class="spin-wrap"><div class="spin"></div></div></div>
          </div>
          <div class="card card-p" id="payouts-card">
            <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:.5rem">
              <div>
                <div class="eyebrow">Earnings</div>
                <div class="display" style="font-size:1.3rem;margin-top:.2rem">Payouts</div>
              </div>
            </div>
            <div id="payouts-content"><div class="spin-wrap"><div class="spin"></div></div></div>
          </div>
        </div>

        <!-- TOP PRODUCTS -->
        ${topProducts.some(p=>p.earned>0) ? `
        <div style="margin-bottom:2rem">
          <h2 class="sec-title" style="margin-bottom:1rem">Top <em>Products</em> by Revenue</h2>
          <div class="tbl-wrap"><table>
            <thead><tr><th></th><th>Product</th><th>Price</th><th>Stock</th><th>Rating</th><th>Earned</th><th>Sale</th></tr></thead>
            <tbody>${topProducts.map((p,i)=>`
              <tr>
                <td style="color:var(--muted);font-size:.72rem">#${i+1}</td>
                <td><span style="margin-right:.5rem">${p.emoji}</span>${p.name}</td>
                <td>$${p.price}</td>
                <td><span class="${p.stock<=3?'sbadge s-pending':''}">${p.stock}</span></td>
                <td>${p.rating ? `⭐${p.rating}` : '—'}</td>
                <td style="font-weight:500">$${p.earned.toFixed(2)}</td>
                <td>
                  ${p.originalPrice
                    ? `<button class="btn btn-ghost btn-sm" onclick="endSale('${p.id}')">End sale</button>`
                    : `<button class="btn btn-ghost btn-sm" onclick="openPromo('${p.id}','${p.name}',${p.price})">Put on sale</button>`}
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>` : ''}

        <!-- FULFILLMENT QUEUE -->
        <div id="ds-fulfillment" style="display:flex;align-items:center;justify-content:space-between;margin:2rem 0 1.2rem;gap:1rem;flex-wrap:wrap">
          <h2 class="sec-title">Fulfillment <em>Queue</em></h2>
          <button class="btn btn-ghost btn-sm" onclick="loadAllShipments()">View All Shipments</button>
        </div>
        <div id="fulfillment-queue">
          ${(fulfillmentQueue?.length)
            ? fulfillmentQueue.map(o => `
              <div class="card card-p" style="margin-bottom:1rem">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1.2rem;flex-wrap:wrap">
                  <div>
                    <div style="font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Order</div>
                    <div style="font-family:monospace;font-size:.78rem;margin-top:.25rem">${o.id.slice(0,8)}…</div>
                    <div style="font-size:.78rem;color:var(--muted);margin-top:.25rem">${ago(o.createdAt)}</div>
                  </div>
                  <div style="min-width:260px;flex:1">
                    <div style="font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Items</div>
                    <div style="margin-top:.35rem;font-size:.86rem;line-height:1.7">
                      ${o.items.map(i => `${i.product?.emoji || '💅'} ${i.product?.name || i.productId} ×${i.qty}`).join('<br>')}
                    </div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;margin-bottom:.5rem">
                      $${o.items.reduce((s,i)=>s+i.price*i.qty,0).toFixed(0)}
                    </div>
                    <div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap">
                      <button class="btn btn-ghost btn-sm" onclick="openMarkShipped('${o.id}',this)">✓ Mark Shipped</button>
                      <button class="btn btn-dark btn-sm" onclick="openLabelFlow('${o.id}')">Create Label</button>
                    </div>
                  </div>
                </div>
              </div>`).join('')
            : `<div class="empty"><div class="empty-icon">📦</div><h3>All caught up</h3><p>No orders need fulfillment right now.</p></div>`}
        </div>

        <!-- RECENT SHIPMENTS -->
        ${(recentShipments?.length) ? `
          <h2 class="sec-title" style="margin:2.5rem 0 1.2rem">Recent <em>Shipments</em></h2>
          <div class="tbl-wrap"><table>
            <thead><tr><th>Shipment</th><th>Order</th><th>Status</th><th>Carrier</th><th>Tracking</th><th>Label</th></tr></thead>
            <tbody>${recentShipments.map(s => `
              <tr>
                <td style="font-family:monospace;font-size:.72rem">${(s.id||'').slice(0,8)}…</td>
                <td style="font-family:monospace;font-size:.72rem">${(s.orderId||'').slice(0,8)}…</td>
                <td><span class="sbadge s-${s.status}">${s.status}</span></td>
                <td>${s.shippo?.carrier || '—'}</td>
                <td style="font-family:monospace;font-size:.72rem">${s.shippo?.trackingNumber || '—'}</td>
                <td>${s.shippo?.labelUrl ? `<a href="${s.shippo.labelUrl}" target="_blank" rel="noreferrer" style="color:var(--accent)">Open</a>` : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>` : ''}

        <!-- PRODUCTS GRID -->
        <div id="ds-products" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4rem;margin-top:2.5rem">
          <h2 class="sec-title">Your <em>Products</em></h2>
          <button class="btn btn-dark btn-sm" onclick="openAddProduct()">+ Add Product</button>
        </div>
        <div class="pgrid" id="dash-pgrid">
          ${products.length
            ? products.map(p=>renderProductCard({...p,vendor:{id:vendor.id,name:vendor.name}})).join('')
            : `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">💅</div><h3>No products yet</h3><p>Add your first nail set!</p></div>`}
        </div>

        <!-- COLLECTIONS -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;margin-top:2.5rem">
          <h2 class="sec-title">My <em>Collections</em></h2>
          <button class="btn btn-ghost btn-sm" onclick="openCreateCollection()">+ New Collection</button>
        </div>
        <div id="dash-collections">
          ${(vendor.collections || []).length ? `
            <div style="display:flex;flex-wrap:wrap;gap:.8rem">
              ${(vendor.collections||[]).map(col => `
                <div class="collection-chip">
                  <div class="cc-name">${col.name}</div>
                  ${col.description ? `<div class="cc-desc">${col.description}</div>` : ''}
                  <div style="display:flex;gap:.4rem;margin-top:.5rem">
                    <button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:.2rem .6rem" onclick="assignProductToCollection('${col.id}','${col.name}')">Assign Products</button>
                    <button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:.2rem .6rem;color:var(--muted)" onclick="deleteCollection('${col.id}')">Delete</button>
                  </div>
                </div>`).join('')}
            </div>` : `<div class="empty" style="padding:1.5rem 0"><div class="empty-icon" style="font-size:1.5rem">📁</div><h3 style="font-size:1rem">No collections yet</h3><p style="font-size:.82rem">Group your products into collections like "Spring Drop" or "Bridal Edit".</p></div>`}
        </div>

        <!-- DISCOUNT CODES -->
        <div id="ds-discounts" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;margin-top:2.5rem">
          <h2 class="sec-title">Discount <em>Codes</em></h2>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('discount-modal').classList.add('open')">+ Create Code</button>
        </div>
        <div id="dash-discounts"><div class="spin-wrap" style="padding:1.5rem"><div class="spin"></div></div></div>

        <!-- RECENT ORDERS -->
        ${recentOrders?.length ? `
          <h2 id="ds-orders" class="sec-title" style="margin:2.5rem 0 1.2rem">Recent <em>Orders</em></h2>
          <div class="tbl-wrap"><table>
            <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Revenue</th><th>Status</th></tr></thead>
            <tbody>${recentOrders.map(o=>`
              <tr>
                <td style="font-family:monospace;font-size:.72rem">${o.id.slice(0,8)}…</td>
                <td>${ago(o.createdAt)}</td>
                <td>${o.items.filter(i=>i.vendorId===vendor.id).length} item(s)</td>
                <td>$${o.items.filter(i=>i.vendorId===vendor.id).reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}</td>
                <td><span class="sbadge s-${o.status}">${o.status}</span></td>
              </tr>`).join('')}
            </tbody>
          </table></div>` : ''}

        <!-- RECENT REVIEWS WITH REPLY -->
        ${recentReviews?.length ? `
          <h2 id="ds-reviews" class="sec-title" style="margin:2.5rem 0 1.2rem">Recent <em>Reviews</em></h2>
          <div class="rgrid">${recentReviews.map(r => renderReviewCardWithReply(r, vendor.id)).join('')}</div>` : ''}

        <!-- SHIPPING STATS -->
        <div class="stat-row" style="margin-top:2rem">
          <div class="scard"><div class="scard-n">${stats.openShipments ?? 0}</div><div class="scard-l">Open Shipments</div></div>
          <div class="scard"><div class="scard-n">${stats.labelsPurchased ?? 0}</div><div class="scard-l">Labels Purchased</div></div>
          <div class="scard"><div class="scard-n">${stats.shipped ?? 0}</div><div class="scard-l">Shipped</div></div>
          <div class="scard"><div class="scard-n">${stats.delivered ?? 0}</div><div class="scard-l">Delivered</div></div>
          <div class="scard" style="display:flex;align-items:center;justify-content:center">
            <button class="btn btn-ghost btn-sm" onclick="openShippingProfile()">Shipping Profile</button>
          </div>
        </div>

        <!-- VERIFICATION -->
        ${vendor.verified ? '' : `
          <div class="card card-p" style="margin-top:2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
            <div>
              <div class="eyebrow">Trust &amp; Safety</div>
              <div class="display" style="font-size:1.35rem;margin-top:.25rem">Get verified</div>
              <div style="font-size:.82rem;color:var(--muted);margin-top:.35rem;line-height:1.6">Verified vendors earn customer trust and appear in featured sections.</div>
            </div>
            ${verificationRequest
              ? `<div style="text-align:right"><div class="sbadge s-pending">verification pending</div><div style="font-size:.78rem;color:var(--muted);margin-top:.35rem">Submitted ${ago(verificationRequest.createdAt)}</div></div>`
              : `<button class="btn btn-dark" onclick="openVerificationRequest()">Request verification →</button>`}
          </div>
        `}`;

      // Load async panels
      loadRevenueTrend();
      loadPayouts();
      loadDiscountCodes();

    } catch(e) {
      if (e.message === 'no_vendor') {
        el.innerHTML = `<div class="empty"><div class="empty-icon">🏪</div><h3>Set up your vendor profile</h3><p>Create your storefront to start selling on NailHaus.</p><button class="btn btn-dark" onclick="openCreateVendor()">Create Vendor Profile</button></div>`;
      } else {
        el.innerHTML = `<p style="color:var(--muted)">${e.message}</p>`;
      }
    }
  },

  /* ── ADMIN ── */
  async admin() {
    if (!Store.loggedIn()) { Nav.go('login'); return; }
    if (!Store.isAdmin()) { Nav.go('home'); Toast.show('Admin access required', 'err'); return; }
    await AdminUI.render();
  },

  /* ── CHECKOUT ── */
  checkout() {
    if (!Store.loggedIn()) { Nav.go('login'); Toast.show('Please sign in to checkout', 'err'); return; }
    const items = Store.cartItems();
    if (!items.length) { Nav.go('shop'); return; }
    window._discount = null;
    const msgEl = document.getElementById('co-discount-msg');
    const codeEl = document.getElementById('co-discount');
    if (msgEl) { msgEl.textContent = ''; msgEl.className = ''; }
    if (codeEl) codeEl.value = '';
    updateCheckoutSummary();
  },

  /* ── SELL ── */
  sell() {},

  /* ── POLICIES ── */
  shippingPolicy() {},
  returnsPolicy() {}
};

/* ─── ADD TO CART FROM DETAIL ─── */
function addProductToCart() {
  const p = window._product;
  if (!p) return;
  Store.addCart(p, window._qty || 1);
  CartUI.refresh();
  Toast.show(`${p.name} added to cart 🛍`);
}

/* ─── AUTH ─── */
async function doLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('l-email').value;
  const password = document.getElementById('l-pass').value;
  const errEl    = document.getElementById('login-err');
  const btn      = document.getElementById('l-btn');
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const { token, user } = await API.post('/auth/login', { email, password });
    Store.setAuth(token, user);
    renderNav();
    Toast.show(`Welcome back, ${user.name.split(' ')[0]}! 🌸`);
    Nav.go(user.role === 'vendor' ? 'dashboard' : 'home');
  } catch(err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

async function doRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('r-name').value;
  const email    = document.getElementById('r-email').value;
  const password = document.getElementById('r-pass').value;
  const role     = document.getElementById('r-role').value;
  const errEl    = document.getElementById('reg-err');
  const btn      = document.getElementById('r-btn');
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    const { token, user } = await API.post('/auth/register', { name, email, password, role });
    Store.setAuth(token, user);
    renderNav();
    Toast.show(`Welcome to NailHaus, ${user.name.split(' ')[0]}! 🌸`);
    Nav.go(role === 'vendor' ? 'dashboard' : 'home');
  } catch(err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

async function doCheckout(e) {
  e.preventDefault();
  const items   = Store.cartItems().map(i => ({ productId: i.id, qty: i.qty }));
  const name    = document.getElementById('co-name').value;
  const address = document.getElementById('co-addr').value;
  const city    = document.getElementById('co-city').value;
  const btn     = document.getElementById('co-btn');
  btn.disabled = true; btn.textContent = 'Placing order…';
  try {
    await API.post('/orders', { items, shippingAddress: { name, address, city }, discountId: window._discount?.discountId || null });
    window._discount = null;
    Store.clearCart(); CartUI.refresh();
    Toast.show('Order placed! 🎉 Check your account for details.');
    Nav.go('account');
  } catch(err) {
    Toast.show(err.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'Place Order →';
  }
}

/* ─── CHECKOUT SUMMARY UPDATE ─── */
function updateCheckoutSummary() {
  const items = Store.cartItems();
  const el = document.getElementById('co-items');
  if (!el) return;
  const subtotal = Store.cartTotal();
  const savings = window._discount?.savings || 0;
  const finalTotal = Math.max(0, subtotal - savings).toFixed(2);
  el.innerHTML = items.map(i=>`
    <div style="display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--linen);font-size:.86rem">
      <span>${i.emoji} ${i.name} ×${i.qty}</span>
      <span>$${(i.price*i.qty).toFixed(2)}</span>
    </div>`).join('') +
    (savings > 0 ? `
    <div style="display:flex;justify-content:space-between;padding:.5rem 0;font-size:.84rem;color:var(--success)">
      <span>Discount (${window._discount.code})</span>
      <span>−$${savings.toFixed(2)}</span>
    </div>` : '') +
    `<div style="display:flex;justify-content:space-between;padding:.85rem 0;font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:300;border-top:1px solid var(--linen)">
      <span>Total</span><span>$${finalTotal}</span>
    </div>`;
}

/* ─── APPLY DISCOUNT ─── */
async function applyDiscount() {
  const code = document.getElementById('co-discount')?.value?.trim();
  const msgEl = document.getElementById('co-discount-msg');
  if (!code) { msgEl.textContent = 'Please enter a discount code.'; msgEl.className = 'error'; return; }
  try {
    const result = await API.post('/discounts/apply', { code, cartTotal: Store.cartTotal() });
    window._discount = result;
    msgEl.textContent = `✓ ${result.code} applied — you save $${result.savings.toFixed(2)}!`;
    msgEl.className = 'success';
    updateCheckoutSummary();
  } catch(err) {
    msgEl.textContent = err.message;
    msgEl.className = 'error';
    window._discount = null;
    updateCheckoutSummary();
  }
}

/* ─── DISCOUNT CODES (VENDOR DASHBOARD) ─── */
async function loadDiscountCodes() {
  const el = document.getElementById('dash-discounts');
  if (!el) return;
  try {
    const codes = await API.get('/discounts/me');
    if (!codes.length) {
      el.innerHTML = `<div class="empty" style="padding:1.5rem 0"><div class="empty-icon" style="font-size:1.5rem">🏷️</div><h3 style="font-size:1rem">No discount codes yet</h3><p style="font-size:.82rem">Create codes to offer discounts to your customers.</p></div>`;
      return;
    }
    el.innerHTML = `<div class="tbl-wrap"><table>
      <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Max</th><th>Expires</th><th>Status</th><th></th></tr></thead>
      <tbody>${codes.map(c=>`
        <tr>
          <td style="font-family:monospace;font-weight:500">${c.code}</td>
          <td>${c.type}</td>
          <td>${c.type==='percent'?`${c.value}%`:`$${c.value}`}</td>
          <td>${c.usedCount}</td>
          <td>${c.maxUses}</td>
          <td>${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
          <td>${c.active ? '<span class="sbadge s-confirmed">active</span>' : '<span class="sbadge s-voided">inactive</span>'}</td>
          <td>${c.active ? `<button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:.25rem .6rem" onclick="deactivateCode('${c.id}')">Deactivate</button>` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  } catch(e) { el.innerHTML = `<p style="color:var(--muted);font-size:.82rem">${e.message}</p>`; }
}

async function submitDiscountCode() {
  const errEl = document.getElementById('dc-err');
  errEl.textContent = '';
  const code = document.getElementById('dc-code')?.value?.trim()?.toUpperCase();
  const type = document.getElementById('dc-type')?.value;
  const value = document.getElementById('dc-value')?.value;
  const maxUses = document.getElementById('dc-maxuses')?.value;
  const expiresAt = document.getElementById('dc-expires')?.value;
  if (!code || !type || !value || !maxUses) { errEl.textContent = 'All fields except expiry are required.'; return; }
  try {
    await API.post('/discounts', { code, type, value: parseFloat(value), maxUses: parseInt(maxUses), expiresAt: expiresAt || null });
    document.getElementById('discount-modal').classList.remove('open');
    Toast.show(`Discount code ${code} created!`);
    loadDiscountCodes();
  } catch(err) { errEl.textContent = err.message; }
}

async function deactivateCode(id) {
  try {
    await API.del(`/discounts/${id}`);
    Toast.show('Discount code deactivated.');
    loadDiscountCodes();
  } catch(e) { Toast.show(e.message, 'err'); }
}

/* ─── RESTOCK ALERTS ─── */
async function loadRestockStatus(productId) {
  if (!Store.loggedIn()) return;
  try {
    const { subscribed } = await API.get(`/products/${productId}/notify`);
    const btn = document.getElementById('restock-btn');
    if (btn) {
      btn.classList.toggle('subscribed', subscribed);
      btn.textContent = subscribed ? '🔕 Cancel restock alert' : '🔔 Notify me when back in stock';
      btn.onclick = () => toggleRestockAlert(productId, subscribed);
    }
  } catch {}
}

async function toggleRestockAlert(productId, currentlySubscribed) {
  if (!Store.loggedIn()) { Nav.go('login'); Toast.show('Sign in to set restock alerts', 'err'); return; }
  try {
    if (currentlySubscribed) {
      await API.del(`/products/${productId}/notify`);
      Toast.show('Restock alert removed.');
    } else {
      await API.post(`/products/${productId}/notify`, {});
      Toast.show('You\'ll be notified when this is back in stock!');
    }
    loadRestockStatus(productId);
  } catch(e) { Toast.show(e.message, 'err'); }
}

/* ─── ALSO LIKE SECTION ─── */
async function loadAlsoLike(currentId, shape, style) {
  const el = document.getElementById('also-like');
  if (!el) return;
  try {
    const params = new URLSearchParams({ limit: '5' });
    if (shape) params.set('shape', shape);
    if (style) params.set('style', style);
    const products = await API.get('/products?' + params);
    const filtered = products.filter(p => p.id !== currentId).slice(0, 4);
    if (!filtered.length) return;
    el.innerHTML = `
      <h2 class="sec-title" style="margin-bottom:1.5rem">You Might Also <em>Like</em></h2>
      <div class="pgrid">${filtered.map(renderProductCard).join('')}</div>`;
  } catch {}
}

/* ─── FOLLOW VENDORS ─── */
function toggleFollow(e, vendorId) {
  e.stopPropagation();
  const nowFollowing = Store.toggleFollow(vendorId);
  // Update all follow buttons for this vendor
  document.querySelectorAll(`[data-vid="${vendorId}"].follow-btn`).forEach(btn => {
    btn.classList.toggle('following', nowFollowing);
    btn.textContent = nowFollowing ? '♥ Following' : '♡ Follow';
  });
  const heroBtn = document.getElementById('vendor-follow-btn');
  if (heroBtn) {
    heroBtn.classList.toggle('following', nowFollowing);
    heroBtn.textContent = nowFollowing ? '♥ Following' : '♡ Follow';
  }
  Toast.show(nowFollowing ? 'Now following this vendor! 💕' : 'Unfollowed.');
  // Refresh following section on account page if visible
  const accFollowing = document.getElementById('acc-following');
  if (accFollowing) renderFollowing();
}

function renderFollowing() {
  const el = document.getElementById('acc-following');
  if (!el) return;
  const ids = Store._followedVendors();
  if (!ids.length) {
    el.innerHTML = `<p style="font-size:.84rem;color:var(--muted)">You're not following any vendors yet. Browse vendors and click Follow to save your favorites.</p><button class="btn btn-ghost btn-sm" style="margin-top:.6rem" onclick="Nav.go('vendors')">Browse Vendors →</button>`;
    return;
  }
  // Load vendor data
  API.get('/vendors').then(vendors => {
    const followed = vendors.filter(v => ids.includes(v.id));
    if (!followed.length) {
      el.innerHTML = `<p style="font-size:.84rem;color:var(--muted)">Your followed vendors have been removed.</p>`;
      return;
    }
    el.innerHTML = `<div class="following-grid">${followed.map(v => `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.7rem;background:var(--linen);border-radius:var(--r-sm);cursor:pointer" onclick="Nav.go('vendor','${v.id}')">
        <div style="width:40px;height:40px;border-radius:50%;background:${v.bgColor};display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">${v.emoji}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.88rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.name}</div>
          <div style="font-size:.7rem;color:var(--muted)">⭐${v.rating} · ${v.totalProducts} sets</div>
        </div>
        <button class="follow-btn following" data-vid="${v.id}" onclick="toggleFollow(event,'${v.id}')" style="flex-shrink:0">♥</button>
      </div>`).join('')}
    </div>`;
  }).catch(() => {
    el.innerHTML = `<p style="font-size:.84rem;color:var(--muted)">Could not load followed vendors.</p>`;
  });
}

/* ─── ORDER AGAIN ─── */
function orderAgain(orderId) {
  const items = window._orderItems?.[orderId] || [];
  if (!items.length) { Toast.show('Could not find order items', 'err'); return; }
  items.forEach(item => {
    if (item.product) Store.addCart(item.product, item.qty);
  });
  CartUI.refresh();
  Toast.show('Items added to cart! 🛍');
}

/* ─── DISPUTE ─── */
function openDispute(orderId) {
  if (!Store.loggedIn()) { Nav.go('login'); return; }
  document.getElementById('dp-order-id').value = orderId;
  document.getElementById('dp-reason').value = '';
  document.getElementById('dp-details').value = '';
  document.getElementById('dp-err').textContent = '';
  document.getElementById('dispute-modal').classList.add('open');
}

async function submitDispute() {
  const orderId = document.getElementById('dp-order-id').value;
  const reason = document.getElementById('dp-reason').value;
  const details = document.getElementById('dp-details').value;
  const errEl = document.getElementById('dp-err');
  errEl.textContent = '';
  if (!reason) { errEl.textContent = 'Please choose a reason.'; return; }
  try {
    await API.post(`/orders/${orderId}/dispute`, { reason, details });
    document.getElementById('dispute-modal').classList.remove('open');
    Toast.show('Dispute submitted. Our team will review within 48 hours.');
  } catch(e) { errEl.textContent = e.message; }
}

/* ─── OCCASION FILTER ─── */
function setOccasion(occ, el) {
  _selectedOccasion = occ;
  document.querySelectorAll('.occ-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  Pages.shop();
}

/* ─── REVIEW PHOTO ─── */
function handleReviewPhoto(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { Toast.show('Photo must be under 2MB', 'err'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const preview = document.getElementById('rv-photo-preview');
    preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--r-sm)">
      <button onclick="clearReviewPhoto(event)" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.5);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:.7rem">✕</button>`;
    preview.style.padding = '0';
    preview.style.position = 'relative';
    window._reviewPhoto = dataUrl;
  };
  reader.readAsDataURL(file);
}

function clearReviewPhoto(e) {
  e.stopPropagation();
  document.getElementById('rv-photo-preview').innerHTML = '<span style="font-size:1.4rem">📷</span><span style="font-size:.78rem;color:var(--muted)">Tap to add a photo</span>';
  document.getElementById('rv-photo-preview').style.padding = '';
  document.getElementById('rv-photo-input').value = '';
  window._reviewPhoto = null;
}

/* ─── SIZE QUIZ / NAIL PROFILE ─── */
let _sq = { shape: null, width: null, length: null };

function selectShape(btn, shape) {
  document.querySelectorAll('#sq-shape .shape-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _sq.shape = shape;
}

function selectSize(btn, value, groupId) {
  document.querySelectorAll(`#${groupId} .size-opt`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (groupId === 'sq-width') _sq.width = value;
  if (groupId === 'sq-length') _sq.length = value;
}

function loadSizeQuiz() {
  const p = Store.nailProfile();
  if (!p) return;
  _sq = { shape: p.shape, width: p.width, length: p.length };
  if (p.shape) {
    const btn = document.querySelector(`#sq-shape .shape-opt[onclick*="${p.shape}"]`);
    if (btn) { document.querySelectorAll('#sq-shape .shape-opt').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); }
  }
  if (p.width) {
    const btn = document.querySelector(`#sq-width .size-opt[onclick*="'${p.width}'"]`);
    if (btn) { document.querySelectorAll('#sq-width .size-opt').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); }
  }
  if (p.length) {
    const btn = document.querySelector(`#sq-length .size-opt[onclick*="'${p.length}'"]`);
    if (btn) { document.querySelectorAll('#sq-length .size-opt').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); }
  }
  const occs = p.occasions || [];
  document.querySelectorAll('.sq-occ').forEach(cb => { cb.checked = occs.includes(cb.value); });
}

function saveSizeProfile() {
  const occasions = Array.from(document.querySelectorAll('.sq-occ:checked')).map(cb => cb.value);
  const profile = { shape: _sq.shape, width: _sq.width, length: _sq.length, occasions };
  Store.saveNailProfile(profile);
  document.getElementById('size-quiz-modal').classList.remove('open');
  Toast.show('Nail profile saved! 💅');
  renderNailProfile();
}

function renderNailProfile() {
  const el = document.getElementById('nail-profile-display');
  if (!el) return;
  const p = Store.nailProfile();
  if (!p || (!p.shape && !p.width && !p.length)) {
    el.innerHTML = `<p style="font-size:.84rem;color:var(--muted)">Tell us your nail preferences to get better matches.</p><button class="btn btn-ghost btn-sm" style="margin-top:.6rem" onclick="document.getElementById('size-quiz-modal').classList.add('open');loadSizeQuiz()">Set up profile →</button>`;
    return;
  }
  const shapeLabel = { almond:'🌙 Almond', coffin:'⬛ Coffin', stiletto:'🗡️ Stiletto', square:'◼ Square', round:'⭕ Round' };
  const widthLabel = { narrow:'XS · Narrow', small:'S · Small', medium:'M · Medium', wide:'L · Wide', 'extra-wide':'XL · Extra Wide' };
  const lengthLabel = { short:'Short', medium:'Medium', long:'Long', 'extra-long':'Extra Long' };
  el.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:.6rem;margin-bottom:.6rem">
      ${p.shape  ? `<span class="ptag">${shapeLabel[p.shape]  || p.shape}</span>`  : ''}
      ${p.width  ? `<span class="ptag">${widthLabel[p.width]  || p.width}</span>`  : ''}
      ${p.length ? `<span class="ptag">${lengthLabel[p.length]|| p.length}</span>` : ''}
      ${(p.occasions||[]).map(o => `<span class="ptag occ-tag">${o}</span>`).join('')}
    </div>
    <p style="font-size:.76rem;color:var(--muted)">We use your profile to surface sets that match your style and fit.</p>`;
}

/* ─── VENDOR COLLECTIONS ─── */
function openCreateCollection() {
  document.getElementById('col-name').value = '';
  document.getElementById('col-desc').value = '';
  document.getElementById('col-err').textContent = '';
  document.getElementById('create-collection-modal').classList.add('open');
}

async function submitCreateCollection() {
  const name = document.getElementById('col-name').value.trim();
  const desc = document.getElementById('col-desc').value.trim();
  const errEl = document.getElementById('col-err');
  if (!name) { errEl.textContent = 'Collection name is required.'; return; }
  try {
    await API.post('/vendors/me/collections', { name, description: desc });
    document.getElementById('create-collection-modal').classList.remove('open');
    Toast.show(`Collection "${name}" created!`);
    Pages.dashboard();
  } catch(e) { errEl.textContent = e.message; }
}

async function deleteCollection(collectionId) {
  if (!confirm('Delete this collection? Products will stay but lose their collection grouping.')) return;
  try {
    await API.del(`/vendors/me/collections/${collectionId}`);
    Toast.show('Collection deleted.');
    Pages.dashboard();
  } catch(e) { Toast.show(e.message, 'err'); }
}

async function assignProductToCollection(collectionId, collectionName) {
  try {
    const d = await API.get('/vendors/me/dashboard');
    const products = d.products;
    if (!products.length) { Toast.show('No products to assign', 'err'); return; }
    const options = products.map((p, i) => `${i + 1}. ${p.emoji} ${p.name}${p.collectionId === collectionId ? ' (already in this collection)' : ''}`).join('\n');
    const input = prompt(`Assign to "${collectionName}".\nEnter product numbers separated by commas:\n\n${options}`);
    if (!input) return;
    const indices = input.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < products.length);
    if (!indices.length) return;
    await Promise.all(indices.map(i => API.put(`/products/${products[i].id}`, { ...products[i], collectionId })));
    Toast.show(`${indices.length} product${indices.length>1?'s':''} assigned!`);
    Pages.dashboard();
  } catch(e) { Toast.show(e.message, 'err'); }
}

/* ─── REVENUE TREND CHART ─── */
async function loadRevenueTrend() {
  const el = document.getElementById('revenue-chart');
  if (!el) return;
  try {
    const days = await API.get('/vendors/me/revenue-trend');
    const max = Math.max(...days.map(d => d.rev), 1);
    const nonZero = days.filter(d => d.rev > 0);
    const total = days.reduce((s, d) => s + d.rev, 0);
    el.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:2px;height:80px;margin-bottom:.5rem">
        ${days.map(d => `
          <div title="${d.label}: $${d.rev.toFixed(2)}"
               style="flex:1;background:${d.rev > 0 ? 'var(--accent)' : 'var(--linen)'};
                      height:${d.rev > 0 ? Math.max(4, Math.round((d.rev/max)*80)) : 2}px;
                      border-radius:2px 2px 0 0;transition:height .3s;cursor:default;opacity:${d.rev>0?1:.4}">
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.66rem;color:var(--muted)">
        <span>${days[0]?.label}</span><span>Today</span>
      </div>
      <div style="margin-top:.8rem;display:flex;gap:1.5rem;flex-wrap:wrap">
        <div><div style="font-family:'Cormorant Garamond',serif;font-size:1.5rem">$${total.toFixed(0)}</div><div style="font-size:.68rem;color:var(--muted)">30-day gross</div></div>
        <div><div style="font-family:'Cormorant Garamond',serif;font-size:1.5rem">${nonZero.length}</div><div style="font-size:.68rem;color:var(--muted)">active days</div></div>
        <div><div style="font-family:'Cormorant Garamond',serif;font-size:1.5rem">$${nonZero.length ? (total/nonZero.length).toFixed(0) : 0}</div><div style="font-size:.68rem;color:var(--muted)">avg/day</div></div>
      </div>`;
  } catch { if (el) el.innerHTML = '<p style="color:var(--muted);font-size:.82rem">Could not load chart</p>'; }
}

/* ─── PAYOUTS ─── */
async function loadPayouts() {
  const el = document.getElementById('payouts-content');
  if (!el) return;
  try {
    const p = await API.get('/vendors/me/payouts');
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem">
        <div style="background:var(--linen);border-radius:var(--r-sm);padding:.9rem 1rem">
          <div style="font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">Pending payout</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:1.6rem">$${p.pendingNet}</div>
          <div style="font-size:.7rem;color:var(--muted);margin-top:.2rem">Est. ${p.nextPayoutDate}</div>
        </div>
        <div style="background:var(--linen);border-radius:var(--r-sm);padding:.9rem 1rem">
          <div style="font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">Lifetime net</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:1.6rem">$${p.lifetimeNet}</div>
          <div style="font-size:.7rem;color:var(--muted);margin-top:.2rem">${Math.round(p.feeRate*100)}% platform fee</div>
        </div>
      </div>
      ${p.history.length ? `
        <div style="font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem">Payout history</div>
        <div class="tbl-wrap"><table style="font-size:.78rem">
          <thead><tr><th>Week of</th><th>Gross</th><th>Fee</th><th>Net</th></tr></thead>
          <tbody>${p.history.map(w=>`
            <tr>
              <td>${w.weekOf}</td>
              <td>$${w.gross}</td>
              <td style="color:var(--muted)">−$${w.fee}</td>
              <td style="font-weight:500;color:var(--success)">$${w.net}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : '<p style="font-size:.82rem;color:var(--muted)">No payout history yet.</p>'}`;
  } catch { if (el) el.innerHTML = '<p style="color:var(--muted);font-size:.82rem">Could not load payouts</p>'; }
}

/* ─── MARK AS SHIPPED ─── */
let _shipState = { orderId: null, card: null };

function openMarkShipped(orderId, btn) {
  _shipState = { orderId, card: btn?.closest('.card') };
  document.getElementById('ship-tracking').value = '';
  document.getElementById('ship-err').textContent = '';
  document.getElementById('shipped-modal').classList.add('open');
}

async function submitMarkShipped() {
  const { orderId, card } = _shipState;
  const tracking = document.getElementById('ship-tracking').value.trim();
  const carrier = document.getElementById('ship-carrier').value;
  const errEl = document.getElementById('ship-err');
  try {
    await API.put(`/orders/${orderId}/mark-shipped`, { trackingNumber: tracking, carrier });
    document.getElementById('shipped-modal').classList.remove('open');
    Toast.show('Order marked as shipped!');
    if (card) { card.style.opacity = '0'; card.style.transform = 'translateY(-8px)'; setTimeout(() => card.remove(), 300); }
  } catch(err) { errEl.textContent = err.message; }
}

/* ─── PROMO / SALE TOOL ─── */
let _promoState = { productId: null, currentPrice: null };

function openPromo(productId, productName, currentPrice) {
  _promoState = { productId, currentPrice };
  document.getElementById('promo-product-name').textContent = `"${productName}" — currently $${currentPrice}`;
  document.getElementById('promo-hint').textContent = `Sale price must be less than $${currentPrice}`;
  document.getElementById('promo-price').value = '';
  document.getElementById('promo-err').textContent = '';
  document.getElementById('promo-modal').classList.add('open');
}

async function submitPromo() {
  const { productId, currentPrice } = _promoState;
  const sp = parseFloat(document.getElementById('promo-price').value);
  const errEl = document.getElementById('promo-err');
  if (!sp || isNaN(sp)) { errEl.textContent = 'Enter a valid sale price.'; return; }
  if (sp >= currentPrice) { errEl.textContent = `Sale price must be less than $${currentPrice}.`; return; }
  try {
    await API.put(`/products/${productId}`, { price: sp, originalPrice: currentPrice, badge: 'sale' });
    document.getElementById('promo-modal').classList.remove('open');
    Toast.show(`Sale applied! Now $${sp}`);
    Pages.dashboard();
  } catch(e) { errEl.textContent = e.message; }
}

async function endSale(productId) {
  try {
    const p = await API.get(`/products/${productId}`);
    await API.put(`/products/${productId}`, { price: p.originalPrice, originalPrice: null, badge: null });
    Toast.show('Sale ended — price restored.');
    Pages.dashboard();
  } catch(e) { Toast.show(e.message,'err'); }
}

/* ─── REVIEW WITH REPLY ─── */
function renderReviewCardWithReply(r, vendorId) {
  const isVendorView = !!vendorId;
  return `
  <div class="rcard">
    <div class="rcard-top">
      <div class="rav">${avatar(r.id)}</div>
      <div>
        <div class="rname">${r.user?.name || 'Anonymous'}</div>
        <div class="rmeta">${stars(r.rating)} · ${ago(r.createdAt)}</div>
      </div>
    </div>
    ${r.title ? `<div style="font-size:.86rem;font-weight:500;margin-bottom:.35rem">${r.title}</div>` : ''}
    <p class="rbody">"${r.body}"</p>
    ${r.product ? `<div class="rproduct">💅 ${r.product.name}</div>` : ''}
    ${r.photo ? `<div class="review-photo-wrap"><img src="${r.photo}" class="review-photo" onclick="this.classList.toggle('review-photo-large')" alt="Customer photo"></div>` : ''}
    ${r.vendorReply ? `
      <div class="vendor-reply">
        <div class="vr-label">✦ Vendor reply · ${ago(r.vendorReplyAt)}</div>
        <p class="vr-body">${r.vendorReply}</p>
      </div>` : (isVendorView ? `
      <div style="margin-top:.7rem">
        <button class="btn btn-ghost btn-sm" style="font-size:.72rem" onclick="openReplyModal('${r.id}',this)">Reply to review</button>
      </div>` : '')}
  </div>`;
}

function openReplyModal(reviewId, btn) {
  const reply = prompt('Write your reply to this review:');
  if (!reply?.trim()) return;
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Posting…';
  API.post(`/reviews/${reviewId}/reply`, { reply })
    .then(() => {
      Toast.show('Reply posted!');
      Pages.dashboard();
    })
    .catch(e => { Toast.show(e.message, 'err'); btn.disabled = false; btn.textContent = orig; });
}

/* ─── EDIT STOREFRONT MODAL ─── */
function openEditStorefront() {
  // Reuse the create-vendor modal but pre-fill with existing data
  API.get('/vendors/me/dashboard').then(d => {
    const v = d.vendor;
    const modal = document.getElementById('edit-storefront-modal');
    if (!modal) return;
    modal.querySelector('[name="name"]').value        = v.name || '';
    modal.querySelector('[name="tagline"]').value     = v.tagline || '';
    modal.querySelector('[name="description"]').value = v.description || '';
    modal.querySelector('[name="emoji"]').value       = v.emoji || '';
    modal.querySelector('[name="bgColor"]').value     = v.bgColor || '#fde8e8';
    modal.querySelector('[name="tags"]').value        = (v.tags||[]).join(', ');
    modal.querySelector('[name="instagram"]').value   = v.socialLinks?.instagram || '';
    modal.querySelector('[name="tiktok"]').value      = v.socialLinks?.tiktok || '';
    modal.querySelector('[name="announcement"]').value = v.announcement || '';
    modal.classList.add('open');
  }).catch(e => Toast.show(e.message, 'err'));
}

async function saveStorefront() {
  const modal = document.getElementById('edit-storefront-modal');
  const f = modal;
  const name        = f.querySelector('[name="name"]').value.trim();
  const tagline     = f.querySelector('[name="tagline"]').value.trim();
  const description = f.querySelector('[name="description"]').value.trim();
  const emoji       = f.querySelector('[name="emoji"]').value.trim();
  const bgColor     = f.querySelector('[name="bgColor"]').value;
  const tags        = f.querySelector('[name="tags"]').value.split(',').map(t=>t.trim()).filter(Boolean);
  const instagram   = f.querySelector('[name="instagram"]').value.trim();
  const tiktok      = f.querySelector('[name="tiktok"]').value.trim();
  const announcement = f.querySelector('[name="announcement"]').value.trim();
  if (!name) { Toast.show('Brand name is required','err'); return; }
  try {
    await API.put('/vendors/me', { name, tagline, description, emoji, bgColor, tags, socialLinks: { instagram, tiktok }, announcement });
    modal.classList.remove('open');
    Toast.show('Storefront updated!');
    Pages.dashboard();
  } catch(e) { Toast.show(e.message,'err'); }
}

/* ─── REVIEW MODAL ─── */
function openReviewModal(productId) {
  document.getElementById('rv-pid').value = productId;
  document.getElementById('rv-err').textContent = '';
  document.getElementById('review-modal').classList.add('open');
}

async function submitReview() {
  const pid    = document.getElementById('rv-pid').value;
  const rating = document.getElementById('rv-rating').value;
  const title  = document.getElementById('rv-title').value;
  const body   = document.getElementById('rv-body').value;
  const errEl  = document.getElementById('rv-err');
  errEl.textContent = '';
  if (!rating || !body.trim()) { errEl.textContent = 'Rating and review text are required.'; return; }
  try {
    await API.post('/reviews', { productId: pid, rating: parseInt(rating), title, body, photo: window._reviewPhoto || null });
    window._reviewPhoto = null;
    // Reset form
    document.getElementById('rv-rating').value = '';
    document.getElementById('rv-title').value = '';
    document.getElementById('rv-body').value = '';
    document.getElementById('rv-photo-input').value = '';
    const preview = document.getElementById('rv-photo-preview');
    if (preview) {
      preview.innerHTML = '<span style="font-size:1.4rem">📷</span><span style="font-size:.78rem;color:var(--muted)">Tap to add a photo</span>';
      preview.style.padding = '';
      preview.style.position = '';
    }
    document.getElementById('review-modal').classList.remove('open');
    Toast.show('Review submitted! Thank you 💅');
    Pages.product(pid);
  } catch(err) { errEl.textContent = err.message; }
}

/* ─── ADD PRODUCT MODAL ─── */
function openAddProduct() {
  document.getElementById('ap-err').textContent = '';
  // Populate collection dropdown
  API.get('/vendors/me/collections').then(cols => {
    const sel = document.getElementById('ap-collection');
    if (!sel) return;
    sel.innerHTML = '<option value="">No collection</option>' + cols.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }).catch(() => {});
  document.getElementById('add-product-modal').classList.add('open');
}

async function submitProduct() {
  const f   = document.getElementById('ap-form');
  const get = (n) => f.querySelector(`[name=${n}]`)?.value;
  const errEl = document.getElementById('ap-err');
  errEl.textContent = '';
  const occasions = Array.from(f.querySelectorAll('[name^="occ_"]:checked')).map(cb => cb.value);
  const data = {
    name: get('name'), description: get('description'),
    price: get('price'), originalPrice: get('originalPrice') || null,
    emoji: get('emoji') || '💅', bgColor: get('bgColor') || '#fde8e8',
    shape: get('shape'), style: get('style'), badge: get('badge') || null,
    stock: get('stock') || 10,
    tags: (get('tags') || '').split(',').map(t=>t.trim()).filter(Boolean),
    availability: get('availability') || 'in_stock',
    productionDays: get('productionDays') ? parseInt(get('productionDays')) : null,
    occasions,
    collectionId: get('collectionId') || null,
    nailCount: get('nailCount') ? parseInt(get('nailCount')) : null,
    sizes: get('sizes') || '',
    finish: get('finish') || '',
    glueIncluded: get('glueIncluded') === 'true' ? true : get('glueIncluded') === 'false' ? false : null,
    reusable: get('reusable') === 'yes' ? true : get('reusable') === 'no' ? false : null,
    wearTime: get('wearTime') || '',
  };
  if (!data.name || !data.price) { errEl.textContent = 'Name and price are required.'; return; }
  try {
    await API.post('/products', data);
    document.getElementById('add-product-modal').classList.remove('open');
    Toast.show('Product added successfully! 🌸');
    f.reset();
    Pages.dashboard();
  } catch(err) { errEl.textContent = err.message; }
}

/* ─── CREATE VENDOR MODAL ─── */
function openCreateVendor() {
  document.getElementById('cv-err').textContent = '';
  document.getElementById('create-vendor-modal').classList.add('open');
}

async function submitVendor() {
  const f   = document.getElementById('cv-form');
  const get = (n) => f.querySelector(`[name=${n}]`)?.value;
  const errEl = document.getElementById('cv-err');
  errEl.textContent = '';
  const data = {
    name: get('name'), tagline: get('tagline'), description: get('description'),
    emoji: get('emoji') || '💅', bgColor: get('bgColor') || '#fde8e8',
    tags: get('tags').split(',').map(t=>t.trim()).filter(Boolean)
  };
  if (!data.name) { errEl.textContent = 'Brand name is required.'; return; }
  try {
    await API.post('/vendors', data);
    document.getElementById('create-vendor-modal').classList.remove('open');
    Toast.show('Vendor profile created! Welcome to NailHaus 🌸');
    const u = Store.user(); u.role = 'vendor'; Store.setAuth(Store.token(), u);
    renderNav();
    f.reset();
    Pages.dashboard();
  } catch(err) { errEl.textContent = err.message; }
}

/* ─── SHIPPING PROFILE ─── */
async function openShippingProfile() {
  const modal = document.getElementById('shipping-profile-modal');
  const f = document.getElementById('sp-form');
  const errEl = document.getElementById('sp-err');
  errEl.textContent = '';
  modal.classList.add('open');
  try {
    const prof = await API.get('/vendors/me/shipping');
    const sf = prof?.shipFrom || {};
    ['name','company','street1','street2','city','state','zip','country','phone','email'].forEach(k => {
      const el = f.querySelector(`[name=${k}]`);
      if (el) el.value = sf[k] || (k === 'country' ? 'US' : '');
    });
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function saveShippingProfile() {
  const f = document.getElementById('sp-form');
  const errEl = document.getElementById('sp-err');
  errEl.textContent = '';
  const get = (n) => f.querySelector(`[name=${n}]`)?.value?.trim();

  const shipFrom = {
    name: get('name'),
    company: get('company'),
    street1: get('street1'),
    street2: get('street2'),
    city: get('city'),
    state: get('state'),
    zip: get('zip'),
    country: get('country') || 'US',
    phone: get('phone'),
    email: get('email')
  };

  if (!shipFrom.street1 || !shipFrom.city || !shipFrom.state || !shipFrom.zip) {
    errEl.textContent = 'Street, city, state, and ZIP are required.';
    return;
  }

  try {
    const current = await API.get('/vendors/me/shipping');
    const next = {
      shipFrom,
      parcels: current?.parcels || [],
      defaultParcelId: current?.defaultParcelId || (current?.parcels?.[0]?.id || null),
      preferences: current?.preferences || { carrier: '', servicelevel: '' }
    };
    await API.put('/vendors/me/shipping', next);
    document.getElementById('shipping-profile-modal').classList.remove('open');
    Toast.show('Shipping profile saved');
    Pages.dashboard();
  } catch (e) {
    errEl.textContent = e.message;
  }
}

/* ─── LABEL FLOW ─── */
let _labelState = { orderId: null, shipmentId: null, rates: [] };

function closeLabelModal() {
  document.getElementById('label-modal').classList.remove('open');
  document.getElementById('lb-err').textContent = '';
  document.getElementById('label-body').innerHTML = '';
  _labelState = { orderId: null, shipmentId: null, rates: [] };
}

async function openLabelFlow(orderId) {
  const modal = document.getElementById('label-modal');
  const body = document.getElementById('label-body');
  const errEl = document.getElementById('lb-err');
  errEl.textContent = '';
  modal.classList.add('open');
  body.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';

  _labelState.orderId = orderId;
  try {
    const shipment = await API.post('/shipments', { orderId });
    _labelState.shipmentId = shipment.id;
    renderLabelStepEdit(shipment);
  } catch (e) {
    body.innerHTML = '';
    errEl.textContent = e.message;
  }
}

function renderLabelStepEdit(shipment) {
  const body = document.getElementById('label-body');
  const from = shipment.fromAddress || {};
  const to = shipment.toAddress || {};
  const p = shipment.parcel || { length: 9, width: 6, height: 0.5, distance_unit: 'in', weight: 3, mass_unit: 'oz' };

  body.innerHTML = `
    <div class="card card-p" style="margin-bottom:1rem">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
        <div>
          <div style="font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Shipment draft</div>
          <div style="font-family:monospace;font-size:.76rem;margin-top:.25rem">${shipment.id.slice(0,8)}…</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="openShippingProfile()">Edit ship-from profile</button>
      </div>
    </div>

    <div class="co-grid" style="grid-template-columns:1fr 1fr">
      <div class="card card-p">
        <h3 class="display" style="font-size:1.25rem;margin-bottom:1rem">Ship-from</h3>
        <div style="font-size:.82rem;color:var(--muted);line-height:1.7">
          ${from.company || from.name || '—'}<br>
          ${from.street1 ? `${from.street1}${from.street2 ? `, ${from.street2}` : ''}` : 'Missing address'}<br>
          ${[from.city, from.state, from.zip].filter(Boolean).join(' ')}<br>
          ${from.country || ''}
        </div>
      </div>
      <div class="card card-p">
        <h3 class="display" style="font-size:1.25rem;margin-bottom:1rem">Ship-to</h3>
        <div class="fgroup">
          <label class="flabel">Name</label>
          <input id="lb-to-name" class="finput" value="${escapeHtml(to.name || '')}">
        </div>
        <div class="fgroup">
          <label class="flabel">Street</label>
          <input id="lb-to-street1" class="finput" value="${escapeHtml(to.street1 || '')}">
        </div>
        <div class="frow">
          <div class="fgroup">
            <label class="flabel">City</label>
            <input id="lb-to-city" class="finput" value="${escapeHtml(to.city || '')}">
          </div>
          <div class="fgroup">
            <label class="flabel">State</label>
            <input id="lb-to-state" class="finput" value="${escapeHtml(to.state || '')}">
          </div>
        </div>
        <div class="frow">
          <div class="fgroup">
            <label class="flabel">ZIP</label>
            <input id="lb-to-zip" class="finput" value="${escapeHtml(to.zip || '')}">
          </div>
          <div class="fgroup">
            <label class="flabel">Country</label>
            <input id="lb-to-country" class="finput" value="${escapeHtml(to.country || 'US')}">
          </div>
        </div>
      </div>
    </div>

    <div class="card card-p" style="margin-top:1rem">
      <h3 class="display" style="font-size:1.25rem;margin-bottom:1rem">Package</h3>
      <div class="frow" style="grid-template-columns:1fr 1fr 1fr">
        <div class="fgroup">
          <label class="flabel">Length (in)</label>
          <input id="lb-len" type="number" step="0.1" class="finput" value="${p.length}">
        </div>
        <div class="fgroup">
          <label class="flabel">Width (in)</label>
          <input id="lb-wid" type="number" step="0.1" class="finput" value="${p.width}">
        </div>
        <div class="fgroup">
          <label class="flabel">Height (in)</label>
          <input id="lb-ht" type="number" step="0.1" class="finput" value="${p.height}">
        </div>
      </div>
      <div class="frow">
        <div class="fgroup">
          <label class="flabel">Weight (oz)</label>
          <input id="lb-wt" type="number" step="0.1" class="finput" value="${p.weight}">
        </div>
        <div class="fgroup">
          <label class="flabel">Label format</label>
          <input class="finput" value="PDF" disabled>
        </div>
      </div>
      <button class="btn btn-dark btn-full" onclick="fetchRates()">Get Rates →</button>
      <div id="lb-rates" style="margin-top:1rem"></div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function readToAddressFromModal() {
  return {
    name: document.getElementById('lb-to-name')?.value?.trim() || '',
    street1: document.getElementById('lb-to-street1')?.value?.trim() || '',
    street2: '',
    city: document.getElementById('lb-to-city')?.value?.trim() || '',
    state: document.getElementById('lb-to-state')?.value?.trim() || '',
    zip: document.getElementById('lb-to-zip')?.value?.trim() || '',
    country: document.getElementById('lb-to-country')?.value?.trim() || 'US',
    phone: '',
    email: ''
  };
}

function readParcelFromModal() {
  return {
    length: parseFloat(document.getElementById('lb-len')?.value || '0'),
    width: parseFloat(document.getElementById('lb-wid')?.value || '0'),
    height: parseFloat(document.getElementById('lb-ht')?.value || '0'),
    distance_unit: 'in',
    weight: parseFloat(document.getElementById('lb-wt')?.value || '0'),
    mass_unit: 'oz'
  };
}

async function fetchRates() {
  const errEl = document.getElementById('lb-err');
  errEl.textContent = '';
  const ratesEl = document.getElementById('lb-rates');
  ratesEl.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';

  try {
    const toAddress = readToAddressFromModal();
    const parcel = readParcelFromModal();
    const sid = _labelState.shipmentId;
    await API.put(`/shipments/${sid}`, { toAddress, parcel });
    const { rates } = await API.post(`/shipments/${sid}/rates`, { parcel });
    _labelState.rates = rates || [];
    renderRates();
  } catch (e) {
    ratesEl.innerHTML = '';
    errEl.textContent = e.message;
  }
}

function renderRates() {
  const ratesEl = document.getElementById('lb-rates');
  const rates = _labelState.rates || [];
  if (!rates.length) {
    ratesEl.innerHTML = `<div style="color:var(--muted);font-size:.82rem">No rates available.</div>`;
    return;
  }

  ratesEl.innerHTML = `
    <div style="font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.6rem">Choose a rate</div>
    ${rates.slice(0, 8).map((r, idx) => `
      <label style="display:flex;gap:.7rem;align-items:flex-start;padding:.7rem .9rem;border:1px solid var(--linen);border-radius:var(--r-md);margin-bottom:.6rem;cursor:pointer">
        <input type="radio" name="lb-rate" value="${r.id}" ${idx === 0 ? 'checked' : ''} style="margin-top:.25rem">
        <div style="flex:1">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap">
            <div style="font-size:.9rem">${r.carrier} · ${r.servicelevel}</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:1.2rem">$${Number(r.amount).toFixed(2)}</div>
          </div>
          <div style="font-size:.76rem;color:var(--muted);margin-top:.15rem">${r.durationTerms || (r.estimatedDays ? `${r.estimatedDays} day(s)` : '')}</div>
        </div>
      </label>`).join('')}
    <button class="btn btn-dark btn-full" onclick="buyLabel()">Buy Label →</button>
  `;
}

async function buyLabel() {
  const errEl = document.getElementById('lb-err');
  errEl.textContent = '';
  const sel = document.querySelector('input[name="lb-rate"]:checked');
  const rateId = sel?.value;
  if (!rateId) { errEl.textContent = 'Please choose a rate.'; return; }

  const body = document.getElementById('label-body');
  const sid = _labelState.shipmentId;
  body.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';

  try {
    const out = await API.post(`/shipments/${sid}/label`, { rateId });
    const labelUrl = out?.shippo?.labelUrl || '';
    const tracking = out?.shippo?.trackingNumber || '';
    body.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🏷️</div>
        <h3>Label purchased</h3>
        <p style="max-width:520px">
          Tracking: <span style="font-family:monospace">${tracking || '—'}</span>
          ${labelUrl ? `<br><a href="${labelUrl}" target="_blank" rel="noreferrer" style="color:var(--accent)">Open label (PDF)</a>` : ''}
        </p>
        <div style="display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap;margin-top:1rem">
          <button class="btn btn-dark" onclick="closeLabelModal();Pages.dashboard();">Done</button>
          ${labelUrl ? `<a class="btn btn-ghost" href="${labelUrl}" target="_blank" rel="noreferrer">Print label</a>` : ''}
        </div>
      </div>
    `;
    Toast.show('Label created');
  } catch (e) {
    errEl.textContent = e.message;
    body.innerHTML = `<p style="color:var(--muted)">${e.message}</p>`;
  }
}

async function loadAllShipments() {
  const modal = document.getElementById('label-modal');
  const body = document.getElementById('label-body');
  const errEl = document.getElementById('lb-err');
  errEl.textContent = '';
  modal.classList.add('open');
  body.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';

  try {
    const shipments = await API.get('/shipments/me');
    body.innerHTML = `
      <div class="tbl-wrap"><table>
        <thead><tr><th>Shipment</th><th>Order</th><th>Status</th><th>Carrier</th><th>Tracking</th><th>Label</th></tr></thead>
        <tbody>${shipments.map(s => `
          <tr>
            <td style="font-family:monospace;font-size:.72rem">${(s.id||'').slice(0,8)}…</td>
            <td style="font-family:monospace;font-size:.72rem">${(s.orderId||'').slice(0,8)}…</td>
            <td><span class="sbadge s-${s.status}">${s.status}</span></td>
            <td>${s.shippo?.carrier || '—'}</td>
            <td style="font-family:monospace;font-size:.72rem">${s.shippo?.trackingNumber || '—'}</td>
            <td>${s.shippo?.labelUrl ? `<a href="${s.shippo.labelUrl}" target="_blank" rel="noreferrer" style="color:var(--accent)">Open</a>` : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <div style="height:.8rem"></div>
      <button class="btn btn-ghost btn-full" onclick="closeLabelModal()">Close</button>
    `;
  } catch (e) {
    body.innerHTML = '';
    errEl.textContent = e.message;
  }
}

/* ─── VERIFICATION REQUEST ─── */
function openVerificationRequest() {
  // Reuse the label modal for a lightweight form (keeps UI consistent without adding another modal)
  const modal = document.getElementById('label-modal');
  const body = document.getElementById('label-body');
  const errEl = document.getElementById('lb-err');
  errEl.textContent = '';
  modal.classList.add('open');
  body.innerHTML = `
    <div class="card card-p">
      <div class="modal-title" style="margin-bottom:.3rem">Request verification</div>
      <p style="font-size:.82rem;color:var(--muted);margin:.3rem 0 1rem">Share what makes your shop trustworthy (portfolio links, reviews, socials).</p>
      <div class="fgroup">
        <label class="flabel">Message</label>
        <textarea id="vr-msg" class="finput" rows="4" placeholder="Tell us about your process, materials, and customer satisfaction…"></textarea>
      </div>
      <div class="fgroup">
        <label class="flabel">Links (comma-separated)</label>
        <input id="vr-links" class="finput" placeholder="instagram.com/…, portfolio…, tiktok.com/…">
      </div>
      <div class="ferr" id="vr-err"></div>
      <button class="btn btn-dark btn-full" onclick="submitVerificationRequest()">Submit request</button>
      <div style="height:.6rem"></div>
      <button class="btn btn-ghost btn-full" onclick="closeLabelModal()">Cancel</button>
    </div>
  `;
}

async function submitVerificationRequest() {
  const errEl = document.getElementById('vr-err');
  errEl.textContent = '';
  try {
    const message = document.getElementById('vr-msg')?.value || '';
    const links = document.getElementById('vr-links')?.value || '';
    await API.post('/vendors/me/verification-request', { message, links });
    Toast.show('Verification request submitted');
    closeLabelModal();
    Pages.dashboard();
  } catch (e) {
    errEl.textContent = e.message;
  }
}

/* ─── REPORTING ─── */
function openReport(targetType, targetId) {
  if (!Store.loggedIn()) { Nav.go('login'); Toast.show('Please sign in to report', 'err'); return; }
  document.getElementById('rp-type').value = targetType;
  document.getElementById('rp-id').value = targetId;
  document.getElementById('rp-reason').value = '';
  document.getElementById('rp-details').value = '';
  document.getElementById('rp-err').textContent = '';
  document.getElementById('report-modal').classList.add('open');
}

async function submitReport() {
  const type = document.getElementById('rp-type').value;
  const id = document.getElementById('rp-id').value;
  const reason = document.getElementById('rp-reason').value;
  const details = document.getElementById('rp-details').value;
  const errEl = document.getElementById('rp-err');
  errEl.textContent = '';
  if (!reason) { errEl.textContent = 'Please choose a reason.'; return; }
  try {
    await API.post('/reports', { targetType: type, targetId: id, reason, details });
    document.getElementById('report-modal').classList.remove('open');
    Toast.show('Report submitted. Thank you.');
  } catch (e) {
    errEl.textContent = e.message;
  }
}

/* ─── SHOP FILTER STATE ─── */
function setChip(group, val, el) {
  document.querySelectorAll(`#${group} .chip`).forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  document.getElementById(group === 'shape-chips' ? 'sh-shape' : 'sh-style').value = val;
  Pages.shop();
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  CartUI.badge();

  window.addEventListener('scroll', () => {
    document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 10);
  });

  // Close modals/cart on backdrop click
  document.querySelectorAll('.overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });
  document.getElementById('bkdrop').addEventListener('click', () => CartUI.close());

  Nav.go('home');
});

/* ═══════════════════════════════════════════
   ADMIN UI
═══════════════════════════════════════════ */
function setAdminTab(tab, el) {
  document.querySelectorAll('#admin-chips .chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('admin-tab').value = tab;
  AdminUI.render();
}

const AdminUI = {
  async render() {
    const tab = document.getElementById('admin-tab')?.value || 'overview';
    const el = document.getElementById('admin-content');
    if (!el) return;
    el.innerHTML = '<div class="spin-wrap"><div class="spin"></div></div>';
    try {
      switch (tab) {
        case 'users':         return await this.users();
        case 'vendors':       return await this.vendors();
        case 'verifications': return await this.verifications();
        case 'reports':       return await this.reports();
        case 'disputes':      return await this.disputes();
        case 'audit':         return await this.audit();
        default:              return await this.overview();
      }
    } catch (e) {
      el.innerHTML = `<p style="color:var(--muted)">${e.message}</p>`;
    }
  },

  async overview() {
    const el = document.getElementById('admin-content');
    const d = await API.get('/admin/overview');
    const { kpis, queues } = d;
    el.innerHTML = `
      <div class="stat-row">
        <div class="scard"><div class="scard-n">${kpis.totalUsers}</div><div class="scard-l">Users</div></div>
        <div class="scard"><div class="scard-n">${kpis.totalVendors}</div><div class="scard-l">Vendors</div></div>
        <div class="scard"><div class="scard-n">${kpis.pendingVerifs}</div><div class="scard-l">Pending Verifications</div></div>
        <div class="scard"><div class="scard-n">${kpis.openReports}</div><div class="scard-l">Open Reports</div></div>
      </div>

      <div class="co-grid" style="grid-template-columns:1fr 1fr">
        <div class="card card-p">
          <h2 class="sec-title" style="margin-bottom:1rem">Pending <em>Verifications</em></h2>
          ${(queues.pendingVerificationRequests?.length)
            ? `<div style="font-size:.82rem;color:var(--muted);line-height:1.8">
                ${queues.pendingVerificationRequests.map(r => `• ${r.vendorId} · ${new Date(r.createdAt).toLocaleDateString()}`).join('<br>')}
              </div>`
            : `<p style="color:var(--muted);font-size:.86rem">No pending verification requests.</p>`}
        </div>
        <div class="card card-p">
          <h2 class="sec-title" style="margin-bottom:1rem">Open <em>Reports</em></h2>
          ${(queues.openReports?.length)
            ? `<div style="font-size:.82rem;color:var(--muted);line-height:1.8">
                ${queues.openReports.map(r => `• ${r.targetType}:${r.targetId} · ${r.reason}`).join('<br>')}
              </div>`
            : `<p style="color:var(--muted);font-size:.86rem">No open reports.</p>`}
        </div>
      </div>
    `;
  },

  async users() {
    const el = document.getElementById('admin-content');
    const list = await API.get('/admin/users');
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1rem">
        <h2 class="sec-title">Users</h2>
        <input id="au-q" class="finput" style="max-width:340px" placeholder="Search name/email…" oninput="AdminUI.searchUsers()">
      </div>
      <div id="au-wrap"></div>
    `;
    this._renderUsers(list);
  },

  async searchUsers() {
    const q = document.getElementById('au-q')?.value || '';
    const list = await API.get('/admin/users?search=' + encodeURIComponent(q));
    this._renderUsers(list);
  },

  _renderUsers(list) {
    const wrap = document.getElementById('au-wrap');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="tbl-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${list.map(u => `
          <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>
              <select class="finput" style="width:auto;padding:.35rem .7rem" onchange="AdminUI.setRole('${u.id}',this.value)">
                <option value="buyer" ${u.role==='buyer'?'selected':''}>buyer</option>
                <option value="vendor" ${u.role==='vendor'?'selected':''}>vendor</option>
                <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
              </select>
            </td>
            <td>${u.disabled ? '<span class="sbadge s-voided">disabled</span>' : '<span class="sbadge s-confirmed">active</span>'}</td>
            <td>
              ${u.disabled
                ? `<button class="btn btn-ghost btn-sm" onclick="AdminUI.enableUser('${u.id}')">Enable</button>`
                : `<button class="btn btn-ghost btn-sm" onclick="AdminUI.disableUser('${u.id}')">Disable</button>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;
  },

  async setRole(id, role) {
    await API.post(`/admin/users/${id}/set-role`, { role });
    Toast.show('Role updated');
  },
  async disableUser(id) {
    await API.post(`/admin/users/${id}/disable`, { note: '' });
    Toast.show('User disabled');
    await this.searchUsers();
  },
  async enableUser(id) {
    await API.post(`/admin/users/${id}/enable`, { note: '' });
    Toast.show('User enabled');
    await this.searchUsers();
  },

  async vendors() {
    const el = document.getElementById('admin-content');
    const list = await API.get('/admin/vendors');
    el.innerHTML = `
      <h2 class="sec-title" style="margin-bottom:1rem">Vendors</h2>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Vendor</th><th>Verified</th><th>Rating</th><th>Sales</th><th>Actions</th></tr></thead>
        <tbody>${list.map(v => `
          <tr>
            <td>${v.emoji || '💅'} ${v.name}</td>
            <td>${v.verified ? '<span class="sbadge s-delivered">verified</span>' : '<span class="sbadge s-pending">unverified</span>'}</td>
            <td>⭐${v.rating}</td>
            <td>${v.totalSales?.toLocaleString?.() || v.totalSales}</td>
            <td>
              ${v.verified
                ? `<button class="btn btn-ghost btn-sm" onclick="AdminUI.unverifyVendor('${v.id}')">Unverify</button>`
                : `<button class="btn btn-dark btn-sm" onclick="AdminUI.verifyVendor('${v.id}')">Verify</button>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;
  },

  async verifyVendor(id) {
    await API.post(`/admin/vendors/${id}/verify`, { note: '' });
    Toast.show('Vendor verified');
    await this.vendors();
  },
  async unverifyVendor(id) {
    await API.post(`/admin/vendors/${id}/unverify`, { note: '' });
    Toast.show('Vendor unverified');
    await this.vendors();
  },

  async verifications() {
    const el = document.getElementById('admin-content');
    const list = await API.get('/admin/verification-requests?status=pending');
    el.innerHTML = `
      <h2 class="sec-title" style="margin-bottom:1rem">Verification <em>Requests</em></h2>
      ${list.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Vendor</th><th>Submitted</th><th>Message</th><th>Links</th><th>Actions</th></tr></thead>
        <tbody>${list.map(r => `
          <tr>
            <td>${r.vendor?.emoji || '💅'} ${r.vendor?.name || r.vendorId}</td>
            <td>${ago(r.createdAt)}</td>
            <td style="max-width:320px">${(r.message || '').slice(0, 120)}${(r.message||'').length>120?'…':''}</td>
            <td>${(r.links||[]).map(l=>`<a href="${l}" target="_blank" rel="noreferrer" style="color:var(--accent)">link</a>`).join(' ') || '—'}</td>
            <td>
              <button class="btn btn-dark btn-sm" onclick="AdminUI.approveVerification('${r.id}')">Approve</button>
              <button class="btn btn-ghost btn-sm" onclick="AdminUI.rejectVerification('${r.id}')">Reject</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>` : `<div class="empty"><div class="empty-icon">✅</div><h3>No pending requests</h3><p>Verification queue is clear.</p></div>`}
    `;
  },

  async approveVerification(id) {
    await API.post(`/admin/verification-requests/${id}/approve`, { adminNote: '' });
    Toast.show('Approved');
    await this.verifications();
  },
  async rejectVerification(id) {
    await API.post(`/admin/verification-requests/${id}/reject`, { adminNote: '' });
    Toast.show('Rejected');
    await this.verifications();
  },

  async reports() {
    const el = document.getElementById('admin-content');
    const list = await API.get('/admin/reports');
    el.innerHTML = `
      <h2 class="sec-title" style="margin-bottom:1rem">Reports</h2>
      ${list.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Target</th><th>Reason</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
        <tbody>${list.map(r => `
          <tr>
            <td style="font-family:monospace;font-size:.72rem">${r.targetType}:${(r.targetId||'').slice(0,8)}…</td>
            <td>${r.reason}</td>
            <td>${r.status === 'resolved' ? '<span class="sbadge s-delivered">resolved</span>' : '<span class="sbadge s-pending">open</span>'}</td>
            <td>${ago(r.createdAt)}</td>
            <td>
              ${r.status === 'resolved' ? '—' : `<button class="btn btn-dark btn-sm" onclick="AdminUI.resolveReport('${r.id}')">Resolve</button>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>` : `<div class="empty"><div class="empty-icon">🛡️</div><h3>No reports</h3><p>Nothing to review right now.</p></div>`}
    `;
  },

  async resolveReport(id) {
    await API.post(`/admin/reports/${id}/resolve`, { adminNote: '' });
    Toast.show('Report resolved');
    await this.reports();
  },

  async disputes() {
    const el = document.getElementById('admin-content');
    const list = await API.get('/admin/disputes');
    el.innerHTML = `
      <h2 class="sec-title" style="margin-bottom:1rem">Dispute <em>Resolution</em></h2>
      ${list.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Order</th><th>User</th><th>Reason</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
        <tbody>${list.map(d => `
          <tr>
            <td style="font-family:monospace;font-size:.72rem">${(d.orderId||'').slice(0,8)}…</td>
            <td style="font-size:.8rem">${d.user?.name || d.userId}</td>
            <td style="font-size:.8rem;max-width:200px">${d.reason}${d.details ? `<br><span style="font-size:.7rem;color:var(--muted)">${d.details.slice(0,80)}${d.details.length>80?'…':''}</span>` : ''}</td>
            <td>${d.status === 'resolved' ? '<span class="sbadge s-resolved">resolved</span>' : '<span class="sbadge s-open">open</span>'}</td>
            <td>${ago(d.createdAt)}</td>
            <td>
              ${d.status === 'open' ? `<button class="btn btn-dark btn-sm" onclick="AdminUI.resolveDispute('${d.id}')">Resolve</button>` : d.resolution ? `<span style="font-size:.74rem;color:var(--muted)">${d.resolution.slice(0,60)}…</span>` : '—'}
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>` : `<div class="empty"><div class="empty-icon">⚖️</div><h3>No disputes</h3><p>No dispute cases to review.</p></div>`}
    `;
  },

  async resolveDispute(id) {
    const resolution = prompt('Resolution note (optional):') ?? '';
    if (resolution === null) return;
    try {
      await API.post(`/admin/disputes/${id}/resolve`, { resolution });
      Toast.show('Dispute resolved');
      await this.disputes();
    } catch(e) { Toast.show(e.message, 'err'); }
  },

  async audit() {
    const el = document.getElementById('admin-content');
    const list = await API.get('/admin/audit?limit=100');
    el.innerHTML = `
      <h2 class="sec-title" style="margin-bottom:1rem">Audit <em>Log</em></h2>
      <div class="tbl-wrap"><table>
        <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Admin</th></tr></thead>
        <tbody>${list.map(a => `
          <tr>
            <td>${new Date(a.createdAt).toLocaleString()}</td>
            <td>${a.action}</td>
            <td style="font-family:monospace;font-size:.72rem">${a.entityType}:${(a.entityId||'').slice(0,8)}…</td>
            <td style="font-family:monospace;font-size:.72rem">${(a.adminUserId||'').slice(0,8)}…</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;
  }
};
