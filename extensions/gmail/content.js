// --- 5. ALKUKIRJAIMELLA NAVIGOINTI INBOKSISSA ---
window.addEventListener('keydown', (e) => {
  // 1. Tarkistetaan, ettei käyttäjä ole kirjoittamassa
  const active = document.activeElement;
  if (active.tagName === 'INPUT' || 
      active.tagName === 'TEXTAREA' || 
      active.isContentEditable || 
      active.getAttribute('role') === 'textbox') {
    return;
  }

  // 2. Ohitetaan muokkausnäppäimet
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  // 3. Reagoidaan yksittäisiin aakkosiin
  if (/^[a-zäöå]$/i.test(e.key)) {
    const searchChar = e.key.toLowerCase();
    
    // 4. Haetaan kaikki inboksin viestirivit
    const rows = Array.from(document.querySelectorAll('tr.zA'));
    if (rows.length === 0) return;

    // 5. Selvitetään nykyinen sijainti (otetaan huomioon myös aiempi koodimme asettama focus)
    let currentIndex = rows.findIndex(row => 
      row.contains(active) || 
      row === active || 
      row.dataset.helperFocused === 'true'
    );
    
    // 6. Etsitään seuraava osuma
    for (let i = 1; i <= rows.length; i++) {
      // Jos currentIndex on -1 (ei fokusta missään), haku alkaa indeksistä 0
      const checkIndex = (currentIndex + i) % rows.length;
      if (checkIndex < 0) continue; 
      
      const row = rows[checkIndex];
      const senderEl = row.querySelector('.yW span[name], .zF, .yP, .yW span[email], .yW');
      
      if (senderEl) {
        let senderName = (senderEl.getAttribute('name') || senderEl.innerText || '').trim().toLowerCase();
        senderName = senderName.replace(/^["'\s]+/, '');

        if (senderName.startsWith(searchChar)) {
          e.preventDefault();
          
          // --- KORJAUS ALKAA TÄSTÄ ---
          
          // Siivotaan aiemmat apu-fokukset pois muilta riviltä
          rows.forEach(r => {
            if (r.dataset.helperFocused) {
              r.dataset.helperFocused = 'false';
              r.style.outline = 'none'; // Poistetaan visuaalinen kehys
            }
          });

          // Asetetaan focus uudelle riville ja tehdään siitä oikeasti fokusoitava
          row.setAttribute('tabindex', '0');
          row.dataset.helperFocused = 'true';
          
          // Lisätään hento ääriviiva, joka auttaa hahmottamaan fokuksen siirtymisen myös visuaalisesti
          row.style.outline = '2px solid #ff9900'; 
          row.style.outlineOffset = '-2px';
          
          row.focus();
          
          // Gmailin oma scripti varastaa joskus fokuksen takaisin sadasosasekunneissa. 
          // Pakotetaan focus takaisin pienellä viiveellä.
          setTimeout(() => { row.focus(); }, 50);

          // LISÄYS: Varmistetaan, että Enter avaa viestin, johon olemme siirtyneet
          if (!row.dataset.enterListenerAdded) {
            row.addEventListener('keydown', (enterEvent) => {
              if (enterEvent.key === 'Enter') {
                enterEvent.preventDefault();
                enterEvent.stopImmediatePropagation();
                
                // Simuloidaan aidot hiiritapahtumat, koska Gmail vaatii ne avatakseen viestin
                const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
                const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
                const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                
                row.dispatchEvent(mousedown);
                row.dispatchEvent(mouseup);
                row.dispatchEvent(click);
              }
            });
            row.dataset.enterListenerAdded = "true";
          }
          
          // --- KORJAUS PÄÄTTYY ---

          // Kerätään tietoja ääneen luettavaksi
          const subjectEl = row.querySelector('.bog, .bqe');
          const subjectText = subjectEl ? subjectEl.innerText.trim() : 'Ei aihetta';
          const realSenderName = senderEl.getAttribute('name') || senderEl.innerText || 'Tuntematon lähettäjä';
          
          speak(`${realSenderName}, ${subjectText}`);
          console.log(`GMAIL-HELPER: Hypättiin kirjaimella ${e.key} lähettäjään: ${realSenderName}`);
          
          break; // Osuma löytyi, lopetetaan haku
        }
      }
    }
  }
});