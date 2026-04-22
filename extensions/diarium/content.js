// =============================================================================
// Diarium-saavutettavuuslaajennus – content.js
//
// Rakenne: yksi nimiavaruus (DiariumA11y) jonka alla nimetyt moduulit.
// Uuden ominaisuuden lisääminen:
//   1. Lisää uusi moduuliobjekti DiariumA11y:n alle.
//   2. Rekisteröi mahdollinen pikanäppäin keyboard-moduulissa.
//   3. Kutsu moduulin init() DiariumA11y.init():ssa jos tarvitaan.
// Ominaisuuden poistaminen:
//   1. Poista moduuliobjekti.
//   2. Poista pikanäppäin keyboard-moduulista.
//   3. Poista kutsu DiariumA11y.init():sta.
//
// Moduulit:
//   core           – announce, isAltOnly, focusWhenReady, waitForElement, activateNavLink
//   styles         – tyylilehdet dialogeja ja komponentteja varten
//   intercom       – Intercom-widget piilotus (Alt+I)
//   customerList   – Asiakasluettelo-dialogi (Alt+L)
//   searchAnnouncer– Hakutulosten automaattinen ilmoitus
//   calendarUtils  – Kalenterin yhteiset apufunktiot (getWorkerName, simulateClick)
//   calendarList   – Kalenteritapahtumaluettelo (Alt+K)
//   workShiftAdd   – Työvuoron lisääminen (Alt+N, lataa_vuorot)
//   bookingTree    – Uusi varaus puunäkymästä (Alt+N, kalenteri)
//   dropzone       – Dropzone-saavutettavuuskorjaus
//   listView       – Listanäkymän h5-otsikot, järjestysradiot, Tänään-painike
//   calendarNav    – Kalenterin navigaatiopainikkeet + pikanäppäimet
//   navH5          – Listanäkymä-alivalikkolinkin h5-otsikko
//   select2        – Varausikkunan Select2-valikkojen korvaus
//   kehys          – Varausikkunan span.kehys-painikkeet
//   medicalSelect  – Potilaskertomusmodaalin valikkojen saavutettavuus
//   keyboard       – Globaalit pikanäppäimet
//   help           – Ohjeikkuna (Alt+H)
// =============================================================================

"use strict";

const DiariumA11y = {};

// ---------------------------------------------------------------------------
// Moduuli: core
// Yhteiset apufunktiot, joita muut moduulit käyttävät.
// ---------------------------------------------------------------------------
DiariumA11y.core = {

  // Ilmoittaa ruudunlukijalle viestin aria-live-alueen kautta.
  announce(message, urgency) {
    urgency = urgency || "polite";
    let region = document.getElementById("diar-ext-live");
    if (!region) {
      region = document.createElement("div");
      region.id = "diar-ext-live";
      region.setAttribute("aria-live", urgency);
      region.setAttribute("aria-atomic", "true");
      region.setAttribute("role", "status");
      Object.assign(region.style, {
        position: "absolute", width: "1px", height: "1px", padding: "0",
        margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap", border: "0",
      });
      document.body.appendChild(region);
    }
    region.textContent = "";
    requestAnimationFrame(() => { region.textContent = message; });
    setTimeout(() => { region.textContent = ""; }, 4000);
  },

  // Palauttaa true, jos painettu näppäin on Alt+X ilman muita modifier-näppäimiä.
  isAltOnly(e) {
    return e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey;
  },

  // Odottaa elementin ilmestymistä ja siirtää siihen fokuksen.
  focusWhenReady(selector, maxWaitMs) {
    maxWaitMs = maxWaitMs || 3000;
    const started = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) { clearInterval(interval); el.focus(); }
      else if (Date.now() - started > maxWaitMs) clearInterval(interval);
    }, 50);
  },

  // Odottaa elementin ilmestymistä ja kutsuu callback-funktiota.
  waitForElement(selector, maxWaitMs, callback) {
    maxWaitMs = maxWaitMs || 5000;
    const started = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) { clearInterval(interval); callback(el); }
      else if (Date.now() - started > maxWaitMs) {
        clearInterval(interval);
        DiariumA11y.core.announce("Sivun lataus kesti liian kauan.", "assertive");
      }
    }, 100);
  },

  // Etsii navigointilinkin tekstin perusteella ja klikkaa sitä.
  activateNavLink(text) {
    const links = document.querySelectorAll("a.n-font-weight-heading");
    const target = Array.from(links).find(a => a.textContent.trim() === text);
    if (target) { target.click(); }
    else { DiariumA11y.core.announce("Navigointilinkkiä ei löydy: " + text, "assertive"); }
  },
};

// ---------------------------------------------------------------------------
// Moduuli: styles
// Tyylilehdet dialogeja ja komponentteja varten.
// Kaikki inject*-metodit ovat idempotentteja (tarkistavat id:n ensin).
// ---------------------------------------------------------------------------
DiariumA11y.styles = {

  // Asiakasluettelon dialogityylilehti
  injectListDialog() {
    if (document.getElementById("diar-ext-styles")) return;
    const style = document.createElement("style");
    style.id = "diar-ext-styles";
    style.textContent = `
      #diar-list-dialog {
        padding: 0; border: 2px solid #333; border-radius: 8px; background: #fff;
        width: min(660px, 94vw); max-height: 80vh; display: flex; flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.30); overflow: hidden;
      }
      #diar-list-dialog::backdrop { background: rgba(0,0,0,0.50); }
      #diar-list-header { padding: 14px 18px 10px; border-bottom: 1px solid #ddd; flex-shrink: 0; }
      #diar-list-heading { margin: 0 0 4px; font-size: 1.05rem; font-family: 'Segoe UI', Arial, sans-serif; color: #111; }
      #diar-list-hint { margin: 0; font-size: 0.82rem; font-family: 'Segoe UI', Arial, sans-serif; color: #555; }
      #diar-list-ul { list-style: none; padding: 6px 0; margin: 0; overflow-y: auto; flex: 1; }
      .diar-contact-btn {
        width: 100%; text-align: left; padding: 10px 18px; border: none; border-bottom: 1px solid #f0f0f0;
        cursor: pointer; background: #fff; font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 0.93rem; color: #111; border-radius: 0;
      }
      #diar-list-ul li:last-child .diar-contact-btn { border-bottom: none; }
      .diar-contact-btn:focus { background: #1a5fb4; color: #fff; outline: 3px solid #0a3d8a; outline-offset: -3px; }
      .diar-contact-btn:hover:not(:focus) { background: #d0e4ff; }
      #diar-list-footer { padding: 7px 18px; font-size: 0.8rem; color: #666; border-top: 1px solid #ddd; font-family: 'Segoe UI', Arial, sans-serif; flex-shrink: 0; }
    `;
    document.head.appendChild(style);
  },

  // Kalenterin ja työvuorodialogien tyylilehti
  ensureCalStyles() {
    if (document.getElementById("diar-cal-styles")) return;
    const s = document.createElement("style");
    s.id = "diar-cal-styles";
    s.textContent = `
      #diar-cal-dialog::backdrop,
      #diar-shift-add-dialog::backdrop { background: rgba(0,0,0,0.50); }
      #diar-cal-header, #diar-shift-add-header { padding: 14px 18px 10px; border-bottom: 1px solid #ddd; flex-shrink: 0; }
      #diar-cal-heading, #diar-shift-add-heading { margin: 0 0 4px; font-size: 1.05rem; font-family: 'Segoe UI', Arial, sans-serif; color: #111; }
      #diar-cal-hint, #diar-shift-add-hint { margin: 0; font-size: 0.82rem; font-family: 'Segoe UI', Arial, sans-serif; color: #555; }
      #diar-cal-ul, #diar-shift-add-ul { list-style: none; padding: 6px 0; margin: 0; overflow-y: auto; flex: 1; }
      .diar-cal-btn, .diar-shift-add-btn {
        width: 100%; text-align: left; padding: 10px 18px; border: none; border-bottom: 1px solid #f0f0f0;
        cursor: pointer; background: #fff; font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 0.90rem; color: #111; border-radius: 0;
      }
      #diar-cal-ul li:last-child .diar-cal-btn,
      #diar-shift-add-ul li:last-child .diar-shift-add-btn { border-bottom: none; }
      .diar-cal-btn:focus, .diar-shift-add-btn:focus { background: #1a5fb4; color: #fff; outline: 3px solid #0a3d8a; outline-offset: -3px; }
      .diar-cal-btn:hover:not(:focus), .diar-shift-add-btn:hover:not(:focus) { background: #d0e4ff; }
      #diar-cal-footer, #diar-shift-add-footer { padding: 7px 18px; font-size: 0.8rem; color: #666; border-top: 1px solid #ddd; font-family: 'Segoe UI', Arial, sans-serif; flex-shrink: 0; }
    `;
    document.head.appendChild(s);
  },

  // Puunäkymän tyylilehti (Alt+N, kalenteri)
  injectTreeStyles() {
    if (document.getElementById("diar-tree-styles")) return;
    const style = document.createElement("style");
    style.id = "diar-tree-styles";
    style.textContent = `
      #diar-tree-dialog {
        padding: 0; border: 2px solid #333; border-radius: 8px; background: #fff;
        width: min(660px, 94vw); max-height: 80vh; display: flex; flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.30); overflow: hidden;
      }
      #diar-tree-dialog::backdrop { background: rgba(0,0,0,0.50); }
      .diar-tree { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }
      .diar-tree-group { list-style: none; padding: 0; margin: 0; display: none; }
      .diar-treeitem {
        padding: 8px 18px; cursor: pointer; border-bottom: 1px solid #f0f0f0;
        font-family: 'Segoe UI', Arial, sans-serif; font-size: 0.93rem; color: #111; outline: none;
      }
      .diar-treeitem[aria-expanded="true"] + .diar-tree-group { display: block; }
      .diar-tree-icon { display: inline-block; width: 1.2em; font-size: 0.8em; transition: transform 0.1s; }
      .diar-treeitem[aria-expanded="true"] .diar-tree-icon { transform: rotate(90deg); }
      .diar-treeitem.is-time { padding-left: 40px; font-size: 0.88rem; border-bottom: 1px dashed #eee; }
      .diar-treeitem:focus { background: #1a5fb4; color: #fff; outline: 3px solid #0a3d8a; outline-offset: -3px; }
      .diar-treeitem:hover:not(:focus) { background: #d0e4ff; }
    `;
    document.head.appendChild(style);
  },

  // Listanäkymän h5-otsikot ja järjestysradiopainikkeet
  injectListViewStyles() {
    if (document.getElementById("diar-listview-styles")) return;
    const style = document.createElement("style");
    style.id = "diar-listview-styles";
    style.textContent = `
      .diar-list-h5 { margin: 0 0 1px; padding: 0; font-size: 0.93rem; line-height: 1.3; }
      .diar-list-h5-link { color: #0d2b5e; font-weight: 700; text-decoration: none; display: block; }
      .diar-list-h5-link:hover, .diar-list-h5-link:focus {
        color: #1a5fb4; text-decoration: underline;
        outline: 2px solid #1a5fb4; outline-offset: 1px;
      }
      #diar-sort-widget { margin: 8px 0 4px; clear: both; }
      #diar-sort-fieldset {
        border: 1px solid #bbb; border-radius: 4px; padding: 5px 14px 8px;
        display: inline-block; background: #f8f9fb; font-family: 'Segoe UI', Arial, sans-serif;
      }
      #diar-sort-fieldset legend { font-size: 0.83rem; font-weight: 700; color: #333; padding: 0 4px; }
      .diar-sort-label {
        font-size: 0.88rem; color: #222; cursor: pointer; margin-right: 14px;
        display: inline-flex; align-items: center; gap: 5px;
      }
      .diar-sort-label input[type="radio"] { margin: 0; }
    `;
    document.head.appendChild(style);
  },

  // Potilaskertomuksen multiselect: piilottaa Vue-elementin pysyvästi
  injectMedicalSelectStyle() {
    if (document.getElementById("diar-ms-global-style")) return;
    const st = document.createElement("style");
    st.id = "diar-ms-global-style";
    st.textContent = "div.multiselect.medical-record-multi-select { display: none !important; }";
    document.head.appendChild(st);
  },
};

// ---------------------------------------------------------------------------
// Moduuli: intercom
// Intercom-widget piilotus (Alt+I).
// ---------------------------------------------------------------------------
DiariumA11y.intercom = {

  KEY: "diariumIntercomHidden",
  SELECTORS: ["#intercom-container", "#intercom-css-container", "#intercom-frame"],
  _hidden: false,

  _getElements() {
    return this.SELECTORS.flatMap(s => Array.from(document.querySelectorAll(s)));
  },

  _applyVisibility(hide) {
    this._getElements().forEach(el => {
      el.style.setProperty("display", hide ? "none" : "", hide ? "important" : "");
    });
  },

  toggle() {
    this._hidden = !this._hidden;
    sessionStorage.setItem(this.KEY, this._hidden);
    this._applyVisibility(this._hidden);
    DiariumA11y.core.announce(
      this._hidden ? "Intercom-widget piilotettu." : "Intercom-widget näytetty."
    );
  },

  init() {
    this._hidden = sessionStorage.getItem(this.KEY) === "true";
    this._applyVisibility(this._hidden);

    // Seurataan DOM-muutoksia niin kauan kuin kaikki elementit ovat paikalla
    const obs = new MutationObserver(() => {
      if (this._hidden) this._applyVisibility(true);
      if (this.SELECTORS.every(s => document.querySelector(s))) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: false });
    setTimeout(() => obs.disconnect(), 15000);
  },
};

