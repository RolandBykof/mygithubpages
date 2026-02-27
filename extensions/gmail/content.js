// =========================================================================
// GMAIL SAAVUTETTAVUUSLAAJENNUS - content.js (Versio 3 - Järeämpi)
// =========================================================================

// --- 1. VIESTIN LUKEMISEN PARANTAMINEN (H5 & ARIA-LIVE) ---
// Käytetään setInterval-funktiota MutationObserverin sijaan. Tämä on Gmailin
// kaltaisissa monimutkaisissa sovelluksissa usein varmempi tapa löytää dynaamisia elementtejä.
setInterval(() => {
  // Etsitään käsittelemättömät viestin sisältöalueet
  const messageBodies = document.querySelectorAll('.a3s:not([data-helper-processed])');

  messageBodies.forEach(msg => {
    // Varmistetaan, että viesti on oikeasti näkyvissä ruudulla (ei piilotettu välimuistissa)
    if (msg.offsetParent !== null) {
      msg.dataset.helperProcessed = "true";

      // 1. Määritetään viestiaria-live -alueeksi
      msg.setAttribute('tabindex', '0');
      msg.setAttribute('aria-live', 'assertive');
      msg.setAttribute('aria-atomic', 'true');

      // 2. Luodaan otsikko
      const h5 = document.createElement('h5');
      h5.innerText = 'Viestin sisältö';
      h5.style.position = 'absolute';
      h5.style.left = '-9999px';
      h5.style.width = '1px';
      h5.style.height = '1px';
      h5.style.overflow = 'hidden';

      msg.insertBefore(h5, msg.firstChild);

      // Siirretään fokus viiveellä, jotta DOM ehtii päivittyä ja ruudunlukuohjelma nappaa sen
      setTimeout(() => { 
        msg.focus(); 
        console.log('GMAIL-HELPER: Viestiin fokusoitu automaattisesti.');
      }, 500);
    }
  });
}, 500); // Tarkistetaan ruutu puolen sekunnin välein


// --- 2. NÄPPÄINKOMENNOT (ALKUKIRJAINNAVIGOINTI & ALT+P) ---
// HUOM: Kolmas parametri 'true' tarkoittaa, että nappaamme näppäimen 
// ENNEN kuin Gmailin omat scriptit ehtivät blokata sen!
window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  
  const isTyping = active && (
                   active.tagName === 'INPUT' || 
                   active.tagName === 'TEXTAREA' || 
                   active.isContentEditable || 
                   active.getAttribute('role') === 'textbox');

  // ==========================================
  // OMINAISUUS A: ALT+P (Poista viesti)
  // ==========================================
  // Tarkistetaan e.code (KeyP), koska se on näppäimistöasettelusta riippumaton varmistus
  if (e.altKey && (e.key.toLowerCase() === 'p' || e.code === 'KeyP')) {
    if (isTyping) return;
    
    e.preventDefault();
    e.stopPropagation(); // Estetään Gmailia reagoimasta
    
    // Etsitään poista-painike. .nX on NVDA-raporttisi mukainen varma Gmail-luokka
    const deleteBtn = document.querySelector('div[role="button"].nX, div[data-tooltip*="Poista"], div[aria-label*="Poista"]');

    if (deleteBtn) {
      const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
      const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      
      deleteBtn.dispatchEvent(mousedown);
      deleteBtn.dispatchEvent(mouseup);
      deleteBtn.dispatchEvent(click);
      
      console.log('GMAIL-HELPER: Viesti poistettu (Alt+P)');
      
      // Kun viesti on poistettu, siirretään fokus runkoon, jotta NVDA ei mene jumiin tyhjään elementtiin
      setTimeout(() => { document.body.focus(); }, 100);
    } else {
      console.log('GMAIL-HELPER: Poista-painiketta ei löytynyt. Oletko varmasti avannut viestin tai valinnut sen?');
    }
    return;
  }

  // ==========================================
  // OMINAISUUS B: ALKUKIRJAIMELLA NAVIGOINTI
  // ==========================================
  if (isTyping) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  if (/^[a-zäöå]$/i.test(e.key)) {
    const searchChar = e.key.toLowerCase();
    
    const rows = Array.from(document.querySelectorAll('tr.zA'));
    if (rows.length === 0) return;

    let currentIndex = rows.findIndex(row => 
      row.contains(active) || 
      row === active || 
      row.dataset.helperFocused === 'true'
    );
    
    for (let i = 1; i <= rows.length; i++) {
      const checkIndex = (currentIndex + i) % rows.length;
      if (checkIndex < 0) continue; 
      
      const row = rows[checkIndex];
      const senderEl = row.querySelector('.yW span[name], .zF, .yP, .yW span[email], .yW');
      
      if (senderEl) {
        let senderName = (senderEl.getAttribute('name') || senderEl.innerText || '').trim().toLowerCase();
        senderName = senderName.replace(/^["'\s]+/, '');

        if (senderName.startsWith(searchChar)) {
          e.preventDefault();
          e.stopPropagation(); // Estetään Gmailia häiritsemästä hyppyä
          
          rows.forEach(r => {
            if (r.dataset.helperFocused) {
              r.dataset.helperFocused = 'false';
              r.style.outline = 'none';
            }
          });

          row.setAttribute('tabindex', '0');
          row.dataset.helperFocused = 'true';
          row.style.outline = '2px solid #ff9900'; 
          row.style.outlineOffset = '-2px';
          
          row.focus();
          setTimeout(() => { row.focus(); }, 50);

          if (!row.dataset.enterListenerAdded) {
            row.addEventListener('keydown', (enterEvent) => {
              if (enterEvent.key === 'Enter') {
                enterEvent.preventDefault();
                enterEvent.stopImmediatePropagation();
                
                const clickTarget = row.querySelector('.yP, .zF') || row;
                const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
                const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
                const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                
                clickTarget.dispatchEvent(mousedown);
                clickTarget.dispatchEvent(mouseup);
                clickTarget.dispatchEvent(click);
              }
            });
            row.dataset.enterListenerAdded = "true";
          }
          break;
        }
      }
    }
  }
}, true); // <- TÄRKEÄ: 'true' kaappaa tapahtuman ensimmäisenä