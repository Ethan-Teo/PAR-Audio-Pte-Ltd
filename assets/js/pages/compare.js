(function () {
  'use strict';
  const PAR = window.PAR;
  const { $, esc, money, byId, catById, params, productUrl, unitLabel, weightText, finishLabel, compare, ICONS } = PAR;
  const R = window.PARRender;

  PAR.init('compare');
  const root = $('#compare-root');

  // A shared link (?ids=a,b,c) replaces the visitor's current selection
  const shared = (params().get('ids') || '').split(',').filter(byId);
  if (shared.length) { compare.set(shared); history.replaceState(null, '', location.pathname); }

  const PRESETS = [
    ['Heritage standmounts', ['denton-85', 'super-denton', 'linton', 'super-linton']],
    ['Floorstanders across the range', ['diamond-12-4i', 'evo-5-4', 'aura-4', 'elysian-4r']],
    ['Audiolab integrated amplifiers', ['audiolab-6000a-mkii', 'audiolab-7000a', 'audiolab-9000a', 'audiolab-omnia']],
    ['Centre speakers', ['diamond-12-ci', 'evo-5-c', 'heritage-centre', 'elysian-cr']],
    ['Subwoofers', ['wh-d10', 'sw-12', 'eq-minime-p12', 'eq-supernova-mkvi-12']],
    ['Quad ESL vs Revela', ['quad-revela-1', 'quad-revela-2', 'quad-esl-2812x', 'quad-esl-2912x']],
  ];

  function picker(ids) {
    if (ids.length >= 4) return '';
    const opts = Object.keys(window.BRANDS).map((b) => `<optgroup label="${b}">${window.PRODUCTS.filter((p) => p.brand === b && !ids.includes(p.id)).map((p) => `<option value="${p.id}">${esc(p.series)} · ${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
    return `<div class="cmp-add">
      <label class="visually-hidden" for="cmp-select">Add a product to compare</label>
      <select class="select" id="cmp-select"><option value="">Add a product to compare…</option>${opts}</select>
      <button type="button" class="btn btn-dark btn-sm" id="cmp-add">Add</button>
      <span class="muted" style="font-size:13px">${4 - ids.length} slot${4 - ids.length === 1 ? '' : 's'} left</span>
    </div>`;
  }

  function render() {
    const ids = compare.ids();
    if (!ids.length) {
      root.innerHTML = `
        <div class="empty" style="margin-top:40px">
          <h3>Nothing to compare yet</h3>
          <p>Tick “Compare” on any product, add one below, or start with a popular comparison.</p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
            ${PRESETS.map(([label, list], i) => `<button type="button" class="btn btn-outline btn-sm" data-preset="${i}">${esc(label)}</button>`).join('')}
          </div>
        </div>
        <div style="display:flex;justify-content:center">${picker(ids)}</div>`;
      return;
    }
    const items = ids.map(byId);
    const n = items.length;

    const lineup = R.lineup(items.filter((p) => p.dims).map((p) => ({ parts: [{ p }], label: p.name, sub: `${p.dims.w} W × ${p.dims.d} D` })), {
      ruler: true, label: 'Selected products drawn to the same scale',
    });

    // Union of technical spec labels, in first-seen order
    const keys = [];
    items.forEach((p) => p.specs.forEach(([k]) => { if (!keys.includes(k)) keys.push(k); }));
    const specVal = (p, k) => { const hit = p.specs.find(([kk]) => kk === k); return hit ? esc(hit[1]) : '<span class="muted">—</span>'; };

    const best = (vals, fn) => { const nums = vals.filter((v) => v != null); if (nums.length < 2) return null; return fn(...nums); };
    const dv = (p, k) => (p.dims ? p.dims[k] : null);
    const minH = best(items.map((p) => dv(p, 'h')), Math.min);
    const minW = best(items.map((p) => dv(p, 'w')), Math.min);
    const minD = best(items.map((p) => dv(p, 'd')), Math.min);
    const dash = '<span class="muted">—</span>';
    const cell = (v, isBest, mono) => `<td class="${mono ? 'mono' : ''}${isBest ? ' best' : ''}">${v}</td>`;
    const tr = (label, cells) => `<tr><th scope="row">${label}</th>${cells}</tr>`;
    const grp = (label) => `<tr class="group"><th scope="rowgroup" colspan="${n + 1}">${label}</th></tr>`;

    root.innerHTML = `
      ${lineup ? `<div class="compare-scale">
        ${lineup}
        <p>All products shown at the same scale. Heights in millimetres; width (W) and depth (D) below each name.${items.some((p) => !p.dims) ? ' Cables are not shown in the scale view.' : ''}</p>
      </div>` : ''}
      ${picker(ids)}
      <div class="cmp-wrap">
        <table class="cmp-table">
          <colgroup><col style="width:200px">${items.map(() => '<col>').join('')}</colgroup>
          <thead><tr><th scope="col"><span class="visually-hidden">Specification</span></th>
            ${items.map((p) => `<th scope="col"><div class="cmp-head">
              <a class="cmp-thumb" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">${PAR.media(p, null, { pad: 0.06, view: 'angle' })}</a>
              <span class="eyebrow" style="font-size:10.5px;color:var(--muted)">${esc(p.brand)} · ${esc(p.series)}</span>
              <a class="name" href="${productUrl(p)}">${esc(p.name)}</a>
              ${p.price == null ? '<span class="price price-request">Price on request</span>' : `<span class="price">${money(p.price)} <small>${unitLabel(p)}</small></span>`}
              ${p.price == null ? `<a class="btn btn-outline btn-sm" href="contact.html?product=${p.id}">Enquire</a>` : `<button type="button" class="btn btn-dark btn-sm" data-add="${p.id}">${ICONS.plus}<span>Add to cart</span></button>`}
              <button type="button" class="remove" data-compare="${p.id}">Remove</button>
            </div></th>`).join('')}
          </tr></thead>
          <tbody>
            ${grp('Dimensions (mm)')}
            ${tr('Height', items.map((p) => cell(p.dims ? `${p.dims.h} mm` : dash, p.dims && p.dims.h === minH, true)).join(''))}
            ${tr('Width', items.map((p) => cell(p.dims ? `${p.dims.w} mm` : dash, p.dims && p.dims.w === minW, true)).join(''))}
            ${tr('Depth', items.map((p) => cell(p.dims ? `${p.dims.d} mm` : dash, p.dims && p.dims.d === minD, true)).join(''))}
            ${tr('Footprint (W × D)', items.map((p) => cell(p.dims ? `${p.dims.w} × ${p.dims.d} mm` : dash, false, true)).join(''))}
            ${items.some((p) => !p.dims) ? tr('Measurements', items.map((p) => cell(p.dims ? dash : esc(PAR.dimsText(p)), false, true)).join('')) : ''}
            ${tr('Net weight', items.map((p) => cell(p.weight == null ? '—' : weightText(p.weight), false, true)).join(''))}
            ${tr('Dimension notes', items.map((p) => cell(p.dimsNote ? `<span class="muted" style="font-size:13px">${esc(p.dimsNote)}</span>` : '<span class="muted">—</span>')).join(''))}
            ${grp('Overview')}
            ${tr('Type', items.map((p) => cell(esc(p.type))).join(''))}
            ${tr('Category', items.map((p) => cell(esc(catById(p.category).name))).join(''))}
            ${tr('Sold as', items.map((p) => cell(p.unit === 'pair' ? 'Pair' : p.unit === 'metre' ? 'Per metre' : 'Single unit')).join(''))}
            ${tr('Finishes', items.map((p) => cell(p.finishes.map(finishLabel).join(', '))).join(''))}
            ${grp('Specifications')}
            ${keys.map((k) => tr(esc(k), items.map((p) => cell(specVal(p, k))).join(''))).join('')}
          </tbody>
        </table>
      </div>
      <p class="spec-disclaimer">Highlighted values are the smallest in each dimension. <button type="button" class="link-btn" id="cmp-share">Copy a link to this comparison</button> · <button type="button" class="link-btn" data-compare-clear>Clear comparison</button></p>`;
  }

  root.addEventListener('click', (e) => {
    const pre = e.target.closest('[data-preset]');
    if (pre) { compare.set(PRESETS[+pre.dataset.preset][1]); render(); return; }
    if (e.target.closest('#cmp-add')) {
      const v = $('#cmp-select').value;
      if (v) { compare.toggle(v); render(); }
      return;
    }
    if (e.target.closest('#cmp-share')) {
      const url = `${location.origin}${location.pathname}?ids=${compare.ids().join(',')}`;
      const done = () => PAR.toast('Comparison link copied to clipboard.');
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('Copy this link:', url));
      else prompt('Copy this link:', url);
      return;
    }
    // Remove / clear buttons are handled globally; re-render after they run
    if (e.target.closest('[data-compare], [data-compare-clear]')) setTimeout(render, 0);
  });
  window.addEventListener('storage', render);

  render();
})();
