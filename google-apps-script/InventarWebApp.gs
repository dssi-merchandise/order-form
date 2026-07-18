/**
 * DSSI Merchandise – Inventar Web App (Google Apps Script)
 * ========================================================
 *
 * Spreadsheet: "Inventar Merchandise"
 *   https://docs.google.com/spreadsheets/d/1D1X_h5hNpQBW1kNMvhcnQGU0qMZ-rDqF5ETf1ueMkDU/
 *
 * Layout (row 1 = header) — matches your sheet:
 *   A: Artikel
 *   B: Eigenschaft
 *   C: Anfangsbestand 18.7.   (fixed starting stock — do not change by script)
 *   D: Bestellungen           (script ADDS ordered qty here)
 *   E: Verfügbares Inventar   (script checks this; prefers formula =C-D, else writes C-D)
 *
 * SETUP (once):
 * 1. Open the sheet above → Extensions → Apps Script → paste this file → Save.
 * 2. Set SECRET (same as index.html → INVENTORY_API.secret).
 * 3. Optional: run installVerfuegbarFormulas() so column E is always =C-D.
 * 4. Deploy → New deployment → Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Paste Web App URL into index.html → INVENTORY_API.webAppUrl
 * 6. After script changes: Manage deployments → Edit → New version.
 *
 * API:
 *   GET  ?action=stock&secret=...  → { ok, stock: { "mug::white": 118, ... } }
 *   POST text/plain JSON:
 *     { action: "placeOrder", secret, orderId, customerName, customerEmail,
 *       items: [{ productId, colorId, qty }] }
 *     → checks Verfügbares Inventar, then Bestellungen += qty
 */

var SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';

var SPREADSHEET_ID = '1D1X_h5hNpQBW1kNMvhcnQGU0qMZ-rDqF5ETf1ueMkDU';

// First sheet tab (yours is "Sheet1") — leave empty to use the first tab
var SHEET_NAME = '';

// Columns (1-based)
var COL = {
  artikel: 1,       // A
  eigenschaft: 2,   // B
  anfang: 3,        // C  Anfangsbestand
  bestellungen: 4,  // D  Bestellungen
  verfuegbar: 5     // E  Verfügbares Inventar
};

/**
 * Map shop productId + colorId → Artikel + Eigenschaft (as in the sheet).
 * Extend this when you add more products to the sheet.
 */
var VARIANT_MAP = {
  'mug::white': { artikel: 'Tasse', eigenschaft: 'weiß' },
  'mug::white-blue-inside': { artikel: 'Tasse', eigenschaft: 'weiß blau' },
  'mug::white-pink-inside': { artikel: 'Tasse', eigenschaft: 'weiß pink' },
  'mug::white-green-inside': { artikel: 'Tasse', eigenschaft: 'weiß grün' },
  'mug::white-yellow-inside': { artikel: 'Tasse', eigenschaft: 'weiß gelb' },
  'mug::black-red-inside': { artikel: 'Tasse', eigenschaft: 'schwarz rot' },
  'mug::black-pink-inside': { artikel: 'Tasse', eigenschaft: 'schwarz pink' },
  'mug::black-blue-inside': { artikel: 'Tasse', eigenschaft: 'schwarz blau' }
};

// Reverse lookup: normalized "tasse|weiß blau" → "mug::white-blue-inside"
var LABEL_TO_KEY = (function () {
  var m = {};
  Object.keys(VARIANT_MAP).forEach(function (k) {
    var v = VARIANT_MAP[k];
    m[normLabel(v.artikel) + '|' + normLabel(v.eigenschaft)] = k;
  });
  return m;
})();

// ---------------------------------------------------------------------------
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getInventarSheet() {
  var ss = getSpreadsheet();
  if (SHEET_NAME) {
    var named = ss.getSheetByName(SHEET_NAME);
    if (!named) throw new Error('Tab "' + SHEET_NAME + '" nicht gefunden.');
    return named;
  }
  return ss.getSheets()[0];
}

