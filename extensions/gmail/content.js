// =========================================================================
// GMAIL SAAVUTETTAVUUSLAAJENNUS - content.js (Versio 8)
// =========================================================================
console.log("==========================================");
console.log("GMAIL-HELPER: VERSIO 8 ON LADATTU KÄYTTÖÖN!");
console.log("==========================================");

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


// --- 2. APUFUNKTIOT ---

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

function clickVisibleButton(selectorStr) {
  const allBtns = Array.from(document.querySelectorAll(selectorStr));
  const activeBtn = allBtns.find(btn => 
    btn.offsetWidth > 0 && 
    btn.offsetHeight > 0 && 
    btn.getAttribute('aria-disabled') !== 'true'
  );

  if (activeBtn) {
    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
    const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    
    activeBtn.dispatchEvent(mousedown);
    activeBtn.dispatchEvent(mouseup);
    activeBtn.dispatchEvent(click);
    return true; 
  }
  return false;
}


// --- 3. NÄPPÄINKOMENNOT ---
window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  
  const isTyping = active && (
                   active.tagName === 'INPUT' || 
                   active.tagName === 'TEXTAREA' || 
                   active.isContentEditable || 
                   active.getAttribute('role') === 'textbox');

  if (isTyping) return;

  const isMessageOpen = Array.from(document.querySelectorAll('.a3s')).some(msg => msg.offsetWidth > 0);

  // ==========================================
  // OMINAISUUS A: LUKUIKKUNAN PIKANÄPPÄIMET (Alt+K, Alt+J, Alt+L)
  // ==========================================
  if (isMessageOpen && e.altKey) {
    const key = e.key.toLowerCase();
    let actionHandled = false;

    if (key === 'k' || e.code === 'KeyK') {
      actionHandled = clickVisibleButton('div[role="button"].nX, div[role="button"][data-tooltip*="Poista"], div[role="button"][aria-label*="Poista"]');
      if (actionHandled) console.log('GMAIL-HELPER: Viesti poistettu (Alt+K)');
    }
    else if (key === 'j' || e.code === 'KeyJ') {
      actionHandled = clickVisibleButton('div[role="button"][data-tooltip*="Uudem"], div[role="button"][aria-label*="Uudem"]');
      if (actionHandled) console.log('GMAIL-HELPER: Siirrytty uudempaan viestiin (Alt+J)');
    }
    else if (key === 'l' || e.code === 'KeyL') {
      actionHandled = clickVisibleButton('div[role="button"].adg, div[role="button"][data-tooltip*="Vanhemmat"], div[role="button"][aria-label*="Vanhemmat"]');
      if (actionHandled) console.log('GMAIL-HELPER: Siirrytty vanhempaan viestiin (Alt+L)');
    }

    if (actionHandled) {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => { document.body.focus(); }, 150);
      return; 
    }
  }

  // ==========================================
  // OMINAISUUS B: INBOKSIN NAVIGOINTI
  // ==========================================
  if (!isMessageOpen) {
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
  }
}, true);