// --- 1. RUUDUNLUKIJAN ILMOITUKSET (UUSI OMINAISUUS) ---
// Luodaan näkymätön alue, jonka NVDA lukee automaattisesti, kun sen teksti muuttuu.
const announcer = document.createElement('div');
announcer.setAttribute('aria-live', 'polite');
announcer.style.position = 'absolute';
announcer.style.width = '1px';
announcer.style.height = '1px';
announcer.style.overflow = 'hidden';
announcer.style.clip = 'rect(1px, 1px, 1px, 1px)';
document.body.appendChild(announcer);

const speak = (text) => {
  announcer.textContent = ''; // Tyhjennetään ensin
  setTimeout(() => { announcer.textContent = text; }, 50); // Lisätään uusi teksti viiveellä
};


// --- 2. VIESTIN SISÄLLÖN KÄSITTELY (H5-navigointi) ---
const processEmailBody = () => {
  const messageBody = document.querySelector('.a3s, .MsoNormal');

  if (messageBody && !messageBody.dataset.helperProcessed) {
    const fullText = messageBody.innerText.trim();
    const snippet = fullText.substring(0, 65).replace(/\n/g, " ");
    
    const h5 = document.createElement('h5');
    h5.innerText = snippet + "...";
    
    h5.style.position = 'absolute';
    h5.style.width = '1px';
    h5.style.height = '1px';
    h5.style.overflow = 'hidden';
    h5.style.clip = 'rect(1px, 1px, 1px, 1px)';

    messageBody.prepend(h5);
    messageBody.setAttribute('tabindex', '-1');
    messageBody.style.outline = 'none';
    messageBody.focus();
    
    messageBody.dataset.helperProcessed = "true";
  }
};


// --- 3. PIKANÄPPÄIN ALT + P (POISTA) ---
window.addEventListener('keydown', (e) => {
  // Tarkistetaan Alt + P
  if (e.altKey && (e.code === 'KeyP' || e.key.toLowerCase() === 'p')) {
    
    // Etsitään KAIKKI sivulla olevat elementit, joilla on poista-painikkeen tuntomerkit
    const buttons = Array.from(document.querySelectorAll('div[aria-label="Poista"], .nX.T-I-ax7'));
    
    // Suodatetaan listasta se painike, joka on oikeasti näkyvissä (offsetParent ei ole null)
    const visibleDeleteBtn = buttons.find(btn => btn.offsetParent !== null);

    if (visibleDeleteBtn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      
      // Simuloidaan aidot hiiritapahtumat, joita Gmailin div-painikkeet vaativat
      const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
      const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
      
      visibleDeleteBtn.dispatchEvent(mousedown);
      visibleDeleteBtn.dispatchEvent(mouseup);
      
      speak("Viesti poistettu"); // NVDA lukee tämän
      console.log("GMAIL-HELPER: Viesti poistettu!");
      
    } else {
      speak("Poista painiketta ei löytynyt"); // NVDA lukee tämän, jos tulee virhe
      console.log("GMAIL-HELPER: Poista-painiketta ei löytynyt näytöltä.");
    }
  }
}, true);


// --- 4. SIVUN TARKKAILU ---
const observer = new MutationObserver(() => {
  clearTimeout(window.helperTimer);
  window.helperTimer = setTimeout(processEmailBody, 300);
});

observer.observe(document.body, { childList: true, subtree: true });