function normLabel(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ß/g, 'ss');
}

function makeKey(productId, colorId) {
  return String(productId || '').trim() + '::' + String(colorId || '').trim();
}

function toNumber(v) {
  if (v === '' || v === null || v === undefined) return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

/**
 * Optional helper: set E =C-D for every data row (keeps "Verfügbares Inventar" live).
 */
function installVerfuegbarFormulas() {
  var sheet = getInventarSheet();
  var last = sheet.getLastRow();
  if (last < 2) return;
  for (var r = 2; r <= last; r++) {
    var artikel = sheet.getRange(r, COL.artikel).getValue();
    if (!String(artikel || '').trim()) continue;
    sheet.getRange(r, COL.verfuegbar).setFormula('=MAX(0,C' + r + '-D' + r + ')');
    // Empty Bestellungen → 0 so formula works cleanly
    var b = sheet.getRange(r, COL.bestellungen).getValue();
    if (b === '' || b === null) {
      sheet.getRange(r, COL.bestellungen).setValue(0);
    }
  }
  try {
    SpreadsheetApp.getUi().alert('Spalte E (Verfügbares Inventar) = MAX(0, C-D) für alle Zeilen.');
  } catch (e) {
    Logger.log('Formulas installed.');
  }
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
function doGet(e) {
  try {
    e = e || { parameter: {} };
    var action = (e.parameter.action || 'stock').toLowerCase();
    if (!checkSecret(e.parameter.secret)) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }
    if (action === 'stock') {
      return jsonOut({ ok: true, stock: readStockMap(), rows: readStockRows() });
    }
    return jsonOut({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
      if (typeof body.items === 'string') {
        try { body.items = JSON.parse(body.items); } catch (ignore) {}
      }
    }

    if (!checkSecret(body.secret)) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }

    var action = (body.action || '').toLowerCase();
    if (action === 'placeorder' || action === 'place_order') {
      return jsonOut(placeOrder(body));
    }
    if (action === 'stock') {
      return jsonOut({ ok: true, stock: readStockMap(), rows: readStockRows() });
    }
    return jsonOut({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function checkSecret(provided) {
  if (!SECRET || SECRET === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING') {
    return true;
  }
  return provided && String(provided) === String(SECRET);
}

// ---------------------------------------------------------------------------
// Read stock
// ---------------------------------------------------------------------------
function readSheetData() {
  var sheet = getInventarSheet();
  var last = sheet.getLastRow();
  if (last < 2) return { sheet: sheet, rows: [] };

  var values = sheet.getRange(2, 1, last, 5).getValues();
  var formulasE = sheet.getRange(2, COL.verfuegbar, last, COL.verfuegbar).getFormulas();
  var rows = [];

  for (var i = 0; i < values.length; i++) {
    var artikel = String(values[i][0] || '').trim();
    var eigenschaft = String(values[i][1] || '').trim();
    if (!artikel) continue;

    var anfang = toNumber(values[i][2]);
    var bestellt = toNumber(values[i][3]);
    var verfuegbarCell = toNumber(values[i][4]);
    // Prefer Anfang - Bestellungen as source of truth; fall back to column E
    var verfuegbar = Math.max(0, Math.floor(anfang - bestellt));
    if (anfang === 0 && verfuegbarCell > 0 && bestellt === 0) {
      verfuegbar = Math.max(0, Math.floor(verfuegbarCell));
    }

    var labelKey = normLabel(artikel) + '|' + normLabel(eigenschaft);
    var shopKey = LABEL_TO_KEY[labelKey] || null;

    rows.push({
      sheetRow: i + 2,
      artikel: artikel,
      eigenschaft: eigenschaft,
      anfang: anfang,
      bestellungen: bestellt,
      verfuegbar: verfuegbar,
      hasFormulaE: !!(formulasE[i] && formulasE[i][0]),
      shopKey: shopKey,
      labelKey: labelKey
    });
  }
  return { sheet: sheet, rows: rows };
}

function readStockMap() {
  var data = readSheetData();
  var map = {};
  data.rows.forEach(function (r) {
    if (r.shopKey) {
      map[r.shopKey] = r.verfuegbar;
    }
  });
  return map;
}

function readStockRows() {
  return readSheetData().rows.map(function (r) {
    return {
      productId: r.shopKey ? r.shopKey.split('::')[0] : '',
      colorId: r.shopKey ? r.shopKey.split('::').slice(1).join('::') : '',
      artikel: r.artikel,
      eigenschaft: r.eigenschaft,
      anfang: r.anfang,
      inventar: r.verfuegbar,
      bestellungen: r.bestellungen,
      verfuegbar: r.verfuegbar
    };
  });
}

// ---------------------------------------------------------------------------
// placeOrder: check Verfügbares Inventar, then Bestellungen += qty
// ---------------------------------------------------------------------------
function placeOrder(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { ok: false, error: 'busy', message: 'Inventar ist gerade belegt. Bitte erneut versuchen.' };
  }

  try {
    var items = body.items || [];
    if (!items.length) {
      return { ok: false, error: 'empty', message: 'Keine Artikel in der Bestellung.' };
    }

    // Aggregate qty by shop key (productId::colorId)
    var needed = {};
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var key = makeKey(it.productId, it.colorId);
      var q = Math.floor(toNumber(it.qty));
      if (q <= 0) continue;
      // Only track variants we know how to map to the sheet
      if (!VARIANT_MAP[key]) continue;
      needed[key] = (needed[key] || 0) + q;
    }

    var neededKeys = Object.keys(needed);
    if (!neededKeys.length) {
      // Order has no inventory-tracked lines (e.g. only shirts) — accept
      return {
        ok: true,
        orderId: body.orderId || '',
        stock: readStockMap(),
        message: 'Order accepted (no tracked inventory lines).'
      };
    }

    var data = readSheetData();
    var rowByShopKey = {};
    data.rows.forEach(function (r) {
      if (r.shopKey) rowByShopKey[r.shopKey] = r;
    });

    var shortfalls = [];
    for (var j = 0; j < neededKeys.length; j++) {
      var nk = neededKeys[j];
      var want = needed[nk];
      var row = rowByShopKey[nk];
      if (!row) {
        shortfalls.push({
          key: nk,
          available: 0,
          requested: want,
          reason: 'unknown_variant'
        });
        continue;
      }
      if (row.verfuegbar < want) {
        shortfalls.push({
          key: nk,
          available: row.verfuegbar,
          requested: want,
          reason: 'insufficient',
          artikel: row.artikel,
          eigenschaft: row.eigenschaft
        });
      }
    }

    if (shortfalls.length) {
      return {
        ok: false,
        error: 'insufficient_stock',
        message: 'Nicht genügend Verfügbares Inventar.',
        shortfalls: shortfalls,
        stock: readStockMap()
      };
    }

    // Apply: Bestellungen += qty; refresh Verfügbares if no formula
    var sheet = data.sheet;
    for (var m = 0; m < neededKeys.length; m++) {
      var mk = neededKeys[m];
      var qty = needed[mk];
      var r = rowByShopKey[mk];
      var newBestellt = r.bestellungen + qty;
      var newVerfuegbar = Math.max(0, r.anfang - newBestellt);

      sheet.getRange(r.sheetRow, COL.bestellungen).setValue(newBestellt);

      if (!r.hasFormulaE) {
        sheet.getRange(r.sheetRow, COL.verfuegbar).setValue(newVerfuegbar);
      }
      // If E has a formula, it recalculates from C - D automatically
    }

    SpreadsheetApp.flush();

    return {
      ok: true,
      orderId: body.orderId || '',
      stock: readStockMap(),
      message: 'Bestellungen aktualisiert, Verfügbares Inventar geprüft.'
    };
  } finally {
    lock.releaseLock();
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