// ---------------------------------------------------------------------------
// Moduuli: customerList
// Ruudunlukijaystävällinen asiakasluettelo (Alt+L).
// ---------------------------------------------------------------------------
DiariumA11y.customerList = {

  _dialog: null,
  _rows: [],
  _activeIndex: 0,

  _collectRows() {
    const tbody = document.querySelector("#datatable tbody");
    if (!tbody) return [];
    const rows = [];
    tbody.querySelectorAll("tr").forEach(tr => {
      const cells = Array.from(tr.querySelectorAll("td"));
      if (!cells.length) return;
      const etu  = cells[1] ? cells[1].textContent.trim() : "";
      const suku = cells[2] ? cells[2].textContent.trim() : "";
      const extras = [];
      if (cells[4] && cells[4].textContent.trim()) extras.push("puh. " + cells[4].textContent.trim());
      if (cells[5] && cells[5].textContent.trim()) extras.push(cells[5].textContent.trim());
      let label = [suku, etu].filter(Boolean).join(" ");
      if (extras.length) label += " (" + extras.join(", ") + ")";
      const sukunimiTd = cells[2] || cells[0];
      rows.push({ label, tr, sukunimiTd });
    });
    return rows;
  },

  _buildDialog(rows) {
    const dialog = document.createElement("dialog");
    dialog.id = "diar-list-dialog";
    dialog.setAttribute("role", "application");
    dialog.setAttribute("aria-label", "Asiakasluettelo");

    const header = document.createElement("div");
    header.id = "diar-list-header";
    const h2 = document.createElement("h2");
    h2.id = "diar-list-heading";
    h2.textContent = "Asiakasluettelo";
    const hint = document.createElement("p");
    hint.id = "diar-list-hint";
    hint.textContent = "Nuolet: selaa | Enter: avaa asiakas | Esc: sulje | Kirjain: hyppää nimeen";
    header.appendChild(h2);
    header.appendChild(hint);

    const ul = document.createElement("ul");
    ul.id = "diar-list-ul";
    rows.forEach(({ label }, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "diar-contact-btn";
      btn.setAttribute("data-index", i);
      btn.setAttribute("aria-label", label);
      btn.textContent = label;
      btn.type = "button";
      btn.addEventListener("click", () => this._activateRow(i));
      li.appendChild(btn);
      ul.appendChild(li);
    });

    const footer = document.createElement("div");
    footer.id = "diar-list-footer";
    const info = document.querySelector("#datatable_info");
    footer.textContent = info ? info.textContent.trim() : rows.length + " asiakasta";

    dialog.appendChild(header);
    dialog.appendChild(ul);
    dialog.appendChild(footer);
    return dialog;
  },

  _getButtons() {
    if (!this._dialog) return [];
    return Array.from(this._dialog.querySelectorAll(".diar-contact-btn"));
  },

  _setActive(index) {
    if (!this._rows.length) return;
    index = Math.max(0, Math.min(index, this._rows.length - 1));
    this._activeIndex = index;
    const buttons = this._getButtons();
    if (buttons[this._activeIndex]) {
      buttons[this._activeIndex].focus();
      buttons[this._activeIndex].scrollIntoView({ block: "nearest" });
    }
  },

  _activateRow(index) {
    const row = this._rows[index];
    if (!row) return;
    const target = row.sukunimiTd || row.tr.querySelector("td");
    this.close();
    setTimeout(() => { target.click(); }, 50);
  },

  _handleKey(e) {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); this._setActive(this._activeIndex + 1); break;
      case "ArrowUp":   e.preventDefault(); this._setActive(this._activeIndex - 1); break;
      case "Home":      e.preventDefault(); this._setActive(0); break;
      case "End":       e.preventDefault(); this._setActive(this._rows.length - 1); break;
      case "Enter":     e.preventDefault(); this._activateRow(this._activeIndex); break;
      case "Escape":    e.preventDefault(); this.close(); break;
      default:
        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
          const ch = e.key.toLowerCase();
          for (let offset = 1; offset <= this._rows.length; offset++) {
            const i = (this._activeIndex + offset) % this._rows.length;
            if (this._rows[i].label.toLowerCase().startsWith(ch)) {
              this._setActive(i);
              break;
            }
          }
        }
    }
  },

  open() {
    if (this._dialog) return;
    this._rows = this._collectRows();
    if (!this._rows.length) {
      DiariumA11y.core.announce("Taulukko on tyhjä. Hae ensin asiakkaita hakuvalinnoilla.", "assertive");
      return;
    }
    DiariumA11y.styles.injectListDialog();
    this._activeIndex = 0;
    this._dialog = this._buildDialog(this._rows);
    document.body.appendChild(this._dialog);
    this._dialog.showModal();
    this._dialog.addEventListener("keydown", e => this._handleKey(e));
    this._dialog.addEventListener("close", () => {
      this._dialog.remove();
      this._dialog = null;
      this._rows = [];
    });
    setTimeout(() => this._setActive(0), 50);
  },

  close() {
    if (!this._dialog) return;
    this._dialog.close();
    const tbl = document.querySelector("#datatable");
    if (tbl) { tbl.setAttribute("tabindex", "-1"); tbl.focus(); }
  },
};

// ---------------------------------------------------------------------------
// Moduuli: searchAnnouncer
// Hakutulosten automaattinen ilmoitus (list_customers -sivu).
// ---------------------------------------------------------------------------
DiariumA11y.searchAnnouncer = {

  init() {
    const waitForDatatable = setInterval(() => {
      const infoEl = document.querySelector("#datatable_info");
      if (!infoEl) return;
      clearInterval(waitForDatatable);
      let lastText = "";
      let announceTimer = null;
      function maybeAnnounce() {
        const text = infoEl.textContent.trim();
        if (!text || text === lastText) return;
        lastText = text;
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => {
          DiariumA11y.core.announce(text);
          lastText = "";
        }, 300);
      }
      const obs = new MutationObserver(maybeAnnounce);
      obs.observe(infoEl, { childList: true, subtree: true, characterData: true });
    }, 500);
    setTimeout(() => clearInterval(waitForDatatable), 20000);
  },
};

// ---------------------------------------------------------------------------
// Moduuli: calendarUtils
// Kalenterin yhteiset apufunktiot.
// ---------------------------------------------------------------------------
DiariumA11y.calendarUtils = {

  // Hakee työntekijän nimen tapahtumaelementin id-attribuutista.
  // Diariumin tapahtuman id-muoto: "eventId|userId|...", esim. "87|21|0|..."
  getWorkerNameFromEvent(eventEl) {
    const idAttr = eventEl.getAttribute("id") || "";
    const userId = idAttr.split("|")[1];
    if (!userId) return "";
    const workerTh = document.querySelector(`th.user-name-col[id*="-${userId}"]`);
    if (workerTh) return workerTh.getAttribute("title") || workerTh.textContent.trim();
    return "";
  },

  // Simuloi hiiriklikkauksen elementille annetuissa koordinaateissa.
  // Käyttää elementFromPoint:ia löytääkseen tarkan kohde-elementin.
  simulateClickOnElement(el, customLabel, overrideX, overrideY) {
    const rect = el.getBoundingClientRect();
    const x = overrideX !== undefined ? overrideX : rect.left + rect.width / 2;
    const y = overrideY !== undefined ? overrideY : rect.top + rect.height / 2;

    let targetEl = el;
    if (overrideX !== undefined && overrideY !== undefined) {
      const pointEl = document.elementFromPoint(x, y);
      if (pointEl && !pointEl.closest("#diar-ext-live") && !pointEl.closest("#diar-tree-dialog")) {
        targetEl = pointEl;
      }
    }

    ["mousedown", "mouseup", "click"].forEach(evtType => {
      targetEl.dispatchEvent(new MouseEvent(evtType, {
        bubbles: true, cancelable: true, view: window, clientX: x, clientY: y,
      }));
    });

    const label = customLabel || targetEl.getAttribute("aria-label") || targetEl.textContent.trim().replace(/\s+/g, " ");
    DiariumA11y.core.announce("Valittu: " + label, "polite");
  },
};

// ---------------------------------------------------------------------------
// Moduuli: calendarList
// Kalenteritapahtumaluettelo (Alt+K).
// Toimii kalenterin viikko-/päivänäkymässä sekä Työvuorot-sivulla.
// ---------------------------------------------------------------------------
DiariumA11y.calendarList = {

  _dialog: null,
  _rows: [],
  _activeIndex: 0,

  // ── Tapahtumien kerääminen – viikkonäkymä ──────────────────────────────

  _collectWeekViewEvents() {
    const events = [];
    const bgDayCols = Array.from(document.querySelectorAll(".fc-time-grid .fc-bg td.fc-day"));

    document.querySelectorAll("a.fc-time-grid-event.kalenteriblokki").forEach(el => {
      const rect = el.getBoundingClientRect();
      const eventCenterX = rect.left + (rect.width / 2);

      let matchedDayCol = null;
      bgDayCols.forEach(dayTd => {
        const dayRect = dayTd.getBoundingClientRect();
        if (eventCenterX >= dayRect.left && eventCenterX <= dayRect.right) matchedDayCol = dayTd;
      });

      const timeSpan = el.querySelector(".fc-time span");
      const time = timeSpan ? timeSpan.textContent.trim() : "";
      const infoIcon = el.querySelector(".varaus_info");
      const type = infoIcon ? (infoIcon.getAttribute("title") || "").trim() : "";
      const titleEl = el.querySelector(".fc-title");
      const customer = titleEl ? titleEl.textContent.trim() : "";

      let dayName = "";
      let dateNum = 0;
      if (matchedDayCol) {
        const dateStr = matchedDayCol.getAttribute("data-date") || "";
        dateNum = parseInt(dateStr.replace(/-/g, ""), 10) || 0;
        if (dateStr) {
          const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (parts) {
            const PAIVAT = ["Sunnuntai","Maanantai","Tiistai","Keskiviikko","Torstai","Perjantai","Lauantai"];
            const d = new Date(dateStr);
            dayName = PAIVAT[d.getDay()] + " " + parseInt(parts[3], 10) + "." + parseInt(parts[2], 10) + ".";
          }
        }
      }

      const userName = DiariumA11y.calendarUtils.getWorkerNameFromEvent(el);
      const startTimeStr = time.split(" ")[0] || "00:00";
      const [hh = 0, mm = 0] = startTimeStr.split(":").map(Number);
      const sortKey = dateNum * 10000 + hh * 100 + mm;

      const labelParts = [];
      if (dayName) labelParts.push(dayName);
      if (time) labelParts.push(time);
      if (customer) labelParts.push("Asiakas: " + customer);
      if (type) labelParts.push("Tyyppi: " + type);
      if (userName) labelParts.push("Työntekijä: " + userName);

      const label = labelParts.join(" | ");
      events.push({ label, aktivointiLinkki: el, tr: null, sortKey });
    });

    events.sort((a, b) => a.sortKey - b.sortKey);
    return events;
  },

  // ── Tapahtumien kerääminen – työvuorot, kuukausinäkymä ─────────────────

  _collectWorkShiftMonthEvents() {
    const events = [];
    const DAYS = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];

    document.querySelectorAll(".fc-month-view .fc-week, .fc-basic-view .fc-week").forEach(weekRow => {
      const bgCells = Array.from(weekRow.querySelectorAll(".fc-bg td.fc-day"));
      const contentSkeleton = weekRow.querySelector(".fc-content-skeleton");
      if (!contentSkeleton) return;

      contentSkeleton.querySelectorAll("tbody tr").forEach(tr => {
        const tds = Array.from(tr.querySelectorAll("td"));
        tds.forEach((td, tdIdx) => {
          if (tdIdx === 0) return;
          const dayIdx = tdIdx - 1;
          const bgCell = bgCells[dayIdx];
          const dateStr = bgCell ? bgCell.getAttribute("data-date") : null;

          td.querySelectorAll("a.fc-day-grid-event").forEach(eventLink => {
            const timeEl  = eventLink.querySelector(".fc-time");
            const titleEl = eventLink.querySelector(".fc-title");
            const time    = timeEl  ? timeEl.textContent.trim()  : "";
            const title   = titleEl ? titleEl.textContent.trim() : "";
            const infoEl  = eventLink.querySelector(".info-icon-cal");
            const note    = infoEl ? (infoEl.getAttribute("title") || "").trim() : "";

            let dateLabel = "";
            if (dateStr) {
              const d = new Date(dateStr + "T00:00:00");
              dateLabel = DAYS[d.getDay()] + " " + d.getDate() + "." + (d.getMonth() + 1) + ".";
            }

            const parts = [dateLabel, time, title];
            if (note) parts.push("(" + note + ")");
            const label = parts.filter(Boolean).join(" ");
            if (label) events.push({ label, eventLink, dateStr: dateStr || "" });
          });
        });
      });
    });

    events.sort((a, b) => (a.dateStr < b.dateStr ? -1 : a.dateStr > b.dateStr ? 1 : 0));
    return events;
  },

  // ── Tapahtumien kerääminen – työvuorot, viikkonäkymä ───────────────────

  _collectWorkShiftWeekEvents() {
    const events = [];
    const cal = document.querySelector("#calendar");
    if (!cal) return events;

    const bgDayCols = Array.from(cal.querySelectorAll(".fc-time-grid .fc-bg td.fc-day"));
    const dayHeaderEls = Array.from(cal.querySelectorAll("th.fc-day-header"));
    const eventLinks = Array.from(cal.querySelectorAll("a.fc-time-grid-event"));
    if (!eventLinks.length) return events;

    eventLinks.forEach(eventLink => {
      const rect = eventLink.getBoundingClientRect();
      const eventCenterX = rect.left + rect.width / 2;

      let dayLabel = "";
      bgDayCols.forEach((col, i) => {
        const colRect = col.getBoundingClientRect();
        if (eventCenterX >= colRect.left && eventCenterX < colRect.right) {
          dayLabel = dayHeaderEls[i] ? dayHeaderEls[i].textContent.trim() : "";
        }
      });

      const timeEl  = eventLink.querySelector(".fc-time span") || eventLink.querySelector(".fc-time");
      const titleEl = eventLink.querySelector(".fc-title");
      const time    = timeEl  ? timeEl.textContent.trim()  : "";
      const title   = titleEl ? titleEl.textContent.trim() : "";
      const infoEl  = eventLink.querySelector(".info-icon-cal");
      const note    = infoEl ? (infoEl.getAttribute("title") || "").trim() : "";

      const parts = [dayLabel, time, title];
      if (note) parts.push("(" + note + ")");
      const label = parts.filter(Boolean).join(" ");
      if (label) events.push({ label, eventLink });
    });

    return events;
  },

  // ── Dialogin rakentaminen ───────────────────────────────────────────────

  _buildDialog(rows) {
    const dialog = document.createElement("dialog");
    dialog.id = "diar-cal-dialog";
    dialog.setAttribute("role", "application");
    dialog.setAttribute("aria-label", "Kalenteritapahtumat");
    dialog.style.cssText =
      "padding: 0; border: 2px solid #333; border-radius: 8px; background: #fff;" +
      "width: min(760px, 96vw); max-height: 80vh; display: flex; flex-direction: column;" +
      "box-shadow: 0 8px 32px rgba(0,0,0,0.30); overflow: hidden;";

    DiariumA11y.styles.injectListDialog();
    DiariumA11y.styles.ensureCalStyles();

    const header = document.createElement("div");
    header.id = "diar-cal-header";
    const h2 = document.createElement("h2");
    h2.id = "diar-cal-heading";
    h2.textContent = "Kalenteritapahtumat";
    const hint = document.createElement("p");
    hint.id = "diar-cal-hint";
    hint.textContent = "Nuolet: selaa  |  Enter: avaa tapahtuma  |  Esc: sulje  |  Kirjain: hyppää päivämäärään";
    header.appendChild(h2);
    header.appendChild(hint);

    const ul = document.createElement("ul");
    ul.id = "diar-cal-ul";
    rows.forEach(({ label }, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "diar-cal-btn";
      btn.setAttribute("data-index", i);
      btn.setAttribute("aria-label", label);
      btn.textContent = label;
      btn.type = "button";
      btn.addEventListener("click", () => this._activateRow(i));
      li.appendChild(btn);
      ul.appendChild(li);
    });

    const footer = document.createElement("div");
    footer.id = "diar-cal-footer";
    footer.textContent = rows.length + " tapahtumaa";

    dialog.appendChild(header);
    dialog.appendChild(ul);
    dialog.appendChild(footer);
    return dialog;
  },

  // ── Dialogin vuorovaikutus ──────────────────────────────────────────────

  _setActive(index) {
    if (!this._rows.length) return;
    index = Math.max(0, Math.min(index, this._rows.length - 1));
    this._activeIndex = index;
    const buttons = this._dialog
      ? Array.from(this._dialog.querySelectorAll(".diar-cal-btn"))
      : [];
    if (buttons[this._activeIndex]) {
      buttons[this._activeIndex].focus();
      buttons[this._activeIndex].scrollIntoView({ block: "nearest" });
    }
  },

  _activateRow(index) {
    const row = this._rows[index];
    if (!row) return;
    this.close();
    setTimeout(() => {
      if (row.eventLink) {
        row.eventLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      } else if (row.aktivointiLinkki) {
        row.aktivointiLinkki.click();
      } else if (row.tr) {
        row.tr.querySelector("a.kalenteriblokki").click();
      }
    }, 50);
  },

  _handleKey(e) {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); this._setActive(this._activeIndex + 1); break;
      case "ArrowUp":   e.preventDefault(); this._setActive(this._activeIndex - 1); break;
      case "Home":      e.preventDefault(); this._setActive(0); break;
      case "End":       e.preventDefault(); this._setActive(this._rows.length - 1); break;
      case "Enter":     e.preventDefault(); this._activateRow(this._activeIndex); break;
      case "Escape":    e.preventDefault(); this.close(); break;
      default:
        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
          const ch = e.key.toLowerCase();
          for (let offset = 1; offset <= this._rows.length; offset++) {
            const i = (this._activeIndex + offset) % this._rows.length;
            if (this._rows[i].label.toLowerCase().startsWith(ch)) {
              this._setActive(i);
              break;
            }
          }
        }
    }
  },

  _showDialog(rows, heading, hintText, footerText) {
    this._rows = rows;
    this._activeIndex = 0;
    this._dialog = this._buildDialog(rows);

    const h = this._dialog.querySelector("#diar-cal-heading");
    if (h) h.textContent = heading;
    const hint = this._dialog.querySelector("#diar-cal-hint");
    if (hint) hint.textContent = hintText;
    const footer = this._dialog.querySelector("#diar-cal-footer");
    if (footer) footer.textContent = footerText;

    document.body.appendChild(this._dialog);
    this._dialog.showModal();
    this._dialog.addEventListener("keydown", e => this._handleKey(e));
    this._dialog.addEventListener("close", () => {
      this._dialog.remove();
      this._dialog = null;
      this._rows = [];
    });
    setTimeout(() => this._setActive(0), 50);
  },

  // ── Julkiset avausmetodit ───────────────────────────────────────────────

  open() {
    if (this._dialog) return;
    if (window.location.pathname.includes("lataa_vuorot")) {
      this._openWorkShiftList();
    } else if (document.querySelector(".fc-agendaWeek-view, .fc-agendaDay-view")) {
      this._openWeekViewList();
    } else {
      DiariumA11y.core.announce("Alt+K toimii vain kalenterin viikko-, päivä- tai työvuoronäkymässä.", "assertive");
    }
  },

  _openWeekViewList() {
    const rows = this._collectWeekViewEvents();
    if (!rows.length) {
      DiariumA11y.core.announce("Näkymässä ei ole tapahtumia. Yritä listanäkymää, jos tapahtumat eivät lataudu tähän.", "assertive");
      return;
    }
    this._showDialog(
      rows,
      "Kalenterin tapahtumat",
      "Nuolet: selaa  |  Enter: avaa tapahtuma  |  Esc: sulje  |  Kirjain: hyppää päivään",
      rows.length + " tapahtumaa"
    );
  },

  _openWorkShiftList() {
    const inWeekView = !!document.querySelector("#calendar .fc-agendaWeek-view, #calendar .fc-agendaDay-view");
    const rows = inWeekView ? this._collectWorkShiftWeekEvents() : this._collectWorkShiftMonthEvents();
    if (!rows.length) {
      DiariumA11y.core.announce("Työvuoronäkymässä ei ole tapahtumia.", "assertive");
      return;
    }
    this._showDialog(
      rows,
      "Työvuorot",
      "Nuolet: selaa  |  Enter: avaa työvuoro  |  Esc: sulje  |  Kirjain: hyppää päivään",
      rows.length + " työvuoroa"
    );
  },

  close() {
    if (!this._dialog) return;
    this._dialog.close();
  },
};

