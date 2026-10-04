(function () {
  'use strict';
  const PAR = window.PAR;
  const { $, $$, esc, money, byId, catById, params, unitLabel, weightText, finishLabel, variantOf, priceOf, cart, compare, card, badgeHTML, ICONS } = PAR;
  const R = window.PARRender;
  const SITE = window.SITE;

  const p = byId(params().get('id'));
  PAR.init(p ? 'brands' : 'shop');
  const root = $('#pdp-root');

  if (!p) {
    root.innerHTML = `<div class="empty" style="margin:64px 0 96px"><h3>Product not found</h3><p>This product may have been discontinued or the link is incorrect.</p><a class="btn btn-dark" href="shop.html">Browse all products</a></div>`;
    return;
  }

  const PHOTO_LIST = PAR.photos(p);
  const VIEWS = [
    ...PHOTO_LIST.map((_, i) => [`photo${i}`, PHOTO_LIST.length > 1 ? `Photo ${i + 1}` : 'Photo']),
    ['angle', 'Angle'], ['front', 'Front'],
    ...(p.render.kind === 'speaker' ? [['grille', 'Grille on']] : []),
    ['side', 'Side'], ['scale', 'Size guide'], ['drawing', 'Dimensions'],
  ];
  const S = { finish: p.finishes[0], variant: p.variants ? p.variants[0].id : null, qty: 1, view: PHOTO_LIST.length ? 'photo0' : 'angle' };
  const fullName = `${p.brand} ${p.name}`;
  const cat = catById(p.category);
  const gstOf = (n) => n - n / (1 + SITE.gstRate);

  document.title = `${fullName} — ${p.dims.h} × ${p.dims.w} × ${p.dims.d} mm | PAR Audio Pte Ltd`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', `${fullName} ${p.type.toLowerCase()}. ${p.summary} Dimensions (H × W × D): ${p.dims.h} × ${p.dims.w} × ${p.dims.d} mm.`);

  const waText = encodeURIComponent(`Hi PAR Audio, I'd like to enquire about the ${fullName}.`);
  const isEnquiry = p.price == null;

  /* ------------------------------------------------------------------ */
  /* Layout                                                              */
  /* ------------------------------------------------------------------ */
  root.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:24px">
      <a href="index.html">Home</a><span aria-hidden="true">/</span>
      <a href="brands.html">Brands</a><span aria-hidden="true">/</span>
      <a href="shop.html?brand=${p.brand}">${p.brand}</a><span aria-hidden="true">/</span>
      <a href="shop.html?brand=${p.brand}&series=${encodeURIComponent(p.series)}">${esc(p.series)}</a><span aria-hidden="true">/</span>
      <span aria-current="page">${esc(p.name)}</span>
    </nav>

    <div class="pdp">
      <div class="pdp-media">
        <div class="pdp-stage" id="stage"></div>
        <div class="pdp-gallery" id="gallery" role="group" aria-label="Product images"></div>
      </div>

      <div class="pdp-info">
        <p class="eyebrow">${esc(p.brand)} · ${esc(p.series)}</p>
        <h1>${esc(p.name)}</h1>
        <p class="pdp-type">${esc(p.type)}</p>

        <div class="pdp-price" id="price"></div>

        <div class="keydims" aria-label="Key dimensions">
          <div><span>Height</span><strong>${p.dims.h}<small>mm</small></strong></div>
          <div><span>Width</span><strong>${p.dims.w}<small>mm</small></strong></div>
          <div><span>Depth</span><strong>${p.dims.d}<small>mm</small></strong></div>
          <div><span>Weight</span><strong>${p.weight == null ? '—' : weightText(p.weight).replace(/ (kg|g)$/, '<small>$1</small>')}</strong></div>
        </div>
        <p class="dims-note">${p.dimsNote ? esc(p.dimsNote) + ' ' : ''}Weight is net, per ${p.unit === 'pair' ? 'speaker' : 'unit'}.</p>

        ${p.variants ? `<div class="opt-group"><div class="opt-label">Package</div><div class="variants" id="variants">
          ${p.variants.map((v) => `<button type="button" class="variant" data-variant="${v.id}" aria-pressed="false"><span>${esc(v.label)}</span><b>${money(v.price)}</b></button>`).join('')}
        </div></div>` : ''}

        <div class="opt-group">
          <div class="opt-label">Finish <span id="finish-name"></span></div>
          <div class="swatches" id="swatches">
            ${p.finishes.map((f) => { const F = R.FINISHES[f]; return `<button type="button" class="swatch" data-finish="${f}" aria-pressed="false" aria-label="${esc(F.label)}" title="${esc(F.label)}"><i style="background:linear-gradient(135deg, ${F.a}, ${F.b})"></i></button>`; }).join('')}
          </div>
        </div>

        <div class="buy-row">
          ${isEnquiry
            ? `<a class="btn btn-dark btn-lg" href="contact.html?product=${encodeURIComponent(p.id)}">Enquire about this product</a>`
            : `<div class="qty" role="group" aria-label="Quantity">
                <button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>
                <input type="number" id="qty" value="1" min="1" max="99" aria-label="Quantity">
                <button type="button" data-qty="1" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="btn btn-dark btn-lg" id="add-to-cart">${ICONS.cart}<span>Add to cart</span></button>`}
        </div>
        <div class="pdp-secondary">
          <button type="button" data-compare="${p.id}" aria-pressed="false">${ICONS.compare}<span>Add to compare</span></button>
          <a href="https://wa.me/${SITE.whatsapp}?text=${waText}" target="_blank" rel="noopener">${ICONS.arrow}<span>Ask on WhatsApp</span></a>
          <a href="contact.html?product=${encodeURIComponent(p.id)}&topic=listening">${ICONS.ear}<span>Book a listening session</span></a>
        </div>

        <p class="pdp-summary">${esc(p.summary)}</p>
        <ul class="highlights">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>

        <div class="assurance">
          <div>${ICONS.truck}<span><strong>Delivery &amp; set-up</strong>Free in Singapore on orders over ${money(SITE.freeDeliveryThreshold)}</span></div>
          <div>${ICONS.shield}<span><strong>Genuine stock</strong>Warranty support handled by our team</span></div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab-list" role="tablist" aria-label="Product information">
        <button type="button" role="tab" id="tab-dims" aria-controls="panel-dims" aria-selected="true">Dimensions</button>
        <button type="button" role="tab" id="tab-specs" aria-controls="panel-specs" aria-selected="false" tabindex="-1">Specifications</button>
        <button type="button" role="tab" id="tab-delivery" aria-controls="panel-delivery" aria-selected="false" tabindex="-1">Delivery &amp; warranty</button>
      </div>
      <div class="tab-panel" role="tabpanel" id="panel-dims" aria-labelledby="tab-dims"></div>
      <div class="tab-panel" role="tabpanel" id="panel-specs" aria-labelledby="tab-specs" hidden></div>
      <div class="tab-panel" role="tabpanel" id="panel-delivery" aria-labelledby="tab-delivery" hidden></div>
    </div>

    <section class="section" style="padding-top:24px" id="related-wrap">
      <div class="section-head"><div><p class="eyebrow">You may also like</p><h2 class="display" id="related-title"></h2></div></div>
      <div class="grid" id="related"></div>
    </section>`;

  /* ------------------------------------------------------------------ */
  /* Dimensions panel                                                    */
  /* ------------------------------------------------------------------ */
  const footprint = (p.dims.w * p.dims.d) / 1e6;
  const isSpeaker = ['standmount', 'floorstanding', 'centre', 'active', 'subwoofer'].includes(p.category);
  const tip = isSpeaker
    ? 'Planning placement? Most loudspeakers sound best with some space behind them. Allow room for cables at the back, and for rear-ported designs leave a gap to the wall. We\'re happy to advise for your room.'
    : p.category === 'stand' ? 'Check that your speaker\'s footprint suits the stand\'s top plate before ordering. Ask us if you\'re unsure.'
    : 'Planning a rack or cabinet? Allow extra depth behind the unit for plugs and cables, and some space above for ventilation, particularly for amplifiers.';
  $('#panel-dims').innerHTML = `
    <div class="dim-wrap">
      <figure class="dim-figure">
        ${R.drawing(p)}
        <figcaption>Front and side elevations drawn to scale from published dimensions. All measurements in millimetres.${p.dimsNote ? ' ' + esc(p.dimsNote) : ''}</figcaption>
      </figure>
      <div class="dim-table">
        <h3>Measurements</h3>
        <table class="spec-table">
          <tr><th>Height</th><td class="mono">${p.dims.h} mm</td></tr>
          <tr><th>Width</th><td class="mono">${p.dims.w} mm</td></tr>
          <tr><th>Depth</th><td class="mono">${p.dims.d} mm</td></tr>
          <tr><th>H × W × D</th><td class="mono">${p.dims.h} × ${p.dims.w} × ${p.dims.d} mm</td></tr>
          <tr><th>Footprint (W × D)</th><td class="mono">${p.dims.w} × ${p.dims.d} mm · ${footprint.toFixed(footprint < 0.01 ? 4 : 3)} m²</td></tr>
          <tr><th>Net weight</th><td class="mono">${p.weight == null ? 'Please enquire' : weightText(p.weight) + (p.unit === 'pair' ? ' per speaker' : '')}</td></tr>
          <tr><th>Sold as</th><td>${p.unit === 'pair' ? 'Pair (2 units)' : 'Single unit'}</td></tr>
        </table>
        <p class="tip">${tip}</p>
      </div>
    </div>`;

  /* ------------------------------------------------------------------ */
  /* Specifications panel                                                */
  /* ------------------------------------------------------------------ */
  const row = (k, v, mono) => `<tr><th>${esc(k)}</th><td${mono ? ' class="mono"' : ''}>${v}</td></tr>`;
  $('#panel-specs').innerHTML = `
    <div class="spec-cols">
      <div>
        <h3>Technical</h3>
        <table class="spec-table">${p.specs.map(([k, v]) => row(k, esc(v))).join('')}</table>
      </div>
      <div>
        <h3>General &amp; physical</h3>
        <table class="spec-table">
          ${row('Brand', esc(p.brand))}
          ${row('Range', esc(p.series))}
          ${row('Model', esc(p.name))}
          ${row('Category', esc(cat.name))}
          ${row('Dimensions (H × W × D)', `${p.dims.h} × ${p.dims.w} × ${p.dims.d} mm`, true)}
          ${row('Net weight', p.weight == null ? '—' : weightText(p.weight) + (p.unit === 'pair' ? ' each' : ''), true)}
          ${row('Finishes', p.finishes.map(finishLabel).join(', '))}
          ${row('Sold as', p.unit === 'pair' ? 'Pair' : 'Single unit')}
        </table>
      </div>
    </div>
    <p class="spec-disclaimer">Specifications are taken from manufacturer data and may change without notice. Finish availability varies, so please check with us before ordering.</p>`;

  /* ------------------------------------------------------------------ */
  /* Delivery panel                                                      */
  /* ------------------------------------------------------------------ */
  $('#panel-delivery').innerHTML = `
    <div class="info-cols">
      <div><h3>Delivery &amp; installation</h3><p>Free delivery across Singapore on orders over ${money(SITE.freeDeliveryThreshold)}; a ${money(SITE.deliveryFee)} fee applies below that. For larger systems our team can position, connect and set up your equipment, and remove the packaging.</p></div>
      <div><h3>Warranty</h3><p>All products are genuine, new stock supplied with the manufacturer's warranty. Should you need help, contact us and we will handle the claim on your behalf.</p></div>
      <div><h3>Collection &amp; demonstration</h3><p>Prefer to collect, or hear it first? Book a listening session and we'll have the ${esc(p.name)} set up and ready when you arrive.</p></div>
    </div>
    <p class="spec-disclaimer"><a class="link-arrow" href="contact.html#delivery">Full delivery, warranty &amp; returns information ${ICONS.arrow}</a></p>`;

  /* ------------------------------------------------------------------ */
  /* Related                                                             */
  /* ------------------------------------------------------------------ */
  let related = window.PRODUCTS.filter((x) => x.id !== p.id && x.series === p.series);
  let relTitle = `More from ${p.brand} ${p.series}`;
  if (related.length < 4) {
    const more = window.PRODUCTS.filter((x) => x.id !== p.id && x.series !== p.series && x.category === p.category);
    related = related.concat(more);
    if (!window.PRODUCTS.some((x) => x.id !== p.id && x.series === p.series)) relTitle = `More ${cat.name.toLowerCase()}`;
  }
  related = related.slice(0, 4);
  if (related.length) {
    $('#related-title').textContent = relTitle;
    $('#related').innerHTML = related.map(card).join('');
  } else {
    $('#related-wrap').remove();
  }

  /* ------------------------------------------------------------------ */
  /* Dynamic bits                                                        */
  /* ------------------------------------------------------------------ */
  const CAPTIONS = {
    angle: 'Three-quarter view showing true depth',
    front: 'Front view',
    grille: 'With grille fitted',
    side: 'Side profile',
    scale: 'Shown beside a 12" LP sleeve (314 mm) for scale',
    drawing: 'Dimension drawing, all measurements in mm',
  };
  const viewSVG = (v, cls, small) => (v.startsWith('photo')
    ? `<img class="${cls} prod-photo" src="${esc(PHOTO_LIST[+v.slice(5)])}" alt="${esc(fullName)}" ${small ? 'loading="lazy"' : ''}>`
    : v === 'drawing'
    ? R.drawing(p)
    : R.thumb(p, S.finish, { cls, view: v, pad: small ? 0.08 : 0.06, reflect: !small }));

  function renderGallery() {
    $('#gallery').innerHTML = VIEWS.map(([v, label]) => `<button type="button" class="g-thumb" data-view="${v}" aria-pressed="${v === S.view}" aria-label="${label}">
      <span class="g-img">${viewSVG(v, 'g-svg', true)}</span><span class="g-label">${label}</span></button>`).join('');
  }

  function renderStage() {
    const stage = $('#stage');
    stage.innerHTML = `<span class="card-badges">${badgeHTML(p)}</span>
      ${viewSVG(S.view, 'pdp-svg')}
      <button type="button" class="stage-nav prev" data-step-view="-1" aria-label="Previous image">‹</button>
      <button type="button" class="stage-nav next" data-step-view="1" aria-label="Next image">›</button>
      <button type="button" class="stage-zoom" data-zoom aria-label="Enlarge image"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
      <span class="scale-note">${ICONS.ruler}${CAPTIONS[S.view] || 'Product photo'} · ${p.dims.h} × ${p.dims.w} × ${p.dims.d} mm</span>`;
    stage.classList.toggle('is-drawing', S.view === 'drawing' || S.view === 'scale');
    $$('#gallery [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === S.view)));
  }

  function stepView(dir) {
    const i = VIEWS.findIndex(([v]) => v === S.view);
    S.view = VIEWS[(i + dir + VIEWS.length) % VIEWS.length][0];
    renderStage();
  }

  function openZoom() {
    let dlg = $('#zoom');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'zoom';
      dlg.className = 'zoom';
      document.body.appendChild(dlg);
      dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-zoom-close]')) dlg.close(); });
    }
    dlg.innerHTML = `<div class="zoom-inner">${viewSVG(S.view, 'zoom-svg')}<p>${esc(fullName)} · ${CAPTIONS[S.view] || 'Product photo'}</p>
      <button type="button" class="icon-btn zoom-close" data-zoom-close aria-label="Close">${ICONS.close}</button></div>`;
    dlg.showModal();
  }

  function renderPrice() {
    const el = $('#price');
    if (isEnquiry) {
      el.innerHTML = '<span class="price price-request">Price on request</span><span class="gst">Made to order. Contact us for pricing and lead time.</span>';
      return;
    }
    const unit = priceOf(p, S.variant);
    el.innerHTML = `<span class="price">${money(unit)} <small>${unitLabel(p)}</small></span><span class="gst">incl. GST of ${money(gstOf(unit))}</span>`;
  }

  function renderOptions() {
    $$('[data-finish]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.finish === S.finish)));
    $('#finish-name').textContent = finishLabel(S.finish);
    $$('[data-variant]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.variant === S.variant)));
  }

  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-finish]');
    if (f) { S.finish = f.dataset.finish; if (S.view === 'drawing') S.view = 'angle'; renderOptions(); renderStage(); renderGallery(); return; }
    const v = e.target.closest('[data-variant]');
    if (v) { S.variant = v.dataset.variant; renderOptions(); renderPrice(); return; }
    const vw = e.target.closest('[data-view]');
    if (vw) { S.view = vw.dataset.view; renderStage(); return; }
    const sv = e.target.closest('[data-step-view]');
    if (sv) { stepView(+sv.dataset.stepView); return; }
    if (e.target.closest('[data-zoom]')) { openZoom(); return; }
    const q = e.target.closest('[data-qty]');
    if (q) { const inp = $('#qty'); inp.value = Math.max(1, Math.min(99, (parseInt(inp.value, 10) || 1) + +q.dataset.qty)); return; }
    if (e.target.closest('#add-to-cart')) {
      const qty = Math.max(1, Math.min(99, parseInt($('#qty').value, 10) || 1));
      cart.add(p.id, { variant: S.variant, finish: S.finish, qty });
    }
  });

  // Tabs (with arrow-key support)
  const tabs = $$('[role="tab"]');
  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus(); selectTab(next);
    });
  });

  $('#stage').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); stepView(e.key === 'ArrowRight' ? 1 : -1); }
  });
  $('#stage').tabIndex = 0;
  $('#stage').setAttribute('aria-label', 'Product image. Use left and right arrow keys to change view.');
  renderGallery();
  renderStage();
  renderPrice();
  renderOptions();
  PAR.syncCompareUI();
  // Keep compare button label in sync
  const cmpBtn = $('.pdp-secondary [data-compare]');
  const syncCmpLabel = () => { cmpBtn.querySelector('span').textContent = compare.has(p.id) ? 'Added to compare' : 'Add to compare'; };
  syncCmpLabel();
  cmpBtn.addEventListener('click', () => setTimeout(syncCmpLabel, 0));
})();
