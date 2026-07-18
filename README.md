# DSSI School Clothing 2026 - Online Ordering Form

Simple, self-contained multilingual ordering website (English / German / Korean) for the DSSI school clothing items listed in the `DSSI Shirts 2026.pdf`.

## Features
- **3 languages** fully supported: English, German, Korean. Switch instantly in the header. All product names, descriptions, UI, and the generated payment email are localized.
- **Impressum / Legal Notice**: Full school address and contact details (Deutsche Schule Seoul International, 123-6 Dokseodang-Ro etc.) available via the "Impressum" link in the footer. General contact email throughout the site is vs.vorsitz@dsseoul.org. Order confirmations are still BCC'd to the parents' association (vs.vorsitz@dsseoul.org) as requested originally.
- **Product cards** showing the item photo, description, price, color selector, size selector (with children & adult sizes where applicable), and quantity.
- **Shopping basket** (drawer on the right):
  - Add to basket merges identical variants (same item + color + size).
  - Live line totals and grand total.
  - +/- quantity controls and remove per line.
  - Persisted in browser localStorage (survives refresh).
- **Checkout flow**:
  1. Click "Order Now" in the basket.
  2. Review the summary (includes unique purchase number e.g. `D2602ABCDE` (max 10 chars for bank ref) and collection info) + enter your name and email address.
  3. Click **"Confirm and Order"** → an automatic confirmation email (with full order + payment instructions) is sent to your address **and** to vs.vorsitz@dsseoul.org. No manual sending required.
- **Email handling** (uses EmailJS for automatic sending - see Technical notes):
  - On "Confirm and Order", one identical email (full confirmation with tabular ITEMS for easy Excel copy-paste) is sent to the customer; school office (vs.vorsitz@dsseoul.org) receives it via BCC.
  - **Copy to clipboard** button remains available as a fallback/record.
  - The thank-you screen shows payment details and confirmation.
- **Dummy payment details** (clearly marked as dummy):
  - Bank: Shinhan Bank (신한은행)
  - Account: 56208298713156
  - Holder: DSSI, Merchandise
- **Size guide** modal with the key body measurements from the PDF (approximate).
- Fully responsive (works on phone, tablet, desktop). Nice modern UI with Tailwind.