// ---------------------------------------------------------------------------
// Moduuli: workShiftAdd
// Työvuoron lisääminen päiväluettelosta (Alt+N, Työvuorot-sivu).
// ---------------------------------------------------------------------------
DiariumA11y.workShiftAdd = {

  _dialog: null,
  _rows: [],
  _idx: 0,

  _collectDays() {
    const DAYS = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
    const days = [];
    const seen = new Set();
    document.querySelectorAll(".fc-bg td.fc-day[data-date]").forEach(td => {
      const dateStr = td.getAttribute("data-date");
      if (!dateStr || seen.has(dateStr)) return;
      if (td.classList.contains("fc-other-month")) return;
      seen.add(dateStr);
      const d = new Date(dateStr + "T00:00:00");
      const label = DAYS[d.getDay()] + " " + d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();
      days.push({ dateStr, label, td });
    });
    return days.sort((a, b) => (a.dateStr < b.dateStr ? -1 : 1));
  },

  _setActive(idx) {
    if (!this._rows.length) return;
    this._idx = Math.max(0, Math.min(idx, this._rows.length - 1));
    const btns = this._dialog
      ? Array.from(this._dialog.querySelectorAll(".diar-shift-add-btn"))
      : [];
    if (btns[this._idx]) {
      btns[this._idx].focus();
      btns[this._idx].scrollIntoView({ block: "nearest" });
    }
  },

  _activateDay(idx) {
    const row = this._rows[idx];
    if (!row) return;
    this.close();
    setTimeout(() => {
      this._triggerDayOpen(row.td, row.label);
      this._watchForEditDialog();
    }, 80);
  },

  _triggerDayOpen(td, dayLabel) {
    const tdRect = td.getBoundingClientRect();
    const x = tdRect.left + tdRect.width / 2;

    // Vaihe 1: klikataan päiväsolun yläosaa
    DiariumA11y.calendarUtils.simulateClickOnElement(td, dayLabel, x, tdRect.top + 15);

    // Vaihe 2: etsitään div.fc-time samassa päiväsarakkeessa ja klikataan sitä
    setTimeout(() => {
      const allFcTimes = Array.from(document.querySelectorAll("div.fc-time"));
      let target = allFcTimes.find(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 &&
               r.left >= tdRect.left - 5 && r.right <= tdRect.right + 5;
      });
      if (!target) {
        target = allFcTimes.find(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      }
      if (target) DiariumA11y.calendarUtils.simulateClickOnElement(target, dayLabel);
    }, 150);
  },

  _watchForEditDialog() {
    let tries = 0;
    setTimeout(() => {
      const interval = setInterval(() => {
        tries++;
        const uiDlg = document.querySelector(".ui-dialog[aria-describedby='edit_dialog']");
        const isVisible = uiDlg && (
          uiDlg.style.display === "block" ||
          (uiDlg.style.display !== "none" && uiDlg.offsetWidth > 0)
        );
        if (isVisible) {
          clearInterval(interval);
          DiariumA11y.core.announce(
            "Työvuoron lisääminen. Valitse tyyppi, alku- ja loppuaika, sitten Tallenna.",
            "assertive"
          );
          const first = uiDlg.querySelector(
            "select:not([tabindex='-1']), input:not([type='hidden']), textarea"
          );
          setTimeout(() => { if (first) first.focus(); else uiDlg.focus(); }, 100);
        } else if (tries > 30) {
          clearInterval(interval);
        }
      }, 100);
    }, 250);
  },

  _handleKey(e) {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); this._setActive(this._idx + 1); break;
      case "ArrowUp":   e.preventDefault(); this._setActive(this._idx - 1); break;
      case "Home":      e.preventDefault(); this._setActive(0); break;
      case "End":       e.preventDefault(); this._setActive(this._rows.length - 1); break;
      case "Enter":     e.preventDefault(); this._activateDay(this._idx); break;
      case "Escape":    e.preventDefault(); this.close(); break;
      default:
        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
          const ch = e.key.toLowerCase();
          for (let offset = 1; offset <= this._rows.length; offset++) {
            const i = (this._idx + offset) % this._rows.length;
            if (this._rows[i].label.toLowerCase().startsWith(ch)) {
              this._setActive(i);
              break;
            }
          }
        }
    }
  },

  open() {
    if (this._dialog) return;
    this._rows = this._collectDays();
    if (!this._rows.length) {
      DiariumA11y.core.announce(
        "Kalenterinäkymässä ei ole valittavia päiviä. Siirry Työvuorot-sivun viikkonäkymään.",
        "assertive"
      );
      return;
    }
    this._idx = 0;
    DiariumA11y.styles.ensureCalStyles();

    this._dialog = document.createElement("dialog");
    this._dialog.id = "diar-shift-add-dialog";
    this._dialog.setAttribute("role", "application");
    this._dialog.setAttribute("aria-label", "Lisää työvuoro – valitse päivä");
    this._dialog.style.cssText =
      "padding:0;border:2px solid #333;border-radius:8px;background:#fff;" +
      "width:min(560px,94vw);max-height:80vh;display:flex;flex-direction:column;" +
      "box-shadow:0 8px 32px rgba(0,0,0,0.30);overflow:hidden;";

    const header = document.createElement("div");
    header.id = "diar-shift-add-header";
    const h2 = document.createElement("h2");
    h2.id = "diar-shift-add-heading";
    h2.textContent = "Lisää työvuoro – valitse päivä";
    const hint = document.createElement("p");
    hint.id = "diar-shift-add-hint";
    hint.textContent = "Nuolet: selaa  |  Enter: valitse päivä  |  Esc: sulje  |  Kirjain: hyppää päivään";
    header.appendChild(h2);
    header.appendChild(hint);

    const ul = document.createElement("ul");
    ul.id = "diar-shift-add-ul";
    this._rows.forEach(({ label }, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "diar-shift-add-btn";
      btn.setAttribute("data-index", i);
      btn.setAttribute("aria-label", label);
      btn.textContent = label;
      btn.type = "button";
      btn.addEventListener("click", () => this._activateDay(i));
      li.appendChild(btn);
      ul.appendChild(li);
    });

    const footer = document.createElement("div");
    footer.id = "diar-shift-add-footer";
    footer.textContent = this._rows.length + " päivää";

    this._dialog.appendChild(header);
    this._dialog.appendChild(ul);
    this._dialog.appendChild(footer);
    document.body.appendChild(this._dialog);
    this._dialog.showModal();
    this._dialog.addEventListener("keydown", e => this._handleKey(e));
    this._dialog.addEventListener("close", () => {
      this._dialog.remove();
      this._dialog = null;
      this._rows = [];
    });
    setTimeout(() => this._setActive(0), 50);
  },

  close() {
    if (!this._dialog) return;
    this._dialog.close();
  },
};

