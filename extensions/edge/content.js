/**
 * EBS Palautekäsittely – saavutettavuuskorjaukset v2.0
 *
 * Moduuli A: Context-view-paneelit
 *   - ARIA dialog -attribuutit (role, aria-label, aria-modal)
 *   - Fokuksen siirto paneeliin dynaamisesti renderöidyn sisällön jälkeen
 *   - Focus trap (Tab/Shift+Tab kiertää paneelin sisällä)
 *   - Escape sulkee paneelin
 *   - Fokuksen palautus avaavaan elementtiin
 *
 * Moduuli B: ui-select combobox -korjaukset
 *   - aria-activedescendant päivittyy aktiivisen vaihtoehdon mukaan
 *   - aria-controls osoittaa oikeaan listbox-elementtiin
 *   - Live-alue ilmoittaa vaihtoehtojen lukumäärän
 *   - processingType-kentän ihmisluettava nimi
 *   - "Näytä lisää" -linkin aria-expanded-tila
 */

(function () {
  "use strict";

  // =========================================================================
  // YHTEISET APUFUNKTIOT
  // =========================================================================

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") {
      return false;
    }
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      isVisible
    );
  }

  /** Luo tai palauta olemassa oleva aria-live-alue */
  function getOrCreateLiveRegion(id) {
    let region = document.getElementById(id);
    if (!region) {
      region = document.createElement("div");
      region.id = id;
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      // Piilota visuaalisesti mutta näy ruudunlukijalle
      region.style.cssText =
        "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
      document.body.appendChild(region);
    }
    return region;
  }

  // =========================================================================
  // MODUULI A: CONTEXT-VIEW-PANEELIT
  // =========================================================================

  const ContextViewFix = (() => {
    const PANEL_LABELS = {
      "assign-action": "Vaihda käsittelijää",
      "update-action": "Käsittele toimenpide",
      "ecase-links-edit": "Muokkaa linkityksiä",
      "invalidate-ecase": "Mitätöi palaute",
      "change-ecase-status": "Muuta palautteen tilaa",
      "ecase-terminate": "Siirrä järjestelmän ulkopuolelle",
      "return-action": "Palauta käsittelyyn",
      "update-action-duedate": "Aseta määräaika",
    };

    const CONTENT_WAIT_TIMEOUT = 5000;
    const CONTENT_POLL_INTERVAL = 80;

    let triggerElement = null;
    let activePanel = null;
    let contentObserver = null;
    let contentWaitTimer = null;

    function getPanelLabel(panelDiv) {
      for (const [cls, label] of Object.entries(PANEL_LABELS)) {
        if (panelDiv.classList.contains(cls)) return label;
      }
      return "Paneeli";
    }

    function findInitialFocusTarget(panelDiv) {
      const focusable = getFocusableElements(panelDiv);
      return (
        focusable.find(
          (el) => !el.classList.contains("ebs-context-view-close")
        ) ||
        focusable[0] ||
        null
      );
    }

    function applyAria(panelDiv) {
      panelDiv.setAttribute("role", "dialog");
      panelDiv.setAttribute("aria-modal", "true");
      panelDiv.setAttribute("aria-label", getPanelLabel(panelDiv));
      const closeBtn = panelDiv.querySelector(".ebs-context-view-close");
      if (closeBtn && !closeBtn.getAttribute("aria-label")) {
        closeBtn.setAttribute("aria-label", "Sulje");
      }
    }

    function cleanupContentWait() {
      if (contentObserver) {
        contentObserver.disconnect();
        contentObserver = null;
      }
      if (contentWaitTimer) {
        clearInterval(contentWaitTimer);
        contentWaitTimer = null;
      }
    }

    function moveFocusToPanel(panelDiv, target) {
      requestAnimationFrame(() => {
        if (activePanel !== panelDiv) return;
        target.focus();
      });
    }

    function waitForContent(panelDiv) {
      const target = findInitialFocusTarget(panelDiv);
      if (target) {
        moveFocusToPanel(panelDiv, target);
        return;
      }

      const startTime = Date.now();

      contentObserver = new MutationObserver(() => {
        if (activePanel !== panelDiv) {
          cleanupContentWait();
          return;
        }
        const t = findInitialFocusTarget(panelDiv);
        if (t) {
          cleanupContentWait();
          moveFocusToPanel(panelDiv, t);
        }
      });

      contentObserver.observe(panelDiv, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "disabled", "hidden"],
      });

      contentWaitTimer = setInterval(() => {
        if (activePanel !== panelDiv) {
          cleanupContentWait();
          return;
        }
        if (Date.now() - startTime > CONTENT_WAIT_TIMEOUT) {
          cleanupContentWait();
          const closeBtn = panelDiv.querySelector(".ebs-context-view-close");
          if (closeBtn) moveFocusToPanel(panelDiv, closeBtn);
          return;
        }
        const t = findInitialFocusTarget(panelDiv);
        if (t) {
          cleanupContentWait();
          moveFocusToPanel(panelDiv, t);
        }
      }, CONTENT_POLL_INTERVAL);
    }

    function activatePanel(panelDiv) {
      if (activePanel === panelDiv) return;
      if (activePanel) deactivatePanel(activePanel);

      triggerElement = document.activeElement;
      activePanel = panelDiv;
      applyAria(panelDiv);
      waitForContent(panelDiv);
    }

    function deactivatePanel(panelDiv) {
      cleanupContentWait();
      if (panelDiv === activePanel) activePanel = null;

      if (triggerElement && document.body.contains(triggerElement)) {
        requestAnimationFrame(() => {
          if (!activePanel) {
            triggerElement.focus();
            triggerElement = null;
          }
        });
      }
    }

    function closeActivePanel() {
      if (!activePanel) return;
      const closeBtn = activePanel.querySelector(".ebs-context-view-close");
      if (closeBtn) closeBtn.click();
      deactivatePanel(activePanel);
    }

    function handleKeyDown(e) {
      if (!activePanel) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeActivePanel();
        return;
      }

      if (e.key === "Tab") {
        const focusable = getFocusableElements(activePanel);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function checkPanels() {
      const panels = document.querySelectorAll(".ebs-context-view");
      let foundVisible = false;

      panels.forEach((p) => {
        const visible = isVisible(p);
        if (visible && !foundVisible) {
          foundVisible = true;
          activatePanel(p);
        } else if (!visible && p === activePanel) {
          deactivatePanel(p);
        }
      });

      if (!foundVisible && activePanel) deactivatePanel(activePanel);
    }

    function handleFocusIn(e) {
      if (!activePanel) return;
      if (!activePanel.contains(e.target)) {
        const target = findInitialFocusTarget(activePanel);
        if (target) {
          e.preventDefault();
          target.focus();
        }
      }
    }

    function init(root) {
      const observer = new MutationObserver(() => {
        requestAnimationFrame(checkPanels);
      });

      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "hidden"],
      });

      document.addEventListener("keydown", handleKeyDown, true);
      document.addEventListener("focusin", handleFocusIn, true);
      checkPanels();
    }

    return { init };
  })();

  // =========================================================================
  // MODUULI B: UI-SELECT COMBOBOX -KORJAUKSET
  // =========================================================================

  const ComboboxFix = (() => {
    /**
     * Ihmisluettavat nimet teknisille kenttänimille
     */
    const LABEL_OVERRIDES = {
      processingType: "Käsittelytyyppi",
    };

    /**
     * Debounce-apufunktio — estää liian tiheät päivitykset
     */
    function debounce(fn, ms) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
      };
    }

    /**
     * Korjaa yksittäisen ui-select-containerin ARIA-attribuutit.
     */
    function fixContainer(container) {
      const input = container.querySelector(
        'input.ui-select-search[role="combobox"]'
      );
      const listbox = container.querySelector('ul[role="listbox"]');
      if (!input || !listbox) return;

      // --- 1. Korjaa aria-controls osoittamaan <ul>:ään ---
      if (!listbox.id) {
        // Generoidaan id listboxille jos puuttuu
        const existingControls = input.getAttribute("aria-controls");
        listbox.id = "ebs-fix-listbox-" + (existingControls || Math.random().toString(36).slice(2, 8));
      }
      input.setAttribute("aria-controls", listbox.id);

      // --- 2. Päivitä aria-activedescendant aktiivisen vaihtoehdon mukaan ---
      updateActiveDescendant(input, container);

      // --- 3. Korjaa aria-expanded vastaamaan .open-luokkaa ---
      const isOpen = container.classList.contains("open");
      const currentExpanded = input.getAttribute("aria-expanded");
      if (isOpen && currentExpanded !== "true") {
        input.setAttribute("aria-expanded", "true");
      } else if (!isOpen && currentExpanded !== "false") {
        input.setAttribute("aria-expanded", "false");
      }
    }

    /**
     * Etsii aktiivisen vaihtoehdon (.active) ja asettaa
     * aria-activedescendant inputille.
     */
    function updateActiveDescendant(input, container) {
      const activeOption = container.querySelector(
        '.ui-select-choices-row.active[role="option"]'
      );

      if (activeOption && activeOption.id) {
        const current = input.getAttribute("aria-activedescendant");
        if (current !== activeOption.id) {
          input.setAttribute("aria-activedescendant", activeOption.id);
        }
      } else {
        // Ei aktiivista vaihtoehtoa — poista attribuutti
        if (input.hasAttribute("aria-activedescendant")) {
          input.removeAttribute("aria-activedescendant");
        }
      }
    }

    /**
     * Ilmoittaa vaihtoehtojen lukumäärän ruudunlukijalle live-alueen kautta.
     */
    function announceOptionCount(container) {
      const liveRegion = getOrCreateLiveRegion("ebs-combobox-live");
      const input = container.querySelector(
        'input.ui-select-search[role="combobox"]'
      );
      if (!input) return;

      // Laske näkyvät vaihtoehdot
      const options = container.querySelectorAll(
        '.ui-select-choices-row[role="option"]'
      );
      const visibleOptions = Array.from(options).filter(isVisible);
      const count = visibleOptions.length;

      // Hae suodattimen nimi
      const label = input.getAttribute("aria-label") || "Suodatin";
      const filterName = label.replace(" suodatus", "");

      // Ilmoita vain jos valikko on auki
      const isOpen = container.classList.contains("open");
      if (isOpen) {
        if (count === 0) {
          liveRegion.textContent = `${filterName}: ei hakutuloksia`;
        } else {
          liveRegion.textContent = `${filterName}: ${count} vaihtoehtoa`;
        }
      }
    }

    /**
     * Ilmoittaa aktiivisen vaihtoehdon tekstin ruudunlukijalle.
     * Tämä on varatoiminto siltä varalta, että aria-activedescendant
     * ei toimi kaikissa ruudunlukijayhdistelmissä.
     */
    function announceActiveOption(container) {
      const activeOption = container.querySelector(
        '.ui-select-choices-row.active[role="option"]'
      );
      if (!activeOption) return;

      const liveRegion = getOrCreateLiveRegion("ebs-combobox-active-live");

      // Hae vaihtoehdon teksti
      const textEl = activeOption.querySelector(".ng-binding");
      const text = textEl ? textEl.textContent.trim() : activeOption.textContent.trim();

      if (text) {
        liveRegion.textContent = text;
      }
    }

    /**
     * Korjaa tekniset kenttänimet ihmisluettaviksi.
     */
    function fixLabels() {
      for (const [technicalName, humanName] of Object.entries(LABEL_OVERRIDES)) {
        // Korjaa sr-only label
        const label = document.querySelector(`label#label-${technicalName}`);
        if (label && label.textContent.trim() === technicalName) {
          label.textContent = humanName;
        }

        // Korjaa visuaalinen h5-otsikko
        if (label) {
          const wrapper = label.closest(
            ".col-md-2, .col-lg-1, [class*='col-']"
          );
          if (wrapper) {
            const h5 = wrapper.querySelector("h5");
            if (h5 && h5.textContent.trim() === technicalName) {
              h5.textContent = humanName;
            }

            // Korjaa containerin title
            const uiSelect = wrapper.querySelector(".ui-select-container");
            if (
              uiSelect &&
              uiSelect.getAttribute("title") ===
                `${technicalName} suodatus`
            ) {
              uiSelect.setAttribute("title", `${humanName} suodatus`);
            }

            // Korjaa input aria-label
            const input = wrapper.querySelector(
              'input.ui-select-search[role="combobox"]'
            );
            if (
              input &&
              input.getAttribute("aria-label") ===
                `${technicalName} suodatus`
            ) {
              input.setAttribute("aria-label", `${humanName} suodatus`);
            }
          }
        }
      }
    }

    /**
     * Korjaa "Näytä lisää" -linkin saavutettavuus.
     */
    function fixShowMoreLink() {
      const links = document.querySelectorAll("a");
      links.forEach((link) => {
        if (link.textContent.trim() === "Näytä lisää" && !link.getAttribute("role")) {
          link.setAttribute("role", "button");
          link.setAttribute("aria-expanded", "false");

          // Tarkkaile klikkausta ja päivitä tila
          if (!link.dataset.ebsFixBound) {
            link.dataset.ebsFixBound = "true";
            link.addEventListener("click", () => {
              const current = link.getAttribute("aria-expanded");
              const newState = current === "true" ? "false" : "true";
              link.setAttribute("aria-expanded", newState);
              link.textContent =
                newState === "true" ? "Näytä vähemmän" : "Näytä lisää";
            });
          }
        }
      });
    }

    /**
     * Korjaa avainsana-hakupainikkeen aria-label.
     */
    function fixKeywordSearchButton() {
      const keywordInput = document.querySelector("#text-search-facet");
      if (keywordInput) {
        const wrapper = keywordInput.closest(".input-group");
        if (wrapper) {
          const btn = wrapper.querySelector("button");
          if (btn && !btn.getAttribute("aria-label")) {
            btn.setAttribute("aria-label", "Hae avainsanalla");
          }
        }
      }
    }

    /**
     * Pää-scan: käy läpi kaikki ui-select-containerit ja korjaa ne.
     */
    const scanAll = debounce(() => {
      const containers = document.querySelectorAll(".ui-select-container");
      containers.forEach(fixContainer);
    }, 50);

    /**
     * Erillinen nopea päivitys aktiiviselle vaihtoehdolle —
     * kutsutaan nuolinäppäimillä.
     */
    function handleArrowKeys(e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const input = e.target;
      if (
        !input ||
        input.getAttribute("role") !== "combobox" ||
        !input.classList.contains("ui-select-search")
      ) {
        return;
      }

      const container = input.closest(".ui-select-container");
      if (!container) return;

      // Pieni viive, jotta AngularJS ehtii päivittää .active-luokan
      requestAnimationFrame(() => {
        setTimeout(() => {
          updateActiveDescendant(input, container);
          announceActiveOption(container);
        }, 20);
      });
    }

    /**
     * Käsittelee kirjoittamista comboboxiin — ilmoittaa tulosten määrän.
     */
    function handleInput(e) {
      const input = e.target;
      if (
        !input ||
        input.getAttribute("role") !== "combobox" ||
        !input.classList.contains("ui-select-search")
      ) {
        return;
      }

      const container = input.closest(".ui-select-container");
      if (!container) return;

      // Odota AngularJS:n suodatusta
      setTimeout(() => {
        fixContainer(container);
        announceOptionCount(container);
      }, 150);
    }

    /**
     * Käsittelee fokuksen siirtymistä comboboxiin —
     * korjaa attribuutit ja ilmoittaa valitut arvot.
     */
    function handleFocus(e) {
      const input = e.target;
      if (
        !input ||
        input.getAttribute("role") !== "combobox" ||
        !input.classList.contains("ui-select-search")
      ) {
        return;
      }

      const container = input.closest(".ui-select-container");
      if (!container) return;

      // Korjaa heti fokuksen yhteydessä
      fixContainer(container);

      // Ilmoita valitut arvot
      setTimeout(() => {
        announceSelectedValues(container);
      }, 100);
    }

    /**
     * Ilmoittaa valittujen arvojen määrän kun kenttä saa fokuksen.
     */
    function announceSelectedValues(container) {
      const matchItems = container.querySelectorAll(
        ".ui-select-match-item .ng-binding"
      );
      const visibleItems = Array.from(matchItems).filter((el) => {
        // Tarkista ettei vanhempi-span ole piilotettu
        const parentSpan = el.closest(".ng-scope");
        return parentSpan && !parentSpan.classList.contains("hide");
      });

      if (visibleItems.length === 0) return;

      const liveRegion = getOrCreateLiveRegion("ebs-combobox-live");
      const input = container.querySelector('input.ui-select-search[role="combobox"]');
      const label = input
        ? (input.getAttribute("aria-label") || "").replace(" suodatus", "")
        : "";

      const values = visibleItems.map((el) => el.textContent.trim());
      liveRegion.textContent = `${label}: valittu ${values.length}: ${values.join(", ")}`;
    }

    function init() {
      // Kertaluonteiset korjaukset
      fixLabels();
      fixShowMoreLink();
      fixKeywordSearchButton();

      // Ensimmäinen skannaus
      scanAll();

      // Tarkkaile DOM-muutoksia kaikissa ui-select-containereissa
      const queuesApp = document.querySelector("#queuesApp") || document.body;

      const observer = new MutationObserver((mutations) => {
        let needsScan = false;
        let hasActiveChange = false;

        for (const mutation of mutations) {
          // Uusia elementtejä lisätty (vaihtoehtolista päivittyy)
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            needsScan = true;
          }

          // Luokka muuttuu (open/close, active vaihtoehto)
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            const target = mutation.target;

            // Container avautuu/sulkeutuu
            if (target.classList.contains("ui-select-container")) {
              needsScan = true;
            }

            // Vaihtoehdon .active muuttuu
            if (target.classList.contains("ui-select-choices-row")) {
              hasActiveChange = true;
            }
          }
        }

        if (hasActiveChange) {
          // Aktiivinen vaihtoehto muuttui — päivitä nopeasti
          const containers = document.querySelectorAll(
            ".ui-select-container.open"
          );
          containers.forEach((c) => {
            const input = c.querySelector(
              'input.ui-select-search[role="combobox"]'
            );
            if (input) {
              updateActiveDescendant(input, c);
              announceActiveOption(c);
            }
          });
        }

        if (needsScan) {
          scanAll();
        }
      });

      observer.observe(queuesApp, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });

      // Näppäimistö- ja syötekuuntelijat
      document.addEventListener("keydown", handleArrowKeys, true);
      document.addEventListener("input", handleInput, true);
      document.addEventListener("focusin", handleFocus, true);
    }

    return { init };
  })();

  // =========================================================================
  // ALUSTUS
  // =========================================================================

  function init() {
    // Moduuli A: Context-view-paneelit (asianhallintasivu)
    const casehandling =
      document.querySelector("casehandling-main") ||
      document.querySelector("casehandling");
    if (casehandling) {
      ContextViewFix.init(casehandling);
    }

    // Moduuli B: Combobox-korjaukset (työjonosivu)
    const hasComboboxes = document.querySelector(".ui-select-container");
    if (hasComboboxes) {
      ComboboxFix.init();
    }

    // Jos kumpikaan ei löydy vielä, tarkkaile kunnes ilmestyy
    if (!casehandling && !hasComboboxes) {
      const bootObserver = new MutationObserver(() => {
        const ch =
          document.querySelector("casehandling-main") ||
          document.querySelector("casehandling");
        const cb = document.querySelector(".ui-select-container");

        if (ch) {
          ContextViewFix.init(ch);
        }
        if (cb) {
          ComboboxFix.init();
        }
        if (ch || cb) {
          bootObserver.disconnect();
        }
      });

      bootObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        bootObserver.disconnect();
        // Yritä vielä kerran
        const ch =
          document.querySelector("casehandling-main") ||
          document.querySelector("casehandling");
        const cb = document.querySelector(".ui-select-container");
        if (ch) ContextViewFix.init(ch);
        if (cb) ComboboxFix.init();
      }, 10000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
