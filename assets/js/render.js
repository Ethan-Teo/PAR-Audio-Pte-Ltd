/*
 * PAR Audio — to-scale product illustrations.
 *
 * Every illustration is generated from the product's real dimensions in millimetres,
 * so a 1188 mm floorstander and a 444 mm amplifier are always drawn in true proportion.
 * Layout functions produce a list of primitive shapes in mm coordinates; painters turn
 * those shapes into either a solid "product shot" or a line-only technical drawing.
 */
(function () {
  'use strict';

  let uidCounter = 0;
  const uid = (p) => `${p}${++uidCounter}`;
  const r1 = (n) => Math.round(n * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------------ */
  /* Finishes                                                            */
  /* ------------------------------------------------------------------ */
  const FINISHES = {
    'walnut':      { label: 'Walnut',      a: '#8a5631', b: '#5c3519', wood: true },
    'mahogany':    { label: 'Mahogany',    a: '#7a3424', b: '#4a1c12', wood: true },
    'black-oak':   { label: 'Black Oak',   a: '#3a3430', b: '#1d1916', wood: true },
    'light-oak':   { label: 'Light Oak',   a: '#d2b080', b: '#a98456', wood: true },
    'piano-black': { label: 'Piano Black', a: '#2a2a2e', b: '#08080a', gloss: true },
    'piano-white': { label: 'Piano White', a: '#fbfaf8', b: '#d8d6d1', gloss: true },
    'black':       { label: 'Black',       a: '#313134', b: '#18181a' },
    'white':       { label: 'White',       a: '#f6f5f2', b: '#d7d5d0' },
    'grey':        { label: 'Grey',        a: '#9a9da1', b: '#6c6f73' },
    'silver':      { label: 'Silver',      a: '#eceef0', b: '#a9adb2', metal: true },
  };

  /* ------------------------------------------------------------------ */
  /* Driver parsing                                                      */
  /* ------------------------------------------------------------------ */
  function parseDriver(code) {
    if (Array.isArray(code)) return { group: code.map(parseDriver) };
    const [t, v] = code.split(':');
    if (t === 'cone') { const d = +v; return { t, d, w: d, h: d }; }
    if (t === 'dome') { const d = +v; const p = d + 60; return { t, d, w: p, h: p }; }
    if (t === 'amt') { const [fw, fh] = v.split('x').map(Number); return { t, fw, fh, w: fw + 36, h: fh + 36 }; }
    throw new Error('Unknown driver ' + code);
  }

  function sizeOf(item, dir, gap) {
    // dir: 'h' (horizontal group) or 'v' (vertical group)
    if (!item.group) return { w: item.w, h: item.h };
    const sizes = item.group.map((g) => sizeOf(g, dir === 'h' ? 'v' : 'h', gap));
    if (dir === 'h') return { w: sizes.reduce((s, z) => s + z.w, 0) + gap * (sizes.length - 1), h: Math.max(...sizes.map((z) => z.h)) };
    return { w: Math.max(...sizes.map((z) => z.w)), h: sizes.reduce((s, z) => s + z.h, 0) + gap * (sizes.length - 1) };
  }

  function scaleDriver(item, k) {
    if (item.group) return { group: item.group.map((g) => scaleDriver(g, k)) };
    const o = Object.assign({}, item);
    ['d', 'w', 'h', 'fw', 'fh'].forEach((key) => { if (o[key] != null) o[key] *= k; });
    return o;
  }

  function driverShapes(item, cx, cy, dir, gap, out) {
    if (item.group) {
      const sz = sizeOf(item, dir, gap);
      if (dir === 'h') {
        let x = cx - sz.w / 2;
        item.group.forEach((g) => {
          const s = sizeOf(g, 'v', gap);
          driverShapes(g, x + s.w / 2, cy, 'v', gap, out);
          x += s.w + gap;
        });
      } else {
        let y = cy - sz.h / 2;
        item.group.forEach((g) => {
          const s = sizeOf(g, 'h', gap);
          driverShapes(g, cx, y + s.h / 2, 'h', gap, out);
          y += s.h + gap;
        });
      }
      return;
    }
    if (item.t === 'cone') {
      const R = item.d / 2;
      out.push({ s: 'circle', cx, cy, r: R, role: 'frame' });
      out.push({ s: 'circle', cx, cy, r: R * 0.86, role: 'surround' });
      out.push({ s: 'circle', cx, cy, r: R * 0.74, role: 'cone' });
      out.push({ s: 'circle', cx, cy, r: R * 0.58, role: 'ridge' });
      out.push({ s: 'circle', cx, cy, r: R * 0.43, role: 'ridge' });
      out.push({ s: 'circle', cx, cy, r: R * 0.26, role: 'cap' });
      out.push({ s: 'circle', cx: cx - R * 0.09, cy: cy - R * 0.09, r: R * 0.075, role: 'spec' });
      if (item.d >= 110) {
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 4 + (i * Math.PI) / 2;
          out.push({ s: 'circle', cx: cx + Math.cos(a) * R * 0.93, cy: cy + Math.sin(a) * R * 0.93, r: Math.max(R * 0.035, 1.5), role: 'screw' });
        }
      }
    } else if (item.t === 'dome') {
      out.push({ s: 'circle', cx, cy, r: item.w / 2, role: 'tw-plate' });
      out.push({ s: 'circle', cx, cy, r: item.d / 2 + item.d * 0.2, role: 'tw-ring' });
      out.push({ s: 'circle', cx, cy, r: item.d / 2, role: 'tw-dome' });
      out.push({ s: 'circle', cx: cx - item.d * 0.15, cy: cy - item.d * 0.15, r: item.d * 0.12, role: 'spec' });
    } else if (item.t === 'amt') {
      out.push({ s: 'rect', x: cx - item.w / 2, y: cy - item.h / 2, w: item.w, h: item.h, rx: Math.min(item.w, item.h) * 0.12, role: 'amt-plate' });
      out.push({ s: 'rect', x: cx - item.fw / 2, y: cy - item.fh / 2, w: item.fw, h: item.fh, rx: 1.5, role: 'amt-film' });
      const n = Math.max(4, Math.round(item.fh / 4.5));
      for (let i = 1; i < n; i++) {
        const y = cy - item.fh / 2 + (item.fh * i) / n;
        out.push({ s: 'line', x1: cx - item.fw / 2 + 1, y1: y, x2: cx + item.fw / 2 - 1, y2: y, role: 'pleat' });
      }
      const inset = 7;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        out.push({ s: 'circle', cx: cx + sx * (item.w / 2 - inset), cy: cy + sy * (item.h / 2 - inset), r: 2, role: 'screw' });
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Layouts (all coordinates in mm, origin = top-left of bounding box) */
  /* ------------------------------------------------------------------ */
  function layoutSpeaker(p) {
    const { h: H, w: W } = p.dims;
    const R = p.render;
    const out = [];
    const isFloor = H > W * 2.1;
    const plinthH = R.plinth ? clamp(H * (isFloor ? 0.035 : 0.03), 10, 42) : 0;
    const cabW = R.plinth ? W * 0.94 : W;
    const cabX = (W - cabW) / 2;
    const bodyH = H - plinthH;
    const rad = Math.min(cabW, bodyH) * 0.025;

    out.push({ s: 'rect', x: cabX, y: 0, w: cabW, h: bodyH, rx: rad, role: 'cab' });
    const inset = Math.max(cabW * 0.035, 5);
    out.push({ s: 'rect', x: cabX + inset, y: inset, w: cabW - inset * 2, h: bodyH - inset * 2, rx: Math.max(rad - 2, 1), role: R.baffle === 'black' ? 'baffle' : 'baffle-match' });
    if (plinthH) out.push({ s: 'rect', x: 0, y: bodyH, w: W, h: plinthH, rx: 2, role: 'plinth' });

    const areaW = cabW - inset * 2;
    const areaH = bodyH - inset * 2;
    const badgeH = clamp(bodyH * 0.02, 4, 9);

    if (R.row) {
      // Horizontal arrangement (centre speakers)
      let items = R.row.map(parseDriver);
      const gap0 = 10;
      let sizes = items.map((it) => sizeOf(it, 'v', gap0));
      let total = sizes.reduce((s, z) => s + z.w, 0);
      let maxH = Math.max(...sizes.map((z) => z.h));
      const k = Math.min(1, (areaW * 0.9) / total, (areaH * 0.86) / maxH);
      if (k < 1) { items = items.map((it) => scaleDriver(it, k)); sizes = items.map((it) => sizeOf(it, 'v', gap0)); total = sizes.reduce((s, z) => s + z.w, 0); }
      const gap = (areaW - total) / (items.length + 1);
      let x = cabX + inset + gap;
      const cy = inset + areaH / 2 - badgeH * 0.6;
      items.forEach((it, i) => { driverShapes(it, x + sizes[i].w / 2, cy, 'v', gap0 * k, out); x += sizes[i].w + gap; });
    } else {
      let items = R.drivers.map(parseDriver);
      const gapG = 10;
      let sizes = items.map((it) => sizeOf(it, 'h', gapG));
      let total = sizes.reduce((s, z) => s + z.h, 0);
      let maxW = Math.max(...sizes.map((z) => z.w));
      const k = Math.min(1, (areaW * 0.9) / maxW, (areaH * 0.9) / total);
      if (k < 1) { items = items.map((it) => scaleDriver(it, k)); sizes = items.map((it) => sizeOf(it, 'h', gapG)); total = sizes.reduce((s, z) => s + z.h, 0); }
      let gap, y;
      if (isFloor) {
        gap = clamp(H * 0.022, 10, 34);
        y = inset + clamp(areaW * 0.18, 18, 70);
      } else {
        const free = areaH - total - badgeH * 2;
        gap = Math.min(free / (items.length + 1), Math.max(total * 0.12, 14));
        y = inset + (free - gap * (items.length - 1)) * 0.42;
      }
      const cx = cabX + cabW / 2;
      items.forEach((it, i) => { driverShapes(it, cx, y + sizes[i].h / 2, 'h', gapG * k, out); y += sizes[i].h + gap; });
    }

    const bw = clamp(cabW * 0.16, 14, 60);
    out.push({ s: 'rect', x: cabX + cabW / 2 - bw / 2, y: bodyH - inset - badgeH * 2.2, w: bw, h: badgeH, rx: badgeH / 2, role: 'badge' });
    return out;
  }

  function layoutSub(p) {
    const { h: H, w: W } = p.dims;
    const feet = p.render.feet || 0;
    const visFeet = feet ? Math.min(feet, H * 0.12) : 0;
    const bodyH = H - visFeet;
    const out = [];
    out.push({ s: 'rect', x: 0, y: 0, w: W, h: bodyH, rx: Math.min(W, H) * 0.02, role: 'cab' });
    if (visFeet) {
      const fw = W * 0.12;
      out.push({ s: 'rect', x: W * 0.06, y: bodyH, w: fw, h: visFeet, rx: 2, role: 'foot' });
      out.push({ s: 'rect', x: W - W * 0.06 - fw, y: bodyH, w: fw, h: visFeet, rx: 2, role: 'foot' });
    }
    const d = Math.min(p.render.driver, W * 0.86, bodyH * 0.86);
    driverShapes(parseDriver('cone:' + d), W / 2, bodyH / 2, 'h', 0, out);
    return out;
  }

  function layoutStand(p) {
    const { h: H, w: W } = p.dims;
    const out = [];
    const t = clamp(H * 0.035, 8, 20);
    const post = clamp(W * 0.07, 10, 26);
    out.push({ s: 'rect', x: 0, y: 0, w: W, h: t, rx: 2, role: 'metal' });
    out.push({ s: 'rect', x: W * 0.04, y: t, w: post, h: H - t * 2, rx: 2, role: 'metal' });
    out.push({ s: 'rect', x: W - W * 0.04 - post, y: t, w: post, h: H - t * 2, rx: 2, role: 'metal' });
    out.push({ s: 'rect', x: W * 0.04, y: H * 0.55, w: W * 0.92, h: t * 0.7, rx: 2, role: 'metal' });
    out.push({ s: 'rect', x: 0, y: H - t, w: W, h: t, rx: 2, role: 'metal' });
    return out;
  }

  function knob(out, cx, cy, d) {
    out.push({ s: 'circle', cx, cy, r: d / 2, role: 'knob-ring' });
    out.push({ s: 'circle', cx, cy, r: d / 2 * 0.86, role: 'knob' });
    out.push({ s: 'circle', cx, cy, r: d / 2 * 0.93, role: 'knurl' });
    out.push({ s: 'circle', cx: cx - d * 0.16, cy: cy - d * 0.16, r: d * 0.09, role: 'spec' });
    out.push({ s: 'line', x1: cx, y1: cy - d * 0.36, x2: cx, y2: cy - d * 0.2, role: 'knob-mark' });
  }

  function display(out, x, y, w, h) {
    out.push({ s: 'rect', x, y, w, h, rx: Math.min(h * 0.12, 3), role: 'display' });
    out.push({ s: 'text', x: x + w * 0.08, y: y + h * 0.5, text: w > h * 3.2 ? 'OPTICAL 1' : 'USB', size: h * 0.3, anchor: 'start', role: 'disp-txt' });
    out.push({ s: 'text', x: x + w * 0.92, y: y + h * 0.5, text: '-32.5dB', size: h * 0.3, anchor: 'end', role: 'disp-val' });
    out.push({ s: 'rect', x: x + w * 0.08, y: y + h * 0.68, w: w * 0.5, h: h * 0.09, rx: 0.5, role: 'display-dim' });
  }

  function layoutComponent(p, mode) {
    const { h: H, w: W } = p.dims;
    const face = p.render.face;
    const out = [];
    if (face === 'puck' && mode === 'top') {
      const D = p.dims.d;
      out.push({ s: 'rect', x: 0, y: 0, w: W, h: D, rx: W * 0.22, role: 'body' });
      out.push({ s: 'circle', cx: W / 2, cy: D / 2, r: W * 0.2, role: 'knob-ring' });
      out.push({ s: 'circle', cx: W / 2, cy: D / 2, r: W * 0.16, role: 'knob' });
      out.push({ s: 'circle', cx: W / 2, cy: D * 0.16, r: 1.2, role: 'led' });
      return out;
    }
    const fh = face === 'puck' ? 0 : clamp(H * 0.08, 2, 7);
    const bh = H - fh;
    out.push({ s: 'rect', x: 0, y: 0, w: W, h: bh, rx: Math.min(bh * 0.08, 5), role: 'body' });
    out.push({ s: 'line', x1: 3, y1: 1.2, x2: W - 3, y2: 1.2, role: 'edge' });
    if (fh) {
      const fw = W * 0.07;
      out.push({ s: 'rect', x: W * 0.06, y: bh, w: fw, h: fh, rx: 1, role: 'foot' });
      out.push({ s: 'rect', x: W - W * 0.06 - fw, y: bh, w: fw, h: fh, rx: 1, role: 'foot' });
    }
    const brand = (x, y, size, anchor) => out.push({ s: 'text', x, y, text: 'audiolab', size, anchor: anchor || 'middle', role: 'brand' });
    const btn = (cx, cy, r) => out.push({ s: 'circle', cx, cy, r, role: 'button' });

    if (face === 'amp') {
      const kd = Math.min(bh * 0.62, 62);
      knob(out, W * 0.095, bh * 0.5, kd * 0.82);
      knob(out, W * 0.905, bh * 0.5, kd);
      display(out, W * 0.34, bh * 0.22, W * 0.32, bh * 0.36);
      btn(W * 0.21, bh * 0.36, Math.max(bh * 0.045, 1.6));
      out.push({ s: 'circle', cx: W * 0.21, cy: bh * 0.66, r: Math.max(bh * 0.06, 2), role: 'jack' });
      brand(W * 0.5, bh * 0.82, bh * 0.11);
    } else if (face === 'power') {
      btn(W * 0.08, bh * 0.5, Math.max(bh * 0.07, 2));
      out.push({ s: 'circle', cx: W * 0.12, cy: bh * 0.5, r: 1.2, role: 'led' });
      out.push({ s: 'rect', x: W * 0.3, y: bh * 0.3, w: W * 0.4, h: bh * 0.22, rx: 2, role: 'display' });
      out.push({ s: 'rect', x: W * 0.33, y: bh * 0.38, w: W * 0.12, h: bh * 0.06, rx: 0.5, role: 'display-text' });
      out.push({ s: 'rect', x: W * 0.55, y: bh * 0.38, w: W * 0.12, h: bh * 0.06, rx: 0.5, role: 'display-text' });
      brand(W * 0.5, bh * 0.78, bh * 0.11);
    } else if (face === 'streamer') {
      btn(W * 0.07, bh * 0.5, Math.max(bh * 0.06, 1.8));
      display(out, W * 0.16, bh * 0.22, W * 0.36, bh * 0.4);
      knob(out, W * 0.88, bh * 0.5, Math.min(bh * 0.5, 46));
      for (let i = 0; i < 4; i++) btn(W * (0.6 + i * 0.05), bh * 0.5, Math.max(bh * 0.035, 1.3));
      brand(W * 0.34, bh * 0.82, bh * 0.1);
    } else if (face === 'cdt') {
      btn(W * 0.07, bh * 0.5, Math.max(bh * 0.06, 1.8));
      out.push({ s: 'rect', x: W * 0.16, y: bh * 0.3, w: W * 0.42, h: Math.max(bh * 0.08, 2.4), rx: 1, role: 'slot' });
      display(out, W * 0.66, bh * 0.22, W * 0.2, bh * 0.3);
      for (let i = 0; i < 5; i++) out.push({ s: 'rect', x: W * (0.645 + i * 0.047), y: bh * 0.62, w: W * 0.03, h: Math.max(bh * 0.06, 1.8), rx: 1, role: 'button' });
      brand(W * 0.37, bh * 0.72, bh * 0.11);
    } else if (face === 'allinone') {
      out.push({ s: 'rect', x: W * 0.3, y: bh * 0.13, w: W * 0.4, h: Math.max(bh * 0.04, 2.4), rx: 1, role: 'slot' });
      display(out, W * 0.32, bh * 0.3, W * 0.36, bh * 0.32);
      knob(out, W * 0.85, bh * 0.5, bh * 0.36);
      knob(out, W * 0.15, bh * 0.5, bh * 0.22);
      out.push({ s: 'circle', cx: W * 0.15, cy: bh * 0.76, r: bh * 0.025, role: 'jack' });
      brand(W * 0.5, bh * 0.8, bh * 0.065);
    } else if (face === 'dac') {
      display(out, W * 0.08, bh * 0.2, W * 0.46, bh * 0.4);
      knob(out, W * 0.82, bh * 0.48, Math.min(bh * 0.5, 44));
      out.push({ s: 'circle', cx: W * 0.62, cy: bh * 0.48, r: Math.max(bh * 0.06, 2), role: 'jack' });
      brand(W * 0.31, bh * 0.8, bh * 0.1);
    } else if (face === 'portable') {
      knob(out, W * 0.8, bh * 0.5, bh * 0.62);
      out.push({ s: 'circle', cx: W * 0.6, cy: bh * 0.5, r: bh * 0.1, role: 'jack' });
      out.push({ s: 'circle', cx: W * 0.1, cy: bh * 0.5, r: 1, role: 'led' });
      brand(W * 0.32, bh * 0.6, bh * 0.2);
    } else if (face === 'puck') {
      out.push({ s: 'circle', cx: W * 0.5, cy: bh * 0.5, r: bh * 0.18, role: 'jack' });
    }
    return out;
  }

  function layout(p, mode) {
    switch (p.render.kind) {
      case 'speaker': return layoutSpeaker(p);
      case 'sub': return layoutSub(p);
      case 'stand': return layoutStand(p);
      default: return layoutComponent(p, mode);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Painters                                                            */
  /* ------------------------------------------------------------------ */
  function geom(sh, attrs) {
    if (sh.s === 'rect') return `<rect x="${r1(sh.x)}" y="${r1(sh.y)}" width="${r1(sh.w)}" height="${r1(sh.h)}" rx="${r1(sh.rx || 0)}" ${attrs}/>`;
    if (sh.s === 'circle') return `<circle cx="${r1(sh.cx)}" cy="${r1(sh.cy)}" r="${r1(sh.r)}" ${attrs}/>`;
    if (sh.s === 'line') return `<line x1="${r1(sh.x1)}" y1="${r1(sh.y1)}" x2="${r1(sh.x2)}" y2="${r1(sh.y2)}" ${attrs}/>`;
    if (sh.s === 'poly') return `<polygon points="${sh.pts.map((q) => r1(q[0]) + ',' + r1(q[1])).join(' ')}" ${attrs}/>`;
    if (sh.s === 'text') return `<text x="${r1(sh.x)}" y="${r1(sh.y)}" font-size="${r1(sh.size)}" text-anchor="${sh.anchor}" ${attrs}>${esc(sh.text)}</text>`;
    return '';
  }

  function solidDefs(id, fin, isComponent) {
    const f = FINISHES[fin] || FINISHES.black;
    let d = '';
    if (isComponent) {
      const light = f.metal;
      d += `<linearGradient id="${id}body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${light ? '#f7f8f9' : '#3a3b3f'}"/>
        <stop offset=".18" stop-color="${light ? '#dfe1e4' : '#26272a'}"/>
        <stop offset="1" stop-color="${light ? '#b4b8bd' : '#121315'}"/></linearGradient>
        <radialGradient id="${id}knob" cx=".38" cy=".32" r=".8">
        <stop offset="0" stop-color="${light ? '#ffffff' : '#5c5d62'}"/>
        <stop offset=".55" stop-color="${light ? '#d3d6d9' : '#2c2d31'}"/>
        <stop offset="1" stop-color="${light ? '#9da1a6' : '#141518'}"/></radialGradient>
        <pattern id="${id}brush" width="400" height="1.6" patternUnits="userSpaceOnUse">
        <rect width="400" height=".55" fill="${light ? '#fff' : '#fff'}" fill-opacity="${light ? 0.35 : 0.035}"/></pattern>`;
    } else {
      d += `<linearGradient id="${id}cab" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${f.b}"/><stop offset=".1" stop-color="${f.a}"/>
        <stop offset=".55" stop-color="${f.a}"/><stop offset="1" stop-color="${f.b}"/></linearGradient>
        <linearGradient id="${id}gloss" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
      if (f.wood) {
        d += `<pattern id="${id}grain" width="14" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(1.5)">
          <path d="M3 0 C5 60 1 120 4 240 M9 0 C7 80 11 160 8 240" stroke="#000" stroke-opacity=".14" stroke-width="1.1" fill="none"/>
          <path d="M6 0 C7 90 5 170 6 240" stroke="#fff" stroke-opacity=".06" stroke-width=".8" fill="none"/></pattern>`;
      }
    }
    d += `<radialGradient id="${id}cone" cx=".42" cy=".38" r=".75">
      <stop offset="0" stop-color="#4a4b50"/><stop offset="1" stop-color="#121214"/></radialGradient>
      <radialGradient id="${id}cap" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#77787e"/><stop offset="1" stop-color="#1a1a1d"/></radialGradient>
      <linearGradient id="${id}shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
      <linearGradient id="${id}topl" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".04"/></linearGradient>
      <radialGradient id="${id}dome" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#8b8c92"/><stop offset="1" stop-color="#1c1c1f"/></radialGradient>
      <pattern id="${id}weave" width="4" height="4" patternUnits="userSpaceOnUse">
      <path d="M0 0H2V2H0ZM2 2H4V4H2Z" fill="#fff" fill-opacity=".05"/></pattern>`;
    return `<defs>${d}</defs>`;
  }

  function paintSolid(shapes, id, fin) {
    const f = FINISHES[fin] || FINISHES.black;
    const light = f.metal || fin === 'white' || fin === 'piano-white';
    const textCol = f.metal ? '#3d4045' : '#c9ccd1';
    let s = '';
    shapes.forEach((sh) => {
      switch (sh.role) {
        case 'cab':
          s += geom(sh, `fill="url(#${id}cab)"`);
          if (f.wood) s += geom(sh, `fill="url(#${id}grain)"`);
          if (f.gloss) s += geom(sh, `fill="url(#${id}gloss)"`);
          break;
        case 'baffle': s += geom(sh, 'fill="#141416"'); break;
        case 'baffle-match':
          s += geom(sh, `fill="${light ? '#000' : '#000'}" fill-opacity="${light ? 0.035 : 0.12}"`);
          s += geom(sh, `fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1"`);
          break;
        case 'plinth': s += geom(sh, 'fill="#1b1b1d"'); break;
        case 'frame': s += geom(sh, 'fill="#1d1d20" stroke="#000" stroke-opacity=".4" stroke-width="1"'); break;
        case 'surround': s += geom(sh, 'fill="#2b2b2f"'); break;
        case 'cone': s += geom(sh, `fill="url(#${id}cone)"`) + geom(sh, `fill="url(#${id}weave)"`); break;
        case 'cap': s += geom(sh, `fill="url(#${id}cap)"`); break;
        case 'screw': s += geom(sh, 'fill="#55565b"'); break;
        case 'tw-plate': s += geom(sh, 'fill="#1b1b1e"'); break;
        case 'tw-ring': s += geom(sh, 'fill="#323237"'); break;
        case 'tw-dome': s += geom(sh, `fill="url(#${id}dome)"`); break;
        case 'amt-plate': s += geom(sh, 'fill="#1a1a1d"'); break;
        case 'amt-film': s += geom(sh, 'fill="#2f3035"'); break;
        case 'pleat': s += geom(sh, 'stroke="#5a5b61" stroke-width=".8"'); break;
        case 'badge': s += geom(sh, 'fill="#c8b28a"'); break;
        case 'foot': s += geom(sh, `fill="${f.metal ? '#55585c' : '#0d0d0e'}"`); break;
        case 'metal': s += geom(sh, 'fill="#1f1f22"') + geom(sh, 'fill="none" stroke="#fff" stroke-opacity=".08"'); break;
        case 'body': s += geom(sh, `fill="url(#${id}body)" stroke="#000" stroke-opacity="${f.metal ? 0.18 : 0.5}" stroke-width=".6"`) + geom(sh, `fill="url(#${id}brush)"`); break;
        case 'ridge': s += geom(sh, 'fill="none" stroke="#fff" stroke-opacity=".06" stroke-width=".8"'); break;
        case 'spec': s += geom(sh, 'fill="#fff" fill-opacity=".16"'); break;
        case 'knurl': s += geom(sh, `fill="none" stroke="${f.metal ? '#7d8186' : '#000'}" stroke-opacity=".7" stroke-width="${r1(Math.max(sh.r * 0.12, 0.6))}" stroke-dasharray="${r1(Math.max(sh.r * 0.05, 0.4))} ${r1(Math.max(sh.r * 0.05, 0.4))}"`); break;
        case 'disp-txt': case 'disp-val': s += geom(sh, `fill="${sh.role === 'disp-val' ? '#9fd3ff' : '#eef4fa'}" font-family="'JetBrains Mono', ui-monospace, monospace" font-weight="500"`); break;
        case 'grille':
          s += geom(sh, 'fill="#2a2b2e"') + geom(sh, `fill="url(#${id}weave)"`) + geom(sh, `fill="url(#${id}weave)"`);
          s += geom(sh, 'fill="none" stroke="#000" stroke-opacity=".45" stroke-width="2"');
          break;
        case 'cab-top': s += geom(sh, `fill="${f.a}"`) + (f.wood ? geom(sh, `fill="url(#${id}grain)"`) : '') + geom(sh, `fill="url(#${id}topl)"`); break;
        case 'cab-side': s += geom(sh, `fill="${f.b}"`) + (f.wood ? geom(sh, `fill="url(#${id}grain)"`) : '') + geom(sh, `fill="url(#${id}shade)"`) + (f.gloss ? geom(sh, `fill="url(#${id}gloss)"`) : ''); break;
        case 'body-top': s += geom(sh, `fill="${f.metal ? '#dadde1' : '#2a2b2f'}"`) + geom(sh, `fill="url(#${id}topl)"`); break;
        case 'body-side': s += geom(sh, `fill="${f.metal ? '#a7abb1' : '#141517'}"`) + geom(sh, `fill="url(#${id}shade)"`); break;
        case 'plinth-top': case 'metal-top': s += geom(sh, 'fill="#2c2c30"'); break;
        case 'plinth-side': case 'metal-side': s += geom(sh, 'fill="#101012"'); break;
        case 'lp-sleeve': s += geom(sh, 'fill="#ece5d6" stroke="#000" stroke-opacity=".12"'); break;
        case 'lp-art': s += geom(sh, 'fill="#a47c45" fill-opacity=".85"'); break;
        case 'lp-label': s += geom(sh, 'fill="#1c1c1f"'); break;
        case 'lp-text': s += geom(sh, 'fill="#1c1c1f" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700"'); break;
        case 'edge': s += geom(sh, `stroke="#fff" stroke-opacity="${f.metal ? 0.9 : 0.12}" stroke-width=".8"`); break;
        case 'knob-ring': s += geom(sh, `fill="${f.metal ? '#8f9398' : '#0b0b0d'}"`); break;
        case 'knob': s += geom(sh, `fill="url(#${id}knob)"`); break;
        case 'knob-mark': s += geom(sh, `stroke="${f.metal ? '#55595e' : '#9fa2a7'}" stroke-width="1.4" stroke-linecap="round"`); break;
        case 'display': s += geom(sh, 'fill="#07090c" stroke="#000" stroke-width=".6"'); break;
        case 'display-text': s += geom(sh, 'fill="#e9f1f8" fill-opacity=".85"'); break;
        case 'display-dim': s += geom(sh, 'fill="#7fb6e6" fill-opacity=".55"'); break;
        case 'button': s += geom(sh, `fill="${f.metal ? '#c4c7cb' : '#2f3034'}" stroke="#000" stroke-opacity=".35" stroke-width=".5"`); break;
        case 'jack': s += geom(sh, 'fill="#0c0c0e" stroke="#777" stroke-width=".6"'); break;
        case 'slot': s += geom(sh, 'fill="#050506"'); break;
        case 'led': s += geom(sh, 'fill="#5fd0ff"'); break;
        case 'brand': s += geom(sh, `fill="${textCol}" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" letter-spacing=".04em"`); break;
        default: break;
      }
    });
    return s;
  }

  const LINE_SKIP = new Set(['pleat', 'display-text', 'display-dim', 'brand', 'screw', 'cone', 'edge', 'led', 'knob-mark', 'tw-ring', 'ridge', 'spec', 'knurl', 'disp-txt', 'disp-val']);
  function paintLine(shapes) {
    let s = '';
    shapes.forEach((sh) => {
      if (LINE_SKIP.has(sh.role)) return;
      s += geom(sh, 'fill="none" stroke="currentColor" stroke-width="1.15" vector-effect="non-scaling-stroke"');
    });
    return s;
  }

  function isComponent(p) { return p.render.kind === 'component' || p.render.kind === 'lp'; }

  /* ------------------------------------------------------------------ */
  /* Views: front, angle (3/4 with true depth), grille, side             */
  /* ------------------------------------------------------------------ */
  const ANGLE_K = 0.46;
  const ANGLE_A = (32 * Math.PI) / 180;
  const DRIVER_ROLES = new Set(['frame', 'surround', 'cone', 'ridge', 'cap', 'spec', 'screw', 'tw-plate', 'tw-ring', 'tw-dome', 'amt-plate', 'amt-film', 'pleat']);

  function shift(sh, dx, dy) {
    const o = Object.assign({}, sh);
    if (o.s === 'rect' || o.s === 'text') { o.x += dx; o.y += dy; }
    else if (o.s === 'circle') { o.cx += dx; o.cy += dy; }
    else if (o.s === 'line') { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; }
    else if (o.s === 'poly') o.pts = o.pts.map(([x, y]) => [x + dx, y + dy]);
    return o;
  }

  function layoutLP() {
    const S = 314;
    return [
      { s: 'rect', x: 0, y: 0, w: S, h: S, rx: 2, role: 'lp-sleeve' },
      { s: 'circle', cx: S * 0.5, cy: S * 0.46, r: S * 0.3, role: 'lp-art' },
      { s: 'circle', cx: S * 0.5, cy: S * 0.46, r: S * 0.1, role: 'lp-label' },
      { s: 'text', x: S * 0.5, y: S * 0.9, text: '12" LP', size: S * 0.07, anchor: 'middle', role: 'lp-text' },
    ];
  }
  const LP = { id: 'lp', brand: '', name: '12" LP sleeve', dims: { h: 314, w: 314, d: 3 }, finishes: ['white'], render: { kind: 'lp' } };

  function frontShapes(p) {
    if (p.render.kind === 'lp') return layoutLP();
    return layout(p, p.render.face === 'puck' ? 'top' : 'front');
  }

  /** Returns { shapes, w, h } in mm for the requested view. */
  function viewShapes(p, view) {
    const { h: H, w: W, d: D } = p.dims;
    const puckTop = p.render.face === 'puck';
    if (view === 'grille' && p.render.kind === 'speaker') {
      const base = layout(p, 'front');
      const out = base.filter((sh) => !DRIVER_ROLES.has(sh.role) && sh.role !== 'badge');
      const baffle = base.find((sh) => sh.role === 'baffle' || sh.role === 'baffle-match');
      out.push(Object.assign({}, baffle, { role: 'grille' }));
      base.filter((sh) => sh.role === 'badge').forEach((b) => out.push(b));
      return { shapes: out, w: W, h: H };
    }
    if (view === 'side') {
      const out = [];
      if (p.render.kind === 'speaker' || p.render.kind === 'sub') {
        const front = layout(p, 'front');
        const plinth = front.find((sh) => sh.role === 'plinth');
        const cab = front.find((sh) => sh.role === 'cab');
        out.push({ s: 'rect', x: 0, y: 0, w: D, h: cab.h, rx: cab.rx, role: 'cab-side' });
        out.push({ s: 'rect', x: 0, y: 0, w: Math.max(D * 0.025, 4), h: cab.h, rx: 1, role: p.render.baffle === 'black' ? 'baffle' : 'cab' });
        if (plinth) out.push({ s: 'rect', x: 0, y: plinth.y, w: D, h: plinth.h, rx: 2, role: 'plinth' });
        front.filter((sh) => sh.role === 'foot').forEach((ft) => out.push(Object.assign({}, ft, { x: ft.x / W * D, w: ft.w / W * D })));
      } else if (p.render.kind === 'stand') {
        layout(p, 'front').forEach((sh) => out.push(Object.assign({}, sh, { x: sh.x / W * D, w: sh.w / W * D })));
      } else {
        const fh = puckTop ? 0 : clamp(H * 0.08, 2, 7);
        out.push({ s: 'rect', x: 0, y: 0, w: D, h: H - fh, rx: Math.min((H - fh) * 0.08, 5), role: 'body-side' });
        out.push({ s: 'rect', x: 0, y: 0, w: Math.max(D * 0.035, 3), h: H - fh, rx: 1.5, role: 'body' });
        if (fh) {
          out.push({ s: 'rect', x: D * 0.06, y: H - fh, w: D * 0.07, h: fh, rx: 1, role: 'foot' });
          out.push({ s: 'rect', x: D * 0.87, y: H - fh, w: D * 0.07, h: fh, rx: 1, role: 'foot' });
        }
      }
      return { shapes: out, w: D, h: H };
    }
    if (view === 'angle') {
      const front = puckTop ? layout(p, 'front') : frontShapes(p);
      const dx = D * ANGLE_K * Math.cos(ANGLE_A);
      const dy = D * ANGLE_K * Math.sin(ANGLE_A);
      const boxRoles = { cab: 'cab', plinth: 'plinth', body: 'body', metal: 'metal' };
      const ext = [];
      // Extrude boxes, lower ones first so upper boxes overlap them correctly
      front.filter((sh) => sh.s === 'rect' && boxRoles[sh.role])
        .sort((a, b) => (b.y + b.h) - (a.y + a.h))
        .forEach((b) => {
          const r = boxRoles[b.role];
          const x0 = b.x, y0 = b.y + dy, x1 = b.x + b.w, y1 = b.y + b.h + dy;
          ext.push({ s: 'poly', pts: [[x0, y0], [x0 + dx, y0 - dy], [x1 + dx, y0 - dy], [x1, y0]], role: r + '-top' });
          ext.push({ s: 'poly', pts: [[x1, y0], [x1 + dx, y0 - dy], [x1 + dx, y1 - dy], [x1, y1]], role: r + '-side' });
        });
      return { shapes: ext.concat(front.map((sh) => shift(sh, 0, dy))), w: W + dx, h: H + dy };
    }
    if (view === 'elev') return { shapes: p.render.kind === 'lp' ? layoutLP() : layout(p, 'front'), w: W, h: H };
    const h = puckTop ? D : H;
    return { shapes: frontShapes(p), w: W, h };
  }

  /** Inner SVG group for a product, positioned at (x, y) in mm. */
  function productGroup(p, fin, x, y, view) {
    const id = uid('r');
    const v = viewShapes(p, view || 'front');
    return `<g transform="translate(${r1(x)} ${r1(y)})">${solidDefs(id, fin, isComponent(p))}${paintSolid(v.shapes, id, fin)}</g>`;
  }

  /* ------------------------------------------------------------------ */
  /* Public: product thumbnail                                           */
  /* ------------------------------------------------------------------ */
  const VIEW_LABELS = { front: 'front view', angle: 'three-quarter view', grille: 'with grille', side: 'side view' };
  function thumb(p, fin, opts) {
    opts = opts || {};
    fin = fin || p.finishes[0];
    const view = opts.view || 'front';
    if (view === 'scale') return scaleView(p, fin, opts);
    const v = viewShapes(p, view);
    const W = v.w, H = v.h;
    const pad = Math.max(W, H) * (opts.pad != null ? opts.pad : 0.1);
    const shadowH = Math.max(W, H) * 0.035;
    const refl = opts.reflect !== false;
    const reflH = refl ? Math.min(H * 0.22, pad * 0.9) : shadowH * 0.5;
    const vb = [-pad, -pad, W + pad * 2, H + pad + Math.max(reflH, pad * 0.6)].map(r1).join(' ');
    const sid = uid('s');
    const id = uid('r');
    const inner = `${solidDefs(id, fin, isComponent(p))}${paintSolid(v.shapes, id, fin)}`;
    let defs = `<radialGradient id="${sid}"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
    let reflection = '';
    if (refl) {
      defs += `<linearGradient id="${sid}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <mask id="${sid}m" maskUnits="userSpaceOnUse" x="${r1(-pad)}" y="${r1(H)}" width="${r1(W + pad * 2)}" height="${r1(reflH)}"><rect x="${r1(-pad)}" y="${r1(H)}" width="${r1(W + pad * 2)}" height="${r1(reflH)}" fill="url(#${sid}f)"/></mask>`;
      reflection = `<g mask="url(#${sid}m)"><g transform="translate(0 ${r1(H * 2)}) scale(1 -1)">${inner}</g></g>`;
    }
    const cx = view === 'angle' ? W * 0.47 : W / 2;
    const shadow = `<ellipse cx="${r1(cx)}" cy="${r1(H)}" rx="${r1(W * 0.62)}" ry="${r1(shadowH)}" fill="url(#${sid})"/>`;
    const label = esc(`${p.brand} ${p.name}, ${VIEW_LABELS[view] || 'view'}, drawn to scale from ${p.dims.h} × ${p.dims.w} × ${p.dims.d} mm`);
    return `<svg class="${opts.cls || 'prod-svg'}" viewBox="${vb}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${reflection}${shadow}<g>${inner}</g></svg>`;
  }

  /** Product beside a 12-inch LP sleeve (314 × 314 mm) for a sense of real-world size. */
  function scaleView(p, fin, opts) {
    return lineup([
      { parts: [{ p, finish: fin }], label: p.name, sub: `${p.dims.w} mm wide` },
      { parts: [{ p: LP }], label: '12" LP sleeve', sub: '314 mm wide' },
    ], { cls: (opts.cls || '') + ' scale-svg', gap: Math.max(p.dims.h, 314) * 0.12, label: `${p.brand} ${p.name} shown next to a 12-inch LP sleeve for scale` });
  }

  /* ------------------------------------------------------------------ */
  /* Public: dimension drawing (front + side, mm)                        */
  /* ------------------------------------------------------------------ */
  function drawing(p) {
    const { h: H, w: W, d: D } = p.dims;
    const U = Math.max(H, W + D) / 100;
    const G = Math.min(W, D) * 0.15 + U * 14;
    const off = U * 7;
    const fs = U * 3.3;
    const a = U * 1.5;
    const sx = W + G;

    const front = paintLine(layout(p, 'front'));
    // Side profile
    let side = `<rect x="${r1(sx)}" y="0" width="${r1(D)}" height="${r1(H)}" rx="${r1(Math.min(D, H) * 0.02)}" fill="none" stroke="currentColor" stroke-width="1.15" vector-effect="non-scaling-stroke"/>`;
    if (p.render.kind === 'speaker' && p.render.plinth) {
      const ph = clamp(H * (H > W * 2.1 ? 0.035 : 0.03), 10, 42);
      side += `<line x1="${r1(sx)}" y1="${r1(H - ph)}" x2="${r1(sx + D)}" y2="${r1(H - ph)}" stroke="currentColor" stroke-width="1.15" vector-effect="non-scaling-stroke"/>`;
    }
    if (p.render.kind === 'speaker' || p.render.kind === 'sub') {
      const bt = Math.max(D * 0.04, 4);
      side += `<line x1="${r1(sx + bt)}" y1="0" x2="${r1(sx + bt)}" y2="${r1(H)}" stroke="currentColor" stroke-opacity=".45" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    }
    if (isComponent(p) && p.render.face !== 'puck') {
      const ft = Math.max(D * 0.03, 3);
      side += `<line x1="${r1(sx + ft)}" y1="0" x2="${r1(sx + ft)}" y2="${r1(H)}" stroke="currentColor" stroke-opacity=".45" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    }

    const dimLine = (x1, y1, x2, y2, label, vertical) => {
      const L = 'class="dim-line" vector-effect="non-scaling-stroke"';
      let g = `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" ${L}/>`;
      if (vertical) {
        g += `<path d="M${r1(x1)} ${r1(y1)} l${r1(-a / 2)} ${r1(a * 1.6)} h${r1(a)} Z M${r1(x2)} ${r1(y2)} l${r1(-a / 2)} ${r1(-a * 1.6)} h${r1(a)} Z" class="dim-arrow"/>`;
        g += `<text x="${r1(x1 - fs * 0.55)}" y="${r1((y1 + y2) / 2)}" font-size="${r1(fs)}" class="dim-text" text-anchor="middle" transform="rotate(-90 ${r1(x1 - fs * 0.55)} ${r1((y1 + y2) / 2)})">${label}</text>`;
      } else {
        g += `<path d="M${r1(x1)} ${r1(y1)} l${r1(a * 1.6)} ${r1(-a / 2)} v${r1(a)} Z M${r1(x2)} ${r1(y2)} l${r1(-a * 1.6)} ${r1(-a / 2)} v${r1(a)} Z" class="dim-arrow"/>`;
        g += `<text x="${r1((x1 + x2) / 2)}" y="${r1(y1 + fs * 1.35)}" font-size="${r1(fs)}" class="dim-text" text-anchor="middle">${label}</text>`;
      }
      return g;
    };
    const ext = (x1, y1, x2, y2) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" class="dim-ext" vector-effect="non-scaling-stroke"/>`;

    let dims = '';
    // Width (front)
    dims += ext(0, H + U, 0, H + off + U * 1.5) + ext(W, H + U, W, H + off + U * 1.5);
    dims += dimLine(0, H + off, W, H + off, `W ${p.dims.w} mm`, false);
    // Height (front)
    dims += ext(-U, 0, -off - U * 1.5, 0) + ext(-U, H, -off - U * 1.5, H);
    dims += dimLine(-off, 0, -off, H, `H ${p.dims.h} mm`, true);
    // Depth (side)
    dims += ext(sx, H + U, sx, H + off + U * 1.5) + ext(sx + D, H + U, sx + D, H + off + U * 1.5);
    dims += dimLine(sx, H + off, sx + D, H + off, `D ${p.dims.d} mm`, false);

    const lbl = (x, text) => `<text x="${r1(x)}" y="${r1(-U * 4)}" font-size="${r1(fs * 0.72)}" class="view-label" text-anchor="middle">${text}</text>`;
    const minX = -off - fs * 1.9;
    const maxX = sx + D + U * 6;
    const minY = -U * 9;
    const maxY = H + off + fs * 2.2;
    const vb = [minX, minY, maxX - minX, maxY - minY].map(r1).join(' ');
    const label = esc(`Dimension drawing of ${p.brand} ${p.name}: height ${p.dims.h} mm, width ${p.dims.w} mm, depth ${p.dims.d} mm`);
    return `<svg class="dim-svg" viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
      ${lbl(W / 2, 'FRONT')}${lbl(sx + D / 2, 'SIDE')}
      <g class="dim-object">${front}${side}</g>${dims}</svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* Public: to-scale lineup                                             */
  /* items: [{ parts: [{p, finish}], label, sub }] — parts stack bottom→top */
  /* ------------------------------------------------------------------ */
  function lineup(items, opts) {
    opts = opts || {};
    const meas = items.map((it) => {
      const w = Math.max(...it.parts.map((pt) => pt.p.dims.w));
      const h = it.parts.reduce((s, pt) => s + pt.p.dims.h, 0);
      return { w, h };
    });
    const maxH = Math.max(...meas.map((m) => m.h));
    const U = maxH / 100;
    const gap = opts.gap != null ? opts.gap : Math.max(U * 14, 120);
    const rulerW = opts.ruler ? U * 16 : 0;
    const fs = U * (opts.fontScale || 3.4);
    let x = rulerW;
    let body = '';
    items.forEach((it, i) => {
      const m = meas[i];
      let y = maxH;
      it.parts.forEach((pt) => {
        y -= pt.p.dims.h;
        body += productGroup(pt.p, pt.finish || pt.p.finishes[0], x + (m.w - pt.p.dims.w) / 2, y, 'elev');
      });
      if (opts.heights !== false) {
        body += `<text x="${r1(x + m.w / 2)}" y="${r1(maxH - m.h - U * 3)}" font-size="${r1(fs)}" class="lu-h" text-anchor="middle">${m.h} mm</text>`;
      }
      if (opts.names !== false && it.label) {
        body += `<text x="${r1(x + m.w / 2)}" y="${r1(maxH + fs * 1.9)}" font-size="${r1(fs)}" class="lu-name" text-anchor="middle">${esc(it.label)}</text>`;
        if (it.sub) body += `<text x="${r1(x + m.w / 2)}" y="${r1(maxH + fs * 3.25)}" font-size="${r1(fs * 0.8)}" class="lu-sub" text-anchor="middle">${esc(it.sub)}</text>`;
      }
      x += m.w + gap;
    });
    const totalW = x - gap;
    let ruler = '';
    if (opts.ruler) {
      const step = maxH > 900 ? 100 : maxH > 300 ? 50 : 10;
      const major = step * (maxH > 900 ? 5 : 2);
      ruler += `<line x1="${r1(rulerW * 0.55)}" y1="0" x2="${r1(rulerW * 0.55)}" y2="${r1(maxH)}" class="lu-axis" vector-effect="non-scaling-stroke"/>`;
      for (let v = 0; v <= maxH; v += step) {
        const yy = maxH - v;
        const isMajor = v % major === 0;
        ruler += `<line x1="${r1(rulerW * (isMajor ? 0.3 : 0.42))}" y1="${r1(yy)}" x2="${r1(rulerW * 0.55)}" y2="${r1(yy)}" class="lu-axis" vector-effect="non-scaling-stroke"/>`;
        if (isMajor && v > 0) ruler += `<text x="${r1(rulerW * 0.24)}" y="${r1(yy + fs * 0.35)}" font-size="${r1(fs * 0.78)}" class="lu-tick" text-anchor="end">${v}</text>`;
      }
    }
    const ground = `<line x1="${r1(rulerW * 0.55)}" y1="${r1(maxH)}" x2="${r1(totalW + U * 4)}" y2="${r1(maxH)}" class="lu-ground" vector-effect="non-scaling-stroke"/>`;
    const top = -U * (opts.heights === false ? 3 : 9);
    const bottom = maxH + (opts.names === false ? U * 3 : fs * 4);
    const vb = [opts.ruler ? -fs * 0.6 : -U * 3, top, totalW + U * 7 + (opts.ruler ? fs * 0.6 : 0), bottom - top].map(r1).join(' ');
    return `<svg class="${opts.cls || 'lineup-svg'}" viewBox="${vb}" role="img" aria-label="${esc(opts.label || 'Products drawn to the same scale')}" xmlns="http://www.w3.org/2000/svg">${ruler}${ground}${body}</svg>`;
  }

  window.PARRender = { thumb, drawing, lineup, FINISHES };
})();