## How to use (for parents / users)
1. Copy the entire `order-form` folder to a location you can open in a browser (or host it on any static web host / GitHub Pages / school intranet).
2. Double-click `index.html` (or open it from your browser's File → Open).
3. Switch language if needed (top right).
4. For each item choose **color**, **size**, **quantity** → "Add to basket".
5. Open the basket (shopping bag icon top right).
6. Review / adjust quantities → "Order Now".
7. Enter your name and email → "Confirm and Order".
8. The system automatically sends one identical email (full confirmation with tabular ITEMS for easy Excel copy, including the name you entered) to your email; vs.vorsitz@dsseoul.org receives it via BCC.
9. On the thank-you screen you will see the order number, payment details, and the ITEMS table. The school will contact you after payment.

Automatic emails are sent via the configured EmailJS integration (see Technical notes). If the keys are invalid or removed, it falls back to console simulation.

## For the school / administrators
- On "Confirm and Order", one identical email (full confirmation with tabular ITEMS table for easy copy-paste to Excel) is sent to the customer; vs.vorsitz@dsseoul.org receives it via BCC.
- At the same moment, every line item is automatically appended to a Google Sheet (via a linked Google Form). You get a live tabular list with: Order Number, Order Date, Customer Name, Customer Email, Item (incl. color + size), Quantity, and Line Total (qty × price). Perfect for managing what needs to be produced/collected.
- The unique order number (max. 10 characters, e.g. D2602ABCDE) appears in the email body as "ORDER NUMBER" / "BESTELLNUMMER" / "주문번호" and as the payment Reference (suitable for bank transfers).
- The thank-you screen (and email) includes the full payment instructions + dummy Korean bank account + the ITEMS table.
- You can keep the folder on a shared drive or publish it on the school website.
- To change prices, items, colors, sizes or bank details: edit `index.html` (clearly commented sections near the top of the `<script>`).
- **Important**: EmailJS is already configured with the school's keys. If you change the service/template later, update the keys in index.html. Ensure vs.vorsitz@dsseoul.org can receive emails from the configured service.
- **Google Sheet logging**: See the large comment block directly above `GOOGLE_FORM_CONFIG` in `index.html` for the exact setup steps (create form → link sheet → find entry IDs → paste into the config). The sheet is the easiest way for admin staff to get a clear overview without manual copying.
- **Live inventory (Google Sheet)**: Tab **Inventar** is the source of truth. On each confirmed order the web app decreases **Inventar** and increases **Bestellungen** for every tracked variant (currently mugs). See setup below.

## Live inventory setup (Google Apps Script)

Uses the dedicated inventory spreadsheet **Inventar Merchandise**:

[Inventar Merchandise](https://docs.google.com/spreadsheets/d/1D1X_h5hNpQBW1kNMvhcnQGU0qMZ-rDqF5ETf1ueMkDU/edit)

| Artikel | Eigenschaft | Anfangsbestand 18.7. | Bestellungen | Verfügbares Inventar |
|---------|-------------|----------------------|--------------|----------------------|
| Tasse | weiß | 118 | 0 | 118 |
| … | … | … | … | … |

**On each confirmed order:** script checks **Verfügbares Inventar** (Anfangsbestand − Bestellungen), then adds the ordered qty to **Bestellungen**. Column **Anfangsbestand** stays fixed (physical count baseline).

1. Open the sheet → **Extensions → Apps Script** → paste `google-apps-script/InventarWebApp.gs` → **Save**.  
   (`SPREADSHEET_ID` is already set to this file.)
2. Set `SECRET` in the script (same value later in `index.html`).
3. Optional but recommended: run **`installVerfuegbarFormulas`** once so column E is `=MAX(0,C-D)`.
4. **Deploy → New deployment → Web app**  
   - Execute as: **Me**  
   - Who has access: **Anyone**  
   Copy the Web App URL.
5. In `index.html` → `INVENTORY_API`:
   ```js
   webAppUrl: 'https://script.google.com/macros/s/XXXX/exec',
   secret: 'same-secret-as-in-the-script'
   ```
6. Deploy the shop. Console: `[Inventory] Live stock loaded from Google Sheet: …`
7. Test-order a mug colour → **Bestellungen** increases, **Verfügbares Inventar** decreases.

- Shop maps e.g. `mug` + `white` ↔ Tasse / weiß (see `VARIANT_MAP` in the `.gs` file).
- Order detail rows still go to your Google Form / orders sheet (`GOOGLE_FORM_CONFIG`).
- After script changes: **Deploy → Manage deployments → Edit → New version**.

## Files in this folder
- `index.html` — the complete single-file application (open this)
- `google-apps-script/InventarWebApp.gs` — paste into Apps Script for live Inventar / Bestellungen
- `tshirt.jpg`, `poloshirt.jpg`, `hoodie.jpg`, `jacket.jpg`, `mug.jpg`, `thermobecher.jpg`, `trinkflasche.jpg`, `eco-tasche.jpg`, `umbrella.jpg`, `Jahrbuch-25-26.jpg`, `mascot.jpg` — product photos (most new items and mascot are Grok Imagine placeholders; Jahrbuch photo provided)
- `README.md` — this file
- School Jacket, Mug Cup, Thermobecher, Trinkflasche, Eco-Tasche, Umbrella, Jahrbuch and School Mascot use images (Jahrbuch photo provided; others are Grok Imagine placeholders or real). Update the `image` value in the `products` array in index.html when you have real photos. Jahrbuch, mascot and eco-tasche have limited or no color variants.

The original `DSSI Shirts 2026.pdf` is included in this folder for reference (size charts etc.).

## Technical notes
- Pure HTML + Tailwind (CDN) + vanilla JavaScript. No build step, no server.
- Works in any modern browser (Chrome, Edge, Firefox, Safari).
- Cart + language preference saved locally.
- **Automatic emails**: Configured with EmailJS. Emails are sent automatically to the customer + vs.vorsitz@dsseoul.org on "Confirm and Order". See the large comment block directly above `EMAILJS_CONFIG` in `index.html` for the full recommended template + detailed troubleshooting for the "One or more dynamic variables are corrupted" error. IMPORTANT: You must serve the page over http://localhost (not by double-clicking index.html). See the same comment block for easy Windows options (Live Server in VS Code is the simplest).
- **Automatic Google Sheet logging**: On every confirmed order the site also posts the line items (order # + date + name + email + item + qty + line total) to a Google Form that feeds a Google Sheet. This is the recommended way for admin staff to get a clean tabular overview. Full setup instructions are in the big comment above `GOOGLE_FORM_CONFIG` inside `index.html`. No extra services or cost.
- **Live inventory API**: Optional Google Apps Script web app (`InventarWebApp.gs`). On load the shop GETs stock; on “Confirm and Order” it POSTs the cart so the server atomically decreases **Inventar** and increases **Bestellungen**. Without `INVENTORY_API.webAppUrl`, a local fallback map is used (no multi-user sync).
- The thank-you screen no longer requires the user to manually open their email client.

## Dummy bank account (replace for real use)
Bank: Shinhan Bank  
Account: 56208298713156  
Name of the Account: DSSI, Merchandise  
Always use the (max. 10 character) order number as the payment reference.

---

Created for DSSI (Deutsche Schule Seoul International) – 2026 school clothing orders.  
General school contact for questions: vs.vorsitz@dsseoul.org (order copies go to vs.vorsitz@dsseoul.org)

Enjoy the simple ordering experience!

## How to Publish (Easiest Ways)

### Recommended: Netlify Drop (Fastest - 1 minute)

This is the absolute easiest way with zero setup.

1. **Prepare a clean deploy folder** (strongly recommended):
   - Create a new folder on your computer, e.g. `dssi-order-form-live`
   - Copy **only** these 13 files into it:
     - `index.html`
     - `DSSI logo.jpg`
     - `tshirt.jpg`
     - `poloshirt.jpg`
     - `hoodie.jpg`
     - `jacket.jpg`
     - `mug.jpg`
     - `thermobecher.jpg`
     - `trinkflasche.jpg`
     - `eco-tasche.jpg`
     - `umbrella.jpg`
     - `Jahrbuch-25-26.jpg`
     - `mascot.jpg`

2. Go to this page in your browser:  
   **https://app.netlify.com/drop**

3. Drag the entire `dssi-order-form-live` folder onto the big drop area on the page.

4. Wait 20–40 seconds. Netlify will give you a public URL, for example:  
   `https://dssi-order-form-2026.netlify.app`

5. Open the URL and test the complete flow (including placing a test order).

**Important: EmailJS after publishing**
- Copy your new Netlify domain (e.g. `dssi-order-form-2026.netlify.app`)
- Log into your EmailJS account → go to **Account** → **Security** (or search for "Allowed domains")
- Add `https://dssi-order-form-2026.netlify.app` (and `https://www.dssi-order-form-2026.netlify.app` if it appears)
- Without this step, automatic emails will be blocked on the live site.

### Alternative: Vercel (also very easy)

1. Go to https://vercel.com/import
2. Drag the same clean `dssi-order-form-live` folder
3. Get a URL like `https://dssi-order-form.vercel.app`
4. Add the domain to EmailJS allowed origins (same as above)

### GitHub Pages (Free, permanent, version controlled)

This is a great long-term option.

1. Make sure your repository has the files at the **root** (not inside an `order-form/` subfolder).  
   If you uploaded the whole folder, go to the repo on GitHub, move `index.html` and the four `.jpg` files to the root, then delete the empty folder.

2. Go to your repository on GitHub.

3. Click the **Settings** tab (top right).

4. In the left sidebar, scroll down and click **Pages**.

5. Under “Build and deployment”:
   - Source: select **Deploy from a branch**
   - Branch: select `main` (or `master`)
   - Folder: select `/ (root)`

6. Click **Save**.

7. Wait 30–60 seconds. At the top of the Pages section you will see your live URL, something like:  
   `https://yourusername.github.io/dssi-order-form`

8. **Critical for EmailJS**:  
   Copy the full domain (e.g. `yourusername.github.io`).  
   Go to your EmailJS dashboard → **Account** → **Security** (or search “Allowed domains”).  
   Add `https://yourusername.github.io` and the full repo URL (e.g. `https://yourusername.github.io/dssi-order-form`).  
   Save. This is required so automatic emails work on the live site.

9. Open the URL and test the full ordering flow.

### Updating the Live Site Later

- **Netlify Drop / Vercel**: Just drag the clean folder again (it updates the same site).
- **GitHub Pages**: Edit the files on your computer, then commit and push to the repository. GitHub will automatically rebuild and deploy the new version (usually within 1 minute).

### Getting a Nice Domain (Optional)

Once published, you can:
- Use the free `*.netlify.app` or `*.vercel.app` subdomain, or
- Add a custom subdomain from the school (e.g. `bestellung.dsseoul.org`) by adding a CNAME record pointing to your Netlify/Vercel site.

---

**Final Checklist Before Publishing**
- Test the form thoroughly on `http://localhost` first (using Live Server or `npx http-server`)
- Make sure the EmailJS keys in `index.html` are the real production ones
- After going live, immediately add the new domain in EmailJS
- Do a full test order on the live URL

You’re ready to go live whenever you want! Let me know if you get stuck at any step.