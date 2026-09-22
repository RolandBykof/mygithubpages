/**
 * VR Paikkavalinta – Saavutettavuuslaajennus
 * content.js
 *
 * Pohjautuu Tampermonkey-skriptiin "VR saavutettava paikkalista" (v22.2).
 *
 * Toiminta:
 *  - Seuraa DOM:ia MutationObserverilla, odottaa "Valitse paikka" -dialogin aukeamista
 *  - Kun dialogi aukeaa, injektoi saavutettavan HTML-paneelin ennen vaunukarttaa
 *  - Paneelissa on vaunu- ja kerrosvalitsimet, paikkatyyppisuodatus sekä vapaat
 *    paikat listbox-muodossa
 *  - Paikkavalinta simuloi klikkauksen SVG-elementille, jolloin VR:n oma JS
 *    käsittelee valinnan
 *  - Tulokset päivitetään aria-live-alueella ruudunlukijalle
 *  - "Vaihda paikka" -painikkeen virheellinen saavutettavuusilmoitus korvataan
 *  - "Vahvista paikkavalinta" -painikkeen aria-label päivitetään sisältämään
 *    valitun vaunun ja paikan tiedot
 *  - Käyttäjän valitsema paikkakarttatyyli (teksti/kuva) muistetaan localStorageen
 */

