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

  function logo() {
    return `<a class="logo" href="index.html" aria-label="${esc(SITE.name)} — home">
      <svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55"/>
        <circle cx="20" cy="20" r="5.5" fill="var(--accent)"/>
      </svg>
      <span class="logo-text"><span class="logo-word">PAR <span>Audio</span></span><span class="logo-sub">Pte Ltd</span></span>
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
    const wMenu = `<div><p class="mega-title">Wharfedale ranges</p><ul>${seriesLinks('Wharfedale')}</ul></div>
      <div><p class="mega-title">Loudspeakers</p><ul>${catLinks('Speakers')}</ul></div>
      <a class="mega-feature" href="${productUrl(byId('elysian-4r'))}">${R.thumb(byId('elysian-4r'), 'walnut', { cls: 'mega-svg', pad: 0.06 })}<span><em>New</em>Elysian 4R</span></a>`;
    const aMenu = `<div><p class="mega-title">Audiolab ranges</p><ul>${seriesLinks('Audiolab')}</ul></div>
      <div><p class="mega-title">Electronics</p><ul>${catLinks('Electronics')}</ul></div>
      <a class="mega-feature" href="${productUrl(byId('audiolab-9000a'))}">${R.thumb(byId('audiolab-9000a'), 'silver', { cls: 'mega-svg', pad: 0.06 })}<span><em>Flagship</em>9000A</span></a>`;

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
            ${navItem('wharfedale', 'Wharfedale', 'shop.html?brand=Wharfedale', wMenu)}
            ${navItem('audiolab', 'Audiolab', 'shop.html?brand=Audiolab', aMenu)}
            ${navItem('shop', 'Shop all', 'shop.html')}
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
          ${logo()}
          <p>${esc(SITE.tagline)}. Every Wharfedale loudspeaker and Audiolab component, with complete specifications in millimetres.</p>
          <p class="footer-contact"><a href="tel:${SITE.phone.replace(/\s/g, '')}">${esc(SITE.phone)}</a><br><a href="mailto:${SITE.email}">${esc(SITE.email)}</a></p>
        </div>
        <div><h4>Wharfedale</h4><ul>${seriesLinks('Wharfedale')}</ul></div>
        <div><h4>Audiolab</h4><ul>${seriesLinks('Audiolab')}</ul></div>
        <div><h4>Customer care</h4><ul>
          <li><a href="contact.html#delivery">Delivery &amp; installation</a></li>
          <li><a href="contact.html#warranty">Warranty &amp; returns</a></li>
          <li><a href="contact.html#listening">Book a listening session</a></li>
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
          <span class="sr-thumb">${R.thumb(p, null, { cls: 'sr-svg', pad: 0.08 })}</span>
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
        return `<div class="cb-item"><span class="cb-thumb">${R.thumb(p, null, { cls: 'cb-svg', pad: 0.06 })}</span><span class="cb-name">${esc(p.name)}</span>
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
        ${R.thumb(p, null, { cls: 'card-svg' })}
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
    variantOf, priceOf, cart, compare, search, card, priceHTML, badgeHTML, toast, init, ICONS, syncCompareUI, store,
  };
})();
