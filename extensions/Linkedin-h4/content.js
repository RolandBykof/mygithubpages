/**
 * LinkedIn Post Heading Injector v1.0
 * Lisää h5-tason otsikkoroolin jokaiseen julkaisutekstiin.
 * Käyttäjä voi navigoida julkaisujen välillä NVDA:n H-näppäimellä.
 */

(function () {
  'use strict';

  const SELECTOR = '[data-testid="expandable-text-box"]';
  const PROCESSED_ATTR = 'data-linkedin-h5';

  function injectHeading(el) {
    if (el.hasAttribute(PROCESSED_ATTR)) return;
    el.setAttribute('role', 'heading');
    el.setAttribute('aria-level', '5');
    el.setAttribute(PROCESSED_ATTR, '1');
  }

  function processAll() {
    document.querySelectorAll(SELECTOR).forEach(injectHeading);
  }

  // Käsittele sivulla jo olevat julkaisut
  processAll();

  // Tarkkaile uusia julkaisuja kun käyttäjä scrollaa
  const observer = new MutationObserver(() => {
    processAll();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
