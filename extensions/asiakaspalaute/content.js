/**
 * ANGULAR/LIFERAY SAAVUTETTAVUUSKORJAAJA
 * * Tämä skripti tarkkailee DOM-muutoksia ja injektoi ARIA-attribuutteja
 * sekä hallitsee fokusta dynaamisissa elementeissä.
 */

// Konfiguraatio
const CONFIG = {
  selectors: {
    burger: '.vi-burger',
    burgerParent: '.ebs-theme-navigation',
    navPanel: '.ebs-navigation-panel',
    userPanel: '.ebs-user-panel',
    sidebarLinks: '.parent-page > span, .child-page > span',
    contextMenuBtn: '.open-context-menu',
    contextMenuContainer: 'context-menu',
    assignPanel: '.ebs-context-view-right' // Oletus: sivupaneeli
  },
  classes: {
    hidden: 'hide', // Angular/Liferay käyttää usein päätteitä '-hide'
    fixed: 'a11y-fixed' // Merkki siitä, että elementti on jo käsitelty
  }
};

// Tila fokuksen hallintaan (kohta 6)
let assignPanelWasVisible = false;

// --- 1. MutationObserver (Dynaamisen sisällön seuranta) ---

const observer = new MutationObserver((mutations) => {
  // Suoritetaan tarkistukset aina kun DOM muuttuu.
  // Debounce (pieni viive) estää suorituskykyongelmat, jos muutoksia on paljon.
  requestAnimationFrame(() => {
    fixBurgerMenu();
    fixHiddenPanels();
    fixSidebarLinks();
    fixContextMenus();
    manageAssignWorkflowFocus();
  });
});

// Käynnistetään seuranta
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'style', 'hidden'] // Seurataan erityisesti näkyvyyden muutoksia
});

console.log("♿ Saavutettavuuskorjaaja käynnistetty.");


// --- 2. Päävalikon ("Hampurilaisvalikko") korjaus ---

function fixBurgerMenu() {
  const burgerIcon = document.querySelector(CONFIG.selectors.burger);
  
  if (!burgerIcon) return;

  // Haetaan klikattava elementti (yleensä ikonin vanhempi div)
  const clickTarget = burgerIcon.closest(CONFIG.selectors.burgerParent) || burgerIcon;

  if (clickTarget.classList.contains(CONFIG.classes.fixed)) {
    // Päivitetään vain tila (auki/kiinni), jos elementti on jo alustettu
    updateBurgerState(clickTarget);
    return;
  }

  // Alustetaan elementti kerran
  clickTarget.setAttribute('role', 'button');
  clickTarget.setAttribute('tabindex', '0');
  clickTarget.setAttribute('aria-label', 'Päävalikko');
  clickTarget.setAttribute('aria-haspopup', 'true');
  clickTarget.classList.add(CONFIG.classes.fixed);

  // Lisätään näppäimistötuki (Enter/Space)
  clickTarget.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clickTarget.click();
    }
  });

  updateBurgerState(clickTarget);
}

function updateBurgerState(btn) {
  const panel = document.querySelector(CONFIG.selectors.navPanel);
  if (panel) {
    // Tarkistetaan onko paneelilla jokin luokka, joka sisältää tekstin "hide"
    const isHidden = Array.from(panel.classList).some(cls => cls.includes('hide'));
    btn.setAttribute('aria-expanded', !isHidden);
  }
}


// --- 3. Piilotettujen paneelien tilanhallinta ---

function fixHiddenPanels() {
  const panels = document.querySelectorAll(`${CONFIG.selectors.navPanel}, ${CONFIG.selectors.userPanel}`);

  panels.forEach(panel => {
    const isHidden = Array.from(panel.classList).some(cls => cls.includes('hide')) || panel.style.display === 'none';

    if (isHidden) {
      panel.setAttribute('aria-hidden', 'true');
      panel.setAttribute('inert', ''); // Estää fokuksen menemisen piilotettuun elementtiin
    } else {
      panel.setAttribute('aria-hidden', 'false');
      panel.removeAttribute('inert');
    }
  });
}


