/**
 * Haso.fi kohdevalikon saavutettavuuskorjaus
 *
 * Tämä selainlaajennus korjaa puheenjohtajan yhteydenottolomakkeen
 * kohdevalikon (pudotusvalikko) saavutettavuusongelman.
 *
 * Ongelmakuvaus:
 *   Lomake on iframe-upotuksessa, ja kohteen valintaan käytetty
 *   pudotusvalikko ei toimi ruudunlukuohjelmalla (NVDA / JAWS).
 *   Tyypillisiä syitä: custom dropdown div-elementeillä ilman
 *   ARIA-rooleja, piilotettu natiivi <select>, tai kirjastojen
 *   (Select2, Choices.js, Tom Select, HDS) pudotusvalikko.
 *
 * Ratkaisu:
 *   1. Tunnistaa custom-pudotusvalikot yleisillä valitsimilla
 *   2. Lisää tarvittavat ARIA-attribuutit
 *   3. Lisää näppäimistönavigaation (nuolinäppäimet, Enter, Esc, Home, End, kirjainhaku)
 *   4. Varmistaa live region -ilmoitukset ruudunlukuohjelmille
 *   5. Tarvittaessa luo natiivin <select>-korvaajan näkyviin
 */

(function () {
  'use strict';

  const PROCESSED_ATTR = 'data-haso-a11y-fixed';
  const DEBUG = false;

  function log(...args) {
    if (DEBUG) console.log('[Haso A11y]', ...args);
  }

  // ============================================================
  // 1. Etsi ja korjaa custom dropdown -komponentit
  // ============================================================

  /**
   * Yleiset valitsimet, joilla custom dropdownit tunnistetaan.
   * Kattaa Select2, Choices.js, Tom Select, ja yleiset custom-toteutukset.
   */
  const CUSTOM_DROPDOWN_SELECTORS = [
    // Select2
    '.select2-container',
    '.select2-selection',
    // Choices.js
    '.choices',
    '.choices__inner',
    // Tom Select
    '.ts-wrapper',
    '.ts-control',
    // Yleisiä custom-pudotusvalikkoja
    '[class*="custom-select"]',
    '[class*="dropdown-select"]',
    '[class*="styled-select"]',
    '[class*="kohde-select"]',
    '[class*="kohde-valinta"]',
    '[class*="target-select"]',
    // Div-pohjaiset pudotusvalikot, joissa on listbox-tyyppinen rooli
    'div[role="listbox"]',
    'div[role="combobox"]',
    // Yleisiä WordPress-lomakeliitännäisten custom-valikkoja
    '.gfield_select',
    '.ginput_container_select',
    '.wpcf7-select',
    '.wpforms-field-select',
    '.frm_opt_container',
    '.ninja-forms-field',
    // Helsinki Design System custom select
    '.hds-select',
    '.hds-dropdown',
    // Suomalaisten lomakepalvelujen komponentteja
    '[class*="form-select"]',
    '[class*="form-dropdown"]',
  ];

  /**
   * Etsii kaikki custom-pudotusvalikon kontainerit.
   */
  function findCustomDropdowns() {
    const selector = CUSTOM_DROPDOWN_SELECTORS.join(', ');
    return document.querySelectorAll(selector);
  }

  // ============================================================
  // 2. Korjaa piilotetut <select>-elementit
  // ============================================================

  /**
   * Jotkin lomakkeet piilottavat natiivin <select>-elementin CSS:llä
   * ja korvaavat sen custom-elementillä. Tämä palauttaa selectin
   * näkyviin screen readereille (sr-only-tyylillä) tai korvaa
   * custom-elementin natiivilla selectillä.
   */
  function fixHiddenSelects() {
    const allSelects = document.querySelectorAll('select');
    allSelects.forEach((select) => {
      if (select.hasAttribute(PROCESSED_ATTR)) return;

      const style = window.getComputedStyle(select);
      const isHidden =
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        (parseInt(style.height) === 0 && parseInt(style.width) === 0) ||
        select.getAttribute('aria-hidden') === 'true' ||
        select.classList.contains('hidden') ||
        select.classList.contains('sr-only') ||
        select.classList.contains('screen-reader-text') ||
        (style.position === 'absolute' && parseInt(style.left) < -9000);

      if (isHidden) {
        log('Piilotettu <select> löydetty:', select);
        makeSelectAccessible(select);
      } else {
        // Varmista ARIA-ominaisuudet myös näkyvillä selecteillä
        ensureSelectAria(select);
      }

      select.setAttribute(PROCESSED_ATTR, 'true');
    });
  }

  /**
   * Tekee piilotetun selectin saavutettavaksi.
   * Strategia: tehdään select näkyväksi ruudunlukuohjelmalle
   * ja piilotaan custom-valikko ARIA:lla.
   */
  function makeSelectAccessible(select) {
    // Vaihtoehto A: tee selectistä sr-only (näkyy ruudunlukijalle mutta ei visuaalisesti)
    select.classList.add('haso-a11y-sr-visible');
    select.removeAttribute('aria-hidden');
    select.removeAttribute('tabindex');
    select.style.setProperty('position', 'absolute', 'important');
    select.style.setProperty('width', '1px', 'important');
    select.style.setProperty('height', '1px', 'important');
    select.style.setProperty('padding', '0', 'important');
    select.style.setProperty('margin', '-1px', 'important');
    select.style.setProperty('overflow', 'hidden', 'important');
    select.style.setProperty('clip', 'rect(0, 0, 0, 0)', 'important');
    select.style.setProperty('white-space', 'nowrap', 'important');
    select.style.setProperty('border', '0', 'important');
    select.style.setProperty('display', 'block', 'important');
    select.style.setProperty('visibility', 'visible', 'important');
    select.style.setProperty('opacity', '1', 'important');

    // Varmista labelin olemassaolo
    ensureSelectAria(select);

    // Synkronoi custom-valikko ← → natiivi select
    select.addEventListener('change', () => {
      syncFromNativeSelect(select);
      announceSelection(select);
    });

    log('Select tehty saavutettavaksi:', select);
  }

  /**
   * Varmistaa, että <select>-elementillä on oikeat ARIA-attribuutit
   * ja yhteys <label>-elementtiin.
   */
  function ensureSelectAria(select) {
    // Jos id puuttuu, generoi se
    if (!select.id) {
      select.id = 'haso-a11y-select-' + Math.random().toString(36).substr(2, 9);
    }

    // Etsi olemassa oleva label
    let label = document.querySelector(`label[for="${select.id}"]`);

    if (!label) {
      // Etsi lähimmästä vanhemmasta
      const parent = select.closest('.gfield, .wpcf7-form-control-wrap, .wpforms-field, .form-group, .field, fieldset, .ginput_container, [class*="field"]');
      if (parent) {
        label = parent.querySelector('label, .gfield_label, .wpforms-field-label, legend');
      }
    }

    if (label && !select.getAttribute('aria-label') && !select.getAttribute('aria-labelledby')) {
      if (!label.id) {
        label.id = 'haso-a11y-label-' + select.id;
      }
      if (label.tagName === 'LABEL' && !label.htmlFor) {
        label.htmlFor = select.id;
      }
      select.setAttribute('aria-labelledby', label.id);
      log('Label yhdistetty selectiin:', label.textContent.trim());
    }

    // Jos labelia ei löydy, kokeile placeholder-tekstiä tai ensimmäistä optiota
    if (!label && !select.getAttribute('aria-label') && !select.getAttribute('aria-labelledby')) {
      const firstOption = select.querySelector('option');
      if (firstOption && firstOption.textContent.trim()) {
        select.setAttribute('aria-label', firstOption.textContent.trim());
      }
    }
  }

  // ============================================================
  // 3. Korjaa custom div-pohjaiset pudotusvalikot
  // ============================================================

  /**
   * Korjaa custom-dropdown-kontainerit, jotka eivät ole natiiveja
   * <select>-elementtejä.
   */
  function fixCustomDropdowns() {
    const containers = findCustomDropdowns();
    containers.forEach((container) => {
      if (container.hasAttribute(PROCESSED_ATTR)) return;
      container.setAttribute(PROCESSED_ATTR, 'true');

      log('Custom dropdown löydetty:', container);

      // Etsi liittyvä piilotettu <select>
      const hiddenSelect = container.querySelector('select') ||
        container.parentElement?.querySelector('select') ||
        container.previousElementSibling?.tagName === 'SELECT' ? container.previousElementSibling : null;

      if (hiddenSelect) {
        // On piilotettu natiivi select → tee se saavutettavaksi
        makeSelectAccessible(hiddenSelect);
        // Piilota custom-versio ruudunlukijalta
        container.setAttribute('aria-hidden', 'true');
        log('Custom dropdown piilotettu, natiivi select nostettu esiin');
      } else {
        // Ei natiiviaSelectiä → tee custom-pudotusvalikosta saavutettava
        enhanceCustomDropdown(container);
      }
    });
  }

  /**
   * Parantaa custom-pudotusvalikon saavutettavuutta
   * lisäämällä ARIA-roolit ja näppäimistönavigaation.
   */
  function enhanceCustomDropdown(container) {
    // Etsi painike/trigger-elementti
    const trigger = container.querySelector(
      '[class*="selection"], [class*="control"], [class*="trigger"], [class*="toggle"], [class*="button"], [class*="header"], [class*="selected"], [role="button"]'
    ) || container;

    // Etsi optiolista
    const listbox = container.querySelector(
      '[class*="results"], [class*="dropdown"], [class*="options"], [class*="list"], [class*="menu"], ul, [role="listbox"]'
    );

    // Aseta trigger combobox-rooliin
    if (!trigger.getAttribute('role')) {
      trigger.setAttribute('role', 'combobox');
    }
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    if (!trigger.hasAttribute('tabindex')) {
      trigger.setAttribute('tabindex', '0');
    }

    // Aseta listbox-rooli
    if (listbox && !listbox.getAttribute('role')) {
      listbox.setAttribute('role', 'listbox');
    }

    // Lisää aria-label jos puuttuu
    if (!trigger.getAttribute('aria-label') && !trigger.getAttribute('aria-labelledby')) {
      // Etsi label läheisyydestä
      const parent = container.closest('.gfield, .field, .form-group, fieldset, [class*="field"]');
      if (parent) {
        const label = parent.querySelector('label, .gfield_label, legend');
        if (label) {
          if (!label.id) {
            label.id = 'haso-a11y-custom-label-' + Math.random().toString(36).substr(2, 9);
          }
          trigger.setAttribute('aria-labelledby', label.id);
        }
      }
    }

    // Etsi yksittäiset optiot ja lisää roolit
    if (listbox) {
      const options = listbox.querySelectorAll(
        'li, [class*="option"], [class*="result"], [class*="item"]'
      );
      options.forEach((opt, index) => {
        if (!opt.getAttribute('role')) {
          opt.setAttribute('role', 'option');
        }
        if (!opt.id) {
          opt.id = 'haso-a11y-option-' + index + '-' + Math.random().toString(36).substr(2, 5);
        }
        if (!opt.hasAttribute('tabindex')) {
          opt.setAttribute('tabindex', '-1');
        }
      });
    }

    // Näppäimistönavigaatio
    addKeyboardNavigation(trigger, listbox, container);

    log('Custom dropdown parannettu:', container);
  }

  // ============================================================
  // 4. Näppäimistönavigaatio custom dropdowneille
  // ============================================================

  function addKeyboardNavigation(trigger, listbox, container) {
    let currentIndex = -1;
    let isOpen = false;
    let searchString = '';
    let searchTimeout;

    function getOptions() {
      if (!listbox) return [];
      return Array.from(listbox.querySelectorAll('[role="option"]'));
    }

    function openDropdown() {
      isOpen = true;
      trigger.setAttribute('aria-expanded', 'true');
      if (listbox) {
        listbox.style.display = '';
        listbox.removeAttribute('aria-hidden');
      }
      // Simuloi klikki avataksesi custom-valikko
      trigger.click();
    }

    function closeDropdown() {
      isOpen = false;
      trigger.setAttribute('aria-expanded', 'false');
      currentIndex = -1;
      trigger.focus();
    }

    function highlightOption(index) {
      const options = getOptions();
      if (options.length === 0) return;

      // Poista edellinen korostus
      options.forEach((opt) => {
        opt.setAttribute('aria-selected', 'false');
        opt.classList.remove('haso-a11y-highlighted');
      });

      // Rajaa indeksi
      if (index < 0) index = 0;
      if (index >= options.length) index = options.length - 1;
      currentIndex = index;

      const option = options[currentIndex];
      option.setAttribute('aria-selected', 'true');
      option.classList.add('haso-a11y-highlighted');
      trigger.setAttribute('aria-activedescendant', option.id);

      // Scrollaa näkyviin
      option.scrollIntoView({ block: 'nearest' });

      // Ilmoita ruudunlukijalle
      announceText(option.textContent.trim());
    }

    function selectOption(index) {
      const options = getOptions();
      if (index < 0 || index >= options.length) return;
      options[index].click();
      closeDropdown();
      announceText('Valittu: ' + options[index].textContent.trim());
    }

    function typeAheadSearch(char) {
      clearTimeout(searchTimeout);
      searchString += char.toLowerCase();
      searchTimeout = setTimeout(() => {
        searchString = '';
      }, 500);

      const options = getOptions();
      const match = options.findIndex((opt) =>
        opt.textContent.trim().toLowerCase().startsWith(searchString)
      );
      if (match !== -1) {
        highlightOption(match);
      }
    }

    trigger.addEventListener('keydown', (e) => {
      const options = getOptions();

      switch (e.key) {
        case 'ArrowDown':
        case 'Down':
          e.preventDefault();
          if (!isOpen) {
            openDropdown();
            if (options.length > 0) {
              highlightOption(0);
            }
          } else {
            highlightOption(currentIndex + 1);
          }
          break;

        case 'ArrowUp':
        case 'Up':
          e.preventDefault();
          if (isOpen) {
            highlightOption(currentIndex - 1);
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && currentIndex >= 0) {
            selectOption(currentIndex);
          } else if (!isOpen) {
            openDropdown();
          }
          break;

        case 'Escape':
        case 'Esc':
          e.preventDefault();
          if (isOpen) {
            closeDropdown();
          }
          break;

        case 'Home':
          e.preventDefault();
          if (isOpen && options.length > 0) {
            highlightOption(0);
          }
          break;

        case 'End':
          e.preventDefault();
          if (isOpen && options.length > 0) {
            highlightOption(options.length - 1);
          }
          break;

        default:
          // Kirjainhaku (type-ahead)
          if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            if (!isOpen) {
              openDropdown();
            }
            typeAheadSearch(e.key);
          }
          break;
      }
    });
  }

  // ============================================================
  // 5. Live region -ilmoitukset
  // ============================================================

  let liveRegion;

  function ensureLiveRegion() {
    if (liveRegion) return liveRegion;
    liveRegion = document.createElement('div');
    liveRegion.id = 'haso-a11y-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'haso-a11y-sr-only';
    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  function announceText(text) {
    const region = ensureLiveRegion();
    region.textContent = '';
    // Pieniviive varmistaa, että ruudunlukija huomaa muutoksen
    requestAnimationFrame(() => {
      region.textContent = text;
    });
  }

  function announceSelection(select) {
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption) {
      announceText('Valittu: ' + selectedOption.textContent.trim());
    }
  }

  function syncFromNativeSelect(select) {
    // Etsi custom dropdown joka on yhteydessä tähän selectiin
    const parent = select.closest('.gfield, .field, .form-group, [class*="field"]') || select.parentElement;
    if (!parent) return;

    const customDisplay = parent.querySelector(
      '.select2-selection__rendered, .choices__item--selectable, .ts-control .item, [class*="selected-text"], [class*="current-value"]'
    );
    if (customDisplay) {
      const option = select.options[select.selectedIndex];
      if (option) {
        customDisplay.textContent = option.textContent;
      }
    }
  }

  // ============================================================
  // 6. Korjaa yleiset lomakkeen saavutettavuusongelmat
  // ============================================================

  /**
   * Etsii labelittomat input/select/textarea-elementit ja
   * yrittää yhdistää ne lähimpään labeliin.
   */
  function fixUnlabeledFormControls() {
    const controls = document.querySelectorAll('input, select, textarea');
    controls.forEach((control) => {
      if (control.hasAttribute(PROCESSED_ATTR + '-label')) return;
      control.setAttribute(PROCESSED_ATTR + '-label', 'true');

      // Ohita piilotetut kentät
      if (control.type === 'hidden') return;

      // Tarkista onko labelyhdistys olemassa
      const hasLabel =
        control.getAttribute('aria-label') ||
        control.getAttribute('aria-labelledby') ||
        document.querySelector(`label[for="${control.id}"]`) ||
        control.closest('label');

      if (!hasLabel) {
        // Etsi lähin label-teksti
        const parent = control.closest('.gfield, .field, .form-group, .wpcf7-form-control-wrap, fieldset, [class*="field"]');
        if (parent) {
          const label = parent.querySelector('label, .gfield_label, .wpforms-field-label, legend, [class*="label"]');
          if (label) {
            if (!label.id) {
              label.id = 'haso-a11y-flabel-' + Math.random().toString(36).substr(2, 9);
            }
            control.setAttribute('aria-labelledby', label.id);
            log('Label yhdistetty kenttään:', label.textContent.trim(), control);
          }
        }

        // Jos labelia ei edelleenkään löydy, käytä placeholder-tekstiä
        if (!control.getAttribute('aria-labelledby') && control.placeholder) {
          control.setAttribute('aria-label', control.placeholder);
        }
      }
    });
  }

  /**
   * Korjaa virheelliset role="separator"-attribuutit alavalikkolistoilta.
   * DOM-analyysistä havaittu, että <ul>-elementeillä on role="separator".
   */
  function fixIncorrectRoles() {
    // ul-elementit joilla on role="separator" → pitäisi olla role="menu" tai ei roolia
    const wrongSeparators = document.querySelectorAll('ul[role="separator"], ol[role="separator"]');
    wrongSeparators.forEach((el) => {
      if (el.hasAttribute(PROCESSED_ATTR + '-role')) return;
      el.setAttribute(PROCESSED_ATTR + '-role', 'true');
      el.removeAttribute('role');
      log('Virheellinen role="separator" poistettu ul/ol-elementiltä:', el);
    });

    // Korjaa myös span[role="separator"] jotka eivät oikeasti ole erottimia
    const spanSeparators = document.querySelectorAll('span[role="separator"]');
    spanSeparators.forEach((el) => {
      if (el.hasAttribute(PROCESSED_ATTR + '-role')) return;
      el.setAttribute(PROCESSED_ATTR + '-role', 'true');
      // Span separator voi olla ok visuaalinen erotin, mutta tarkistetaan
      if (!el.textContent.trim()) {
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // ============================================================
  // 7. Käynnistys ja tarkkailu
  // ============================================================

  function runFixes() {
    log('Suoritetaan saavutettavuuskorjaukset...');
    fixHiddenSelects();
    fixCustomDropdowns();
    fixUnlabeledFormControls();
    fixIncorrectRoles();
  }

  // Suorita heti
  runFixes();

  // Tarkkaile DOM-muutoksia (dynaaminen sisältö, iframe-lataus)
  const observer = new MutationObserver((mutations) => {
    let shouldRerun = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Tarkista onko lisätty elementti tai sen lapsi lomakekenttä/dropdown
            if (
              node.tagName === 'SELECT' ||
              node.tagName === 'INPUT' ||
              node.tagName === 'FORM' ||
              node.querySelector?.('select, input, [role="listbox"], [role="combobox"], [class*="select"], [class*="dropdown"]')
            ) {
              shouldRerun = true;
              break;
            }
          }
        }
      }
      if (shouldRerun) break;
    }
    if (shouldRerun) {
      // Pienellä viiveellä, jotta DOM ehtii vakiintua
      setTimeout(runFixes, 200);
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Suorita uudelleen pienen viiveen jälkeen (iframet ja lazy-load)
  setTimeout(runFixes, 1000);
  setTimeout(runFixes, 3000);
  setTimeout(runFixes, 5000);

  log('Haso.fi saavutettavuuskorjaus ladattu.');
})();
