(function () {
  'use strict';
  const PAR = window.PAR;
  const { $, $$, esc, money, byId, params, productUrl, unitLabel, finishLabel, variantOf, priceOf, cart, card, store, ICONS } = PAR;
  const R = window.PARRender;
  const SITE = window.SITE;

  PAR.init('cart');
  const root = $('#cart-root');
  const ORDER_KEY = 'par_last_order_v1';
  let fulfil = 'delivery';

  function totals() {
    const subtotal = cart.items().reduce((s, i) => s + priceOf(byId(i.id), i.variant) * i.qty, 0);
    const delivery = fulfil === 'collect' || subtotal === 0 || subtotal >= SITE.freeDeliveryThreshold ? 0 : SITE.deliveryFee;
    const total = subtotal + delivery;
    return { subtotal, delivery, total, gst: total - total / (1 + SITE.gstRate) };
  }

  const lineName = (i) => {
    const p = byId(i.id);
    const v = variantOf(p, i.variant);
    return { p, v, opts: [v ? v.label : null, finishLabel(i.finish)].filter(Boolean).join(' · ') };
  };

  /* ------------------------------------------------------------------ */
  /* Empty & confirmation states                                         */
  /* ------------------------------------------------------------------ */
  function renderEmpty() {
    const picks = ['linton', 'evo-5-1', 'audiolab-6000a-mkii', 'diamond-12-1i'].map(byId);
    root.innerHTML = `
      <div class="empty" style="margin:40px 0 0"><h3>Your cart is empty</h3><p>Explore the complete Wharfedale and Audiolab ranges, every model specified in millimetres.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-dark" href="shop.html?brand=Wharfedale">Shop Wharfedale</a><a class="btn btn-outline" href="shop.html?brand=Audiolab">Shop Audiolab</a></div></div>
      <section class="section" style="padding-top:64px"><div class="section-head"><div><p class="eyebrow">Popular picks</p><h2 class="display">Customers also choose</h2></div></div>
        <div class="grid">${picks.map(card).join('')}</div></section>`;
  }

  function orderText(o) {
    const lines = o.items.map((i) => `${i.qty} × ${i.name}${i.opts ? ` (${i.opts})` : ''} — ${money(i.unit * i.qty)}`);
    return [
      `Order request ${o.ref}`,
      '',
      ...lines,
      '',
      `Subtotal: ${money(o.totals.subtotal)}`,
      `Delivery: ${o.totals.delivery ? money(o.totals.delivery) : 'Free'}`,
      `Total (incl. GST): ${money(o.totals.total)}`,
      '',
      `Name: ${o.customer.name}`,
      `Email: ${o.customer.email}`,
      `Phone: ${o.customer.phone}`,
      `Fulfilment: ${o.customer.fulfilLabel}`,
      o.customer.address ? `Address: ${o.customer.address}, Singapore ${o.customer.postal}` : null,
      `Preferred payment: ${o.customer.payment}`,
      o.customer.notes ? `Notes: ${o.customer.notes}` : null,
    ].filter((l) => l != null).join('\n');
  }

  function renderConfirmation(o) {
    $('#cart-head').hidden = true;
    const text = orderText(o);
    const mail = `mailto:${SITE.email}?subject=${encodeURIComponent(`Order request ${o.ref}`)}&body=${encodeURIComponent(text)}`;
    const wa = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
    root.innerHTML = `
      <div class="confirm">
        <div class="tick"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h1>Thank you, ${esc(o.customer.name.split(' ')[0])}</h1>
        <p>Your order request is ready. Send it to us using one of the options below. Our team will confirm availability, delivery date and payment details with you. <strong>No payment has been taken.</strong></p>
        <span class="ref">${esc(o.ref)}</span>
        <div class="actions">
          <a class="btn btn-dark btn-lg" href="${mail}">Email order to PAR Audio</a>
          <a class="btn btn-outline btn-lg" href="${wa}" target="_blank" rel="noopener">Send via WhatsApp</a>
        </div>
        <table>
          ${o.items.map((i) => `<tr><td>${i.qty} × <strong>${esc(i.name)}</strong>${i.opts ? `<br><span class="muted" style="font-size:13px">${esc(i.opts)}</span>` : ''}</td><td>${money(i.unit * i.qty)}</td></tr>`).join('')}
          <tr><td>Delivery</td><td>${o.totals.delivery ? money(o.totals.delivery) : 'Free'}</td></tr>
          <tr><td><strong>Total</strong> <span class="muted" style="font-size:13px">incl. GST of ${money(o.totals.gst)}</span></td><td><strong>${money(o.totals.total)}</strong></td></tr>
        </table>
        <p style="margin-top:24px"><a class="link-arrow" href="shop.html">Continue shopping ${ICONS.arrow}</a></p>
      </div>`;
    window.scrollTo({ top: 0 });
  }

  /* ------------------------------------------------------------------ */
  /* Cart with checkout                                                  */
  /* ------------------------------------------------------------------ */
  function renderCart() {
    root.innerHTML = `
      <div class="cart-layout">
        <div>
          <div class="cart-lines" id="lines"></div>
          <form class="form-card" id="checkout" novalidate>
            <h2>Your details</h2>
            <p>Send us your order request and we'll confirm stock, delivery and payment with you, usually within one working day. No payment is taken online.</p>
            <div class="form-grid">
              <div class="field"><label for="f-name">Full name</label><input id="f-name" name="name" autocomplete="name" required><p class="err">Please enter your name.</p></div>
              <div class="field"><label for="f-phone">Mobile number</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+65 9123 4567" required><p class="err">Please enter a valid phone number.</p></div>
              <div class="field full"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required><p class="err">Please enter a valid email address.</p></div>
              <div class="field full"><label>How would you like to receive your order?</label>
                <div class="radio-cards">
                  <label class="radio-card"><input type="radio" name="fulfil" value="delivery" checked><strong>Delivery</strong><span>Free over ${money(SITE.freeDeliveryThreshold)}</span></label>
                  <label class="radio-card"><input type="radio" name="fulfil" value="install"><strong>Delivery + set-up</strong><span>We position &amp; connect</span></label>
                  <label class="radio-card"><input type="radio" name="fulfil" value="collect"><strong>Collect</strong><span>By appointment</span></label>
                </div>
              </div>
              <div class="field full" data-addr><label for="f-address">Delivery address</label><input id="f-address" name="address" autocomplete="street-address" placeholder="Block / street, unit number"><p class="err">Please enter your delivery address.</p></div>
              <div class="field" data-addr><label for="f-postal">Postal code</label><input id="f-postal" name="postal" autocomplete="postal-code" inputmode="numeric" maxlength="6" placeholder="6 digits"><p class="err">Please enter a 6-digit Singapore postal code.</p></div>
              <div class="field"><label for="f-pay">Preferred payment</label>
                <select id="f-pay" name="payment"><option>PayNow</option><option>Bank transfer</option><option>Credit / debit card</option></select></div>
              <div class="field full"><label for="f-notes">Notes <span class="muted" style="font-weight:400">(optional)</span></label><textarea id="f-notes" name="notes" placeholder="Delivery access, preferred dates, questions about your system…"></textarea></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary btn-lg" type="submit">Prepare order request</button>
              <p>By continuing you agree that PAR Audio may contact you about this order. Prices include GST.</p>
            </div>
          </form>
        </div>
        <aside class="summary" id="summary" aria-label="Order summary"></aside>
      </div>`;

    const form = $('#checkout');
    form.addEventListener('change', (e) => {
      if (e.target.name === 'fulfil') {
        fulfil = e.target.value;
        $$('[data-addr]').forEach((f) => { f.hidden = fulfil === 'collect'; });
        renderSummary();
      }
    });
    form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) f.classList.remove('invalid'); });
    form.addEventListener('submit', onSubmit);
    renderLines();
    renderSummary();
  }

  function renderLines() {
    const items = cart.items();
    if (!items.length) { renderEmpty(); return; }
    $('#lines').innerHTML = items.map((i, idx) => {
      const { p, opts } = lineName(i);
      const unit = priceOf(p, i.variant);
      return `<div class="cart-line">
        <a class="cart-thumb" href="${productUrl(p)}" aria-hidden="true" tabindex="-1">${R.thumb(p, i.finish, { pad: 0.06 })}</a>
        <div>
          <p class="eyebrow" style="font-size:11px;color:var(--muted)">${esc(p.brand)} · ${esc(p.series)}</p>
          <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          <p class="cart-meta">${esc(opts)}<br><span class="mono">${p.dims.h} × ${p.dims.w} × ${p.dims.d} mm</span> · ${money(unit)} ${unitLabel(p)}</p>
          <div class="cart-actions">
            <div class="qty qty-sm" role="group" aria-label="Quantity for ${esc(p.name)}">
              <button type="button" data-step="-1" data-i="${idx}" aria-label="Decrease">−</button>
              <input type="number" value="${i.qty}" min="1" max="99" data-qtyi="${idx}" aria-label="Quantity">
              <button type="button" data-step="1" data-i="${idx}" aria-label="Increase">+</button>
            </div>
            <button type="button" class="link-btn" data-rm="${idx}">Remove</button>
          </div>
        </div>
        <div class="cart-line-total">${money(unit * i.qty)}${i.qty > 1 ? `<small>${i.qty} × ${money(unit)}</small>` : ''}</div>
      </div>`;
    }).join('');
  }

  function renderSummary() {
    const t = totals();
    const toFree = SITE.freeDeliveryThreshold - t.subtotal;
    const n = cart.count();
    $('#summary').innerHTML = `
      <h2>Summary</h2>
      <div class="sum-row"><span>Subtotal <span class="muted">(${n} item${n === 1 ? '' : 's'})</span></span><span>${money(t.subtotal)}</span></div>
      <div class="sum-row"><span>${fulfil === 'collect' ? 'Collection' : 'Delivery'}</span><span>${t.delivery ? money(t.delivery) : 'Free'}</span></div>
      ${fulfil !== 'collect' && toFree > 0 ? `<p class="sum-note">Add ${money(toFree)} more for free delivery.</p><div class="progress"><i style="width:${Math.min(100, (t.subtotal / SITE.freeDeliveryThreshold) * 100)}%"></i></div>` : ''}
      <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
      <p class="sum-note">Includes GST of ${money(t.gst)}.</p>
      <a class="btn btn-dark btn-block" style="margin-top:20px" href="#checkout">Continue to details</a>
      <p class="sum-note" style="text-align:center">Questions? Call <a href="tel:${SITE.phone.replace(/\s/g, '')}">${esc(SITE.phone)}</a></p>`;
  }

  function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const val = (n) => (form.elements[n].value || '').trim();
    const checks = {
      name: val('name').length >= 2,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')),
      phone: val('phone').replace(/\D/g, '').length >= 8,
      address: fulfil === 'collect' || val('address').length >= 5,
      postal: fulfil === 'collect' || /^\d{6}$/.test(val('postal')),
    };
    let first = null;
    Object.entries(checks).forEach(([k, ok]) => {
      const f = form.elements[k].closest('.field');
      f.classList.toggle('invalid', !ok);
      if (!ok && !first) first = form.elements[k];
    });
    if (first) { first.focus(); return; }

    const d = new Date();
    const ref = `PAR-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const fulfilLabels = { delivery: 'Delivery', install: 'Delivery + set-up', collect: 'Collect' };
    const order = {
      ref,
      date: d.toISOString(),
      items: cart.items().map((i) => { const { p, opts } = lineName(i); return { id: p.id, name: `${p.brand} ${p.name}`, opts, qty: i.qty, unit: priceOf(p, i.variant) }; }),
      totals: totals(),
      customer: {
        name: val('name'), email: val('email'), phone: val('phone'),
        fulfil, fulfilLabel: fulfilLabels[fulfil],
        address: fulfil === 'collect' ? '' : val('address'), postal: fulfil === 'collect' ? '' : val('postal'),
        payment: val('payment'), notes: val('notes'),
      },
    };
    store.set(ORDER_KEY, order);
    cart.clear();
    history.replaceState(null, '', `${location.pathname}?placed=${encodeURIComponent(ref)}`);
    renderConfirmation(order);
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */
  root.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step) {
      const idx = +step.dataset.i;
      const item = cart.items()[idx];
      if (item) { cart.setQty(idx, item.qty + +step.dataset.step); renderLines(); renderSummary(); }
      return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      cart.remove(+rm.dataset.rm);
      if (cart.items().length) { renderLines(); renderSummary(); } else renderEmpty();
    }
  });
  root.addEventListener('change', (e) => {
    const inp = e.target.closest('[data-qtyi]');
    if (inp) { cart.setQty(+inp.dataset.qtyi, parseInt(inp.value, 10) || 1); renderLines(); renderSummary(); }
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  const placed = params().get('placed');
  const last = store.get(ORDER_KEY, null);
  if (placed && last && last.ref === placed) renderConfirmation(last);
  else if (cart.items().length) renderCart();
  else renderEmpty();
})();
