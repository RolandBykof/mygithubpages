// =========================================================================
// GMAIL SAAVUTETTAVUUSLAAJENNUS - content.js (Versio 6 - Home & End lisätty)
// =========================================================================

// --- 1. VIESTIN LUKEMISEN PARANTAMINEN (H5 & ARIA-LIVE) ---
setInterval(() => {
  const messageBodies = document.querySelectorAll('.a3s:not([data-helper-processed])');

  messageBodies.forEach(msg => {
    if (msg.offsetWidth > 0 && msg.offsetHeight > 0) {
      msg.dataset.helperProcessed = "true";

      msg.setAttribute('aria-live', 'assertive');
      msg.setAttribute('aria-atomic', 'true');
      msg.setAttribute('tabindex', '0');

      const h5 = document.createElement('h5');
      h5.innerText = 'Viestin sisältö';
      h5.style.position = 'absolute';
      h5.style.left = '-9999px';
      h5.style.width = '1px';
      h5.style.height = '1px';
      h5.style.overflow = 'hidden';

      msg.insertBefore(h5, msg.firstChild);

      setTimeout(() => { 
        msg.focus(); 
        console.log('GMAIL-HELPER: Fokus siirretty salamana uuteen viestiin.');
      }, 50);
    }
  });
}, 100); 


// --- 2. APUFUNKTIO VIESTIRIVIN FOKUSOIMISEEN INBOKSISSA ---
// Tämä funktio hoitaa fokuksen siirron ja Enter-kuuntelijan lisäämisen
function focusRow(row) {
  const allRows = document.querySelectorAll('tr.zA');
  
  // Siivotaan aiemmat apu-fokukset pois
  allRows.forEach(r => {
    if (r.dataset.helperFocused) {
      r.dataset.helperFocused = 'false';
      r.style.outline = 'none';
    }
  });

  // Asetetaan focus uudelle riville
  row.setAttribute('tabindex', '0');
  row.dataset.helperFocused = 'true';
  row.style.outline = '2px solid #ff9900'; 
  row.style.outlineOffset = '-2px';
  
  row.focus();
  setTimeout(() => { row.focus(); }, 50);

  // Varmistetaan, että Enter avaa viestin
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
}


// --- 3. NÄPPÄINKOMENNOT (HOME, END, ALKUKIRJAIN & ALT+P) ---
window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  
  // Tarkistetaan, ettei käyttäjä ole kirjoittamassa
  const isTyping = active && (
                   active.tagName === 'INPUT' || 
                   active.tagName === 'TEXTAREA' || 
                   active.isContentEditable || 
                   active.getAttribute('role') === 'textbox');

  // ==========================================
  // OMINAISUUS A: ALT+P (Poista viesti lukuikkunassa)
  // ==========================================
  if (e.altKey && (e.key.toLowerCase() === 'p' || e.code === 'KeyP')) {
    if (isTyping) return; 
    
    e.preventDefault();
    e.stopPropagation(); 
    
    const allDeleteBtns = Array.from(document.querySelectorAll('div[role="button"].nX, div[role="button"][data-tooltip*="Poista"], div[role="button"][aria-label*="Poista"]'));
    const activeDeleteBtn = allDeleteBtns.find(btn => 
      btn.offsetWidth > 0 && 
      btn.offsetHeight > 0 && 
      btn.getAttribute('aria-disabled') !== 'true'
    );

    if (activeDeleteBtn) {
      const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
      const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      
      activeDeleteBtn.dispatchEvent(mousedown);
      activeDeleteBtn.dispatchEvent(mouseup);
      activeDeleteBtn.dispatchEvent(click);
      
      console.log('GMAIL-HELPER: Avattu viesti poistettu (Alt+P)');
      setTimeout(() => { document.body.focus(); }, 300);
    } else {
      console.log('GMAIL-HELPER: Aktiivista Poista-painiketta ei löytynyt ruudulta.');
    }
    return;
  }

  // ==========================================
  // OMINAISUUS B: HOME JA END -NAVIGOINTI INBOKSISSA
  // ==========================================
  if ((e.key === 'Home' || e.key === 'End') && !isTyping) {
    const rows = Array.from(document.querySelectorAll('tr.zA'));
    
    if (rows.length > 0) {
      e.preventDefault();
      e.stopPropagation(); // Estetään selaimen normaali sivun vieritys
      
      // Valitaan listan ensimmäinen (Home) tai viimeinen (End) viesti
      const targetRow = e.key === 'Home' ? rows[0] : rows[rows.length - 1];
      
      focusRow(targetRow);
      console.log(`GMAIL-HELPER: Hypättiin viestiluettelon ${e.key === 'Home' ? 'alkuun' : 'loppuun'}.`);
    }
    return;
  }

  // ==========================================
  // OMINAISUUS C: ALKUKIRJAIMELLA NAVIGOINTI INBOKSISSA
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
          e.stopPropagation(); 
          
          // Hyödynnetään uutta apufunktiota fokuksen siirtoon
          focusRow(row);
          
          console.log(`GMAIL-HELPER: Hypättiin kirjaimella ${e.key} lähettäjään: ${senderEl.innerText}`);
          break; 
        }
      }
    }
  }
}, true);