# PAR Audio Pte Ltd — online store

A professional e-commerce website for **PAR Audio Pte Ltd**, selling Wharfedale, Audiolab, Quad, QED and Earthquake in Singapore. Every speaker and component lists its exact **height, width and depth in millimetres** and is illustrated **to scale** from those dimensions; cables list their conductor size, cable size and lengths in millimetres.

It is a static site — plain HTML, CSS and JavaScript with no build step and no dependencies — so it can be hosted anywhere (GitHub Pages, Netlify, any web server) or opened straight from disk.

## Pages

| Page | What it does |
| --- | --- |
| `brands.html` | **Find all brands**: every brand with its ranges; each leads to that brand's full product list. The header's **Brands** menu links here. New brands added to `BRANDS` in `data.js` appear automatically |
| `index.html` | Home: to-scale hero lineup, brand overviews, categories, featured products, **“Will it fit?”** dimension finder, series directory, services |
| `shop.html` | Full catalogue with filters for brand, category, range, price and **maximum H × W × D (mm)**, plus sorting by price, name, height, width and weight. Filters are kept in the URL, so filtered views can be shared |
| `product.html?id=…` | Product detail: key dimensions, finish swatches, package options (e.g. with stands), quantity, add to cart, **front + side dimension drawing in mm**, full specification table, related products |
| `compare.html` | Compare up to 4 products, drawn side by side at the same scale, with a full dimension/spec table and a shareable link |
| `cart.html` | Cart, delivery/collection choice, customer details and **order request**. Generates an order reference and sends the order to PAR Audio by email or WhatsApp (no online payment is taken) |
| `contact.html` | Contact details, enquiry / listening-session form (opens the visitor's email app), delivery, warranty and listening-session information |

## Catalogue

73 products, all defined in **`assets/js/data.js`**:

- **Wharfedale (37):** Elysian R (1R, 2R, 3R, 4R, CR) · Aura (1, 2, 3, 4, C, CS) · EVO 5 (5.1, 5.2, 5.3, 5.4, 5.C) · Diamond 12i (12.0i, 12.1i, 12.2i, 12.3i, 12.4i, 12.Ci) · Heritage (Linton, Super Linton, Dovedale, Aston, Super Denton, Denton 85, Heritage Centre, Airedale Heritage, Linton Stands) · Diamond Active (A1, A2) · Subwoofers (SW-10, SW-12, SW-15, WH-D10)
- **Audiolab (17):** 9000 Series (9000A, 9000P, 9000Q, 9000N, 9000CDT) · 7000 Series (7000A, 7000N Play, 7000CDT) · 6000 Series (6000A MKII, 6000A Play, 6000N Play, 6000CDT) · Omnia · DACs (D9, D7, M-DAC Mini, M-DAC nano)
- **Quad (9):** ESL (2912X, 2812X) · Revela (1, 2) · Artera Solus Play · Vena II Play · Classic (Quad 33, Quad 303, QII-Integrated)
- **QED (4):** Performance Speaker Cable (2026, 2/3/5 m pairs) · Performance Audio Interconnect (2026, 0.75/1.5 m) · Reference XT40i (per metre) · Signature Revelation (per metre)
- **Earthquake (6):** Supernova (MKVI-15, MKVI-12) · MiniMe DSP (P12, P10, P8) · Q10B tactile transducer

Cables have no box size, so they use `dims: null` plus a `measures` list (and `section` for a cross-section drawing when outside dimensions are published). Per-metre cables use `unit: 'metre'`; the quantity in the cart is the number of metres.

Each product has `dims: { h, w, d }` in mm, net weight in kg, price in SGD, finishes, highlights and a spec list. Adding or editing a product only means editing this file: the shop, filters, product page, drawings, compare and cart all update automatically.

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly also works.)

## Before going live: please review

1. **Contact details:** the phone, WhatsApp, email, address and opening hours in `window.SITE` at the top of `assets/js/data.js` are **placeholders** (`+65 6000 0000`, `sales@paraudio.com.sg`). Replace them with the real ones.
2. **Prices:** the SGD prices are **indicative**. They were converted from published UK RRPs (about S$1.72 to £1, rounded) and include 9% GST. Some models had no published UK price and were estimated: Super Linton, the Linton/Super Linton stand packages, Linton Stands, Diamond Active A1/A2, the subwoofers, Omnia and M-DAC Mini/nano. Set your own selling prices in `data.js`. The Airedale Heritage is listed as *Price on request*. Quad prices are converted from UK RRPs the same way. Earthquake prices are converted from US prices at about S$1.30 to US$1; the Supernova MKVI-15 and Q10B had no published price and show *Price on request*. QED 3 m and 5 m Performance cable prices are estimated from the US price ratio.
3. **Specifications:** the dimensions and specs were compiled from manufacturer and retailer listings via web search. The official Wharfedale/Audiolab websites could not be reached while this was built, so please spot-check against the official spec sheets. A few weights were not published and show as “—” (Diamond 12.1i–12.4i, Aura C, Linton Stands). The Q10B dimensions are given as height × diameter; check them against the spec sheet. Finish names are generic; adjust them to the finishes you actually stock.
4. **Policies:** delivery (free over S$500, otherwise S$30, set via `freeDeliveryThreshold` and `deliveryFee`), warranty, returns and listening-session wording is standard placeholder copy in `contact.html`, `product.js` and `home.js`. Make sure it matches how PAR Audio operates.
5. **Product photos:** add real photos by putting the files in `assets/img/products/` and listing them against the product id in `assets/js/photos.js`, e.g. `'elysian-4r': ['elysian-4r-1.jpg', 'elysian-4r-2.jpg']`. The first photo becomes the main image everywhere (shop cards, product page, cart, search, compare); the second appears when hovering a shop card. Photos on a white background blend into the page. Use images you have the rights to, such as the dealer/press image packs supplied by Wharfedale and Audiolab (IAG). Until a product has photos, it shows the built-in to-scale illustrations. These are still offered alongside the photos as extra views: angle, front, grille, side, a size guide next to a 12" LP sleeve, and the dimension drawing.
6. **Payments:** checkout produces an order request (email/WhatsApp) rather than taking card payments. To take payments online, connect a provider such as Stripe or HitPay.

## Structure

```
index.html  shop.html  product.html  compare.html  cart.html  contact.html
assets/
  css/styles.css         Design system and all page styles (responsive)
  js/data.js             Site settings + the full product catalogue (edit here)
  js/photos.js           Product photo list (add your photos here)
  js/render.js           To-scale product illustrations, dimension drawings, lineups
  js/app.js              Header/footer, cart, compare, search, product cards
  js/pages/*.js          Page-specific behaviour
  img/products/          Product photo files
  img/favicon.svg        Browser-tab icon (PAR globe mark)
  img/par-audio-logo.svg Full PAR Audio Pte Ltd logo (vector), for print, email or social use
```

Wharfedale and Audiolab are trademarks of their respective owners.
