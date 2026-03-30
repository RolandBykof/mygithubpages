/**
 * VR Paikkavalinta – Saavutettavuuslaajennus
 * content.js
 *
 * Toiminta:
 *  - Seuraa DOM:ia MutationObserverilla, odottaa "Valitse paikka" -dialogin aukeamista
 *  - Kun dialogi aukeaa, injektoi saavutettavan HTML-paneelin ennen vaunukarttaa
 *  - Paneelissa on vaunu- ja kerrosvalitsimet sekä vapaat paikat listbox-muodossa
 *  - Paikkavalinta simuloi klikkauksen SVG-elementille, jolloin VR:n oma JS käsittelee valinnan
 *  - Tulokset päivitetään aria-live-alueella ruudunlukijalle
 */

(function () {
  'use strict';

  const PANEL_ID = 'vr-acc-panel';
  const STATUS_ID = 'vr-acc-status';

  // ─── PANEELIN TYYLIT ───────────────────────────────────────────────────────

  const STYLES = `
    #${PANEL_ID} {
      background: #fff;
      border: 2px solid #0057a8;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 12px 16px;
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
    #${PANEL_ID} .vr-acc-seat-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 320px;
      overflow-y: auto;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 10px;
      margin-top: 6px;
    }
    #${PANEL_ID} .vr-acc-seat-btn {
      padding: 8px 12px;
      min-width: 70px;
      border: 2px solid #0057a8;
      border-radius: 4px;
      background: #fff;
      color: #0057a8;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      transition: background 0.15s, color 0.15s;
    }
    #${PANEL_ID} .vr-acc-seat-btn:hover,
    #${PANEL_ID} .vr-acc-seat-btn:focus {
      background: #e8f0f9;
      outline: 3px solid #003c7e;
    }
    #${PANEL_ID} .vr-acc-seat-btn[aria-pressed="true"] {
      background: #0057a8;
      color: #fff;
    }
    #${PANEL_ID} .vr-acc-seat-btn.higher-price {
      border-color: #7a5200;
      color: #7a5200;
    }
    #${PANEL_ID} .vr-acc-seat-btn.higher-price[aria-pressed="true"] {
      background: #7a5200;
      color: #fff;
    }
    #${PANEL_ID} .vr-acc-unavailable {
      padding: 8px 12px;
      min-width: 70px;
      border: 1px dashed #aaa;
      border-radius: 4px;
      background: #f2f2f2;
      color: #888;
      font-size: 14px;
      text-align: center;
      cursor: default;
    }
    #${STATUS_ID} {
      margin-top: 10px;
      font-weight: bold;
      color: #005a00;
      min-height: 20px;
    }
    #${PANEL_ID} .vr-acc-help {
      font-size: 13px;
      color: #444;
      margin: 0 0 10px 0;
    }
    #${PANEL_ID} .vr-acc-count {
      font-size: 13px;
      color: #444;
      margin: 4px 0 6px;
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

  // ─── APUFUNKTIOT ───────────────────────────────────────────────────────────

  /**
   * Tarkistaa onko SVG-paikkaelementti vapaa vai varattu.
   * Strategia:
   *  1. Jos aria-selected puuttuu → ei valittavissa
   *  2. Jos pointer-events: none on asetettu → ei valittavissa
   *  3. Muuten: tarkista shape-pathin fill-väri
   *     - Kelpaa vapaalle tai valitulle (ei selkeästi "varattu"-väri)
   */
  /**
   * Paikkaelemenin tila värianalyysin perusteella.
   *
   * Todetut computed fill -värit (shapeFillComputed, CSS ylikirjoittaa SVG-attribuutin):
   *   Valittu        rgb(27, 80, 175)    → sininen   (myös aria-selected="true")
   *   Vapaa          rgb(255, 255, 255)  → valkoinen
   *   Ei valittavissa rgb(242, 242, 242) → harmaa
   *   Kalliimpi hinta rgb(213, 238, 250) → vaalea sininen
   *
   * Huom: fill-ATTRIBUUTTI on aina #FFF — väri tulee yksinomaan CSS:stä,
   * joten getComputedStyle on ainoa luotettava tapa.
   */
  function getSeatStatus(gEl) {
    // aria-selected="true" → varmuudella valittu
    if (gEl.getAttribute('aria-selected') === 'true') return 'selected';

    // aria-selected puuttuu kokonaan → ei kuulu valittaviin paikkoihin
    if (gEl.getAttribute('aria-selected') === null) return 'unavailable';

    // Lue computed fill shape-polulta
    const shape = document.getElementById(gEl.id + '_shape');
    if (!shape) return 'available'; // varotoimenpide: ei shapea, kokeillaan silti

    const fill = window.getComputedStyle(shape).fill;
    const rgb = parseRGB(fill);

    if (!rgb) {
      // Ei saatu väriä → fallback pointer-events-tarkistukseen
      const pe = window.getComputedStyle(gEl).pointerEvents;
      return pe === 'none' ? 'unavailable' : 'available';
    }

    const { r, g, b } = rgb;

    // Valkoinen tai lähes valkoinen → vapaa paikka
    if (r >= 245 && g >= 245 && b >= 245) return 'available';

    // Vaalea sininen → kalliimpi hinta (b dominoi, kaikki arvot korkeat)
    if (b >= 235 && g >= 225 && r >= 200 && b > r) return 'higher-price';

    // Harmaa (r≈g≈b, keskialueen arvot) → ei valittavissa
    if (r >= 190 && r <= 250 && Math.abs(r - g) < 20 && Math.abs(r - b) < 20) return 'unavailable';

    // Tumma sininen → valittu (varmuuden vuoksi, vaikka aria-selected hoitaa jo)
    if (r < 100 && b > 100) return 'selected';

    // Muu tuntematon väri → kokeillaan vapaana, handleSeatSelect varmistaa
    return 'available';
  }

  /** Parsii "rgb(r, g, b)" tai "rgba(r, g, b, a)" → {r, g, b} tai null */
  function parseRGB(str) {
    const m = str && str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  }

  /** Onko vaunu palveluvaunu (ravintola, leikki tms.)?
   *  Merkki: _coachSvg-divissä ei ole aria-label-attribuuttia
   *  (matkustajavaunuilla on "Vaunu: N, Yläkerta/Alakerta"). */
  function isServiceWagon(wagonEl) {
    const coachDivs = wagonEl.querySelectorAll('[class*="_coachSvg_"]');
    for (const div of coachDivs) {
      if (div.hasAttribute('aria-label')) return false;
    }
    return true;
  }
  function wagonLabel(wagonId) {
    return 'Vaunu ' + wagonId.replace('wagon_', '');
  }

  /** Poimii paikan numeron id:stä "seat_68" → "68" */
  function seatNum(seatId) {
    return seatId.replace('seat_', '');
  }

  /** Hae kaikki vaunu-divit järjestyksessä (suurimmasta pienimpään, kuten junan järjestys) */
  function getWagons() {
    const wagons = [...document.querySelectorAll('[id^="wagon_"]')];
    return wagons.sort((a, b) => {
      const na = parseInt(a.id.replace('wagon_', ''));
      const nb = parseInt(b.id.replace('wagon_', ''));
      return nb - na; // laskeva: wagon_4, wagon_3, wagon_2, wagon_1
    });
  }

  /** Löydä vaunu-divin tietyn kerroksen SVG-säiliö */
  function getFloorContainer(wagonEl, floorKey) {
    const floors = wagonEl.querySelectorAll('[data-testid="carriage-floor"]');
    for (const f of floors) {
      const coachDiv = f.querySelector('[aria-label]');
      if (!coachDiv) continue;
      const lbl = coachDiv.getAttribute('aria-label') || '';
      if (floorKey === 'upper' && lbl.includes('Yläkerta')) return f;
      if (floorKey === 'lower' && lbl.includes('Alakerta')) return f;
    }
    return null;
  }

  /** Hae kaikki paikka-g-elementit tietyllä kerroksella, järjestyksessä */
  function getSeats(floorContainer) {
    const seats = [...floorContainer.querySelectorAll('g[id^="seat_"]')];
    return seats.sort((a, b) => parseInt(seatNum(a.id)) - parseInt(seatNum(b.id)));
  }

  /** Onko vaunulla kyseinen kerros SVG:nä (ei tyhjä)? */
  function floorHasSeats(wagonEl, floorKey) {
    const fc = getFloorContainer(wagonEl, floorKey);
    if (!fc) return false;
    return fc.querySelectorAll('g[id^="seat_"][aria-selected]').length > 0;
  }

  // ─── PANEELIN RAKENTAMINEN ─────────────────────────────────────────────────

  function buildPanel(dialog) {
    // Poista vanha paneeli jos on
    const old = document.getElementById(PANEL_ID);
    if (old) old.remove();

    // Lisää tyylit kerran
    if (!document.getElementById('vr-acc-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'vr-acc-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    const wagons = getWagons();
    if (!wagons.length) return;

    // Etsi ensimmäinen vaunu jolla on paikkoja yläkerrassa
    let defaultWagonId = wagons[0].id;
    let defaultFloor = 'upper';
    outer: for (const w of wagons) {
      if (isServiceWagon(w)) continue;
      for (const f of ['upper', 'lower']) {
        if (floorHasSeats(w, f)) { defaultWagonId = w.id; defaultFloor = f; break outer; }
      }
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Saavutettava paikkavalinta');
    panel.setAttribute('tabindex', '-1');

    panel.innerHTML = `
      <h2>Saavutettava paikkavalinta</h2>
      <p class="vr-acc-help" id="vr-acc-help">
        Valitse vaunu ja kerros, selaa paikkoja nuolinäppäimillä.
        Valitse paikka Enter- tai välilyöntinäppäimellä.
        Vahvista sen jälkeen "Vahvista paikkavalinta" -painikkeella sivun alaosassa.
      </p>

      <div class="vr-acc-controls">
        <label for="vr-acc-wagon">Vaunu:</label>
        <select id="vr-acc-wagon" aria-describedby="vr-acc-help">
          ${wagons.map(w => {
            const svc = isServiceWagon(w);
            const lbl = wagonLabel(w.id) + (svc ? ' (palveluvaunu)' : '');
            return `<option value="${w.id}"${w.id === defaultWagonId ? ' selected' : ''}${svc ? ' disabled' : ''}>${lbl}</option>`;
          }).join('\n          ')}
        </select>

        <label for="vr-acc-floor">Kerros:</label>
        <select id="vr-acc-floor">
          <option value="upper"${defaultFloor === 'upper' ? ' selected' : ''}>Yläkerta</option>
          <option value="lower"${defaultFloor === 'lower' ? ' selected' : ''}>Alakerta</option>
        </select>
      </div>

      <div id="vr-acc-seat-area" aria-live="polite">
        <!-- Paikat renderöidään tänne -->
      </div>

      <div id="${STATUS_ID}" aria-live="assertive" aria-atomic="true"></div>

      <div class="vr-acc-legend" aria-hidden="true">
        <div class="vr-acc-legend-item">
          <span class="vr-acc-legend-box" style="background:#fff;border:2px solid #0057a8;"></span>
          <span>Vapaa paikka</span>
        </div>
        <div class="vr-acc-legend-item">
          <span class="vr-acc-legend-box" style="background:#0057a8;"></span>
          <span>Valittu paikka</span>
        </div>
        <div class="vr-acc-legend-item">
          <span class="vr-acc-legend-box" style="background:#f2f2f2;border:1px dashed #aaa;"></span>
          <span>Varattu / ei valittavissa</span>
        </div>
        <div class="vr-acc-legend-item">
          <span class="vr-acc-legend-box" style="background:#fff;border:2px solid #7a5200;"></span>
          <span>Vapaa, kalliimpi hinta</span>
        </div>
      </div>
    `;

    // Sijoita ennen vaunukarttaa
    const wagonMap = dialog.querySelector('.WagonMapContainer-module__HgHuFq__container, [data-testid="wagonmap-coachmap"]');
    const parent = wagonMap ? wagonMap.parentElement : null;
    if (parent) {
      parent.insertBefore(panel, parent.firstChild);
    } else {
      // Fallback: dialogin heti headerin jälkeen
      const header = dialog.querySelector('.FullScreenModal-module__Y89mtq__header');
      if (header) header.after(panel);
      else dialog.prepend(panel);
    }

    // Tapahtumakunustelukkijat
    const wagonSel = panel.querySelector('#vr-acc-wagon');
    const floorSel = panel.querySelector('#vr-acc-floor');

    const refresh = () => renderSeats(wagonSel.value, floorSel.value);
    wagonSel.addEventListener('change', refresh);
    floorSel.addEventListener('change', refresh);

    // Ensimmäinen renderöinti
    renderSeats(defaultWagonId, defaultFloor);

    // Fokusointi paneeliin (ruudunlukijaa varten)
    setTimeout(() => panel.focus(), 150);
  }

  // ─── PAIKKALISTAN RENDERÖINTI ──────────────────────────────────────────────

  function renderSeats(wagonId, floorKey) {
    const area = document.getElementById('vr-acc-seat-area');
    if (!area) return;

    const wagon = document.getElementById(wagonId);
    if (!wagon) { area.innerHTML = '<p class="vr-acc-no-seats">Vaunua ei löydy.</p>'; return; }

    if (isServiceWagon(wagon)) {
      area.innerHTML = '<p class="vr-acc-no-seats">Tämä on palveluvaunu (esim. ravintola- tai leikkivaunu) — siinä ei ole valittavia istumapaikkoja.</p>';
      return;
    }

    const floorContainer = getFloorContainer(wagon, floorKey);
    if (!floorContainer) { area.innerHTML = '<p class="vr-acc-no-seats">Tätä kerrosta ei ole tässä vaunussa tai se on palveluvaunu.</p>'; return; }

    const seats = getSeats(floorContainer);
    if (!seats.length) { area.innerHTML = '<p class="vr-acc-no-seats">Ei paikkoja tässä kerroksessa.</p>'; return; }

    let available = 0;
    const items = seats.map(gEl => {
      const status = getSeatStatus(gEl);
      const num = seatNum(gEl.id);
      if (status === 'available' || status === 'higher-price') available++;
      return { gEl, status, num };
    });

    const wagonLabel_ = wagonLabel(wagonId);
    const floorLabel = floorKey === 'upper' ? 'Yläkerta' : 'Alakerta';

    // Rakenna HTML
    let gridHtml = '';
    let firstAvailIdx = -1;

    items.forEach((item, idx) => {
      if (item.status === 'selected') {
        gridHtml += `
          <div class="vr-acc-seat-btn" aria-pressed="true"
               aria-label="Paikka ${item.num}, valittu"
               data-seat-id="${item.gEl.id}">
            ${item.num} ✓
          </div>`;
      } else if (item.status === 'available' || item.status === 'higher-price') {
        if (firstAvailIdx < 0) firstAvailIdx = idx;
        const cls = item.status === 'higher-price' ? 'vr-acc-seat-btn higher-price' : 'vr-acc-seat-btn';
        const priceNote = item.status === 'higher-price' ? ', kalliimpi hinta' : '';
        gridHtml += `
          <button class="${cls}"
                  aria-pressed="false"
                  aria-label="Paikka ${item.num}${priceNote}"
                  data-seat-id="${item.gEl.id}"
                  tabindex="-1">
            ${item.num}
          </button>`;
      } else {
        gridHtml += `
          <div class="vr-acc-unavailable" aria-hidden="true" title="Paikka ${item.num} varattu">
            ${item.num}
          </div>`;
      }
    });

    area.innerHTML = `
      <p class="vr-acc-count" id="vr-acc-seat-count">
        ${wagonLabel_}, ${floorLabel}: ${available} vapaata paikkaa / ${seats.length} paikkaa yhteensä
      </p>
      <div class="vr-acc-seat-grid" id="vr-acc-seat-grid" role="group" aria-labelledby="vr-acc-seat-count">
        ${gridHtml}
      </div>
    `;

    // Aseta ensimmäinen vapaa painike fokusoitavaksi
    const btns = [...area.querySelectorAll('button.vr-acc-seat-btn')];
    if (btns.length) {
      btns[0].tabIndex = 0;
    }

    // Lisää klikkaus- ja näppäinkuuntelijat
    btns.forEach((btn, i) => {
      btn.addEventListener('click', () => handleSeatSelect(btn, btns));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSeatSelect(btn, btns);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          moveFocus(btns, i, +1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          moveFocus(btns, i, -1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          moveFocusTo(btns, 0);
        } else if (e.key === 'End') {
          e.preventDefault();
          moveFocusTo(btns, btns.length - 1);
        }
      });
    });
  }

  function moveFocus(btns, currentIdx, delta) {
    const next = currentIdx + delta;
    if (next >= 0 && next < btns.length) {
      btns[currentIdx].tabIndex = -1;
      btns[next].tabIndex = 0;
      btns[next].focus();
    }
  }

  function moveFocusTo(btns, idx) {
    btns.forEach(b => b.tabIndex = -1);
    btns[idx].tabIndex = 0;
    btns[idx].focus();
  }

  // ─── PAIKKAVALINTA ─────────────────────────────────────────────────────────

  function handleSeatSelect(btn, allBtns) {
    const seatId = btn.dataset.seatId;
    if (!seatId) return;

    const num = seatNum(seatId);
    const statusEl = document.getElementById(STATUS_ID);

    // Kerro käyttäjälle että yritetään valintaa
    if (statusEl) statusEl.textContent = `Valitaan paikkaa ${num}…`;

    // Simuloi klikki SVG-elementille
    const gEl = document.getElementById(seatId);
    if (gEl) {
      const shape = document.getElementById(seatId + '_shape');
      const target = shape || gEl;
      target.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }

    // Tarkista 500 ms:n jälkeen hyväksyikö VR:n JS valinnan
    setTimeout(() => {
      const gEl2 = document.getElementById(seatId);
      const accepted = gEl2 && gEl2.getAttribute('aria-selected') === 'true';

      if (accepted) {
        // VR hyväksyi — päivitä paneeli ja ilmoita
        allBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        if (statusEl) {
          statusEl.textContent = `Paikka ${num} valittu. Vahvista valinta "Vahvista paikkavalinta" -painikkeella.`;
        }
      } else {
        // VR ei hyväksynyt — paikka todennäköisesti varattu tai ei valittavissa
        if (statusEl) {
          statusEl.textContent = `Paikkaa ${num} ei voitu valita. Se saattaa olla varattu tai muuten ei valittavissa.`;
        }
      }

      // Päivitä lista joka tapauksessa (näyttää mahdollisesti muuttuneen tilan)
      const wagonSel = document.getElementById('vr-acc-wagon');
      const floorSel = document.getElementById('vr-acc-floor');
      if (wagonSel && floorSel) {
        renderSeats(wagonSel.value, floorSel.value);
      }
    }, 500);
  }

  // ─── PANEELIN SIIRTÄMINEN VAHVISTUSPAINIKKEELLE ────────────────────────────

  /**
   * Lisää "Vahvista paikkavalinta" -painikkeelle lisäohjeen ruudunlukijalle
   * (jos sitä ei jo ole) ja seuraa sen tilaa.
   */
  function patchConfirmButton() {
    const btn = document.querySelector('button[data-testid="primary-modal-button"]');
    if (btn && !btn.dataset.vrAccPatched) {
      btn.dataset.vrAccPatched = '1';
      const hint = document.createElement('span');
      hint.className = 'utils-module__G7kwQG__visuallyHidden';
      hint.textContent = ' – vahvistaa vaunukartalla valitun paikan';
      btn.appendChild(hint);
    }
  }

  // ─── DOM-OBSERVOINTI ───────────────────────────────────────────────────────

  let lastDialogOpen = false;

  const observer = new MutationObserver(() => {
    const dialog = document.querySelector('dialog[aria-label="Valitse paikka"]');

    if (dialog) {
      const isOpen = !dialog.hidden && dialog.open !== false;
      const panelExists = !!document.getElementById(PANEL_ID);

      if (isOpen && !panelExists) {
        // Dialogi juuri avattiin – odota hetki että SVG latautuu
        setTimeout(() => {
          buildPanel(dialog);
          patchConfirmButton();
        }, 600);
        lastDialogOpen = true;
      } else if (isOpen && panelExists) {
        // Dialogi auki, paneeli olemassa – tarkista onko vaunu/kerros muuttunut
        // (esim. VR vaihtaa vaunua automaattisesti)
        // ei tehdä mitään, käyttäjä hallitsee itse
      }
    } else {
      lastDialogOpen = false;
      // Dialogi sulkeutunut – paneeli poistuu dialogin mukana
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['open', 'hidden', 'aria-hidden']
  });

  // ─── NÄPPÄINYHDISTELMÄT ────────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    // Alt+P: siirry suoraan paikkapaneeliin (jos dialogi auki)
    if (e.altKey && e.key === 'p') {
      const panel = document.getElementById(PANEL_ID);
      if (panel) {
        e.preventDefault();
        panel.focus();
        const statusEl = document.getElementById(STATUS_ID);
        if (statusEl) statusEl.textContent = 'Saavutettava paikkapaneeli aktiivinen. Käytä valintoihin vaunu- ja kerrosvalitsimia sekä paikkalistaa.';
      }
    }
  });

})();
