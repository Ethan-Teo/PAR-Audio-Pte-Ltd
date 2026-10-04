/*
 * PAR Audio — shared site behaviour: header/footer, cart, compare, search, product cards.
 */
(function () {
  'use strict';

  const SITE = window.SITE;
  const PRODUCTS = window.PRODUCTS;
  const R = window.PARRender;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'S$' + Math.round(n).toLocaleString('en-SG');
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const catById = (id) => window.CATEGORIES.find((c) => c.id === id);
  const params = () => new URLSearchParams(location.search);
  const productUrl = (p) => `product.html?id=${encodeURIComponent(p.id)}`;
  const unitLabel = (p) => (p.unit === 'pair' ? 'per pair' : 'each');
  const dimsText = (p) => `${p.dims.h} × ${p.dims.w} × ${p.dims.d} mm`;
  const weightText = (w) => (w == null ? '—' : w < 1 ? `${Math.round(w * 1000)} g` : `${(+w).toLocaleString('en-SG', { maximumFractionDigits: 2 })} kg`);
  const finishLabel = (f) => (R.FINISHES[f] ? R.FINISHES[f].label : f);
  const variantOf = (p, vid) => (p.variants ? p.variants.find((v) => v.id === vid) || p.variants[0] : null);
  const priceOf = (p, vid) => { const v = variantOf(p, vid); return v ? v.price : p.price; };
  const photos = (p) => ((window.PHOTOS || {})[p.id] || []).map((f) => (/^(https?:|\/|assets\/)/.test(f) ? f : `assets/img/products/${f}`));
  /** A product's photo if one is listed in photos.js, otherwise its to-scale illustration. */
  function media(p, fin, opts) {
    opts = opts || {};
    const ph = photos(p)[opts.index || 0];
    if (ph) return `<img class="${opts.cls || 'prod-img'} prod-photo" src="${esc(ph)}" alt="${esc(p.brand + ' ' + p.name)}" loading="lazy" decoding="async">`;
    return R.thumb(p, fin, opts);
  }

  /* Storage — tolerant of private mode / blocked storage */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
    },
  };

  /* ------------------------------------------------------------------ */
  /* Cart                                                                */
  /* ------------------------------------------------------------------ */
  const CART_KEY = 'par_cart_v1';
  const cart = {
    items() { return store.get(CART_KEY, []).filter((i) => byId(i.id)); },
    save(items) { store.set(CART_KEY, items); updateBadges(); },
    add(id, opts) {
      const p = byId(id);
      if (!p || p.price == null) return;
      opts = opts || {};
      const variant = p.variants ? (opts.variant || p.variants[0].id) : null;
      const finish = opts.finish || p.finishes[0];
      const qty = Math.max(1, opts.qty || 1);
      const items = cart.items();
      const hit = items.find((i) => i.id === id && i.variant === variant && i.finish === finish);
      if (hit) hit.qty = Math.min(99, hit.qty + qty); else items.push({ id, variant, finish, qty });
      cart.save(items);
      toast(`<strong>${esc(p.brand)} ${esc(p.name)}</strong> added to your cart.`, { href: 'cart.html', label: 'View cart' });
    },
    setQty(index, qty) {
      const items = cart.items();
      if (!items[index]) return;
      items[index].qty = Math.max(1, Math.min(99, qty | 0));
      cart.save(items);
    },
    remove(index) { const items = cart.items(); items.splice(index, 1); cart.save(items); },
    clear() { cart.save([]); },
    count() { return cart.items().reduce((s, i) => s + i.qty, 0); },
    totals() {
      const subtotal = cart.items().reduce((s, i) => s + priceOf(byId(i.id), i.variant) * i.qty, 0);
      const delivery = subtotal === 0 || subtotal >= SITE.freeDeliveryThreshold ? 0 : SITE.deliveryFee;
      const total = subtotal + delivery;
      const gst = total - total / (1 + SITE.gstRate);
      return { subtotal, delivery, total, gst };
    },
  };

  /* ------------------------------------------------------------------ */
  /* Compare                                                             */
  /* ------------------------------------------------------------------ */
  const CMP_KEY = 'par_compare_v1';
  const CMP_MAX = 4;
  const compare = {
    ids() { return store.get(CMP_KEY, []).filter(byId); },
    has(id) { return compare.ids().includes(id); },
    toggle(id) {
      let ids = compare.ids();
      if (ids.includes(id)) ids = ids.filter((x) => x !== id);
      else {
        if (ids.length >= CMP_MAX) { toast(`You can compare up to ${CMP_MAX} products at a time.`); return false; }
        ids.push(id);
      }
      store.set(CMP_KEY, ids);
      syncCompareUI();
      return true;
    },
    set(ids) { store.set(CMP_KEY, ids.slice(0, CMP_MAX)); syncCompareUI(); },
    clear() { store.set(CMP_KEY, []); syncCompareUI(); },
  };

  /* ------------------------------------------------------------------ */
  /* Search                                                              */
  /* ------------------------------------------------------------------ */
  function searchText(p) {
    const c = catById(p.category);
    return `${p.brand} ${p.series} ${p.name} ${p.type} ${c ? c.name : ''} ${p.id}`.toLowerCase();
  }
  function search(q) {
    const terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return PRODUCTS.slice();
    return PRODUCTS.filter((p) => { const t = searchText(p); return terms.every((term) => t.includes(term)); });
  }

  /* ------------------------------------------------------------------ */
  /* UI fragments                                                        */
  /* ------------------------------------------------------------------ */
  const ICONS = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.6"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>',
    compare: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V9M10 20V4M15 20v-8M20 20V7"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="8" width="19" height="8" rx="1.2"/><path d="M6 8v3M9.5 8v4.5M13 8v3M16.5 8v4.5M20 8v3"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg>',
    ear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6"/><path d="M10 9.5a2 2 0 0 1 4 0"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.4-4.4"/></svg>',
  };

  /* PAR Audio logo: blue globe oval with "PAR", recreated as vector from the company logo */
  let logoSeq = 0;
  const LOGO_LAND = 'M11.1 16.9C11.1 15.5 19.4 13.6 26.7 12.6C33.9 11.6 47.9 9.7 54.7 10.9C61.4 12.0 63.5 16.0 67.1 19.5C70.7 22.9 76.5 27.6 76.4 31.5C76.3 35.4 68.7 39.4 66.5 42.7C64.3 46.0 65.6 48.8 63.4 51.3C61.2 53.7 53.9 55.4 53.4 57.3C52.9 59.1 61.1 62.9 60.3 62.4C59.4 62.0 51.8 57.7 48.4 54.7C45.1 51.7 42.4 48.3 40.4 44.4C38.3 40.5 38.3 35.4 36.0 31.5C33.7 27.6 30.8 23.6 26.7 21.2C22.5 18.8 11.1 18.3 11.1 16.9Z M70.2 4.9C72.9 3.1 89.9 2.7 95.1 4.0C100.3 5.3 102.8 9.7 101.3 12.6C99.9 15.5 90.1 20.9 86.4 21.2C82.7 21.5 81.6 17.0 78.9 14.3C76.2 11.6 67.5 6.6 70.2 4.9Z M64.0 64.1C66.2 62.1 71.8 62.7 76.4 65.0C81.1 67.3 89.9 73.5 92.0 77.9C94.1 82.3 91.2 87.2 88.9 91.6C86.6 96.1 81.2 100.0 78.3 104.5C75.4 109.1 73.3 118.7 71.5 119.1C69.6 119.6 67.4 112.3 67.1 107.1C66.8 102.0 70.2 93.2 69.6 88.2C69.0 83.2 64.3 81.0 63.4 77.0C62.4 73.0 61.8 66.2 64.0 64.1Z M107.6 41.8C106.6 41.1 107.6 37.5 108.2 35.8C108.8 34.1 109.8 32.9 111.3 31.5C112.7 30.1 115.5 28.6 116.9 27.2C118.2 25.8 119.4 24.2 119.4 22.9C119.4 21.6 116.2 21.2 116.9 19.5C117.6 17.7 121.1 13.9 123.7 12.6C126.3 11.3 129.7 11.2 132.4 11.7C135.1 12.3 138.9 12.4 139.9 16.0C140.9 19.6 140.1 29.5 138.7 33.2C137.2 36.9 133.9 37.2 131.2 38.4C128.5 39.5 125.4 39.8 122.5 40.1C119.6 40.4 116.3 39.8 113.8 40.1C111.3 40.4 108.5 42.5 107.6 41.8Z M103.2 54.7C103.9 51.7 104.8 45.0 107.6 42.7C110.4 40.4 115.6 40.4 120.0 40.9C124.4 41.5 130.3 42.5 133.7 46.1C137.1 49.7 138.6 59.7 140.5 62.4C142.5 65.2 145.8 60.0 145.5 62.4C145.2 64.9 140.3 71.6 138.7 77.0C137.0 82.5 137.6 90.8 135.6 95.1C133.5 99.4 128.5 103.7 126.2 102.8C123.9 102.0 123.0 95.2 121.9 89.9C120.7 84.6 121.6 74.6 119.4 71.0C117.2 67.4 111.5 70.2 108.8 68.4C106.1 66.7 104.1 63.0 103.2 60.7C102.3 58.4 102.5 57.7 103.2 54.7Z M138.7 33.2C139.3 28.9 137.8 19.5 139.9 16.0C142.0 12.6 145.1 14.2 151.1 12.6C157.1 11.0 167.7 6.9 176.0 6.6C184.3 6.3 192.8 9.4 200.9 10.9C209.0 12.3 222.5 13.2 224.5 15.2C226.6 17.2 217.3 20.5 213.3 22.9C209.4 25.3 204.0 27.2 200.9 29.8C197.8 32.4 196.5 35.5 194.7 38.4C192.8 41.2 191.8 44.1 189.7 47.0C187.6 49.8 184.0 52.5 182.2 55.6C180.5 58.6 180.4 64.4 179.1 65.0C177.9 65.6 176.3 60.9 174.8 59.0C173.2 57.1 171.6 52.7 169.8 53.8C167.9 55.0 165.4 65.6 163.6 65.9C161.7 66.2 160.9 57.8 158.6 55.6C156.3 53.3 152.1 53.4 149.9 52.1C147.6 50.8 147.2 49.5 144.9 47.8C142.6 46.1 137.2 44.2 136.2 41.8C135.1 39.4 138.0 37.5 138.7 33.2Z M172.9 68.4C174.4 67.2 183.7 69.7 188.4 71.0C193.2 72.3 201.5 74.6 201.5 76.2C201.5 77.8 192.2 80.0 188.4 80.5C184.7 80.9 181.7 80.8 179.1 78.8C176.5 76.8 171.3 69.7 172.9 68.4Z M184.7 91.6C186.3 88.5 191.8 84.6 194.7 83.1C197.6 81.5 199.7 79.9 202.1 82.2C204.5 84.5 208.6 92.9 209.0 96.8C209.4 100.7 206.9 104.8 204.6 105.4C202.3 106.0 198.5 100.8 195.3 100.2C192.1 99.7 187.1 103.4 185.3 102.0C183.6 100.5 183.2 94.8 184.7 91.6Z M194.7 45.2C194.8 44.1 200.5 36.2 201.5 35.8C202.5 35.4 202.0 41.1 200.9 42.7C199.7 44.2 194.6 46.4 194.7 45.2Z';
  const LOGO_LETTERS = 'M30 84V50Q30 45 35 45H74Q80 45 80 51V58Q80 64 74 64H37 M92 84V53Q92 45 100 45H136Q144 45 144 53V84 M95 67H141 M156 84V50Q156 45 161 45H200Q206 45 206 51V58Q206 64 200 64H162 M182 64L214 86';
  function logoMark(cls) {
    const id = `parlogo${++logoSeq}`;
    return `<svg class="${cls}" viewBox="0 0 240 124" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="${id}g" cx=".42" cy=".32" r=".8"><stop offset="0" stop-color="#5b88d6"/><stop offset=".55" stop-color="#2b58aa"/><stop offset="1" stop-color="#173b86"/></radialGradient>
        <clipPath id="${id}c"><ellipse cx="120" cy="62" rx="114" ry="58"/></clipPath>
      </defs>
      <ellipse cx="120" cy="62" rx="118" ry="61" fill="#b9c8e6"/>
      <ellipse cx="120" cy="62" rx="114" ry="58" fill="url(#${id}g)"/>
      <path d="${LOGO_LAND}" fill="#a9c4ee" fill-opacity=".38" clip-path="url(#${id}c)"/>
      <path d="${LOGO_LETTERS}" fill="none" stroke="#11306f" stroke-width="10.5" stroke-linejoin="round"/>
      <path d="${LOGO_LETTERS}" fill="none" stroke="#fff" stroke-width="6.5" stroke-linejoin="round"/>
    </svg>`;
  }

  function logo(stacked) {
    return `<a class="logo${stacked ? ' logo-stacked' : ''}" href="index.html" aria-label="${esc(SITE.name)} — home">
      ${logoMark('logo-mark')}
      <span class="logo-sub">Audio Pte Ltd</span>
    </a>`;
  }

  function seriesLinks(brand) {
    return Object.keys(window.BRANDS[brand].series)
      .map((s) => `<li><a href="shop.html?brand=${encodeURIComponent(brand)}&series=${encodeURIComponent(s)}">${esc(s)}</a></li>`).join('');
  }

  function catLinks(group) {
    return window.CATEGORIES.filter((c) => c.group === group)
      .map((c) => `<li><a href="shop.html?cat=${c.id}">${esc(c.name)}</a></li>`).join('');
  }

  function renderHeader(active) {
    const el = $('#site-header');
    if (!el) return;
    const navItem = (key, label, href, menu) => `
      <li class="nav-item${menu ? ' has-menu' : ''}${active === key ? ' is-active' : ''}">
        <a href="${href}" class="nav-link">${label}</a>
        ${menu ? `<div class="mega"><div class="mega-inner">${menu}</div></div>` : ''}
      </li>`;
    const brandNames = Object.keys(window.BRANDS);
    const bMenu = brandNames.map((b) => `<div>
        <a class="mega-brand" href="shop.html?brand=${encodeURIComponent(b)}">${esc(b)} <span>${PRODUCTS.filter((p) => p.brand === b).length} models</span></a>
        <ul>${seriesLinks(b)}</ul></div>`).join('') +
      `<a class="mega-feature mega-all" href="brands.html"><span><em>${brandNames.length} brands</em>Find all brands</span>
        <span class="mega-all-list">${brandNames.map(esc).join(' · ')}</span><span class="link-arrow">View all brands ${ICONS.arrow}</span></a>`;
    const sMenu = `<div><p class="mega-title">Loudspeakers</p><ul>${catLinks('Speakers')}</ul></div>
      <div><p class="mega-title">Electronics</p><ul>${catLinks('Electronics')}</ul></div>
      <a class="mega-feature" href="${productUrl(byId('elysian-4r'))}">${media(byId('elysian-4r'), 'walnut', { cls: 'mega-svg', pad: 0.06, view: 'angle' })}<span><em>New</em>Elysian 4R</span></a>`;

    el.innerHTML = `
      <div class="topbar"><div class="container topbar-inner">
        <span>Prices in SGD, inclusive of ${Math.round(SITE.gstRate * 100)}% GST</span>
        <span class="topbar-mid">Free delivery in Singapore on orders over ${money(SITE.freeDeliveryThreshold)}</span>
        <a href="tel:${SITE.phone.replace(/\s/g, '')}">${esc(SITE.phone)}</a>
      </div></div>
      <div class="header-main"><div class="container header-inner">
        <button class="icon-btn nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav">${ICONS.menu}</button>
        ${logo()}
        <nav id="primary-nav" class="primary-nav" aria-label="Primary">
          <ul class="nav-list">
            ${navItem('brands', 'Brands', 'brands.html', bMenu)}
            ${navItem('shop', 'Shop all', 'shop.html', sMenu)}
            ${navItem('compare', 'Compare', 'compare.html')}
            ${navItem('contact', 'Visit &amp; Contact', 'contact.html')}
          </ul>
        </nav>
        <div class="header-actions">
          <button class="icon-btn" data-open-search aria-label="Search products">${ICONS.search}</button>
          <a class="icon-btn" href="compare.html" aria-label="Compare products">${ICONS.compare}<span class="count" data-compare-count hidden></span></a>
          <a class="icon-btn" href="cart.html" aria-label="Shopping cart">${ICONS.cart}<span class="count" data-cart-count hidden></span></a>
        </div>
      </div></div>`;

    const toggle = $('.nav-toggle', el);
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? ICONS.close : ICONS.menu;
    });
    // Mobile: tapping a top-level item with a mega menu expands it instead of navigating
    $$('.has-menu > .nav-link', el).forEach((a) => {
      a.addEventListener('click', (e) => {
        if (window.matchMedia('(max-width: 980px)').matches) {
          const li = a.parentElement;
          if (!li.classList.contains('is-open')) { e.preventDefault(); li.classList.add('is-open'); }
        }
      });
    });
  }

  function renderFooter() {
    const el = $('#site-footer');
    if (!el) return;
    const year = new Date().getFullYear();
    el.innerHTML = `
      <div class="container footer-grid">
        <div class="footer-brand">
          ${logo(true)}
          <p>${esc(SITE.tagline)}. Every Wharfedale loudspeaker and Audiolab component, with complete specifications in millimetres.</p>
          <p class="footer-contact"><a href="tel:${SITE.phone.replace(/\s/g, '')}">${esc(SITE.phone)}</a><br><a href="mailto:${SITE.email}">${esc(SITE.email)}</a></p>
        </div>
        <div><h4>Wharfedale</h4><ul>${seriesLinks('Wharfedale')}</ul></div>
        <div><h4>Audiolab</h4><ul>${seriesLinks('Audiolab')}</ul></div>
        <div><h4>Customer care</h4><ul>
          <li><a href="contact.html#delivery">Delivery &amp; installation</a></li>
          <li><a href="contact.html#warranty">Warranty &amp; returns</a></li>
          <li><a href="contact.html#listening">Book a listening session</a></li>
          <li><a href="brands.html">All brands</a></li>
          <li><a href="compare.html">Compare products</a></li>
          <li><a href="contact.html">Contact us</a></li>
        </ul></div>
        <div><h4>Visit</h4><ul class="plain">
          ${SITE.address.map((l) => `<li>${esc(l)}</li>`).join('')}
          ${SITE.hours.map((l) => `<li class="muted">${esc(l)}</li>`).join('')}
        </ul></div>
      </div>
      <div class="container footer-legal">
        <p>© ${year} ${esc(SITE.name)}. All rights reserved.</p>
        <p>Wharfedale and Audiolab are trademarks of their respective owners. Product illustrations are drawn to scale from published dimensions. Specifications and prices are subject to change without notice.</p>
      </div>`;
  }

  function renderOverlays() {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="search-overlay" id="search-overlay" hidden role="dialog" aria-modal="true" aria-label="Search products">
        <div class="search-panel container">
          <form class="search-form" action="shop.html" role="search">
            ${ICONS.search}
            <input type="search" name="q" id="search-input" placeholder="Search Wharfedale & Audiolab — e.g. “Linton”, “streamer”, “9000”" autocomplete="off" aria-label="Search">
            <button type="button" class="icon-btn" data-close-search aria-label="Close search">${ICONS.close}</button>
          </form>
          <div class="search-results" id="search-results"></div>
        </div>
      </div>
      <div class="compare-bar" id="compare-bar" hidden>
        <div class="container compare-bar-inner">
          <div class="compare-bar-items" id="compare-bar-items"></div>
          <div class="compare-bar-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-compare-clear>Clear</button>
            <a class="btn btn-primary btn-sm" href="compare.html">Compare <span data-compare-n></span></a>
          </div>
        </div>
      </div>
      <div class="toast-wrap" id="toast-wrap" aria-live="polite"></div>`;
    document.body.appendChild(wrap);

    const overlay = $('#search-overlay');
    const input = $('#search-input');
    const results = $('#search-results');
    const open = () => { overlay.hidden = false; document.body.classList.add('search-open'); setTimeout(() => input.focus(), 30); renderResults(); };
    const close = () => { overlay.hidden = true; document.body.classList.remove('search-open'); };
    const renderResults = () => {
      const q = input.value.trim();
      const list = q ? search(q).slice(0, 8) : PRODUCTS.filter((p) => p.featured).slice(0, 8);
      results.innerHTML = `<p class="search-hint">${q ? `${search(q).length} result${search(q).length === 1 ? '' : 's'}` : 'Popular right now'}</p>` +
        (list.length ? `<ul>${list.map((p) => `<li><a href="${productUrl(p)}">
          <span class="sr-thumb">${media(p, null, { cls: 'sr-svg', pad: 0.08, view: 'angle', reflect: false })}</span>
          <span class="sr-text"><span class="sr-name">${esc(p.brand)} ${esc(p.name)}</span><span class="sr-meta">${esc(p.type)} · ${dimsText(p)}</span></span>
          <span class="sr-price">${p.price == null ? 'On request' : money(p.price)}</span></a></li>`).join('')}</ul>`
          : '<p class="search-empty">No products match your search.</p>');
    };
    input.addEventListener('input', renderResults);
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-search]')) { e.preventDefault(); open(); }
      else if (e.target.closest('[data-close-search]') || e.target === overlay) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) close();
      if (e.key === '/' && overlay.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
    });
  }

  function toast(html, action) {
    const wrap = $('#toast-wrap');
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${html}</span>${action ? `<a href="${action.href}">${esc(action.label)}</a>` : ''}`;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3800);
  }

  function updateBadges() {
    const n = cart.count();
    $$('[data-cart-count]').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
    const c = compare.ids().length;
    $$('[data-compare-count]').forEach((el) => { el.textContent = c; el.hidden = c === 0; });
  }

  function syncCompareUI() {
    const ids = compare.ids();
    $$('[data-compare]').forEach((cb) => {
      const on = ids.includes(cb.getAttribute('data-compare'));
      if (cb.type === 'checkbox') cb.checked = on;
      else { cb.classList.toggle('is-on', on); cb.setAttribute('aria-pressed', String(on)); }
    });
    const bar = $('#compare-bar');
    if (bar) {
      const onComparePage = document.body.dataset.page === 'compare';
      bar.hidden = onComparePage || ids.length === 0;
      document.body.classList.toggle('has-compare-bar', !bar.hidden);
      $('#compare-bar-items').innerHTML = ids.map((id) => {
        const p = byId(id);
        return `<div class="cb-item"><span class="cb-thumb">${media(p, null, { cls: 'cb-svg', pad: 0.06, view: 'angle', reflect: false })}</span><span class="cb-name">${esc(p.name)}</span>
          <button type="button" class="cb-x" data-compare="${p.id}" aria-label="Remove ${esc(p.name)} from comparison">${ICONS.close}</button></div>`;
      }).join('') + (ids.length < CMP_MAX ? `<div class="cb-hint">Select up to ${CMP_MAX} products</div>` : '');
      $$('[data-compare-n]').forEach((el) => { el.textContent = `(${ids.length})`; });
    }
    updateBadges();
  }

  /* ------------------------------------------------------------------ */
  /* Product card                                                        */
  /* ------------------------------------------------------------------ */
  function badgeHTML(p) {
    return (p.badges || []).map((b) => `<span class="badge${/limited/i.test(b) ? ' badge-gold' : ''}">${esc(b)}</span>`).join('');
  }

  function priceHTML(p, vid) {
    if (p.price == null) return '<span class="price price-request">Price on request</span>';
    const from = p.variants && !vid ? '<small class="from">from</small> ' : '';
    return `<span class="price">${from}${money(priceOf(p, vid))} <small>${unitLabel(p)}</small></span>`;
  }

  function card(p) {
    const cta = p.price == null
      ? `<a class="btn btn-outline btn-sm" href="contact.html?product=${encodeURIComponent(p.id)}">Enquire</a>`
      : `<button type="button" class="btn btn-dark btn-sm" data-add="${p.id}" aria-label="Add ${esc(p.brand)} ${esc(p.name)} to cart">${ICONS.plus}<span>Add</span></button>`;
    return `<article class="card">
      <a class="card-media" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">
        <span class="card-badges">${badgeHTML(p)}</span>
        <span class="cm-view cm-angle">${media(p, null, { cls: 'card-svg', view: 'angle' })}</span>
        <span class="cm-view cm-front">${photos(p)[1] ? media(p, null, { cls: 'card-svg', index: 1 }) : photos(p)[0] ? media(p, null, { cls: 'card-svg' }) : R.thumb(p, null, { cls: 'card-svg' })}</span>
      </a>
      <div class="card-body">
        <p class="eyebrow">${esc(p.brand)} · ${esc(p.series)}</p>
        <h3 class="card-title"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
        <p class="card-type">${esc(p.type)}</p>
        <dl class="card-dims" aria-label="Dimensions in millimetres">
          <div><dt>H</dt><dd>${p.dims.h}</dd></div><div><dt>W</dt><dd>${p.dims.w}</dd></div><div><dt>D</dt><dd>${p.dims.d}</dd></div><div class="unit">mm${p.weight != null ? ` · ${weightText(p.weight)}` : ''}</div>
        </dl>
        <div class="card-foot">${priceHTML(p)}${cta}</div>
        <label class="compare-toggle"><input type="checkbox" data-compare="${p.id}"${compare.has(p.id) ? ' checked' : ''}> <span>Compare</span></label>
      </div>
    </article>`;
  }

  /* ------------------------------------------------------------------ */
  /* Global event delegation                                             */
  /* ------------------------------------------------------------------ */
  function wireGlobal() {
    document.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { e.preventDefault(); cart.add(add.getAttribute('data-add')); return; }
      const cmpBtn = e.target.closest('button[data-compare]');
      if (cmpBtn) { e.preventDefault(); compare.toggle(cmpBtn.getAttribute('data-compare')); return; }
      if (e.target.closest('[data-compare-clear]')) { compare.clear(); }
    });
    document.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type=checkbox][data-compare]');
      if (cb) { if (!compare.toggle(cb.getAttribute('data-compare'))) cb.checked = false; }
    });
    window.addEventListener('storage', () => { syncCompareUI(); });
  }

  function hydrateIcons(root) {
    $$('[data-icon]', root).forEach((el) => { el.outerHTML = ICONS[el.getAttribute('data-icon')] || ''; });
  }

  function init(active) {
    renderHeader(active);
    renderFooter();
    renderOverlays();
    hydrateIcons();
    wireGlobal();
    syncCompareUI();
  }

  window.PAR = {
    $, $$, esc, money, byId, catById, params, productUrl, unitLabel, dimsText, weightText, finishLabel,
    variantOf, priceOf, photos, media, cart, compare, search, card, priceHTML, badgeHTML, toast, init, ICONS, syncCompareUI, store,
  };
})();
