// =========================================================================
// GMAIL SAAVUTETTAVUUSLAAJENNUS - content.js (Lopullinen kokonainen versio)
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
      h5.innerText = 'Viesti'; // Lyhyt otsikko toimii nyt, koska j ja k on korjattu
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
function focusRow(row) {
  const allRows = document.querySelectorAll('tr.zA');
  
  allRows.forEach(r => {
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
}


// --- 3. NÄPPÄINKOMENNOT (HOME, END, ALKUKIRJAIN & ALT+P) ---
window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  
  const isTyping = active && (
                   active.tagName === 'INPUT' || 
                   active.tagName === 'TEXTAREA' || 
                   active.isContentEditable || 
                   active.getAttribute('role') === 'textbox');

  if (isTyping) return;

  // UUSI TARKISTUS: Onko sähköpostiviesti auki ruudulla?
  const isMessageOpen = Array.from(document.querySelectorAll('.a3s')).some(msg => msg.offsetWidth > 0);

  // ==========================================
  // LUKUIKKUNAN PIKANÄPPÄIMET
  // ==========================================
  if (isMessageOpen) {
    // OMINAISUUS A: ALT+P (Poista viesti lukuikkunassa)
    if (e.altKey && (e.key.toLowerCase() === 'p' || e.code === 'KeyP')) {
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
    }
    
    // TÄRKEÄÄ: Koska lukuikkuna on auki, KESKEYTETÄÄN koodin suoritus tähän!
    // Näin emme käynnistä alla olevaa alkukirjainnavigointia, ja 'j' sekä 'k'
    // menevät nätisti suoraan Gmailille.
    return; 
  }


  // ==========================================
  // INBOKSIN PIKANÄPPÄIMET (Suoritetaan vain, kun lukuikkuna EI ole auki)
  // ==========================================
  
  // OMINAISUUS B: HOME JA END -NAVIGOINTI
  if (e.key === 'Home' || e.key === 'End') {
    const rows = Array.from(document.querySelectorAll('tr.zA'));
    
    if (rows.length > 0) {
      e.preventDefault();
      e.stopPropagation(); 
      
      const targetRow = e.key === 'Home' ? rows[0] : rows[rows.length - 1];
      focusRow(targetRow);
      console.log(`GMAIL-HELPER: Hypättiin viestiluettelon ${e.key === 'Home' ? 'alkuun' : 'loppuun'}.`);
    }
    return;
  }

  // OMINAISUUS C: ALKUKIRJAIMELLA NAVIGOINTI INBOKSISSA
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
          
          focusRow(row);
          
          console.log(`GMAIL-HELPER: Hypättiin kirjaimella ${e.key} lähettäjään: ${senderEl.innerText}`);
          break; 
        }
      }
    }
  }
}, true);