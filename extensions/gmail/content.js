// =========================================================================
// GMAIL SAAVUTETTAVUUSLAAJENNUS - content.js
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
      h5.innerText = 'Viesti';
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


// --- 2. RUUDUNLUKIJAN ILMOITUSALUE ---
let liveRegion = null;
function ensureLiveRegion() {
  if (!liveRegion || !document.body.contains(liveRegion)) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'gmail-helper-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

function announceRowToScreenReader(row) {
  const region = ensureLiveRegion();
  
  const senderEl = row.querySelector('.yW span[name], .zF, .yP, .yW');
  const subjectEl = row.querySelector('.bog, .y6');
  const dateEl = row.querySelector('.xW span[title], .xW');
  const snippetEl = row.querySelector('.y2');
  
  const sender = senderEl ? (senderEl.getAttribute('name') || senderEl.innerText || '').trim() : '';
  const subject = subjectEl ? subjectEl.innerText.trim() : '';
  const date = dateEl ? (dateEl.getAttribute('title') || dateEl.innerText || '').trim() : '';
  const snippet = snippetEl ? snippetEl.innerText.trim() : '';
  
  // Tyhjennetään ensin, jotta sama teksti voidaan ilmoittaa uudelleen
  region.textContent = '';
  
  setTimeout(() => {
    let announcement = '';
    if (sender) announcement += sender;
    if (subject) announcement += `, ${subject}`;
    if (snippet) announcement += `, ${snippet}`;
    if (date) announcement += `, ${date}`;
    
    region.textContent = announcement;
    console.log('GMAIL-HELPER: Ilmoitettu ruudunlukijalle:', announcement);
  }, 100);
}


// --- 3. APUFUNKTIO VIESTIRIVIN FOKUSOIMISEEN INBOKSISSA ---

// Lippu: onko laajennuksen oma fokusseuranta aktiivinen?
// Aktivoituu alkukirjain-, Home- ja End-navigoinnissa.
// Deaktivoituu Escapella, viestin avaamisella tai lukuikkunassa.
let helperNavigationActive = false;

function focusRow(row) {
  const allRows = document.querySelectorAll('tr.zA');
  
  allRows.forEach(r => {
    r.dataset.helperFocused = 'false';
    r.style.outline = 'none';
    r.removeAttribute('aria-selected');
  });

  row.setAttribute('tabindex', '0');
  row.dataset.helperFocused = 'true';
  row.style.outline = '2px solid #ff9900'; 
  row.style.outlineOffset = '-2px';
  row.setAttribute('aria-selected', 'true');
  
  row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  row.focus();
  setTimeout(() => { row.focus(); }, 50);

  // Merkitään laajennuksen navigointi aktiiviseksi
  helperNavigationActive = true;

  // Ilmoitetaan ruudunlukijalle
  announceRowToScreenReader(row);

  if (!row.dataset.enterListenerAdded) {
    row.addEventListener('keydown', (enterEvent) => {
      if (enterEvent.key === 'Enter') {
        enterEvent.preventDefault();
        enterEvent.stopImmediatePropagation();
        
        // Deaktivoidaan oma navigointi, koska viesti avataan
        helperNavigationActive = false;
        
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

// Apufunktio: siirtää fokuksen nykyisestä rivistä ylös tai alas
function moveByOffset(offset) {
  const rows = Array.from(document.querySelectorAll('tr.zA'));
  if (rows.length === 0) return;
  
  const currentIndex = rows.findIndex(r => r.dataset.helperFocused === 'true');
  if (currentIndex === -1) return;
  
  const newIndex = currentIndex + offset;
  
  // Ei mennä listan ulkopuolelle
  if (newIndex < 0 || newIndex >= rows.length) return;
  
  focusRow(rows[newIndex]);
}


// --- 4. NÄPPÄINKOMENNOT ---
window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  
  const isTyping = active && (
                   active.tagName === 'INPUT' || 
                   active.tagName === 'TEXTAREA' || 
                   active.isContentEditable || 
                   active.getAttribute('role') === 'textbox');

  if (isTyping) return;

  // Onko sähköpostiviesti auki ruudulla?
  const isMessageOpen = Array.from(document.querySelectorAll('.a3s')).some(msg => msg.offsetWidth > 0);

  // ==========================================
  // LUKUIKKUNAN PIKANÄPPÄIMET
  // ==========================================
  if (isMessageOpen) {
    helperNavigationActive = false;
    return; 
  }

  // ==========================================
  // INBOKSIN PIKANÄPPÄIMET
  // ==========================================

  // ESCAPE: poistutaan laajennuksen omasta navigoinnista
  if (e.key === 'Escape' && helperNavigationActive) {
    helperNavigationActive = false;
    
    document.querySelectorAll('tr.zA').forEach(r => {
      r.dataset.helperFocused = 'false';
      r.style.outline = 'none';
      r.removeAttribute('aria-selected');
    });
    
    console.log('GMAIL-HELPER: Oma navigointi deaktivoitu, palattu Gmailin oletusnavigointiin.');
    return;
  }

  // NUOLINÄPPÄIMET JA J/K: kun laajennuksen navigointi on aktiivinen,
  // käsitellään itse eikä päästetä Gmailille.
  if (helperNavigationActive) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopImmediatePropagation();
      moveByOffset(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopImmediatePropagation();
      moveByOffset(-1);
      return;
    }
  }

  // HOME JA END -NAVIGOINTI
  if (e.key === 'Home' || e.key === 'End') {
    const rows = Array.from(document.querySelectorAll('tr.zA'));
    
    if (rows.length > 0) {
      e.preventDefault();
      e.stopImmediatePropagation(); 
      
      const targetRow = e.key === 'Home' ? rows[0] : rows[rows.length - 1];
      focusRow(targetRow);
      console.log(`GMAIL-HELPER: Hypättiin viestiluettelon ${e.key === 'Home' ? 'alkuun' : 'loppuun'}.`);
    }
    return;
  }

  // ALKUKIRJAIMELLA NAVIGOINTI INBOKSISSA
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
          e.stopImmediatePropagation(); 
          
          focusRow(row);
          
          console.log(`GMAIL-HELPER: Hypättiin kirjaimella ${e.key} lähettäjään: ${senderEl.innerText}`);
          break; 
        }
      }
    }
  }
}, true);
