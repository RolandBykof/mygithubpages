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
  const TOGGLE_ID = 'vr-acc-style-toggle';

  // ─── PANEELIN TYYLIT ───────────────────────────────────────────────────────

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

  /** Onko vaunu palveluvaunu (ravintola, leikki tms.) ilman istumapaikkoja?
   *
   * Kaksi ehtoa pitää MOLEMPIEN täyttyä:
   *  1. Yksikään _coachSvg-div ei ole saanut aria-label-attribuuttia
   *     (matkustajavaunuissa, myös ravintola-/leikkivaunuissa joilla on paikkoja,
   *      VR injektoi aina aria-labelin kun SVG ladataan)
   *  2. Assembly-kartan ikonimäärä yhteensä on 2 tai enemmän
   *
   * Ehto 1 estää ravintolavaunu-Ekstra-vaunujen (ERD, CED jne.) virheellisen
   * tunnistamisen palveluvaunuiksi — niillä on paikkoja JA aria-label. */
  function isServiceWagon(wagonEl) {
    // Ehto 1: onko jokin kerros jo ladattu (aria-label löytyy)?
    const hasAriaLabel = [...wagonEl.querySelectorAll('[class*="_coachSvg_"]')]
      .some(div => div.hasAttribute('aria-label'));
    if (hasAriaLabel) return false;

    // Ehto 2: assembly-ikonimäärä
    const wagonNum = wagonEl.id.replace('wagon_', '');
    const assemblyCarriages = [...document.querySelectorAll('[class*="_assemblyCarriage_"]')]
      .filter(el => el.childNodes[0]?.textContent?.trim() === wagonNum
                 || el.textContent.trim() === wagonNum);

    let totalIcons = 0;
    for (const carriage of assemblyCarriages) {
      const iconContainer = carriage.querySelector('[class*="_serviceIconContainer_"]');
      if (iconContainer) {
        totalIcons += iconContainer.querySelectorAll('[class*="_container_"]').length;
      }
    }
    return totalIcons >= 2;
  }

  /**
   * Varmistaa että vaunun SVG on ladattu.
   * VR lataa SVG:t kun karttaa scrollataan vaakasuunnassa.
   * Strategia: scrollataan wagon-elementti näkyviin → VR injektoi SVG:n.
   */
  function ensureWagonLoaded(wagonEl) {
    return new Promise(resolve => {
      const hasSeats = wagonEl.querySelectorAll('g[id^="seat_"][aria-selected]').length > 0;
      if (hasSeats) { resolve(); return; }

      // Etsi vaakasuunnassa scrollattava karttasäiliö
      const scrollContainer = document.querySelector(
        '[data-testid="wagonmap-coachmap"], [class*="_horizontallyScrollable_"]'
      );

      if (scrollContainer) {
        // Laske vaunun x-offset scrollattavan säiliön sisällä
        const containerRect = scrollContainer.getBoundingClientRect();
        const wagonRect = wagonEl.getBoundingClientRect();
        const currentScroll = scrollContainer.scrollLeft;
        const targetScroll = currentScroll + (wagonRect.left - containerRect.left)
                             - containerRect.width / 2 + wagonRect.width / 2;
        scrollContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
      } else {
        // Fallback: selainkohtainen scrollIntoView
        wagonEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      // Odota MutationObserverilla seat_N-elementtien ilmestymistä (max 4 s)
      const observer = new MutationObserver(() => {
        if (wagonEl.querySelectorAll('g[id^="seat_"][aria-selected]').length > 0) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(wagonEl, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(); }, 4000);
    });
  }
  /**
   * Lukee vaunun SVG-juuri-g-elementin ID-etuliitteen ja palauttaa vaunutyypin.
   *
   * Todetut tyypit (SVG-ryhmä → tyyppi):
   *   ED    → tavallinen    (Eko Double-decker, normaali matkustajaVaunu)
   *   EDO   → lemmikkivaunu (Eko Double-decker, Open = lemmikkiystävällinen)
   *   EDFS  → leikkivaunu   (Family Space, perhe + leikkitila)
   *   ERD   → ravintolavaunu (Ekstra Relaxed with Dining)
   *   CED   → ekstra        (Calm Ekstra Double-decker, Ekstra Calm)
   *   ERD-tyypeillä myös Ekstra-luokka → floorIsEkstra() palauttaa true
   *
   * Tuntematon etuliite → 'tavallinen'.
   */
  function getWagonType(wagonEl) {
    const svgRootG = wagonEl.querySelector('svg g[id]');
    if (!svgRootG) return 'tavallinen';
    const id = svgRootG.id.toUpperCase();
    if (id.startsWith('EDFS')) return 'leikkivaunu';
    if (id.startsWith('ERD'))  return 'ravintolavaunu';
    if (id.startsWith('CED'))  return 'ekstra';
    if (id.startsWith('EDO'))  return 'lemmikkivaunu';
    if (id.startsWith('ED'))   return 'tavallinen';
    return 'tavallinen';
  }

  /**
   * Tarkistaa onko kerroksella Ekstra-luokan paikkoja.
   * Merkki: Service-badges sisältää use-elementin jonka href viittaa
   * '#service-icons-ekstra-*' -symboliin.
   * Jos kyllä → kaikki kerroksen istumapaikat ovat Ekstra-luokkaa.
   */
  function floorIsEkstra(floorContainer) {
    const uses = floorContainer.querySelectorAll('use[href*="ekstra"], use[xlink\\:href*="ekstra"]');
    return uses.length > 0;
  }

  function wagonLabel(wagonId) {
    return 'Vaunu ' + wagonId.replace('wagon_', '');
  }

  /**
   * Muodostaa vaunun nimen valitsimeen: lisää tyyppimerkinnän jos tiedossa.
   * Esim. "Vaunu 4 – leikkivaunu", "Vaunu 3 – Ekstra-luokka"
   */
  function wagonSelectLabel(wagonEl) {
    const base = wagonLabel(wagonEl.id);
    const type = getWagonType(wagonEl);
    const labels = {
      'leikkivaunu':    ' – leikkivaunu',
      'ravintolavaunu': ' – ravintolavaunu',
      'lemmikkivaunu':  ' – lemmikkivaunu',
      'ekstra':         ' – Ekstra-luokka',
    };
    return base + (labels[type] || '');
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

  /** Löydä vaunu-divin tietyn kerroksen SVG-säiliö.
   *  Ensisijaisesti aria-label, toissijaisesti kerrosjärjestys (yläkerta=1., alakerta=2.). */
  function getFloorContainer(wagonEl, floorKey) {
    const floors = wagonEl.querySelectorAll('[data-testid="carriage-floor"]');
    // 1. Yritä aria-labelilla
    for (const f of floors) {
      const coachDiv = f.querySelector('[aria-label]');
      if (!coachDiv) continue;
      const lbl = coachDiv.getAttribute('aria-label') || '';
      if (floorKey === 'upper' && lbl.includes('Yläkerta')) return f;
      if (floorKey === 'lower' && lbl.includes('Alakerta')) return f;
    }
    // 2. Fallback: kerrosjärjestys (floors[0]=yläkerta, floors[1]=alakerta)
    if (floorKey === 'upper' && floors[0]) return floors[0];
    if (floorKey === 'lower' && floors[1]) return floors[1];
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
    // Poista vanhat elementit jos on
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(TOGGLE_ID)?.remove();

    // Lisää tyylit kerran
    if (!document.getElementById('vr-acc-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'vr-acc-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    const wagons = getWagons();
    if (!wagons.length) return;

    // Etsi ensimmäinen vaunu jolla on paikkoja
    let defaultWagonId = wagons[0].id;
    let defaultFloor = 'upper';
    outer: for (const w of wagons) {
      if (isServiceWagon(w)) continue;
      for (const f of ['upper', 'lower']) {
        if (floorHasSeats(w, f)) { defaultWagonId = w.id; defaultFloor = f; break outer; }
      }
    }

    // ── TOGGLE ──────────────────────────────────────────────────────────────
    const toggle = document.createElement('div');
    toggle.id = TOGGLE_ID;
    toggle.innerHTML = `
      <fieldset>
        <legend>Paikkakartan tyyli:</legend>
        <label>
          <input type="radio" name="vr-acc-style" value="kuva" checked>
          Kuva
        </label>
        <label>
          <input type="radio" name="vr-acc-style" value="teksti">
          Teksti
        </label>
      </fieldset>
    `;

    // ── PANEELI (alkaa piilotettuna) ─────────────────────────────────────────
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Saavutettava paikkavalinta');
    panel.setAttribute('tabindex', '-1');
    panel.hidden = true;

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
            const lbl = svc ? wagonLabel(w.id) + ' (palveluvaunu)' : wagonSelectLabel(w);
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

    // ── SIJOITUS ─────────────────────────────────────────────────────────────
    const wagonMap = dialog.querySelector('.WagonMapContainer-module__HgHuFq__container, [data-testid="wagonmap-coachmap"]');
    const parent = wagonMap ? wagonMap.parentElement : null;
    if (parent) {
      parent.insertBefore(toggle, parent.firstChild);
      parent.insertBefore(panel, toggle.nextSibling);
    } else {
      const header = dialog.querySelector('.FullScreenModal-module__Y89mtq__header');
      if (header) { header.after(toggle); toggle.after(panel); }
      else { dialog.prepend(panel); dialog.prepend(toggle); }
    }

    // ── TOGGLE-KUUNTELIJAT ────────────────────────────────────────────────────
    toggle.querySelectorAll('input[name="vr-acc-style"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isTeksti = radio.value === 'teksti';
        panel.hidden = !isTeksti;

        if (isTeksti) {
          // Ensimmäinen avaus: renderöi paikat
          const wagonSel = panel.querySelector('#vr-acc-wagon');
          const floorSel = panel.querySelector('#vr-acc-floor');
          if (wagonSel && floorSel) {
            renderSeats(wagonSel.value, floorSel.value);
          }
          // Siirrä fokus paneeliin
          setTimeout(() => panel.focus(), 50);
        }
      });
    });

    // ── VAUNU/KERROS-KUUNTELIJAT ──────────────────────────────────────────────
    const wagonSel = panel.querySelector('#vr-acc-wagon');
    const floorSel = panel.querySelector('#vr-acc-floor');
    const refresh = () => renderSeats(wagonSel.value, floorSel.value);
    wagonSel.addEventListener('change', refresh);
    floorSel.addEventListener('change', refresh);

    // Fokusointi toggleen (ruudunlukijaa varten)
    setTimeout(() => toggle.querySelector('input[value="kuva"]').focus(), 150);
  }

  // ─── IKKUNA/KÄYTÄVÄ-TUNNISTUS ─────────────────────────────────────────────

  /**
   * Rakentaa kartan { seatId -> 'ikkuna'|'käytävä' } screenRect.y-arvojen perusteella.
   *
   * Todettu data (getBoundingClientRect): 4 erillistä y-tasoa per kerros.
   * Parit ovat ~43px päässä toisistaan (istuimen korkeus), käytäväkuilu ~78px.
   * Järjestettyinä: [y0, y1, ..., yN] — uloimmat (y0 ja yN) = ikkuna, muut = käytävä.
   */
  function buildSeatPositionMap(floorContainer) {
    const map = {};
    const seats = [...floorContainer.querySelectorAll('g[id^="seat_"]')];
    if (!seats.length) return map;

    const yValues = seats.map(g => {
      const r = g.getBoundingClientRect();
      return Math.round(r.y / 4) * 4; // pyöristys 4px tarkkuudella
    });

    const uniqueY = [...new Set(yValues)].sort((a, b) => a - b);
    if (uniqueY.length < 2) return map;

    const windowY = new Set([uniqueY[0], uniqueY[uniqueY.length - 1]]);
    seats.forEach((g, i) => {
      map[g.id] = windowY.has(yValues[i]) ? 'ikkuna' : 'käytävä';
    });
    return map;
  }

  // ─── PAIKKALISTAN RENDERÖINTI ──────────────────────────────────────────────

  async function renderSeats(wagonId, floorKey) {
    const area = document.getElementById('vr-acc-seat-area');
    if (!area) return;

    const wagon = document.getElementById(wagonId);
    if (!wagon) { area.innerHTML = '<p class="vr-acc-no-seats">Vaunua ei löydy.</p>'; return; }

    if (isServiceWagon(wagon)) {
      area.innerHTML = '<p class="vr-acc-no-seats">Tämä on palveluvaunu (esim. ravintola- tai leikkivaunu) — siinä ei ole valittavia istumapaikkoja.</p>';
      return;
    }

    // Varmista että SVG on ladattu (lazy loading)
    const hasSeats = wagon.querySelectorAll('g[id^="seat_"][aria-selected]').length > 0;
    if (!hasSeats) {
      area.innerHTML = '<p class="vr-acc-no-seats">Ladataan vaunun tietoja…</p>';
      await ensureWagonLoaded(wagon);
    }

    const floorContainer = getFloorContainer(wagon, floorKey);
    if (!floorContainer) { area.innerHTML = '<p class="vr-acc-no-seats">Tätä kerrosta ei ole tässä vaunussa tai se on palveluvaunu.</p>'; return; }

    const seats = getSeats(floorContainer);
    if (!seats.length) { area.innerHTML = '<p class="vr-acc-no-seats">Ei paikkoja tässä kerroksessa.</p>'; return; }

    // Rakennetaan ikkuna/käytävä-kartta screenRect.y-arvojen perusteella
    const posMap = buildSeatPositionMap(floorContainer);

    // Onko kerros Ekstra-luokkaa?
    const isEkstra = floorIsEkstra(floorContainer);

    // Vaunutyyppi otsikkoon
    const wagonType = getWagonType(wagon);
    const wagonTypeNotes = {
      'leikkivaunu':    ' (leikkivaunu)',
      'ravintolavaunu': ' (ravintolavaunu)',
      'lemmikkivaunu':  ' (lemmikkivaunu)',
      'ekstra':         ' (Ekstra-luokka)',
    };
    const wagonTypeNote = wagonTypeNotes[wagonType] || '';

    let available = 0;
    const items = seats.map(gEl => {
      const status = getSeatStatus(gEl);
      const num = seatNum(gEl.id);
      const pos = posMap[gEl.id] || '';
      if (status === 'available' || status === 'higher-price') available++;
      return { gEl, status, num, pos };
    });

    const wagonLabel_ = wagonLabel(wagonId);
    const floorLabel = floorKey === 'upper' ? 'Yläkerta' : 'Alakerta';

    // Rakenna HTML
    let gridHtml = '';
    let firstAvailIdx = -1;

    items.forEach((item, idx) => {
      if (item.status === 'selected') {
        const posNote = item.pos ? `, ${item.pos}` : '';
        const ekstraNote = isEkstra ? ', Ekstra-luokka' : '';
        gridHtml += `
          <div class="vr-acc-seat-btn" aria-pressed="true"
               aria-label="Paikka ${item.num}${posNote}${ekstraNote}, valittu"
               data-seat-id="${item.gEl.id}"
               data-wagon-id="${wagonId}"
               data-floor-key="${floorKey}">
            ${item.num} ✓
          </div>`;
      } else if (item.status === 'available' || item.status === 'higher-price') {
        if (firstAvailIdx < 0) firstAvailIdx = idx;
        const cls = item.status === 'higher-price' ? 'vr-acc-seat-btn higher-price' : 'vr-acc-seat-btn';
        const posNote = item.pos ? `, ${item.pos}` : '';
        const ekstraNote = isEkstra ? ', Ekstra-luokka' : '';
        const priceNote = item.status === 'higher-price' ? ', kalliimpi hinta' : '';
        gridHtml += `
          <button class="${cls}"
                  aria-pressed="false"
                  aria-label="Paikka ${item.num}${posNote}${ekstraNote}${priceNote}"
                  data-seat-id="${item.gEl.id}"
                  data-wagon-id="${wagonId}"
                  data-floor-key="${floorKey}"
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
        ${wagonLabel_}${wagonTypeNote}, ${floorLabel}: ${available} vapaata paikkaa / ${seats.length} paikkaa yhteensä${isEkstra ? ' – Ekstra-luokka' : ''}
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
    const wagonId = btn.dataset.wagonId;
    const floorKey = btn.dataset.floorKey;
    if (!seatId) return;

    const num = seatNum(seatId);
    const statusEl = document.getElementById(STATUS_ID);

    if (statusEl) statusEl.textContent = `Valitaan paikkaa ${num}…`;

    // Hae paikkaelementti OIKEASTA vaunusta ja kerroksesta
    // document.getElementById löytäisi ensimmäisen samannimisen koko DOM:sta,
    // mikä on väärä vaunu jos sama paikkanumero esiintyy useammassa vaunussa.
    const wagonEl = wagonId ? document.getElementById(wagonId) : null;
    const floorContainer = wagonEl ? getFloorContainer(wagonEl, floorKey) : null;
    const gEl = floorContainer
      ? floorContainer.querySelector('g#' + seatId)
      : document.getElementById(seatId); // fallback

    if (gEl) {
      const shapeId = seatId + '_shape';
      const shape = floorContainer
        ? floorContainer.querySelector('path#' + shapeId)
        : document.getElementById(shapeId);
      const target = shape || gEl;
      target.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }

    // Tarkista 500 ms:n jälkeen hyväksyikö VR:n JS valinnan
    setTimeout(() => {
      const gEl2 = floorContainer
        ? floorContainer.querySelector('g#' + seatId)
        : document.getElementById(seatId);
      const accepted = gEl2 && gEl2.getAttribute('aria-selected') === 'true';

      if (accepted) {
        allBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        const ariaLabel = btn.getAttribute('aria-label') || `Paikka ${num}`;
        if (statusEl) {
          statusEl.textContent = `${ariaLabel} valittu. Vahvista valinta "Vahvista paikkavalinta" -painikkeella.`;
        }
      } else {
        if (statusEl) {
          statusEl.textContent = `Paikkaa ${num} ei voitu valita. Se saattaa olla varattu tai muuten ei valittavissa.`;
        }
      }

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
    // Alt+P: siirry suoraan toggleen (jos dialogi auki)
    if (e.altKey && e.key === 'p') {
      const toggle = document.getElementById(TOGGLE_ID);
      if (toggle) {
        e.preventDefault();
        const checked = toggle.querySelector('input[name="vr-acc-style"]:checked') || toggle.querySelector('input');
        checked?.focus();
        const statusEl = document.getElementById(STATUS_ID);
        if (statusEl) statusEl.textContent = 'Paikkakartan tyyli -valitsin aktiivinen. Valitse "Teksti" avataksesi saavutettavan paikkakartan.';
      }
    }
  });

})();
