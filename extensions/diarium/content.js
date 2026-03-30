/**
 * Diarium Accessibility Extension
 *
 * Ominaisuudet:
 * Alt+I  – Piilota / näytä Intercom-widget
 * Alt+L  – Avaa asiakastaulukosta ruudunlukijaystävällinen luettelo
 * (nuolet = selaus, Enter = avaa asiakas, Esc = sulje)
 * Alt+K  – Avaa kalenterin tapahtumaluettelo (lista- ja viikkonäkymä)
 * Alt+N  – Avaa puunäkymä uuden varauksen tekemistä varten
 */

(function () {
  "use strict";

  // ═══════════════════════════════════════════════════════════════════════════
  // APUFUNKTIOT
  // ═══════════════════════════════════════════════════════════════════════════

  function announce(message, urgency) {
    urgency = urgency || "polite";
    let region = document.getElementById("diar-ext-live");
    if (!region) {
      region = document.createElement("div");
      region.id = "diar-ext-live";
      region.setAttribute("aria-live", urgency);
      region.setAttribute("aria-atomic", "true");
      region.setAttribute("role", "status");
      Object.assign(region.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: "0",
      });
      document.body.appendChild(region);
    }
    region.textContent = "";
    requestAnimationFrame(() => {
      region.textContent = message;
    });
    setTimeout(() => {
      region.textContent = "";
    }, 4000);
  }

  function isAltOnly(e) {
    return e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 1: INTERCOM TOGGLE (Alt+I)
  // ═══════════════════════════════════════════════════════════════════════════

  const INTERCOM_KEY = "diariumIntercomHidden";
  const INTERCOM_SELECTORS = [
    "#intercom-container",
    "#intercom-css-container",
    "#intercom-frame",
  ];

  let intercomHidden = sessionStorage.getItem(INTERCOM_KEY) === "true";

  function getIntercomElements() {
    return INTERCOM_SELECTORS.flatMap((s) =>
      Array.from(document.querySelectorAll(s))
    );
  }

  function applyIntercomVisibility(hide) {
    getIntercomElements().forEach((el) => {
      el.style.setProperty(
        "display",
        hide ? "none" : "",
        hide ? "important" : ""
      );
    });
  }

  function toggleIntercom() {
    intercomHidden = !intercomHidden;
    sessionStorage.setItem(INTERCOM_KEY, intercomHidden);
    applyIntercomVisibility(intercomHidden);
    announce(
      intercomHidden
        ? "Intercom-widget piilotettu."
        : "Intercom-widget näytetty."
    );
  }

  applyIntercomVisibility(intercomHidden);

  const intercomObserver = new MutationObserver(() => {
    if (intercomHidden) applyIntercomVisibility(true);
    if (INTERCOM_SELECTORS.every((s) => document.querySelector(s))) {
      intercomObserver.disconnect();
    }
  });
  intercomObserver.observe(document.body, { childList: true, subtree: false });
  setTimeout(() => intercomObserver.disconnect(), 15000);

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 2: ASIAKASLUETTELO (Alt+L)
  // ═══════════════════════════════════════════════════════════════════════════

  let listDialog = null;
  let listRows   = [];
  let activeIndex = 0;

  function injectStyles() {
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
        cursor: pointer; background: #fff; font-family: 'Segoe UI', Arial, sans-serif; font-size: 0.93rem;
        color: #111; border-radius: 0;
      }
      #diar-list-ul li:last-child .diar-contact-btn { border-bottom: none; }
      .diar-contact-btn:focus { background: #1a5fb4; color: #fff; outline: 3px solid #0a3d8a; outline-offset: -3px; }
      .diar-contact-btn:hover:not(:focus) { background: #d0e4ff; }
      #diar-list-footer { padding: 7px 18px; font-size: 0.8rem; color: #666; border-top: 1px solid #ddd; font-family: 'Segoe UI', Arial, sans-serif; flex-shrink: 0; }
    `;
    document.head.appendChild(style);
  }

  function collectRows() {
    const tbody = document.querySelector("#datatable tbody");
    if (!tbody) return [];

    const rows = [];
    tbody.querySelectorAll("tr").forEach((tr) => {
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
  }

  function buildDialog(rows) {
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
      btn.addEventListener("click", () => activateRow(i));
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
  }

  function getButtons() {
    if (!listDialog) return [];
    return Array.from(listDialog.querySelectorAll(".diar-contact-btn"));
  }

  function setActive(index) {
    if (!listRows.length) return;
    index = Math.max(0, Math.min(index, listRows.length - 1));
    activeIndex = index;
    const buttons = getButtons();
    if (buttons[activeIndex]) {
      buttons[activeIndex].focus();
      buttons[activeIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function activateRow(index) {
    const row = listRows[index];
    if (!row) return;
    const target = row.sukunimiTd || row.tr.querySelector("td");
    closeList();
    setTimeout(() => { target.click(); }, 50);
  }

  function openList() {
    if (listDialog) return;
    listRows = collectRows();
    if (!listRows.length) {
      announce("Taulukko on tyhjä. Hae ensin asiakkaita hakuvalinnoilla.", "assertive");
      return;
    }
    injectStyles();
    activeIndex = 0;
    listDialog = buildDialog(listRows);
    document.body.appendChild(listDialog);
    listDialog.showModal();
    listDialog.addEventListener("keydown", handleListKey);
    listDialog.addEventListener("close", () => {
      listDialog.remove();
      listDialog = null;
      listRows = [];
    });
    setTimeout(() => setActive(0), 50);
  }

  function closeList() {
    if (!listDialog) return;
    listDialog.close();
    const tbl = document.querySelector("#datatable");
    if (tbl) {
      tbl.setAttribute("tabindex", "-1");
      tbl.focus();
    }
  }

  function handleListKey(e) {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive(activeIndex + 1); break;
      case "ArrowUp": e.preventDefault(); setActive(activeIndex - 1); break;
      case "Home": e.preventDefault(); setActive(0); break;
      case "End": e.preventDefault(); setActive(listRows.length - 1); break;
      case "Enter": e.preventDefault(); activateRow(activeIndex); break;
      case "Escape": e.preventDefault(); closeList(); break;
      default:
        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
          const ch = e.key.toLowerCase();
          for (let offset = 1; offset <= listRows.length; offset++) {
            const i = (activeIndex + offset) % listRows.length;
            if (listRows[i].label.toLowerCase().startsWith(ch)) {
              setActive(i);
              break;
            }
          }
        }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 3: HAKUTULOSTEN AUTOMAATTINEN ILMOITUS
  // ═══════════════════════════════════════════════════════════════════════════

  function initSearchResultAnnouncer() {
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
          announce(text);
          lastText = "";
        }, 300);
      }
      const infoObserver = new MutationObserver(maybeAnnounce);
      infoObserver.observe(infoEl, { childList: true, subtree: true, characterData: true });
    }, 500);
    setTimeout(() => clearInterval(waitForDatatable), 20000);
  }

  if (window.location.pathname.includes("list_customers")) {
    initSearchResultAnnouncer();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 4: KALENTERITAPAHTUMALUETTELO (Alt+K)
  // ═══════════════════════════════════════════════════════════════════════════

  let calDialog = null;
  let calRows   = [];
  let calActiveIndex = 0;

  function collectCalendarRows() {
    const tbody = document.querySelector("table.data tbody");
    if (!tbody) return [];
    const rows = [];
    tbody.querySelectorAll("tr").forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll("td"));
      if (cells.length < 4) return;
      const aika = cells[1] ? cells[1].textContent.trim().replace(/\s+/g, " ") : "";
      const asiakas = cells[2] ? cells[2].textContent.trim() : "";
      const tyyppi = cells[3] ? cells[3].textContent.trim() : "";
      const tyontekija = cells[4] ? cells[4].textContent.trim() : "";
      if (!aika) return;
      const label = [aika, asiakas, tyyppi, tyontekija].filter(Boolean).join(" – ");
      const aktivointiLinkki = cells[1] ? cells[1].querySelector("a.kalenteriblokki") : null;
      rows.push({ label, aktivointiLinkki, tr });
    });
    return rows;
  }

  function buildCalendarDialog(rows) {
    const dialog = document.createElement("dialog");
    dialog.id = "diar-cal-dialog";
    dialog.setAttribute("role", "application");
    dialog.setAttribute("aria-label", "Kalenteritapahtumat");
    dialog.style.cssText = `
      padding: 0; border: 2px solid #333; border-radius: 8px; background: #fff;
      width: min(760px, 96vw); max-height: 80vh; display: flex; flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.30); overflow: hidden;
    `;
    injectStyles();

    if (!document.getElementById("diar-cal-styles")) {
      const s = document.createElement("style");
      s.id = "diar-cal-styles";
      s.textContent = `
        #diar-cal-dialog::backdrop { background: rgba(0,0,0,0.50); }
        #diar-cal-header { padding: 14px 18px 10px; border-bottom: 1px solid #ddd; flex-shrink: 0; }
        #diar-cal-heading { margin: 0 0 4px; font-size: 1.05rem; font-family: 'Segoe UI', Arial, sans-serif; color: #111; }
        #diar-cal-hint { margin: 0; font-size: 0.82rem; font-family: 'Segoe UI', Arial, sans-serif; color: #555; }
        #diar-cal-ul { list-style: none; padding: 6px 0; margin: 0; overflow-y: auto; flex: 1; }
        .diar-cal-btn {
          width: 100%; text-align: left; padding: 10px 18px; border: none; border-bottom: 1px solid #f0f0f0;
          cursor: pointer; background: #fff; font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 0.90rem; color: #111; border-radius: 0;
        }
        #diar-cal-ul li:last-child .diar-cal-btn { border-bottom: none; }
        .diar-cal-btn:focus { background: #1a5fb4; color: #fff; outline: 3px solid #0a3d8a; outline-offset: -3px; }
        .diar-cal-btn:hover:not(:focus) { background: #d0e4ff; }
        #diar-cal-footer { padding: 7px 18px; font-size: 0.8rem; color: #666; border-top: 1px solid #ddd; font-family: 'Segoe UI', Arial, sans-serif; flex-shrink: 0; }
      `;
      document.head.appendChild(s);
    }

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
      btn.addEventListener("click", () => activateCalRow(i));
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
  }

  function getCalButtons() {
    if (!calDialog) return [];
    return Array.from(calDialog.querySelectorAll(".diar-cal-btn"));
  }

  function setCalActive(index) {
    if (!calRows.length) return;
    index = Math.max(0, Math.min(index, calRows.length - 1));
    calActiveIndex = index;
    const buttons = getCalButtons();
    if (buttons[calActiveIndex]) {
      buttons[calActiveIndex].focus();
      buttons[calActiveIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function activateCalRow(index) {
    const row = calRows[index];
    if (!row) return;
    const link = row.aktivointiLinkki;
    closeCalendarList();
    setTimeout(() => {
      if (link) link.click();
      else if (row.tr) row.tr.querySelector("a.kalenteriblokki").click();
    }, 50);
  }

  function openCalendarList() {
    if (calDialog) return;
    if (document.querySelector('.fc-agendaWeek-view, .fc-agendaDay-view')) {
      openWeekViewEventList();
    } else {
      openCalendarListDialog();
    }
  }

  function openCalendarListDialog() {
    calRows = collectCalendarRows();
    if (!calRows.length) {
      announce("Kalenteritapahtumia ei löydy näkymästä.", "assertive");
      return;
    }
    calActiveIndex = 0;
    calDialog = buildCalendarDialog(calRows);
    document.body.appendChild(calDialog);
    calDialog.showModal();
    calDialog.addEventListener("keydown", handleCalKey);
    calDialog.addEventListener("close", () => {
      calDialog.remove();
      calDialog = null;
      calRows = [];
    });
    setTimeout(() => setCalActive(0), 50);
  }

  function closeCalendarList() {
    if (!calDialog) return;
    calDialog.close();
  }

  function handleCalKey(e) {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setCalActive(calActiveIndex + 1); break;
      case "ArrowUp": e.preventDefault(); setCalActive(calActiveIndex - 1); break;
      case "Home": e.preventDefault(); setCalActive(0); break;
      case "End": e.preventDefault(); setCalActive(calRows.length - 1); break;
      case "Enter": e.preventDefault(); activateCalRow(calActiveIndex); break;
      case "Escape": e.preventDefault(); closeCalendarList(); break;
      default:
        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
          const ch = e.key.toLowerCase();
          for (let offset = 1; offset <= calRows.length; offset++) {
            const i = (calActiveIndex + offset) % calRows.length;
            if (calRows[i].label.toLowerCase().startsWith(ch)) {
              setCalActive(i);
              break;
            }
          }
        }
    }
  }

  function focusWhenReady(selector, maxWaitMs) {
    maxWaitMs = maxWaitMs || 3000;
    const started = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        el.focus();
      } else if (Date.now() - started > maxWaitMs) {
        clearInterval(interval);
      }
    }, 50);
  }

  function waitForElement(selector, maxWaitMs, callback) {
    maxWaitMs = maxWaitMs || 5000;
    const started = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        callback(el);
      } else if (Date.now() - started > maxWaitMs) {
        clearInterval(interval);
        announce("Sivun lataus kesti liian kauan.", "assertive");
      }
    }, 100);
  }

  function activateNavLink(text) {
    const links = document.querySelectorAll("a.n-font-weight-heading");
    const target = Array.from(links).find((a) => a.textContent.trim() === text);
    if (target) {
      target.click();
    } else {
      announce("Navigointilinkkiä ei löydy: " + text, "assertive");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 5: DROPZONE-SAAVUTETTAVUUSKORJAUS
  // ═══════════════════════════════════════════════════════════════════════════

  function patchDropzone(el) {
    if (el.dataset.diarPatched) return;
    el.dataset.diarPatched = "1";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", "Lisää tiedosto");
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  }

  function initDropzonePatch() {
    const existing = document.querySelector("#dropzone");
    if (existing) {
      patchDropzone(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = document.querySelector("#dropzone");
      if (el) patchDropzone(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  }

  initDropzonePatch();

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 6: TÄNÄÄN-PAINIKKEEN TILAKORJAUS
  // ═══════════════════════════════════════════════════════════════════════════

  const TANAAN_BTN_LABEL_OFF = "Tänään, suodatin pois päältä";
  const TANAAN_BTN_LABEL_ON  = "Tänään, suodatin päällä – näytetään vain tämän päivän tapahtumat";

  function isTanaanActive(el) {
    return el.classList.contains("painike_aktiivinen");
  }

  function updateTanaanBtn(el) {
    const active = isTanaanActive(el);
    el.setAttribute("aria-pressed", active ? "true" : "false");
    el.setAttribute("aria-label", active ? TANAAN_BTN_LABEL_ON : TANAAN_BTN_LABEL_OFF);
  }

  function initTanaanBtnPatch() {
    function patch(el) {
      updateTanaanBtn(el);
      const observer = new MutationObserver(() => {
        const wasActive = el.getAttribute("aria-pressed") === "true";
        const isActive  = isTanaanActive(el);
        if (wasActive !== isActive) {
          updateTanaanBtn(el);
          announce(
            isActive
              ? "Suodatin päällä. Näytetään vain tämän päivän tapahtumat."
              : "Suodatin pois päältä. Näytetään kaikki tapahtumat.",
            "assertive"
          );
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    }
    const existing = document.querySelector("#list_calendars_today_btn");
    if (existing) {
      patch(existing);
      return;
    }
    const waitObserver = new MutationObserver(() => {
      const el = document.querySelector("#list_calendars_today_btn");
      if (el) {
        waitObserver.disconnect();
        patch(el);
      }
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => waitObserver.disconnect(), 30000);
  }

  if (window.location.pathname.includes("list_calendars")) {
    initTanaanBtnPatch();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 7: VIIKKOKALENTERI – NAVIGAATIOPAINIKKEIDEN SAAVUTETTAVUUS
  // ═══════════════════════════════════════════════════════════════════════════

  function patchCalendarToolbar() {
    const TOOLBAR_PATCHES = [
      { sel: ".fc-prev-button",        label: "Edellinen viikko" },
      { sel: ".fc-next-button",        label: "Seuraava viikko"  },
      { sel: ".fc-today-button",       label: "Tänään"           },
      { sel: ".fc-agendaWeek-button",  label: "Viikkonäkymä"     },
      { sel: ".fc-agendaDay-button",   label: "Päivänäkymä"      },
    ];

    TOOLBAR_PATCHES.forEach(({ sel, label }) => {
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
        if (txt) announce("Kalenteri: " + txt);
      });
      obs.observe(heading, { childList: true, subtree: true, characterData: true });
    }
  }

  if (window.location.pathname.includes("/calendars/")) {
    waitForElement(".fc-prev-button", 6000, () => patchCalendarToolbar());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 8: VIIKKOKALENTERI – TAPAHTUMALUETTELO (Alt+K)
  // ═══════════════════════════════════════════════════════════════════════════

  function collectWeekViewEvents() {
    const dayHeaders = Array.from(document.querySelectorAll("th.fc-day-header.fc-widget-header"));
    const events = [];

    document.querySelectorAll("a.fc-time-grid-event.kalenteriblokki").forEach((el) => {
      const timeSpan = el.querySelector(".fc-time span");
      const time = timeSpan ? timeSpan.textContent.trim() : "";
      const infoIcon = el.querySelector(".varaus_info");
      const type = infoIcon ? (infoIcon.getAttribute("title") || "").trim() : "";
      const titleEl = el.querySelector(".fc-title");
      const customer = titleEl ? titleEl.textContent.trim() : "";

      const container = el.closest(".fc-event-container");
      const td = container ? container.parentElement : null;
      let dayName = "";
      let dayIndex = 0;

      if (td && td.parentElement) {
        const siblings = Array.from(td.parentElement.children);
        const tdIdx = siblings.indexOf(td) - 1;
        dayIndex = Math.max(0, tdIdx);
        if (dayHeaders[tdIdx]) {
          dayName = dayHeaders[tdIdx].textContent.trim();
        }
      }

      const startTimeStr = time.split(" ")[0] || "00:00";
      const [hh = 0, mm = 0] = startTimeStr.split(":").map(Number);
      const sortKey = dayIndex * 10000 + hh * 100 + mm;

      const parts = [dayName, time, type, customer].filter(Boolean);
      const label = parts.join(" – ");

      events.push({ label, aktivointiLinkki: el, tr: null, sortKey });
    });

    events.sort((a, b) => a.sortKey - b.sortKey);
    return events;
  }

  function openWeekViewEventList() {
    const rows = collectWeekViewEvents();
    if (!rows.length) {
      announce("Viikkonäkymässä ei ole tapahtumia.", "assertive");
      return;
    }
    calRows = rows;
    calActiveIndex = 0;
    calDialog = buildCalendarDialog(calRows);

    const heading = calDialog.querySelector("#diar-cal-heading");
    if (heading) heading.textContent = "Viikkonäkymän tapahtumat";
    const hint = calDialog.querySelector("#diar-cal-hint");
    if (hint) {
      hint.textContent = "Nuolet: selaa  |  Enter: avaa tapahtuma  |  Esc: sulje  |  Kirjain: hyppää päivään";
    }
    const footer = calDialog.querySelector("#diar-cal-footer");
    if (footer) footer.textContent = rows.length + " tapahtumaa";

    document.body.appendChild(calDialog);
    calDialog.showModal();
    calDialog.addEventListener("keydown", handleCalKey);
    calDialog.addEventListener("close", () => {
      calDialog.remove();
      calDialog = null;
      calRows = [];
    });
    setTimeout(() => setCalActive(0), 50);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 9: KALENTERIN PÄIVÄMÄÄRÄT JA KELLONAJAT PAINIKKEIKSI
  // ═══════════════════════════════════════════════════════════════════════════

  // Tilan seuranta sille, mikä päiväsarakkeen indeksi on viimeksi valittu
  let diarActiveDayIndex = -1;

  function simulateClickOnElement(el, customLabel, overrideX, overrideY) {
    const rect = el.getBoundingClientRect();
    const x = overrideX !== undefined ? overrideX : rect.left + rect.width / 2;
    const y = overrideY !== undefined ? overrideY : rect.top + rect.height / 2;

    ["mousedown", "mouseup", "click"].forEach((evtType) => {
      el.dispatchEvent(
        new MouseEvent(evtType, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
        })
      );
    });
    
    const label = customLabel || el.getAttribute("aria-label") || el.textContent.trim().replace(/\s+/g, " ");
    announce("Valittu: " + label, "polite");
  }

  function patchCalendarGridElements() {
    document.querySelectorAll("th.fc-day-header").forEach((el, index) => {
      if (el.dataset.diarGridPatched) return;
      el.dataset.diarGridPatched = "1";

      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      
      const txt = el.textContent.trim().replace(/\s+/g, " ");
      el.setAttribute("aria-label", "Päivämäärä: " + txt);

      el.addEventListener("focus", () => { diarActiveDayIndex = index; });
      el.addEventListener("mousedown", () => { diarActiveDayIndex = index; });

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          diarActiveDayIndex = index;
          
          const link = el.querySelector("a");
          if (link) {
            link.click();
            announce("Valittu päivämäärä: " + txt, "polite");
          } else {
            simulateClickOnElement(el, "Päivämäärä: " + txt);
          }
        }
      });
    });

    document.querySelectorAll(".fc-slats tr").forEach((el) => {
      if (el.dataset.diarGridPatched) return;
      el.dataset.diarGridPatched = "1";

      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");

      const timeSpan = el.querySelector(".fc-time span");
      const timeText = timeSpan ? timeSpan.textContent.trim() : "Aikasolu (välirivi)";
      el.setAttribute("aria-label", "Kalenterin aikarivi: " + timeText);

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          
          const timeRect = el.getBoundingClientRect();
          const targetY = timeRect.top + (timeRect.height / 2);
          let targetX = timeRect.left + (timeRect.width / 2);

          if (diarActiveDayIndex !== -1) {
            const dayHeaders = document.querySelectorAll("th.fc-day-header");
            const headerEl = dayHeaders[diarActiveDayIndex] || dayHeaders[0];
            if (headerEl) {
              const dayRect = headerEl.getBoundingClientRect();
              targetX = dayRect.left + (dayRect.width / 2);
            }
          }
          
          simulateClickOnElement(el, "Kellonaika: " + timeText, targetX, targetY);
        }
      });
    });
  }

  const gridObserver = new MutationObserver(() => {
    if (document.querySelector(".fc-view-container")) {
      patchCalendarGridElements();
    }
  });
  gridObserver.observe(document.body, { childList: true, subtree: true });

  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 10: UUSI AIKA PUUNÄKYMÄSTÄ (Alt+N) - RUUDUNLUKIJAFIXI
  // ═══════════════════════════════════════════════════════════════════════════

  let treeDialog = null;
  let treeData = [];

  function getCalendarGridData() {
    const days = Array.from(document.querySelectorAll("th.fc-day-header"));
    // Muutos: Haetaan VAIN kokonaiset kellonajat suodattamalla :not(.fc-minor) elementit
    const times = Array.from(document.querySelectorAll(".fc-slats tr:not(.fc-minor)"));
    if (!days.length || !times.length) return null;

    return days.map((dayEl, dayIndex) => {
      const dayText = dayEl.textContent.trim().replace(/\s+/g, " ") || "Päivä " + (dayIndex + 1);
      const dayRect = dayEl.getBoundingClientRect();
      const dayX = dayRect.left + (dayRect.width / 2);
      const dayY = dayRect.top + (dayRect.height / 2);

      const timeSlots = times.map((timeEl, timeIndex) => {
        const timeSpan = timeEl.querySelector(".fc-time span");
        const timeText = timeSpan ? timeSpan.textContent.trim() : "Aika " + timeIndex;
        const timeRect = timeEl.getBoundingClientRect();
        return { timeEl, timeText, timeY: timeRect.top + (timeRect.height / 2), timeIndex };
      });

      return { dayEl, dayText, dayX, dayY, dayIndex, timeSlots };
    });
  }

  function injectTreeStyles() {
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
      
      /* Ruudunlukijaystävällinen nuoli-ikoni */
      .diar-tree-icon { display: inline-block; width: 1.2em; font-size: 0.8em; transition: transform 0.1s; }
      .diar-treeitem[aria-expanded="true"] .diar-tree-icon { transform: rotate(90deg); }
      
      .diar-treeitem.is-time { padding-left: 40px; font-size: 0.88rem; border-bottom: 1px dashed #eee; }
      .diar-treeitem:focus { background: #1a5fb4; color: #fff; outline: 3px solid #0a3d8a; outline-offset: -3px; }
      .diar-treeitem:hover:not(:focus) { background: #d0e4ff; }
    `;
    document.head.appendChild(style);
  }

  function openBookingTreeDialog() {
    if (treeDialog) return;
    treeData = getCalendarGridData();
    
    if (!treeData) {
      announce("Kalenterinäkymä ei ole auki tai aikoja ei löydy.", "assertive");
      return;
    }

    injectTreeStyles();
    treeDialog = document.createElement("dialog");
    treeDialog.id = "diar-tree-dialog";
    treeDialog.setAttribute("role", "application");
    treeDialog.setAttribute("aria-label", "Tee varaus");

    const header = document.createElement("div");
    header.style.cssText = "padding: 14px 18px 10px; border-bottom: 1px solid #ddd; flex-shrink: 0;";
    const h2 = document.createElement("h2");
    h2.textContent = "Tee varaus (Puunäkymä)";
    h2.style.cssText = "margin: 0 0 4px; font-size: 1.05rem; font-family: 'Segoe UI', Arial, sans-serif; color: #111;";
    const hint = document.createElement("p");
    hint.textContent = "Ylös/Alas: selaa | Oikea: avaa päivä | Vasen: sulje päivä | Enter: valitse | Esc: sulje";
    hint.style.cssText = "margin: 0; font-size: 0.82rem; font-family: 'Segoe UI', Arial, sans-serif; color: #555;";
    header.appendChild(h2);
    header.appendChild(hint);

    const rootUl = document.createElement("ul");
    rootUl.className = "diar-tree";
    rootUl.setAttribute("role", "tree");
    rootUl.id = "diar-tree-root";

    treeData.forEach((day, dIdx) => {
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
    footer.textContent = "Valitse päivä ja kellonaika uutta varausta varten.";

    treeDialog.appendChild(header);
    treeDialog.appendChild(rootUl);
    treeDialog.appendChild(footer);
    document.body.appendChild(treeDialog);
    treeDialog.showModal();

    function getVisibleItems() {
      return Array.from(treeDialog.querySelectorAll('.diar-treeitem')).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
    }

    function focusItem(el) {
      if (!el) return;
      treeDialog.querySelectorAll('.diar-treeitem').forEach(n => n.setAttribute("tabindex", "-1"));
      el.setAttribute("tabindex", "0");
      el.focus();
    }

    treeDialog.addEventListener("keydown", (e) => {
      const active = document.activeElement;
      if (!active || !active.classList.contains("diar-treeitem")) {
        if (e.key === "Escape") { e.preventDefault(); treeDialog.close(); }
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
            announce("Avattu: " + active.querySelector('span:not(.diar-tree-icon)').textContent, "polite");
          } else if (isDay && active.getAttribute("aria-expanded") === "true") {
            focusItem(items[currentIndex + 1]);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (isDay && active.getAttribute("aria-expanded") === "true") {
            active.setAttribute("aria-expanded", "false");
            announce("Suljettu: " + active.querySelector('span:not(.diar-tree-icon)').textContent, "polite");
          } else if (!isDay) {
            const dayIdx = active.dataset.dayIndex;
            const parentDay = treeDialog.querySelector(`.diar-treeitem[data-is-day="true"][data-day-index="${dayIdx}"]`);
            focusItem(parentDay);
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (isDay) {
            const expanded = active.getAttribute("aria-expanded") === "true";
            active.setAttribute("aria-expanded", expanded ? "false" : "true");
            announce(expanded ? "Suljettu" : "Avattu", "polite");
          } else {
            executeTreeBooking(active);
          }
          break;
        case "Escape":
          e.preventDefault();
          treeDialog.close();
          break;
      }
    });

    treeDialog.addEventListener("click", (e) => {
      const item = e.target.closest(".diar-treeitem");
      if (!item) return;
      focusItem(item);
      if (item.dataset.isDay === "true") {
        const expanded = item.getAttribute("aria-expanded") === "true";
        item.setAttribute("aria-expanded", expanded ? "false" : "true");
      } else {
        executeTreeBooking(item);
      }
    });

    treeDialog.addEventListener("close", () => {
      treeDialog.remove(); 
      treeDialog = null; 
      treeData = [];
    });

    setTimeout(() => {
      const firstDay = treeDialog.querySelector(".diar-treeitem");
      if (firstDay) focusItem(firstDay);
    }, 50);
  }

  function executeTreeBooking(timeEl) {
    const dIdx = parseInt(timeEl.dataset.dayIndex, 10);
    const tIdx = parseInt(timeEl.dataset.timeIndex, 10);
    const dayObj = treeData[dIdx];
    const timeObj = dayObj.timeSlots[tIdx];

    treeDialog.close();
    
    setTimeout(() => {
      diarActiveDayIndex = dayObj.dayIndex;
      
      simulateClickOnElement(dayObj.dayEl, "Päivä: " + dayObj.dayText, dayObj.dayX, dayObj.dayY);
      
      setTimeout(() => {
        simulateClickOnElement(timeObj.timeEl, "Aika: " + timeObj.timeText, dayObj.dayX, timeObj.timeY);
      }, 150);
    }, 50);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NÄPPÄIMISTÖKUUNTELIJA & OHJEIKKUNA
  // ═══════════════════════════════════════════════════════════════════════════

  document.addEventListener("keydown", (e) => {
    if (!isAltOnly(e)) return;

    switch (e.key) {
      case "i": case "I": e.preventDefault(); toggleIntercom(); break;
      case "l": case "L": e.preventDefault(); openList(); break;
      case "1":
        e.preventDefault();
        activateNavLink("Asiakkaat");
        focusWhenReady("#hakukentta");
        break;
      case "2": e.preventDefault(); activateNavLink("Hoidot"); break;
      case "3":
        e.preventDefault();
        (function () {
          const links = Array.from(document.querySelectorAll("a.n-font-weight-heading"));
          const listLink = links.find(a => a.textContent.trim() === "Listanäkymä");
          if (listLink) {
            listLink.click(); return;
          }
          const match = window.location.pathname.match(/^(\/\d+)\//);
          if (match) {
            window.location.href = match[1] + "/calendars/list_calendars";
          } else {
            announce("Kalenterin listanäkymää ei löydy.", "assertive");
          }
        })();
        break;
      case "k": case "K": e.preventDefault(); openCalendarList(); break;
      case "n": case "N": e.preventDefault(); openBookingTreeDialog(); break;
      case "h": case "H": e.preventDefault(); openHelpDialog(); break;
    }
  });

  function openHelpDialog() {
    const existing = document.getElementById("diar-help-dialog");
    if (existing) { existing.close(); return; }

    const dialog = document.createElement("dialog");
    dialog.id = "diar-help-dialog";
    dialog.setAttribute("aria-labelledby", "diar-help-heading");
    dialog.style.cssText = `
      padding: 0; border: 2px solid #333; border-radius: 8px;
      background: #fff; width: min(520px, 94vw); max-height: 80vh;
      box-shadow: 0 8px 32px rgba(0,0,0,0.30); overflow: hidden;
      display: flex; flex-direction: column;
    `;

    const header = document.createElement("div");
    header.style.cssText = "padding: 14px 18px 10px; border-bottom: 1px solid #ddd; flex-shrink: 0;";
    const h2 = document.createElement("h2");
    h2.id = "diar-help-heading";
    h2.textContent = "Pikanäppäinohjeet";
    h2.setAttribute("tabindex", "-1");
    h2.style.cssText = "margin: 0; font-size: 1.05rem; font-family: 'Segoe UI', Arial, sans-serif; color: #111;";
    header.appendChild(h2);

    const shortcuts = [
      { key: "Alt + 1",      desc: "Asiakkaat — siirry hakukenttään" },
      { key: "Alt + 2",      desc: "Hoidot" },
      { key: "Alt + 3",      desc: "Ajanvaraus — kalenterin listanäkymä" },
      { key: "Alt + L",      desc: "Siirry hakutulosten luetteloon" },
      { key: "Alt + K",      desc: "Siirry kalenteritapahtumien luetteloon (lista- ja viikkonäkymä)" },
      { key: "Alt + N",      desc: "Tee uusi varaus (Päivä/Aika -puunäkymä)" },
      { key: "Alt + I",      desc: "Piilota / näytä Intercom-widget" },
      { key: "Alt + H",      desc: "Avaa / sulje tämä ohje" },
      { key: "",             desc: "— Kalenterin selaus näppäimistöllä —" },
      { key: "Sarkain (Tab)",desc: "Päivämäärät ja aikarivit on nyt lisätty Tab-kiertoon (painikkeiksi)" },
      { key: "Enter / Välilyönti", desc: "Valitsee päivämäärän tai kellonajan kalenterista" },
      { key: "Huom!",        desc: "Valitse ensin päivä. Kun valitset sen jälkeen kellonajan, tapahtuma osuu suoraan valitsemallesi päivälle." },
      { key: "",             desc: "— Tiedoston lisäys —" },
      { key: "Tab → Enter",  desc: "Lisää tiedosto -painike (asiakkaan tiedot)" },
      { key: "",             desc: "— Luetteloissa (Alt+L, Alt+K, Alt+N) —" },
      { key: "Nuoli alas/ylös", desc: "Selaa kohteita (ja puunäkymää)" },
      { key: "Nuoli oikea/vasen", desc: "Avaa tai sulje päivä puunäkymässä" },
      { key: "Enter",        desc: "Avaa valittu kohde tai valitsee kellonajan" },
      { key: "Esc",          desc: "Sulje luettelo, puu tai ohje" },
    ];

    const scrollArea = document.createElement("div");
    scrollArea.style.cssText = "overflow-y: auto; flex: 1; padding: 8px 0;";
    const table = document.createElement("table");
    table.style.cssText = "border-collapse: collapse; width: 100%; font-family: 'Segoe UI', Arial, sans-serif;";

    shortcuts.forEach(({ key, desc }) => {
      const tr = document.createElement("tr");
      if (!key) {
        const td = document.createElement("td");
        td.colSpan = 2;
        td.textContent = desc;
        td.style.cssText = "padding: 10px 18px 4px; font-weight: bold; font-size: 0.82rem; color: #555;";
        tr.appendChild(td);
      } else {
        const tdKey = document.createElement("td");
        tdKey.style.cssText = "padding: 7px 12px 7px 18px; white-space: nowrap; vertical-align: top;";
        const kbd = document.createElement("kbd");
        kbd.textContent = key;
        kbd.style.cssText = `background: #f0f0f0; border: 1px solid #aaa; border-radius: 3px; padding: 2px 7px; font-family: monospace; font-size: 0.88rem;`;
        tdKey.appendChild(kbd);

        const tdDesc = document.createElement("td");
        tdDesc.textContent = desc;
        tdDesc.style.cssText = "padding: 7px 18px 7px 4px; font-size: 0.90rem; color: #111; border-bottom: 1px solid #f0f0f0;";
        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
      }
      table.appendChild(tr);
    });

    scrollArea.appendChild(table);

    const footer = document.createElement("div");
    footer.style.cssText = "padding: 10px 18px; border-top: 1px solid #ddd; flex-shrink: 0;";
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Sulje (Esc)";
    closeBtn.type = "button";
    closeBtn.style.cssText = `padding: 7px 18px; cursor: pointer; border: 1px solid #333; border-radius: 4px; background: #f0f0f0; font-size: 0.90rem; font-family: 'Segoe UI', Arial, sans-serif;`;
    closeBtn.addEventListener("click", () => dialog.close());
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
  }

})();