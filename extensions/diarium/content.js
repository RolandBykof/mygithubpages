/**
 * Diarium Accessibility Extension
 *
 * Ominaisuudet:
 *   Alt+I  – Piilota / näytä Intercom-widget
 *   Alt+L  – Avaa asiakastaulukosta ruudunlukijaystävällinen luettelo
 *            (nuolet = selaus, Enter = avaa asiakas, Esc = sulje)
 */

(function () {
  "use strict";

  // ═══════════════════════════════════════════════════════════════════════════
  // APUFUNKTIOT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Ilmoittaa viestin ruudunlukijalle ARIA live -alueella.
   * Toimii sekä NVDA:lla että JAWSilla.
   */
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

  /**
   * Toteutus Telavox-laajennuksen mallin mukaan:
   *
   *   <dialog role="application" aria-label="Asiakasluettelo">
   *     <h2>  otsikko
   *     <p>   ohjeet
   *     <ul>
   *       <li><button aria-label="Sukunimi Etunimi">…</button></li> × N
   *     </ul>
   *     <div>  rivi-info
   *   </dialog>
   *
   * Miksi tämä malli on parempi kuin listbox+aria-activedescendant?
   *
   *   role="application" sammuttaa JAWSin ja NVDA:n virtuaalitilan
   *   dialogin sisällä, jolloin nuolinäppäimet menevät suoraan
   *   JavaScriptille eikä ruudunlukijalle.
   *
   *   Jokaisella rivillä on oikea <button> johon .focus() siirretään —
   *   ruudunlukija lukee aria-labelin luonnollisesti, ilman
   *   aria-activedescendant-kiertotietä joka toimii epäluotettavasti
   *   erityisesti JAWSilla.
   *
   *   showModal() hoitaa fokusloukkauksen natiivisti — ei tarvita
   *   omaa backdrop-diviä eikä manuaalista Tab-polutusten esto.
   */

  let listDialog = null;
  let listRows   = [];
  let activeIndex = 0;

  // ── CSS ───────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("diar-ext-styles")) return;
    const style = document.createElement("style");
    style.id = "diar-ext-styles";
    style.textContent = `
      #diar-list-dialog {
        padding: 0;
        border: 2px solid #333;
        border-radius: 8px;
        background: #fff;
        width: min(660px, 94vw);
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.30);
        overflow: hidden;
      }
      #diar-list-dialog::backdrop {
        background: rgba(0,0,0,0.50);
      }
      #diar-list-header {
        padding: 14px 18px 10px;
        border-bottom: 1px solid #ddd;
        flex-shrink: 0;
      }
      #diar-list-heading {
        margin: 0 0 4px;
        font-size: 1.05rem;
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #111;
      }
      #diar-list-hint {
        margin: 0;
        font-size: 0.82rem;
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #555;
      }
      #diar-list-ul {
        list-style: none;
        padding: 6px 0;
        margin: 0;
        overflow-y: auto;
        flex: 1;
      }
      .diar-contact-btn {
        width: 100%;
        text-align: left;
        padding: 10px 18px;
        border: none;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        background: #fff;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 0.93rem;
        color: #111;
        border-radius: 0;
      }
      #diar-list-ul li:last-child .diar-contact-btn {
        border-bottom: none;
      }
      .diar-contact-btn:focus {
        background: #1a5fb4;
        color: #fff;
        outline: 3px solid #0a3d8a;
        outline-offset: -3px;
      }
      .diar-contact-btn:hover:not(:focus) {
        background: #d0e4ff;
      }
      #diar-list-footer {
        padding: 7px 18px;
        font-size: 0.8rem;
        color: #666;
        border-top: 1px solid #ddd;
        font-family: 'Segoe UI', Arial, sans-serif;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Rivien keruu taulukosta ───────────────────────────────────────────────

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
      if (cells[4] && cells[4].textContent.trim())
        extras.push("puh. " + cells[4].textContent.trim());
      if (cells[5] && cells[5].textContent.trim())
        extras.push(cells[5].textContent.trim());

      let label = [suku, etu].filter(Boolean).join(" ");
      if (extras.length) label += " (" + extras.join(", ") + ")";

      const sukunimiTd = cells[2] || cells[0];
      rows.push({ label, tr, sukunimiTd });
    });

    return rows;
  }

  // ── Luettelon rakentaminen ────────────────────────────────────────────────

  function buildDialog(rows) {
    const dialog = document.createElement("dialog");
    dialog.id = "diar-list-dialog";
    // role="application" sammuttaa virtuaalitilan → nuolet JavaScriptille
    dialog.setAttribute("role", "application");
    dialog.setAttribute("aria-label", "Asiakasluettelo");

    const header = document.createElement("div");
    header.id = "diar-list-header";
    const h2 = document.createElement("h2");
    h2.id = "diar-list-heading";
    h2.textContent = "Asiakasluettelo";
    const hint = document.createElement("p");
    hint.id = "diar-list-hint";
    hint.textContent =
      "Nuolet: selaa | Enter: avaa asiakas | Esc: sulje | Kirjain: hyppää nimeen";
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
    footer.textContent = info
      ? info.textContent.trim()
      : rows.length + " asiakasta";

    dialog.appendChild(header);
    dialog.appendChild(ul);
    dialog.appendChild(footer);
    return dialog;
  }

  // ── Apufunktio: napit listasta ────────────────────────────────────────────

  function getButtons() {
    if (!listDialog) return [];
    return Array.from(listDialog.querySelectorAll(".diar-contact-btn"));
  }

  // ── Aktiivisen rivin asetus ───────────────────────────────────────────────

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

  // ── Aktivoi asiakas (Enter / klikkaus) ────────────────────────────────────

  function activateRow(index) {
    const row = listRows[index];
    if (!row) return;

    const target = row.sukunimiTd || row.tr.querySelector("td");
    closeList();

    setTimeout(() => {
      target.click();
    }, 50);
  }

  // ── Avaa / sulje ─────────────────────────────────────────────────────────

  function openList() {
    if (listDialog) return;

    listRows = collectRows();

    if (!listRows.length) {
      announce(
        "Taulukko on tyhjä. Hae ensin asiakkaita hakuvalinnoilla.",
        "assertive"
      );
      return;
    }

    injectStyles();
    activeIndex = 0;

    listDialog = buildDialog(listRows);
    document.body.appendChild(listDialog);
    listDialog.showModal();

    // Näppäimistökuuntelu dialogin sisällä
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
    listDialog.close(); // laukaisee "close"-tapahtuman → siivous siellä
    // Palauta fokus taulukkoon
    const tbl = document.querySelector("#datatable");
    if (tbl) {
      tbl.setAttribute("tabindex", "-1");
      tbl.focus();
    }
  }

  // ── Näppäimistö luettelossa ───────────────────────────────────────────────

  function handleListKey(e) {
    const buttons = getButtons();
    const current = buttons.indexOf(document.activeElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive(activeIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive(activeIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(listRows.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        activateRow(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        closeList();
        break;
      default:
        // Kirjainpikanäppäin: hyppää seuraavaan sukunimellä alkavaan
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

  /**
   * DataTables päivittää #datatable_info -elementin tekstin haun jälkeen.
   * Elementillä on role="status", mutta NVDA ja JAWS eivät lue kolmannen
   * osapuolen tekemiä live-aluepäivityksiä luotettavasti.
   * Ratkaisu: MutationObserver kuuntelee muutosta ja toistaa sen
   * omalla hallitulla aria-live-alueellamme.
   *
   * Lisäksi kuunnellaan #datatable_processing -elementin piilottamista,
   * joka merkitsee haun valmistumista — varmuuden vuoksi.
   */

  function initSearchResultAnnouncer() {
    const waitForDatatable = setInterval(() => {
      const infoEl = document.querySelector("#datatable_info");
      const processingEl = document.querySelector("#datatable_processing");
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
          // Nollataan muisti ilmoituksen jälkeen — sama tulos puhutaan
          // uudelleen seuraavalla haulla, vaikka lukumäärä olisi identtinen.
          lastText = "";
        }, 300);
      }

      // Kuunnellaan info-elementin tekstimuutoksia.
      // lastText nollataan aina ilmoituksen jälkeen, joten sama tulos
      // puhutaan uudelleen seuraavalla haulla — procObserveria ei tarvita.
      const infoObserver = new MutationObserver(maybeAnnounce);
      infoObserver.observe(infoEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }, 500);

    setTimeout(() => clearInterval(waitForDatatable), 20000);
  }

  if (window.location.pathname.includes("list_customers")) {
    initSearchResultAnnouncer();
  }



  // ═══════════════════════════════════════════════════════════════════════════
  // OMINAISUUS 4: KALENTERITAPAHTUMALUETTELO (Alt+K)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Kerää rivit taulukosta table.data (kalenterin listanäkymä).
   * Jokaisen rivin sarakkeet:
   *   td[1] – aika    (a.kalenteriblokki)
   *   td[2] – asiakas (a.kalenteriblokki)
   *   td[3] – tyyppi  (a.kalenteriblokki)
   *   td[4] – työntekijä (a.kalenteriblokki)
   * Aktivointilinkki: a.kalenteriblokki td[1]-solussa.
   */

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

      const aika      = cells[1] ? cells[1].textContent.trim().replace(/\s+/g, " ") : "";
      const asiakas   = cells[2] ? cells[2].textContent.trim() : "";
      const tyyppi    = cells[3] ? cells[3].textContent.trim() : "";
      const tyontekija = cells[4] ? cells[4].textContent.trim() : "";

      if (!aika) return; // ohitetaan tyhjät rivit

      const parts = [aika, asiakas, tyyppi, tyontekija].filter(Boolean);
      const label = parts.join(" – ");

      // Aktivointilinkki on td[1]:n a.kalenteriblokki
      const aktivointiLinkki = cells[1]
        ? cells[1].querySelector("a.kalenteriblokki")
        : null;

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
      padding: 0;
      border: 2px solid #333;
      border-radius: 8px;
      background: #fff;
      width: min(760px, 96vw);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.30);
      overflow: hidden;
    `;

    // Jaetaan sama CSS dialogi-tunnukselle jos ei jo injektoitu
    injectStyles();

    // Lisätään cal-spesifit tyylit
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
          width: 100%; text-align: left; padding: 10px 18px;
          border: none; border-bottom: 1px solid #f0f0f0; cursor: pointer;
          background: #fff; font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 0.90rem; color: #111; border-radius: 0;
        }
        #diar-cal-ul li:last-child .diar-cal-btn { border-bottom: none; }
        .diar-cal-btn:focus {
          background: #1a5fb4; color: #fff;
          outline: 3px solid #0a3d8a; outline-offset: -3px;
        }
        .diar-cal-btn:hover:not(:focus) { background: #d0e4ff; }
        #diar-cal-footer {
          padding: 7px 18px; font-size: 0.8rem; color: #666;
          border-top: 1px solid #ddd; font-family: 'Segoe UI', Arial, sans-serif; flex-shrink: 0;
        }
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
    openCalendarListDialog();
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
      case "ArrowDown":
        e.preventDefault();
        setCalActive(calActiveIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setCalActive(calActiveIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        setCalActive(0);
        break;
      case "End":
        e.preventDefault();
        setCalActive(calRows.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        activateCalRow(calActiveIndex);
        break;
      case "Escape":
        e.preventDefault();
        closeCalendarList();
        break;
      default:
        // Kirjainpikanäppäin: hyppää seuraavaan päivämäärään joka alkaa kyseisellä kirjaimella
        // Label alkaa viikonpäivällä esim. "Pe", "To", "Ke"...
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

  // ── Fokusoi elementti kun se ilmestyy DOM:iin ────────────────────────────

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

  // ── Odota elementtiä ja kutsu callback kun se löytyy ─────────────────────

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

  // ── Navigointilinkin aktivointi tekstin perusteella ──────────────────────

  function activateNavLink(text) {
    // Kaikki navigaatiolinkit jakavat luokan n-font-weight-heading.
    // Haetaan täsmällisellä tekstivertailulla.
    const links = document.querySelectorAll("a.n-font-weight-heading");
    const target = Array.from(links).find(
      (a) => a.textContent.trim() === text
    );
    if (target) {
      target.click();
    } else {
      announce("Navigointilinkkiä ei löydy: " + text, "assertive");
    }
  }

  // ── Näppäimistökuuntelija ─────────────────────────────────────────────────

  document.addEventListener("keydown", (e) => {

    // Globaalit pikanäppäimet (Alt+kirjain)
    // Luettelon näppäimet käsitellään dialogin omassa handleListKey-funktiossa.
    if (!isAltOnly(e)) return;

    switch (e.key) {
      case "i":
      case "I":
        e.preventDefault();
        toggleIntercom();
        break;
      case "l":
      case "L":
        e.preventDefault();
        openList();
        break;
      case "1":
        e.preventDefault();
        activateNavLink("Asiakkaat");
        // Fokusoidaan hakukenttä kun se ilmestyy DOM:iin.
        // input#hakukentta käynnistää NVDA:n ja JAWSin forms moden automaattisesti.
        focusWhenReady("#hakukentta");
        break;
      case "2":
        e.preventDefault();
        activateNavLink("Hoidot");
        break;
      case "3":
        e.preventDefault();
        // Navigoidaan suoraan listanäkymään — tenant-ID poimitaan nykyisestä URL:sta.
        // Kaikki välivaiheet (Ajanvaraus → odota → Listanäkymä) epäonnistuvat
        // koska linkkiklikkaus tekee täyden sivulatauksen ja JS-konteksti tuhoutuu.
        (function () {
          // Kokeillaan ensin: onko Listanäkymä-linkki jo näkyvissä (oltiin jo kalenterissa)
          const links = Array.from(document.querySelectorAll("a.n-font-weight-heading"));
          const listLink = links.find(a => a.textContent.trim() === "Listanäkymä");
          if (listLink) {
            listLink.click();
            return;
          }
          // Poimitaan polun alku nykyisestä URL:sta: /4481/
          const match = window.location.pathname.match(/^(\/\d+)\//);
          if (match) {
            window.location.href = match[1] + "/calendars/list_calendars";
          } else {
            announce("Kalenterin listanäkymää ei löydy.", "assertive");
          }
        })();
        break;
      case "k":
      case "K":
        e.preventDefault();
        openCalendarList();
        break;
      case "h":
      case "H":
        e.preventDefault();
        openHelpDialog();
        break;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OHJE-IKKUNA (Alt+H)
  // ═══════════════════════════════════════════════════════════════════════════

  function openHelpDialog() {
    // Suljetaan jos jo auki
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

    // Otsikko
    const header = document.createElement("div");
    header.style.cssText = "padding: 14px 18px 10px; border-bottom: 1px solid #ddd; flex-shrink: 0;";
    const h2 = document.createElement("h2");
    h2.id = "diar-help-heading";
    h2.textContent = "Pikanäppäinohjeet";
    h2.setAttribute("tabindex", "-1");
    h2.style.cssText = "margin: 0; font-size: 1.05rem; font-family: 'Segoe UI', Arial, sans-serif; color: #111;";
    header.appendChild(h2);

    // Taulukko näppäinkomennoista
    const shortcuts = [
      { key: "Alt + 1",      desc: "Asiakkaat — siirry hakukenttään" },
      { key: "Alt + 2",      desc: "Hoidot" },
      { key: "Alt + 3",      desc: "Ajanvaraus — kalenterin listanäkymä" },
      { key: "Alt + L",      desc: "Siirry hakutulosten luetteloon" },
      { key: "Alt + K",      desc: "Siirry kalenteritapahtumien luettteloon (listanäkymä)" },
      { key: "Alt + I",      desc: "Piilota / näytä Intercom-widget" },
      { key: "Alt + H",      desc: "Avaa / sulje tämä ohje" },
      { key: "",             desc: "— Luetteloissa (Alt+L ja Alt+K) —" },
      { key: "Nuoli alas/ylös", desc: "Selaa kohteita" },
      { key: "Home / End",   desc: "Ensimmäinen / viimeinen" },
      { key: "Kirjain",      desc: "Hyppää seuraavaan samalla alkukirjaimella" },
      { key: "Enter",        desc: "Avaa valittu kohde" },
      { key: "Esc",          desc: "Sulje luettelo tai ohje" },
    ];

    const scrollArea = document.createElement("div");
    scrollArea.style.cssText = "overflow-y: auto; flex: 1; padding: 8px 0;";

    const table = document.createElement("table");
    table.style.cssText = "border-collapse: collapse; width: 100%; font-family: 'Segoe UI', Arial, sans-serif;";

    shortcuts.forEach(({ key, desc }) => {
      const tr = document.createElement("tr");
      if (!key) {
        // Väliotsikkorivi
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
        kbd.style.cssText = `
          background: #f0f0f0; border: 1px solid #aaa; border-radius: 3px;
          padding: 2px 7px; font-family: monospace; font-size: 0.88rem;
        `;
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

    // Sulje-nappi
    const footer = document.createElement("div");
    footer.style.cssText = "padding: 10px 18px; border-top: 1px solid #ddd; flex-shrink: 0;";
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Sulje (Esc)";
    closeBtn.type = "button";
    closeBtn.style.cssText = `
      padding: 7px 18px; cursor: pointer; border: 1px solid #333;
      border-radius: 4px; background: #f0f0f0; font-size: 0.90rem;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;
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