// --- 4. Navigaatiopaneelin "valelinkkien" korjaus ---

function fixSidebarLinks() {
  const spans = document.querySelectorAll(CONFIG.selectors.sidebarLinks);

  spans.forEach(span => {
    if (span.classList.contains(CONFIG.classes.fixed)) return;

    // Jos spanissa on tekstiä, se on todennäköisesti linkki
    if (span.innerText.trim().length > 0) {
      span.setAttribute('role', 'link');
      span.setAttribute('tabindex', '0');
      span.classList.add(CONFIG.classes.fixed);

      span.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          span.click();
        }
      });
    }
  });
}


// --- 5. Kontekstivalikoiden (Kolme pistettä) kytkeminen ---

function fixContextMenus() {
  // Etsitään kaikki valikko-komponentit
  const menus = document.querySelectorAll(CONFIG.selectors.contextMenuContainer);

  menus.forEach((menu, index) => {
    // Etsitään avauspainike (analyysin mukaan .vi-more on ikoni, sen vanhempi on span)
    const icon = menu.querySelector('.vi-more');
    if (!icon) return;
    
    // Etsitään lähin interaktiivinen elementti ylöspäin
    const btn = icon.closest('[role="button"]') || icon.parentElement;
    
    // Etsitään itse valikkolista (yleensä sisarelementti tai lapsi)
    const menuList = menu.querySelector('.ebs-context-menu') || menu.querySelector('ul');

    if (btn && menuList) {
      // 1. Varmistetaan että listalla on ID
      if (!menuList.id) {
        menuList.id = `ctx-menu-${index}`;
      }

      // 2. Kytketään nappi listaan
      if (!btn.hasAttribute('aria-controls')) {
        btn.setAttribute('aria-controls', menuList.id);
        btn.setAttribute('aria-haspopup', 'true');
        
        // Varmistetaan, että nappi on fokusoitava (jos se ei jo ole)
        if (!btn.getAttribute('tabindex')) btn.setAttribute('tabindex', '0');
      }

      // 3. Päivitetään tila (auki/kiinni)
      // Angular yleensä lisää elementin DOMiin tai poistaa "hidden"-luokan kun se on auki
      const isVisible = menuList.offsetParent !== null; // Helppo tapa tarkistaa näkyvyys
      btn.setAttribute('aria-expanded', isVisible);
    }
  });
}


// --- 6. "Siirrä asiantuntijalle" -työnkulun fokuksen hallinta ---

function manageAssignWorkflowFocus() {
  // Etsitään elementti, joka edustaa "Siirrä" -paneelia (Oikea sivupaneeli)
  // Analyysin mukaan: .ebs-context-view-right, ja sisältö liittyy "assign-action"
  const panel = document.querySelector(CONFIG.selectors.assignPanel);
  
  // Etsitään onko paneelin sisällä latautunut 'assign-action' sisältöä
  const hasAssignContent = panel && panel.querySelector('.assign-action');

  const isVisible = panel && panel.offsetParent !== null && hasAssignContent;

  // Logiikka: Jos paneeli ilmestyi juuri nyt (oli piilossa, nyt näkyvissä)
  if (isVisible && !assignPanelWasVisible) {
    console.log("🎯 Siirtolomake aukesi -> Siirretään fokus.");
    
    // Etsitään ensimmäinen järkevä kohde fokukselle paneelin sisältä
    // 1. Otsikko (h1-h6)
    // 2. Ensimmäinen input/button
    const focusTarget = panel.querySelector('h1, h2, h3, h4, input, select, button');

    if (focusTarget) {
      // Pieni viive varmistaa, että selain on valmis ottamaan fokuksen vastaan
      setTimeout(() => {
        focusTarget.setAttribute('tabindex', '-1'); // Varmistetaan että voidaan fokusoida
        focusTarget.focus();
      }, 100);
    }
  }

  // Päivitetään tilamuuttuja seuraavaa kierrosta varten
  assignPanelWasVisible = !!isVisible;
}