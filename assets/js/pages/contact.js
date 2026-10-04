(function () {
  'use strict';
  const PAR = window.PAR;
  const { $, esc, money, byId, params } = PAR;
  const SITE = window.SITE;

  PAR.init('contact');

  const tel = SITE.phone.replace(/\s/g, '');
  $('#contact-card').innerHTML = `
    <h2>${esc(SITE.name)}</h2>
    <dl>
      <div><dt>Telephone</dt><dd><a href="tel:${tel}">${esc(SITE.phone)}</a></dd></div>
      <div><dt>WhatsApp</dt><dd><a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">Message us on WhatsApp</a></dd></div>
      <div><dt>Email</dt><dd><a href="mailto:${SITE.email}">${esc(SITE.email)}</a></dd></div>
      <div><dt>Showroom</dt><dd>${SITE.address.map(esc).join('<br>')}</dd></div>
      <div><dt>Opening hours</dt><dd>${SITE.hours.map(esc).join('<br>')}</dd></div>
    </dl>
    <a class="btn btn-light" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">Chat on WhatsApp</a>`;

  $('#delivery-copy').textContent = `Free delivery across Singapore on orders over ${money(SITE.freeDeliveryThreshold)}; a ${money(SITE.deliveryFee)} fee applies to smaller orders. We'll agree a delivery slot with you when we confirm your order.`;

  // Product picker
  const sel = $('#c-product');
  sel.innerHTML = '<option value="">—</option>' + ['Wharfedale', 'Audiolab'].map((b) =>
    `<optgroup label="${b}">${window.PRODUCTS.filter((p) => p.brand === b).map((p) => `<option value="${p.id}">${esc(p.series)} · ${esc(p.name)}</option>`).join('')}</optgroup>`).join('');

  // Prefill from ?product= and ?topic=
  const qp = params();
  const pre = byId(qp.get('product'));
  const topic = $('#c-topic');
  if (pre) {
    sel.value = pre.id;
    $('#c-msg').value = pre.price == null
      ? `I'd like pricing and lead time for the ${pre.brand} ${pre.name}.`
      : `I'd like to know more about the ${pre.brand} ${pre.name}.`;
  }
  if (qp.get('topic') && [...topic.options].some((o) => o.value === qp.get('topic'))) topic.value = qp.get('topic');
  const syncTopic = () => { $('#c-date-field').hidden = topic.value !== 'listening'; };
  topic.addEventListener('change', syncTopic);
  syncTopic();
  if (location.hash === '#listening') { topic.value = 'listening'; syncTopic(); }

  const form = $('#contact-form');
  form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) f.classList.remove('invalid'); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (n) => (form.elements[n].value || '').trim();
    const checks = { name: v('name').length >= 2, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email')), message: v('message').length >= 3 };
    let first = null;
    Object.entries(checks).forEach(([k, ok]) => { form.elements[k].closest('.field').classList.toggle('invalid', !ok); if (!ok && !first) first = form.elements[k]; });
    if (first) { first.focus(); return; }
    const p = byId(v('product'));
    const topicLabel = topic.options[topic.selectedIndex].text;
    const body = [
      v('message'), '',
      p ? `Product: ${p.brand} ${p.name}` : null,
      topic.value === 'listening' && v('date') ? `Preferred date: ${v('date')}` : null,
      `Name: ${v('name')}`, `Email: ${v('email')}`, v('phone') ? `Phone: ${v('phone')}` : null,
    ].filter((l) => l != null).join('\n');
    const subject = `${topicLabel}${p ? ` — ${p.brand} ${p.name}` : ''}`;
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('#c-status').textContent = 'Opening your email app… If nothing happens, email us directly at ' + SITE.email + '.';
  });
})();
