/**
 * Intercom Toggle – Diarium
 * Piilottaa / palauttaa Intercom-widgetin Alt+I -näppäinkomennolla.
 *
 * Kohdeelementit DOM-analyysin perusteella:
 *   #intercom-container   – pääsäiliö (launcher, messenger, modaalit)
 *   #intercom-css-container – Intercomin omat CSS-injektiot
 *   #intercom-frame       – piilotettu kommunikaatio-iframe (aria-hidden)
 */

(function () {
  "use strict";

  const STORAGE_KEY = "diariumIntercomHidden";
  const SELECTORS = [
    "#intercom-container",
    "#intercom-css-container",
    "#intercom-frame",
  ];

  // ── Tila ─────────────────────────────────────────────────────────────────
  // Muistetaan tila istuntojen välillä sessionStorage:ssa.
  let hidden = sessionStorage.getItem(STORAGE_KEY) === "true";

  // ── Apufunktiot ───────────────────────────────────────────────────────────

  /** Palauttaa kaikki löydetyt Intercom-elementit. */
  function getIntercomElements() {
    return SELECTORS.flatMap((sel) =>
      Array.from(document.querySelectorAll(sel))
    );
  }

  /** Asettaa elementtien näkyvyyden. */
  function applyVisibility(shouldHide) {
    getIntercomElements().forEach((el) => {
      el.style.setProperty(
        "display",
        shouldHide ? "none" : "",
        shouldHide ? "important" : ""
      );
    });
  }

  /**
   * Ilmoittaa tilan muutoksesta ruudunlukijalle ARIA live -alueella.
   * Viesti poistetaan 3 sekunnin kuluttua, jotta se ei jää DOM:iin.
   */
  function announce(message) {
    let liveRegion = document.getElementById("intercom-toggle-live");
    if (!liveRegion) {
      liveRegion = document.createElement("div");
      liveRegion.id = "intercom-toggle-live";
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.setAttribute("role", "status");
      // Visuaalisesti piilotettu, mutta ruudunlukijalle näkyvä
      Object.assign(liveRegion.style, {
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
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = "";
    // Pieni viive varmistaa, että ruudunlukija havaitsee muutoksen
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
    setTimeout(() => {
      liveRegion.textContent = "";
    }, 3000);
  }

  // ── Togglaa tila ──────────────────────────────────────────────────────────

  function toggle() {
    hidden = !hidden;
    sessionStorage.setItem(STORAGE_KEY, hidden);
    applyVisibility(hidden);
    const msg = hidden
      ? "Intercom-widget piilotettu."
      : "Intercom-widget näytetty.";
    announce(msg);
    console.log(`[Intercom Toggle] ${msg}`);
  }

  // ── Näppäinkuuntelija ─────────────────────────────────────────────────────

  document.addEventListener("keydown", (e) => {
    // Alt+I (ei Ctrl, ei Shift, ei Meta)
    if (
      e.altKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.metaKey &&
      e.key.toLowerCase() === "i"
    ) {
      e.preventDefault();
      toggle();
    }
  });

  // ── Alkutila ──────────────────────────────────────────────────────────────
  // Intercom latautuu asynkronisesti – odotetaan, että elementit ilmestyvät.

  function applyInitialState() {
    if (hidden) {
      applyVisibility(true);
    }
  }

  // Koitetaan heti
  applyInitialState();

  // MutationObserver varmistaa, että dynaamisesti lisätyt elementit
  // myös piilotetaan, jos tila on "hidden" sessioissa.
  const observer = new MutationObserver(() => {
    if (hidden) {
      applyVisibility(true);
    }
  });

  observer.observe(document.body, { childList: true, subtree: false });

  // Lopetetaan tarkkaileminen kun Intercom on latautunut
  // (kaikki kolme elementtiä löytyvät).
  function stopObserverWhenReady() {
    const found = SELECTORS.every((sel) => document.querySelector(sel));
    if (found) {
      observer.disconnect();
    }
  }

  const readyCheck = setInterval(() => {
    stopObserverWhenReady();
  }, 500);

  // Siivotaan intervalli viimeistään 15 s kuluttua
  setTimeout(() => clearInterval(readyCheck), 15000);
})();
