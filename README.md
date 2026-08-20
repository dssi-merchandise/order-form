# DSSI Bestellportal 2026 – Online Ordering Form

Self-contained multilingual shop (English / German / Korean) for DSSI school merchandise. Header branding: **DSSI / Bestellportal**.

## Features
- **3 languages**: EN / DE / KO (header switch). Product names, UI, emails, and checkout are localized.
- **Impressum**: School address in the footer modal. Legal contact in Impressum remains **dsseoul@dsseoul.org**. Public contact in the footer is **marketing@dsseoul.org**.
- **Product cards** with photos (beige studio backgrounds), description, price, colour / year, size, quantity.
- **Shopping basket** (drawer): merge identical variants, +/- qty, remove, `localStorage` persistence.
- **Checkout**:
  1. Basket → Order Now  
  2. Summary + **Last name**, **First name**, **Schulklasse** (Kindergarten … Grade 12), **Email**  
  3. Confirm → stock reservation (Google Sheet) → confirmation email + Google Form log  
- **EmailJS**: one confirmation to the customer; **BCC** to:
  - `vs.vorsitz@dsseoul.org`
  - `sekretariat@dsseoul.org`
  - `bdv@dsseoul.org`  
  Template Bcc field must be `{{bcc}}` (not a hardcoded single address).
- **Google Form → Sheet**: one row per line item (order #, date, name + Schulklasse, email, item, qty, line total).
- **Live inventory** (Google Apps Script + Sheet *Inventar Merchandise*): checks available stock, then **Bestellungen** += qty.
- **Stock UI**: colour dropdown shows `(in stock)` or `Low inventory: N` only when ≤ 5; exact high stock is hidden.
- Payment: Shinhan Bank · 56208298713156 · DSSI, Merchandise · order number as reference.
- Size guide modal (clothing + Schuljacke Female/Male height guide).
- Responsive UI (Tailwind CDN).

## Current products (high level)
| Item | Notes |
|------|--------|
| **Jahrbuch** | Years **2025/2026** and **2024/2025** (inventory-tracked) |
| **T-Shirt / Polo / Hoodie** | Colours + sizes; Oktoberfest handover note where set |
| **Schuljacke 50th Anniversary** | Black; **Female S/M/L** and **Male M/L/XL/2XL** (different cuts); mock-up disclaimer; order by 13.9. → Klassenfahrtswoche |
| **Mug (Tasse)** | 8 colour variants; live inventory |
| Thermobecher, Trinkflasche, Eco-Tasche, Umbrella, Mascot | In `OUT_OF_STOCK_IDS` (hidden) until cleared |

Temporarily hidden products: edit `OUT_OF_STOCK_IDS` in `index.html` (empty array `[]` to show all).

## How to use (parents / students)
1. Open the live site (or `index.html` via **http://localhost**, not `file://`).
2. Choose language → colour / year → size → qty → Add to basket.
3. Order Now → fill name, **Schulklasse**, email → Confirm.
4. Pay using the order number as reference; collect at reception (see on-site notes).

## For administrators
- **Emails**: customer + BCC (Vorsitz, Sekretariat, BDV). Ensure EmailJS template **Bcc = `{{bcc}}`**.
- **Order log**: Google Form sheet (existing) — customer name is stored as `Name | Schulklasse`.
- **Inventory sheet**: [Inventar Merchandise](https://docs.google.com/spreadsheets/d/1D1X_h5hNpQBW1kNMvhcnQGU0qMZ-rDqF5ETf1ueMkDU/edit)  
  Columns: Artikel | Eigenschaft | Anfangsbestand | Bestellungen | Verfügbares Inventar  
  On order: check available (= Anfang − Bestellungen), then increase **Bestellungen**.
- Tracked variants include **Tasse** colours and **Jahrbuch** years (`VARIANT_MAP` in Apps Script).
- Prices / products / bank: edit `products` and related config in `index.html`.
- After image changes: bump `ASSET_VERSION` in `index.html`, then redeploy.

## Live inventory (Apps Script)
Script file: `google-apps-script/InventarWebApp.gs`  
Web App URL is set in `index.html` → `INVENTORY_API.webAppUrl`.

**After editing the `.gs` file:**
1. Paste into the Apps Script project (script.google.com is fine if Extensions fails).
2. Save.
3. **Deploy → Manage deployments → pencil → Version: New version → Deploy**  
   (prefer editing the existing deployment so the URL stays the same).
4. If Deploy stays greyed out: save code first, re-select “New version”, or create a **New deployment** and update `webAppUrl`.

Optional: run `installVerfuegbarFormulas()` so column E is `=MAX(0,C-D)`.

## EmailJS checklist
- Template **To**: `{{to_email}}`
- **Subject**: `{{email_subject}}`
- **Bcc**: `{{bcc}}` ← required for multiple school addresses
- Allowed domains: include your GitHub Pages / Netlify / localhost origins
- Serve shop over **http(s)** — EmailJS does not work reliably from `file://`

## Files to deploy (GitHub Pages / Netlify)
Copy to site root (not nested in `order-form/` if Pages uses `/`):
- `index.html`
- `DSSI logo.jpg`
- Product images: `tshirt.jpg`, `poloshirt.jpg`, `hoodie.jpg`, `jacket.jpg`, `mug.jpg`, `thermobecher.jpg`, `trinkflasche.jpg`, `eco-tasche.jpg`, `umbrella.jpg`, `Jahrbuch-25-26.jpg`, `mascot.jpg`

Do **not** need on Pages: `google-apps-script/`, `_img_backup_beige/`, PDF reference (optional).

## Updating GitHub Pages
1. Replace `index.html` + changed `.jpg` files in the repo **root**.
2. Commit & push (or Upload files on github.com).
3. Wait ~1 minute → hard refresh live site (`Ctrl+Shift+R`).

## Technical notes
- Static HTML + Tailwind CDN + vanilla JS + EmailJS CDN.
- Cart / language in `localStorage`.
- Inventory: GET stock on load; POST `placeOrder` before email (blocks order if insufficient stock).
- Fallback stock map in `FALLBACK_INVENTORY` if the Web App is unreachable.

## Bank details
- Bank: Shinhan Bank (신한은행)  
- Account: 56208298713156  
- Holder: DSSI, Merchandise  
- Reference: order number (max. 10 characters, e.g. `D2608ABCDE`)

---

Created for DSSI (Deutsche Schule Seoul International) – 2026 merchandise orders.  
Footer contact: marketing@dsseoul.org · Order BCC: vs.vorsitz@ / sekretariat@ / bdv@dsseoul.org
