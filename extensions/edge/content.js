/**
 * Palautejärjestelmä – Saavutettavuus
 *
 * Lisää piilotetut h3-otsikot palautetaulukon riveihin,
 * jotta ruudunlukijan käyttäjä voi navigoida palautteesta
 * toiseen H-näppäimellä tai otsikkoluettelolla.
 */

(function () {
  "use strict";

  /**
   * Varmistetaan, että sr-only-tyyli on saatavilla.
   * Sivustolla on oma sr-only-luokka, mutta injektoidaan
   * varmuuden vuoksi oma versio, jos sitä ei löydy.
   */
  function ensureSrOnlyStyle() {
    if (document.querySelector("style[data-palautea11y]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-palautea11y", "");
    style.textContent = `
      .palautea11y-sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Lukee rivin solusta tekstin annetulla CSS-luokalla.
   */
  function cellText(row, className) {
    const el = row.querySelector(`.${className}`);
    return el ? el.textContent.trim() : "";
  }

  /**
   * Rakentaa h3-otsikon yhdelle taulukkoriville.
   */
  function buildHeading(row) {
    // Tunniste – linkki, jossa on asianumero
    const idLink = row.querySelector("td a.ng-binding");
    const id = idLink ? idLink.textContent.trim() : "";

    // Otsikko (palauteteksti)
    let title = cellText(row, "form-data-value-feedback-title");
    // Lyhennetään pitkä otsikko luettavuuden vuoksi
    if (title.length > 100) {
      title = title.substring(0, 100) + "…";
    }

    // Tilan tarkenne
    const status = cellText(row, "form-data-value-feedback-status");

    // Saapumispäivä
    const date = cellText(row, "form-data-value-eCaseCreated");

    // Kootaan otsikkoteksti
    const parts = [id, title, status, date].filter(Boolean);
    return parts.join(" – ");
  }

  /**
   * Käy läpi taulukon rivit ja lisää puuttuvat h3-otsikot.
   */
  function addHeadings() {
    const tbody = document.querySelector("tbody.ui-datatable-data");
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");
    if (rows.length === 0) return;

    ensureSrOnlyStyle();

    rows.forEach((row) => {
      // Ohitetaan, jos otsikko on jo lisätty
      if (row.querySelector("h3.palautea11y-sr-only")) return;

      const text = buildHeading(row);
      if (!text) return;

      const h3 = document.createElement("h3");
      h3.className = "palautea11y-sr-only";
      h3.textContent = text;

      // Lisätään otsikko rivin ensimmäiseen soluun
      const firstTd = row.querySelector("td");
      if (firstTd) {
        firstTd.prepend(h3);
      }
    });
  }

  /**
   * Seuraa DOM-muutoksia ja lisää otsikot kun taulukko päivittyy.
   * AngularJS renderöi sisällön asynkronisesti ja päivittää sen
   * suodatinmuutosten, sivutuksen ja lajittelun yhteydessä.
   */
  function startObserver() {
    // Etsitään ensin AngularJS-sovelluksen juurielementti
    const root = document.querySelector("#queuesApp") || document.body;

    let timeout = null;

    const observer = new MutationObserver(() => {
      // Käytetään pientä viivettä, jotta Angular ehtii
      // renderöidä kaikki rivit ennen otsikkojen lisäämistä
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(addHeadings, 300);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    // Ajetaan kerran heti käynnistyksen yhteydessä
    addHeadings();
  }

  // Käynnistetään kun DOM on valmis
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
})();
