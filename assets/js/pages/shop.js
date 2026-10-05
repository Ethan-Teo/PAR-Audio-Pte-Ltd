(function () {
  'use strict';
  const { init, card, $, $$, esc, params, search, catById, ICONS, money } = window.PAR;
  const PRODUCTS = window.PRODUCTS;
  const BRANDS = window.BRANDS;
  const CATEGORIES = window.CATEGORIES;

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  const qp = params();
  const list = (k) => (qp.get(k) || '').split(',').map((s) => s.trim()).filter(Boolean);
  const num = (k) => { const v = parseFloat(qp.get(k)); return v > 0 ? v : null; };
  const S = {
    q: qp.get('q') || '',
    brand: new Set(list('brand').filter((b) => BRANDS[b])),
    cat: new Set(list('cat').filter(catById)),
    series: new Set(list('series')),
    pmin: num('pmin'), pmax: num('pmax'),
    maxh: num('maxh'), maxw: num('maxw'), maxd: num('maxd'),
    sort: qp.get('sort') || 'featured',
  };
  const group = qp.get('group');
  if (group) CATEGORIES.filter((c) => c.group === group).forEach((c) => S.cat.add(c.id));

  init(S.brand.size === 1 ? 'brands' : 'shop');

  /* ------------------------------------------------------------------ */
  /* Matching                                                            */
  /* ------------------------------------------------------------------ */
  const qSet = () => new Set(search(S.q).map((p) => p.id));
  function matches(p, skip, qs) {
    if (S.q && !qs.has(p.id)) return false;
    if (skip !== 'brand' && S.brand.size && !S.brand.has(p.brand)) return false;
    if (skip !== 'cat' && S.cat.size && !S.cat.has(p.category)) return false;
    if (skip !== 'series' && S.series.size && !S.series.has(p.series)) return false;
    if (S.pmin != null || S.pmax != null) {
      if (p.price == null) return false;
      if (S.pmin != null && p.price < S.pmin) return false;
      if (S.pmax != null && p.price > S.pmax) return false;
    }
    if ((S.maxh != null || S.maxw != null || S.maxd != null) && !p.dims) return false;
    if (S.maxh != null && p.dims.h > S.maxh) return false;
    if (S.maxw != null && p.dims.w > S.maxw) return false;
    if (S.maxd != null && p.dims.d > S.maxd) return false;
    return true;
  }

  const SORTS = {
    featured: () => 0,
    'price-asc': (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
    'price-desc': (a, b) => (b.price ?? -1) - (a.price ?? -1),
    name: (a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'en', { numeric: true }),
    'h-asc': (a, b) => (a.dims ? a.dims.h : Infinity) - (b.dims ? b.dims.h : Infinity),
    'h-desc': (a, b) => (b.dims ? b.dims.h : -1) - (a.dims ? a.dims.h : -1),
    'w-asc': (a, b) => (a.dims ? a.dims.w : Infinity) - (b.dims ? b.dims.w : Infinity),
    'weight-asc': (a, b) => (a.weight ?? Infinity) - (b.weight ?? Infinity),
  };

  /* ------------------------------------------------------------------ */
  /* Filter panel (built once; counts and states refreshed on change)   */
  /* ------------------------------------------------------------------ */
  const opt = (facet, value, label) => `<label class="filter-option"><input type="checkbox" data-facet="${facet}" value="${esc(value)}"> <span>${esc(label)}</span><span class="n" data-count="${facet}:${esc(value)}"></span></label>`;
  const seriesOpts = Object.entries(BRANDS).map(([b, info]) =>
    `<p class="filter-sub">${b}</p>` + Object.keys(info.series).map((s) => opt('series', s, s)).join('')).join('');
  const catOpts = window.CATEGORY_GROUPS.map((g) =>
    `<p class="filter-sub">${g}</p>` + CATEGORIES.filter((c) => c.group === g).map((c) => opt('cat', c.id, c.name)).join('')).join('');

  $('#filter-body').innerHTML = `
    <div class="filter-group">
      <h3><label for="f-q">Search</label></h3>
      <div class="filter-dims" style="grid-template-columns:1fr"><input id="f-q" type="search" placeholder="Model, range or type" value="${esc(S.q)}" style="font-family:var(--f-body)"></div>
    </div>
    <div class="filter-group"><h3>Brand</h3>${Object.keys(BRANDS).map((b) => opt('brand', b, b)).join('')}</div>
    <div class="filter-group"><h3>Category</h3>${catOpts}</div>
    <div class="filter-group"><h3>Range</h3>${seriesOpts}</div>
    <div class="filter-group"><h3>Price (S$)</h3>
      <div class="price-range">
        <label>Min<input type="number" inputmode="numeric" min="0" data-num="pmin" placeholder="0"></label>
        <label>Max<input type="number" inputmode="numeric" min="0" data-num="pmax" placeholder="Any"></label>
      </div>
    </div>
    <div class="filter-group"><h3>Fits within (mm)</h3>
      <div class="filter-dims">
        <label>Max H<input type="number" inputmode="numeric" min="1" data-num="maxh" placeholder="—"></label>
        <label>Max W<input type="number" inputmode="numeric" min="1" data-num="maxw" placeholder="—"></label>
        <label>Max D<input type="number" inputmode="numeric" min="1" data-num="maxd" placeholder="—"></label>
      </div>
      <p class="filter-help">Only show products that fit inside your shelf, cabinet or rack.</p>
    </div>`;

  $$('[data-num]').forEach((inp) => { const v = S[inp.dataset.num]; if (v != null) inp.value = v; });
  $('#sort').value = SORTS[S.sort] ? S.sort : 'featured';

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  const LABELS = { pmin: (v) => `From ${money(v)}`, pmax: (v) => `Up to ${money(v)}`, maxh: (v) => `H ≤ ${v} mm`, maxw: (v) => `W ≤ ${v} mm`, maxd: (v) => `D ≤ ${v} mm` };

  function render() {
    const qs = qSet();
    // facet counts
    ['brand', 'cat', 'series'].forEach((facet) => {
      const key = facet === 'cat' ? 'category' : facet;
      const pool = PRODUCTS.filter((p) => matches(p, facet, qs));
      $$(`[data-facet="${facet}"]`).forEach((cb) => {
        cb.checked = S[facet].has(cb.value);
        const n = pool.filter((p) => p[key] === cb.value).length;
        const out = document.querySelector(`[data-count="${facet}:${CSS.escape(cb.value)}"]`);
        if (out) out.textContent = n;
        cb.closest('.filter-option').style.opacity = n || cb.checked ? '' : '.45';
      });
    });

    const results = PRODUCTS.filter((p) => matches(p, null, qs));
    const sorter = SORTS[S.sort] || SORTS.featured;
    const sorted = results.map((p, i) => [p, i]).sort((a, b) => sorter(a[0], b[0]) || a[1] - b[1]).map((x) => x[0]);

    $('#results').innerHTML = sorted.length
      ? sorted.map(card).join('')
      : `<div class="empty" style="grid-column:1/-1"><h3>No products match</h3><p>Try widening your dimensions or removing a filter.</p><button type="button" class="btn btn-dark" data-clear>Clear all filters</button></div>`;
    $('#results-count').innerHTML = `<strong>${sorted.length}</strong> of ${PRODUCTS.length} products`;
    $('#filters-apply').textContent = `Show ${sorted.length} result${sorted.length === 1 ? '' : 's'}`;

    // chips
    const chips = [];
    if (S.q) chips.push(['q', '', `“${S.q}”`]);
    S.brand.forEach((v) => chips.push(['brand', v, v]));
    S.cat.forEach((v) => chips.push(['cat', v, catById(v).name]));
    S.series.forEach((v) => chips.push(['series', v, v]));
    Object.keys(LABELS).forEach((k) => { if (S[k] != null) chips.push([k, '', LABELS[k](S[k])]); });
    $('#chips').innerHTML = chips.map(([k, v, label]) => `<span class="chip">${esc(label)}<button type="button" data-remove="${k}" data-value="${esc(v)}" aria-label="Remove filter ${esc(label)}">${ICONS.close}</button></span>`).join('');
    const nActive = chips.length;
    $('#filters-toggle').textContent = nActive ? `Filters (${nActive})` : 'Filters';

    // heading
    let title = 'All products';
    let intro = `Every product from ${Object.keys(BRANDS).join(', ').replace(/, ([^,]*)$/, ' and $1')}, with full specifications and exact measurements in millimetres.`;
    const one = (set) => (set.size === 1 ? [...set][0] : null);
    const b = one(S.brand), s = one(S.series), c = one(S.cat);
    if (s) {
      const owner = Object.keys(BRANDS).find((k) => BRANDS[k].series[s]);
      title = `${owner} ${s}`; intro = BRANDS[owner].series[s];
    } else if (b && c) { title = `${b} ${catById(c).name}`; }
    else if (b) { title = b; intro = BRANDS[b].blurb; }
    else if (c) { title = catById(c).name; }
    else if (S.q) { title = `Search: “${S.q}”`; intro = 'Results from our complete catalogue.'; }
    else if (S.maxh || S.maxw || S.maxd) { title = 'Products that fit your space'; intro = 'Every product below fits within the maximum dimensions you entered.'; }
    $('#shop-title').textContent = title;
    $('#shop-intro').textContent = intro;
    const brandCrumb = b || (s && Object.keys(BRANDS).find((k) => BRANDS[k].series[s]));
    $('#crumbs').innerHTML = brandCrumb
      ? `<a href="brands.html">Brands</a><span aria-hidden="true">/</span>${s ? `<a href="shop.html?brand=${encodeURIComponent(brandCrumb)}">${esc(brandCrumb)}</a><span aria-hidden="true">/</span><span>${esc(s)}</span>` : `<span>${esc(brandCrumb)}</span>`}`
      : `<span>${esc(title === 'All products' ? 'Shop' : title)}</span>`;
    document.title = `${title} — PAR Audio Pte Ltd`;

    // URL
    const out = new URLSearchParams();
    if (S.q) out.set('q', S.q);
    if (S.brand.size) out.set('brand', [...S.brand].join(','));
    if (S.cat.size) out.set('cat', [...S.cat].join(','));
    if (S.series.size) out.set('series', [...S.series].join(','));
    ['pmin', 'pmax', 'maxh', 'maxw', 'maxd'].forEach((k) => { if (S[k] != null) out.set(k, S[k]); });
    if (S.sort !== 'featured') out.set('sort', S.sort);
    history.replaceState(null, '', location.pathname + (out.toString() ? '?' + out : ''));
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */
  $('#filter-body').addEventListener('change', (e) => {
    const cb = e.target.closest('[data-facet]');
    if (!cb) return;
    const set = S[cb.dataset.facet];
    if (cb.checked) set.add(cb.value); else set.delete(cb.value);
    render();
  });
  let t;
  $('#filter-body').addEventListener('input', (e) => {
    const inp = e.target;
    clearTimeout(t);
    t = setTimeout(() => {
      if (inp.id === 'f-q') S.q = inp.value.trim();
      else if (inp.dataset.num) { const v = parseFloat(inp.value); S[inp.dataset.num] = v > 0 ? v : null; }
      else return;
      render();
    }, 220);
  });
  $('#sort').addEventListener('change', (e) => { S.sort = e.target.value; render(); });

  function clearAll() {
    S.q = ''; S.brand.clear(); S.cat.clear(); S.series.clear();
    ['pmin', 'pmax', 'maxh', 'maxw', 'maxd'].forEach((k) => { S[k] = null; });
    $('#f-q').value = '';
    $$('[data-num]').forEach((i) => { i.value = ''; });
    render();
  }
  $('#clear-all').addEventListener('click', clearAll);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear]')) { clearAll(); return; }
    const rm = e.target.closest('[data-remove]');
    if (!rm) return;
    const k = rm.dataset.remove;
    if (k === 'q') { S.q = ''; $('#f-q').value = ''; }
    else if (S[k] instanceof Set) S[k].delete(rm.dataset.value);
    else { S[k] = null; const inp = document.querySelector(`[data-num="${k}"]`); if (inp) inp.value = ''; }
    render();
  });

  const closeFilters = () => document.body.classList.remove('filters-open');
  $('#filters-toggle').addEventListener('click', () => document.body.classList.add('filters-open'));
  $('#filters-close').addEventListener('click', closeFilters);
  $('#filters-apply').addEventListener('click', () => { closeFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilters(); });

  render();
})();