// ---------------------------------------------------------------------------
// Moduuli: bookingTree
// Uusi varaus puunäkymästä (Alt+N, kalenterin viikko-/päivänäkymä).
// ---------------------------------------------------------------------------
DiariumA11y.bookingTree = {

  _dialog: null,
  _data: [],

  _getGridData() {
    const workerHeaders = Array.from(document.querySelectorAll("th.user-name-col"));
    if (!workerHeaders.length) return null;

    const times = Array.from(document.querySelectorAll(".fc-slats tr:not(.fc-minor)"));
    if (!times.length) return null;

    const dayHeaderEls = Array.from(document.querySelectorAll("th.fc-day-header:not(.fc-axis)"));
    const bgDays = Array.from(document.querySelectorAll(".fc-time-grid .fc-bg td.fc-day"));

    const tData = [];
    workerHeaders.forEach((th, colIndex) => {
      const idMatch = th.id.match(/user-header-(\d+)-(\d+)/);
      if (!idMatch) return;
      const dayIdx = parseInt(idMatch[1], 10);

      const dayHeader = dayHeaderEls[dayIdx];
      const dayName = dayHeader ? dayHeader.textContent.trim() : ("Päivä " + (dayIdx + 1));
      const workerName = th.getAttribute("title") || th.textContent.trim();

      const thRect = th.getBoundingClientRect();
      const dayX = thRect.left + thRect.width / 2;

      const bgDay = bgDays[dayIdx] || bgDays[0] || null;
      const bgRect = bgDay ? bgDay.getBoundingClientRect() : thRect;
      const dayY = bgRect.top + 15;

      const text = `${dayName} – ${workerName}`;
      const timeSlots = times.map((timeEl, timeIndex) => {
        const timeSpan = timeEl.querySelector(".fc-time span");
        const timeText = timeSpan ? timeSpan.textContent.trim() : ("Aika " + timeIndex);
        const timeRect = timeEl.getBoundingClientRect();
        return { timeEl, timeText, timeY: timeRect.top + (timeRect.height / 2), timeIndex };
      });

      tData.push({ dayEl: bgDay || th, dayText: text, dayX, dayY, dayIndex: colIndex, timeSlots });
    });

    return tData.length ? tData : null;
  },

  _executeBooking(timeEl) {
    const dIdx = parseInt(timeEl.dataset.dayIndex, 10);
    const tIdx = parseInt(timeEl.dataset.timeIndex, 10);
    const dayObj = this._data[dIdx];
    const timeObj = dayObj.timeSlots[tIdx];

    this._dialog.close();

    setTimeout(() => {
      DiariumA11y.calendarUtils.simulateClickOnElement(
        dayObj.dayEl, "Valittu: " + dayObj.dayText, dayObj.dayX, dayObj.dayY
      );
      setTimeout(() => {
        DiariumA11y.calendarUtils.simulateClickOnElement(
          timeObj.timeEl, "Aika: " + timeObj.timeText, dayObj.dayX, timeObj.timeY
        );
      }, 150);
    }, 50);
  },

  open() {
    if (this._dialog) return;
    this._data = this._getGridData();
    if (!this._data) {
      DiariumA11y.core.announce("Kalenterinäkymä ei ole auki tai aikoja ei löydy.", "assertive");
      return;
    }

    DiariumA11y.styles.injectTreeStyles();

    this._dialog = document.createElement("dialog");
    this._dialog.id = "diar-tree-dialog";
    this._dialog.setAttribute("role", "application");
    this._dialog.setAttribute("aria-label", "Tee varaus");

    const header = document.createElement("div");
    header.style.cssText = "padding: 14px 18px 10px; border-bottom: 1px solid #ddd; flex-shrink: 0;";
    const h2 = document.createElement("h2");
    h2.textContent = "Tee varaus (Puunäkymä)";
    h2.style.cssText = "margin: 0 0 4px; font-size: 1.05rem; font-family: 'Segoe UI', Arial, sans-serif; color: #111;";
    const hint = document.createElement("p");
    hint.textContent = "Ylös/Alas: selaa | Oikea: avaa sarake | Vasen: sulje sarake | Enter: valitse | Esc: sulje";
    hint.style.cssText = "margin: 0; font-size: 0.82rem; font-family: 'Segoe UI', Arial, sans-serif; color: #555;";
    header.appendChild(h2);
    header.appendChild(hint);

    const rootUl = document.createElement("ul");
    rootUl.className = "diar-tree";
    rootUl.setAttribute("role", "tree");
    rootUl.id = "diar-tree-root";

    this._data.forEach((day, dIdx) => {
      const dayLi = document.createElement("li");
      dayLi.className = "diar-treeitem";
      dayLi.setAttribute("role", "treeitem");
      dayLi.setAttribute("aria-expanded", "false");
      dayLi.setAttribute("tabindex", dIdx === 0 ? "0" : "-1");
      dayLi.dataset.isDay = "true";
      dayLi.dataset.dayIndex = dIdx;

      const iconSpan = document.createElement("span");
      iconSpan.className = "diar-tree-icon";
      iconSpan.setAttribute("aria-hidden", "true");
      iconSpan.textContent = "▶ ";

      const textSpan = document.createElement("span");
      textSpan.textContent = day.dayText;

      dayLi.appendChild(iconSpan);
      dayLi.appendChild(textSpan);

      const groupUl = document.createElement("ul");
      groupUl.className = "diar-tree-group";
      groupUl.setAttribute("role", "group");

      day.timeSlots.forEach((time, tIdx) => {
        const timeLi = document.createElement("li");
        timeLi.className = "diar-treeitem is-time";
        timeLi.setAttribute("role", "treeitem");
        timeLi.setAttribute("tabindex", "-1");
        timeLi.dataset.isTime = "true";
        timeLi.dataset.dayIndex = dIdx;
        timeLi.dataset.timeIndex = tIdx;
        timeLi.textContent = time.timeText;
        groupUl.appendChild(timeLi);
      });

      rootUl.appendChild(dayLi);
      rootUl.appendChild(groupUl);
    });

    const footer = document.createElement("div");
    footer.style.cssText = "padding: 7px 18px; font-size: 0.8rem; color: #666; border-top: 1px solid #ddd; font-family: 'Segoe UI', Arial, sans-serif; flex-shrink: 0;";
    footer.textContent = "Valitse sarakkeen päivä ja työntekijä, ja sitten kellonaika varaukselle.";

    this._dialog.appendChild(header);
    this._dialog.appendChild(rootUl);
    this._dialog.appendChild(footer);
    document.body.appendChild(this._dialog);
    this._dialog.showModal();

    // Fokushallinta
    const getVisibleItems = () =>
      Array.from(this._dialog.querySelectorAll(".diar-treeitem"))
        .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);

    const focusItem = (el) => {
      if (!el) return;
      this._dialog.querySelectorAll(".diar-treeitem").forEach(n => n.setAttribute("tabindex", "-1"));
      el.setAttribute("tabindex", "0");
      el.focus();
    };

    this._dialog.addEventListener("keydown", (e) => {
      const active = document.activeElement;
      if (!active || !active.classList.contains("diar-treeitem")) {
        if (e.key === "Escape") { e.preventDefault(); this._dialog.close(); }
        return;
      }

      const isDay = active.dataset.isDay === "true";
      const items = getVisibleItems();
      const currentIndex = items.indexOf(active);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (currentIndex < items.length - 1) focusItem(items[currentIndex + 1]);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (currentIndex > 0) focusItem(items[currentIndex - 1]);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (isDay && active.getAttribute("aria-expanded") === "false") {
            active.setAttribute("aria-expanded", "true");
            DiariumA11y.core.announce("Avattu: " + active.querySelector("span:not(.diar-tree-icon)").textContent, "polite");
          } else if (isDay) {
            focusItem(items[currentIndex + 1]);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (isDay && active.getAttribute("aria-expanded") === "true") {
            active.setAttribute("aria-expanded", "false");
            DiariumA11y.core.announce("Suljettu: " + active.querySelector("span:not(.diar-tree-icon)").textContent, "polite");
          } else if (!isDay) {
            const dayIdx = active.dataset.dayIndex;
            const parentDay = this._dialog.querySelector(`.diar-treeitem[data-is-day="true"][data-day-index="${dayIdx}"]`);
            focusItem(parentDay);
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (isDay) {
            const expanded = active.getAttribute("aria-expanded") === "true";
            active.setAttribute("aria-expanded", expanded ? "false" : "true");
            DiariumA11y.core.announce(expanded ? "Suljettu" : "Avattu", "polite");
          } else {
            this._executeBooking(active);
          }
          break;
        case "Escape":
          e.preventDefault();
          this._dialog.close();
          break;
        default:
          if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const ch = e.key.toLowerCase();
            const allDayItems = Array.from(this._dialog.querySelectorAll(".diar-treeitem[data-is-day='true']"));
            if (!allDayItems.length) break;
            const curDayIdx = allDayItems.indexOf(
              active.dataset.isDay === "true"
                ? active
                : this._dialog.querySelector(`.diar-treeitem[data-is-day="true"][data-day-index="${active.dataset.dayIndex}"]`)
            );
            for (let offset = 1; offset <= allDayItems.length; offset++) {
              const candidate = allDayItems[(curDayIdx + offset) % allDayItems.length];
              const label = candidate.querySelector("span:not(.diar-tree-icon)")?.textContent.trim().toLowerCase() || "";
              if (label.startsWith(ch)) { focusItem(candidate); break; }
            }
          }
          break;
      }
    });

    this._dialog.addEventListener("click", (e) => {
      const item = e.target.closest(".diar-treeitem");
      if (!item) return;
      focusItem(item);
      if (item.dataset.isDay === "true") {
        const expanded = item.getAttribute("aria-expanded") === "true";
        item.setAttribute("aria-expanded", expanded ? "false" : "true");
      } else {
        this._executeBooking(item);
      }
    });

    this._dialog.addEventListener("close", () => {
      this._dialog.remove();
      this._dialog = null;
      this._data = [];
    });

    setTimeout(() => {
      const firstDay = this._dialog.querySelector(".diar-treeitem");
      if (firstDay) focusItem(firstDay);
    }, 50);
  },
};

// ---------------------------------------------------------------------------
// Moduuli: dropzone
// Dropzone-elementin saavutettavuuskorjaus.
// ---------------------------------------------------------------------------
DiariumA11y.dropzone = {

  _patch(el) {
    if (el.dataset.diarPatched) return;
    el.dataset.diarPatched = "1";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", "Lisää tiedosto");
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); }
    });
  },

  init() {
    const existing = document.querySelector("#dropzone");
    if (existing) { this._patch(existing); return; }
    const observer = new MutationObserver(() => {
      const el = document.querySelector("#dropzone");
      if (el) this._patch(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  },
};

// ---------------------------------------------------------------------------
// Moduuli: listView
// Listanäkymän parannukset (vain list_calendars -sivu):
//   – Tänään-painikkeen tilakorjaus
//   – H5-otsikot jokaiselle tapahtumairiville
//   – Järjestysradiopainikkeet taulukon yläpuolelle
// ---------------------------------------------------------------------------
DiariumA11y.listView = {

  TANAAN_LABEL_OFF: "Tänään, suodatin pois päältä",
  TANAAN_LABEL_ON:  "Tänään, suodatin päällä – näytetään vain tämän päivän tapahtumat",

  // ── Tänään-painike ───────────────────────────────────────────────────────

  _isTanaanActive(el) {
    return el.classList.contains("painike_aktiivinen");
  },

  _updateTanaanBtn(el) {
    const active = this._isTanaanActive(el);
    el.setAttribute("aria-pressed", active ? "true" : "false");
    el.setAttribute("aria-label", active ? this.TANAAN_LABEL_ON : this.TANAAN_LABEL_OFF);
  },

  _initTanaanBtnPatch() {
    const patch = (el) => {
      this._updateTanaanBtn(el);
      const observer = new MutationObserver(() => {
        const wasActive = el.getAttribute("aria-pressed") === "true";
        const isActive  = this._isTanaanActive(el);
        if (wasActive !== isActive) {
          this._updateTanaanBtn(el);
          DiariumA11y.core.announce(
            isActive
              ? "Suodatin päällä. Näytetään vain tämän päivän tapahtumat."
              : "Suodatin pois päältä. Näytetään kaikki tapahtumat.",
            "assertive"
          );
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    };

    const existing = document.querySelector("#list_calendars_today_btn");
    if (existing) { patch(existing); return; }

    const waitObs = new MutationObserver(() => {
      const el = document.querySelector("#list_calendars_today_btn");
      if (el) { waitObs.disconnect(); patch(el); }
    });
    waitObs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => waitObs.disconnect(), 30000);
  },

  // ── H5-otsikot ──────────────────────────────────────────────────────────

  _initH5Headings() {
    DiariumA11y.styles.injectListViewStyles();

    const patchTableRows = () => {
      const tbody = document.querySelector("table.data tbody");
      if (!tbody) return;
      tbody.querySelectorAll("tr").forEach(tr => {
        if (tr.dataset.diarH5) return;
        tr.dataset.diarH5 = "1";

        const cells = Array.from(tr.querySelectorAll("td"));
        if (cells.length < 4) return;

        const aika       = cells[1] ? cells[1].textContent.trim().replace(/\s+/g, " ") : "";
        const asiakas    = cells[2] ? cells[2].textContent.trim() : "";
        const tyyppi     = cells[3] ? cells[3].textContent.trim() : "";
        const tyontekija = cells[4] ? cells[4].textContent.trim() : "";
        if (!aika) return;

        const labelParts = [aika];
        if (asiakas)    labelParts.push("Asiakas: " + asiakas);
        if (tyyppi)     labelParts.push("Tyyppi: " + tyyppi);
        if (tyontekija) labelParts.push("Työntekijä: " + tyontekija);
        const fullLabel = labelParts.join(", ");

        const aktivointiLinkki = tr.querySelector("a.kalenteriblokki");
        if (!aktivointiLinkki) return;

        const h5 = document.createElement("h5");
        h5.className = "diar-list-h5";
        const a = document.createElement("a");
        a.href = "#";
        a.className = "diar-list-h5-link";
        a.textContent = fullLabel;
        a.addEventListener("click", (e) => { e.preventDefault(); aktivointiLinkki.click(); });
        h5.appendChild(a);
        cells[1].insertBefore(h5, cells[1].firstChild);
      });
    };

    patchTableRows();

    const tbodyWait = setInterval(() => {
      const tbody = document.querySelector("table.data tbody");
      if (tbody) {
        clearInterval(tbodyWait);
        new MutationObserver(patchTableRows).observe(tbody, { childList: true });
      }
    }, 500);
    setTimeout(() => clearInterval(tbodyWait), 30000);
  },

  // ── Järjestysradiopainikkeet ─────────────────────────────────────────────

  _initSortRadioButtons() {
    DiariumA11y.styles.injectListViewStyles();

    const buildSortWidget = () => {
      if (document.getElementById("diar-sort-widget")) return;
      const table = document.querySelector("table.data");
      if (!table) return;

      const currentPath = window.location.pathname;
      const sortMatch   = currentPath.match(/\/sort:([^/]+)/);
      const dirMatch    = currentPath.match(/\/direction:(asc|desc)/);
      const currentDir  = dirMatch ? dirMatch[1] : null;

      let sortField = "Calendar.alkaen";
      if (sortMatch) {
        sortField = sortMatch[1];
      } else {
        const pvmLink = document.querySelector("table.data thead th a.none[href*='alkaen']");
        if (pvmLink) {
          const m = pvmLink.getAttribute("href").match(/sort:([^/]+)/);
          if (m) sortField = m[1];
        }
      }

      const basePath = currentPath
        .replace(/\/sort:[^/]+\/direction:[^/]+/, "")
        .replace(/\/sort:[^/]+/, "");

      const wrapper = document.createElement("div");
      wrapper.id = "diar-sort-widget";

      const fieldset = document.createElement("fieldset");
      fieldset.id = "diar-sort-fieldset";
      const legend = document.createElement("legend");
      legend.textContent = "Päivämäärän järjestys";
      fieldset.appendChild(legend);

      [
        { value: "asc",  text: "Nouseva (vanhin ensin)", checked: currentDir === "asc"  },
        { value: "desc", text: "Laskeva (uusin ensin)",  checked: currentDir === "desc" },
      ].forEach(({ value, text, checked }) => {
        const id = "diar-sort-" + value;
        const label = document.createElement("label");
        label.className = "diar-sort-label";
        label.htmlFor = id;
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "diar-sort-direction";
        radio.id = id;
        radio.value = value;
        radio.checked = checked;
        radio.addEventListener("change", () => {
          if (!radio.checked) return;
          DiariumA11y.core.announce(
            "Järjestetään " + (value === "asc" ? "nousevaan" : "laskevaan") + " järjestykseen…",
            "assertive"
          );
          setTimeout(() => {
            window.location.href = basePath + "/sort:" + sortField + "/direction:" + value;
          }, 300);
        });
        label.appendChild(radio);
        label.appendChild(document.createTextNode(" " + text));
        fieldset.appendChild(label);
      });

      wrapper.appendChild(fieldset);
      table.parentNode.insertBefore(wrapper, table);
    };

    if (document.querySelector("table.data")) {
      buildSortWidget();
    } else {
      const waitObs = new MutationObserver(() => {
        if (document.querySelector("table.data")) { waitObs.disconnect(); buildSortWidget(); }
      });
      waitObs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => waitObs.disconnect(), 15000);
    }
  },

  init() {
    this._initTanaanBtnPatch();
    this._initH5Headings();
    this._initSortRadioButtons();
  },
};

// ---------------------------------------------------------------------------
// Moduuli: calendarNav
// Kalenterin navigaatiopainikkeiden saavutettavuuskorjaus ja pikanäppäimet.
// ---------------------------------------------------------------------------
DiariumA11y.calendarNav = {

  TOOLBAR_PATCHES: [
    { sel: ".fc-prev-button",       label: "Edellinen"    },
    { sel: ".fc-next-button",       label: "Seuraava"     },
    { sel: ".fc-today-button",      label: "Tänään"       },
    { sel: ".fc-agendaWeek-button", label: "Viikkonäkymä" },
    { sel: ".fc-agendaDay-button",  label: "Päivänäkymä"  },
  ],

  patchToolbar() {
    this.TOOLBAR_PATCHES.forEach(({ sel, label }) => {
      const btn = document.querySelector(sel);
      if (btn && !btn.dataset.diarPatched) {
        btn.setAttribute("aria-label", label);
        btn.dataset.diarPatched = "1";
      }
    });

    const heading = document.querySelector(".fc-center h2");
    if (heading && !heading.dataset.diarObserved) {
      heading.dataset.diarObserved = "1";
      const obs = new MutationObserver(() => {
        const txt = heading.textContent.trim();
        if (txt) DiariumA11y.core.announce("Kalenteri: " + txt);
      });
      obs.observe(heading, { childList: true, subtree: true, characterData: true });
    }
  },

  // Klikkaa kalenterin työkalupalkin painiketta selectorin perusteella.
  clickBtn(selector, msgOk, msgFail) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.click();
      DiariumA11y.core.announce(btn.getAttribute("aria-label") || msgOk, "polite");
    } else {
      DiariumA11y.core.announce(msgFail || "Painiketta ei löydy.", "assertive");
    }
  },

  init() {
    DiariumA11y.core.waitForElement(".fc-prev-button", 6000, () => this.patchToolbar());
  },
};

// ---------------------------------------------------------------------------
// Moduuli: navH5
// Listanäkymä-alivalikkolinkin kääriminen h5-otsikkoon NVDA-navigaatiota varten.
// ---------------------------------------------------------------------------
DiariumA11y.navH5 = {

  _inject() {
    const links = Array.from(document.querySelectorAll("a.n-font-weight-heading"));
    const target = links.find(a => a.textContent.trim() === "Listanäkymä");
    if (!target || target.dataset.diarH5nav) return;
    target.dataset.diarH5nav = "1";
    const h5 = document.createElement("h5");
    h5.style.cssText = "margin:0;padding:0;font-size:inherit;font-weight:inherit;display:inline;";
    target.parentNode.insertBefore(h5, target);
    h5.appendChild(target);
  },

  init() {
    this._inject();
    const obs = new MutationObserver(() => this._inject());
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 15000);
  },
};

