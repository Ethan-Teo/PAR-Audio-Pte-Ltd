(function () {
  'use strict';
  const PAR = window.PAR;
  const { $, esc, media, ICONS } = PAR;
  const R = window.PARRender;
  const PRODUCTS = window.PRODUCTS;
  const BRANDS = window.BRANDS;

  PAR.init('brands');

  const names = Object.keys(BRANDS).sort((a, b) => a.localeCompare(b));
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const shopUrl = (brand, series) => `shop.html?brand=${encodeURIComponent(brand)}${series ? `&series=${encodeURIComponent(series)}` : ''}`;
  const count = (fn) => PRODUCTS.filter(fn).length;

  $('#brands-intro').textContent = `${names.length} brands, ${PRODUCTS.length} models. Choose a brand to see its complete range, every product specified in millimetres.`;

  $('#brand-index').innerHTML = names.map((b) =>
    `<a href="#brand-${slug(b)}">${esc(b)} <span>${count((p) => p.brand === b)}</span></a>`).join('');

  $('#brands-list').innerHTML = names.map((b) => {
    const info = BRANDS[b];
    const series = Object.keys(info.series);
    // Lineup of each range's lead model, drawn to the same scale
    const leads = series.map((s) => PRODUCTS.find((p) => p.brand === b && p.series === s)).filter(Boolean).slice(0, 5);
    const visual = R.lineup(leads.map((p) => ({ parts: [{ p }] })), { names: false, heights: false, cls: 'bp-svg', gap: 60 });
    return `<section class="brand-block" id="brand-${slug(b)}" aria-labelledby="bh-${slug(b)}">
      <div class="brand-hero">
        <div>
          <p class="eyebrow">Est. ${info.founded} · ${esc(info.origin)}</p>
          <h2 id="bh-${slug(b)}">${esc(b)}</h2>
          <p class="brand-blurb">${esc(info.blurb)}</p>
          <div class="brand-stats"><span><b>${count((p) => p.brand === b)}</b> models</span><span><b>${series.length}</b> ranges</span></div>
          <a class="btn btn-dark" href="${shopUrl(b)}">Shop all ${esc(b)} ${ICONS.arrow}</a>
        </div>
        <div class="brand-visual" aria-hidden="true">${visual}</div>
      </div>
      <div class="range-grid">
        ${series.map((s) => {
          const lead = PRODUCTS.find((p) => p.brand === b && p.series === s);
          const n = count((p) => p.brand === b && p.series === s);
          return `<a class="range-card" href="${shopUrl(b, s)}">
            <span class="rc-media">${lead ? media(lead, null, { view: 'angle', pad: 0.08 }) : ''}</span>
            <span class="rc-body"><strong>${esc(s)}</strong><span>${esc(info.series[s])}</span><em>${n} model${n === 1 ? '' : 's'} ${ICONS.arrow}</em></span>
          </a>`;
        }).join('')}
      </div>
    </section>`;
  }).join('');
})();
