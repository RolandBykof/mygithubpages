/**
 * LinkedIn Post Heading Injector v1.1
 * Lisää h5-tason otsikkoroolin jokaiseen julkaisutekstiin.
 * Käyttäjä voi navigoida julkaisujen välillä NVDA:n H-näppäimellä.
 *
 * LinkedIn on yhden sivun sovellus: kun käyttäjä avaa linkedin.com-osoitteen
 * tai siirtyy syötteeseen LinkedInin sisältä, selain ei lataa sivua uudelleen,
 * vaan LinkedIn vaihtaa osoitteen /feed/:ksi itse. Siksi skripti ladataan
 * kaikille LinkedInin sivuille (ks. manifest.json), ja syötteen tarkistus
 * tehdään täällä joka kerta, kun sivun sisältö muuttuu. Näin otsikot tulevat
 * heti, eikä sivua tarvitse päivittää F5:llä.
 */

(function () {
  'use strict';

  const PROCESSED_ATTR = 'data-linkedin-h5';
  // Vain käsittelemättömät julkaisutekstit, jottei samaa elementtiä käydä
  // läpi uudelleen jokaisella muutoksella.
  const SELECTOR =
    '[data-testid="expandable-text-box"]:not([' + PROCESSED_ATTR + '])';

  function isFeed() {
    return location.pathname === '/feed' ||
      location.pathname.startsWith('/feed/');
  }

  function injectHeading(el) {
    el.setAttribute('role', 'heading');
    el.setAttribute('aria-level', '5');
    el.setAttribute(PROCESSED_ATTR, '1');
  }

  function processAll() {
    if (!isFeed()) return;
    document.querySelectorAll(SELECTOR).forEach(injectHeading);
  }

  // Syöte muuttuu jatkuvasti selattaessa. Muutokset kootaan yhteen
  // käsittelyyn ruudunpäivitystä kohden, jottei sivu hidastu.
  let scheduled = false;
  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      processAll();
    });
  }

  // Käsittele sivulla jo olevat julkaisut
  processAll();

  // Tarkkaile uusia julkaisuja ja siirtymiä syötteeseen
  const observer = new MutationObserver(scheduleProcess);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Selaimen Takaisin- ja Eteenpäin-painikkeet
  window.addEventListener('popstate', scheduleProcess);

})();