// ---------------------------------------------------------------------------
// Moduuli: select2
// Varausikkunan Select2-valikkojen korvaus saavutettavilla widgeteillä.
// ---------------------------------------------------------------------------
DiariumA11y.select2 = {

  _findNative(rendered) {
    const container = rendered.closest(".select2-container, .select2");
    if (!container) return null;
    const prev = container.previousElementSibling;
    if (prev && prev.tagName === "SELECT") return prev;
    const sid = container.getAttribute("data-select2-id");
    if (sid) {
      const sel = document.querySelector(`select[data-select2-id="${sid}"]`);
      if (sel) return sel;
    }
    const parent = container.parentElement;
    return parent ? parent.querySelector("select") : null;
  },

  _findLabel(rendered) {
    const nativeSel = this._findNative(rendered);
    if (nativeSel && nativeSel.id) {
      const lbl = document.querySelector(`label[for="${nativeSel.id}"]`);
      if (lbl) return lbl.textContent.trim();
    }
    let el = rendered.parentElement;
    while (el && el !== document.body) {
      const lbl = el.querySelector(":scope > label");
      if (lbl) return lbl.textContent.trim();
      el = el.parentElement;
    }
    return "";
  },

  _parseOptions(nativeSel) {
    if (!nativeSel) return [];
    const opts = [];
    let inGroup = false;
    Array.from(nativeSel.children).forEach(child => {
      if (child.tagName === "OPTGROUP") {
        const glabel = child.getAttribute("label") || "";
        if (glabel) { opts.push({ value: "__group__", text: glabel, isGroup: true, level: 0 }); inGroup = true; }
        Array.from(child.children).forEach(opt => {
          if (opt.tagName === "OPTION") {
            const txt = opt.textContent.trim();
            if (txt) opts.push({ value: opt.value, text: txt, isGroup: false, level: 1 });
          }
        });
      } else if (child.tagName === "OPTION") {
        const txt = child.textContent.trim();
        if (txt) opts.push({ value: child.value, text: txt, isGroup: false, level: inGroup ? 1 : 0 });
      }
    });
    return opts;
  },

  _buildWidget(rendered) {
    const s2container = rendered.closest(".select2-container, .select2");
    const nativeSel   = this._findNative(rendered);
    const label       = this._findLabel(rendered);
    const currentText = rendered.textContent.replace(/^[\s×]+/, "").trim() || "Ei valittu";
    const listboxId   = "diar-s2-lb-" + Math.random().toString(36).substr(2, 9);

    const wrapper = document.createElement("div");
    wrapper.className = "diar-s2-wrapper";
    wrapper.style.cssText = "position:relative;display:inline-block;width:100%;margin:2px 0;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "diar-s2-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn._currentText = currentText;
    const btnLabel = () => (label ? label + ": " : "") + btn._currentText + ". Paina Enter avataksesi valikon.";
    btn.setAttribute("aria-label", btnLabel());
    btn.textContent = (label ? label + ": " : "") + currentText;
    btn.style.cssText =
      "display:block;width:100%;padding:6px 10px;font-size:0.92rem;text-align:left;" +
      "background:#fff;border:2px solid #555;border-radius:4px;cursor:pointer;" +
      "color:#000;min-height:36px;font-family:'Segoe UI',Arial,sans-serif;";
    wrapper.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = "diar-s2-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", (label || "Valikko") + " – haku");
    panel.style.cssText =
      "display:none;position:absolute;top:100%;left:0;right:0;background:#fff;" +
      "border:2px solid #333;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.3);" +
      "z-index:999999;max-height:400px;";
    wrapper.appendChild(panel);

    const search = document.createElement("input");
    search.type = "text";
    search.setAttribute("role", "combobox");
    search.setAttribute("aria-label", (label || "Valikko") + " – kirjoita hakusana ja paina Enter, tai paina Enter näyttääksesi kaikki vaihtoehdot");
    search.setAttribute("aria-expanded", "false");
    search.setAttribute("aria-autocomplete", "list");
    search.setAttribute("aria-controls", listboxId);
    search.setAttribute("autocomplete", "off");
    search.style.cssText =
      "display:block;width:calc(100% - 16px);margin:8px;padding:6px;font-size:0.92rem;" +
      "border:2px solid #555;border-radius:4px;box-sizing:border-box;";
    panel.appendChild(search);

    const help = document.createElement("div");
    help.textContent = "Kirjoita hakusana ja paina Enter suodattaaksesi, tai paina Enter suoraan näyttääksesi kaikki. Nuolinäppäimet: selaa. Enter: valitse. Esc: sulje.";
    help.setAttribute("aria-hidden", "true");
    help.style.cssText = "padding:2px 10px 4px;font-size:0.78rem;color:#555;font-style:italic;";
    panel.appendChild(help);

    const listbox = document.createElement("ul");
    listbox.id = listboxId;
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("aria-label", (label || "Valikko") + " – vaihtoehdot");
    listbox.style.cssText = "list-style:none;margin:0;padding:0;max-height:280px;overflow-y:auto;";
    panel.appendChild(listbox);

    const live = document.createElement("div");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    live.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;";
    wrapper.appendChild(live);

    const state = { options: [], filteredOptions: [], activeIndex: -1, isOpen: false };

    const liveAnnounce = (msg) => {
      live.textContent = "";
      setTimeout(() => { live.textContent = msg; }, 80);
    };

    const setActive = (idx) => {
      listbox.querySelectorAll("[data-diar-active]").forEach(el => {
        el.style.background = "#fff"; el.style.color = "#000";
        el.setAttribute("aria-selected", "false"); el.removeAttribute("data-diar-active");
      });
      if (!state.filteredOptions[idx] || state.filteredOptions[idx].isGroup) return;
      state.activeIndex = idx;
      const li = listbox.querySelector("#" + listboxId + "-" + idx);
      if (li) {
        li.style.background = "#1a5fb4"; li.style.color = "#fff";
        li.setAttribute("aria-selected", "true"); li.setAttribute("data-diar-active", "true");
        search.setAttribute("aria-activedescendant", li.id);
        li.scrollIntoView({ block: "nearest" });
        liveAnnounce(li.textContent.trim());
      }
    };

    const moveActive = (dir) => {
      let idx = state.activeIndex;
      const len = state.filteredOptions.length;
      if (!len) return;
      do {
        idx += dir;
        if (idx < 0) idx = len - 1;
        if (idx >= len) idx = 0;
        if (!state.filteredOptions[idx].isGroup) break;
      } while (idx !== state.activeIndex);
      setActive(idx);
    };

    const selectOption = (idx) => {
      const opt = state.filteredOptions[idx];
      if (!opt || opt.isGroup) return;
      if (nativeSel) {
        nativeSel.value = opt.value;
        nativeSel.dispatchEvent(new Event("change", { bubbles: true }));
        try { if (window.jQuery) window.jQuery(nativeSel).val(opt.value).trigger("change"); } catch (_) {}
      }
      btn._currentText = opt.text;
      btn.textContent = (label ? label + ": " : "") + opt.text;
      btn.setAttribute("aria-label", btnLabel());
      closePanel();
      liveAnnounce("Valittu: " + opt.text);
      btn.focus();
    };

    const renderOptions = (opts) => {
      listbox.innerHTML = "";
      state.filteredOptions = opts;
      state.activeIndex = -1;
      if (!opts.length) {
        const li = document.createElement("li");
        li.setAttribute("role", "option"); li.setAttribute("aria-disabled", "true");
        li.textContent = "Ei vaihtoehtoja";
        li.style.cssText = "padding:8px 12px;color:#999;font-style:italic;";
        listbox.appendChild(li);
        liveAnnounce("Ei vaihtoehtoja."); return;
      }
      opts.forEach((opt, i) => {
        const li = document.createElement("li");
        li.id = listboxId + "-" + i;
        if (opt.isGroup) {
          li.setAttribute("role", "presentation");
          li.textContent = opt.text;
          li.style.cssText = "padding:5px 10px;font-weight:bold;background:#f0f0f0;color:#333;font-size:0.82rem;border-top:1px solid #ddd;";
        } else {
          li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
          li.textContent = (opt.level > 0 ? "\u00a0\u00a0\u00a0\u00a0" : "") + opt.text;
          li.style.cssText = "padding:7px " + (opt.level > 0 ? "20px" : "10px") + ";cursor:pointer;font-size:0.90rem;color:#000;border-bottom:1px solid #eee;";
          li.addEventListener("mouseover", () => setActive(i));
          li.addEventListener("click", (e) => { e.preventDefault(); selectOption(i); });
        }
        listbox.appendChild(li);
      });
      search.setAttribute("aria-expanded", "true");
      const count = opts.filter(o => !o.isGroup).length;
      liveAnnounce(count + " vaihtoehtoa. Selaa nuolinäppäimillä.");
    };

    const filterAndRender = (query) => {
      const allOpts = this._parseOptions(nativeSel);
      let filtered = query
        ? allOpts.filter(o => o.isGroup || o.text.toLowerCase().includes(query.toLowerCase()))
        : allOpts;
      filtered = filtered.filter((o, i, arr) => {
        if (!o.isGroup) return true;
        for (let j = i + 1; j < arr.length; j++) {
          if (!arr[j].isGroup) return true;
          break;
        }
        return false;
      });
      renderOptions(filtered);
      if (filtered.length) {
        for (let k = 0; k < filtered.length; k++) {
          if (!filtered[k].isGroup) { setActive(k); break; }
        }
      }
    };

    const openPanel = () => {
      panel.style.display = "block"; btn.setAttribute("aria-expanded", "true"); state.isOpen = true;
      search.value = ""; listbox.innerHTML = "";
      search.setAttribute("aria-expanded", "false"); search.removeAttribute("aria-activedescendant");
      search.focus();
      liveAnnounce("Valikko avattu. " + (label || "") + ". Kirjoita hakusana ja paina Enter, tai paina Enter näyttääksesi kaikki vaihtoehdot.");
    };

    const closePanel = () => {
      panel.style.display = "none"; btn.setAttribute("aria-expanded", "false");
      search.setAttribute("aria-expanded", "false"); search.removeAttribute("aria-activedescendant");
      state.isOpen = false; state.activeIndex = -1;
    };

    btn.addEventListener("click", (e) => { e.preventDefault(); state.isOpen ? closePanel() : openPanel(); });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state.isOpen ? closePanel() : openPanel(); }
    });

    search.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation(); closePanel(); btn.focus(); liveAnnounce("Valikko suljettu.");
      } else if (e.key === "ArrowDown") {
        e.preventDefault(); if (state.filteredOptions.length) moveActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault(); if (state.filteredOptions.length) moveActive(-1);
      } else if (e.key === "Tab") {
        closePanel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (state.activeIndex >= 0 && state.filteredOptions.length) selectOption(state.activeIndex);
        else filterAndRender(search.value.trim());
      }
    });

    let filterTimer = null;
    search.addEventListener("input", () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => { if (search.value.trim()) filterAndRender(search.value.trim()); }, 300);
    });

    if (s2container && s2container.parentNode) {
      s2container.parentNode.insertBefore(wrapper, s2container);
      s2container.style.display = "none";
      s2container.setAttribute("aria-hidden", "true");
    }
  },

  _processAll() {
    document.querySelectorAll('.select2-selection__rendered:not([data-diar-s2="1"])').forEach(rendered => {
      rendered.setAttribute("data-diar-s2", "1");
      this._buildWidget(rendered);
    });
  },

  init() {
    this._processAll();
    let s2Timer = null;
    const obs = new MutationObserver(() => {
      clearTimeout(s2Timer);
      s2Timer = setTimeout(() => this._processAll(), 400);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  },
};

// ---------------------------------------------------------------------------
// Moduuli: kehys
// Varausikkunan span.kehys-toimintopainikkeiden saavutettavuuskorjaus.
// ---------------------------------------------------------------------------
DiariumA11y.kehys = {

  _patch() {
    const dlg = document.querySelector("#varausdialogi");
    if (!dlg) return;
    dlg.querySelectorAll("span.kehys:not([data-diar-kehys])").forEach(span => {
      span.setAttribute("data-diar-kehys", "1");
      const label = span.getAttribute("title") || span.textContent.trim();
      span.setAttribute("role", "button");
      span.setAttribute("tabindex", "0");
      if (label && !span.getAttribute("aria-label")) span.setAttribute("aria-label", label);
      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); span.click(); }
      });
    });
  },

  init() {
    this._patch();
    let kehysTimer = null;
    const obs = new MutationObserver(() => {
      clearTimeout(kehysTimer);
      kehysTimer = setTimeout(() => this._patch(), 300);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  },
};

// ---------------------------------------------------------------------------
// Moduuli: medicalSelect
// Potilaskertomusmodaalin valikkojen saavutettavuus.
//   1+2: Natiivin <select>-elementin label-yhdistys
//   3:   Vue multiselect → saavutettava painike+hakukenttä+listbox
// ---------------------------------------------------------------------------
DiariumA11y.medicalSelect = {

  _patchNativeSelects() {
    document.querySelectorAll('select.medical-record-select:not([data-diar-mrl="1"])').forEach(sel => {
      let prev = sel.previousSibling;
      while (prev && (prev.nodeType === Node.TEXT_NODE || prev.nodeName === "BR")) {
        prev = prev.previousSibling;
      }
      let lbl = prev && prev.tagName === "LABEL" ? prev : null;
      if (!lbl && sel.parentElement) lbl = sel.parentElement.querySelector(":scope > label");
      if (!lbl) return;
      const uid = "diar-mr-sel-" + Math.random().toString(36).substr(2, 8);
      sel.id = uid;
      lbl.htmlFor = uid;
      sel.setAttribute("data-diar-mrl", "1");
    });
  },

  _buildMultiselect(msEl) {
    const parent = msEl.parentNode;
    if (!parent) return;

    const state = { filteredOptions: [], activeIndex: -1, isOpen: false };
    parent.querySelectorAll(".diar-ms-wrapper").forEach(w => w.remove());

    const lbl = parent.querySelector(":scope > label");
    const labelText = lbl ? lbl.textContent.trim() : "Otsikko";
    const listboxId = "diar-ms-lb-" + Math.random().toString(36).substr(2, 8);

    const getOptions = () => {
      const opts = [];
      msEl.querySelectorAll("li.multiselect__element").forEach(li => {
        const span = li.querySelector("span.multiselect__option");
        if (!span) return;
        const textEl = span.querySelector("span");
        const text = textEl ? textEl.textContent.trim() : span.textContent.trim();
        if (!text || text === "No elements found. Consider changing the search query." || text === "List is empty.") return;
        const isSelected = span.classList.contains("multiselect__option--selected");
        opts.push({ text, span, isSelected });
      });
      return opts;
    };

    const wrapper = document.createElement("div");
    wrapper.className = "diar-ms-wrapper";
    wrapper.style.cssText = "position:relative;display:inline-block;width:100%;margin:2px 0;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "diar-ms-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.style.cssText =
      "display:block;width:100%;padding:6px 10px;font-size:0.92rem;text-align:left;" +
      "background:#fff;border:2px solid #555;border-radius:4px;cursor:pointer;" +
      "color:#000;min-height:36px;font-family:'Segoe UI',Arial,sans-serif;";

    let lastSelectedText = null;
    const getCurrentText = () => {
      if (lastSelectedText !== null) return lastSelectedText;
      const tags = msEl.querySelectorAll(".multiselect__tag span:first-child");
      if (tags.length > 0) return Array.from(tags).map(t => t.textContent.trim()).join(", ");
      return "Ei valittu";
    };
    const updateBtn = () => {
      const cur = getCurrentText();
      btn.setAttribute("aria-label", labelText + ": " + cur + ". Paina Enter avataksesi valikon.");
      btn.textContent = labelText + ": " + cur;
    };
    updateBtn();
    wrapper.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = "diar-ms-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", labelText + " – haku");
    panel.style.cssText =
      "display:none;position:absolute;top:100%;left:0;right:0;background:#fff;" +
      "border:2px solid #333;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.3);" +
      "z-index:999999;max-height:400px;";
    wrapper.appendChild(panel);

    const search = document.createElement("input");
    search.type = "text";
    search.setAttribute("role", "combobox");
    search.setAttribute("aria-label", labelText + " – kirjoita hakusana ja paina Enter, tai paina Enter näyttääksesi kaikki vaihtoehdot");
    search.setAttribute("aria-expanded", "false");
    search.setAttribute("aria-autocomplete", "list");
    search.setAttribute("aria-controls", listboxId);
    search.setAttribute("autocomplete", "off");
    search.style.cssText =
      "display:block;width:calc(100% - 16px);margin:8px;padding:6px;font-size:0.92rem;" +
      "border:2px solid #555;border-radius:4px;box-sizing:border-box;";
    panel.appendChild(search);

    const helpEl = document.createElement("div");
    helpEl.textContent = "Kirjoita hakusana ja paina Enter suodattaaksesi, tai paina Enter suoraan näyttääksesi kaikki. Nuolinäppäimet: selaa. Enter: valitse. Esc: sulje.";
    helpEl.setAttribute("aria-hidden", "true");
    helpEl.style.cssText = "padding:2px 10px 4px;font-size:0.78rem;color:#555;font-style:italic;";
    panel.appendChild(helpEl);

    const listbox = document.createElement("ul");
    listbox.id = listboxId;
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("aria-label", labelText + " – vaihtoehdot");
    listbox.style.cssText = "list-style:none;margin:0;padding:0;max-height:280px;overflow-y:auto;";
    panel.appendChild(listbox);

    const live = document.createElement("div");
    live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite"); live.setAttribute("aria-atomic", "true");
    live.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;";
    wrapper.appendChild(live);

    const liveAnnounce = (msg) => { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 80); };

    const setActive = (idx) => {
      listbox.querySelectorAll("[data-diar-active]").forEach(el => {
        el.style.background = "#fff"; el.style.color = "#000";
        el.setAttribute("aria-selected", "false"); el.removeAttribute("data-diar-active");
      });
      if (!state.filteredOptions[idx]) return;
      state.activeIndex = idx;
      const li = listbox.querySelector("#" + listboxId + "-" + idx);
      if (li) {
        li.style.background = "#1a5fb4"; li.style.color = "#fff";
        li.setAttribute("aria-selected", "true"); li.setAttribute("data-diar-active", "true");
        search.setAttribute("aria-activedescendant", li.id);
        li.scrollIntoView({ block: "nearest" }); liveAnnounce(li.textContent.trim());
      }
    };

    const moveActive = (dir) => {
      const len = state.filteredOptions.length;
      if (!len) return;
      let idx = state.activeIndex;
      if (idx === -1) { idx = dir > 0 ? 0 : len - 1; } else { idx = (idx + dir + len) % len; }
      setActive(idx);
    };

    const renderOptions = (opts) => {
      state.filteredOptions = opts; state.activeIndex = -1;
      search.removeAttribute("aria-activedescendant"); listbox.innerHTML = "";
      if (!opts.length) {
        const li = document.createElement("li");
        li.textContent = "Ei hakutuloksia"; li.setAttribute("aria-hidden", "true");
        li.style.cssText = "padding:8px 12px;color:#888;font-style:italic;"; listbox.appendChild(li); return;
      }
      opts.forEach((opt, i) => {
        const li = document.createElement("li");
        li.id = listboxId + "-" + i; li.setAttribute("role", "option");
        li.setAttribute("aria-selected", opt.isSelected ? "true" : "false");
        li.textContent = opt.text + (opt.isSelected ? " (valittu)" : "");
        li.style.cssText = "padding:8px 12px;cursor:pointer;background:#fff;color:#000;font-size:0.92rem;font-family:'Segoe UI',Arial,sans-serif;";
        if (opt.isSelected) li.style.fontWeight = "bold";
        li.addEventListener("click", () => selectOption(i));
        listbox.appendChild(li);
      });
      liveAnnounce(opts.length + " vaihtoehtoa");
    };

    const filterAndRender = (query) => {
      const opts = getOptions();
      const filtered = query ? opts.filter(o => o.text.toLowerCase().includes(query.toLowerCase())) : opts;
      renderOptions(filtered);
    };

    const openPanel = () => {
      state.isOpen = true; panel.style.display = "block"; btn.setAttribute("aria-expanded", "true");
      search.setAttribute("aria-expanded", "true"); search.value = ""; filterAndRender(""); search.focus();
    };

    const closePanel = () => {
      state.isOpen = false; panel.style.display = "none"; btn.setAttribute("aria-expanded", "false");
      search.setAttribute("aria-expanded", "false"); updateBtn(); btn.focus();
    };

    const selectViaVue = (text) => {
      const vc = msEl.__vue__;
      if (!vc || typeof vc.select !== "function") return false;
      const options = vc.options || [];
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optLabel = typeof opt === "string" ? opt :
          opt.label !== undefined ? opt.label :
          opt.title !== undefined ? opt.title :
          opt.name  !== undefined ? opt.name  : String(opt);
        if (optLabel === text) { vc.select(opt); return true; }
      }
      return false;
    };

    const selectOption = (idx) => {
      const opt = state.filteredOptions[idx];
      if (!opt) return;
      lastSelectedText = opt.text;
      if (!selectViaVue(opt.text) && opt.span) {
        opt.span.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        opt.span.dispatchEvent(new MouseEvent("click",     { bubbles: true, cancelable: true }));
      }
      closePanel();
      setTimeout(() => { DiariumA11y.core.announce("Valittu: " + opt.text, "polite"); }, 100);
    };

    btn.addEventListener("click", openPanel);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); openPanel(); }
    });

    search.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (state.activeIndex >= 0) selectOption(state.activeIndex);
        else if (search.value.trim()) filterAndRender(search.value.trim());
        else filterAndRender("");
      } else if (e.key === "Escape") {
        e.preventDefault(); closePanel();
      } else if (e.key === "Tab") {
        closePanel();
      }
    });

    let msFilterTimer = null;
    search.addEventListener("input", () => {
      clearTimeout(msFilterTimer);
      msFilterTimer = setTimeout(() => { filterAndRender(search.value.trim()); }, 300);
    });

    document.addEventListener("mousedown", (e) => {
      if (state.isOpen && !wrapper.contains(e.target)) closePanel();
    });

    parent.insertBefore(wrapper, msEl);
  },

  _patchMultiselect() {
    document.querySelectorAll('div.multiselect.medical-record-multi-select:not([data-diar-ms="1"])').forEach(msEl => {
      msEl.setAttribute("data-diar-ms", "1");
      this._buildMultiselect(msEl);
    });
  },

  init() {
    DiariumA11y.styles.injectMedicalSelectStyle();
    this._patchNativeSelects();
    this._patchMultiselect();
    let msTimer = null;
    const obs = new MutationObserver(() => {
      clearTimeout(msTimer);
      msTimer = setTimeout(() => {
        this._patchNativeSelects();
        this._patchMultiselect();
      }, 50);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  },
};

// ---------------------------------------------------------------------------
// Moduuli: keyboard
// Globaalit pikanäppäimet. Lisää uudet näppäimet BINDINGS-listaan.
// ---------------------------------------------------------------------------
DiariumA11y.keyboard = {

  // Jokainen merkintä: { key: 'kirjain/Delete', handler: fn }
  // Kaikki edellyttävät isAltOnly-ehdon (vain Alt, ei Ctrl/Shift/Meta).
  BINDINGS: [
    { key: "i", handler: () => DiariumA11y.intercom.toggle() },
    { key: "l", handler: () => DiariumA11y.customerList.open() },
    { key: "k", handler: () => DiariumA11y.calendarList.open() },
    { key: "h", handler: () => DiariumA11y.help.open() },
    { key: "n", handler: () => {
        if (window.location.pathname.includes("lataa_vuorot")) {
          DiariumA11y.workShiftAdd.open();
        } else {
          DiariumA11y.bookingTree.open();
        }
      }
    },
    { key: "1", handler: () => {
        DiariumA11y.core.activateNavLink("Asiakkaat");
        DiariumA11y.core.focusWhenReady("#hakukentta");
      }
    },
    { key: "2", handler: () => DiariumA11y.core.activateNavLink("Hoidot") },
    { key: "3", handler: () => DiariumA11y.core.activateNavLink("Ajanvaraus") },
    // Kalenterin navigointipainikkeet
    { key: "t", handler: () => DiariumA11y.calendarNav.clickBtn(".fc-today-button",      "Tänään",       "Tänään-painiketta ei löydy. Avaa ensin kalenterin viikkonäkymä.") },
    { key: "v", handler: () => DiariumA11y.calendarNav.clickBtn(".fc-agendaWeek-button", "Viikkonäkymä", "Viikko-painiketta ei löydy. Avaa ensin kalenterinäkymä.") },
    { key: "e", handler: () => DiariumA11y.calendarNav.clickBtn(".fc-prev-button",       "Edellinen",    "Edellinen-painiketta ei löydy. Avaa ensin kalenterinäkymä.") },
    { key: "s", handler: () => DiariumA11y.calendarNav.clickBtn(".fc-next-button",       "Seuraava",     "Seuraava-painiketta ei löydy. Avaa ensin kalenterinäkymä.") },
    { key: "p", handler: () => DiariumA11y.calendarNav.clickBtn(".fc-agendaDay-button",  "Päivänäkymä",  "Päivä-painiketta ei löydy. Avaa ensin kalenterinäkymä.") },
    // Asiakasvalinnan poisto
    { key: "Delete", handler: () => {
        const linkki = document.querySelector("#layout_poista_valinta");
        if (linkki) linkki.click();
        else DiariumA11y.core.announce("Ei valittua asiakasta.", "assertive");
      }
    },
  ],

  init() {
    document.addEventListener("keydown", (e) => {
      if (!DiariumA11y.core.isAltOnly(e)) return;
      const keyLower = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      for (const binding of this.BINDINGS) {
        if (binding.key === keyLower || binding.key === e.key.toLowerCase()) {
          e.preventDefault();
          binding.handler();
          return;
        }
      }
    });
  },
};

// ---------------------------------------------------------------------------
// Moduuli: help
// Ohjeikkuna (Alt+H) – kattava käyttöohje HTML-muodossa.
// ---------------------------------------------------------------------------
DiariumA11y.help = {

  open() {
    const existing = document.getElementById("diar-help-dialog");
    if (existing) { existing.close(); return; }

    const dialog = document.createElement("dialog");
    dialog.id = "diar-help-dialog";
    dialog.setAttribute("aria-labelledby", "diar-help-heading");
    dialog.style.cssText = `
      padding: 0; border: 2px solid #333; border-radius: 8px;
      background: #fff; width: min(820px, 98vw); max-height: 92vh;
      box-shadow: 0 8px 32px rgba(0,0,0,0.30); overflow: hidden;
      display: flex; flex-direction: column;
    `;

    // ── Otsikkorivi ──────────────────────────────────────────────────────────
    const header = document.createElement("div");
    header.style.cssText = "padding: 16px 20px 12px; border-bottom: 2px solid #1a4fa0; flex-shrink: 0; background: #dce8f8;";
    const h2 = document.createElement("h2");
    h2.id = "diar-help-heading";
    h2.textContent = "Diarium-saavutettavuuslaajennus – Käyttöohje";
    h2.setAttribute("tabindex", "-1");
    h2.style.cssText = "margin: 0 0 4px; font-size: 1.15rem; font-family: 'Segoe UI', Verdana, sans-serif; font-weight: 700; color: #0d2b5e; line-height: 1.25;";
    const subline = document.createElement("p");
    subline.textContent = "Näkövammaisten liitto ry  |  Ville Lamminen  |  2026";
    subline.style.cssText = "margin: 0; font-size: 0.83rem; color: #444; font-family: 'Segoe UI', Verdana, sans-serif;";
    header.appendChild(h2);
    header.appendChild(subline);

    // ── Vieritettävä sisältöalue ─────────────────────────────────────────────
    const scrollArea = document.createElement("div");
    scrollArea.style.cssText = "overflow-y: auto; flex: 1;";

    const contentDiv = document.createElement("div");
    contentDiv.id = "diar-help-body";

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      #diar-help-body {
        font-family: Georgia, 'Times New Roman', serif; font-size: 1.0rem;
        line-height: 1.7; color: #111111; padding: 1.5rem 1.8rem 2.5rem;
      }
      #diar-help-body h2 {
        font-family: 'Segoe UI', Verdana, sans-serif; font-size: 1.15rem; font-weight: 700;
        color: #0d2b5e; border-bottom: 2px solid #dce8f8; padding-bottom: 0.3rem; margin: 2rem 0 0.8rem;
      }
      #diar-help-body h2:first-child { margin-top: 0; }
      #diar-help-body h3 {
        font-family: 'Segoe UI', Verdana, sans-serif; font-size: 1rem; font-weight: 700;
        color: #1a4fa0; margin: 1.4rem 0 0.4rem;
      }
      #diar-help-body p { margin: 0 0 0.7rem; }
      #diar-help-body ol, #diar-help-body ul { padding-left: 1.6rem; margin: 0 0 0.8rem; }
      #diar-help-body li { margin-bottom: 0.4rem; }
      #diar-help-body table { width: 100%; border-collapse: collapse; font-family: 'Segoe UI', Verdana, sans-serif; font-size: 0.92rem; margin-bottom: 1rem; }
      #diar-help-body thead tr { background: #0d2b5e; color: #fff; }
      #diar-help-body thead th { text-align: left; padding: 0.5rem 0.9rem; font-weight: 600; }
      #diar-help-body tbody tr:nth-child(odd)  { background: #f4f7fb; }
      #diar-help-body tbody tr:nth-child(even) { background: #fff; }
      #diar-help-body tbody tr.group-row td {
        background: #dce8f8; color: #0d2b5e; font-weight: 700; font-size: 0.80rem;
        text-transform: uppercase; letter-spacing: 0.05em; padding: 0.5rem 0.9rem 0.3rem;
      }
      #diar-help-body tbody td { padding: 0.4rem 0.9rem; border-bottom: 1px solid #b0bcd4; vertical-align: top; }
      #diar-help-body kbd {
        display: inline-block; background: #eef1f6; border: 1px solid #b0bcd4; border-radius: 3px;
        padding: 1px 7px; font-family: 'Courier New', Courier, monospace; font-size: 0.87rem;
        white-space: nowrap; color: #0d2b5e;
      }
      #diar-help-body .install-steps {
        background: #f4f7fb; border: 1px solid #b0bcd4; border-radius: 4px;
        padding: 0.9rem 1.3rem 0.5rem; margin-bottom: 1rem;
      }
      #diar-help-body .download-box {
        border: 2px solid #b5410a; border-radius: 4px; padding: 0.9rem 1.3rem;
        margin-bottom: 1rem; background: #fff8f5;
      }
      #diar-help-body .download-box p { font-family: 'Segoe UI', Verdana, sans-serif; font-size: 0.92rem; margin-bottom: 0.6rem; color: #444; }
      #diar-help-body .download-box a {
        display: inline-block; background: #b5410a; color: #fff; text-decoration: none;
        font-family: 'Segoe UI', Verdana, sans-serif; font-weight: 600; font-size: 0.97rem;
        padding: 0.5rem 1.3rem; border-radius: 3px;
      }
      #diar-help-body .download-box a:focus, #diar-help-body .download-box a:hover {
        outline: 3px solid #b5410a; outline-offset: 2px; background: #8c3008;
      }
      #diar-help-body .note { border-left: 4px solid #1a4fa0; background: #dce8f8; padding: 0.65rem 1rem; margin: 0.8rem 0; font-size: 0.91rem; }
      #diar-help-body .warning { border-left: 4px solid #b5410a; background: #fff3ee; padding: 0.65rem 1rem; margin: 0.8rem 0; font-size: 0.91rem; }
      #diar-help-body a { color: #1a4fa0; }
      #diar-help-body a:hover, #diar-help-body a:focus { color: #b5410a; outline: 2px solid currentColor; outline-offset: 2px; }
    `;
    document.head.appendChild(styleEl);

    contentDiv.innerHTML = `
      <h2>Mikä tämä on?</h2>
      <p>
        Tämä laajennus on tehty Näkövammaisten liitto ry:n käyttöön
        helpottamaan Diarium-ajanvarausohjelman käyttöä näkövammaisten
        työntekijöiden arjessa. Laajennus lisää kalenteriin pikanäppäintoiminnot,
        joiden avulla voi kuunnella päivän varauksia, tehdä uusia varauksia
        ja siirtyä ohjelman eri osiin ilman hiirtä.
      </p>

      <h2>Asennus peruskäyttäjälle</h2>

      <h3>Vaihe 1: Lataa ja pura tiedosto</h3>
      <div class="download-box">
        <p>Lataa laajennus Chrome-selaimeen zip-pakettina:</p>
        <a href="http://rolandbykof.github.io/mygithubpages/diarium.zip">
          Lataa Diarium-saavutettavuuslaajennus (zip)
        </a>
      </div>
      <div class="install-steps">
        <ol>
          <li>Paina yllä olevaa latauspainiketta. Tiedosto nimeltä <strong>diarium.zip</strong> tallentuu Ladatut tiedostot -kansioon.</li>
          <li>Avaa Ladatut tiedostot -kansio. Windows-näppäin, kirjoita <strong>Ladatut tiedostot</strong> ja paina Enter.</li>
          <li>Etsi tiedosto <strong>diarium.zip</strong>. Paina sitä kerran hiiren oikealla painikkeella ja valitse <strong>Pura kaikki</strong> tai <strong>Extract All</strong>.</li>
          <li>Valitse purkamispaikaksi jokin kansio, joka jää pysyvästi koneellesi, esimerkiksi <strong>Omat tiedostot</strong>. Paina Pura. Syntyy kansio nimeltä <strong>diarium</strong>.</li>
        </ol>
      </div>
      <div class="warning">
        <strong>Tärkeää:</strong> Älä poista tai siirrä purettua kansiota asennuksen jälkeen. Chrome tarvitsee kansion joka kerta kun selain käynnistyy. Jos kansio häviää, laajennus lakkaa toimimasta.
      </div>

      <h3>Vaihe 2: Avaa Chromen laajennussivu</h3>
      <div class="install-steps">
        <ol>
          <li>Avaa Chrome-selain.</li>
          <li>Napsauta oikeassa yläkulmassa olevaa kolmen pisteen valikkoa ja valitse <strong>Lisää työkaluja</strong> ja sitten <strong>Laajennukset</strong>. Tai kirjoita osoiteriville suoraan: <kbd>chrome://extensions</kbd> ja paina Enter.</li>
        </ol>
      </div>

      <h3>Vaihe 3: Ota kehittäjätila käyttöön</h3>
      <div class="install-steps">
        <ol>
          <li>Laajennussivun oikeassa yläkulmassa on kytkin nimeltä <strong>Kehittäjätila</strong> tai englanniksi <strong>Developer mode</strong>. Napsauta se päälle niin että se muuttuu siniseksi.</li>
        </ol>
      </div>

      <h3>Vaihe 4: Lataa laajennus</h3>
      <div class="install-steps">
        <ol>
          <li>Sivun vasemmassa yläkulmassa ilmestyy nyt painike <strong>Lataa pakkaamaton laajennus</strong> tai <strong>Load unpacked</strong>. Napsauta sitä.</li>
          <li>Selaa avautuvassa ikkunassa kansioon, johon purit zip-tiedoston vaiheessa 1. Valitse <strong>diarium</strong>-kansio (ei yksittäistä tiedostoa kansion sisältä) ja paina <strong>Valitse kansio</strong>.</li>
          <li>Laajennus nimeltä <strong>Diarium Accessibility Extension</strong> ilmestyy laajennusluetteloon. Asennus on valmis.</li>
        </ol>
      </div>

      <h3>Vaihe 5: Kokeile</h3>
      <div class="install-steps">
        <ol>
          <li>Siirry selaimessa osoitteeseen <strong>oma.diarium.fi</strong>.</li>
          <li>Kirjaudu sisään ja avaa kalenteri.</li>
          <li>Paina <kbd>Alt+H</kbd>. Jos ruutu aukeaa ja ruudunlukija lukee ohjeen, laajennus toimii.</li>
        </ol>
      </div>
      <div class="note">
        <strong>Huomio:</strong> Laajennus toimii vain Chrome-selaimessa osoitteessa oma.diarium.fi. Muissa osoitteissa tai muissa selaimissa se ei tee mitään.
      </div>

      <h2>Asennus kehittäjätilassa (tiivistetty ohje)</h2>
      <div class="install-steps">
        <ol>
          <li>Lataa zip ja pura se pysyvään kansioon.</li>
          <li>Avaa Chrome ja siirry osoitteeseen <kbd>chrome://extensions</kbd>.</li>
          <li>Ota käyttöön <strong>Kehittäjätila</strong> oikeasta yläkulmasta.</li>
          <li>Valitse <strong>Lataa pakkaamaton laajennus</strong> ja osoita purettu diarium-kansio.</li>
          <li>Laajennus on asennettu. Testaa <kbd>Alt+H</kbd> Diariumissa.</li>
        </ol>
      </div>

      <h2>Varausten kuuntelu kalenterissa (Alt+K)</h2>
      <p>
        Siirry kalenterin viikko- tai päivänäkymään ja paina <kbd>Alt+K</kbd>.
        Aukeaa luettelo kaikista näkymässä olevista varauksista. Jokainen rivi kertoo:
      </p>
      <ul>
        <li>Viikonpäivän ja päivämäärän, esimerkiksi Maanantai 30.3.</li>
        <li>Kellonajan, esimerkiksi 08:30 - 09:30</li>
        <li>Asiakkaan nimen</li>
        <li>Varauksen tyypin</li>
        <li>Työntekijän nimen</li>
      </ul>
      <p>
        <kbd>Alt+K</kbd> toimii myös <strong>Työvuorot</strong>-sivulla
        (<strong>Ajanvaraus → Työvuorot</strong>). Siinä näkymässä luettelo
        koostaa kuukauden kaikki työvuoromerkinnät muodossa
        <em>viikonpäivä pvm. kellonaika nimi</em>, esimerkiksi
        <em>Ke 1.4. 08:00 - 17:00 Ville Lamminen</em>.
        Paina <kbd>Enter</kbd> avataksesi työvuoron muokkausikkunan.
      </p>

      <h3>Luettelossa liikkuminen</h3>
      <p>Selaa luetteloa <kbd>Nuoli alas</kbd> ja <kbd>Nuoli ylös</kbd> -näppäimillä. Voit myös hypätä suoraan haluamaasi viikonpäivään painamalla päivän alkukirjainta:</p>
      <ul>
        <li><kbd>M</kbd> hyppää seuraavaan maanantain varaukseen</li>
        <li><kbd>T</kbd> hyppää seuraavaan tiistain varaukseen</li>
        <li><kbd>K</kbd> hyppää seuraavaan keskiviikon varaukseen</li>
        <li><kbd>P</kbd> hyppää seuraavaan perjantain varaukseen</li>
      </ul>
      <p>Paina <kbd>Enter</kbd> avataksesi valitun varauksen tiedot Diariumissa. Sulje luettelo painamalla <kbd>Esc</kbd>.</p>

      <h2>Listanäkymän tapahtumaotsikointi</h2>
      <p>Kalenterin listanäkymässä (<strong>Ajanvaraus → Listanäkymä</strong>) laajennus lisää jokaiselle tapahtumariville h5-tason otsikon. Otsikko koostaa kaikki tapahtumatiedot yhdeksi lausumaksi:</p>
      <ul>
        <li>Päivämäärän ja kellonajan, esimerkiksi Ma 27.07.2026 08:00 – 16:00</li>
        <li>Asiakkaan nimen</li>
        <li>Varauksen tyypin</li>
        <li>Työntekijän nimen</li>
      </ul>
      <p>Siirry otsikosta toiseen NVDA:ssa painamalla <kbd>5</kbd>-numeronäppäintä (5. tason otsikkonavigaatio). Jokaisella otsikolla kuulet tapahtuman kaikki tiedot kerralla ilman, että sinun tarvitsee lukea taulukkoa solu solukerrallaan.</p>
      <p>Paina <kbd>Enter</kbd> tai <kbd>Välilyönti</kbd> avataksesi kyseisen tapahtuman Diarium-ajanvarausikkunan suoraan.</p>
      <div class="note">
        <strong>Vinkki:</strong> Otsikkonavigointi toimii NVDA:n selausmuodossa (Browse Mode). Varmista, että NVDA on selausmuodossa (Insert+Välilyönti -kytkintä ei ole painettu), jotta <kbd>5</kbd>-näppäin toimii otsikkohyppäykseen.
      </div>

      <h2>Listanäkymän järjestyksen valinta</h2>
      <p>Listanäkymässä taulukon yläpuolella on saavutettava <strong>Päivämäärän järjestys</strong> -valitsin. Se korvaa alkuperäisen, ruudunlukijalle saavuttamattoman sarakeotsikoiden lajittelulinkin.</p>
      <ul>
        <li><strong>Nouseva (vanhin ensin)</strong> – näyttää tapahtumat vanhimmasta uusimpaan.</li>
        <li><strong>Laskeva (uusin ensin)</strong> – näyttää tapahtumat uusimmasta vanhimpaan.</li>
      </ul>
      <p>Valitse radiopainike nuolinäppäimillä tai suoraan <kbd>Enter</kbd>-näppäimellä. Sivu latautuu automaattisesti valitussa järjestyksessä. Aktiivinen valinta näkyy valittuna kun palaat listanäkymään.</p>

      <h2>Työvuoron lisääminen (Alt+N, Työvuorot-sivu)</h2>
      <p>Siirry Työvuorot-sivulle (<strong>Ajanvaraus → Työvuorot</strong>) ja varmista, että olet <strong>viikkonäkymässä</strong>. Paina <kbd>Alt+N</kbd>. Aukeaa luettelo viikkonäkymän päivistä. Selaa nuolinäppäimillä tai alkukirjaimella ja valitse haluamasi päivä painamalla <kbd>Enter</kbd>.</p>
      <p>Kun päivä on valittu, Diarium avaa työvuoron muokkausikkunan automaattisesti. Laajennus ilmoittaa avautumisesta ja siirtää fokuksen lomakkeen ensimmäiseen kenttään. Täytä tyyppi, alku- ja loppuaika, ja paina <kbd>Tallenna</kbd>.</p>
      <div class="note">
        <strong>Huomio:</strong> <kbd>Alt+N</kbd> toimii Työvuorot-sivulla vain <strong>viikkonäkymässä</strong>. Kuukausinäkymässä päivien kerääminen ei onnistu. Jos saat ilmoituksen "ei valittavia päiviä", vaihda viikkonäkymään sivun näkymäpainikkeesta tai pikanäppäimellä <kbd>Alt+V</kbd>.
      </div>
      <div class="note">
        <strong>Vinkki:</strong> Alkukirjainnavigaatio toimii päivän lyhenteillä: <kbd>M</kbd> hyppää maanantaille, <kbd>T</kbd> tiistaille tai torstaille, <kbd>K</kbd> keskiviikolle, <kbd>P</kbd> perjantaille.
      </div>

      <h2>Uuden varauksen tekeminen (Alt+N)</h2>
      <p>Paina <kbd>Alt+N</kbd>, kun olet kalenterin viikko- tai päivänäkymässä. Aukeaa puunäkymä, jossa jokainen rivi vastaa yhtä työntekijää yhtenä viikonpäivänä. Rivit ovat muotoa, esimerkiksi: Maanantai 30.3. - Lamminen Ville.</p>
      <p>Jos kalenterissa on useita työntekijöitä näkyville valittuina, jokaiselle on oma rivinsä jokaiselle viikonpäivälle.</p>

      <h3>Vaihe 1: Valitse päivä ja työntekijä</h3>
      <ol>
        <li>Selaa puunäkymää <kbd>Nuoli alas</kbd> ja <kbd>Nuoli ylös</kbd> -näppäimillä.</li>
        <li>Voit hypätä haluamaasi päivään alkukirjaimella, esimerkiksi <kbd>P</kbd> vie perjantaille.</li>
        <li>Avaa haluamasi rivi painamalla <kbd>Nuoli oikealle</kbd> tai <kbd>Enter</kbd>. Alle ilmestyy lista kellonaikoja.</li>
      </ol>

      <h3>Vaihe 2: Valitse kellonaika</h3>
      <ol>
        <li>Selaa kellonaikoja <kbd>Nuoli alas</kbd> -näppäimellä.</li>
        <li>Paina <kbd>Enter</kbd> valitaksesi haluamasi ajan.</li>
        <li>Laajennus avaa Diarium-varauslomakkeen automaattisesti oikean työntekijän sarakkeeseen ja oikeaan kellonaikaan.</li>
      </ol>
      <div class="note">
        <strong>Vinkki:</strong> Sulje puunäkymä milloin tahansa painamalla <kbd>Esc</kbd>. Voit myös sulkea avatun päivän painamalla <kbd>Nuoli vasemmalle</kbd>.
      </div>

      <h2>Varausikkunan pudotusvalikot</h2>
      <p>Diariumin varausikkunassa on kaksi Select2-pudotusvalikkoa, jotka eivät aiemmin toimineet ruudunlukijalla: <strong>Tyyppiryhmät</strong> ja <strong>Varauksen tyyppi</strong>. Laajennus korvaa ne saavutettavilla painike-hakukenttä-yhdistelmillä.</p>
      <p>Toimintaketju kummassakin valikossa:</p>
      <ol>
        <li>Siirry valikkopainikeelle <kbd>Tab</kbd>-näppäimellä. NVDA lukee esimerkiksi: <em>Tyyppiryhmät: - näytä kaikki -. Paina Enter avataksesi valikon.</em></li>
        <li>Paina <kbd>Enter</kbd>. Valikko avautuu ja focus siirtyy hakukenttään.</li>
        <li>Kirjoita hakusana suodattaaksesi vaihtoehtoja, tai paina <kbd>Enter</kbd> suoraan näyttääksesi kaikki vaihtoehdot.</li>
        <li>Selaa tuloksia <kbd>Nuoli alas</kbd> ja <kbd>Nuoli ylös</kbd> -näppäimillä. NVDA lukee jokaisen vaihtoehdon ääneen.</li>
        <li>Paina <kbd>Enter</kbd> valitaksesi haluamasi vaihtoehdon.</li>
        <li>Paina <kbd>Esc</kbd> sulkeaksesi valikon ilman valintaa. Focus palaa takaisin valikkopainikkeelle.</li>
      </ol>
      <div class="note">
        <strong>Huomio:</strong> Kun valitset Tyyppiryhmät-valikosta arvon, Varauksen tyyppi -valikko päivittyy automaattisesti näyttämään vain kyseisen ryhmän tyypit. Avaa Varauksen tyyppi -valikko vasta tämän jälkeen.
      </div>

      <h2>Varausikkunan toimintopainikkeet</h2>
      <p>Varausikkunan yläosassa on neljä toimintoa, jotka on toteutettu pelkkinä klikattavina tekstielementteinä ilman näppäimistötukea: <strong>Sarjavaraus</strong>, <strong>Tulosta</strong>, <strong>Työvuoro</strong> ja <strong>Nettivaraus</strong>. Laajennus lisää niihin kaikille roolin ja näppäimistötuen.</p>
      <ul>
        <li><strong>Sarjavaraus</strong> (aria-label: "Sarjavarausten käsittely") – avaa toistovälin, keston ja päivämäärävalitsimen sarjavarausta varten.</li>
        <li><strong>Tulosta</strong> – tulostaa varauksen tiedot.</li>
        <li><strong>Työvuoro</strong> (aria-label: "Lisää työvuoro") – lisää työvuoromerkinnän.</li>
        <li><strong>Nettivaraus</strong> (aria-label: "Nettiajanvaraus") – avaa nettivarausasetukset.</li>
      </ul>
      <p>Siirry painikkeille <kbd>Tab</kbd>-näppäimellä. Aktivoi painike <kbd>Enter</kbd>- tai <kbd>Välilyönti</kbd>-näppäimellä.</p>

      <h2>Muut toiminnot</h2>

      <h3>Kalenterin navigointi (Alt+T, Alt+V, Alt+E, Alt+S)</h3>
      <p>Kalenterin viikko- tai päivänäkymässä voit liikkua näppäimistöllä ilman hiirtä seuraavilla pikanäppäimillä:</p>
      <ul>
        <li><kbd>Alt+T</kbd> – Tänään: siirtyy kuluvaan päivään / viikkoon</li>
        <li><kbd>Alt+V</kbd> – Viikko: vaihtaa viikkonäkymään</li>
        <li><kbd>Alt+E</kbd> – Edellinen: siirtyy edelliselle viikolle tai päivälle</li>
        <li><kbd>Alt+S</kbd> – Seuraava: siirtyy seuraavalle viikolle tai päivälle</li>
        <li><kbd>Alt+P</kbd> – Päivä: vaihtaa päivänäkymään</li>
      </ul>

      <h3>Asiakashaku (Alt+1 ja Alt+L)</h3>
      <p>Paina <kbd>Alt+1</kbd> siirtyäksesi Asiakkaat-välilehdelle ja suoraan hakukenttään. Kun hakutulokset ovat näkyville tulleet, paina <kbd>Alt+L</kbd> avataksesi hakutulosluettelon. Selaa luetteloa nuolinäppäimillä tai alkukirjaimella ja paina <kbd>Enter</kbd> avataksesi asiakkaan tiedot.</p>

      <h3>Intercom-tukichat (Alt+I)</h3>
      <p>Diariumin oikeassa alareunassa on Intercom-tukichat-widget, joka voi haitata ruudunlukijan käyttöä. Paina <kbd>Alt+I</kbd> piilottaaksesi tai näyttääksesi sen uudelleen.</p>

      <h3>Tämän ohjeen avaaminen (Alt+H)</h3>
      <p>Paina <kbd>Alt+H</kbd> milloin tahansa Diarium-sivulla avataksesi tämän ohjeen. Sama näppäin myös sulkee ohjeen.</p>

      <h3>Asiakasvalinnan poistaminen (Alt+Del)</h3>
      <p>Paina <kbd>Alt+Del</kbd> poistaaksesi nykyisen asiakasvalinnan. Laajennus etsii sivulta "Poista valinta" -linkin ja klikkaa sitä. Jos asiakasta ei ole valittuna, ruudunlukija ilmoittaa: "Ei valittua asiakasta."</p>

      <h2>Kaikki näppäinkomennot</h2>
      <table>
        <thead>
          <tr><th scope="col">Näppäin</th><th scope="col">Toiminto</th></tr>
        </thead>
        <tbody>
          <tr class="group-row"><td colspan="2">Työvuorot-sivu</td></tr>
          <tr><td><kbd>Alt+K</kbd></td><td>Listaa kuukauden työvuorot – Enter avaa muokkausikkunan</td></tr>
          <tr><td><kbd>Alt+N</kbd></td><td>Lisää uusi työvuoro – valitse päivä luettelosta (vain viikkonäkymässä)</td></tr>
          <tr class="group-row"><td colspan="2">Kalenteri – tapahtumat</td></tr>
          <tr><td><kbd>Alt+K</kbd></td><td>Avaa luettelo kalenterin varauksista (viikko- tai päivänäkymä) tai työvuoroista (Työvuorot-sivu)</td></tr>
          <tr><td><kbd>Alt+N</kbd></td><td>Avaa puunäkymä uuden varauksen tekemistä varten</td></tr>
          <tr class="group-row"><td colspan="2">Listanäkymä – otsikot ja järjestys</td></tr>
          <tr><td><kbd>5</kbd> (NVDA selausmuoto)</td><td>Siirry seuraavaan tapahtumaotsakkeeseen (h5) – kuulet kaikki tiedot kerralla</td></tr>
          <tr><td><kbd>Enter</kbd> otsikolla</td><td>Avaa tapahtuman Diarium-ikkuna suoraan otsikolta</td></tr>
          <tr><td>Radiopainike Nouseva/Laskeva</td><td>Valitse päivämäärän järjestys taulukon yläpuolelta – sivu latautuu valitussa järjestyksessä</td></tr>
          <tr class="group-row"><td colspan="2">Kalenteri – navigointi</td></tr>
          <tr><td><kbd>Alt+T</kbd></td><td>Tänään – siirtyy kuluvaan päivään tai viikkoon</td></tr>
          <tr><td><kbd>Alt+V</kbd></td><td>Viikko – vaihtaa viikkonäkymään</td></tr>
          <tr><td><kbd>Alt+E</kbd></td><td>Edellinen – siirtyy edelliselle viikolle tai päivälle</td></tr>
          <tr><td><kbd>Alt+S</kbd></td><td>Seuraava – siirtyy seuraavalle viikolle tai päivälle</td></tr>
          <tr><td><kbd>Alt+P</kbd></td><td>Päivä – vaihtaa päivänäkymään</td></tr>
          <tr class="group-row"><td colspan="2">Sivuston navigointi</td></tr>
          <tr><td><kbd>Alt+1</kbd></td><td>Siirry Asiakkaat-välilehdelle ja hakukenttään</td></tr>
          <tr><td><kbd>Alt+2</kbd></td><td>Siirry Hoidot-välilehdelle</td></tr>
          <tr><td><kbd>Alt+3</kbd></td><td>Siirry Ajanvaraus-välilehdelle</td></tr>
          <tr><td><kbd>Alt+L</kbd></td><td>Avaa asiakashakutulosluettelo</td></tr>
          <tr class="group-row"><td colspan="2">Muut</td></tr>
          <tr><td><kbd>Alt+I</kbd></td><td>Piilota tai näytä Intercom-tukichat-widget</td></tr>
          <tr><td><kbd>Alt+H</kbd></td><td>Avaa tai sulje tämä ohje</td></tr>
          <tr><td><kbd>Alt+Del</kbd></td><td>Poista asiakasvalinta</td></tr>
          <tr class="group-row"><td colspan="2">Luetteloissa ja puunäkymässä</td></tr>
          <tr><td><kbd>Nuoli alas / Nuoli ylös</kbd></td><td>Selaa kohtia</td></tr>
          <tr><td><kbd>Nuoli oikealle</kbd></td><td>Avaa päivä tai työntekijä puunäkymässä</td></tr>
          <tr><td><kbd>Nuoli vasemmalle</kbd></td><td>Sulje auki oleva päivä tai palaa yläkohtaan</td></tr>
          <tr><td><kbd>Alkukirjain</kbd></td><td>Hyppää seuraavaan saman kirjaimen kohtaan (esim. P = perjantai)</td></tr>
          <tr><td><kbd>Enter</kbd></td><td>Avaa varaus tai valitse kellonaika</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Sulje luettelo, puunäkymä tai ohje</td></tr>
        </tbody>
      </table>
    `;

    scrollArea.appendChild(contentDiv);

    // ── Alatunniste ──────────────────────────────────────────────────────────
    const FONT = "'Segoe UI', Verdana, sans-serif";
    const footer = document.createElement("div");
    footer.style.cssText = "padding: 10px 20px; border-top: 1px solid #ddd; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;";
    const version = document.createElement("span");
    version.textContent = "Diarium-saavutettavuuslaajennus  |  Näkövammaisten liitto ry  |  2026";
    version.style.cssText = `font-size: 0.77rem; color: #888; font-family: ${FONT};`;
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Sulje (Esc)";
    closeBtn.type = "button";
    closeBtn.style.cssText = `padding: 7px 18px; cursor: pointer; border: 1px solid #333; border-radius: 4px; background: #f0f0f0; font-size: 0.90rem; font-family: ${FONT};`;
    closeBtn.addEventListener("click", () => dialog.close());
    footer.appendChild(version);
    footer.appendChild(closeBtn);

    dialog.appendChild(header);
    dialog.appendChild(scrollArea);
    dialog.appendChild(footer);
    document.body.appendChild(dialog);
    dialog.showModal();

    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); dialog.close(); }
    });
    dialog.addEventListener("close", () => dialog.remove());
    setTimeout(() => h2.focus(), 50);
  },
};

// ---------------------------------------------------------------------------
// Käynnistys
// ---------------------------------------------------------------------------
DiariumA11y.init = function () {
  // Kaikilla sivuilla
  DiariumA11y.intercom.init();
  DiariumA11y.dropzone.init();
  DiariumA11y.navH5.init();
  DiariumA11y.select2.init();
  DiariumA11y.kehys.init();
  DiariumA11y.medicalSelect.init();
  DiariumA11y.keyboard.init();

  // Vain asiakasluettelosivulla
  if (window.location.pathname.includes("list_customers")) {
    DiariumA11y.searchAnnouncer.init();
  }

  // Vain listanäkymässä
  if (window.location.pathname.includes("list_calendars")) {
    DiariumA11y.listView.init();
  }

  // Vain kalenterisivulla
  if (window.location.pathname.includes("/calendars/")) {
    DiariumA11y.calendarNav.init();
  }
};

DiariumA11y.init();
