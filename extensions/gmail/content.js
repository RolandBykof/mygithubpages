// =========================================================================
// GMAIL SAAVUTETTAVUUSLAAJENNUS - content.js (Versio 5 - Lopullinen)
// =========================================================================

// --- 1. VIESTIN LUKEMISEN PARANTAMINEN (H5 & ARIA-LIVE) - NOPEUTETTU VERSIO ---
// Tarkistetaan ruutu huomattavasti tiheämmin (100 millisekunnin välein)
setInterval(() => {
  // Etsitään käsittelemättömät viestin sisältöalueet (.a3s on Gmailin viestisäiliö)
  const messageBodies = document.querySelectorAll('.a3s:not([data-helper-processed])');

  messageBodies.forEach(msg => {
    // Varmistetaan, että elementillä on kokoa (eli se on piirtynyt ruudulle ja näkyvissä)
    if (msg.offsetWidth > 0 && msg.offsetHeight > 0) {
      msg.dataset.helperProcessed = "true";

      // Keskeyttää heti kaiken muun puheen (assertive)
      msg.setAttribute('aria-live', 'assertive');
      msg.setAttribute('aria-atomic', 'true');
      
      // Tehdään koko tekstialueesta fokusoitava
      msg.setAttribute('tabindex', '0');

      // Luodaan h5-otsikko alkuun
      const h5 = document.createElement('h5');
      h5.innerText = 'Viestin sisältö';
      
      // Piilotetaan visuaalisesti, mutta pidetään ruudunlukijan saavutettavissa
      h5.style.position = 'absolute';
      h5.style.left = '-9999px';
      h5.style.width = '1px';
      h5.style.height = '1px';
      h5.style.overflow = 'hidden';

      // Lisätään otsikko viestin sisällön ensimmäiseksi elementiksi
      msg.insertBefore(h5, msg.firstChild);

      // Siirretään fokus melkein välittömästi (vain 50ms viive, jotta DOM ehtii rekisteröidä muutokset)
      setTimeout(() => { 
        msg.focus(); 
        console.log('GMAIL-HELPER: Fokus siirretty salamana uuteen viestiin.');
      }, 50);
    }
  });
}, 100); 


// --- 2. NÄPPÄINKOMENNOT (ALKUKIRJAINNAVIGOINTI & ALT+P) ---
// HUOM: Kolmas parametri 'true' kaappaa tapahtuman ENNEN Gmailin omia skriptejä!
window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  
  // Tarkistetaan, ettei käyttäjä ole kirjoittamassa viestiä tai hakukenttään
  const isTyping = active && (
                   active.tagName === 'INPUT' || 
                   active.tagName === 'TEXTAREA' || 
                   active.isContentEditable || 
                   active.getAttribute('role') === 'textbox');

  // ==========================================
  // OMINAISUUS A: ALT+P (Poista viesti lukuikkunassa)
  // ==========================================
  if (e.altKey && (e.key.toLowerCase() === 'p' || e.code === 'KeyP')) {
    if (isTyping) return; // Ei poisteta vahingossa, jos kirjoitetaan viestiä
    
    e.preventDefault();
    e.stopPropagation(); // Estetään Gmailia reagoimasta tähän painallukseen
    
    // Haetaan KAIKKI mahdolliset poista-painikkeet koko sivulta (NVDA-raportin pohjalta)
    const allDeleteBtns = Array.from(document.querySelectorAll('div[role="button"].nX, div[role="button"][data-tooltip*="Poista"], div[role="button"][aria-label*="Poista"]'));

    // Suodatetaan listasta se painike, joka on oikeasti näkyvissä ruudulla ja on aktiivinen
    const activeDeleteBtn = allDeleteBtns.find(btn => 
      btn.offsetWidth > 0 && 
      btn.offsetHeight > 0 && 
      btn.getAttribute('aria-disabled') !== 'true'
    );

    if (activeDeleteBtn) {
      // Simuloidaan aidot hiiritapahtumat näkyvään painikkeeseen
      const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
      const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      
      activeDeleteBtn.dispatchEvent(mousedown);
      activeDeleteBtn.dispatchEvent(mouseup);
      activeDeleteBtn.dispatchEvent(click);
      
      console.log('GMAIL-HELPER: Avattu viesti poistettu (Alt+P)');
      
      // Kun viesti on poistettu ja Gmail palaa inboksiin, siirretään fokus sivun runkoon, 
      // jotta NVDA ei jää jumiin kadonneeseen elementtiin
      setTimeout(() => { document.body.focus(); }, 300);
    } else {
      console.log('GMAIL-HELPER: Aktiivista Poista-painiketta ei löytynyt ruudulta.');
    }
    return;
  }

  // ==========================================
  // OMINAISUUS B: ALKUKIRJAIMELLA NAVIGOINTI INBOKSISSA
  // ==========================================
  if (isTyping) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return; // Ohitetaan muut muokkausnäppäimet

  // Reagoidaan yksittäisiin aakkosiin
  if (/^[a-zäöå]$/i.test(e.key)) {
    const searchChar = e.key.toLowerCase();
    
    // Haetaan kaikki inboksin viestirivit
    const rows = Array.from(document.querySelectorAll('tr.zA'));
    if (rows.length === 0) return;

    // Selvitetään nykyinen sijainti
    let currentIndex = rows.findIndex(row => 
      row.contains(active) || 
      row === active || 
      row.dataset.helperFocused === 'true'
    );
    
    // Etsitään seuraava osuma
    for (let i = 1; i <= rows.length; i++) {
      const checkIndex = (currentIndex + i) % rows.length;
      if (checkIndex < 0) continue; 
      
      const row = rows[checkIndex];
      // Etsitään lähettäjän elementti Gmailin rakenteesta
      const senderEl = row.querySelector('.yW span[name], .zF, .yP, .yW span[email], .yW');
      
      if (senderEl) {
        let senderName = (senderEl.getAttribute('name') || senderEl.innerText || '').trim().toLowerCase();
        senderName = senderName.replace(/^["'\s]+/, ''); // Siivotaan mahdolliset lainausmerkit alun tieltä

        if (senderName.startsWith(searchChar)) {
          e.preventDefault();
          e.stopPropagation(); // Estetään Gmailia häiritsemästä hyppyä
          
          // Siivotaan aiemmat apu-fokukset pois
          rows.forEach(r => {
            if (r.dataset.helperFocused) {
              r.dataset.helperFocused = 'false';
              r.style.outline = 'none';
            }
          });

          // Asetetaan focus uudelle riville
          row.setAttribute('tabindex', '0');
          row.dataset.helperFocused = 'true';
          row.style.outline = '2px solid #ff9900'; // Visuaalinen apu
          row.style.outlineOffset = '-2px';
          
          row.focus();
          
          // Pakotetaan fokus takaisin pienellä viiveellä Gmailin omien scriptien varalta
          setTimeout(() => { row.focus(); }, 50);

          // Varmistetaan, että Enter avaa viestin
          if (!row.dataset.enterListenerAdded) {
            row.addEventListener('keydown', (enterEvent) => {
              if (enterEvent.key === 'Enter') {
                enterEvent.preventDefault();
                enterEvent.stopImmediatePropagation();
                
                // Kohdistetaan klikkaus mieluiten lähettäjän nimen alueelle viestin avaamiseksi
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
          
          console.log(`GMAIL-HELPER: Hypättiin kirjaimella ${e.key} lähettäjään: ${senderEl.innerText}`);
          break; // Osuma löytyi, lopetetaan haku
        }
      }
    }
  }
}, true); // <- TÄRKEÄ: 'true' asetus kaappausvaiheelle (Capture Phase)