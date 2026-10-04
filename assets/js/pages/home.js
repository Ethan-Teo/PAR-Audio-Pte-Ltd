(function () {
  'use strict';
  const { init, byId, card, $, esc, ICONS } = window.PAR;
  const R = window.PARRender;
  const PRODUCTS = window.PRODUCTS;
  const SITE = window.SITE;

  init('home');

  /* Stats */
  const seriesCount = Object.values(window.BRANDS).reduce((n, b) => n + Object.keys(b.series).length, 0);
  $('#stat-models').textContent = PRODUCTS.length;
  $('#stat-ranges').textContent = seriesCount;

  /* Hero: real products, drawn to the same scale */
  $('#hero-lineup').innerHTML = R.lineup([
    { parts: [{ p: byId('elysian-4r'), finish: 'walnut' }], label: 'Elysian 4R', sub: 'Wharfedale' },
    { parts: [{ p: byId('linton-stands') }, { p: byId('linton'), finish: 'walnut' }], label: 'Linton + stands', sub: 'Wharfedale' },
    { parts: [{ p: byId('audiolab-9000cdt'), finish: 'silver' }, { p: byId('audiolab-9000a'), finish: 'silver' }, { p: byId('audiolab-9000n'), finish: 'silver' }], label: '9000 Series', sub: 'Audiolab' },
    { parts: [{ p: byId('evo-5-3'), finish: 'white' }], label: 'EVO 5.3', sub: 'Wharfedale' },
  ], { ruler: true, label: 'Wharfedale Elysian 4R, Linton on stands, Audiolab 9000 Series stack and Wharfedale EVO 5.3 drawn to the same scale' });

  /* Trust strip */
  $('#trust').innerHTML = [
    ['ruler', 'Exact dimensions', 'Every product in mm, drawn to scale'],
    ['truck', 'Delivery & set-up', `Free in Singapore over S$${SITE.freeDeliveryThreshold}`],
    ['ear', 'Listening sessions', 'Audition by appointment'],
    ['shield', 'Genuine products', 'Warranty support handled locally'],
  ].map(([icon, t, s]) => `<div class="trust-item">${ICONS[icon]}<div><strong>${t}</strong><span>${s}</span></div></div>`).join('');

  /* Brand panels */
  const countBy = (brand) => PRODUCTS.filter((p) => p.brand === brand).length;
  const brandPanel = (brand, cls, visual) => {
    const b = window.BRANDS[brand];
    const chips = Object.keys(b.series).map((s) => `<a href="shop.html?brand=${encodeURIComponent(brand)}&series=${encodeURIComponent(s)}">${esc(s)}</a>`).join('');
    return `<article class="brand-panel ${cls}">
      <div>
        <p class="eyebrow">Est. ${b.founded} · ${esc(b.origin)}</p>
        <h3>${brand}</h3>
        <p>${esc(b.blurb)}</p>
        <div class="brand-meta"><span><b>${countBy(brand)}</b> models</span><span><b>${Object.keys(b.series).length}</b> ranges</span></div>
      </div>
      <div class="bp-visual" aria-hidden="true">${visual}</div>
      <div>
        <div class="series-chips">${chips}</div>
        <a class="btn btn-light" style="margin-top:22px" href="shop.html?brand=${brand}">Shop all ${brand} ${ICONS.arrow}</a>
      </div>
    </article>`;
  };
  const wVisual = R.lineup([
    { parts: [{ p: byId('elysian-4r'), finish: 'walnut' }] },
    { parts: [{ p: byId('aura-3'), finish: 'piano-white' }] },
    { parts: [{ p: byId('evo-5-4'), finish: 'walnut' }] },
    { parts: [{ p: byId('linton-stands') }, { p: byId('linton'), finish: 'mahogany' }] },
  ], { names: false, heights: false, gap: 90, cls: 'bp-svg' });
  const aVisual = R.lineup([
    { parts: [{ p: byId('audiolab-7000cdt'), finish: 'silver' }, { p: byId('audiolab-7000a'), finish: 'silver' }, { p: byId('audiolab-7000n-play'), finish: 'silver' }] },
    { parts: [{ p: byId('audiolab-omnia'), finish: 'silver' }] },
    { parts: [{ p: byId('audiolab-d9'), finish: 'silver' }] },
  ], { names: false, heights: false, gap: 40, cls: 'bp-svg' });
  $('#brand-grid').innerHTML = brandPanel('Wharfedale', 'wharfedale', wVisual) + brandPanel('Audiolab', 'audiolab', aVisual);

  /* Category tiles */
  const rep = {
    standmount: ['linton', 'walnut'], floorstanding: ['elysian-4r', 'walnut'], centre: ['heritage-centre', 'walnut'],
    subwoofer: ['sw-12'], active: ['diamond-active-a1', 'white'], stand: ['linton-stands'],
    integrated: ['audiolab-9000a', 'silver'], prepower: ['audiolab-9000p', 'black'], streamer: ['audiolab-7000n-play', 'silver'],
    cd: ['audiolab-6000cdt', 'black'], allinone: ['audiolab-omnia', 'silver'], dac: ['audiolab-d7', 'silver'],
  };
  $('#cat-grid').innerHTML = window.CATEGORIES.map((c) => {
    const [id, fin] = rep[c.id];
    const n = PRODUCTS.filter((p) => p.category === c.id).length;
    return `<a class="cat-tile" href="shop.html?cat=${c.id}">
      <div class="ct-media">${R.thumb(byId(id), fin, { pad: 0.08 })}</div>
      <div class="ct-body"><strong>${esc(c.name)}</strong><span>${n} model${n === 1 ? '' : 's'}</span></div>
    </a>`;
  }).join('');

  /* Featured */
  const featuredIds = ['elysian-4r', 'linton', 'evo-5-1', 'heritage-centre', 'audiolab-9000a', 'audiolab-7000a', 'audiolab-6000a-mkii', 'diamond-12-1i'];
  $('#featured-grid').innerHTML = featuredIds.map((id) => card(byId(id))).join('');

  /* Fit tool */
  const sel = $('#fit-cat');
  sel.innerHTML = '<option value="">Any product</option>' +
    ['Speakers', 'Electronics'].map((g) => `<optgroup label="${g}">${window.CATEGORIES.filter((c) => c.group === g).map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</optgroup>`).join('');
  const form = $('#fit-form');
  const note = $('#fit-note');
  const updateFit = () => {
    const v = (n) => { const x = parseFloat(form.elements[n].value); return x > 0 ? x : Infinity; };
    const mh = v('maxh'), mw = v('maxw'), md = v('maxd');
    const cat = sel.value;
    const list = PRODUCTS.filter((p) => (!cat || p.category === cat) && p.dims.h <= mh && p.dims.w <= mw && p.dims.d <= md);
    const any = [mh, mw, md].some((x) => x !== Infinity);
    note.innerHTML = any
      ? `<span class="mono">${list.length}</span> product${list.length === 1 ? '' : 's'} fit within <span class="mono">${[mh, mw, md].map((x) => (x === Infinity ? '∞' : x)).join(' × ')} mm</span> (H × W × D).`
      : 'Leave a field empty if that dimension doesn\'t matter.';
  };
  form.addEventListener('input', updateFit);
  form.addEventListener('submit', (e) => {
    // Drop empty fields so the shop URL stays clean
    e.preventDefault();
    const qs = new URLSearchParams();
    ['maxh', 'maxw', 'maxd', 'cat'].forEach((n) => { const val = form.elements[n].value.trim(); if (val) qs.set(n, val); });
    location.href = 'shop.html' + (qs.toString() ? '?' + qs : '');
  });
  updateFit();

  /* Series list */
  $('#series-list').innerHTML = Object.entries(window.BRANDS).flatMap(([brand, b]) =>
    Object.entries(b.series).map(([s, desc]) => {
      const n = PRODUCTS.filter((p) => p.brand === brand && p.series === s).length;
      return `<a class="series-item" href="shop.html?brand=${encodeURIComponent(brand)}&series=${encodeURIComponent(s)}">
        <div><p class="eyebrow">${brand}</p><h3>${esc(s)}</h3><p>${esc(desc)}</p></div>
        <span class="count">${String(n).padStart(2, '0')}</span></a>`;
    })).join('');

  /* Services */
  $('#services').innerHTML = [
    ['ear', 'Listening sessions', 'Hear Wharfedale and Audiolab systems side by side in a quiet, treated room. Bring your own music. Sessions are by appointment so you have our full attention.', 'contact.html#listening', 'Book a session'],
    ['truck', 'Delivery & installation', `Free delivery across Singapore on orders over S$${SITE.freeDeliveryThreshold}. Our team can unpack, position and connect your system, and take the packaging away.`, 'contact.html#delivery', 'Delivery details'],
    ['ruler', 'System planning', 'Send us your room or cabinet measurements. We\'ll recommend speakers, stands and electronics that fit your space, your budget and the way you listen.', 'contact.html', 'Ask our team'],
  ].map(([icon, t, d, href, cta]) => `<div class="service">${ICONS[icon]}<h3>${t}</h3><p>${d}</p><a class="link-arrow" style="margin-top:18px" href="${href}">${cta} ${ICONS.arrow}</a></div>`).join('');
})();
