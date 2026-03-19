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
   * ARIARAKENNE:
   *
   *  #diar-list-backdrop                   tausta (klikkauksella sulkee)
   *    div[role="dialog"][aria-modal="true"]
   *      h2#diar-list-heading              "Asiakasluettelo"
   *      p                                 ohjeet
   *      div[role="listbox"]               tabindex="0", aria-activedescendant
   *        div[role="option"]×N            id="diar-opt-N", aria-selected
   *      div                               rivi-info DataTablesista
   *
   * Miksi listbox?
   *   NVDA ja JAWS lukevat listbox-optionit automaattisesti nuolinäppäimillä
   *   aria-activedescendant-mekanismin kautta — fokus pysyy listbox-elementissä,
   *   mutta ruudunlukija lukee aktiivisen option tekstin jokaisen nuolipainalluksen
   *   jälkeen. Tämä on luotettavin tapa toteuttaa nuolilla selattava lista
   *   molemmille ruudunlukijoille.
   */

  let listOverlay = null;
  let listBox = null;
  let activeIndex = 0;
  let listRows = [];

  // ── CSS ───────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("diar-ext-styles")) return;
    const style = document.createElement("style");
    style.id = "diar-ext-styles";
    style.textContent = `
      #diar-list-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.55);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #diar-list-dialog {
        background: #fff;
        border-radius: 6px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.28);
        width: min(660px, 94vw);
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        outline: none;
      }
      #diar-list-header {
        padding: 14px 18px 10px;
        border-bottom: 1px solid #ddd;
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
      #diar-list-box {
        overflow-y: auto;
        flex: 1;
        padding: 4px 0;
        outline: none;
      }
      /* Korostusviiva listboxilla — näkyvä fokus-indikaattori */
      #diar-list-box:focus {
        outline: 3px solid #1a5fb4;
        outline-offset: -3px;
      }
      .diar-list-option {
        padding: 9px 18px;
        cursor: pointer;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 0.93rem;
        color: #111;
        border-bottom: 1px solid #f0f0f0;
        user-select: none;
      }
      .diar-list-option:last-child {
        border-bottom: none;
      }
      .diar-list-option[aria-selected="true"] {
        background: #1a5fb4;
        color: #fff;
        outline: 3px solid #0a3d8a;
        outline-offset: -3px;
      }
      .diar-list-option:hover {
        background: #d0e4ff;
        color: #111;
      }
      .diar-list-option[aria-selected="true"]:hover {
        background: #1755a8;
        color: #fff;
      }
      #diar-list-footer {
        padding: 7px 18px;
        font-size: 0.8rem;
        color: #666;
        border-top: 1px solid #ddd;
        font-family: 'Segoe UI', Arial, sans-serif;
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

      // Lisää puhelin ja sähköposti labeliin jos täytetty
      const extras = [];
      if (cells[4] && cells[4].textContent.trim())
        extras.push("puh. " + cells[4].textContent.trim());
      if (cells[5] && cells[5].textContent.trim())
        extras.push(cells[5].textContent.trim());

      let label = [suku, etu].filter(Boolean).join(" ");
      if (extras.length) label += " (" + extras.join(", ") + ")";

      // Tallennetaan sukunimi-td erikseen — se on elementti jonka
      // klikkaus avaa asiakaskortin DataTablesissa.
      const sukunimiTd = cells[2] || cells[0];
      rows.push({ label, tr, sukunimiTd });
    });

    return rows;
  }

  // ── Luettelon rakentaminen ────────────────────────────────────────────────

  function buildList(rows) {
    const backdrop = document.createElement("div");
    backdrop.id = "diar-list-backdrop";
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) closeList();
    });

    const dialog = document.createElement("div");
    dialog.id = "diar-list-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "diar-list-heading");

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

    const box = document.createElement("div");
    box.id = "diar-list-box";
    box.setAttribute("role", "listbox");
    box.setAttribute("aria-label", "Asiakkaat, " + rows.length + " kpl");
    box.setAttribute("tabindex", "0");

    rows.forEach(({ label }, i) => {
      const opt = document.createElement("div");
      opt.className = "diar-list-option";
      opt.setAttribute("role", "option");
      opt.id = "diar-opt-" + i;
      opt.setAttribute("aria-selected", i === 0 ? "true" : "false");
      opt.textContent = label;

      opt.addEventListener("mousedown", (e) => {
        e.preventDefault();
        setActive(i);
      });
      opt.addEventListener("click", () => activateRow(i));

      box.appendChild(opt);
    });

    const footer = document.createElement("div");
    footer.id = "diar-list-footer";
    const info = document.querySelector("#datatable_info");
    footer.textContent = info
      ? info.textContent.trim()
      : rows.length + " asiakasta";

    dialog.appendChild(header);
    dialog.appendChild(box);
    dialog.appendChild(footer);
    backdrop.appendChild(dialog);

    return { backdrop, box };
  }

  // ── Aktiivisen rivin asetus ───────────────────────────────────────────────

  function setActive(index) {
    if (!listRows.length || !listBox) return;
    index = Math.max(0, Math.min(index, listRows.length - 1));

    const prev = document.getElementById("diar-opt-" + activeIndex);
    if (prev) prev.setAttribute("aria-selected", "false");

    activeIndex = index;

    const curr = document.getElementById("diar-opt-" + activeIndex);
    if (curr) {
      curr.setAttribute("aria-selected", "true");
      // Tämä on avainmekaniikka: NVDA ja JAWS lukevat elementin,
      // jonka ID on aria-activedescendant, automaattisesti.
      listBox.setAttribute("aria-activedescendant", curr.id);
      curr.scrollIntoView({ block: "nearest" });
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
    if (listOverlay) return;

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

    const { backdrop, box } = buildList(listRows);
    listOverlay = backdrop;
    listBox = box;

    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
      box.focus();
      setActive(0);
    });
  }

  function closeList() {
    if (!listOverlay) return;
    listOverlay.remove();
    listOverlay = null;
    listBox = null;
    listRows = [];
    // Palauta fokus taulukkoon
    const tbl = document.querySelector("#datatable");
    if (tbl) {
      tbl.setAttribute("tabindex", "-1");
      tbl.focus();
    }
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

    // Luettelo on auki — käsitellään kaikki navigointinäppäimet
    if (listOverlay) {
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
          // Kirjainpikanäppäin: hyppää seuraavaan riviin joka alkaa kyseisellä
          if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
            const ch = e.key.toLowerCase();
            // Haetaan aktiivisen jälkeen ensin, sitten kierretään alusta
            for (let offset = 1; offset <= listRows.length; offset++) {
              const i = (activeIndex + offset) % listRows.length;
              // Label alkaa sukunimellä — tarkistetaan suoraan alku
              const sukunimi = listRows[i].label.toLowerCase();
              if (sukunimi.startsWith(ch)) {
                setActive(i);
                break;
              }
            }
          }
      }
      return; // muut näppäimet ei läpäise, kun luettelo on auki
    }

    // Globaalit pikanäppäimet (Alt+kirjain)
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
        break;
      case "2":
        e.preventDefault();
        activateNavLink("Hoidot");
        break;
    }
  });

})();