(function () {
  'use strict';

  const PANEL_ID = 'vr-acc-panel';
  const STATUS_ID = 'vr-acc-status';
  const TOGGLE_ID = 'vr-acc-style-toggle';
  const SUMMARY_ID = 'vr-acc-summary';
  const STYLE_PREF_KEY = 'vrAccSeatMapStyle';
  const DEBUG = false;
  const WAGON_LOAD_TIMEOUT_MS = 4000;
  const SEAT_ACTIVATION_TIMEOUT_MS = 5000;
  const PASSENGER_DIALOG_SETTLE_MS = 2000;
  const DOCUMENT_REFRESH_DEBOUNCE_MS = 50;
  const STARTUP_CHECK_DELAY_MS = 800;
  const FEATURE_LABELS = {
    opposite: 'vastakkainen paikka',
    forward: 'menosuuntaan',
    wheelchair: 'pyörätuolipaikka',
    accessible: 'esteetön paikka',
    table: 'pöytäpaikka',
    quiet: 'hiljainen osasto',
    family: 'perhepaikka',
    higherPrice: 'kalliimpi hinta',
    ekstra: 'Ekstra-luokka',
    ekstraPlus: 'Ekstra Plus -luokka',
    ekstraRento: 'Ekstra Rento',
    ekstraRauhallinen: 'Ekstra Rauhallinen'
  };
  const SERVICE_ONLY_COACH_TYPES = new Set(['TPB']);
  const PREMIUM_PRODUCT_TYPES = new Set([
    'EXTRA_CLASS_SEAT',
    'SINGLE_EXTRA_CLASS_SEAT',
    'EXTRA_PLUS_SEAT',
    'EXTRA_PLUS_SINGLE_SEAT',
    'SEAT_UPSTAIRS_RESTAURANT_WAGON',
    'SINGLE_SEAT_UPSTAIRS_RESTAURANT_WAGON'
  ]);
  const OPPOSITE_ATTRIBUTE_CODES = new Set([
    'DPV',
    'LEV',
    'LVV',
    'VAE',
    'VAS',
    'VPC'
  ]);
  let lastSelectedSeatKey = '';
  let pendingSeatSelection = null;
  let seatRenderGeneration = 0;
  let documentRefreshTimer = null;

  const STYLES = `
    #${TOGGLE_ID} {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 20px;
      margin: 0 16px 0;
      background: #f0f4fa;
      border: 2px solid #0057a8;
      border-radius: 8px 8px 0 0;
      border-bottom: none;
      font-family: "Gotham SSm A", "Gotham SSm B", Arial, sans-serif;
      font-size: 15px;
      color: #1a1a1a;
    }
    #${TOGGLE_ID} fieldset {
      border: none;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    #${TOGGLE_ID} legend {
      font-weight: bold;
      float: left;
      margin-right: 12px;
      padding: 0;
    }
    #${TOGGLE_ID} label {
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    #${TOGGLE_ID} input[type="radio"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #0057a8;
    }
    #${PANEL_ID} {
      background: #fff;
      border: 2px solid #0057a8;
      border-radius: 0 0 8px 8px;
      padding: 16px 20px;
      margin: 0 16px 12px;
      font-family: "Gotham SSm A", "Gotham SSm B", Arial, sans-serif;
      font-size: 15px;
      color: #1a1a1a;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    #${PANEL_ID} h2 {
      margin: 0 0 8px 0;
      font-size: 17px;
      color: #0057a8;
    }
    #${PANEL_ID} .vr-acc-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    #${PANEL_ID} label {
      font-weight: bold;
    }
    #${PANEL_ID} select {
      padding: 5px 8px;
      border: 1px solid #0057a8;
      border-radius: 4px;
      font-size: 14px;
      background: #fff;
      color: #1a1a1a;
    }
    #${PANEL_ID} .vr-acc-seat-picker {
      display: flex;
      gap: 8px;
      align-items: end;
      margin-top: 6px;
    }
    #${PANEL_ID} .vr-acc-seat-combo {
      flex: 1 1 auto;
      padding: 5px 8px;
      border: 1px solid #0057a8;
      border-radius: 4px;
      font-size: 14px;
      background: #fff;
      color: #1a1a1a;
    }
    #${PANEL_ID} .vr-acc-select-seat-btn {
      padding: 8px 12px;
      border: 2px solid #0057a8;
      border-radius: 4px;
      background: #fff;
      color: #0057a8;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    #${PANEL_ID} .vr-acc-select-seat-btn:hover,
    #${PANEL_ID} .vr-acc-select-seat-btn:focus {
      background: #e8f0f9;
      outline: 3px solid #003c7e;
    }
    #${PANEL_ID} .vr-acc-secondary-btn {
      border-color: #555;
      color: #333;
    }
    #${SUMMARY_ID} {
      margin: 8px 0 10px;
      color: #333;
      min-height: 20px;
    }
    #${STATUS_ID} {
      margin-top: 10px;
      font-weight: bold;
      color: #005a00;
      min-height: 20px;
    }
    #${PANEL_ID} .vr-acc-no-seats {
      color: #777;
      font-style: italic;
      padding: 6px;
    }
    #${PANEL_ID} .vr-acc-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 10px;
      font-size: 12px;
      color: #555;
    }
    #${PANEL_ID} .vr-acc-legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    #${PANEL_ID} .vr-acc-legend-box {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      display: inline-block;
      flex-shrink: 0;
    }
  `;

  function getSeatSelectionTokens(gEl) {
    return new Set(
      (gEl.getAttribute('data-selection') || '')
        .split(/\s+/)
        .map(token => token.trim().toLowerCase())
        .filter(Boolean)
    );
  }

  function getSeatProductType(gEl) {
    return (
      gEl.getAttribute('data-product-type') ||
      gEl.getAttribute('data-product') ||
      gEl.getAttribute('data-forte-product') ||
      ''
    ).toUpperCase();
  }

  function getSeatServiceTokens(gEl) {
    return new Set(
      (gEl.getAttribute('data-services') || '')
        .split(/\s+/)
        .map(token => token.trim().toUpperCase())
        .filter(Boolean)
    );
  }

  function isHigherPriceSeat(gEl) {
    const explicitHints = [
      gEl.getAttribute('class'),
      gEl.getAttribute('data-price-category'),
      gEl.getAttribute('data-price-type'),
      gEl.getAttribute('data-testid')
    ].filter(Boolean).join(' ');
    if (includesAny(explicitHints, ['higherprice', 'higher-price', 'kalliimpi', 'surcharge'])) {
      return true;
    }

    const shape = getSeatShape(gEl);
    const rgb = shape ? parseRGB(window.getComputedStyle(shape).fill) : null;
    return Boolean(
      rgb &&
      rgb.b >= 235 &&
      rgb.g >= 225 &&
      rgb.r >= 200 &&
      rgb.b > rgb.r
    );
  }

  function getSeatShape(gEl) {
    const shapeId = gEl.id ? gEl.id + '_shape' : '';
    if (!shapeId) return null;
    return gEl.querySelector(`[id="${shapeId}"]`) ||
      gEl.closest('[data-testid="carriage-floor"]')?.querySelector(`[id="${shapeId}"]`) ||
      null;
  }

  function getSeatStatus(gEl) {
    const hasStructuredState = gEl.hasAttribute('data-selection');
    const selectionTokens = getSeatSelectionTokens(gEl);

    if (hasStructuredState) {
      if (selectionTokens.has('booked')) return 'selected';
      if (
        selectionTokens.has('unavailable') ||
        selectionTokens.has('otherinflow') ||
        selectionTokens.has('quotainflow') ||
        gEl.getAttribute('aria-disabled') === 'true'
      ) {
        return 'unavailable';
      }
      if (selectionTokens.has('available')) {
        return isHigherPriceSeat(gEl) ? 'higher-price' : 'available';
      }
      if (gEl.getAttribute('data-bookable') === 'true') {
        return isHigherPriceSeat(gEl) ? 'higher-price' : 'available';
      }
      return 'unavailable';
    }

    // Legacy fallback for older VR maps that do not expose data-selection.
    if (gEl.getAttribute('aria-selected') === 'true') return 'selected';
    if (gEl.getAttribute('aria-selected') === null) return 'unavailable';

    const shape = getSeatShape(gEl);
    if (!shape) return 'available';

    const fill = window.getComputedStyle(shape).fill;
    const rgb = parseRGB(fill);

    if (!rgb) {
      const pe = window.getComputedStyle(gEl).pointerEvents;
      return pe === 'none' ? 'unavailable' : 'available';
    }

    const { r, g, b } = rgb;

    if (r >= 245 && g >= 245 && b >= 245) return 'available';
    if (b >= 235 && g >= 225 && r >= 200 && b > r) return 'higher-price';
    if (r >= 190 && r <= 250 && Math.abs(r - g) < 20 && Math.abs(r - b) < 20) return 'unavailable';
    if (r < 100 && b > 100) return 'selected';

    debugLog('Unknown seat fill, treating as available', gEl.id, fill, rgb);
    return 'available';
  }

  function parseRGB(str) {
    const m = str && str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
  }

  function debugLog(...args) {
    if (DEBUG) console.debug('[vr-a11y-seat-picker]', ...args);
  }

  function getSavedStyle() {
    try {
      return localStorage.getItem(STYLE_PREF_KEY) === 'kuva' ? 'kuva' : 'teksti';
    } catch (_) {
      return 'teksti';
    }
  }

  function saveStyle(value) {
    try {
      localStorage.setItem(STYLE_PREF_KEY, value);
    } catch (_) {}
  }

  function getWagonCoachType(wagonEl) {
    const explicitType = wagonEl.getAttribute('data-coach-type');
    if (explicitType) return explicitType.toUpperCase();
    const svgRootG = wagonEl.querySelector('svg g[id]');
    return svgRootG ? svgRootG.id.toUpperCase().split(/[_-]/)[0] : '';
  }

  function getWagonPlaceElements(wagonEl) {
    return [...wagonEl.querySelectorAll('g[data-place], g[id^="seat_"]')];
  }

  function isWagonContentLoaded(wagonEl) {
    return getWagonPlaceElements(wagonEl).length > 0 ||
      [...wagonEl.querySelectorAll('[data-testid="carriage-floor"]')]
        .some(floor => floor.querySelector('[class*="_coachSvg_"][aria-label]'));
  }

  function isServiceWagon(wagonEl) {
    if (SERVICE_ONLY_COACH_TYPES.has(getWagonCoachType(wagonEl))) return true;
    return isWagonContentLoaded(wagonEl) && getWagonPlaceElements(wagonEl).length === 0;
  }

  function ensureWagonLoaded(wagonEl) {
    return new Promise(resolve => {
      if (isWagonContentLoaded(wagonEl)) {
        resolve();
        return;
      }

      const scrollContainer = document.querySelector(
        '[data-testid="wagonmap-coachmap"], [class*="_horizontallyScrollable_"]'
      );

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const wagonRect = wagonEl.getBoundingClientRect();
        const currentScroll = scrollContainer.scrollLeft;
        const targetScroll = currentScroll + (wagonRect.left - containerRect.left)
          - containerRect.width / 2 + wagonRect.width / 2;
        scrollContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
      } else {
        wagonEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      const observer = new MutationObserver(() => {
        if (isWagonContentLoaded(wagonEl)) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(wagonEl, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, WAGON_LOAD_TIMEOUT_MS);
    });
  }

  function floorIsEkstra(floorContainer) {
    const places = [...floorContainer.querySelectorAll('g[data-place]')];
    const productTypes = places.map(getSeatProductType).filter(Boolean);
    if (productTypes.length) {
      return productTypes.every(productType =>
        PREMIUM_PRODUCT_TYPES.has(productType)
      );
    }
    const uses = floorContainer.querySelectorAll('use[href*="ekstra"], use[xlink\\:href*="ekstra"]');
    return uses.length > 0;
  }

  function collectElementText(el) {
    if (!el) return '';
    const parts = [el.textContent || '', el.outerHTML || ''];
    el.querySelectorAll('[aria-label], [aria-description], [title], [href], [xlink\\:href], [data-testid], [data-tooltip], [data-tip], [data-icon], [data-name]').forEach(child => {
      [
        'aria-label',
        'aria-description',
        'title',
        'href',
        'xlink:href',
        'data-testid',
        'data-tooltip',
        'data-tip',
        'data-icon',
        'data-name'
      ].forEach(name => parts.push(child.getAttribute(name) || ''));
    });
    return parts.join(', ');
  }

  function wagonLabel(wagonId) {
    return 'Vaunu ' + wagonId.replace('wagon_', '');
  }

  function wagonDetailLabel(wagonId) {
    return wagonId ? wagonLabel(wagonId) : '';
  }

  function floorFeatureLabels(floorContainer) {
    if (!floorContainer) return [];
    const structuredPlaces = [...floorContainer.querySelectorAll('g[data-place]')];
    const source = structuredPlaces.length ? '' : collectElementText(floorContainer);
    const serviceTokens = new Set(
      structuredPlaces.flatMap(place => [...getSeatServiceTokens(place)])
    );
    const productTypes = structuredPlaces.map(getSeatProductType).filter(Boolean);
    const isEkstraFloor = structuredPlaces.length
      ? floorIsEkstra(floorContainer)
      : floorIsEkstra(floorContainer) || includesAny(source, ['ekstra', 'extra', 'premium']);
    const isEkstraPlusFloor = productTypes.length > 0 &&
      productTypes.every(productType =>
        productType === 'EXTRA_PLUS_SEAT' ||
        productType === 'EXTRA_PLUS_SINGLE_SEAT'
      );
    const isRento = structuredPlaces.length
      ? isEkstraFloor && serviceTokens.has('EKSTRA-RELAXED')
      : includesAny(source, ['rento', 'relaxed']);
    const isRauhallinen = structuredPlaces.length
      ? isEkstraFloor && serviceTokens.has('EKSTRA-CALM')
      : includesAny(source, ['rauhallinen', 'hiljainen', 'quiet', 'silent']);
    const isPlayArea = structuredPlaces.length
      ? serviceTokens.has('PLAY-AREA')
      : includesAny(source, ['leikki', 'play']);
    const labels = [];
    const add = label => {
      if (!labels.includes(label)) labels.push(label);
    };

    if (isEkstraPlusFloor) {
      add(FEATURE_LABELS.ekstraPlus);
    } else if (isEkstraFloor && isRento) {
      add(FEATURE_LABELS.ekstraRento);
    } else if (isEkstraFloor && isRauhallinen) {
      add(FEATURE_LABELS.ekstraRauhallinen);
    } else if (isEkstraFloor) {
      add(FEATURE_LABELS.ekstra);
    }
    if (!isEkstraFloor && isRauhallinen) {
      add('rauhallinen osasto');
    }
    if (isPlayArea) {
      add('leikkiosasto');
    }

    return labels;
  }

  function floorDetailLabel(floorKey, floorContainer) {
    const labels = floorFeatureLabels(floorContainer);
    return [floorText(floorKey), ...labels].filter(Boolean).join(', ');
  }

  function getFloorContainerByWagonId(wagonId, floorKey) {
    const wagonEl = wagonId ? document.getElementById(wagonId) : null;
    return wagonEl ? getFloorContainer(wagonEl, floorKey) : null;
  }

  function updateFloorSelectLabels(wagonEl) {
    const floorSel = document.getElementById('vr-acc-floor');
    if (!floorSel || !wagonEl) return;
    ['upper', 'lower'].forEach(key => {
      const option = floorSel.querySelector(`option[value="${key}"]`);
      if (!option) return;
      const floorContainer = getFloorContainer(wagonEl, key);
      option.textContent = floorDetailLabel(key, floorContainer);
      option.disabled = !floorContainer;
    });
  }

  function seatNum(seatId) {
    return (seatId || '').replace('seat_', '');
  }

  function getSeatNumber(gEl) {
    const place = gEl.getAttribute('data-place') || '';
    const placeNumber = place.match(/(?:^|\s)number:([^\s]+)/i);
    return placeNumber ? placeNumber[1] : seatNum(gEl.id);
  }

  function getFloorKeyFromContainer(floorContainer) {
    if (!floorContainer) return '';
    const dataFloor = (floorContainer.getAttribute('data-floor') || '').toLowerCase();
    if (['up', 'upper', '2'].includes(dataFloor)) return 'upper';
    if (['down', 'lower', '1'].includes(dataFloor)) return 'lower';

    const coachDiv = floorContainer.querySelector('[aria-label]');
    const label = coachDiv?.getAttribute('aria-label') || '';
    if (includesAny(label, ['yläkerta', 'upper'])) return 'upper';
    if (includesAny(label, ['alakerta', 'lower'])) return 'lower';
    return '';
  }

  function getSeatKey(gEl) {
    const explicitPlace = (gEl.getAttribute('data-place') || '').trim();
    if (explicitPlace) return explicitPlace;

    const wagonId = gEl.closest('[id^="wagon_"]')?.id || '';
    const floorKey = getFloorKeyFromContainer(gEl.closest('[data-testid="carriage-floor"]'));
    return [wagonId, floorKey, gEl.id].join('|');
  }

  function findSeatElement(seatKey, wagonId = '', floorKey = '', seatId = '') {
    const wagonEl = wagonId ? document.getElementById(wagonId) : null;
    const floorContainer = wagonEl && floorKey ? getFloorContainer(wagonEl, floorKey) : null;
    const scope = floorContainer || wagonEl || findOpenSeatModal() || document;
    const places = [...scope.querySelectorAll('g[data-place], g[id^="seat_"]')];
    return places.find(place => getSeatKey(place) === seatKey) ||
      (seatId ? places.find(place => place.id === seatId) : null) ||
      null;
  }

  function getWagons() {
    const wagons = [...document.querySelectorAll('[id^="wagon_"]')];
    return wagons.sort((a, b) => {
      const na = parseInt(a.id.replace('wagon_', ''), 10);
      const nb = parseInt(b.id.replace('wagon_', ''), 10);
      return nb - na;
    });
  }

  function getFloorContainer(wagonEl, floorKey) {
    const floors = [...wagonEl.querySelectorAll('[data-testid="carriage-floor"]')];
    const structuredFloor = floors.find(floor =>
      getFloorKeyFromContainer(floor) === floorKey
    );
    if (structuredFloor) return structuredFloor;

    // Preserve the historical DOM-order fallback only when VR exposes no floor metadata.
    if (floors.some(getFloorKeyFromContainer)) return null;
    if (floors.length === 1 && floorKey === 'upper') return floors[0];
    if (floorKey === 'upper' && floors[0]) return floors[0];
    if (floorKey === 'lower' && floors[1]) return floors[1];
    return null;
  }

  function getPreferredFloorKey(wagonEl) {
    const floors = [...wagonEl.querySelectorAll('[data-testid="carriage-floor"]')];
    const visible = floors.find(floor => floor.getAttribute('data-visible') === 'true');
    if (visible) return getFloorKeyFromContainer(visible) || 'upper';

    for (const floor of floors) {
      const key = getFloorKeyFromContainer(floor);
      if (key && getWagonPlaceElements(floor).length) return key;
    }
    return getFloorKeyFromContainer(floors[0]) || 'upper';
  }

  function getSeats(floorContainer) {
    const seats = [...floorContainer.querySelectorAll('g[id^="seat_"]')];
    return seats.sort((a, b) => parseInt(seatNum(a.id), 10) - parseInt(seatNum(b.id), 10));
  }

  function floorHasSeats(wagonEl, floorKey) {
    const fc = getFloorContainer(wagonEl, floorKey);
    if (!fc) return false;
    return getWagonPlaceElements(fc).length > 0;
  }

  function floorText(floorKey) {
    if (floorKey === 'upper') return 'yläkerta';
    if (floorKey === 'lower') return 'alakerta';
    return '';
  }

  function buildPanel(dialog) {
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(TOGGLE_ID)?.remove();

    if (!document.getElementById('vr-acc-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'vr-acc-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    const wagons = getWagons();
    if (!wagons.length) return;

    let defaultWagonId = wagons[0].id;
    let defaultFloor = 'upper';
    outer: for (const w of wagons) {
      if (isServiceWagon(w)) continue;
      for (const f of ['upper', 'lower']) {
        if (floorHasSeats(w, f)) {
          defaultWagonId = w.id;
          defaultFloor = f;
          break outer;
        }
      }
    }

    const savedStyle = getSavedStyle();
    const toggle = document.createElement('div');
    toggle.id = TOGGLE_ID;
    toggle.innerHTML = `
      <fieldset>
        <legend>Paikkakartan tyyli:</legend>
        <label>
          <input type="radio" name="vr-acc-style" value="kuva"${savedStyle === 'kuva' ? ' checked' : ''}>
          Kuva
        </label>
        <label>
          <input type="radio" name="vr-acc-style" value="teksti"${savedStyle !== 'kuva' ? ' checked' : ''}>
          Teksti
        </label>
      </fieldset>
    `;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Saavutettava paikkavalinta');
    panel.setAttribute('tabindex', '-1');
    panel.hidden = savedStyle === 'kuva';

    panel.innerHTML = `
      <h2>Saavutettava paikkavalinta</h2>
      <div class="vr-acc-controls">
        <label for="vr-acc-wagon">Vaunu:</label>
        <select id="vr-acc-wagon">
          ${wagons.map(w => {
            const svc = isServiceWagon(w);
            const lbl = svc ? wagonLabel(w.id) + ' (palveluvaunu)' : wagonLabel(w.id);
            return `<option value="${w.id}"${w.id === defaultWagonId ? ' selected' : ''}${svc ? ' disabled' : ''}>${lbl}</option>`;
          }).join('\n')}
        </select>

        <label for="vr-acc-floor">Kerros:</label>
        <select id="vr-acc-floor">
          <option value="upper"${defaultFloor === 'upper' ? ' selected' : ''}>Yläkerta</option>
          <option value="lower"${defaultFloor === 'lower' ? ' selected' : ''}>Alakerta</option>
        </select>

        <label for="vr-acc-seat-type">Suodatin:</label>
        <select id="vr-acc-seat-type">
          <option value="all" selected>Kaikki</option>
          <option value="window">Ikkuna</option>
          <option value="aisle">Käytävä</option>
          <option value="middle">Keski</option>
          <option value="normal-price">Normaalihintainen</option>
          <option value="higher-price">Kalliimpi hinta</option>
          <option value="ekstra">Ekstra</option>
          <option value="table">Pöytä</option>
          <option value="forward">Menosuuntaan</option>
          <option value="opposite">Vastakkainen paikka</option>
        </select>
      </div>

      <div id="${SUMMARY_ID}" aria-live="polite" aria-atomic="true"></div>
      <div id="vr-acc-seat-area"></div>

      <div id="${STATUS_ID}" aria-live="polite" aria-atomic="true"></div>

      <div class="vr-acc-legend" aria-hidden="true">
        <div class="vr-acc-legend-item">
          <span class="vr-acc-legend-box" style="background:#fff;border:2px solid #1b50af;"></span>
          <span>Vapaa paikka</span>
        </div>
        <div class="vr-acc-legend-item">
          <span class="vr-acc-legend-box" style="background:#1b50af;"></span>
          <span>Valittu paikka</span>
        </div>
        <div class="vr-acc-legend-item">
          <span class="vr-acc-legend-box" style="background:#f2f2f2;border:2px solid #d8d8d8;"></span>
          <span>Varattu / ei valittavissa</span>
        </div>
        <div class="vr-acc-legend-item">
          <span class="vr-acc-legend-box" style="background:#d5eefa;border:2px solid #d5eefa;"></span>
          <span>Kalliimpi hinta</span>
        </div>
      </div>
    `;

    const wagonMap = dialog.querySelector('.WagonMapContainer-module__HgHuFq__container, [data-testid="wagonmap-coachmap"]');
    const parent = wagonMap ? wagonMap.parentElement : null;
    if (parent) {
      parent.insertBefore(toggle, parent.firstChild);
      parent.insertBefore(panel, toggle.nextSibling);
    } else {
      const header = dialog.querySelector('.FullScreenModal-module__Y89mtq__header');
      if (header) {
        header.after(toggle);
        toggle.after(panel);
      } else {
        dialog.prepend(panel);
        dialog.prepend(toggle);
      }
    }

    toggle.querySelectorAll('input[name="vr-acc-style"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const selected = toggle.querySelector('input[name="vr-acc-style"]:checked');
        const isTeksti = selected && selected.value === 'teksti';
        if (selected) saveStyle(selected.value);
        panel.hidden = !isTeksti;

        if (isTeksti) {
          const wagonSel = panel.querySelector('#vr-acc-wagon');
          const floorSel = panel.querySelector('#vr-acc-floor');
          const seatTypeSel = panel.querySelector('#vr-acc-seat-type');
          if (wagonSel && floorSel && seatTypeSel) {
            renderSeats(wagonSel.value, floorSel.value, seatTypeSel.value);
          }
        }
      });
    });

    const wagonSel = panel.querySelector('#vr-acc-wagon');
    const floorSel = panel.querySelector('#vr-acc-floor');
    const seatTypeSel = panel.querySelector('#vr-acc-seat-type');
    const refresh = () => renderSeats(wagonSel.value, floorSel.value, seatTypeSel.value);
    wagonSel.addEventListener('change', refresh);
    floorSel.addEventListener('change', refresh);
    seatTypeSel.addEventListener('change', refresh);

    renderSeats(wagonSel.value, floorSel.value, seatTypeSel.value);
  }

  function buildSeatPositionMap(floorContainer) {
    const map = {};
    const seats = [...floorContainer.querySelectorAll('g[id^="seat_"]')];
    if (!seats.length) return map;

    const yValues = seats.map(g => {
      const r = g.getBoundingClientRect();
      return Math.round(r.y / 4) * 4;
    });

    const uniqueY = [...new Set(yValues)].sort((a, b) => a - b);
    if (uniqueY.length < 2) return map;

    const windowY = new Set([uniqueY[0], uniqueY[uniqueY.length - 1]]);
    seats.forEach((g, i) => {
      map[getSeatKey(g)] = windowY.has(yValues[i]) ? 'ikkuna' : 'käytävä';
    });
    return map;
  }

  function getSeatPosition(gEl, fallbackMap = {}) {
    const position = (gEl.getAttribute('data-position') || '').toUpperCase();
    if (position === 'WINDOW') return 'ikkuna';
    if (position === 'AISLE') return 'käytävä';
    if (position === 'MIDDLE') return 'keskipaikka';
    return fallbackMap[getSeatKey(gEl)] || '';
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function searchableText(value) {
    return normalizeText(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Ã¤/g, 'a')
      .replace(/Ã¶/g, 'o')
      .replace(/Ã¥/g, 'a')
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/å/g, 'a');
  }

  function includesAny(source, terms) {
    const haystack = searchableText(source);
    return terms.some(term => haystack.includes(searchableText(term)));
  }

  function includesWholeSearchTerm(source, term) {
    const haystack = searchableText(source);
    const needle = searchableText(term);
    if (!needle) return false;

    let index = haystack.indexOf(needle);
    while (index >= 0) {
      const before = index > 0 ? haystack[index - 1] : '';
      const after = haystack[index + needle.length] || '';
      if (
        (!before || !/[a-z0-9]/.test(before)) &&
        (!after || !/[a-z0-9]/.test(after))
      ) {
        return true;
      }
      index = haystack.indexOf(needle, index + needle.length);
    }
    return false;
  }

  function collectSeatText(gEl) {
    const texts = [];
    const add = value => {
      const text = normalizeText(value);
      if (text) texts.push(text);
    };
    const addAttributes = el => {
      [
        'aria-label',
        'aria-description',
        'title',
        'class',
        'href',
        'xlink:href',
        'data-testid',
        'data-tooltip',
        'data-tip',
        'data-icon',
        'data-name',
        'aria-labelledby'
      ].forEach(name => add(el.getAttribute(name)));
    };

    addAttributes(gEl);
    add(gEl.outerHTML);

    const addReferencedText = value => {
      if (!value) return;
      value.split(/\s+/).forEach(id => {
        const el = document.getElementById(id);
        if (el) add(el.textContent);
      });
    };

    addReferencedText(gEl.getAttribute('aria-describedby'));
    addReferencedText(gEl.getAttribute('aria-labelledby'));

    gEl.querySelectorAll('title, desc, [aria-label], [aria-description], [title], [href], [xlink\\:href], [data-testid], [data-tooltip], [data-tip], [data-icon], [data-name], [aria-labelledby]').forEach(el => {
      addAttributes(el);
      if (el.tagName === 'title' || el.tagName === 'desc') {
        add(el.textContent);
      }
    });

    return texts.join(', ');
  }

  function getSeatFeatures(gEl, status, isEkstra, contextText = '') {
    const source = collectSeatText(gEl) + ', ' + contextText;
    const productType = getSeatProductType(gEl);
    const services = getSeatServiceTokens(gEl);
    const attributeCode = (
      gEl.getAttribute('data-attribute-code') || ''
    ).toUpperCase();
    const features = [];
    const add = label => {
      if (!features.includes(label)) features.push(label);
    };

    if (
      services.has('OPPOSITE') ||
      OPPOSITE_ATTRIBUTE_CODES.has(attributeCode) ||
      includesAny(source, ['vastakkainen', 'vastakkain', 'vastapaata', 'opposite', 'rear facing', 'rear-facing', 'backward'])
    ) {
      add(FEATURE_LABELS.opposite);
    }
    if (includesAny(source, ['menosuuntaan', 'menosuunta', 'forward', 'front facing', 'front-facing'])) add(FEATURE_LABELS.forward);
    if (includesAny(source, ['pyörätuoli', 'pyoratuoli', 'wheelchair'])) add(FEATURE_LABELS.wheelchair);
    if (includesAny(source, ['esteetön', 'esteeton', 'accessible', 'accessibility'])) add(FEATURE_LABELS.accessible);
    // VR currently has no table-seat service or attribute code. Only use a
    // direct table marker if one is present; an opposite-facing seat alone is
    // not enough evidence that the seat has a table.
    if (
      ['pöytä', 'poyta', 'pöytäpaikka', 'poytapaikka', 'table']
        .some(term => includesWholeSearchTerm(source, term))
    ) {
      add(FEATURE_LABELS.table);
    }
    if (includesAny(source, ['hiljainen', 'quiet', 'silent'])) add(FEATURE_LABELS.quiet);
    if (includesAny(source, ['perhe', 'family'])) add(FEATURE_LABELS.family);

    if (services.has('EKSTRA-PLUS') || productType.startsWith('EXTRA_PLUS_')) {
      add(FEATURE_LABELS.ekstraPlus);
    } else if (services.has('EKSTRA-RELAXED')) {
      add(FEATURE_LABELS.ekstraRento);
    } else if (services.has('EKSTRA-CALM')) {
      add(FEATURE_LABELS.ekstraRauhallinen);
    } else if (
      services.has('EKSTRA') ||
      productType === 'EXTRA_CLASS_SEAT' ||
      productType === 'SINGLE_EXTRA_CLASS_SEAT'
    ) {
      add(FEATURE_LABELS.ekstra);
    }

    if (
      includesAny(source, ['kalliimpi', 'lisämaksu', 'lisamaksu', 'surcharge', 'premium']) ||
      status === 'higher-price'
    ) {
      add(FEATURE_LABELS.higherPrice);
    }
    if (
      isEkstra &&
      !features.some(feature => feature.startsWith('Ekstra'))
    ) {
      add(FEATURE_LABELS.ekstra);
    }

    return features;
  }

  function getSeatItems(floorContainer) {
    const posMap = buildSeatPositionMap(floorContainer);
    const floorFeatures = floorFeatureLabels(floorContainer);
    return getSeats(floorContainer).map(gEl => {
      const status = getSeatStatus(gEl);
      const key = getSeatKey(gEl);
      const num = getSeatNumber(gEl);
      const pos = getSeatPosition(gEl, posMap);
      const features = getSeatFeatures(gEl, status, false);
      return {
        gEl,
        key,
        status,
        num,
        pos,
        features,
        floorFeatures,
        productType: getSeatProductType(gEl),
        services: [...getSeatServiceTokens(gEl)]
      };
    });
  }

  function isSelectableSeat(item) {
    return item.status === 'available' || item.status === 'higher-price' || item.status === 'selected';
  }

  function hasEkstraFloorFeature(item) {
    return item.features.some(feature => feature.startsWith('Ekstra')) ||
      item.floorFeatures.some(feature => feature.startsWith('Ekstra'));
  }

  function seatMatchesFilter(item, seatType) {
    if (!isSelectableSeat(item)) return false;
    if (seatType === 'window') return includesAny(item.pos, ['ikkuna']);
    if (seatType === 'aisle') return includesAny(item.pos, ['käytävä', 'kaytava']);
    if (seatType === 'middle') return includesAny(item.pos, ['keskipaikka']);
    if (seatType === 'normal-price') return item.status !== 'higher-price' && !item.features.includes(FEATURE_LABELS.higherPrice);
    if (seatType === 'higher-price') return item.status === 'higher-price' || item.features.includes(FEATURE_LABELS.higherPrice);
    if (seatType === 'ekstra') return hasEkstraFloorFeature(item);
    if (seatType === 'table') return item.features.includes(FEATURE_LABELS.table);
    if (seatType === 'forward') return item.features.includes(FEATURE_LABELS.forward);
    if (seatType === 'opposite') return item.features.includes(FEATURE_LABELS.opposite);
    return true;
  }

  function passengerIndexFromLabel(labelEl) {
    const match = normalizeText(labelEl?.textContent).match(/^Matkustaja\s+(\d+)\s*:/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  function getPassengerCard(labelEl, bookedPlaces) {
    let candidate = labelEl?.parentElement || null;
    let fallback = candidate;

    while (candidate && candidate !== bookedPlaces) {
      const passengerLabels = [...candidate.querySelectorAll('strong')]
        .filter(label => passengerIndexFromLabel(label) > 0);
      if (passengerLabels.length > 1) break;
      if (passengerLabels.length === 1) {
        fallback = candidate;
        if (
          candidate.querySelector('[data-testid="passenger-seat-info"]') &&
          /Paikka\s*\d+/i.test(normalizeText(candidate.textContent))
        ) {
          return candidate;
        }
      }
      candidate = candidate.parentElement;
    }
    return fallback;
  }

  function getPassengerAssignments() {
    const seatDialog = findOpenSeatModal();
    const bookedPlaces = seatDialog?.querySelector('#booked-places') ||
      document.querySelector('#booked-places');
    if (!bookedPlaces) return [];

    const labels = [...bookedPlaces.querySelectorAll('strong')]
      .filter(label => passengerIndexFromLabel(label) > 0);

    return labels.map(label => {
      const index = passengerIndexFromLabel(label);
      const card = getPassengerCard(label, bookedPlaces);
      const text = normalizeText(card?.textContent);
      const coachMatch = text.match(/Vaunu\s*:?\s*(\d+)/i);
      const seatMatch = text.match(/Paikka\s*:?\s*(\d+)/i);
      const coachNumber = coachMatch ? coachMatch[1] : '';
      const seatNumber = seatMatch ? seatMatch[1] : '';
      const floorKey = includesAny(text, ['yläkerta', 'upper'])
        ? 'upper'
        : includesAny(text, ['alakerta', 'lower'])
          ? 'lower'
          : '';
      const floorNumber = floorKey === 'upper' ? '2' : floorKey === 'lower' ? '1' : '';
      const seatKey = coachNumber && floorNumber && seatNumber
        ? `coach:${coachNumber} floor:${floorNumber} number:${seatNumber}`
        : '';
      const seatClass = normalizeText(
        card?.querySelector('[data-testid="passenger-seat-info"]')?.textContent
      );
      const positionText = includesAny(text, ['ikkuna', 'window'])
        ? 'ikkuna'
        : includesAny(text, ['käytävä', 'kaytava', 'aisle'])
          ? 'käytävä'
          : includesAny(text, ['keskipaikka', 'middle'])
            ? 'keskipaikka'
            : '';

      return {
        index,
        seatClass,
        coachNumber,
        wagonId: coachNumber ? `wagon_${coachNumber}` : '',
        floorKey,
        seatNumber,
        seatKey,
        positionText
      };
    }).sort((a, b) => a.index - b.index);
  }

  function passengerAssignmentSignature(assignments = getPassengerAssignments()) {
    return assignments
      .map(assignment =>
        [assignment.index, assignment.seatKey, assignment.seatClass].join(':')
      )
      .join('|');
  }

  function assignmentDetails(assignment) {
    const gEl = assignment.seatKey
      ? findSeatElement(
          assignment.seatKey,
          assignment.wagonId,
          assignment.floorKey
        )
      : null;
    const floorContainer = gEl?.closest('[data-testid="carriage-floor"]') ||
      getFloorContainerByWagonId(assignment.wagonId, assignment.floorKey);
    const positionMap = gEl && floorContainer && !gEl.getAttribute('data-position')
      ? buildSeatPositionMap(floorContainer)
      : {};
    const item = gEl
      ? {
          num: getSeatNumber(gEl),
          pos: getSeatPosition(gEl, positionMap),
          features: getSeatFeatures(gEl, getSeatStatus(gEl), false)
        }
      : null;
    const extraFeatures = item ? [...item.features] : [];

    if (
      assignment.seatClass &&
      !includesAny(assignment.seatClass, ['eko-luokka', 'eco']) &&
      !extraFeatures.some(feature => includesAny(assignment.seatClass, [feature]))
    ) {
      extraFeatures.unshift(assignment.seatClass);
    }

    return {
      passengerIndex: assignment.index,
      wagonText: assignment.wagonId ? wagonDetailLabel(assignment.wagonId) : '',
      floorText: assignment.floorKey
        ? floorDetailLabel(assignment.floorKey, floorContainer)
        : '',
      seatText: assignment.seatNumber || item?.num || '',
      positionText: item?.pos || assignment.positionText,
      extraFeatures
    };
  }

  function summarizeSeats(items, wagonId, floorKey) {
    const selectable = items.filter(isSelectableSeat);
    const available = selectable.filter(item => item.status === 'available' || item.status === 'higher-price');
    const windows = available.filter(item => includesAny(item.pos, ['ikkuna'])).length;
    const aisles = available.filter(item => includesAny(item.pos, ['käytävä', 'kaytava'])).length;
    const higher = available.filter(item => item.status === 'higher-price' || item.features.includes(FEATURE_LABELS.higherPrice)).length;
    const assignments = getPassengerAssignments();
    const assignmentsOnFloor = assignments.filter(assignment =>
      assignment.wagonId === wagonId && assignment.floorKey === floorKey
    );
    const selected = assignments.length
      ? null
      : selectable.find(item => item.status === 'selected');
    const parts = [
      wagonDetailLabel(wagonId),
      floorDetailLabel(floorKey, getFloorContainerByWagonId(wagonId, floorKey)),
      `${available.length} vapaata paikkaa`,
      `${windows} ikkunapaikkaa`,
      `${aisles} käytäväpaikkaa`
    ];
    if (higher) parts.push(`${higher} kalliimpaa paikkaa`);
    if (assignmentsOnFloor.length === 1) {
      parts.push(`valittu paikka ${assignmentsOnFloor[0].seatNumber}`);
    } else if (assignmentsOnFloor.length > 1) {
      parts.push(`valitut paikat ${assignmentsOnFloor.map(item => item.seatNumber).join(' ja ')}`);
    } else if (selected) {
      parts.push(`valittu paikka ${selected.num}`);
    }
    return parts.filter(Boolean).join(', ') + '.';
  }

  function selectedSeatDetails(wagonId, floorKey, item) {
    if (!item) return null;
    return {
      wagonText: wagonId ? wagonDetailLabel(wagonId) : '',
      floorText: floorDetailLabel(floorKey, getFloorContainerByWagonId(wagonId, floorKey)),
      seatText: item.num,
      positionText: item.pos,
      extraFeatures: item.features
    };
  }

  function findFirstMatchingLocation(seatType) {
    for (const wagon of getWagons()) {
      if (isServiceWagon(wagon)) continue;
      for (const floorKey of ['upper', 'lower']) {
        const floorContainer = getFloorContainer(wagon, floorKey);
        if (!floorContainer) continue;
        const item = getSeatItems(floorContainer).find(seat => seatMatchesFilter(seat, seatType));
        if (item) {
          return {
            wagonId: wagon.id,
            floorKey,
            seatKey: item.key,
            seatId: item.gEl.id
          };
        }
      }
    }
    return null;
  }

  function getSeatCenter(gEl) {
    const rect = gEl?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function numericSeatValue(value) {
    const number = Number.parseFloat(String(value || ''));
    return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
  }

  function wagonNumberValue(wagonId) {
    const match = String(wagonId || '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  }

  function compareCandidateScores(a, b) {
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      const difference = (a[index] || 0) - (b[index] || 0);
      if (difference) return difference;
    }
    return 0;
  }

  function closestSeatScore(reference, referenceEl, candidate, wagonId, floorKey) {
    const sameWagon = reference.wagonId === wagonId;
    const sameFloor = sameWagon && reference.floorKey === floorKey;
    const referenceNumber = numericSeatValue(reference.seatNumber);
    const candidateNumber = numericSeatValue(candidate.num);
    const numberDistance = Math.abs(referenceNumber - candidateNumber);

    if (sameFloor) {
      const referenceCenter = getSeatCenter(referenceEl);
      const candidateCenter = getSeatCenter(candidate.gEl);
      if (referenceCenter && candidateCenter) {
        const xDistance = referenceCenter.x - candidateCenter.x;
        const yDistance = referenceCenter.y - candidateCenter.y;
        return [
          0,
          0,
          Math.hypot(xDistance, yDistance),
          numberDistance,
          candidateNumber
        ];
      }
      return [0, 1, numberDistance, candidateNumber];
    }

    if (sameWagon) {
      return [1, numberDistance, candidateNumber];
    }

    return [
      2,
      Math.abs(
        wagonNumberValue(reference.wagonId) - wagonNumberValue(wagonId)
      ),
      numberDistance,
      candidateNumber
    ];
  }

  function findClosestAvailableSeat(
    reference,
    seatType = 'all',
    assignments = getPassengerAssignments()
  ) {
    if (!reference?.seatKey) return null;

    const occupiedSeatKeys = new Set(
      assignments.map(assignment => assignment.seatKey).filter(Boolean)
    );
    const referenceEl = findSeatElement(
      reference.seatKey,
      reference.wagonId,
      reference.floorKey
    );
    const candidates = [];

    for (const wagon of getWagons()) {
      if (isServiceWagon(wagon)) continue;
      for (const floorKey of ['upper', 'lower']) {
        const floorContainer = getFloorContainer(wagon, floorKey);
        if (!floorContainer) continue;

        getSeatItems(floorContainer).forEach(item => {
          if (item.status !== 'available' && item.status !== 'higher-price') return;
          if (occupiedSeatKeys.has(item.key)) return;
          if (!seatMatchesFilter(item, seatType)) return;

          candidates.push({
            wagonId: wagon.id,
            floorKey,
            seatKey: item.key,
            seatId: item.gEl.id,
            seatNumber: item.num,
            position: item.pos,
            score: closestSeatScore(
              reference,
              referenceEl,
              item,
              wagon.id,
              floorKey
            )
          });
        });
      }
    }

    candidates.sort((a, b) =>
      compareCandidateScores(a.score, b.score) ||
      String(a.seatKey).localeCompare(String(b.seatKey))
    );
    return candidates[0] || null;
  }

  function closestSeatSuggestionMessage(candidate) {
    if (!candidate) return '';
    const parts = [
      wagonDetailLabel(candidate.wagonId),
      floorDetailLabel(
        candidate.floorKey,
        getFloorContainerByWagonId(candidate.wagonId, candidate.floorKey)
      ),
      candidate.seatNumber ? `paikka ${candidate.seatNumber}` : '',
      candidate.position
    ].filter(Boolean);
    return `Seuraavaksi ehdotetaan lähintä vapaata paikkaa: ${parts.join(', ')}.`;
  }

  function updateConfirmButtonFromSelectedSeat() {
    const assignments = getPassengerAssignments();
    if (assignments.length) {
      if (assignments.length === 1 && assignments[0].seatKey) {
        lastSelectedSeatKey = assignments[0].seatKey;
      }
      const details = assignments.map(assignmentDetails);
      updateConfirmButtonLabel(details.length === 1 ? details[0] : details);
      return true;
    }

    for (const wagon of getWagons()) {
      if (isServiceWagon(wagon)) continue;
      for (const key of ['upper', 'lower']) {
        const floorContainer = getFloorContainer(wagon, key);
        if (!floorContainer) continue;
        const selected = getSeatItems(floorContainer).find(item => item.status === 'selected');
        if (selected) {
          lastSelectedSeatKey = selected.key;
          updateConfirmButtonLabel(selectedSeatDetails(wagon.id, key, selected));
          return true;
        }
      }
    }
    updateConfirmButtonLabel(null);
    return false;
  }

  async function renderSeats(
    wagonId,
    floorKey,
    seatType = 'all',
    renderGeneration = ++seatRenderGeneration
  ) {
    const area = document.getElementById('vr-acc-seat-area');
    const summary = document.getElementById(SUMMARY_ID);
    const isCurrentRender = () =>
      renderGeneration === seatRenderGeneration && area?.isConnected;
    if (!area || !isCurrentRender()) return;

    const clearSummary = () => {
      if (summary) summary.textContent = '';
    };

    const wagon = document.getElementById(wagonId);
    if (!wagon) {
      area.innerHTML = '<p class="vr-acc-no-seats">Vaunua ei löydy.</p>';
      clearSummary();
      return;
    }

    if (isServiceWagon(wagon)) {
      area.innerHTML = '<p class="vr-acc-no-seats">Tässä palveluvaunussa ei ole valittavia istumapaikkoja.</p>';
      clearSummary();
      return;
    }

    updateFloorSelectLabels(wagon);

    if (!isWagonContentLoaded(wagon)) {
      area.innerHTML = '<p class="vr-acc-no-seats">Ladataan vaunun tietoja…</p>';
      await ensureWagonLoaded(wagon);
      if (!isCurrentRender()) return;
      updateFloorSelectLabels(wagon);
    }

    if (isServiceWagon(wagon)) {
      area.innerHTML = '<p class="vr-acc-no-seats">Tässä palveluvaunussa ei ole valittavia istumapaikkoja.</p>';
      clearSummary();
      return;
    }

    let activeFloorKey = floorKey;
    let floorContainer = getFloorContainer(wagon, activeFloorKey);
    if (!floorContainer || getWagonPlaceElements(floorContainer).length === 0) {
      const preferredFloorKey = getPreferredFloorKey(wagon);
      const preferredFloor = getFloorContainer(wagon, preferredFloorKey);
      if (
        preferredFloor &&
        (getWagonPlaceElements(preferredFloor).length > 0 || !floorContainer)
      ) {
        activeFloorKey = preferredFloorKey;
        floorContainer = preferredFloor;
        const floorSel = document.getElementById('vr-acc-floor');
        if (floorSel) floorSel.value = activeFloorKey;
      }
    }

    if (!floorContainer) {
      area.innerHTML = '<p class="vr-acc-no-seats">Tätä kerrosta ei ole tässä vaunussa tai se on palveluvaunu.</p>';
      clearSummary();
      return;
    }

    const items = getSeatItems(floorContainer);
    if (!items.length) {
      area.innerHTML = '<p class="vr-acc-no-seats">Ei paikkoja tässä kerroksessa.</p>';
      clearSummary();
      return;
    }

    if (summary) summary.textContent = summarizeSeats(items, wagonId, activeFloorKey);

    let optionsHtml = '';
    let selectedSeatKey = '';
    let firstAvailableSeatKey = '';

    items.forEach(item => {
      if (!seatMatchesFilter(item, seatType)) return;

      const optionParts = [item.num];
      if (item.pos) optionParts.push(item.pos);
      item.features.forEach(feature => optionParts.push(feature));
      if (item.status === 'selected') optionParts.push('valittu');
      const optionLabel = optionParts.join(', ');

      if (item.status === 'selected') selectedSeatKey = item.key;
      if (!firstAvailableSeatKey && (item.status === 'available' || item.status === 'higher-price')) {
        firstAvailableSeatKey = item.key;
      }

      optionsHtml += `
        <option value="${escapeHTML(item.key)}"
                data-seat-key="${escapeHTML(item.key)}"
                data-seat-id="${item.gEl.id}"
                data-wagon-id="${wagonId}"
                data-floor-key="${activeFloorKey}"
                data-seat-position="${escapeHTML(item.pos)}"
                data-seat-features="${escapeHTML(item.features.join('|'))}">
          ${escapeHTML(optionLabel)}
        </option>`;
    });

    if (!optionsHtml) {
      const fallback = findFirstMatchingLocation(seatType);
      if (fallback && (fallback.wagonId !== wagonId || fallback.floorKey !== activeFloorKey)) {
        const wagonSel = document.getElementById('vr-acc-wagon');
        const floorSel = document.getElementById('vr-acc-floor');
        if (wagonSel && floorSel) {
          wagonSel.value = fallback.wagonId;
          floorSel.value = fallback.floorKey;
          area.innerHTML = '<p class="vr-acc-no-seats">Valitussa kerroksessa ei ole suodatinta vastaavia paikkoja. Siirrytään ensimmäiseen sopivaan vaunuun ja kerrokseen.</p>';
          await renderSeats(
            fallback.wagonId,
            fallback.floorKey,
            seatType,
            renderGeneration
          );
          if (!isCurrentRender()) return;
          const combo = document.getElementById('vr-acc-seat-combo');
          if (combo) combo.value = fallback.seatKey;
          return;
        }
      }
      area.innerHTML = '<p class="vr-acc-no-seats">Ei vapaita paikkoja valitulla suodattimella tässä kerroksessa.</p>';
      return;
    }

    area.innerHTML = `
      <div class="vr-acc-seat-picker">
        <div style="flex:1 1 auto;">
          <label for="vr-acc-seat-combo">Paikka:</label>
          <select class="vr-acc-seat-combo" id="vr-acc-seat-combo">
            ${optionsHtml}
          </select>
        </div>
        <button type="button" class="vr-acc-select-seat-btn vr-acc-secondary-btn" id="vr-acc-next-seat-btn">Seuraava vapaa</button>
        <button type="button" class="vr-acc-select-seat-btn" id="vr-acc-select-seat-btn">Valitse</button>
      </div>
    `;

    const combo = area.querySelector('#vr-acc-seat-combo');
    const selectBtn = area.querySelector('#vr-acc-select-seat-btn');
    const nextBtn = area.querySelector('#vr-acc-next-seat-btn');
    if (!combo || !selectBtn || !nextBtn) return;

    if (
      lastSelectedSeatKey &&
      [...combo.options].some(option => option.value === lastSelectedSeatKey)
    ) {
      combo.value = lastSelectedSeatKey;
    } else if (
      selectedSeatKey &&
      [...combo.options].some(option => option.value === selectedSeatKey)
    ) {
      combo.value = selectedSeatKey;
    } else if (firstAvailableSeatKey) {
      combo.value = firstAvailableSeatKey;
    }

    const activateSelection = () => {
      const selectedOption = combo.selectedOptions[0];
      if (!selectedOption) return;
      handleSeatSelectFromOption(selectedOption);
    };

    selectBtn.addEventListener('click', activateSelection);
    nextBtn.addEventListener('click', () => {
      const options = [...combo.options].filter(option => !option.textContent.includes('valittu'));
      if (!options.length) return;
      const currentIndex = options.findIndex(option => option.value === combo.value);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % options.length : 0;
      combo.value = options[nextIndex].value;
      combo.focus();
    });
    combo.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        activateSelection();
      }
    });
  }

  function handleSeatSelectFromOption(optionEl) {
    const pseudoBtn = {
      dataset: {
        seatKey: optionEl.dataset.seatKey,
        seatId: optionEl.dataset.seatId,
        wagonId: optionEl.dataset.wagonId,
        floorKey: optionEl.dataset.floorKey
      },
      getAttribute(name) {
        if (name === 'aria-label') {
          return (optionEl.textContent || '').trim();
        }
        return null;
      },
      setAttribute() {}
    };
    handleSeatSelect(pseudoBtn, []);
  }

  function updateConfirmButtonLabel(details) {
    const confirmBtn = findOpenSeatModal()?.querySelector(
      'button[data-testid="primary-modal-button"]'
    );
    if (!confirmBtn) return;

    let label = 'Vahvista paikkavalinta';

    const detailList = Array.isArray(details)
      ? details.filter(Boolean)
      : details
        ? [details]
        : [];

    if (detailList.length === 1) {
      const detail = detailList[0];
      const parts = [];
      if (detail.wagonText) parts.push(detail.wagonText);
      if (detail.floorText) parts.push(detail.floorText);
      if (detail.seatText) parts.push('paikka ' + detail.seatText);
      if (detail.positionText) parts.push(detail.positionText);
      (detail.extraFeatures || []).forEach(feature => parts.push(feature));
      label += ', ' + parts.join(', ');
    } else if (detailList.length > 1) {
      const passengerParts = detailList.map((detail, index) => {
        const parts = [
          `matkustaja ${detail.passengerIndex || index + 1}`
        ];
        if (detail.wagonText) parts.push(detail.wagonText);
        if (detail.floorText) parts.push(detail.floorText);
        if (detail.seatText) parts.push('paikka ' + detail.seatText);
        if (detail.positionText) parts.push(detail.positionText);
        (detail.extraFeatures || []).forEach(feature => parts.push(feature));
        return parts.join(', ');
      });
      label += ', ' + passengerParts.join('; ');
    }

    confirmBtn.setAttribute('aria-label', label);
  }

  function findPassengerChoiceDialog() {
    return [...document.querySelectorAll('dialog[aria-label="Uusi paikka"]')]
      .find(dialog =>
        dialog.hasAttribute('open') &&
        dialog.getAttribute('aria-hidden') !== 'true'
      ) || null;
  }

  function passengerChoiceIndex(button) {
    const source = [
      button.textContent,
      button.getAttribute('aria-label'),
      button.getAttribute('data-testid'),
      button.getAttribute('name'),
      button.id
    ].filter(Boolean).join(' ');
    const match = searchableText(source).match(
      /(?:matkustaja|passenger|select[-_ ]?passenger)[^\d]*(\d+)/
    );
    return match ? parseInt(match[1], 10) : 0;
  }

  function isNonPassengerChoiceButton(button) {
    const source = [
      button.textContent,
      button.getAttribute('aria-label'),
      button.getAttribute('data-testid'),
      button.getAttribute('name'),
      button.id
    ].filter(Boolean).join(' ');
    return includesAny(source, [
      'siirrä kaikki',
      'kaikki matkustajat',
      'valitse kaikki',
      'move all',
      'peruuta',
      'sulje',
      'takaisin',
      'cancel',
      'close'
    ]);
  }

  function patchPassengerChoiceDialog(
    dialog,
    passengerCount = getPassengerAssignments().length
  ) {
    if (!dialog || passengerCount < 2) return;

    const buttons = [...dialog.querySelectorAll('button, [role="button"]')];
    const indexedButtons = new Map();

    buttons.forEach(button => {
      const index = passengerChoiceIndex(button);
      if (index > 0 && index <= passengerCount && !indexedButtons.has(index)) {
        indexedButtons.set(index, button);
      }
    });

    if (indexedButtons.size < passengerCount) {
      const individualButtons = buttons.filter(button =>
        !isNonPassengerChoiceButton(button)
      );
      if (individualButtons.length === passengerCount) {
        const alreadyIndexed = new Set(indexedButtons.values());
        const unindexedButtons = individualButtons.filter(button =>
          !alreadyIndexed.has(button)
        );
        const missingIndexes = Array.from(
          { length: passengerCount },
          (_, index) => index + 1
        ).filter(index => !indexedButtons.has(index));
        missingIndexes.forEach((index, position) => {
          const button = unindexedButtons[position];
          if (button) indexedButtons.set(index, button);
        });
      }
    }

    indexedButtons.forEach((button, index) => {
      const label = `Valitse paikka ${index}/${passengerCount}`;
      if (button.getAttribute('aria-label') !== label) {
        button.setAttribute('aria-label', label);
      }
    });
  }

  function passengerChoiceStatus(passengerCount) {
    if (passengerCount < 2) {
      return 'Valitse avautuneesta Uusi paikka -ikkunasta, kenen paikka vaihdetaan.';
    }
    const choices = Array.from(
      { length: passengerCount },
      (_, index) => `${index + 1}/${passengerCount}`
    );
    return `Valitse avautuneesta Uusi paikka -ikkunasta paikka ${choices.join(' tai ')}.`;
  }

  function stopPendingSeatSelection() {
    if (!pendingSeatSelection) return;
    pendingSeatSelection.observer?.disconnect();
    clearTimeout(pendingSeatSelection.failureTimer);
    clearTimeout(pendingSeatSelection.settleTimer);
    pendingSeatSelection = null;
  }

  function refreshCurrentSeatView(focusSelectButton = true, preferredSeat = null) {
    const wagonSel = document.getElementById('vr-acc-wagon');
    const floorSel = document.getElementById('vr-acc-floor');
    const seatTypeSel = document.getElementById('vr-acc-seat-type');
    const focusButton = () => {
      if (preferredSeat) {
        const combo = document.getElementById('vr-acc-seat-combo');
        if (
          combo &&
          [...combo.options].some(option => option.value === preferredSeat.seatKey)
        ) {
          combo.value = preferredSeat.seatKey;
        }
      }
      if (focusSelectButton) {
        document.getElementById('vr-acc-select-seat-btn')?.focus();
      }
    };

    if (wagonSel && floorSel && seatTypeSel) {
      if (preferredSeat) {
        wagonSel.value = preferredSeat.wagonId;
        floorSel.value = preferredSeat.floorKey;
      }
      return Promise.resolve(
        renderSeats(wagonSel.value, floorSel.value, seatTypeSel.value)
      ).then(focusButton, focusButton);
    }
    focusButton();
    return Promise.resolve();
  }

  function selectedOptionDetails(wagonId, floorKey, floorContainer, seatNumber) {
    const seatCombo = document.getElementById('vr-acc-seat-combo');
    const selectedOption = seatCombo?.selectedOptions?.[0] || null;
    const optionText = normalizeText(selectedOption?.textContent);
    const positionText =
      selectedOption?.dataset.seatPosition ||
      (includesAny(optionText, ['ikkuna']) ? 'ikkuna' :
      includesAny(optionText, ['käytävä', 'kaytava']) ? 'käytävä' :
      includesAny(optionText, ['keskipaikka']) ? 'keskipaikka' : '');
    const extraFeatures = selectedOption?.dataset.seatFeatures
      ? selectedOption.dataset.seatFeatures.split('|').filter(Boolean)
      : [];

    return {
      wagonText: wagonId ? wagonDetailLabel(wagonId) : '',
      floorText: floorDetailLabel(floorKey, floorContainer),
      seatText: seatNumber,
      positionText,
      extraFeatures
    };
  }

  function changedPassengerAssignments(beforeAssignments, afterAssignments) {
    const beforeByPassenger = new Map(
      beforeAssignments.map(assignment => [assignment.index, assignment.seatKey])
    );
    return afterAssignments.filter(assignment =>
      beforeByPassenger.get(assignment.index) !== assignment.seatKey
    );
  }

  function selectionSuccessMessage(beforeAssignments, afterAssignments, fallbackDetails) {
    const changedAssignments = changedPassengerAssignments(
      beforeAssignments,
      afterAssignments
    );

    if (beforeAssignments.length > 1 && changedAssignments.length) {
      const changes = changedAssignments.map(assignment => {
        const details = assignmentDetails(assignment);
        const parts = [`matkustaja ${assignment.index}`];
        if (details.wagonText) parts.push(details.wagonText);
        if (details.floorText) parts.push(details.floorText);
        if (details.seatText) parts.push(`paikka ${details.seatText}`);
        if (details.positionText) parts.push(details.positionText);
        return parts.join(', ');
      });
      return `Paikat vaihdettiin: ${changes.join('; ')}. Tarkista alareunasta ja vahvista paikkavalinta.`;
    }

    const details = afterAssignments.length === 1
      ? assignmentDetails(afterAssignments[0])
      : fallbackDetails;
    const parts = [];
    if (details?.wagonText) parts.push(details.wagonText);
    if (details?.floorText) parts.push(details.floorText);
    if (details?.seatText) parts.push(`paikka ${details.seatText}`);
    if (details?.positionText) parts.push(details.positionText);
    (details?.extraFeatures || []).forEach(feature => parts.push(feature));
    return `${parts.join(', ')}, valittu. Tarkista alareunasta ja vahvista paikkavalinta.`;
  }

  function finishSeatSelection(pending, result, afterAssignments = []) {
    if (pendingSeatSelection !== pending) return;
    stopPendingSeatSelection();

    const statusEl = document.getElementById(STATUS_ID);
    let preferredSeat = null;
    if (result === 'accepted') {
      lastSelectedSeatKey = pending.seatKey;
      pending.allBtns.forEach(button => button.setAttribute('aria-pressed', 'false'));
      pending.btn.setAttribute('aria-pressed', 'true');

      if (afterAssignments.length) {
        const details = afterAssignments.map(assignmentDetails);
        updateConfirmButtonLabel(details.length === 1 ? details[0] : details);
      } else {
        updateConfirmButtonLabel(pending.fallbackDetails);
      }

      if (statusEl) {
        let message = selectionSuccessMessage(
          pending.beforeAssignments,
          afterAssignments,
          pending.fallbackDetails
        );
        const changedAssignments = changedPassengerAssignments(
          pending.beforeAssignments,
          afterAssignments
        );
        if (
          pending.beforeAssignments.length > 1 &&
          changedAssignments.length === 1
        ) {
          const activeSeatType =
            document.getElementById('vr-acc-seat-type')?.value || 'all';
          preferredSeat = findClosestAvailableSeat(
            changedAssignments[0],
            activeSeatType,
            afterAssignments
          );
          if (preferredSeat) {
            message += ` ${closestSeatSuggestionMessage(preferredSeat)}`;
          }
        }
        statusEl.textContent = message;
      }
    } else if (statusEl) {
      statusEl.textContent = result === 'cancelled'
        ? 'Paikan valinta peruttiin.'
        : `Paikkaa ${pending.seatNumber} ei voitu valita. Se saattaa olla varattu tai ei oikeasti valittavissa.`;
    }

    refreshCurrentSeatView(true, preferredSeat);
  }

  function evaluatePendingSeatSelection(pending) {
    if (pendingSeatSelection !== pending) return;

    const afterAssignments = getPassengerAssignments();
    const afterSignature = passengerAssignmentSignature(afterAssignments);
    if (
      afterAssignments.length &&
      afterSignature !== pending.beforeSignature
    ) {
      finishSeatSelection(pending, 'accepted', afterAssignments);
      return;
    }

    const passengerDialog = findPassengerChoiceDialog();
    if (passengerDialog) {
      patchPassengerChoiceDialog(
        passengerDialog,
        pending.beforeAssignments.length
      );
      if (!pending.passengerDialogSeen) {
        pending.passengerDialogSeen = true;
        clearTimeout(pending.failureTimer);
        const statusEl = document.getElementById(STATUS_ID);
        if (statusEl) {
          statusEl.textContent = passengerChoiceStatus(
            pending.beforeAssignments.length
          );
        }
      }
      clearTimeout(pending.settleTimer);
      pending.settleTimer = null;
      return;
    }

    const currentSeat = findSeatElement(
      pending.seatKey,
      pending.wagonId,
      pending.floorKey,
      pending.seatId
    );
    const targetSelected = currentSeat && getSeatStatus(currentSeat) === 'selected';

    if (
      targetSelected &&
      (pending.beforeAssignments.length <= 1 || !pending.beforeSignature)
    ) {
      finishSeatSelection(pending, 'accepted', afterAssignments);
      return;
    }

    if (pending.passengerDialogSeen && !pending.settleTimer) {
      pending.settleTimer = setTimeout(() => {
        if (pendingSeatSelection !== pending) return;
        const settledAssignments = getPassengerAssignments();
        if (
          passengerAssignmentSignature(settledAssignments) !== pending.beforeSignature
        ) {
          finishSeatSelection(pending, 'accepted', settledAssignments);
        } else {
          finishSeatSelection(pending, 'cancelled', settledAssignments);
        }
      }, PASSENGER_DIALOG_SETTLE_MS);
    }
  }

  function handleSeatSelect(btn, allBtns) {
    const seatKey = btn.dataset.seatKey || '';
    const seatId = btn.dataset.seatId || '';
    const wagonId = btn.dataset.wagonId;
    const floorKey = btn.dataset.floorKey;
    if (!seatKey && !seatId) return;

    const gEl = findSeatElement(seatKey, wagonId, floorKey, seatId);
    const statusEl = document.getElementById(STATUS_ID);
    if (!gEl) {
      if (statusEl) {
        statusEl.textContent = 'Valittua paikkaa ei enää löydy vaunukartasta. Päivitä paikkalista ja yritä uudelleen.';
      }
      return;
    }

    stopPendingSeatSelection();

    const floorContainer = gEl.closest('[data-testid="carriage-floor"]');
    const resolvedSeatKey = getSeatKey(gEl);
    const seatNumber = getSeatNumber(gEl);
    const beforeAssignments = getPassengerAssignments();
    const pending = {
      seatKey: resolvedSeatKey,
      seatId: gEl.id,
      seatNumber,
      wagonId,
      floorKey,
      floorContainer,
      beforeAssignments,
      beforeSignature: passengerAssignmentSignature(beforeAssignments),
      fallbackDetails: selectedOptionDetails(
        wagonId,
        floorKey,
        floorContainer,
        seatNumber
      ),
      btn,
      allBtns,
      passengerDialogSeen: false,
      observer: null,
      failureTimer: null,
      settleTimer: null
    };

    pending.observer = new MutationObserver(() =>
      evaluatePendingSeatSelection(pending)
    );
    pending.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'open',
        'aria-hidden',
        'aria-selected',
        'aria-disabled',
        'data-selection',
        'data-bookable'
      ]
    });
    pending.failureTimer = setTimeout(() => {
      if (pendingSeatSelection === pending && !pending.passengerDialogSeen) {
        finishSeatSelection(pending, 'rejected', getPassengerAssignments());
      }
    }, SEAT_ACTIVATION_TIMEOUT_MS);
    pendingSeatSelection = pending;

    const target = getSeatShape(gEl) || gEl;
    target.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
    evaluatePendingSeatSelection(pending);
  }

  function findOpenSeatModal() {
    return document.querySelector('dialog[aria-label="Valitse paikka"][open]') ||
           document.querySelector('dialog[aria-label="Valitse paikka"]') ||
           [...document.querySelectorAll('dialog[open]')]
             .find(dialog => dialog.getAttribute('aria-label') !== 'Uusi paikka') ||
           document.querySelector('dialog.FullScreenModal-module__Y89mtq__dialog');
  }

  function patchSeatLauncherButton(root = document) {
    const longText = 'Istumapaikan vaihtaminen vaunukartan avulla ei ole mahdollista ruudunlukijaa käytettäessä.';
    const shortText = 'Vaihda paikka';

    const buttons = [];
    if (root instanceof Element && root.matches('button, [role="button"]')) {
      buttons.push(root);
    }
    if (typeof root.querySelectorAll === 'function') {
      buttons.push(...root.querySelectorAll('button, [role="button"]'));
    }

    for (const btn of buttons) {
      if (btn.matches('button[data-testid="primary-modal-button"]')) continue;

      const txt = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      const aria = (btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();

      const looksLikeSeatLauncher =
        txt.includes('Vaihda paikka') ||
        aria.includes('Vaihda paikka') ||
        txt.includes(longText) ||
        aria.includes(longText);

      if (!looksLikeSeatLauncher) continue;

      if (btn.getAttribute('aria-label') !== shortText) {
        btn.setAttribute('aria-label', shortText);
      }

      const describedBy = btn.getAttribute('aria-describedby');
      if (describedBy) {
        const ids = describedBy.split(/\s+/).filter(Boolean);
        const keptIds = ids.filter(id => {
          const el = document.getElementById(id);
          if (!el) return true;
          const descText = (el.textContent || '').replace(/\s+/g, ' ').trim();
          return descText !== longText;
        });

        if (keptIds.length) {
          btn.setAttribute('aria-describedby', keptIds.join(' '));
        } else {
          btn.removeAttribute('aria-describedby');
        }
      }

      btn.dataset.vrAccOpenPatched = '1';
    }
  }

  function patchConfirmButton() {
    const btn = findOpenSeatModal()?.querySelector(
      'button[data-testid="primary-modal-button"]'
    );
    if (btn && !btn.dataset.vrAccPatched) {
      btn.dataset.vrAccPatched = '1';
    }
    if (btn) {
      updateConfirmButtonFromSelectedSeat();
    }
  }

  function refreshDocumentState() {
    const dialog = findOpenSeatModal();
    if (!dialog) {
      stopPendingSeatSelection();
      return;
    }
    if (!dialog.querySelector('#' + PANEL_ID) || !dialog.querySelector('#' + TOGGLE_ID)) {
      buildPanel(dialog);
    }
    patchPassengerChoiceDialog(findPassengerChoiceDialog());
    patchConfirmButton();
  }

  function scheduleDocumentRefresh() {
    clearTimeout(documentRefreshTimer);
    documentRefreshTimer = setTimeout(() => {
      documentRefreshTimer = null;
      refreshDocumentState();
    }, DOCUMENT_REFRESH_DEBOUNCE_MS);
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'childList') {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE ||
              node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            patchSeatLauncherButton(node);
          }
        });
      } else if (record.type === 'attributes') {
        patchSeatLauncherButton(record.target);
      }
    });
    scheduleDocumentRefresh();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['open', 'hidden', 'aria-hidden']
  });

  patchSeatLauncherButton(document);
  scheduleDocumentRefresh();
  setTimeout(refreshDocumentState, STARTUP_CHECK_DELAY_MS);

  document.addEventListener('keydown', e => {
    if (e.altKey && e.key === 'p') {
      const toggle = document.getElementById(TOGGLE_ID);
      if (toggle) {
        e.preventDefault();
        const checked =
          toggle.querySelector('input[name="vr-acc-style"]:checked') ||
          toggle.querySelector('input');
        checked?.focus();
      }
    }
  });

})();
